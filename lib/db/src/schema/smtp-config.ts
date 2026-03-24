import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const smtpConfigTable = pgTable("smtp_config", {
  id: serial("id").primaryKey(),
  host: text("host").notNull().default("smtppro.zoho.in"),
  port: integer("port").notNull().default(465),
  secure: boolean("secure").notNull().default(true),
  username: text("username").notNull().default("no_reply@lightfinance.com"),
  password: text("password").notNull().default(""),
  fromName: text("from_name").notNull().default("Light Finance"),
  fromEmail: text("from_email").notNull().default("no_reply@lightfinance.com"),
  enabled: boolean("enabled").notNull().default(false),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type SmtpConfig = typeof smtpConfigTable.$inferSelect;
