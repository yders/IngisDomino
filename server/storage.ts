import { 
  type GreenBean, 
  type InsertGreenBean, 
  type UpdateGreenBean,
  type PackagingMaterial,
  type InsertPackagingMaterial,
  type UpdatePackagingMaterial,
  type GreenBeanChangeLog,
  type InsertGreenBeanChangeLog,
  greenBeans,
  packagingMaterials,
  greenBeanChangeLogs
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Green Beans
  getGreenBeans(): Promise<GreenBean[]>;
  getGreenBean(id: string): Promise<GreenBean | undefined>;
  createGreenBean(greenBean: InsertGreenBean): Promise<GreenBean>;
  updateGreenBean(id: string, updates: UpdateGreenBean): Promise<GreenBean | undefined>;
  deleteGreenBean(id: string): Promise<boolean>;



  // Packaging Materials
  getPackagingMaterials(): Promise<PackagingMaterial[]>;
  getPackagingMaterial(id: string): Promise<PackagingMaterial | undefined>;
  createPackagingMaterial(packagingMaterial: InsertPackagingMaterial): Promise<PackagingMaterial>;
  updatePackagingMaterial(id: string, updates: UpdatePackagingMaterial): Promise<PackagingMaterial | undefined>;
  deletePackagingMaterial(id: string): Promise<boolean>;

  // Change Logs
  getGreenBeanChangeLogs(greenBeanId: string): Promise<GreenBeanChangeLog[]>;
  createGreenBeanChangeLog(changeLog: InsertGreenBeanChangeLog): Promise<GreenBeanChangeLog>;

  // Legacy user methods
  getUser(id: string): Promise<any>;
  getUserByUsername(username: string): Promise<any>;
  createUser(user: any): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // Green Beans
  async getGreenBeans(): Promise<GreenBean[]> {
    return await db.select().from(greenBeans);
  }

  async getGreenBean(id: string): Promise<GreenBean | undefined> {
    const [bean] = await db.select().from(greenBeans).where(eq(greenBeans.id, id));
    return bean || undefined;
  }

  async createGreenBean(greenBean: InsertGreenBean): Promise<GreenBean> {
    const [bean] = await db
      .insert(greenBeans)
      .values({
        ...greenBean,
        id: randomUUID(),
        lastUpdated: new Date()
      })
      .returning();
    return bean;
  }

  async updateGreenBean(id: string, updates: UpdateGreenBean): Promise<GreenBean | undefined> {
    // First get the current bean to track changes
    const currentBean = await this.getGreenBean(id);
    if (!currentBean) return undefined;

    const [bean] = await db
      .update(greenBeans)
      .set({
        ...updates,
        lastUpdated: new Date()
      })
      .where(eq(greenBeans.id, id))
      .returning();

    // Log the changes
    if (bean) {
      for (const [key, newValue] of Object.entries(updates)) {
        if (key !== 'lastUpdated' && currentBean[key as keyof GreenBean] !== newValue) {
          await this.createGreenBeanChangeLog({
            greenBeanId: id,
            changeType: 'update',
            field: key,
            oldValue: String(currentBean[key as keyof GreenBean] || ''),
            newValue: String(newValue || ''),
            amount: key === 'currentStock' ? newValue as any : null
          });
        }
      }
    }

    return bean || undefined;
  }

  async deleteGreenBean(id: string): Promise<boolean> {
    const result = await db.delete(greenBeans).where(eq(greenBeans.id, id));
    return (result.rowCount ?? 0) > 0;
  }



  // Packaging Materials
  async getPackagingMaterials(): Promise<PackagingMaterial[]> {
    return await db.select().from(packagingMaterials);
  }

  async getPackagingMaterial(id: string): Promise<PackagingMaterial | undefined> {
    const [material] = await db.select().from(packagingMaterials).where(eq(packagingMaterials.id, id));
    return material || undefined;
  }

  async createPackagingMaterial(material: InsertPackagingMaterial): Promise<PackagingMaterial> {
    const [newMaterial] = await db
      .insert(packagingMaterials)
      .values({
        ...material,
        id: randomUUID(),
        lastUpdated: new Date()
      })
      .returning();
    return newMaterial;
  }

  async updatePackagingMaterial(id: string, updates: UpdatePackagingMaterial): Promise<PackagingMaterial | undefined> {
    const [material] = await db
      .update(packagingMaterials)
      .set({
        ...updates,
        lastUpdated: new Date()
      })
      .where(eq(packagingMaterials.id, id))
      .returning();
    return material || undefined;
  }

  async deletePackagingMaterial(id: string): Promise<boolean> {
    const result = await db.delete(packagingMaterials).where(eq(packagingMaterials.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Change Logs
  async getGreenBeanChangeLogs(greenBeanId: string): Promise<GreenBeanChangeLog[]> {
    return await db.select().from(greenBeanChangeLogs)
      .where(eq(greenBeanChangeLogs.greenBeanId, greenBeanId))
      .orderBy(greenBeanChangeLogs.timestamp);
  }

  async createGreenBeanChangeLog(changeLog: InsertGreenBeanChangeLog): Promise<GreenBeanChangeLog> {
    const [log] = await db
      .insert(greenBeanChangeLogs)
      .values({
        ...changeLog,
        id: randomUUID(),
      })
      .returning();
    return log;
  }

  // Legacy user methods (unchanged)
  async getUser(id: string): Promise<any> {
    return null;
  }

  async getUserByUsername(username: string): Promise<any> {
    return null;
  }

  async createUser(user: any): Promise<any> {
    return null;
  }
}

export class MemStorage implements IStorage {
  private greenBeans: Map<string, GreenBean>;
  private packagingMaterials: Map<string, PackagingMaterial>;
  private users: Map<string, any>;

  constructor() {
    this.greenBeans = new Map();
    this.packagingMaterials = new Map();
    this.users = new Map();

    // Initialize with some default packaging materials
    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    const defaultPackaging: InsertPackagingMaterial[] = [
      {
        name: "Coffee Bags - 250g",
        type: "coffee_bag",
        size: "250g",
        description: "Kraft paper with valve",
        currentStock: 0,
        minStock: 50,
      },
      {
        name: "Coffee Bags - 500g",
        type: "coffee_bag",
        size: "500g",
        description: "Kraft paper with valve",
        currentStock: 0,
        minStock: 30,
      },
      {
        name: "Post Bags - Small",
        type: "post_bag",
        size: "small",
        description: "Padded mailers",
        currentStock: 0,
        minStock: 20,
      },
      {
        name: "Post Bags - Medium",
        type: "post_bag",
        size: "medium",
        description: "Padded mailers",
        currentStock: 0,
        minStock: 15,
      },
      {
        name: "Post Bags - Large",
        type: "post_bag",
        size: "large",
        description: "Padded mailers",
        currentStock: 0,
        minStock: 10,
      },
    ];

    defaultPackaging.forEach(item => {
      this.createPackagingMaterial(item);
    });
  }

  // Green Beans
  async getGreenBeans(): Promise<GreenBean[]> {
    return Array.from(this.greenBeans.values());
  }

  async getGreenBean(id: string): Promise<GreenBean | undefined> {
    return this.greenBeans.get(id);
  }

  async createGreenBean(insertGreenBean: InsertGreenBean): Promise<GreenBean> {
    const id = randomUUID();
    const greenBean: GreenBean = {
      ...insertGreenBean,
      id,
      currentStock: insertGreenBean.currentStock || "0",
      location: insertGreenBean.location || "Origin",
      bagLabels: insertGreenBean.bagLabels || 0,
      inWebshop: insertGreenBean.inWebshop || false,
      lastUpdated: new Date(),
    };
    this.greenBeans.set(id, greenBean);
    return greenBean;
  }

  async updateGreenBean(id: string, updates: UpdateGreenBean): Promise<GreenBean | undefined> {
    const existing = this.greenBeans.get(id);
    if (!existing) return undefined;

    const updated: GreenBean = {
      ...existing,
      ...updates,
      lastUpdated: new Date(),
    };
    this.greenBeans.set(id, updated);
    return updated;
  }

  async deleteGreenBean(id: string): Promise<boolean> {
    return this.greenBeans.delete(id);
  }



  // Packaging Materials
  async getPackagingMaterials(): Promise<PackagingMaterial[]> {
    return Array.from(this.packagingMaterials.values());
  }

  async getPackagingMaterial(id: string): Promise<PackagingMaterial | undefined> {
    return this.packagingMaterials.get(id);
  }

  async createPackagingMaterial(insertPackagingMaterial: InsertPackagingMaterial): Promise<PackagingMaterial> {
    const id = randomUUID();
    const packagingMaterial: PackagingMaterial = {
      ...insertPackagingMaterial,
      id,
      currentStock: insertPackagingMaterial.currentStock || 0,
      minStock: insertPackagingMaterial.minStock || 0,
      description: insertPackagingMaterial.description || null,
      lastUpdated: new Date(),
    };
    this.packagingMaterials.set(id, packagingMaterial);
    return packagingMaterial;
  }

  async updatePackagingMaterial(id: string, updates: UpdatePackagingMaterial): Promise<PackagingMaterial | undefined> {
    const existing = this.packagingMaterials.get(id);
    if (!existing) return undefined;

    const updated: PackagingMaterial = {
      ...existing,
      ...updates,
      lastUpdated: new Date(),
    };
    this.packagingMaterials.set(id, updated);
    return updated;
  }

  async deletePackagingMaterial(id: string): Promise<boolean> {
    return this.packagingMaterials.delete(id);
  }

  // Change Logs (in-memory stub implementation)
  async getGreenBeanChangeLogs(greenBeanId: string): Promise<GreenBeanChangeLog[]> {
    // For MemStorage, we could maintain logs in memory if needed
    // For now, return empty array
    return [];
  }

  async createGreenBeanChangeLog(changeLog: InsertGreenBeanChangeLog): Promise<GreenBeanChangeLog> {
    const log: GreenBeanChangeLog = {
      ...changeLog,
      id: randomUUID(),
      field: changeLog.field || null,
      oldValue: changeLog.oldValue || null,
      newValue: changeLog.newValue || null,
      amount: changeLog.amount || null,
      timestamp: new Date(),
    };
    // For MemStorage, we could store these if needed
    return log;
  }

  // Legacy user methods
  async getUser(id: string): Promise<any> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<any> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: any): Promise<any> {
    const id = randomUUID();
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
}

// Initialize database storage with default data
async function initializeDatabaseStorage() {
  const storage = new DatabaseStorage();
  
  // Check if packaging materials exist, if not, create defaults
  const existingMaterials = await storage.getPackagingMaterials();
  if (existingMaterials.length === 0) {
    const defaultPackaging: InsertPackagingMaterial[] = [
      {
        name: "Coffee Bags - 250g",
        type: "coffee_bag",
        size: "250g",
        description: "Kraft paper with valve",
        currentStock: 0,
        minStock: 50,
      },
      {
        name: "Coffee Bags - 500g",
        type: "coffee_bag",
        size: "500g",
        description: "Kraft paper with valve",
        currentStock: 0,
        minStock: 30,
      },
      {
        name: "Post Bags - Small",
        type: "post_bag",
        size: "small",
        description: "Padded mailers",
        currentStock: 0,
        minStock: 20,
      },
      {
        name: "Post Bags - Medium",
        type: "post_bag",
        size: "medium",
        description: "Padded mailers",
        currentStock: 0,
        minStock: 15,
      },
      {
        name: "Post Bags - Large",
        type: "post_bag",
        size: "large",
        description: "Padded mailers",
        currentStock: 0,
        minStock: 10,
      },
    ];

    await Promise.all(defaultPackaging.map(item => storage.createPackagingMaterial(item)));
  }
  
  return storage;
}

export const storage = new DatabaseStorage();

// Initialize default data
initializeDatabaseStorage().catch(console.error);
