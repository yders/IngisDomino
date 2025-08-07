import { useQuery } from "@tanstack/react-query";
import { Sprout, Flame, Package, AlertTriangle } from "lucide-react";
import type { GreenBean, RoastedCoffee, PackagingMaterial } from "@shared/schema";

export default function OverviewCards() {
  const { data: greenBeans = [] } = useQuery<GreenBean[]>({
    queryKey: ["/api/green-beans"],
  });

  const { data: roastedCoffee = [] } = useQuery<RoastedCoffee[]>({
    queryKey: ["/api/roasted-coffee"],
  });

  const { data: packagingMaterials = [] } = useQuery<PackagingMaterial[]>({
    queryKey: ["/api/packaging-materials"],
  });

  const totalRoastedWeight = roastedCoffee.reduce(
    (sum, item) => sum + parseFloat(item.currentWeight || "0"),
    0
  );

  const lowStockItems = [
    ...greenBeans.filter(bean => parseFloat(bean.currentStock || "0") <= parseFloat(bean.minStock || "0")),
    ...packagingMaterials.filter(material => material.currentStock <= material.minStock)
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Sprout className="text-green-600 h-8 w-8" data-testid="icon-green-beans" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Green Bean Varieties</p>
            <p className="text-2xl font-semibold text-gray-900" data-testid="text-green-bean-count">
              {greenBeans.length}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Flame className="text-coffee-500 h-8 w-8" data-testid="icon-roasted-coffee" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Roasted Coffee (kg)</p>
            <p className="text-2xl font-semibold text-gray-900" data-testid="text-roasted-weight">
              {totalRoastedWeight.toFixed(1)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Package className="text-blue-600 h-8 w-8" data-testid="icon-packaging" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Packaging Items</p>
            <p className="text-2xl font-semibold text-gray-900" data-testid="text-packaging-count">
              {packagingMaterials.length}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <AlertTriangle className="text-amber-500 h-8 w-8" data-testid="icon-low-stock" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Low Stock Alerts</p>
            <p className="text-2xl font-semibold text-gray-900" data-testid="text-low-stock-count">
              {lowStockItems.length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
