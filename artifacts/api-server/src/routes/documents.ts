import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db } from "@workspace/db";
import { documentsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logAudit } from "../lib/audit";

const router: IRouter = Router();

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const allowedTypes = [
  "image/jpeg", "image/jpg", "image/png",
  "application/pdf", "application/zip",
  "application/x-zip-compressed", "application/octet-stream",
];

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith(".zip")) {
      cb(null, true);
    } else {
      cb(new Error("File type not allowed"));
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

router.post("/upload/:claimId", requireAuth, upload.single("file"), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  const claimId = Number(req.params.claimId);
  const documentType = (req.body.documentType as string) || "other";
  const [doc] = await db.insert(documentsTable).values({
    claimId,
    fileName: req.file.originalname,
    filePath: req.file.filename,
    fileType: req.file.mimetype,
    documentType,
  }).returning();
  await logAudit({ req, action: "DOCUMENT_UPLOADED", category: "DOCUMENTS", resourceType: "document", resourceId: doc.id, description: `Uploaded document "${req.file.originalname}" (${documentType}) to claim #${claimId}`, metadata: { claimId, fileName: req.file.originalname, fileType: req.file.mimetype, documentType } });
  res.status(201).json(doc);
});

router.get("/claim/:claimId", requireAuth, async (req: Request, res: Response) => {
  const claimId = Number(req.params.claimId);
  const docs = await db.select().from(documentsTable).where(eq(documentsTable.claimId, claimId));
  res.json(docs);
});

router.get("/file/:filename", requireAuth, (req: Request, res: Response) => {
  const filename = req.params.filename;
  const filePath = path.join(UPLOADS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  res.sendFile(filePath);
});

router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const [doc] = await db.select().from(documentsTable).where(eq(documentsTable.id, id));
  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  const filePath = path.join(UPLOADS_DIR, doc.filePath);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  await db.delete(documentsTable).where(eq(documentsTable.id, id));
  await logAudit({ req, action: "DOCUMENT_DELETED", category: "DOCUMENTS", resourceType: "document", resourceId: id, description: `Deleted document "${doc.fileName}" from claim #${doc.claimId}`, metadata: { claimId: doc.claimId, fileName: doc.fileName } });
  res.json({ message: "Document deleted successfully" });
});

export default router;
