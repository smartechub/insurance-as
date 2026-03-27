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

async function createTransporter() {
  const config = await getSmtpConfig();
  if (!config || !config.enabled) return null;
  try {
    return {
      transporter: nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: { user: config.username, pass: config.password },
      }),
      config,
    };
  } catch {
    return null;
  }
}

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Light Finance</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          ${content}
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center;">
              <div style="color:#94a3b8;font-size:12px;line-height:1.6;">
                This is an automated notification from <strong style="color:#64748b;">Light Finance — IT Asset Insurance</strong>.<br/>
                Please do not reply to this email. If you did not request this, please contact your administrator.
              </div>
              <div style="margin-top:12px;padding-top:12px;border-top:1px solid #e2e8f0;">
                <span style="color:#cbd5e1;font-size:11px;">© 2026 Light Finance · IT Asset Insurance Portal · All rights reserved</span>
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

function emailHeader(title: string, subtitle: string, color: string, icon: string): string {
  return `
  <tr>
    <td style="background:${color};padding:28px 32px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <div style="color:rgba(255,255,255,0.85);font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px;">Light Finance</div>
            <div style="color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">${icon} ${title}</div>
            <div style="color:rgba(255,255,255,0.8);font-size:13px;margin-top:4px;">${subtitle}</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

export function buildWelcomeEmailHtml(data: {
  name: string;
  email: string;
  password: string;
  role: string;
}): string {
  const content = `
  ${emailHeader("Welcome to Light Finance", "IT Asset Insurance Management System", "#4f46e5", "👋")}
  <tr>
    <td style="background:#ffffff;padding:32px;">
      <p style="color:#0f172a;font-size:15px;font-weight:600;margin:0 0 8px;">Hello, ${data.name}!</p>
      <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 28px;">
        Your account has been created on the <strong>Light Finance IT Asset Insurance</strong> portal. 
        You can now log in and start managing your IT asset insurance claims.
      </p>

      <!-- Credentials Box -->
      <div style="background:#f0f4ff;border:1px solid #c7d2fe;border-radius:12px;padding:24px;margin-bottom:28px;">
        <div style="color:#3730a3;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:16px;">Your Login Credentials</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #e0e7ff;color:#64748b;font-size:13px;font-weight:600;width:40%;">Email Address</td>
            <td style="padding:8px 0;border-bottom:1px solid #e0e7ff;color:#1e1b4b;font-size:13px;font-weight:700;font-family:monospace;">${data.email}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #e0e7ff;color:#64748b;font-size:13px;font-weight:600;">Password</td>
            <td style="padding:8px 0;border-bottom:1px solid #e0e7ff;color:#1e1b4b;font-size:13px;font-weight:700;font-family:monospace;">${data.password}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#64748b;font-size:13px;font-weight:600;">Role</td>
            <td style="padding:8px 0;color:#1e1b4b;font-size:13px;font-weight:700;text-transform:capitalize;">${data.role}</td>
          </tr>
        </table>
      </div>

      <!-- Security Notice -->
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;margin-bottom:28px;">
        <div style="color:#92400e;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">🔒 Security Notice</div>
        <div style="color:#78350f;font-size:13px;line-height:1.6;">
          Please change your password after your first login. Keep your credentials confidential and do not share them with anyone.
        </div>
      </div>

      <div style="text-align:center;">
        <a href="#" style="display:inline-block;background:#4f46e5;color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;letter-spacing:0.3px;">
          Log In to Portal
        </a>
      </div>
    </td>
  </tr>`;

  return emailWrapper(content);
}

export function buildPasswordResetByAdminEmailHtml(data: {
  name: string;
  email: string;
  newPassword: string;
  adminName: string;
}): string {
  const content = `
  ${emailHeader("Password Reset by Administrator", "IT Asset Insurance Management System", "#0891b2", "🔑")}
  <tr>
    <td style="background:#ffffff;padding:32px;">
      <p style="color:#0f172a;font-size:15px;font-weight:600;margin:0 0 8px;">Hello, ${data.name}!</p>
      <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 28px;">
        Your password has been reset by administrator <strong>${data.adminName}</strong>. 
        Please use the credentials below to log in and update your password immediately.
      </p>

      <!-- Credentials Box -->
      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:24px;margin-bottom:28px;">
        <div style="color:#0369a1;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:16px;">Updated Login Credentials</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #e0f2fe;color:#64748b;font-size:13px;font-weight:600;width:40%;">Email Address</td>
            <td style="padding:8px 0;border-bottom:1px solid #e0f2fe;color:#0c4a6e;font-size:13px;font-weight:700;font-family:monospace;">${data.email}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#64748b;font-size:13px;font-weight:600;">New Password</td>
            <td style="padding:8px 0;color:#0c4a6e;font-size:13px;font-weight:700;font-family:monospace;">${data.newPassword}</td>
          </tr>
        </table>
      </div>

      <!-- Security Notice -->
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 18px;margin-bottom:28px;">
        <div style="color:#dc2626;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">⚠ Action Required</div>
        <div style="color:#7f1d1d;font-size:13px;line-height:1.6;">
          For your security, please log in immediately and change this password to something only you know. 
          If you did not expect this change, contact your administrator right away.
        </div>
      </div>

      <div style="text-align:center;">
        <a href="#" style="display:inline-block;background:#0891b2;color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;letter-spacing:0.3px;">
          Log In to Portal
        </a>
      </div>
    </td>
  </tr>`;

  return emailWrapper(content);
}

export function buildForgotPasswordEmailHtml(data: {
  name: string;
  email: string;
  resetLink: string;
}): string {
  const content = `
  ${emailHeader("Password Reset Request", "IT Asset Insurance Management System", "#7c3aed", "🛡")}
  <tr>
    <td style="background:#ffffff;padding:32px;">
      <p style="color:#0f172a;font-size:15px;font-weight:600;margin:0 0 8px;">Hello, ${data.name}!</p>
      <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 28px;">
        We received a request to reset the password for your account associated with 
        <strong>${data.email}</strong>. Click the button below to create a new password.
      </p>

      <!-- Reset Button -->
      <div style="text-align:center;margin:32px 0;">
        <a href="${data.resetLink}" style="display:inline-block;background:#7c3aed;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:12px;letter-spacing:0.3px;">
          Reset My Password
        </a>
      </div>

      <!-- Link fallback -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 18px;margin-bottom:28px;">
        <div style="color:#64748b;font-size:12px;font-weight:600;margin-bottom:6px;">Or copy this link into your browser:</div>
        <div style="color:#4f46e5;font-size:12px;word-break:break-all;font-family:monospace;">${data.resetLink}</div>
      </div>

      <!-- Expiry + Security Notice -->
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
        <div style="color:#92400e;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">⏱ Link Expires in 1 Hour</div>
        <div style="color:#78350f;font-size:13px;line-height:1.6;">
          This reset link is valid for <strong>1 hour</strong> only. If you did not request a password reset, 
          you can safely ignore this email — your password will not be changed.
        </div>
      </div>
    </td>
  </tr>`;

  return emailWrapper(content);
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

function buildClaimEmailHtml(data: ClaimEmailData): string {
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

  const content = `
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
  <tr>
    <td style="background:#ffffff;padding:28px 32px;">
      ${isDeleted ? `
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
        <div style="color:#dc2626;font-size:13px;font-weight:600;">⚠ This claim has been permanently deleted from the system${data.updatedBy ? ` by <strong>${data.updatedBy}</strong>` : ""}.</div>
      </div>` : ""}
      ${data.changes ? `
      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
        <div style="color:#0369a1;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">What Changed</div>
        <div style="color:#0c4a6e;font-size:13px;">${data.changes}</div>
      </div>` : ""}
      <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:20px;">
        <div style="color:#475569;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:14px;">Employee Details</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${row("Employee Name", data.employeeName)}
          ${row("Employee ID", data.employeeId)}
        </table>
      </div>
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
      <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:20px;">
        <div style="color:#475569;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:14px;">Financial Summary</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${row("Payable Amount", formatCurrency(data.payableAmount))}
          ${row("Recover Amount", formatCurrency(data.recoverAmount))}
          ${row("File Charge", formatCurrency(data.fileCharge))}
        </table>
      </div>
      ${!isDeleted && data.claimStatus ? `
      <div style="margin-bottom:20px;">
        <span style="display:inline-block;background:${statusColor};color:#fff;font-size:12px;font-weight:700;letter-spacing:0.5px;padding:6px 16px;border-radius:20px;">
          ${data.claimStatus}
        </span>
      </div>` : ""}
      ${data.remark ? `
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
        <div style="color:#92400e;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Remark</div>
        <div style="color:#78350f;font-size:13px;line-height:1.6;">${data.remark}</div>
      </div>` : ""}
      ${!isDeleted ? `
      <div style="text-align:center;padding:16px 0 4px;">
        <a href="#" style="display:inline-block;background:#4f46e5;color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:10px;letter-spacing:0.3px;">
          View Claim in System
        </a>
      </div>` : ""}
    </td>
  </tr>`;

  return emailWrapper(content);
}

export async function sendWelcomeEmail(data: {
  name: string;
  email: string;
  password: string;
  role: string;
}): Promise<void> {
  const result = await createTransporter();
  if (!result) return;
  const { transporter, config } = result;
  try {
    await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: data.email,
      subject: `[Light Finance] Welcome! Your account has been created`,
      html: buildWelcomeEmailHtml(data),
    });
  } catch (err) {
    console.error("Welcome email send failed:", err);
  }
}

export async function sendAdminPasswordResetEmail(data: {
  name: string;
  email: string;
  newPassword: string;
  adminName: string;
}): Promise<void> {
  const result = await createTransporter();
  if (!result) return;
  const { transporter, config } = result;
  try {
    await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: data.email,
      subject: `[Light Finance] Your password has been reset by an administrator`,
      html: buildPasswordResetByAdminEmailHtml(data),
    });
  } catch (err) {
    console.error("Admin password reset email send failed:", err);
  }
}

export async function sendForgotPasswordEmail(data: {
  name: string;
  email: string;
  resetLink: string;
}): Promise<void> {
  const result = await createTransporter();
  if (!result) return;
  const { transporter, config } = result;
  try {
    await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: data.email,
      subject: `[Light Finance] Password Reset Request`,
      html: buildForgotPasswordEmailHtml(data),
    });
  } catch (err) {
    console.error("Forgot password email send failed:", err);
  }
}

export async function sendClaimNotification(data: ClaimEmailData): Promise<void> {
  const result = await createTransporter();
  if (!result) return;
  const { transporter, config } = result;

  const recipients = await getAllUserEmails();
  if (recipients.length === 0) return;

  const eventLabel = getEventLabel(data.event);
  const subject = `[Light Finance] ${eventLabel} — Claim #${data.claimId ?? "N/A"} | ${data.employeeName}`;

  try {
    await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: recipients.join(", "),
      subject,
      html: buildClaimEmailHtml(data),
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
