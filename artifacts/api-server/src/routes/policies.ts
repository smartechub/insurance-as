import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import * as XLSX from "xlsx";
import { db } from "@workspace/db";
import { policiesTable, assetsTable } from "@workspace/db/schema";
import { eq, desc, count, and, or, ilike } from "drizzle-orm";
import { logAudit } from "../lib/audit";

const router: IRouter = Router();

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const POLICIES_DIR = path.join(UPLOADS_DIR, "policies");
if (!fs.existsSync(POLICIES_DIR)) fs.mkdirSync(POLICIES_DIR, { recursive: true });

const pdfStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, POLICIES_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `policy-${unique}${path.extname(file.originalname)}`);
  },
});
const excelStorage = multer.memoryStorage();

const uploadPdf = multer({
  storage: pdfStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf" || file.originalname.endsWith(".pdf")) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

const uploadExcel = multer({
  storage: excelStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "application/octet-stream",
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(file.mimetype) || ext === ".xlsx" || ext === ".xls") {
      cb(null, true);
    } else {
      cb(new Error("Only Excel files (.xlsx, .xls) are allowed"));
    }
  },
});

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

const REQUIRED_EXCEL_COLUMNS = [
  "Sr No.",
  "Inventory No.",
  "Asset No",
  "Capitalization Date",
  "Asset Class",
  "Asset Class(Short Name)",
  "Asset Description",
  "Asset Type",
  "Asset Sub Type",
  "SBU",
  "Plant",
  "Quantity",
  "Cost(Local)",
  "NBV(Local)",
  "Condition",
  "Asset Criticality",
  "Inventory On",
  "LCD Serial No",
  "IT Serial No",
  "Processor",
  "HDD",
  "RAM",
  "Model",
];

function mapRowToAsset(row: Record<string, any>, policyId: number) {
  return {
    policyId,
    srNo: String(row["Sr No."] ?? "").trim() || null,
    inventoryNo: String(row["Inventory No."] ?? "").trim() || null,
    assetNo: String(row["Asset No"] ?? "").trim() || null,
    capitalizationDate: String(row["Capitalization Date"] ?? "").trim() || null,
    assetClass: String(row["Asset Class"] ?? "").trim() || null,
    assetClassShortName: String(row["Asset Class(Short Name)"] ?? "").trim() || null,
    assetDescription: String(row["Asset Description"] ?? "").trim() || null,
    assetType: String(row["Asset Type"] ?? "").trim() || null,
    assetSubType: String(row["Asset Sub Type"] ?? "").trim() || null,
    sbu: String(row["SBU"] ?? "").trim() || null,
    plant: String(row["Plant"] ?? "").trim() || null,
    quantity: String(row["Quantity"] ?? "").trim() || null,
    costLocal: String(row["Cost(Local)"] ?? "").trim() || null,
    nbvLocal: String(row["NBV(Local)"] ?? "").trim() || null,
    condition: String(row["Condition"] ?? "").trim() || null,
    assetCriticality: String(row["Asset Criticality"] ?? "").trim() || null,
    inventoryOn: String(row["Inventory On"] ?? "").trim() || null,
    lcdSerialNo: String(row["LCD Serial No"] ?? "").trim() || null,
    itSerialNo: String(row["IT Serial No"] ?? "").trim() || null,
    processor: String(row["Processor"] ?? "").trim() || null,
    hdd: String(row["HDD"] ?? "").trim() || null,
    ram: String(row["RAM"] ?? "").trim() || null,
    model: String(row["Model"] ?? "").trim() || null,
    rawData: row,
  };
}

router.get("/", requireAuth, async (req: Request, res: Response) => {
  const policies = await db.select().from(policiesTable).orderBy(desc(policiesTable.createdAt));
  const policiesWithCount = await Promise.all(
    policies.map(async (p) => {
      const [{ total }] = await db.select({ total: count() }).from(assetsTable).where(eq(assetsTable.policyId, p.id));
      return { ...p, assetCount: Number(total) };
    })
  );
  res.json(policiesWithCount);
});

router.get("/active", requireAuth, async (req: Request, res: Response) => {
  const [policy] = await db.select().from(policiesTable).where(eq(policiesTable.isActive, true));
  if (!policy) {
    res.json(null);
    return;
  }
  const [{ total }] = await db.select({ total: count() }).from(assetsTable).where(eq(assetsTable.policyId, policy.id));
  res.json({ ...policy, assetCount: Number(total) });
});

router.post("/", requireAuth, requireAdmin, uploadPdf.single("pdf"), async (req: Request, res: Response) => {
  const { policyNumber, startDate, endDate } = req.body;
  if (!policyNumber) {
    res.status(400).json({ error: "Policy number is required" });
    return;
  }
  const existing = await db.select().from(policiesTable).where(eq(policiesTable.policyNumber, policyNumber));
  if (existing.length > 0) {
    res.status(400).json({ error: "Policy number already exists" });
    return;
  }
  const [policy] = await db.insert(policiesTable).values({
    policyNumber,
    startDate: startDate || null,
    endDate: endDate || null,
    pdfFilePath: req.file ? req.file.filename : null,
    pdfFileName: req.file ? req.file.originalname : null,
    isActive: false,
  }).returning();
  await logAudit({ req, action: "POLICY_CREATED", category: "POLICIES", resourceType: "policy", resourceId: policy.id, description: `Created policy ${policy.policyNumber}`, metadata: { policyId: policy.id, policyNumber: policy.policyNumber } });
  res.status(201).json(policy);
});

