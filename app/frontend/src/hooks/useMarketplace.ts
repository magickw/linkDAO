import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ethers } from 'ethers';
import { formatEther, parseEther } from 'ethers/lib/utils';

// Import types from ethers
type JsonRpcProvider = ethers.providers.JsonRpcProvider;
type Web3Provider = ethers.providers.Web3Provider;
const { Contract } = ethers;

declare global {
  interface Window {
    ethereum?: any;
  }
}
import marketplaceABI from '../contracts/Marketplace.json';

// Types
export type Product = {
  id: string;
  name: string;
  description: string;
  price: string;
  image: string;
  stock: number;
  status: 'active' | 'draft' | 'sold';
  category: string;
  createdAt: string;
  updatedAt: string;
};

export type OrderItem = {
  id: string;
  name: string;
  price: string;
  quantity: number;
  image: string;
};

export type Order = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  shippingAddress: string;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  total: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
  paymentMethod?: string;
  trackingNumber?: string;
  notes?: string;
};

type Activity = {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: Date;
  txHash?: string;
  metadata?: Record<string, any>;
};

type SellerAnalytics = {
  totalSales: string;
  totalOrders: number;
  conversionRate: number;
  avgOrderValue: string;
  totalCustomers: number;
  repeatPurchaseRate: number;
};

// Contract configuration
const MARKETPLACE_ADDRESS = process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS || '';
const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '1', 10);

// Helper function to parse product from blockchain data
const parseProductFromChain = (productData: any): Product => ({
  id: productData.id.toString(),
  name: productData.metadata?.name || 'Unnamed Product',
  description: productData.metadata?.description || '',
  price: formatEther(productData.price.toString()),
  image: productData.metadata?.image || '/placeholder-product.png',
  stock: productData.quantity.toNumber(),
  status: productData.status === 0 ? 'draft' : 'active',
  category: productData.metadata?.category || 'Uncategorized',
  createdAt: new Date(productData.createdAt.toNumber() * 1000).toISOString(),
  updatedAt: new Date(productData.updatedAt?.toNumber() * 1000 || Date.now()).toISOString(),
});

// Helper function to parse order from blockchain data
const parseOrderFromChain = (orderData: any): Order => {
  return {
    id: orderData.id?.toString() || '',
    orderNumber: `ORD-${orderData.id?.toString().padStart(6, '0') || '000000'}`,
    customerName: orderData.customerName || 'Unknown Customer',
    customerEmail: orderData.customerEmail || '',
    shippingAddress: orderData.shippingAddress || '',
    status: (orderData.status || 'pending') as Order['status'],
    total: orderData.total ? formatEther(orderData.total.toString()) : '0',
    items: Array.isArray(orderData.items) 
      ? orderData.items.map((item: any) => ({
          id: item.id?.toString() || '',
          name: item.name || 'Unknown Product',
          price: item.price ? formatEther(item.price.toString()) : '0',
          quantity: Number(item.quantity || 1),
          image: item.image || 'https://via.placeholder.com/50',
        }))
      : [],
    paymentMethod: orderData.paymentMethod || 'crypto',
    trackingNumber: orderData.trackingNumber || '',
    notes: orderData.notes || '',
    createdAt: orderData.createdAt 
      ? new Date(Number(orderData.createdAt) * 1000).toISOString() 
      : new Date().toISOString(),
    updatedAt: orderData.updatedAt 
      ? new Date(Number(orderData.updatedAt) * 1000).toISOString()
      : new Date().toISOString(),
  };
};

