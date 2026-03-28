import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { claimsTable, documentsTable, usersTable, auditLogsTable } from "@workspace/db/schema";
import { eq, ilike, or, desc, asc, count, sql, and } from "drizzle-orm";
import { logAudit } from "../lib/audit";
import { sendClaimNotification } from "../lib/email";

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

router.get("/stats", requireAuth, async (req: Request, res: Response) => {
  const allClaims = await db.select({ claimStatus: claimsTable.claimStatus }).from(claimsTable);
  const total = allClaims.length;
  const pending = allClaims.filter((c) => c.claimStatus === "Pending").length;
  const processing = allClaims.filter((c) => c.claimStatus === "Processing").length;
  const approved = allClaims.filter((c) => c.claimStatus === "Approved").length;
  const rejected = allClaims.filter((c) => c.claimStatus === "Rejected").length;
  const settled = allClaims.filter((c) => c.claimStatus === "Settled").length;

  const byStatusRaw = await db
    .select({ status: claimsTable.claimStatus, count: count() })
    .from(claimsTable)
    .groupBy(claimsTable.claimStatus);

  const byMonthRaw = await db.execute(
    sql`SELECT TO_CHAR("created_at", 'Mon YYYY') as month, COUNT(*) as count FROM claims GROUP BY TO_CHAR("created_at", 'Mon YYYY') ORDER BY MIN("created_at")`
  );

  res.json({
    total,
    pending,
    processing,
    approved,
    rejected,
    settled,
    claimsByStatus: byStatusRaw.map((r) => ({ status: r.status, count: Number(r.count) })),
    claimsByMonth: (byMonthRaw.rows as any[]).map((r) => ({ month: r.month, count: Number(r.count) })),
  });
});

router.get("/", requireAuth, async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const search = (req.query.search as string) || "";
  const status = (req.query.status as string) || "";
  const sortBy = (req.query.sortBy as string) || "createdAt";
  const sortOrder = (req.query.sortOrder as string) || "desc";
  const offset = (page - 1) * limit;

  const session = req.session as any;
  const userId = session.userId;
  const userRole = session.userRole;

  const conditions: any[] = [];
  if (search) {
    conditions.push(
      or(
        ilike(claimsTable.employeeId, `%${search}%`),
        ilike(claimsTable.employeeName, `%${search}%`),
        ilike(claimsTable.assetCode, `%${search}%`),
        ilike(claimsTable.serialNo, `%${search}%`)
      )
    );
  }
  if (status) conditions.push(eq(claimsTable.claimStatus, status as any));
  if (userRole !== "admin") conditions.push(eq(claimsTable.createdBy, userId));

  const whereClause = conditions.length > 0 ? conditions.reduce((a, b) => sql`${a} AND ${b}`) : undefined;
  const orderCol = sortBy === "createdAt" ? claimsTable.createdAt : sortBy === "claimStatus" ? claimsTable.claimStatus : claimsTable.createdAt;
  const orderFn = sortOrder === "asc" ? asc : desc;

  const [totalResult, rows] = await Promise.all([
    db.select({ count: count() }).from(claimsTable).where(whereClause),
    db.select().from(claimsTable).where(whereClause).orderBy(orderFn(orderCol)).limit(limit).offset(offset),
  ]);

  await logAudit({ req, action: "CLAIMS_LISTED", category: "CLAIMS", description: `Viewed claims list (page ${page}, search: "${search}", status: "${status}")`, metadata: { page, search, status } });

  const total = Number(totalResult[0]?.count ?? 0);
  res.json({ claims: rows.map(serializeClaim), total, page, limit, totalPages: Math.ceil(total / limit) });
});

router.post("/", requireAuth, async (req: Request, res: Response) => {
  const session = req.session as any;
  const data = { ...req.body, claimStatus: req.body.claimStatus || "Pending", employeeFileChargeStatus: req.body.employeeFileChargeStatus || "Pending", createdBy: session.userId };
  const [claim] = await db.insert(claimsTable).values(data).returning();
  await logAudit({ req, action: "CLAIM_CREATED", category: "CLAIMS", resourceType: "claim", resourceId: claim.id, description: `Created claim for ${claim.employeeName} (Asset: ${claim.assetCode})`, metadata: { claimId: claim.id, employeeName: claim.employeeName, assetCode: claim.assetCode } });
  sendClaimNotification({
    event: "created", claimId: claim.id,
    employeeName: claim.employeeName, employeeId: claim.employeeId,
    assetCode: claim.assetCode, assetType: claim.assetType,
    serialNo: claim.serialNo, policyNumber: claim.policyNumber, model: claim.model,
    claimStatus: claim.claimStatus,
    payableAmount: claim.payableAmount ? Number(claim.payableAmount) : null,
    recoverAmount: claim.recoverAmount ? Number(claim.recoverAmount) : null,
    fileCharge: claim.fileCharge ? Number(claim.fileCharge) : null,
    effectedPart: claim.effectedPart, damageDate: claim.damageDate,
    repairDate: claim.repairDate, remark: claim.remark,
  }).catch(() => {});
  res.status(201).json(serializeClaim(claim));
});

