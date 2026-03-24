import { Router, type IRouter, type Request, type Response } from "express";
import bcryptjs from "bcryptjs";
import crypto from "crypto";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logAudit } from "../lib/audit";

const router: IRouter = Router();

router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) {
    await logAudit({ req, action: "LOGIN_FAILED", category: "AUTH", description: `Failed login attempt for email: ${email}`, metadata: { email } });
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const valid = await bcryptjs.compare(password, user.password);
  if (!valid) {
    await logAudit({ req, action: "LOGIN_FAILED", category: "AUTH", description: `Failed login attempt for user: ${user.name}`, userId: user.id, userName: user.name, userEmail: user.email, userRole: user.role, metadata: { email } });
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  (req.session as any).userId = user.id;
  (req.session as any).userRole = user.role;
  (req.session as any).userName = user.name;
  (req.session as any).userEmail = user.email;
  await logAudit({ req, action: "LOGIN", category: "AUTH", description: `User logged in: ${user.name} (${user.email})`, userId: user.id, userName: user.name, userEmail: user.email, userRole: user.role });
  res.json({
    message: "Login successful",
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

router.post("/logout", async (req: Request, res: Response) => {
  await logAudit({ req, action: "LOGOUT", category: "AUTH", description: `User logged out: ${(req.session as any).userName ?? "Unknown"}` });
  req.session.destroy(() => {
    res.json({ message: "Logged out successfully" });
  });
});

router.get("/me", async (req: Request, res: Response) => {
  const userId = (req.session as any).userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  if (!(req.session as any).userName) {
    (req.session as any).userName = user.name;
    (req.session as any).userEmail = user.email;
  }
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

router.post("/forgot-password", async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 3600000);
    await db.update(usersTable).set({ resetToken: token, resetTokenExpiry: expiry }).where(eq(usersTable.id, user.id));
    await logAudit({ req, action: "PASSWORD_RESET_REQUESTED", category: "AUTH", description: `Password reset requested for: ${email}`, userId: user.id, userName: user.name, userEmail: user.email, userRole: user.role });
  }
  res.json({ message: "If an account exists with this email, a reset link has been sent." });
});

router.post("/reset-password", async (req: Request, res: Response) => {
  const { token, password } = req.body;
  if (!token || !password) {
    res.status(400).json({ error: "Token and password are required" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.resetToken, token));
  if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
    res.status(400).json({ error: "Invalid or expired token" });
    return;
  }
  const hashed = await bcryptjs.hash(password, 10);
  await db.update(usersTable).set({ password: hashed, resetToken: null, resetTokenExpiry: null }).where(eq(usersTable.id, user.id));
  await logAudit({ req, action: "PASSWORD_RESET", category: "AUTH", description: `Password was reset for: ${user.email}`, userId: user.id, userName: user.name, userEmail: user.email, userRole: user.role });
  res.json({ message: "Password reset successfully" });
});

export default router;
