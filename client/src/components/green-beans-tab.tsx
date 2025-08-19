import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Edit, Trash2, ChevronUp, ChevronDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { GreenBean } from "@shared/schema";
import AddItemModal from "./add-item-modal";
import EditItemModal from "./edit-item-modal";

interface GreenBeansTabProps {
  searchTerm: string;
}

type SortField = 'variety' | 'origin' | 'location' | 'currentStock' | 'minStock' | 'lastUpdated';
type SortDirection = 'asc' | 'desc';

export default function GreenBeansTab({ searchTerm }: GreenBeansTabProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<GreenBean | null>(null);
  const [originFilter, setOriginFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>('variety');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [editingStock, setEditingStock] = useState<string | null>(null);
  const [tempStockValue, setTempStockValue] = useState<string>("");
  const [showDeductModal, setShowDeductModal] = useState(false);
  const [deductFromBean, setDeductFromBean] = useState<GreenBean | null>(null);
  const [deductAmount, setDeductAmount] = useState<string>("");
  const [lastDeductAmounts, setLastDeductAmounts] = useState<{[key: string]: string}>({});
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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedAndFilteredBeans = greenBeans
    .filter((bean) => {
      const matchesSearch = 
        bean.variety.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bean.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (bean.location || "Origin").toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesOrigin = originFilter === "all" || bean.origin === originFilter;
      
      return matchesSearch && matchesOrigin;
    })
    .sort((a, b) => {
      let aValue: string | number = '';
      let bValue: string | number = '';

      switch (sortField) {
        case 'variety':
          aValue = a.variety.toLowerCase();
          bValue = b.variety.toLowerCase();
          break;
        case 'origin':
          aValue = a.origin.toLowerCase();
          bValue = b.origin.toLowerCase();
          break;
        case 'location':
          aValue = (a.location || "Origin").toLowerCase();
          bValue = (b.location || "Origin").toLowerCase();
          break;
        case 'currentStock':
          aValue = parseFloat(a.currentStock || "0");
          bValue = parseFloat(b.currentStock || "0");
          break;
        case 'minStock':
          aValue = parseFloat(a.minStock || "0");
          bValue = parseFloat(b.minStock || "0");
          break;
        case 'lastUpdated':
          aValue = new Date(a.lastUpdated).getTime();
          bValue = new Date(b.lastUpdated).getTime();
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

  const uniqueOrigins = Array.from(new Set(greenBeans.map(bean => bean.origin).filter(origin => origin && origin.trim() !== '')));

  const getStockStatus = (currentStock: string, minStock: string) => {
    const current = parseFloat(currentStock);
    const min = parseFloat(minStock);
    
    if (current <= min) {
      return { label: "Low Stock", variant: "destructive" as const };
    }
    return { label: "Good Stock", variant: "default" as const };
  };

  const formatDecimal = (value: string | number): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? '0.0' : num.toFixed(1);
  };

  const startStockEdit = (id: string, currentValue: string) => {
    setEditingStock(id);
    // Store the raw numeric value without extra decimal formatting
    const numValue = parseFloat(currentValue);
    setTempStockValue(isNaN(numValue) ? "0" : numValue.toString());
  };

  const saveStockEdit = () => {
    if (editingStock && tempStockValue !== "") {
      const newStock = Math.max(0, parseFloat(tempStockValue) || 0);
      updateStockMutation.mutate({ id: editingStock, currentStock: newStock.toString() });
    }
    setEditingStock(null);
    setTempStockValue("");
  };

  const cancelStockEdit = () => {
    setEditingStock(null);
    setTempStockValue("");
  };

  const openDeductModal = (bean: GreenBean) => {
    setDeductFromBean(bean);
    // Pre-fill with last used amount for this variety, or default to empty
    const lastAmount = lastDeductAmounts[bean.variety] || "";
    setDeductAmount(lastAmount);
    setShowDeductModal(true);
  };

  const handleDeduction = () => {
    if (deductFromBean && deductAmount) {
      const currentStock = parseFloat(deductFromBean.currentStock || "0");
      const deductValue = parseFloat(deductAmount);
      const newStock = Math.max(0, currentStock - deductValue);
      
      // Store the deduction amount for this variety
      setLastDeductAmounts(prev => ({
        ...prev,
        [deductFromBean.variety]: deductAmount
      }));
      
      updateStockMutation.mutate({ 
        id: deductFromBean.id, 
        currentStock: newStock.toString() 
      });
      
      setShowDeductModal(false);
      setDeductFromBean(null);
      setDeductAmount("");
      
      toast({ 
        title: `Deducted ${deductValue.toFixed(1)}kg from ${deductFromBean.variety}`,
        description: `New stock level: ${newStock.toFixed(1)}kg`
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveStockEdit();
    } else if (e.key === 'Escape') {
      cancelStockEdit();
    }
  };

  const quickDeduct = (bean: GreenBean) => {
    const lastAmount = lastDeductAmounts[bean.variety];
    if (!lastAmount) {
      openDeductModal(bean);
      return;
    }

    const currentStock = parseFloat(bean.currentStock || "0");
    const deductValue = parseFloat(lastAmount);
    const newStock = Math.max(0, currentStock - deductValue);
    
    updateStockMutation.mutate({ 
      id: bean.id, 
      currentStock: newStock.toString() 
    });
    
    toast({ 
      title: `Quick deducted ${deductValue.toFixed(1)}kg from ${bean.variety}`,
      description: `New stock level: ${newStock.toFixed(1)}kg`
    });
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

      {sortedAndFilteredBeans.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No green beans found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    onClick={() => handleSort('variety')}
                    className="p-0 h-auto font-medium hover:bg-transparent"
                  >
                    Variety
                    {sortField === 'variety' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    onClick={() => handleSort('origin')}
                    className="p-0 h-auto font-medium hover:bg-transparent"
                  >
                    Origin
                    {sortField === 'origin' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    onClick={() => handleSort('location')}
                    className="p-0 h-auto font-medium hover:bg-transparent"
                  >
                    Location
                    {sortField === 'location' && (
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
                    Current Stock (kg)
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
                <TableHead>
                  <Button 
                    variant="ghost" 
                    onClick={() => handleSort('lastUpdated')}
                    className="p-0 h-auto font-medium hover:bg-transparent"
                  >
                    Last Updated
                    {sortField === 'lastUpdated' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFilteredBeans.map((bean) => {
                const status = getStockStatus(bean.currentStock || "0", bean.minStock || "0");
                return (
                  <TableRow key={bean.id} className="hover:bg-gray-50" data-testid={`row-green-bean-${bean.id}`}>
                    <TableCell>
                      <div className="font-medium text-gray-900">{bean.variety}</div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{bean.origin}</TableCell>
                    <TableCell className="text-sm text-gray-600">{bean.location || "Origin"}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {editingStock === bean.id ? (
                          <Input
                            type="number"
                            step="0.1"
                            value={tempStockValue}
                            onChange={(e) => setTempStockValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={saveStockEdit}
                            className="w-20"
                            data-testid={`input-stock-${bean.id}`}
                            autoFocus
                          />
                        ) : (
                          <span 
                            className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded min-w-[60px] text-center"
                            onClick={() => startStockEdit(bean.id, bean.currentStock || "0")}
                            data-testid={`text-stock-${bean.id}`}
                          >
                            {formatDecimal(bean.currentStock || "0")}
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            if (e.shiftKey && lastDeductAmounts[bean.variety]) {
                              openDeductModal(bean);
                            } else if (lastDeductAmounts[bean.variety]) {
                              quickDeduct(bean);
                            } else {
                              openDeductModal(bean);
                            }
                          }}
                          className="text-orange-600 hover:text-orange-900 px-2 py-1 flex items-center space-x-1"
                          data-testid={`button-deduct-${bean.id}`}
                          title={lastDeductAmounts[bean.variety] 
                            ? `Click: Quick deduct ${formatDecimal(lastDeductAmounts[bean.variety])}kg | Shift+Click: Set new amount` 
                            : "Deduct batch"}
                        >
                          <Minus className="h-3 w-3" />
                          {lastDeductAmounts[bean.variety] && (
                            <span className="text-xs">
                              {formatDecimal(lastDeductAmounts[bean.variety])}
                            </span>
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{formatDecimal(bean.minStock || "0")}</TableCell>
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
        itemType="green-bean"
      />

      <EditItemModal
        open={editingItem !== null}
        onOpenChange={(open) => !open && setEditingItem(null)}
        item={editingItem}
        type="green-bean"
      />

      {/* Deduction Modal */}
      <Dialog open={showDeductModal} onOpenChange={setShowDeductModal}>
        <DialogContent className="w-96">
          <DialogHeader>
            <DialogTitle>Deduct Batch from {deductFromBean?.variety}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="current-stock">Current Stock</Label>
              <div className="text-lg font-medium text-gray-900">
                {deductFromBean ? formatDecimal(deductFromBean.currentStock || "0") : "0.0"} kg
              </div>
            </div>
            <div>
              <Label htmlFor="deduct-amount">Amount to Deduct (kg)</Label>
              <Input
                type="number"
                step="0.1"
                value={deductAmount}
                onChange={(e) => setDeductAmount(e.target.value)}
                placeholder="Enter weight in kg"
                data-testid="input-deduct-amount"
                autoFocus
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setShowDeductModal(false)}
                data-testid="button-cancel-deduct"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleDeduction}
                disabled={!deductAmount || parseFloat(deductAmount) <= 0}
                data-testid="button-confirm-deduct"
              >
                Deduct Batch
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
