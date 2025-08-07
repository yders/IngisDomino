import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { PackagingMaterial } from "@shared/schema";
import AddItemModal from "./add-item-modal";

interface PackagingTabProps {
  searchTerm: string;
}

export default function PackagingTab({ searchTerm }: PackagingTabProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const { toast } = useToast();

  const { data: packagingMaterials = [], isLoading } = useQuery<PackagingMaterial[]>({
    queryKey: ["/api/packaging-materials"],
  });

  const updateStockMutation = useMutation({
    mutationFn: async ({ id, currentStock }: { id: string; currentStock: number }) => {
      await apiRequest("PUT", `/api/packaging-materials/${id}`, { currentStock });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packaging-materials"] });
    },
    onError: () => {
      toast({ title: "Failed to update stock", variant: "destructive" });
    },
  });

  const filteredMaterials = packagingMaterials.filter((material) => {
    return material.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const coffeeBags = filteredMaterials.filter(m => m.type === "coffee_bag");
  const postBags = filteredMaterials.filter(m => m.type === "post_bag");

  const getStockStatus = (currentStock: number, minStock: number) => {
    if (currentStock === 0) {
      return { label: "Out of Stock", variant: "destructive" as const };
    }
    if (currentStock <= minStock * 0.5) {
      return { label: "Critical Stock", variant: "destructive" as const };
    }
    if (currentStock <= minStock) {
      return { label: "Low Stock", variant: "secondary" as const };
    }
    return { label: "Good Stock", variant: "default" as const };
  };

  const adjustStock = (id: string, currentStock: number, adjustment: number) => {
    const newStock = Math.max(0, currentStock + adjustment);
    updateStockMutation.mutate({ id, currentStock: newStock });
  };

  const PackagingCard = ({ material }: { material: PackagingMaterial }) => {
    const status = getStockStatus(material.currentStock, material.minStock);
    
    return (
      <div className="bg-gray-50 rounded-lg p-4" data-testid={`card-packaging-${material.id}`}>
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-medium text-gray-900">{material.name}</h4>
            <p className="text-sm text-gray-600">{material.description}</p>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-gray-900" data-testid={`text-stock-${material.id}`}>
              {material.currentStock}
            </div>
            <div className="text-sm text-gray-600">units</div>
          </div>
        </div>
        <div className="mt-3 flex justify-between items-center">
          <Badge variant={status.variant}>{status.label}</Badge>
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => adjustStock(material.id, material.currentStock, 10)}
              className="text-green-600 hover:text-green-800"
              data-testid={`button-increase-${material.id}`}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => adjustStock(material.id, material.currentStock, -1)}
              className="text-red-600 hover:text-red-800"
              data-testid={`button-decrease-${material.id}`}
            >
              <Minus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return <div className="p-6">Loading packaging materials...</div>;
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Packaging Materials</h2>
        <Button
          className="bg-coffee-500 text-white hover:bg-coffee-600"
          onClick={() => setShowAddModal(true)}
          data-testid="button-add-packaging"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Packaging Item
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Coffee Bags Section */}
        <div>
          <h3 className="text-md font-medium text-gray-900 mb-4">Coffee Bags</h3>
          <div className="space-y-4">
            {coffeeBags.length === 0 ? (
              <p className="text-gray-500 text-sm">No coffee bags found.</p>
            ) : (
              coffeeBags.map((material) => (
                <PackagingCard key={material.id} material={material} />
              ))
            )}
          </div>
        </div>

        {/* Post Bags Section */}
        <div>
          <h3 className="text-md font-medium text-gray-900 mb-4">Post Bags</h3>
          <div className="space-y-4">
            {postBags.length === 0 ? (
              <p className="text-gray-500 text-sm">No post bags found.</p>
            ) : (
              postBags.map((material) => (
                <PackagingCard key={material.id} material={material} />
              ))
            )}
          </div>
        </div>
      </div>

      <AddItemModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        defaultType="packaging"
      />
    </>
  );
}
