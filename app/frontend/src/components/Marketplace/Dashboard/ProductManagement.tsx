import React, { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { PlusIcon, PencilIcon, TrashIcon, PlayIcon, PauseIcon } from '@heroicons/react/24/outline';

// Shared components and types
import { Button } from '@/design-system/components/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { DataTable, StatusBadge } from '../shared';
import type { Product } from '../shared/types';

type ProductStatus = 'active' | 'draft' | 'sold';
type TabType = ProductStatus | 'all';

interface ExtendedProduct extends Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'status'> {
  id: string;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
  image?: string;
  stock: number;
  category: string;
}

interface ProductManagementProps {
  address: string;
}

// Mock data for demonstration
const mockProducts: ExtendedProduct[] = [
  {
    id: '1',
    name: 'Premium NFT Artwork',
    description: 'Exclusive digital artwork',
    price: '0.5',
    image: '/placeholder-product.jpg',
    status: 'active',
    category: 'Art',
    stock: 10,
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
  },
  {
    id: '2',
    name: 'Rare Collectible',
    description: 'Limited edition collectible item',
    price: '1.2',
    status: 'draft',
    category: 'Collectibles',
    stock: 5,
    createdAt: '2023-01-02',
    updatedAt: '2023-01-02',
  },
];

export const ProductManagement: React.FC<ProductManagementProps> = ({ address }) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  
  // Mock data fetch - replace with actual API call
  const { data: products = mockProducts, isLoading } = useQuery<ExtendedProduct[]>({
    queryKey: ['sellerProducts', address],
    queryFn: async () => {
      // In a real app, this would be an API call
      return mockProducts;
    },
    enabled: !!address,
  });

  const handleStatusChange = useCallback(async (productId: string, newStatus: ProductStatus) => {
    try {
      // In a real app, this would call updateProduct API
      console.log(`Updating product ${productId} status to ${newStatus}`);
      queryClient.invalidateQueries({ queryKey: ['sellerProducts', address] });
    } catch (error) {
      console.error('Error updating product status:', error);
    }
  }, [address, queryClient]);

  const handleDelete = useCallback(async (productId: string) => {
    try {
      // In a real app, this would call deleteProduct API
      console.log(`Deleting product ${productId}`);
      queryClient.invalidateQueries({ queryKey: ['sellerProducts', address] });
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  }, [address, queryClient]);

  const formatPrice = (price: string): string => {
    try {
      return `$${parseFloat(price).toFixed(2)}`;
    } catch {
      return price;
    }
  };

  // Filter products based on active tab
  const filteredProducts = React.useMemo(() => {
    if (activeTab === 'all') return products;
    return products.filter(product => product.status === activeTab);
  }, [products, activeTab]);

  // Define table columns
  const columns = React.useMemo(() => [
    {
      key: 'name',
      header: 'Product',
      render: (product: ExtendedProduct) => (
        <div className="flex items-center">
          {product.image && (
            <img
              className="h-10 w-10 rounded-md object-cover mr-3"
              src={product.image}
              alt={product.name}
            />
          )}
          <div>
            <div className="font-medium text-white">{product.name}</div>
            <div className="text-sm text-gray-400">{product.category}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      render: (product: ExtendedProduct) => (
        <div className="text-white">{formatPrice(product.price)}</div>
      ),
    },
    {
      key: 'stock',
      header: 'Stock',
      render: (product: ExtendedProduct) => (
        <div className="text-white">{product.stock}</div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (product: ExtendedProduct) => (
        <StatusBadge status={product.status} />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (product: ExtendedProduct) => (
        <div className="flex space-x-2">
          {product.status === 'draft' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleStatusChange(product.id, 'active')}
              className="text-green-500 hover:bg-green-500/10"
            >
              <PlayIcon className="h-4 w-4" />
            </Button>
          )}
          {product.status === 'active' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleStatusChange(product.id, 'draft')}
              className="text-yellow-500 hover:bg-yellow-500/10"
            >
              <PauseIcon className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => console.log('Edit', product.id)}
            className="text-blue-500 hover:bg-blue-500/10"
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(product.id)}
            className="text-red-500 hover:bg-red-500/10"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ], [handleStatusChange, handleDelete]);

  if (isLoading) {
    return <div className="p-6">Loading products...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-white">Product Management</h2>
        <Link href="/marketplace/seller/products/new" passHref>
          <Button>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </Link>
      </div>

      <GlassPanel className="p-6">
        <div className="flex space-x-4 mb-6 border-b border-gray-700 pb-4">
          {(['all', 'active', 'draft', 'sold'] as const).map((tab) => (
            <button
              key={tab}
              className={`px-4 py-2 rounded-md ${
                activeTab === tab
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <DataTable
          columns={columns}
          data={filteredProducts}
          emptyMessage="No products found"
        />
      </GlassPanel>
    </div>
  );
};