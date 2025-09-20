/**
 * Order Types - Comprehensive type definitions for order tracking system
 */

export type OrderStatus = 
  | 'CREATED'
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'DISPUTED'
  | 'CANCELLED'
  | 'REFUNDED';

export type PaymentMethod = 'crypto' | 'fiat' | 'escrow';

export interface ShippingAddress {
  name: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface BillingAddress {
  name: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  email?: string;
}

export interface TrackingInfo {
  trackingNumber?: string;
  carrier?: string;
  status?: string;
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

export interface OrderEvent {
  id: string;
  orderId: string;
  eventType: string;
  description: string;
  metadata?: any;
  timestamp: string;
  userAddress?: string;
  userType?: 'buyer' | 'seller' | 'system';
}

export interface OrderProduct {
  id: string;
  title: string;
  description: string;
  image: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  listingId: string;
  buyerAddress: string;
  sellerAddress: string;
  escrowId?: string;
  
  // Product information
  product: OrderProduct;
  
  // Payment information
  amount: string;
  paymentToken: string;
  paymentMethod: PaymentMethod;
  paymentDetails?: any;
  totalAmount: number;
  currency: string;
  paymentConfirmationHash?: string;
  escrowContractAddress?: string;
  
  // Order status and tracking
  status: OrderStatus;
  checkoutSessionId?: string;
  
  // Shipping information
  shippingAddress?: ShippingAddress;
  billingAddress?: BillingAddress;
  trackingNumber?: string;
  trackingCarrier?: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  deliveryConfirmation?: any;
  
  // Order metadata
  orderNotes?: string;
  orderMetadata?: any;
  
  // Timestamps
  createdAt: string;
  updatedAt?: string;
  
  // Related data
  timeline?: OrderEvent[];
  trackingInfo?: TrackingInfo;
  disputeId?: string;
  
  // Computed fields
  canConfirmDelivery?: boolean;
  canOpenDispute?: boolean;
  canCancel?: boolean;
  canRefund?: boolean;
  isEscrowProtected?: boolean;
  daysUntilAutoComplete?: number;
}

export interface OrderFilters {
  status?: OrderStatus;
  paymentMethod?: PaymentMethod;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  hasDispute?: boolean;
  hasTracking?: boolean;
  category?: string;
  seller?: string;
  buyer?: string;
}

export interface OrderSearchQuery {
  text?: string;
  orderId?: string;
  productTitle?: string;
  trackingNumber?: string;
  filters?: OrderFilters;
  sortBy?: 'createdAt' | 'updatedAt' | 'amount' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedOrders {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface OrderStatistics {
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  disputedOrders: number;
  totalValue: number;
  averageOrderValue: number;
  completionRate: number;
  statusBreakdown: Record<OrderStatus, number>;
}

export interface OrderNotification {
  id: string;
  orderId: string;
  type: string;
  message: string;
  metadata?: any;
  read: boolean;
  createdAt: string;
}

export interface OrderNotificationsResponse {
  notifications: OrderNotification[];
  total: number;
  unreadCount: number;
}

// Order action types for UI
export type OrderAction = 
  | 'view_details'
  | 'confirm_delivery'
  | 'add_tracking'
  | 'update_status'
  | 'open_dispute'
  | 'cancel_order'
  | 'refund_order'
  | 'contact_seller'
  | 'contact_buyer'
  | 'download_receipt'
  | 'export_data';

export interface OrderActionConfig {
  action: OrderAction;
  label: string;
  icon: string;
  variant: 'primary' | 'secondary' | 'outline' | 'danger';
  disabled?: boolean;
  tooltip?: string;
}

// Order display preferences
export interface OrderDisplayPreferences {
  itemsPerPage: number;
  defaultSort: {
    field: 'createdAt' | 'updatedAt' | 'amount' | 'status';
    order: 'asc' | 'desc';
  };
  showColumns: {
    orderId: boolean;
    product: boolean;
    amount: boolean;
    status: boolean;
    date: boolean;
    tracking: boolean;
    actions: boolean;
  };
  groupBy?: 'status' | 'date' | 'seller' | 'none';
  compactView: boolean;
}

// Order export options
export interface OrderExportOptions {
  format: 'csv' | 'json' | 'pdf';
  dateRange?: {
    from: string;
    to: string;
  };
  includeFields: string[];
  filters?: OrderFilters;
}

// Order bulk actions
export interface OrderBulkAction {
  action: 'update_status' | 'export' | 'mark_shipped' | 'send_notification';
  orderIds: string[];
  data?: any;
}

export interface OrderBulkActionResult {
  successful: number;
  failed: number;
  errors: Array<{
    orderId: string;
    error: string;
  }>;
}