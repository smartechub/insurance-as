import { db } from "@workspace/db";
import { auditLogsTable } from "@workspace/db/schema";
import type { Request } from "express";

export type AuditAction =
  | "LOGIN" | "LOGOUT" | "LOGIN_FAILED"
  | "CLAIM_VIEWED" | "CLAIM_CREATED" | "CLAIM_UPDATED" | "CLAIM_DELETED" | "CLAIMS_LISTED"
  | "DOCUMENT_UPLOADED" | "DOCUMENT_DELETED" | "DOCUMENT_VIEWED"
  | "USER_CREATED" | "USER_UPDATED" | "USER_DELETED" | "USERS_LISTED" | "USER_EXPORTED" | "USERS_BULK_UPLOADED"
  | "PASSWORD_RESET_REQUESTED" | "PASSWORD_RESET"
  | "PAGE_VIEW";

export type AuditCategory =
  | "AUTH" | "CLAIMS" | "DOCUMENTS" | "USERS" | "NAVIGATION";

interface AuditParams {
  req: Request;
  action: AuditAction;
  category: AuditCategory;
  description: string;
  resourceType?: string;
  resourceId?: string | number;
  metadata?: Record<string, unknown>;
  userId?: number;
  userName?: string;
  userEmail?: string;
  userRole?: string;
}

export async function logAudit(params: AuditParams): Promise<void> {
  const session = (params.req.session as any) || {};
  const ip =
    (params.req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    params.req.socket?.remoteAddress ||
    null;
  const userAgent = params.req.headers["user-agent"] || null;

  await db.insert(auditLogsTable).values({
    userId: params.userId ?? session.userId ?? null,
    userName: params.userName ?? session.userName ?? null,
    userEmail: params.userEmail ?? session.userEmail ?? null,
    userRole: params.userRole ?? session.userRole ?? null,
    action: params.action,
    category: params.category,
    resourceType: params.resourceType ?? null,
    resourceId: params.resourceId != null ? String(params.resourceId) : null,
    description: params.description,
    metadata: params.metadata ?? null,
    ipAddress: ip,
    userAgent: userAgent,
  });
}
