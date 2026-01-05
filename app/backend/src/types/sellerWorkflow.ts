/**
 * Seller Workflow Types
 * 
 * Type definitions for the Seller Workflow Service that manages
 * order preparation, label generation, and shipment confirmation.
 * 
 * @see .kiro/specs/order-lifecycle-infrastructure/design.md
 * @requirement Requirement 5: Seller Order Preparation Workflow
 */

import { OrderStatus, ShippingAddress, TrackingInfo } from '../models/Order';

/**
 * Supported shipping carriers
 */
export type ShippingCarrier = 'FEDEX' | 'UPS' | 'DHL' | 'USPS';

/**
 * Order summary for dashboard display
 */
export interface OrderSummary {
  id: string;
  orderNumber: string;
  buyerAddress: string;
  buyerName?: string;
  status: OrderStatus;
  totalAmount: number;
  currency: string;
  itemCount: number;
  createdAt: Date;
  updatedAt?: Date;
  
  // Product info
  productTitle: string;
  productImage?: string;
  
  // Shipping info
  shippingAddress?: ShippingAddress;
  trackingNumber?: string;
  trackingCarrier?: string;
  estimatedDelivery?: Date;
  
  // Flags
  isHighValue: boolean;
  isExpedited: boolean;
  requiresSignature: boolean;
  hasCancellationRequest: boolean;
}

/**
 * Seller order dashboard with orders grouped by status
 */
export interface SellerOrderDashboard {
  sellerId: string;
  
  /** Summary statistics */
  summary: {
    newOrders: number;
    processing: number;
    readyToShip: number;
    shipped: number;
    totalPendingRevenue: number;
    currency: string;
  };
  
  /** Orders grouped by status */
  orders: {
    new: OrderSummary[];
    processing: OrderSummary[];
    readyToShip: OrderSummary[];
    shipped: OrderSummary[];
  };
  
  /** Dashboard metadata */
  lastUpdated: Date;
}

/**
 * Filters for querying seller orders
 */
export interface OrderFilters {
  status?: OrderStatus[];
  dateFrom?: Date;
  dateTo?: Date;
  minAmount?: number;
  maxAmount?: number;
  hasTracking?: boolean;
  hasCancellationRequest?: boolean;
  searchQuery?: string;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'amount' | 'status';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Package dimensions for shipping
 */
export interface PackageDimensions {
  length: number;
  width: number;
  height: number;
  weight: number;
  unit: 'in' | 'cm';
  weightUnit: 'lb' | 'kg';
}

/**
 * Request for generating a shipping label
 */
export interface ShippingLabelRequest {
  carrier: ShippingCarrier;
  serviceType: string;
  packageDimensions: PackageDimensions;
  shipFromAddress: ShippingAddress;
  signatureRequired?: boolean;
  insuranceAmount?: number;
  insuranceCurrency?: string;
}

/**
 * Generated shipping label response
 */
export interface ShippingLabel {
  labelId: string;
  trackingNumber: string;
  carrier: ShippingCarrier;
  serviceType: string;
  labelUrl: string;
  labelFormat: 'PDF' | 'PNG' | 'ZPL';
  cost: number;
  currency: string;
  estimatedDelivery: Date;
  createdAt: Date;
}

/**
 * Tracking information for shipment confirmation
 */
export interface TrackingInfoInput {
  trackingNumber: string;
  carrier: ShippingCarrier | string;
  serviceType?: string;
  estimatedDelivery?: Date;
}

/**
 * Packing slip for order fulfillment
 */
export interface PackingSlip {
  orderId: string;
  orderNumber: string;
  orderDate: Date;
  
  /** Items to pack */
  items: PackingSlipItem[];
  
  /** Shipping destination */
  shippingAddress: ShippingAddress;
  
  /** Seller information */
  sellerName: string;
  sellerAddress?: ShippingAddress;
  
  /** Special instructions */
  specialInstructions?: string;
  giftMessage?: string;
  
  /** Metadata */
  generatedAt: Date;
}

/**
 * Individual item on a packing slip
 */
export interface PackingSlipItem {
  productId: string;
  productName: string;
  sku?: string;
  quantity: number;
  location?: string; // Warehouse location
  imageUrl?: string;
}

/**
 * Bulk action types
 */
export type BulkActionType = 
  | 'print_packing_slips'
  | 'generate_labels'
  | 'mark_shipped'
  | 'export';

/**
 * Bulk action request
 */
export interface BulkAction {
  type: BulkActionType;
  orderIds: string[];
  options?: BulkActionOptions;
}

/**
 * Options for bulk actions
 */
export interface BulkActionOptions {
  /** For generate_labels */
  carrier?: ShippingCarrier;
  serviceType?: string;
  packageDimensions?: PackageDimensions;
  
  /** For mark_shipped */
  trackingInfo?: TrackingInfoInput;
  
  /** For export */
  format?: 'csv' | 'xlsx' | 'pdf';
  includeFields?: string[];
}

/**
 * Result of a bulk action
 */
export interface BulkActionResult {
  operationId: string;
  type: BulkActionType;
  totalRequested: number;
  successful: number;
  failed: number;
  
  /** Per-order results */
  results: BulkActionItemResult[];
  
  /** Combined output (e.g., PDF URL for packing slips) */
  combinedOutputUrl?: string;
  
  /** Total cost for label generation */
  totalCost?: number;
  currency?: string;
  
  /** Timestamps */
  startedAt: Date;
  completedAt?: Date;
}

/**
 * Result for individual item in bulk action
 */
export interface BulkActionItemResult {
  orderId: string;
  success: boolean;
  error?: string;
  data?: {
    label?: ShippingLabel;
    packingSlipUrl?: string;
    trackingNumber?: string;
  };
}

/**
 * Tracking number validation result
 */
export interface TrackingValidationResult {
  valid: boolean;
  carrier?: ShippingCarrier;
  format?: string;
  error?: string;
}

/**
 * Order processing result
 */
export interface OrderProcessingResult {
  orderId: string;
  previousStatus: OrderStatus;
  newStatus: OrderStatus;
  processedAt: Date;
  buyerNotified: boolean;
}

/**
 * Shipment confirmation result
 */
export interface ShipmentConfirmationResult {
  orderId: string;
  trackingNumber: string;
  carrier: string;
  status: OrderStatus;
  confirmedAt: Date;
  buyerNotified: boolean;
  deliveryMonitoringStarted: boolean;
  estimatedDelivery?: Date;
}

/**
 * Available shipping services for a carrier
 */
export interface CarrierService {
  carrier: ShippingCarrier;
  serviceCode: string;
  serviceName: string;
  estimatedDays: number;
  guaranteedDelivery: boolean;
}

/**
 * Shipping rate quote
 */
export interface ShippingRate {
  carrier: ShippingCarrier;
  serviceType: string;
  serviceName: string;
  cost: number;
  currency: string;
  estimatedDays: number;
  estimatedDelivery: Date;
  guaranteedDelivery: boolean;
}

export default {
  // Export all types for convenience
};
