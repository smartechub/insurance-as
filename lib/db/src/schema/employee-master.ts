import { pgTable, serial, text, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const employeeMasterTable = pgTable("employee_master", {
  id: serial("id").primaryKey(),
  employeeId: text("employee_id").notNull().unique(),
  employeeName: text("employee_name").notNull(),
  dateOfJoining: date("date_of_joining").notNull(),
  department: text("department"),
  designation: text("designation"),
  location: text("location"),
  state: text("state"),
  phoneNo: text("phone_no"),
  emailId: text("email_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertEmployeeSchema = createInsertSchema(employeeMasterTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employeeMasterTable.$inferSelect;
