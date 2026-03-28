import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { assetsTable, policiesTable } from "@workspace/db/schema";
import { eq, and, or, ilike, count, asc, sql } from "drizzle-orm";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response, next: () => void) {
  if (!(req.session as any).userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}

router.get("/", requireAuth, async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const rawLimit = Number(req.query.limit) || 20;
  const limit = Math.min(Math.max(rawLimit, 1), 200);
  const search = (req.query.search as string) || "";
  const assetType = (req.query.assetType as string) || "";
  const plant = (req.query.plant as string) || "";
  const conditionFilter = (req.query.condition as string) || "";
  const sbu = (req.query.sbu as string) || "";
  const offset = (page - 1) * limit;

  const [activePolicy] = await db.select().from(policiesTable).where(eq(policiesTable.isActive, true));
  if (!activePolicy) {
    res.json({ assets: [], total: 0, page, limit, totalPages: 0, activePolicy: null });
    return;
  }

  const conditions: any[] = [eq(assetsTable.policyId, activePolicy.id)];

  if (search) {
    conditions.push(
      or(
        ilike(assetsTable.assetNo, `%${search}%`),
        ilike(assetsTable.inventoryNo, `%${search}%`),
        ilike(assetsTable.itSerialNo, `%${search}%`),
        ilike(assetsTable.lcdSerialNo, `%${search}%`),
        ilike(assetsTable.model, `%${search}%`),
        ilike(assetsTable.assetDescription, `%${search}%`),
        ilike(assetsTable.plant, `%${search}%`)
      )
    );
  }
  if (assetType) conditions.push(eq(assetsTable.assetType, assetType));
  if (plant) conditions.push(ilike(assetsTable.plant, plant));
  if (conditionFilter) conditions.push(sql`split_part(${assetsTable.condition}, '|', 1) = ${conditionFilter}`);
  if (sbu) conditions.push(eq(assetsTable.sbu, sbu));

  const whereClause = conditions.reduce((a, b) => and(a, b));
  const [totalResult, rows] = await Promise.all([
    db.select({ count: count() }).from(assetsTable).where(whereClause),
    db.select().from(assetsTable).where(whereClause).orderBy(asc(assetsTable.srNo), asc(assetsTable.id)).limit(limit).offset(offset),
  ]);

  const total = Number(totalResult[0]?.count ?? 0);
  res.json({ assets: rows, total, page, limit, totalPages: Math.ceil(total / limit), activePolicy });
});

router.get("/filters", requireAuth, async (req: Request, res: Response) => {
  const [activePolicy] = await db.select().from(policiesTable).where(eq(policiesTable.isActive, true));
  if (!activePolicy) {
    res.json({ assetTypes: [], plants: [], conditions: [], sbus: [] });
    return;
  }
  const policyId = activePolicy.id;
  const [assetTypes, plants, rawConditions, sbus] = await Promise.all([
    db.selectDistinct({ value: assetsTable.assetType }).from(assetsTable).where(and(eq(assetsTable.policyId, policyId), sql`${assetsTable.assetType} IS NOT NULL AND ${assetsTable.assetType} != ''`)).orderBy(asc(assetsTable.assetType)),
    db.selectDistinct({ value: assetsTable.plant }).from(assetsTable).where(and(eq(assetsTable.policyId, policyId), sql`${assetsTable.plant} IS NOT NULL AND ${assetsTable.plant} != ''`)).orderBy(asc(assetsTable.plant)),
    db.selectDistinct({ value: assetsTable.condition }).from(assetsTable).where(and(eq(assetsTable.policyId, policyId), sql`${assetsTable.condition} IS NOT NULL AND ${assetsTable.condition} != ''`)),
    db.selectDistinct({ value: assetsTable.sbu }).from(assetsTable).where(and(eq(assetsTable.policyId, policyId), sql`${assetsTable.sbu} IS NOT NULL AND ${assetsTable.sbu} != ''`)).orderBy(asc(assetsTable.sbu)),
  ]);
  const conditionSet = new Set<string>();
  for (const { value } of rawConditions) {
    if (value) conditionSet.add(value.split("|")[0].trim());
  }
  res.json({
    assetTypes: assetTypes.map((r) => r.value).filter(Boolean),
    plants: plants.map((r) => r.value).filter(Boolean),
    conditions: Array.from(conditionSet).sort(),
    sbus: sbus.map((r) => r.value).filter(Boolean),
  });
});

router.get("/lookup", requireAuth, async (req: Request, res: Response) => {
  const assetNo = (req.query.assetNo as string) || "";
  if (!assetNo) {
    res.status(400).json({ error: "assetNo query parameter is required" });
    return;
  }
  const [activePolicy] = await db.select().from(policiesTable).where(eq(policiesTable.isActive, true));
  if (!activePolicy) {
    res.status(404).json({ error: "No active policy found" });
    return;
  }
  const [asset] = await db
    .select()
    .from(assetsTable)
    .where(
      and(
        eq(assetsTable.policyId, activePolicy.id),
        or(
          ilike(assetsTable.assetNo, assetNo),
          ilike(assetsTable.inventoryNo, assetNo)
        )
      )
    )
    .limit(1);

  if (!asset) {
    res.status(404).json({ error: "Asset not found in active policy" });
    return;
  }
  res.json({ ...asset, policyNumber: activePolicy.policyNumber });
});

export default router;
