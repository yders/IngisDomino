import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, ChevronUp, ChevronDown, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { PackagingMaterial } from "@shared/schema";
import AddItemModal from "./add-item-modal";
import EditItemModal from "./edit-item-modal";

interface PackagingTabProps {
  searchTerm: string;
}

type SortField = 'name' | 'type' | 'size' | 'description' | 'currentStock' | 'minStock';
type SortDirection = 'asc' | 'desc';

export default function PackagingTab({ searchTerm }: PackagingTabProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PackagingMaterial | null>(null);
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/packaging-materials/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packaging-materials"] });
      toast({ title: "Packaging material deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete packaging material", variant: "destructive" });
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
        case 'type':
          aValue = a.type.toLowerCase();
          bValue = b.type.toLowerCase();
          break;
        case 'size':
          aValue = a.size.toLowerCase();
          bValue = b.size.toLowerCase();
          break;
        case 'description':
          aValue = (a.description || '').toLowerCase();
          bValue = (b.description || '').toLowerCase();
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

  // Remove the separation by type - show all in one table

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

  const getTypeLabel = (type: string) => {
    return type === 'coffee_bag' ? 'Coffee Bag' : 'Post Bag';
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

      {sortedAndFilteredMaterials.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No packaging materials found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    onClick={() => handleSort('name')}
                    className="p-0 h-auto font-medium hover:bg-transparent"
                  >
                    Name
                    {sortField === 'name' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    onClick={() => handleSort('type')}
                    className="p-0 h-auto font-medium hover:bg-transparent"
                  >
                    Type
                    {sortField === 'type' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    onClick={() => handleSort('size')}
                    className="p-0 h-auto font-medium hover:bg-transparent"
                  >
                    Size
                    {sortField === 'size' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    onClick={() => handleSort('description')}
                    className="p-0 h-auto font-medium hover:bg-transparent"
                  >
                    Description
                    {sortField === 'description' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    onClick={() => handleSort('currentStock')}
                    className="p-0 h-auto font-medium hover:bg-transparent"
                  >
                    Current Stock
                    {sortField === 'currentStock' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    onClick={() => handleSort('minStock')}
                    className="p-0 h-auto font-medium hover:bg-transparent"
                  >
                    Min. Stock
                    {sortField === 'minStock' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFilteredMaterials.map((material) => {
                const status = getStockStatus(material.currentStock, material.minStock);
                return (
                  <TableRow key={material.id} className="hover:bg-gray-50" data-testid={`row-packaging-${material.id}`}>
                    <TableCell>
                      <div className="font-medium text-gray-900">{material.name}</div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {getTypeLabel(material.type)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{material.size}</TableCell>
                    <TableCell className="text-sm text-gray-600">{material.description}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
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
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{material.minStock}</TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingItem(material)}
                          className="text-coffee-600 hover:text-coffee-900"
                          data-testid={`button-edit-${material.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(material.id)}
                          className="text-red-600 hover:text-red-900"
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-${material.id}`}
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
        itemType="packaging"
      />

      <EditItemModal
        open={editingItem !== null}
        onOpenChange={(open) => !open && setEditingItem(null)}
        item={editingItem}
        type="packaging"
      />
    </>
  );
}
