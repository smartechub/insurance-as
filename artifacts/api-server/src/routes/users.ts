import { Router, type IRouter, type Request, type Response } from "express";
import bcryptjs from "bcryptjs";
import crypto from "crypto";
import multer from "multer";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logAudit } from "../lib/audit";
import { sendWelcomeEmail, sendAdminPasswordResetEmail } from "../lib/email";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

function requireAuth(req: Request, res: Response, next: () => void) {
  if (!(req.session as any).userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}

function requireAdmin(req: Request, res: Response, next: () => void) {
  if ((req.session as any).userRole !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

const USER_SELECT = {
  id: usersTable.id,
  firstName: usersTable.firstName,
  lastName: usersTable.lastName,
  name: usersTable.name,
  email: usersTable.email,
  role: usersTable.role,
  employeeId: usersTable.employeeId,
  designation: usersTable.designation,
  department: usersTable.department,
  createdAt: usersTable.createdAt,
};

function formatUser(u: any) {
  return { ...u, createdAt: u.createdAt?.toISOString() };
}

function generateSecurePassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "@#$!";
  const all = upper + lower + digits + special;

  const getChar = (set: string) => set[crypto.randomInt(set.length)];

  const chars = [
    getChar(upper),
    getChar(upper),
    getChar(lower),
    getChar(lower),
    getChar(digits),
    getChar(digits),
    getChar(special),
    ...Array.from({ length: 5 }, () => getChar(all)),
  ];

  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}

router.get("/export", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const users = await db.select(USER_SELECT).from(usersTable);
  await logAudit({ req, action: "USER_EXPORTED", category: "USERS", description: `Exported ${users.length} users as CSV` });
  const headers = ["First Name", "Last Name", "Employee ID", "Email", "Role", "Designation", "Department"];
  const rows = users.map(u => [
    u.firstName ?? "", u.lastName ?? "", u.employeeId ?? "", u.email, u.role, u.designation ?? "", u.department ?? "",
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=users.csv");
  res.send(csv);
});

router.post("/bulk-upload", requireAuth, requireAdmin, upload.single("file"), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  const text = req.file.buffer.toString("utf-8");
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    res.status(400).json({ error: "CSV must have a header row and at least one data row" });
    return;
  }

  const header = lines[0].split(",").map(h => h.replace(/"/g, "").trim().toLowerCase());
  const firstNameIdx = header.indexOf("first name");
  const lastNameIdx = header.indexOf("last name");
  const employeeIdIdx = header.indexOf("employee id");
  const emailIdx = header.indexOf("email");
  const roleIdx = header.indexOf("role");
  const designationIdx = header.indexOf("designation");
  const departmentIdx = header.indexOf("department");

  if (emailIdx === -1) {
    res.status(400).json({ error: "CSV must have an 'Email' column" });
    return;
  }

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(c => c.replace(/^"|"$/g, "").trim());
    const email = cols[emailIdx]?.toLowerCase();
    if (!email) { errors.push(`Row ${i + 1}: missing email`); continue; }

    const firstName = firstNameIdx >= 0 ? (cols[firstNameIdx] ?? "") : "";
    const lastName = lastNameIdx >= 0 ? (cols[lastNameIdx] ?? "") : "";
    const role = (roleIdx >= 0 ? cols[roleIdx]?.toLowerCase() : "user");
    const validRole: "admin" | "user" = role === "admin" ? "admin" : "user";
    const employeeId = employeeIdIdx >= 0 ? (cols[employeeIdIdx] || null) : null;
    const designation = designationIdx >= 0 ? (cols[designationIdx] || null) : null;
    const department = departmentIdx >= 0 ? (cols[departmentIdx] || null) : null;
    const name = [firstName, lastName].filter(Boolean).join(" ") || email;

    const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email));
    if (existing.length > 0) { skipped++; continue; }

    const plainPassword = generateSecurePassword();
    const hashedPassword = await bcryptjs.hash(plainPassword, 10);
    try {
      await db.insert(usersTable).values({ firstName: firstName || null, lastName: lastName || null, name, email, password: hashedPassword, role: validRole, employeeId, designation, department });
      created++;
      await sendWelcomeEmail({ name, email, password: plainPassword, role: validRole }).catch(() => {});
    } catch (err: any) {
      errors.push(`Row ${i + 1}: ${err.message}`);
    }
  }

  await logAudit({ req, action: "USERS_BULK_UPLOADED", category: "USERS", description: `Bulk uploaded users: ${created} created, ${skipped} skipped, ${errors.length} errors`, metadata: { created, skipped, errors } });
  res.json({ created, skipped, errors });
});

