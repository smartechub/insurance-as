import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { settingsOptionsTable } from "@workspace/db/schema";
import { eq, asc } from "drizzle-orm";

const router: IRouter = Router();

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

router.get("/", requireAuth, async (_req: Request, res: Response) => {
  const rows = await db
    .select()
    .from(settingsOptionsTable)
    .orderBy(asc(settingsOptionsTable.category), asc(settingsOptionsTable.createdAt));

  const grouped: Record<string, { id: number; value: string }[]> = {};
  for (const row of rows) {
    if (!grouped[row.category]) grouped[row.category] = [];
    grouped[row.category].push({ id: row.id, value: row.value });
  }
  res.json(grouped);
});

router.get("/:category", requireAuth, async (req: Request, res: Response) => {
  const { category } = req.params;
  const rows = await db
    .select()
    .from(settingsOptionsTable)
    .where(eq(settingsOptionsTable.category, category))
    .orderBy(asc(settingsOptionsTable.createdAt));
  res.json(rows.map((r) => ({ id: r.id, value: r.value })));
});

router.post("/", requireAdmin, async (req: Request, res: Response) => {
  const { category, value } = req.body as { category: string; value: string };
  if (!category || !value) {
    res.status(400).json({ error: "category and value are required" });
    return;
  }

  const existing = await db
    .select()
    .from(settingsOptionsTable)
    .where(eq(settingsOptionsTable.category, category));

  const duplicate = existing.find(
    (r) => r.value.toLowerCase() === value.trim().toLowerCase()
  );
  if (duplicate) {
    res.status(409).json({ error: "Option already exists" });
    return;
  }

  const [row] = await db
    .insert(settingsOptionsTable)
    .values({ category, value: value.trim() })
    .returning();
  res.status(201).json(row);
});

router.delete("/:id", requireAdmin, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(settingsOptionsTable).where(eq(settingsOptionsTable.id, id));
  res.json({ success: true });
});

export default router;
