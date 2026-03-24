import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const settingsOptionsTable = pgTable("settings_options", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  value: text("value").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SettingsOption = typeof settingsOptionsTable.$inferSelect;
