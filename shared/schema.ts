import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, date, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const greenBeans = pgTable("green_beans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  variety: text("variety").notNull(),
  origin: text("origin").notNull(),
  location: text("location").notNull().default('Origin'), // Origin, On water, Warehouse, Roastery
  currentStock: decimal("current_stock", { precision: 10, scale: 2 }).notNull().default('0'),
  bagLabels: integer("bag_labels").notNull().default(0),
  inWebshop: boolean("in_webshop").notNull().default(false),
  lastUpdated: timestamp("last_updated").notNull().default(sql`now()`),
});

export const roastedCoffee = pgTable("roasted_coffee", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  variety: text("variety").notNull(),
  greenBeanId: varchar("green_bean_id").notNull(), // Reference to green bean used
  greenBeanWeight: decimal("green_bean_weight", { precision: 10, scale: 2 }).notNull(), // Amount of green beans used
  roastDate: date("roast_date").notNull(),
});

export const packagingMaterials = pgTable("packaging_materials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // coffee_bag, post_bag
  size: text("size").notNull(), // 250g, 500g, small, medium, large
  description: text("description"),
  currentStock: integer("current_stock").notNull().default(0),
  minStock: integer("min_stock").notNull().default(0),
  lastUpdated: timestamp("last_updated").notNull().default(sql`now()`),
});

export const greenBeanChangeLogs = pgTable("green_bean_change_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  greenBeanId: varchar("green_bean_id").notNull(),
  changeType: text("change_type").notNull(), // 'create', 'update', 'stock_deduction'
  field: text("field"), // Field that was changed (null for create/stock_deduction)
  oldValue: text("old_value"), // Previous value (null for create)
  newValue: text("new_value"), // New value
  amount: decimal("amount", { precision: 10, scale: 2 }), // For stock changes
  timestamp: timestamp("timestamp").notNull().default(sql`now()`),
});

export const insertGreenBeanSchema = createInsertSchema(greenBeans).omit({
  id: true,
  lastUpdated: true,
});

export const insertRoastedCoffeeSchema = createInsertSchema(roastedCoffee).omit({
  id: true,
});

export const insertPackagingMaterialSchema = createInsertSchema(packagingMaterials).omit({
  id: true,
  lastUpdated: true,
});

export const updateGreenBeanSchema = createInsertSchema(greenBeans).omit({
  id: true,
  lastUpdated: true,
}).partial();

export const updateRoastedCoffeeSchema = createInsertSchema(roastedCoffee).omit({
  id: true,
}).partial();

export const updatePackagingMaterialSchema = createInsertSchema(packagingMaterials).omit({
  id: true,
  lastUpdated: true,
}).partial();

export type GreenBean = typeof greenBeans.$inferSelect;
export type InsertGreenBean = z.infer<typeof insertGreenBeanSchema>;
export type UpdateGreenBean = z.infer<typeof updateGreenBeanSchema>;

export type RoastedCoffee = typeof roastedCoffee.$inferSelect;
export type InsertRoastedCoffee = z.infer<typeof insertRoastedCoffeeSchema>;
export type UpdateRoastedCoffee = z.infer<typeof updateRoastedCoffeeSchema>;

export type PackagingMaterial = typeof packagingMaterials.$inferSelect;
export type InsertPackagingMaterial = z.infer<typeof insertPackagingMaterialSchema>;
export type UpdatePackagingMaterial = z.infer<typeof updatePackagingMaterialSchema>;

export const insertGreenBeanChangeLogSchema = createInsertSchema(greenBeanChangeLogs).omit({
  id: true,
  timestamp: true,
});

export type GreenBeanChangeLog = typeof greenBeanChangeLogs.$inferSelect;
export type InsertGreenBeanChangeLog = z.infer<typeof insertGreenBeanChangeLogSchema>;
