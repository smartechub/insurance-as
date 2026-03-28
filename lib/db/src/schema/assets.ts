import { pgTable, serial, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { policiesTable } from "./policies";

export const assetsTable = pgTable("assets", {
  id: serial("id").primaryKey(),
  policyId: integer("policy_id")
    .notNull()
    .references(() => policiesTable.id, { onDelete: "cascade" }),
  srNo: text("sr_no"),
  inventoryNo: text("inventory_no"),
  assetNo: text("asset_no"),
  capitalizationDate: text("capitalization_date"),
  assetClass: text("asset_class"),
  assetClassShortName: text("asset_class_short_name"),
  assetDescription: text("asset_description"),
  assetType: text("asset_type"),
  assetSubType: text("asset_sub_type"),
  sbu: text("sbu"),
  plant: text("plant"),
  quantity: text("quantity"),
  costLocal: text("cost_local"),
  nbvLocal: text("nbv_local"),
  condition: text("condition"),
  assetCriticality: text("asset_criticality"),
  inventoryOn: text("inventory_on"),
  lcdSerialNo: text("lcd_serial_no"),
  itSerialNo: text("it_serial_no"),
  processor: text("processor"),
  hdd: text("hdd"),
  ram: text("ram"),
  model: text("model"),
  rawData: jsonb("raw_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Asset = typeof assetsTable.$inferSelect;
