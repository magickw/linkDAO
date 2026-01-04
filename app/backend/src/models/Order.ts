// Order Management Models

export interface CreateOrderInput {
  listingId: string;
  buyerAddress: string;
  sellerAddress: string;
  amount: string;
  paymentToken: string;
  quantity?: number;
  shippingAddress?: ShippingAddress;
  notes?: string;
}

export interface UpdateOrderInput {
  status?: OrderStatus;
  trackingNumber?: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  notes?: string;
}

export interface ShippingAddress {
  name: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  trackingNumber?: string;
  carrier?: string;
  service?: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
}

export interface ShippingInfo {
  carrier: 'FEDEX' | 'UPS' | 'DHL' | 'USPS';
  service: string;
  fromAddress: ShippingAddress;
  packageInfo: {
    weight: number;
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
    value: string;
    description: string;
  };
}

export interface TrackingInfo {
  trackingNumber: string;
  carrier: string;
  status: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  events: TrackingEvent[];
}

export interface TrackingEvent {
  timestamp: string;
  status: string;
  location: string;
  description: string;
}

export enum OrderStatus {
  CREATED = 'CREATED',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  PAID = 'PAID',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  COMPLETED = 'COMPLETED',
  DISPUTED = 'DISPUTED',
  CANCELLATION_REQUESTED = 'CANCELLATION_REQUESTED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED'
}

export interface OrderEvent {
  id: string;
  orderId: string;
  eventType: string;
  description: string;
  metadata?: any;
  timestamp: string;
}

export interface OrderAnalytics {
  totalOrders: number;
  totalVolume: string;
  totalRevenue: string;
  averageOrderValue: string;
  completionRate: number;
  disputeRate: number;
  cancellationRate: number;
  avgShippingTime: number;
  avgResponseTime: number;
  repeatCustomerRate: number;
  processingOrders: number;
  completedOrders: number;
  disputedOrders: number;
  cancelledOrders: number;
  topCategories: CategoryAnalytics[];
  monthlyTrends: MonthlyTrend[];
  recentOrders: MarketplaceOrder[];
  timeRange: {
    start: Date;
    end: Date;
    period: 'week' | 'month' | 'year';
  };
}

export interface CategoryAnalytics {
  category: string;
  orderCount: number;
  volume: string;
}

export interface MonthlyTrend {
  month: string;
  orderCount: number;
  volume: string;
}

export interface MarketplaceOrder {
  id: string;
  listingId: string;
  buyerWalletAddress: string;
  sellerWalletAddress: string;
  escrowId?: string;
  amount: string;
  paymentToken: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt?: string;
  shippingAddress?: ShippingAddress;
  trackingInfo?: TrackingInfo;
  events?: OrderEvent[];
  notes?: string;

  // Additional properties for order tracking
  trackingNumber?: string;
  trackingCarrier?: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  deliveryConfirmation?: string;
  paymentMethod?: string;
  paymentConfirmationHash?: string;
  escrowContractAddress?: string;
  totalAmount?: number;
  currency?: string;
  orderNotes?: string;
  orderMetadata?: any;
  product?: {
    id: string;
    title: string;
    description: string;
    image: string;
    category: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  };
  disputeId?: string;
}

// Blockchain Event Models
export interface BlockchainEvent {
  id: string;
  orderId: string;
  escrowId: string;
  eventType: string;
  transactionHash: string;
  blockNumber: number;
  timestamp: string;
  data: any;
}

export interface EscrowEvent {
  escrowId: string;
  eventType: 'CREATED' | 'FUNDED' | 'RELEASED' | 'DISPUTED' | 'RESOLVED';
  transactionHash: string;
  blockNumber: number;
  timestamp: string;
  data: any;
}

// Notification Models
export interface OrderNotification {
  id: string;
  orderId: string;
  userAddress: string;
  type: string;
  message: string;
  metadata?: any;
  read: boolean;
  createdAt: string;
}

// Dispute Models
export interface DisputeResolution {
  disputeId: string;
  resolution: 'BUYER_FAVOR' | 'SELLER_FAVOR' | 'PARTIAL_REFUND';
  amount?: string;
  reason: string;
  resolvedBy: string;
  resolvedAt: string;
}
