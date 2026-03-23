import { pgTable, serial, text, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const claimsTable = pgTable("claims", {
  id: serial("id").primaryKey(),
  employeeId: text("employee_id").notNull(),
  employeeName: text("employee_name").notNull(),
  assetCode: text("asset_code").notNull(),
  assetType: text("asset_type", { enum: ["Laptop", "Desktop", "Other"] }),
  serialNo: text("serial_no"),
  damageDate: text("damage_date"),
  repairDate: text("repair_date"),
  effectedPart: text("effected_part"),
  caseId: text("case_id"),
  payableAmount: numeric("payable_amount", { precision: 12, scale: 2 }),
  recoverAmount: numeric("recover_amount", { precision: 12, scale: 2 }),
  fileCharge: numeric("file_charge", { precision: 12, scale: 2 }),
  claimStatus: text("claim_status", {
    enum: ["Pending", "Processing", "Approved", "Rejected", "Settled"],
  })
    .notNull()
    .default("Pending"),
  employeeFileChargeStatus: text("employee_file_charge_status").default("Pending"),
  remark: text("remark"),
  createdBy: integer("created_by").references(() => usersTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertClaimSchema = createInsertSchema(claimsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertClaim = z.infer<typeof insertClaimSchema>;
export type Claim = typeof claimsTable.$inferSelect;
