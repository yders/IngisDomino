import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GreenBeansTab from "./green-beans-tab";
import PackagingTab from "./packaging-tab";

interface InventoryTabsProps {
  searchTerm: string;
}

export default function InventoryTabs({ searchTerm }: InventoryTabsProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <Tabs defaultValue="green-beans" className="w-full">
        <div className="border-b border-gray-200">
          <TabsList className="flex space-x-8 px-6 bg-transparent h-auto p-0">
            <TabsTrigger 
              value="green-beans"
              className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap data-[state=active]:border-coffee-500 data-[state=active]:text-coffee-600 data-[state=active]:bg-transparent"
              data-testid="tab-green-beans"
            >
              Green Beans
            </TabsTrigger>

            <TabsTrigger 
              value="packaging"
              className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap data-[state=active]:border-coffee-500 data-[state=active]:text-coffee-600 data-[state=active]:bg-transparent"
              data-testid="tab-packaging"
            >
              Packaging Materials
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="green-beans" className="p-6">
          <GreenBeansTab searchTerm={searchTerm} />
        </TabsContent>

        <TabsContent value="packaging" className="p-6">
          <PackagingTab searchTerm={searchTerm} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
