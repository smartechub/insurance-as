import nodemailer from "nodemailer";
import { db } from "@workspace/db";
import { smtpConfigTable, usersTable } from "@workspace/db/schema";

export interface ClaimEmailData {
  event: "created" | "updated" | "deleted";
  claimId?: number;
  employeeName: string;
  employeeId: string;
  assetCode: string;
  assetType?: string | null;
  serialNo?: string | null;
  claimStatus?: string | null;
  payableAmount?: number | null;
  recoverAmount?: number | null;
  fileCharge?: number | null;
  effectedPart?: string | null;
  damageDate?: string | null;
  repairDate?: string | null;
  remark?: string | null;
  updatedBy?: string;
  changes?: string;
}

async function getSmtpConfig() {
  const rows = await db.select().from(smtpConfigTable).limit(1);
  return rows[0] ?? null;
}

async function getAllUserEmails(): Promise<string[]> {
  const users = await db.select({ email: usersTable.email }).from(usersTable);
  return users.map((u) => u.email).filter(Boolean);
}

function formatCurrency(amount?: number | null): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);
}

function getEventLabel(event: ClaimEmailData["event"]): string {
  switch (event) {
    case "created": return "New Claim Submitted";
    case "updated": return "Claim Updated";
    case "deleted": return "Claim Deleted";
  }
}

function getStatusBadgeColor(status?: string | null): string {
  switch (status) {
    case "Approved": return "#059669";
    case "Rejected": return "#dc2626";
    case "Processing": return "#4f46e5";
    case "Settled": return "#64748b";
    default: return "#d97706";
  }
}

function buildEmailHtml(data: ClaimEmailData): string {
  const eventLabel = getEventLabel(data.event);
  const statusColor = getStatusBadgeColor(data.claimStatus);
  const isDeleted = data.event === "deleted";
  const headerColor = isDeleted ? "#dc2626" : data.event === "created" ? "#4f46e5" : "#0891b2";
  const headerLabel = isDeleted ? "🗑 Claim Removed" : data.event === "created" ? "✅ New Claim" : "🔄 Claim Updated";

  const row = (label: string, value: string) =>
    value
      ? `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;font-weight:600;width:40%;">${label}</td>
          <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;font-size:13px;font-weight:500;width:60%;">${value}</td>
        </tr>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${eventLabel}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:${headerColor};padding:28px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="color:rgba(255,255,255,0.85);font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px;">Light Finance</div>
                    <div style="color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">${headerLabel}</div>
                    <div style="color:rgba(255,255,255,0.8);font-size:13px;margin-top:4px;">IT Asset Insurance Management</div>
                  </td>
                  <td style="text-align:right;vertical-align:top;">
                    <div style="background:rgba(255,255,255,0.15);border-radius:10px;padding:10px 16px;display:inline-block;">
                      <div style="color:rgba(255,255,255,0.7);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Claim ID</div>
                      <div style="color:#ffffff;font-size:20px;font-weight:800;">#${data.claimId ?? "—"}</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:28px 32px;">

              <!-- Alert Banner for deleted -->
              ${isDeleted ? `
              <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
                <div style="color:#dc2626;font-size:13px;font-weight:600;">⚠ This claim has been permanently deleted from the system${data.updatedBy ? ` by <strong>${data.updatedBy}</strong>` : ""}.</div>
              </div>` : ""}

              ${data.changes ? `
              <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
                <div style="color:#0369a1;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">What Changed</div>
                <div style="color:#0c4a6e;font-size:13px;">${data.changes}</div>
              </div>` : ""}

              <!-- Employee Info -->
              <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:20px;">
                <div style="color:#475569;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:14px;">Employee Details</div>
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${row("Employee Name", data.employeeName)}
                  ${row("Employee ID", data.employeeId)}
                </table>
              </div>

              <!-- Claim Info -->
              <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:20px;">
                <div style="color:#475569;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:14px;">Asset & Claim Details</div>
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${row("Asset Code", data.assetCode)}
                  ${row("Asset Type", data.assetType ?? "")}
                  ${row("Serial No.", data.serialNo ?? "")}
                  ${row("Affected Part", data.effectedPart ?? "")}
                  ${row("Damage Date", data.damageDate ?? "")}
                  ${row("Repair Date", data.repairDate ?? "")}
                </table>
              </div>

              <!-- Financial Info -->
              <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:20px;">
                <div style="color:#475569;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:14px;">Financial Summary</div>
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${row("Payable Amount", formatCurrency(data.payableAmount))}
                  ${row("Recover Amount", formatCurrency(data.recoverAmount))}
                  ${row("File Charge", formatCurrency(data.fileCharge))}
                </table>
              </div>

              <!-- Status -->
              ${!isDeleted && data.claimStatus ? `
              <div style="margin-bottom:20px;">
                <span style="display:inline-block;background:${statusColor};color:#fff;font-size:12px;font-weight:700;letter-spacing:0.5px;padding:6px 16px;border-radius:20px;">
                  ${data.claimStatus}
                </span>
              </div>` : ""}

              <!-- Remark -->
              ${data.remark ? `
              <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
                <div style="color:#92400e;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Remark</div>
                <div style="color:#78350f;font-size:13px;line-height:1.6;">${data.remark}</div>
              </div>` : ""}

              <!-- Action note -->
              ${!isDeleted ? `
              <div style="text-align:center;padding:16px 0 4px;">
                <a href="#" style="display:inline-block;background:#4f46e5;color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:10px;letter-spacing:0.3px;">
                  View Claim in System
                </a>
              </div>` : ""}

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center;">
              <div style="color:#94a3b8;font-size:12px;line-height:1.6;">
                This is an automated notification from <strong style="color:#64748b;">Light Finance — IT Asset Insurance</strong>.<br/>
                Please do not reply to this email.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendClaimNotification(data: ClaimEmailData): Promise<void> {
  const config = await getSmtpConfig();
  if (!config || !config.enabled) return;

  const recipients = await getAllUserEmails();
  if (recipients.length === 0) return;

  let transporter;
  try {
    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.username, pass: config.password },
    });
  } catch {
    return;
  }

  const eventLabel = getEventLabel(data.event);
  const subject = `[Light Finance] ${eventLabel} — Claim #${data.claimId ?? "N/A"} | ${data.employeeName}`;

  try {
    await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: recipients.join(", "),
      subject,
      html: buildEmailHtml(data),
    });
  } catch (err) {
    console.error("Email send failed:", err);
  }
}

export async function testSmtpConnection(config: {
  host: string; port: number; secure: boolean;
  username: string; password: string;
  fromName: string; fromEmail: string;
  testRecipient: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.username, pass: config.password },
    });
    await transporter.verify();
    await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: config.testRecipient,
      subject: "[Light Finance] SMTP Test — Connection Successful",
      html: `<div style="font-family:sans-serif;padding:24px;background:#f8fafc;border-radius:12px;">
        <h2 style="color:#4f46e5;">✅ SMTP Connection Successful</h2>
        <p style="color:#475569;">Your SMTP configuration is working correctly.<br/>Email notifications for claim events will now be delivered.</p>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px;">— Light Finance IT Asset Insurance</p>
      </div>`,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Unknown error" };
  }
}
