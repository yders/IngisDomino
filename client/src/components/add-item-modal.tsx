import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
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
  insertGreenBeanSchema,
  insertPackagingMaterialSchema,
  type GreenBean,
} from "@shared/schema";

interface AddItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemType: "green-bean" | "packaging";
}

const addItemSchema = z.discriminatedUnion("itemType", [
  z.object({
    itemType: z.literal("green-bean"),
    ...insertGreenBeanSchema.shape,
  }),
  z.object({
    itemType: z.literal("packaging"),
    ...insertPackagingMaterialSchema.shape,
  }),
]);

type AddItemForm = z.infer<typeof addItemSchema>;

export default function AddItemModal({ open, onOpenChange, itemType }: AddItemModalProps) {
  const { toast } = useToast();
  
  const form = useForm<AddItemForm>({
    resolver: zodResolver(addItemSchema),
    defaultValues: {
      itemType: itemType,
      location: "Origin", // Default location for green beans
    },
  });



  const addItemMutation = useMutation({
    mutationFn: async (data: AddItemForm) => {
      const { itemType, ...itemData } = data;
      
      switch (itemType) {
        case "green-bean":
          await apiRequest("POST", "/api/green-beans", itemData);
          break;
        case "packaging":
          await apiRequest("POST", "/api/packaging-materials", itemData);
          break;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/green-beans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/packaging-materials"] });
      toast({ title: "Item added successfully" });
      form.reset();
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Failed to add item", variant: "destructive" });
    },
  });

  const onSubmit = (data: AddItemForm) => {
    addItemMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-96" data-testid="modal-add-item">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>
              Add New {itemType === "green-bean" ? "Green Bean" : "Packaging Material"}
            </DialogTitle>
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
          {itemType === "green-bean" && (
            <>
              <div>
                <Label htmlFor="variety">Variety</Label>
                <Input
                  {...form.register("variety")}
                  placeholder="e.g., Ethiopian Yirgacheffe"
                  data-testid="input-variety"
                />
              </div>
              <div>
                <Label htmlFor="origin">Origin</Label>
                <Input
                  {...form.register("origin")}
                  placeholder="e.g., Ethiopia"
                  data-testid="input-origin"
                />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Select
                  value={form.watch("location") || undefined}
                  onValueChange={(value) => form.setValue("location", value)}
                >
                  <SelectTrigger data-testid="select-location">
                    <SelectValue placeholder="Select location..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Origin">Origin</SelectItem>
                    <SelectItem value="On water">On water</SelectItem>
                    <SelectItem value="Warehouse">Warehouse</SelectItem>
                    <SelectItem value="Roastery">Roastery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="currentStock">Initial Stock (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  {...form.register("currentStock")}
                  placeholder="0"
                  data-testid="input-current-stock"
                />
              </div>
              <div>
                <Label htmlFor="minStock">Minimum Stock (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  {...form.register("minStock")}
                  placeholder="0"
                  data-testid="input-min-stock"
                />
              </div>
            </>
          )}



          {itemType === "packaging" && (
            <>
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  {...form.register("name")}
                  placeholder="e.g., Coffee Bags - 250g"
                  data-testid="input-name"
                />
              </div>
              <div>
                <Label htmlFor="type">Type</Label>
                <Select
                  value={form.watch("type") || undefined}
                  onValueChange={(value) => form.setValue("type", value)}
                >
                  <SelectTrigger data-testid="select-type">
                    <SelectValue placeholder="Select type..." />
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
                  value={form.watch("size") || undefined}
                  onValueChange={(value) => form.setValue("size", value)}
                >
                  <SelectTrigger data-testid="select-size">
                    <SelectValue placeholder="Select size..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="250g">250g</SelectItem>
                    <SelectItem value="500g">500g</SelectItem>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  {...form.register("description")}
                  placeholder="e.g., Kraft paper with valve"
                  data-testid="input-description"
                />
              </div>
              <div>
                <Label htmlFor="currentStock">Initial Stock</Label>
                <Input
                  type="number"
                  {...form.register("currentStock", { valueAsNumber: true })}
                  placeholder="0"
                  data-testid="input-current-stock"
                />
              </div>
              <div>
                <Label htmlFor="minStock">Minimum Stock</Label>
                <Input
                  type="number"
                  {...form.register("minStock", { valueAsNumber: true })}
                  placeholder="0"
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
              disabled={addItemMutation.isPending}
              data-testid="button-submit"
            >
              {addItemMutation.isPending ? "Adding..." : "Add Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
