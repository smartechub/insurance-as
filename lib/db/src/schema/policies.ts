import { pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const policiesTable = pgTable("policies", {
  id: serial("id").primaryKey(),
  policyNumber: text("policy_number").notNull().unique(),
  startDate: text("start_date"),
  endDate: text("end_date"),
  pdfFilePath: text("pdf_file_path"),
  pdfFileName: text("pdf_file_name"),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Policy = typeof policiesTable.$inferSelect;
