import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const greenBeans = pgTable("green_beans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  variety: text("variety").notNull(),
  origin: text("origin").notNull(),
  currentStock: decimal("current_stock", { precision: 10, scale: 2 }).notNull().default('0'),
  minStock: decimal("min_stock", { precision: 10, scale: 2 }).notNull().default('0'),
  lastUpdated: timestamp("last_updated").notNull().default(sql`now()`),
});

export const roastedCoffee = pgTable("roasted_coffee", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  variety: text("variety").notNull(),
  greenBeanId: varchar("green_bean_id").notNull(), // Reference to green bean used
  greenBeanWeight: decimal("green_bean_weight", { precision: 10, scale: 2 }).notNull(), // Amount of green beans used
  roastDate: date("roast_date").notNull(),
  roastLevel: text("roast_level").notNull(), // Light, Medium, Dark
  originalWeight: decimal("original_weight", { precision: 10, scale: 2 }).notNull(),
  currentWeight: decimal("current_weight", { precision: 10, scale: 2 }).notNull(),
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
