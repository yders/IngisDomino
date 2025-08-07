import { 
  type GreenBean, 
  type InsertGreenBean, 
  type UpdateGreenBean,
  type RoastedCoffee,
  type InsertRoastedCoffee,
  type UpdateRoastedCoffee,
  type PackagingMaterial,
  type InsertPackagingMaterial,
  type UpdatePackagingMaterial
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Green Beans
  getGreenBeans(): Promise<GreenBean[]>;
  getGreenBean(id: string): Promise<GreenBean | undefined>;
  createGreenBean(greenBean: InsertGreenBean): Promise<GreenBean>;
  updateGreenBean(id: string, updates: UpdateGreenBean): Promise<GreenBean | undefined>;
  deleteGreenBean(id: string): Promise<boolean>;

  // Roasted Coffee
  getRoastedCoffee(): Promise<RoastedCoffee[]>;
  getRoastedCoffeeItem(id: string): Promise<RoastedCoffee | undefined>;
  createRoastedCoffee(roastedCoffee: InsertRoastedCoffee): Promise<RoastedCoffee>;
  updateRoastedCoffee(id: string, updates: UpdateRoastedCoffee): Promise<RoastedCoffee | undefined>;
  deleteRoastedCoffee(id: string): Promise<boolean>;

  // Packaging Materials
  getPackagingMaterials(): Promise<PackagingMaterial[]>;
  getPackagingMaterial(id: string): Promise<PackagingMaterial | undefined>;
  createPackagingMaterial(packagingMaterial: InsertPackagingMaterial): Promise<PackagingMaterial>;
  updatePackagingMaterial(id: string, updates: UpdatePackagingMaterial): Promise<PackagingMaterial | undefined>;
  deletePackagingMaterial(id: string): Promise<boolean>;

  // Legacy user methods
  getUser(id: string): Promise<any>;
  getUserByUsername(username: string): Promise<any>;
  createUser(user: any): Promise<any>;
}

export class MemStorage implements IStorage {
  private greenBeans: Map<string, GreenBean>;
  private roastedCoffee: Map<string, RoastedCoffee>;
  private packagingMaterials: Map<string, PackagingMaterial>;
  private users: Map<string, any>;

  constructor() {
    this.greenBeans = new Map();
    this.roastedCoffee = new Map();
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

  // Roasted Coffee
  async getRoastedCoffee(): Promise<RoastedCoffee[]> {
    return Array.from(this.roastedCoffee.values());
  }

  async getRoastedCoffeeItem(id: string): Promise<RoastedCoffee | undefined> {
    return this.roastedCoffee.get(id);
  }

  async createRoastedCoffee(insertRoastedCoffee: InsertRoastedCoffee): Promise<RoastedCoffee> {
    const id = randomUUID();
    const roastedCoffeeItem: RoastedCoffee = {
      ...insertRoastedCoffee,
      id,
    };
    this.roastedCoffee.set(id, roastedCoffeeItem);
    return roastedCoffeeItem;
  }

  async updateRoastedCoffee(id: string, updates: UpdateRoastedCoffee): Promise<RoastedCoffee | undefined> {
    const existing = this.roastedCoffee.get(id);
    if (!existing) return undefined;

    const updated: RoastedCoffee = {
      ...existing,
      ...updates,
    };
    this.roastedCoffee.set(id, updated);
    return updated;
  }

  async deleteRoastedCoffee(id: string): Promise<boolean> {
    return this.roastedCoffee.delete(id);
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

export const storage = new MemStorage();
