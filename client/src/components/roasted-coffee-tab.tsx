import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { RoastedCoffee } from "@shared/schema";
import AddItemModal from "./add-item-modal";
import EditItemModal from "./edit-item-modal";

interface RoastedCoffeeTabProps {
  searchTerm: string;
}

export default function RoastedCoffeeTab({ searchTerm }: RoastedCoffeeTabProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<RoastedCoffee | null>(null);
  const { toast } = useToast();

  const { data: roastedCoffee = [], isLoading } = useQuery<RoastedCoffee[]>({
    queryKey: ["/api/roasted-coffee"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/roasted-coffee/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roasted-coffee"] });
      toast({ title: "Roasted coffee deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete roasted coffee", variant: "destructive" });
    },
  });

  const updateWeightMutation = useMutation({
    mutationFn: async ({ id, currentWeight }: { id: string; currentWeight: string }) => {
      await apiRequest("PUT", `/api/roasted-coffee/${id}`, { currentWeight });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roasted-coffee"] });
    },
    onError: () => {
      toast({ title: "Failed to update weight", variant: "destructive" });
    },
  });

  const filteredCoffee = roastedCoffee.filter((coffee) => {
    return coffee.variety.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getDaysSinceRoast = (roastDate: string) => {
    const today = new Date();
    const roast = new Date(roastDate);
    const diffTime = Math.abs(today.getTime() - roast.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDaysLabel = (days: number) => {
    if (days <= 2) return { label: `${days} day${days !== 1 ? 's' : ''}`, variant: "default" as const };
    if (days <= 7) return { label: `${days} days`, variant: "secondary" as const };
    return { label: `${days} days`, variant: "destructive" as const };
  };

  const handleWeightChange = (id: string, value: string) => {
    updateWeightMutation.mutate({ id, currentWeight: value });
  };

  if (isLoading) {
    return <div className="p-6">Loading roasted coffee...</div>;
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Roasted Coffee Inventory</h2>
        <div className="flex space-x-3">
          <Button
            className="bg-coffee-500 text-white hover:bg-coffee-600"
            onClick={() => setShowAddModal(true)}
            data-testid="button-add-roasted-coffee"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Roasted Batch
          </Button>
        </div>
      </div>

      {filteredCoffee.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No roasted coffee found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Variety</TableHead>
                <TableHead>Roast Date</TableHead>
                <TableHead>Roast Level</TableHead>
                <TableHead>Weight (kg)</TableHead>
                <TableHead>Remaining (kg)</TableHead>
                <TableHead>Days Since Roast</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCoffee.map((coffee) => {
                const daysSinceRoast = getDaysSinceRoast(coffee.roastDate);
                const daysLabel = getDaysLabel(daysSinceRoast);
                return (
                  <TableRow key={coffee.id} className="hover:bg-gray-50" data-testid={`row-roasted-coffee-${coffee.id}`}>
                    <TableCell>
                      <div className="font-medium text-gray-900">{coffee.variety}</div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {new Date(coffee.roastDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{coffee.roastLevel}</TableCell>
                    <TableCell className="text-sm text-gray-600">{coffee.originalWeight}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.1"
                        value={coffee.currentWeight}
                        onChange={(e) => handleWeightChange(coffee.id, e.target.value)}
                        className="w-20"
                        data-testid={`input-weight-${coffee.id}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant={daysLabel.variant}>{daysLabel.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingItem(coffee)}
                          className="text-coffee-600 hover:text-coffee-900"
                          data-testid={`button-edit-${coffee.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(coffee.id)}
                          className="text-red-600 hover:text-red-900"
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-${coffee.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <AddItemModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        defaultType="roasted-coffee"
      />

      <EditItemModal
        open={editingItem !== null}
        onOpenChange={(open) => !open && setEditingItem(null)}
        item={editingItem}
        type="roasted-coffee"
      />
    </>
  );
}