router.get("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const [claim] = await db.select().from(claimsTable).where(eq(claimsTable.id, id));
  if (!claim) {
    res.status(404).json({ error: "Claim not found" });
    return;
  }
  const documents = await db.select().from(documentsTable).where(eq(documentsTable.claimId, id));
  await logAudit({ req, action: "CLAIM_VIEWED", category: "CLAIMS", resourceType: "claim", resourceId: id, description: `Viewed claim #${id} for ${claim.employeeName}` });
  res.json({ ...serializeClaim(claim), documents });
});

router.put("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const session = req.session as any;
  const [existing] = await db.select().from(claimsTable).where(eq(claimsTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Claim not found" });
    return;
  }
  const [updated] = await db.update(claimsTable).set({ ...req.body, updatedAt: new Date() }).where(eq(claimsTable.id, id)).returning();
  const changes: string[] = [];
  if (req.body.claimStatus && req.body.claimStatus !== existing.claimStatus) changes.push(`Status changed: <strong>${existing.claimStatus}</strong> → <strong>${req.body.claimStatus}</strong>`);
  if (req.body.remark !== undefined && req.body.remark !== existing.remark) changes.push("Remark updated");
  if (req.body.payableAmount !== undefined) changes.push("Payable amount updated");
  await logAudit({ req, action: "CLAIM_UPDATED", category: "CLAIMS", resourceType: "claim", resourceId: id, description: `Updated claim #${id} for ${existing.employeeName}${changes.length ? ": " + changes.join(", ") : ""}`, metadata: { changes: req.body } });
  const [updatedByUser] = session.userId ? await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, session.userId)) : [null];
  sendClaimNotification({
    event: "updated", claimId: id,
    employeeName: updated.employeeName, employeeId: updated.employeeId,
    assetCode: updated.assetCode, assetType: updated.assetType,
    serialNo: updated.serialNo, claimStatus: updated.claimStatus,
    payableAmount: updated.payableAmount ? Number(updated.payableAmount) : null,
    recoverAmount: updated.recoverAmount ? Number(updated.recoverAmount) : null,
    fileCharge: updated.fileCharge ? Number(updated.fileCharge) : null,
    effectedPart: updated.effectedPart, damageDate: updated.damageDate,
    repairDate: updated.repairDate, remark: updated.remark,
    updatedBy: updatedByUser?.name,
    changes: changes.join(" · ") || undefined,
  }).catch(() => {});
  res.json(serializeClaim(updated));
});

router.get("/:id/history", requireAuth, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const logs = await db
    .select()
    .from(auditLogsTable)
    .where(
      and(
        eq(auditLogsTable.resourceType, "claim"),
        eq(auditLogsTable.resourceId, String(id))
      )
    )
    .orderBy(desc(auditLogsTable.createdAt));
  res.json(logs.map((l) => ({ ...l, createdAt: l.createdAt?.toISOString() })));
});

router.delete("/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const session = req.session as any;
  const [existing] = await db.select().from(claimsTable).where(eq(claimsTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Claim not found" });
    return;
  }
  await db.delete(claimsTable).where(eq(claimsTable.id, id));
  await logAudit({ req, action: "CLAIM_DELETED", category: "CLAIMS", resourceType: "claim", resourceId: id, description: `Deleted claim #${id} for ${existing.employeeName} (Asset: ${existing.assetCode})`, metadata: { employeeName: existing.employeeName, assetCode: existing.assetCode } });
  const [deletedByUser] = session.userId ? await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, session.userId)) : [null];
  sendClaimNotification({
    event: "deleted", claimId: id,
    employeeName: existing.employeeName, employeeId: existing.employeeId,
    assetCode: existing.assetCode, assetType: existing.assetType,
    serialNo: existing.serialNo, claimStatus: existing.claimStatus,
    payableAmount: existing.payableAmount ? Number(existing.payableAmount) : null,
    recoverAmount: existing.recoverAmount ? Number(existing.recoverAmount) : null,
    fileCharge: existing.fileCharge ? Number(existing.fileCharge) : null,
    effectedPart: existing.effectedPart, damageDate: existing.damageDate,
    repairDate: existing.repairDate, remark: existing.remark,
    updatedBy: deletedByUser?.name,
  }).catch(() => {});
  res.json({ message: "Claim deleted successfully" });
});

function serializeClaim(claim: any) {
  return {
    ...claim,
    payableAmount: claim.payableAmount ? Number(claim.payableAmount) : null,
    recoverAmount: claim.recoverAmount ? Number(claim.recoverAmount) : null,
    fileCharge: claim.fileCharge ? Number(claim.fileCharge) : null,
    createdAt: claim.createdAt?.toISOString(),
    updatedAt: claim.updatedAt?.toISOString(),
  };
}

export default router;
