import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  updateGreenBeanSchema,
  updateRoastedCoffeeSchema,
  updatePackagingMaterialSchema,
  type GreenBean,
  type RoastedCoffee,
  type PackagingMaterial,
} from "@shared/schema";

interface EditItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: GreenBean | RoastedCoffee | PackagingMaterial | null;
  type: "green-bean" | "roasted-coffee" | "packaging";
}

export default function EditItemModal({ open, onOpenChange, item, type }: EditItemModalProps) {
  const { toast } = useToast();
  
  const getSchema = () => {
    switch (type) {
      case "green-bean":
        return updateGreenBeanSchema;
      case "roasted-coffee":
        return updateRoastedCoffeeSchema;
      case "packaging":
        return updatePackagingMaterialSchema;
      default:
        return z.object({});
    }
  };

  const form = useForm({
    resolver: zodResolver(getSchema()),
    defaultValues: {},
  });

  useEffect(() => {
    if (item && open) {
      form.reset(item);
    }
  }, [item, open, form]);

  const editItemMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!item) throw new Error("No item to edit");
      
      switch (type) {
        case "green-bean":
          await apiRequest("PUT", `/api/green-beans/${item.id}`, data);
          break;
        case "roasted-coffee":
          await apiRequest("PUT", `/api/roasted-coffee/${item.id}`, data);
          break;
        case "packaging":
          await apiRequest("PUT", `/api/packaging-materials/${item.id}`, data);
          break;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/green-beans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/roasted-coffee"] });
      queryClient.invalidateQueries({ queryKey: ["/api/packaging-materials"] });
      toast({ title: "Item updated successfully" });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Failed to update item", variant: "destructive" });
    },
  });

  const onSubmit = (data: any) => {
    editItemMutation.mutate(data);
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-96" data-testid="modal-edit-item">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>Edit Item</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              data-testid="button-close-modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {type === "green-bean" && (
            <>
              <div>
                <Label htmlFor="variety">Variety</Label>
                <Input
                  {...form.register("variety")}
                  data-testid="input-variety"
                />
              </div>
              <div>
                <Label htmlFor="origin">Origin</Label>
                <Input
                  {...form.register("origin")}
                  data-testid="input-origin"
                />
              </div>
              <div>
                <Label htmlFor="currentStock">Current Stock (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  {...form.register("currentStock")}
                  data-testid="input-current-stock"
                />
              </div>
              <div>
                <Label htmlFor="minStock">Minimum Stock (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  {...form.register("minStock")}
                  data-testid="input-min-stock"
                />
              </div>
            </>
          )}

          {type === "roasted-coffee" && (
            <>
              <div>
                <Label htmlFor="variety">Variety</Label>
                <Input
                  {...form.register("variety")}
                  data-testid="input-variety"
                />
              </div>
              <div>
                <Label htmlFor="roastDate">Roast Date</Label>
                <Input
                  type="date"
                  {...form.register("roastDate")}
                  data-testid="input-roast-date"
                />
              </div>
              <div>
                <Label htmlFor="roastLevel">Roast Level</Label>
                <Select
                  value={form.watch("roastLevel") || ""}
                  onValueChange={(value) => form.setValue("roastLevel", value)}
                >
                  <SelectTrigger data-testid="select-roast-level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Light">Light</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Dark">Dark</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="originalWeight">Original Weight (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  {...form.register("originalWeight")}
                  data-testid="input-original-weight"
                />
              </div>
              <div>
                <Label htmlFor="currentWeight">Current Weight (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  {...form.register("currentWeight")}
                  data-testid="input-current-weight"
                />
              </div>
            </>
          )}

          {type === "packaging" && (
            <>
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  {...form.register("name")}
                  data-testid="input-name"
                />
              </div>
              <div>
                <Label htmlFor="type">Type</Label>
                <Select
                  value={form.watch("type") || ""}
                  onValueChange={(value) => form.setValue("type", value)}
                >
                  <SelectTrigger data-testid="select-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="coffee_bag">Coffee Bag</SelectItem>
                    <SelectItem value="post_bag">Post Bag</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="size">Size</Label>
                <Select
                  value={form.watch("size") || ""}
                  onValueChange={(value) => form.setValue("size", value)}
                >
                  <SelectTrigger data-testid="select-size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {form.watch("type") === "coffee_bag" && (
                      <>
                        <SelectItem value="250g">250g</SelectItem>
                        <SelectItem value="500g">500g</SelectItem>
                      </>
                    )}
                    {form.watch("type") === "post_bag" && (
                      <>
                        <SelectItem value="small">Small</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="large">Large</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  {...form.register("description")}
                  data-testid="input-description"
                />
              </div>
              <div>
                <Label htmlFor="currentStock">Current Stock</Label>
                <Input
                  type="number"
                  {...form.register("currentStock", { valueAsNumber: true })}
                  data-testid="input-current-stock"
                />
              </div>
              <div>
                <Label htmlFor="minStock">Minimum Stock</Label>
                <Input
                  type="number"
                  {...form.register("minStock", { valueAsNumber: true })}
                  data-testid="input-min-stock"
                />
              </div>
            </>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-coffee-600 hover:bg-coffee-700"
              disabled={editItemMutation.isPending}
              data-testid="button-submit"
            >
              {editItemMutation.isPending ? "Updating..." : "Update Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
