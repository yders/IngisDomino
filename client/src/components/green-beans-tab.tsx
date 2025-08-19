import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { GreenBean } from "@shared/schema";
import AddItemModal from "./add-item-modal";
import EditItemModal from "./edit-item-modal";

interface GreenBeansTabProps {
  searchTerm: string;
}

export default function GreenBeansTab({ searchTerm }: GreenBeansTabProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<GreenBean | null>(null);
  const [originFilter, setOriginFilter] = useState<string>("all");
  const { toast } = useToast();

  const { data: greenBeans = [], isLoading } = useQuery<GreenBean[]>({
    queryKey: ["/api/green-beans"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/green-beans/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/green-beans"] });
      toast({ title: "Green bean deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete green bean", variant: "destructive" });
    },
  });

  const updateStockMutation = useMutation({
    mutationFn: async ({ id, currentStock }: { id: string; currentStock: string }) => {
      await apiRequest("PUT", `/api/green-beans/${id}`, { currentStock });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/green-beans"] });
    },
    onError: () => {
      toast({ title: "Failed to update stock", variant: "destructive" });
    },
  });

  const filteredBeans = greenBeans.filter((bean) => {
    const matchesSearch = 
      bean.variety.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bean.origin.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesOrigin = originFilter === "all" || bean.origin === originFilter;
    
    return matchesSearch && matchesOrigin;
  });

  const uniqueOrigins = Array.from(new Set(greenBeans.map(bean => bean.origin).filter(origin => origin && origin.trim() !== '')));

  const getStockStatus = (currentStock: string, minStock: string) => {
    const current = parseFloat(currentStock);
    const min = parseFloat(minStock);
    
    if (current <= min) {
      return { label: "Low Stock", variant: "destructive" as const };
    }
    return { label: "Good Stock", variant: "default" as const };
  };

  const handleStockChange = (id: string, value: string) => {
    updateStockMutation.mutate({ id, currentStock: value });
  };

  if (isLoading) {
    return <div className="p-6">Loading green beans...</div>;
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Green Bean Inventory</h2>
        <div className="flex space-x-3">
          <Select value={originFilter} onValueChange={setOriginFilter}>
            <SelectTrigger className="w-48" data-testid="select-origin-filter">
              <SelectValue placeholder="All Origins" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Origins</SelectItem>
              {uniqueOrigins.map((origin) => (
                <SelectItem key={origin} value={origin}>
                  {origin}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            className="bg-coffee-500 text-white hover:bg-coffee-600"
            onClick={() => setShowAddModal(true)}
            data-testid="button-add-green-bean"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Green Bean
          </Button>
        </div>
      </div>

      {filteredBeans.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No green beans found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Variety</TableHead>
                <TableHead>Origin</TableHead>
                <TableHead>Current Stock (kg)</TableHead>
                <TableHead>Min. Stock</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBeans.map((bean) => {
                const status = getStockStatus(bean.currentStock || "0", bean.minStock || "0");
                return (
                  <TableRow key={bean.id} className="hover:bg-gray-50" data-testid={`row-green-bean-${bean.id}`}>
                    <TableCell>
                      <div className="font-medium text-gray-900">{bean.variety}</div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{bean.origin}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.1"
                        value={bean.currentStock}
                        onChange={(e) => handleStockChange(bean.id, e.target.value)}
                        className="w-20"
                        data-testid={`input-stock-${bean.id}`}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{bean.minStock}</TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {new Date(bean.lastUpdated).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingItem(bean)}
                          className="text-coffee-600 hover:text-coffee-900"
                          data-testid={`button-edit-${bean.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(bean.id)}
                          className="text-red-600 hover:text-red-900"
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-${bean.id}`}
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
        defaultType="green-bean"
      />

      <EditItemModal
        open={editingItem !== null}
        onOpenChange={(open) => !open && setEditingItem(null)}
        item={editingItem}
        type="green-bean"
      />
    </>
  );
}