router.put("/:id", requireAuth, requireAdmin, uploadPdf.single("pdf"), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const [existing] = await db.select().from(policiesTable).where(eq(policiesTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Policy not found" });
    return;
  }
  const { policyNumber, startDate, endDate } = req.body;
  const updates: any = {
    ...(policyNumber && { policyNumber }),
    ...(startDate !== undefined && { startDate }),
    ...(endDate !== undefined && { endDate }),
  };
  if (req.file) {
    if (existing.pdfFilePath) {
      const oldPath = path.join(POLICIES_DIR, existing.pdfFilePath);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    updates.pdfFilePath = req.file.filename;
    updates.pdfFileName = req.file.originalname;
  }
  const [updated] = await db.update(policiesTable).set(updates).where(eq(policiesTable.id, id)).returning();
  await logAudit({ req, action: "POLICY_UPDATED", category: "POLICIES", resourceType: "policy", resourceId: id, description: `Updated policy ${existing.policyNumber}` });
  res.json(updated);
});

router.post("/:id/activate", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const [target] = await db.select().from(policiesTable).where(eq(policiesTable.id, id));
  if (!target) {
    res.status(404).json({ error: "Policy not found" });
    return;
  }
  await db.update(policiesTable).set({ isActive: false });
  const [activated] = await db.update(policiesTable).set({ isActive: true }).where(eq(policiesTable.id, id)).returning();
  await logAudit({ req, action: "POLICY_ACTIVATED", category: "POLICIES", resourceType: "policy", resourceId: id, description: `Activated policy ${target.policyNumber}` });
  res.json(activated);
});

router.post("/:id/deactivate", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const [target] = await db.select().from(policiesTable).where(eq(policiesTable.id, id));
  if (!target) {
    res.status(404).json({ error: "Policy not found" });
    return;
  }
  const [updated] = await db.update(policiesTable).set({ isActive: false }).where(eq(policiesTable.id, id)).returning();
  await logAudit({ req, action: "POLICY_DEACTIVATED", category: "POLICIES", resourceType: "policy", resourceId: id, description: `Deactivated policy ${target.policyNumber}` });
  res.json(updated);
});

router.get("/sample-excel", requireAuth, (_req: Request, res: Response) => {
  const headers = [
    "Sr No.",
    "Inventory No.",
    "Asset No",
    "Capitalization Date",
    "Asset Class",
    "Asset Class(Short Name)",
    "Asset Description",
    "Asset Type",
    "Asset Sub Type",
    "SBU",
    "Plant",
    "Quantity",
    "Cost(Local)",
    "NBV(Local)",
    "Condition",
    "Asset Criticality",
    "Inventory On",
    "LCD Serial No",
    "IT Serial No",
    "Processor",
    "HDD",
    "RAM",
    "Model",
  ];

  const sampleRow = [
    1,
    "1000007660",
    "GJ/HO/Laptop/069",
    "2018-07-14",
    "Computer & Peripherals",
    "Computer & Peripherals",
    "Sample Asset Description",
    "Laptop",
    "Dell",
    "Gujarat",
    "Halol",
    1,
    42585,
    1158.42,
    "Working",
    "Normal",
    "2022-07-14",
    "",
    "CYT5QJ2",
    "Intel Core i3",
    "512 GB SSD",
    "8 GB",
    "Dell Latitude 3480",
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Assets");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  res.setHeader("Content-Disposition", "attachment; filename=sample-asset-upload.xlsx");
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.send(buf);
});

router.post("/:id/upload-excel", requireAuth, requireAdmin, uploadExcel.single("excel"), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const [policy] = await db.select().from(policiesTable).where(eq(policiesTable.id, id));
  if (!policy) {
    res.status(404).json({ error: "Policy not found" });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: "No Excel file uploaded" });
    return;
  }
  try {
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    if (rows.length === 0) {
      res.status(400).json({ error: "Excel file is empty" });
      return;
    }

    const headers = Object.keys(rows[0]);
    const missingColumns = REQUIRED_EXCEL_COLUMNS.filter((col) => !headers.includes(col));
    if (missingColumns.length > 0) {
      res.status(400).json({
        error: `Missing required columns: ${missingColumns.join(", ")}`,
        missingColumns,
      });
      return;
    }

    await db.delete(assetsTable).where(eq(assetsTable.policyId, id));

    const assets = rows.map((row) => mapRowToAsset(row, id));
    const BATCH_SIZE = 200;
    let inserted = 0;
    for (let i = 0; i < assets.length; i += BATCH_SIZE) {
      const batch = assets.slice(i, i + BATCH_SIZE);
      await db.insert(assetsTable).values(batch as any);
      inserted += batch.length;
    }

    await logAudit({ req, action: "EXCEL_UPLOADED", category: "POLICIES", resourceType: "policy", resourceId: id, description: `Uploaded Excel with ${inserted} assets to policy ${policy.policyNumber}`, metadata: { policyId: id, assetCount: inserted } });
    res.json({ message: `Successfully imported ${inserted} assets`, assetCount: inserted });
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? "Failed to parse Excel file" });
  }
});

router.get("/:id/pdf", requireAuth, (req: Request, res: Response) => {
  const filename = req.params.id;
  const filePath = path.join(POLICIES_DIR, filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "PDF not found" });
    return;
  }
  res.sendFile(filePath);
});

router.delete("/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const [existing] = await db.select().from(policiesTable).where(eq(policiesTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Policy not found" });
    return;
  }
  if (existing.pdfFilePath) {
    const filePath = path.join(POLICIES_DIR, existing.pdfFilePath);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  await db.delete(policiesTable).where(eq(policiesTable.id, id));
  await logAudit({ req, action: "POLICY_DELETED", category: "POLICIES", resourceType: "policy", resourceId: id, description: `Deleted policy ${existing.policyNumber}` });
  res.json({ message: "Policy deleted successfully" });
});

export default router;
