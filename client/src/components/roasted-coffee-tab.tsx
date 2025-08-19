import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Edit, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { RoastedCoffee, GreenBean } from "@shared/schema";
import AddItemModal from "./add-item-modal";
import EditItemModal from "./edit-item-modal";

interface RoastedCoffeeTabProps {
  searchTerm: string;
}

type SortField = 'variety' | 'roastDate' | 'greenBeanWeight';
type SortDirection = 'asc' | 'desc';

export default function RoastedCoffeeTab({ searchTerm }: RoastedCoffeeTabProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<RoastedCoffee | null>(null);
  const [sortField, setSortField] = useState<SortField>('roastDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const { toast } = useToast();

  const { data: roastedCoffee = [], isLoading } = useQuery<RoastedCoffee[]>({
    queryKey: ["/api/roasted-coffee"],
  });

  const { data: greenBeans = [] } = useQuery<GreenBean[]>({
    queryKey: ["/api/green-beans"],
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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedAndFilteredCoffee = roastedCoffee
    .filter((coffee) => {
      return coffee.variety.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => {
      let aValue: string | number = '';
      let bValue: string | number = '';

      switch (sortField) {
        case 'variety':
          aValue = a.variety.toLowerCase();
          bValue = b.variety.toLowerCase();
          break;
        case 'roastDate':
          aValue = new Date(a.roastDate).getTime();
          bValue = new Date(b.roastDate).getTime();
          break;
        case 'greenBeanWeight':
          aValue = parseFloat(a.greenBeanWeight || "0");
          bValue = parseFloat(b.greenBeanWeight || "0");
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

  const getGreenBeanInfo = (greenBeanId: string) => {
    const greenBean = greenBeans.find(bean => bean.id === greenBeanId);
    return greenBean ? `${greenBean.variety} (${greenBean.origin})` : 'Unknown';
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

      {sortedAndFilteredCoffee.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No roasted coffee found.</p>
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
                <TableHead>Green Bean Source</TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    onClick={() => handleSort('greenBeanWeight')}
                    className="p-0 h-auto font-medium hover:bg-transparent"
                  >
                    Green Bean Used (kg)
                    {sortField === 'greenBeanWeight' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    onClick={() => handleSort('roastDate')}
                    className="p-0 h-auto font-medium hover:bg-transparent"
                  >
                    Roast Date
                    {sortField === 'roastDate' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
                <TableHead>Days Since Roast</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFilteredCoffee.map((coffee) => {
                const daysSinceRoast = getDaysSinceRoast(coffee.roastDate);
                const daysLabel = getDaysLabel(daysSinceRoast);
                return (
                  <TableRow key={coffee.id} className="hover:bg-gray-50" data-testid={`row-roasted-coffee-${coffee.id}`}>
                    <TableCell>
                      <div className="font-medium text-gray-900">{coffee.variety}</div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {getGreenBeanInfo(coffee.greenBeanId)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{parseFloat(coffee.greenBeanWeight || "0").toFixed(1)}</TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {new Date(coffee.roastDate).toLocaleDateString()}
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
        itemType="roasted-coffee"
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
