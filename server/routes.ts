import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertGreenBeanSchema,
  insertPackagingMaterialSchema,
  updateGreenBeanSchema,
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

  // Green Bean Change Logs Route
  app.get("/api/green-beans/:id/change-logs", async (req, res) => {
    try {
      const { id } = req.params;
      const changeLogs = await storage.getGreenBeanChangeLogs(id);
      res.json(changeLogs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch change logs" });
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
      const [greenBeans, packagingMaterials] = await Promise.all([
        storage.getGreenBeans(),
        storage.getPackagingMaterials()
      ]);

      const exportData = {
        exportDate: new Date().toISOString(),
        greenBeans,
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
