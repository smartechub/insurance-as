import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import { db } from "@workspace/db";
import { employeeMasterTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

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

function formatDate(d: string | null | undefined): string {
  if (!d) return "";
  const parts = d.split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return d;
}

function parseDate(d: string): string | null {
  if (!d) return null;
  const s = d.trim();
  const ddmmyyyy = /^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/.exec(s);
  if (ddmmyyyy) return `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`;
  const yyyymmdd = /^\d{4}-\d{2}-\d{2}$/.test(s);
  if (yyyymmdd) return s;
  return null;
}

function formatEmployee(e: any) {
  return { ...e, dateOfJoining: formatDate(e.dateOfJoining) };
}

router.get("/sample", requireAuth, requireAdmin, (_req: Request, res: Response) => {
  const headers = ["Employee ID", "Employee Name", "Date of Joining", "Department", "Designation", "Location", "State", "Phone No", "Email ID"];
  const sample = [
    ["EMP001", "John Smith", "01/01/2022", "IT", "Software Engineer", "Mumbai", "Maharashtra", "9876543210", "john.smith@company.com"],
    ["EMP002", "Jane Doe", "15/03/2021", "HR", "HR Manager", "Delhi", "Delhi", "9876543211", "jane.doe@company.com"],
  ];
  const rows = sample.map(r => r.map(v => `"${v}"`).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=employee_sample.csv");
  res.send(csv);
});

router.get("/download", requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  const employees = await db.select().from(employeeMasterTable).orderBy(employeeMasterTable.employeeId);
  const headers = ["Employee ID", "Employee Name", "Date of Joining", "Department", "Designation", "Location", "State", "Phone No", "Email ID"];
  const rows = employees.map(e => [
    e.employeeId, e.employeeName, formatDate(e.dateOfJoining),
    e.department ?? "", e.designation ?? "", e.location ?? "",
    e.state ?? "", e.phoneNo ?? "", e.emailId ?? "",
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=employees.csv");
  res.send(csv);
});

router.get("/", requireAuth, async (_req: Request, res: Response) => {
  const employees = await db.select().from(employeeMasterTable).orderBy(employeeMasterTable.employeeId);
  res.json(employees.map(formatEmployee));
});

router.get("/:employeeId", requireAuth, async (req: Request, res: Response) => {
  const [employee] = await db.select().from(employeeMasterTable)
    .where(eq(employeeMasterTable.employeeId, req.params.employeeId));
  if (!employee) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  res.json(formatEmployee(employee));
});

router.post("/", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { employeeId, employeeName, dateOfJoining, department, designation, location, state, phoneNo, emailId } = req.body;
  if (!employeeId || !employeeName || !dateOfJoining) {
    res.status(400).json({ error: "Employee ID, Employee Name, and Date of Joining are required" });
    return;
  }
  const parsedDate = parseDate(dateOfJoining);
  if (!parsedDate) {
    res.status(400).json({ error: "Invalid date format. Use DD/MM/YYYY" });
    return;
  }
  const [existing] = await db.select().from(employeeMasterTable).where(eq(employeeMasterTable.employeeId, employeeId));
  if (existing) {
    res.status(409).json({ error: "Employee ID already exists" });
    return;
  }
  const [created] = await db.insert(employeeMasterTable).values({
    employeeId, employeeName, dateOfJoining: parsedDate,
    department: department || null, designation: designation || null,
    location: location || null, state: state || null,
    phoneNo: phoneNo || null, emailId: emailId || null,
  }).returning();
  res.status(201).json(formatEmployee(created));
});

router.put("/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { employeeId, employeeName, dateOfJoining, department, designation, location, state, phoneNo, emailId } = req.body;
  if (!employeeId || !employeeName || !dateOfJoining) {
    res.status(400).json({ error: "Employee ID, Employee Name, and Date of Joining are required" });
    return;
  }
  const parsedDate = parseDate(dateOfJoining);
  if (!parsedDate) {
    res.status(400).json({ error: "Invalid date format. Use DD/MM/YYYY" });
    return;
  }
  const [conflict] = await db.select().from(employeeMasterTable).where(eq(employeeMasterTable.employeeId, employeeId));
  if (conflict && conflict.id !== id) {
    res.status(409).json({ error: "Employee ID already in use" });
    return;
  }
  const [updated] = await db.update(employeeMasterTable).set({
    employeeId, employeeName, dateOfJoining: parsedDate,
    department: department || null, designation: designation || null,
    location: location || null, state: state || null,
    phoneNo: phoneNo || null, emailId: emailId || null,
    updatedAt: new Date(),
  }).where(eq(employeeMasterTable.id, id)).returning();
  if (!updated) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  res.json(formatEmployee(updated));
});

router.delete("/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const [deleted] = await db.delete(employeeMasterTable).where(eq(employeeMasterTable.id, id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  res.json({ success: true });
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

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === "," && !inQuotes) { result.push(current.trim()); current = ""; continue; }
      current += ch;
    }
    result.push(current.trim());
    return result;
  };

  const header = parseCSVLine(lines[0]).map(h => h.toLowerCase());
  const col = (name: string) => header.indexOf(name.toLowerCase());

  const iEmpId = col("employee id");
  const iEmpName = col("employee name");
  const iDoj = col("date of joining");

  if (iEmpId === -1 || iEmpName === -1 || iDoj === -1) {
    res.status(400).json({ error: "CSV must have columns: Employee ID, Employee Name, Date of Joining" });
    return;
  }

  const errors: string[] = [];
  const toInsert: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const empId = cols[iEmpId] ?? "";
    const empName = cols[iEmpName] ?? "";
    const doj = cols[iDoj] ?? "";
    const rowLabel = `Row ${i + 1}`;

    if (!empId) { errors.push(`${rowLabel}: Employee ID is required`); continue; }
    if (!empName) { errors.push(`${rowLabel}: Employee Name is required`); continue; }
    if (!doj) { errors.push(`${rowLabel}: Date of Joining is required`); continue; }

    const parsedDate = parseDate(doj);
    if (!parsedDate) { errors.push(`${rowLabel}: Invalid date "${doj}". Use DD/MM/YYYY`); continue; }

    toInsert.push({
      employeeId: empId,
      employeeName: empName,
      dateOfJoining: parsedDate,
      department: cols[col("department")] || null,
      designation: cols[col("designation")] || null,
      location: cols[col("location")] || null,
      state: cols[col("state")] || null,
      phoneNo: cols[col("phone no")] || null,
      emailId: cols[col("email id")] || null,
    });
  }

  if (errors.length > 0) {
    res.status(400).json({ error: "Validation errors", details: errors });
    return;
  }

  let inserted = 0;
  let skipped = 0;
  for (const emp of toInsert) {
    try {
      await db.insert(employeeMasterTable).values(emp).onConflictDoNothing();
      inserted++;
    } catch {
      skipped++;
    }
  }

  res.json({ inserted, skipped, total: toInsert.length });
});

export default router;
