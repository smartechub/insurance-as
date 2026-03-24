import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { auditLogsTable } from "@workspace/db/schema";
import { desc, and, gte, lte, eq, ilike, or, count, sql } from "drizzle-orm";

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

router.get("/", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = (page - 1) * limit;
  const search = (req.query.search as string) || "";
  const category = (req.query.category as string) || "";
  const action = (req.query.action as string) || "";
  const userId = req.query.userId ? Number(req.query.userId) : null;
  const from = req.query.from ? new Date(req.query.from as string) : null;
  const to = req.query.to ? new Date(req.query.to as string) : null;

  const conditions: any[] = [];
  if (search) {
    conditions.push(
      or(
        ilike(auditLogsTable.description, `%${search}%`),
        ilike(auditLogsTable.userName, `%${search}%`),
        ilike(auditLogsTable.userEmail, `%${search}%`),
        ilike(auditLogsTable.action, `%${search}%`)
      )
    );
  }
  if (category) conditions.push(eq(auditLogsTable.category, category));
  if (action) conditions.push(eq(auditLogsTable.action, action));
  if (userId) conditions.push(eq(auditLogsTable.userId, userId));
  if (from) conditions.push(gte(auditLogsTable.createdAt, from));
  if (to) {
    const toEnd = new Date(to);
    toEnd.setHours(23, 59, 59, 999);
    conditions.push(lte(auditLogsTable.createdAt, toEnd));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult, rows] = await Promise.all([
    db.select({ count: count() }).from(auditLogsTable).where(whereClause),
    db
      .select()
      .from(auditLogsTable)
      .where(whereClause)
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(limit)
      .offset(offset),
  ]);

  const total = Number(totalResult[0]?.count ?? 0);
  res.json({
    logs: rows.map(serializeLog),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

router.get("/export", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const range = (req.query.range as string) || "day";
  const from = req.query.from ? new Date(req.query.from as string) : null;
  const to = req.query.to ? new Date(req.query.to as string) : null;

  let startDate: Date;
  let endDate: Date = new Date();

  if (range === "custom" && from && to) {
    startDate = from;
    endDate = new Date(to);
    endDate.setHours(23, 59, 59, 999);
  } else {
    startDate = new Date();
    if (range === "day") {
      startDate.setHours(0, 0, 0, 0);
    } else if (range === "week") {
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else if (range === "month") {
      startDate.setMonth(startDate.getMonth() - 1);
      startDate.setHours(0, 0, 0, 0);
    } else if (range === "year") {
      startDate.setFullYear(startDate.getFullYear() - 1);
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate.setHours(0, 0, 0, 0);
    }
  }

  const rows = await db
    .select()
    .from(auditLogsTable)
    .where(and(gte(auditLogsTable.createdAt, startDate), lte(auditLogsTable.createdAt, endDate)))
    .orderBy(desc(auditLogsTable.createdAt));

  const csvHeaders = ["ID", "Timestamp", "User", "Email", "Role", "Action", "Category", "Resource Type", "Resource ID", "Description", "IP Address", "User Agent"];
  const csvRows = rows.map((r) => [
    r.id,
    r.createdAt.toISOString(),
    r.userName ?? "",
    r.userEmail ?? "",
    r.userRole ?? "",
    r.action,
    r.category,
    r.resourceType ?? "",
    r.resourceId ?? "",
    `"${(r.description ?? "").replace(/"/g, '""')}"`,
    r.ipAddress ?? "",
    `"${(r.userAgent ?? "").replace(/"/g, '""')}"`,
  ]);

  const csv = [csvHeaders.join(","), ...csvRows.map((r) => r.join(","))].join("\n");
  const filename = `audit-log-${range}-${new Date().toISOString().slice(0, 10)}.csv`;

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
});

router.get("/summary", requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);

  const [categoryStats, actionStats, dailyStats] = await Promise.all([
    db
      .select({ category: auditLogsTable.category, count: count() })
      .from(auditLogsTable)
      .where(gte(auditLogsTable.createdAt, last7Days))
      .groupBy(auditLogsTable.category),
    db
      .select({ action: auditLogsTable.action, count: count() })
      .from(auditLogsTable)
      .where(gte(auditLogsTable.createdAt, last7Days))
      .groupBy(auditLogsTable.action)
      .orderBy(desc(count())),
    db.execute(
      sql`SELECT DATE("created_at") as date, COUNT(*) as count FROM audit_logs WHERE "created_at" >= ${last7Days} GROUP BY DATE("created_at") ORDER BY DATE("created_at")`
    ),
  ]);

  res.json({
    categoryStats: categoryStats.map((r) => ({ category: r.category, count: Number(r.count) })),
    topActions: actionStats.slice(0, 10).map((r) => ({ action: r.action, count: Number(r.count) })),
    dailyActivity: (dailyStats.rows as any[]).map((r) => ({
      date: r.date,
      count: Number(r.count),
    })),
  });
});

function serializeLog(log: any) {
  return {
    ...log,
    createdAt: log.createdAt?.toISOString(),
  };
}

export default router;
