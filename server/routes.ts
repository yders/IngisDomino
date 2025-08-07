import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertGreenBeanSchema,
  insertRoastedCoffeeSchema,
  insertPackagingMaterialSchema,
  updateGreenBeanSchema,
  updateRoastedCoffeeSchema,
  updatePackagingMaterialSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Green Beans Routes
  app.get("/api/green-beans", async (req, res) => {
    try {
      const greenBeans = await storage.getGreenBeans();
      res.json(greenBeans);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch green beans" });
    }
  });

  app.post("/api/green-beans", async (req, res) => {
    try {
      const validatedData = insertGreenBeanSchema.parse(req.body);
      const greenBean = await storage.createGreenBean(validatedData);
      res.json(greenBean);
    } catch (error) {
      res.status(400).json({ error: "Invalid green bean data" });
    }
  });

  app.put("/api/green-beans/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = updateGreenBeanSchema.parse(req.body);
      const updatedGreenBean = await storage.updateGreenBean(id, validatedData);
      
      if (!updatedGreenBean) {
        return res.status(404).json({ error: "Green bean not found" });
      }
      
      res.json(updatedGreenBean);
    } catch (error) {
      res.status(400).json({ error: "Invalid update data" });
    }
  });

  app.delete("/api/green-beans/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteGreenBean(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Green bean not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete green bean" });
    }
  });

  // Roasted Coffee Routes
  app.get("/api/roasted-coffee", async (req, res) => {
    try {
      const roastedCoffee = await storage.getRoastedCoffee();
      res.json(roastedCoffee);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch roasted coffee" });
    }
  });

  app.post("/api/roasted-coffee", async (req, res) => {
    try {
      const validatedData = insertRoastedCoffeeSchema.parse(req.body);
      const roastedCoffee = await storage.createRoastedCoffee(validatedData);
      res.json(roastedCoffee);
    } catch (error) {
      res.status(400).json({ error: "Invalid roasted coffee data" });
    }
  });

  app.put("/api/roasted-coffee/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = updateRoastedCoffeeSchema.parse(req.body);
      const updatedRoastedCoffee = await storage.updateRoastedCoffee(id, validatedData);
      
      if (!updatedRoastedCoffee) {
        return res.status(404).json({ error: "Roasted coffee not found" });
      }
      
      res.json(updatedRoastedCoffee);
    } catch (error) {
      res.status(400).json({ error: "Invalid update data" });
    }
  });

  app.delete("/api/roasted-coffee/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteRoastedCoffee(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Roasted coffee not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete roasted coffee" });
    }
  });

  // Packaging Materials Routes
  app.get("/api/packaging-materials", async (req, res) => {
    try {
      const packagingMaterials = await storage.getPackagingMaterials();
      res.json(packagingMaterials);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch packaging materials" });
    }
  });

  app.post("/api/packaging-materials", async (req, res) => {
    try {
      const validatedData = insertPackagingMaterialSchema.parse(req.body);
      const packagingMaterial = await storage.createPackagingMaterial(validatedData);
      res.json(packagingMaterial);
    } catch (error) {
      res.status(400).json({ error: "Invalid packaging material data" });
    }
  });

  app.put("/api/packaging-materials/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = updatePackagingMaterialSchema.parse(req.body);
      const updatedPackagingMaterial = await storage.updatePackagingMaterial(id, validatedData);
      
      if (!updatedPackagingMaterial) {
        return res.status(404).json({ error: "Packaging material not found" });
      }
      
      res.json(updatedPackagingMaterial);
    } catch (error) {
      res.status(400).json({ error: "Invalid update data" });
    }
  });

  app.delete("/api/packaging-materials/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deletePackagingMaterial(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Packaging material not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete packaging material" });
    }
  });

  // Export functionality
  app.get("/api/export", async (req, res) => {
    try {
      const [greenBeans, roastedCoffee, packagingMaterials] = await Promise.all([
        storage.getGreenBeans(),
        storage.getRoastedCoffee(),
        storage.getPackagingMaterials()
      ]);

      const exportData = {
        exportDate: new Date().toISOString(),
        greenBeans,
        roastedCoffee,
        packagingMaterials
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=inventory-export.json');
      res.json(exportData);
    } catch (error) {
      res.status(500).json({ error: "Failed to export data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
