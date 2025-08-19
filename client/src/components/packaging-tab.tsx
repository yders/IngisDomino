import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { PackagingMaterial } from "@shared/schema";
import AddItemModal from "./add-item-modal";

interface PackagingTabProps {
  searchTerm: string;
}

type SortField = 'name' | 'size' | 'currentStock' | 'minStock';
type SortDirection = 'asc' | 'desc';

export default function PackagingTab({ searchTerm }: PackagingTabProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [editingStock, setEditingStock] = useState<string | null>(null);
  const [tempStockValue, setTempStockValue] = useState<string>("");
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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedAndFilteredMaterials = packagingMaterials
    .filter((material) => {
      return material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             material.size.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => {
      let aValue: string | number = '';
      let bValue: string | number = '';

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'size':
          aValue = a.size.toLowerCase();
          bValue = b.size.toLowerCase();
          break;
        case 'currentStock':
          aValue = a.currentStock;
          bValue = b.currentStock;
          break;
        case 'minStock':
          aValue = a.minStock;
          bValue = b.minStock;
          break;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortDirection === 'asc' 
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      }
    });

  const coffeeBags = sortedAndFilteredMaterials.filter(m => m.type === "coffee_bag");
  const postBags = sortedAndFilteredMaterials.filter(m => m.type === "post_bag");

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

  const startStockEdit = (id: string, currentValue: number) => {
    setEditingStock(id);
    setTempStockValue(currentValue.toString());
  };

  const saveStockEdit = () => {
    if (editingStock && tempStockValue !== "") {
      const newStock = Math.max(0, parseInt(tempStockValue) || 0);
      updateStockMutation.mutate({ id: editingStock, currentStock: newStock });
    }
    setEditingStock(null);
    setTempStockValue("");
  };

  const cancelStockEdit = () => {
    setEditingStock(null);
    setTempStockValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveStockEdit();
    } else if (e.key === 'Escape') {
      cancelStockEdit();
    }
  };

  const PackagingCard = ({ material }: { material: PackagingMaterial }) => {
    const status = getStockStatus(material.currentStock, material.minStock);
    
    return (
      <div className="bg-gray-50 rounded-lg p-4" data-testid={`card-packaging-${material.id}`}>
        <div>
          <h4 className="font-medium text-gray-900">{material.name}</h4>
          <p className="text-sm text-gray-600">{material.description}</p>
        </div>
        <div className="mt-3 flex justify-between items-center">
          <Badge variant={status.variant}>{status.label}</Badge>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Stock:</span>
            {editingStock === material.id ? (
              <Input
                type="number"
                min="0"
                value={tempStockValue}
                onChange={(e) => setTempStockValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={saveStockEdit}
                className="w-20"
                data-testid={`input-stock-${material.id}`}
                autoFocus
              />
            ) : (
              <span
                className="min-w-[50px] text-right cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                onClick={() => startStockEdit(material.id, material.currentStock)}
                data-testid={`text-stock-${material.id}`}
              >
                {material.currentStock}
              </span>
            )}
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
        itemType="packaging"
      />
    </>
  );
}