router.get("/", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const users = await db.select(USER_SELECT).from(usersTable);
  await logAudit({ req, action: "USERS_LISTED", category: "USERS", description: `Viewed users list (${users.length} users)` });
  res.json(users.map(formatUser));
});

router.post("/", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { firstName, lastName, email, password, autoGeneratePassword, role, employeeId, designation, department } = req.body;
  if (!firstName || !lastName || !email || !role) {
    res.status(400).json({ error: "First name, last name, email and role are required" });
    return;
  }
  if (!autoGeneratePassword && !password) {
    res.status(400).json({ error: "Password is required when not auto-generating" });
    return;
  }
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing.length > 0) {
    res.status(400).json({ error: "Email already in use" });
    return;
  }
  const plainPassword = autoGeneratePassword ? generateSecurePassword() : password;
  const name = `${firstName} ${lastName}`.trim();
  const hashed = await bcryptjs.hash(plainPassword, 10);
  const [user] = await db.insert(usersTable).values({
    firstName, lastName, name, email, password: hashed, role,
    employeeId: employeeId || null, designation: designation || null, department: department || null,
  }).returning(USER_SELECT);
  await logAudit({ req, action: "USER_CREATED", category: "USERS", resourceType: "user", resourceId: user.id, description: `Created user: ${name} (${email}) with role ${role}`, metadata: { name, email, role, autoGeneratePassword: !!autoGeneratePassword } });

  await sendWelcomeEmail({ name, email, password: plainPassword, role }).catch(() => {});

  res.status(201).json({
    ...formatUser(user),
    ...(autoGeneratePassword ? { temporaryPassword: plainPassword } : {}),
  });
});

router.post("/:id/reset-password", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { newPassword, autoGeneratePassword } = req.body;

  if (!autoGeneratePassword && !newPassword) {
    res.status(400).json({ error: "New password is required when not auto-generating" });
    return;
  }

  const [target] = await db.select(USER_SELECT).from(usersTable).where(eq(usersTable.id, id));
  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const plainPassword = autoGeneratePassword ? generateSecurePassword() : newPassword;
  const hashed = await bcryptjs.hash(plainPassword, 10);
  await db.update(usersTable).set({ password: hashed, resetToken: null, resetTokenExpiry: null }).where(eq(usersTable.id, id));

  const adminName = (req.session as any).userName ?? "Administrator";
  await sendAdminPasswordResetEmail({
    name: target.name,
    email: target.email,
    newPassword: plainPassword,
    adminName,
  }).catch(() => {});

  await logAudit({ req, action: "USER_PASSWORD_RESET", category: "USERS", resourceType: "user", resourceId: id, description: `Admin reset password for: ${target.name} (${target.email})`, metadata: { email: target.email, autoGenerated: !!autoGeneratePassword } });

  res.json({
    message: "Password reset successfully",
    ...(autoGeneratePassword ? { temporaryPassword: plainPassword } : {}),
  });
});

router.put("/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const updates: any = {};
  if (req.body.firstName !== undefined) updates.firstName = req.body.firstName || null;
  if (req.body.lastName !== undefined) updates.lastName = req.body.lastName || null;
  if (req.body.firstName !== undefined || req.body.lastName !== undefined) {
    const current = await db.select({ firstName: usersTable.firstName, lastName: usersTable.lastName }).from(usersTable).where(eq(usersTable.id, id));
    const fn = req.body.firstName ?? current[0]?.firstName ?? "";
    const ln = req.body.lastName ?? current[0]?.lastName ?? "";
    updates.name = `${fn} ${ln}`.trim();
  }
  if (req.body.email) updates.email = req.body.email;
  if (req.body.role) updates.role = req.body.role;
  if (req.body.employeeId !== undefined) updates.employeeId = req.body.employeeId || null;
  if (req.body.designation !== undefined) updates.designation = req.body.designation || null;
  if (req.body.department !== undefined) updates.department = req.body.department || null;
  if (req.body.password) updates.password = await bcryptjs.hash(req.body.password, 10);
  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning(USER_SELECT);
  await logAudit({ req, action: "USER_UPDATED", category: "USERS", resourceType: "user", resourceId: id, description: `Updated user: ${user.name} (${user.email})`, metadata: { updatedFields: Object.keys(updates).filter(k => k !== "password") } });
  res.json(formatUser(user));
});

router.delete("/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const [target] = await db.select(USER_SELECT).from(usersTable).where(eq(usersTable.id, id));
  await db.delete(usersTable).where(eq(usersTable.id, id));
  await logAudit({ req, action: "USER_DELETED", category: "USERS", resourceType: "user", resourceId: id, description: `Deleted user: ${target?.name ?? "Unknown"} (${target?.email ?? id})`, metadata: { name: target?.name, email: target?.email } });
  res.json({ message: "User deleted successfully" });
});

export default router;