interface UseMarketplaceReturn {
  // Products
  getSellerProducts: (sellerAddress: string, page?: number, pageSize?: number) => Promise<{
    products: Product[];
    pagination: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }>;
  createProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<{
    id: string;
    status: 'draft';
    createdAt: string;
    updatedAt: string;
    name: string;
    description: string;
    price: string;
    category: string;
    image: string;
    stock: number;
  }>;
  updateProduct: (id: string, updates: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<{ success: boolean }>;
  deleteProduct: (id: string) => Promise<{ success: boolean }>;
  isCreatingProduct: boolean;
  isUpdatingProduct: boolean;
  isDeletingProduct: boolean;
  
  // Orders
  getSellerOrders: (sellerAddress: string, page?: number, pageSize?: number) => Promise<{
    orders: Order[];
    pagination: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }>;
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<{ success: boolean }>;
  
  // Activity
  getSellerActivity: (sellerAddress: string) => Promise<Activity[]>;
  
  // Analytics
  getSellerAnalytics: (sellerAddress: string) => Promise<{
    totalSales: string;
    totalOrders: number;
    conversionRate: number;
    avgOrderValue: string;
    totalCustomers: number;
    repeatPurchaseRate: number;
  }>;
  getSellerRevenue: (sellerAddress: string) => Promise<{
    totalRevenue: string;
    availableForWithdrawal: string;
    recentTransactions: any[];
  }>;
  getSellerPerformance: (sellerAddress: string) => Promise<{
    conversionRate: number;
    avgOrderValue: string;
    totalCustomers: number;
    repeatPurchaseRate: number;
  }>;
}

export const useMarketplace = (): UseMarketplaceReturn => {
  const { address, isConnected, chain } = useAccount();
  const queryClient = useQueryClient();

  // Contract read functions
  const { data: sellerProductsCount } = useReadContract({
    address: MARKETPLACE_ADDRESS as `0x${string}`,
    abi: marketplaceABI.abi,
    functionName: 'getSellerProductsCount',
    args: [address as `0x${string}`],
    query: {
      enabled: !!address && isConnected,
    },
    chainId: CHAIN_ID,
  });

  const { data: sellerOrdersCount } = useReadContract({
    address: MARKETPLACE_ADDRESS as `0x${string}`,
    abi: marketplaceABI.abi,
    functionName: 'getSellerOrdersCount',
    args: [address as `0x${string}`],
    query: {
      enabled: !!address && isConnected,
    },
    chainId: CHAIN_ID,
  });

  // Contract write functions
  const { writeContractAsync: createProductWrite, isPending: isCreatingProduct } = useWriteContract();
  const { writeContractAsync: updateProductWrite, isPending: isUpdatingProduct } = useWriteContract();
  const { writeContractAsync: deleteProductWrite, isPending: isDeletingProduct } = useWriteContract();
  
  // Helper function to handle contract writes
  const writeContract = async (functionName: string, args: any[]) => {
    if (!isConnected || !address) {
      throw new Error('Not connected');
    }
    
    try {
      const result = await createProductWrite({
        address: MARKETPLACE_ADDRESS as `0x${string}`,
        abi: marketplaceABI.abi,
        functionName,
        args,
        chain,
        account: address,
      });
      
      return result;
    } catch (error) {
      console.error(`Error in ${functionName}:`, error);
      throw error;
    }
  };

  // Products
  const getSellerProducts = async (sellerAddress: string, page = 1, pageSize = 10) => {
    if (!isConnected || !address) throw new Error('Not connected');
    
    if (!sellerProductsCount) {
      return {
        products: [],
        pagination: {
          total: 0,
          page,
          pageSize,
          totalPages: 0,
        },
      };
    }
    
    const count = Number(sellerProductsCount);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    // In a real app, you would fetch products by index range from the contract
    // This is a simplified example that returns mock data
    const products: Product[] = Array.from({ length: Math.min(pageSize, Math.max(0, count - startIndex)) }, (_, i) => ({
      id: (startIndex + i + 1).toString(),
      name: `Product ${startIndex + i + 1}`,
      description: `Description for product ${startIndex + i + 1}`,
      price: '0.1',
      image: 'https://via.placeholder.com/150',
      stock: 10,
      category: 'Electronics',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    
    return {
      products,
      pagination: {
        total: count,
        page,
        pageSize,
        totalPages: Math.ceil(count / pageSize),
      },
    };
  };

  const createProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
    if (!isConnected || !address) throw new Error('Not connected');
    
    const hash = await createProductWrite({
      address: MARKETPLACE_ADDRESS as `0x${string}`,
      abi: marketplaceABI.abi,
      functionName: 'createProduct',
      chain,
      account: address,
      args: [
        productData.name,
        productData.description,
        parseEther(productData.price),
        productData.stock,
        productData.category,
        {
          name: productData.name,
          description: productData.description,
          image: productData.image,
          category: productData.category,
        }
      ],
      value: BigInt(0), // No ETH value needed for product creation
    });

    // Invalidate products query to refetch
    queryClient.invalidateQueries({ queryKey: ['sellerProducts', address] });
    
    // Return the new product (in a real app, you would fetch the created product)
    const newProductId = Date.now().toString();
    
    // Invalidate products query to refetch
    queryClient.invalidateQueries({ queryKey: ['sellerProducts', address] });
    
    // Return the new product (in a real app, you would fetch the created product)
    return {
      ...productData,
      id: newProductId,
      status: 'draft' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  const updateProduct = async (productId: string, updates: Partial<Product>) => {
    if (!isConnected || !address) throw new Error('Not connected');
    
    const priceInWei = updates.price ? parseEther(updates.price) : 0;
    
    const hash = await updateProductWrite({
      address: MARKETPLACE_ADDRESS as `0x${string}`,
      abi: marketplaceABI.abi,
      functionName: 'updateProduct',
      chain,
      account: address,
      args: [
        productId,
        updates.name || '',
        updates.description || '',
        priceInWei,
        updates.stock || 0,
        updates.category || '',
        {
          name: updates.name || '',
          description: updates.description || '',
          image: updates.image || '',
          category: updates.category || '',
        }
      ],
    });

    // Invalidate products query
    queryClient.invalidateQueries({ queryKey: ['sellerProducts', address] });
    
    return { success: true };
  };

  const deleteProduct = async (productId: string) => {
    if (!isConnected || !address) throw new Error('Not connected');
    
    const hash = await deleteProductWrite({
      address: MARKETPLACE_ADDRESS as `0x${string}`,
      abi: marketplaceABI.abi,
      functionName: 'deleteProduct',
      chain,
      account: address,
      args: [productId],
    });

    // Invalidate products query
    queryClient.invalidateQueries({ queryKey: ['sellerProducts', address] });
    
    return { success: true };
  };

  // Orders
  const getSellerOrders = async (sellerAddress: string, page = 1, pageSize = 10) => {
    if (!isConnected || !address) {
      return {
        orders: [],
        pagination: {
          total: 0,
          page,
          pageSize,
          totalPages: 0,
        },
      };
    }
    
    // For now, return mock data until contract integration is complete
    const mockOrders: Order[] = Array.from({ length: 5 }, (_, i) => {
      const orderId = (page - 1) * pageSize + i + 1;
      const orderDate = new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000);
      const statuses: Order['status'][] = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const paymentMethods = ['USDC', 'USDT', 'ETH']; // Prioritize stablecoins
      const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      
      return {
        id: orderId.toString(),
        orderNumber: `ORD-${10000 + orderId}`,
        customerName: `Customer ${orderId}`,
        customerEmail: `customer${orderId}@example.com`,
        shippingAddress: `${100 + orderId} Main St, Anytown, USA`,
        status,
        total: (Math.random() * 1).toFixed(3),
        items: [
          {
            id: (orderId * 10).toString(),
            name: `Product ${orderId}`,
            price: (Math.random() * 0.5).toFixed(3),
            quantity: Math.floor(Math.random() * 3) + 1,
            image: 'https://via.placeholder.com/50'
          }
        ],
        createdAt: orderDate.toISOString(),
        updatedAt: new Date(orderDate.getTime() + Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        paymentMethod,
        trackingNumber: status !== 'pending' ? `TRK${1000000 + orderId}` : undefined,
        notes: Math.random() > 0.7 ? 'Handle with care' : ''
      };
    });
    
    return {
      orders: mockOrders,
      pagination: {
        total: mockOrders.length,
        page: 1,
        pageSize: 10,
        totalPages: 1
      }
    };
  };

  // Activity
  const getSellerActivity = async (sellerAddress: string): Promise<Activity[]> => {
    // In a real app, you would fetch activity from the blockchain
    // This is a simplified example
    return [];
  };

  // Analytics
  const getSellerAnalytics = async (sellerAddress: string) => {
    // In a real app, you would calculate analytics from on-chain data
    // This is a simplified example
    return {
      totalSales: '0',
      totalOrders: 0,
      conversionRate: 0,
      avgOrderValue: '0',
      totalCustomers: 0,
      repeatPurchaseRate: 0,
    };
  };

  // Revenue
  const getSellerRevenue = async (sellerAddress: string) => {
    // In a real app, you would fetch revenue data from the contract
    // This is a simplified example
    return {
      totalRevenue: '0',
      availableForWithdrawal: '0',
      recentTransactions: [],
    };
  };

  const getSellerPerformance = async (sellerAddress: string) => {
    // In a real app, you would calculate performance metrics from on-chain data
    // This is a simplified example
    return {
      conversionRate: 0,
      avgOrderValue: '0',
      totalCustomers: 0,
      repeatPurchaseRate: 0,
    };
  };

  // Update order status
  const updateOrderStatus = async (orderId: string, status: Order['status']): Promise<{ success: boolean; error?: string }> => {
    if (!isConnected || !address) {
      return { success: false, error: 'Please connect your wallet' };
    }

    // Map status to the expected contract status
    const statusMap: Record<Order['status'], number> = {
      'pending': 0,
      'paid': 1,
      'shipped': 2,
      'delivered': 3,
      'cancelled': 4
    };

    try {
      // Get the ABI array from the imported JSON
      const abi = Array.isArray(marketplaceABI) ? marketplaceABI : (marketplaceABI as any).abi || [];
      
      // Find the updateOrderStatus function in the ABI
      const updateOrderStatusAbi = abi.find(
        (item: any) => item.type === 'function' && item.name === 'updateOrderStatus'
      );
      
      if (!updateOrderStatusAbi) {
        throw new Error('updateOrderStatus function not found in ABI');
      }
      
      // Create contract interface
      if (!window.ethereum) {
        throw new Error('Ethereum provider not found');
      }
      
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(
        MARKETPLACE_ADDRESS,
        [updateOrderStatusAbi],
        signer
      );
      
      // Send the transaction
      const tx = await contract.updateOrderStatus(orderId, statusMap[status]);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      if (!receipt.status) {
        throw new Error('Transaction failed');
      }
      
      // Invalidate queries to refresh the UI
      await queryClient.invalidateQueries({ queryKey: ['sellerOrders', address] });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating order status:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  };

  return {
    // Products
    getSellerProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    isCreatingProduct: false, // Will be updated with actual state
    isUpdatingProduct: false, // Will be updated with actual state
    isDeletingProduct: false, // Will be updated with actual state
    
    // Orders
    getSellerOrders,
    updateOrderStatus,
    
    // Activity
    getSellerActivity,
    
    // Analytics
    getSellerAnalytics,
    getSellerRevenue,
    getSellerPerformance,
  };
};

export default useMarketplace;
