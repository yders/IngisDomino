import { useState } from "react";
import { Search, Plus, Download, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import OverviewCards from "@/components/overview-cards";
import InventoryTabs from "@/components/inventory-tabs";
import AddItemModal from "@/components/add-item-modal";

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [itemType, setItemType] = useState<"green-bean" | "packaging">("green-bean");

  const handleExport = async () => {
    try {
      const response = await fetch('/api/export');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'inventory-export.json';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Coffee className="text-coffee-500 text-2xl mr-3" data-testid="logo-coffee" />
              <h1 className="text-xl font-semibold text-gray-900">Roastery Inventory</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search inventory..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 w-64 focus:ring-2 focus:ring-coffee-500 focus:border-coffee-500"
                  data-testid="input-search"
                />
                <Search className="absolute left-3 top-3 text-gray-400 h-4 w-4" />
              </div>
              <Button
                className="bg-green-600 text-white hover:bg-green-700"
                onClick={handleExport}
                data-testid="button-export"
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <OverviewCards />
        <InventoryTabs searchTerm={searchTerm} />
      </main>

      <AddItemModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        itemType={itemType}
      />
    </div>
  );
}
