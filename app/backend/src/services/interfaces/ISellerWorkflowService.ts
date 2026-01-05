/**
 * ISellerWorkflowService Interface
 * 
 * Interface for the Seller Workflow Service that manages order preparation,
 * label generation, and shipment confirmation for marketplace sellers.
 * 
 * Key features:
 * - Order dashboard with status-based grouping
 * - Order processing workflow (start processing, ready to ship, confirm shipment)
 * - Integrated shipping label generation
 * - Packing slip generation
 * - Bulk operations support
 * 
 * @see .kiro/specs/order-lifecycle-infrastructure/design.md
 * @requirement Requirement 5: Seller Order Preparation Workflow
 */

import {
  SellerOrderDashboard,
  OrderFilters,
  PaginationOptions,
  ShippingLabelRequest,
  ShippingLabel,
  TrackingInfoInput,
  PackingSlip,
  BulkAction,
  BulkActionResult,
  OrderProcessingResult,
  ShipmentConfirmationResult,
  TrackingValidationResult,
  ShippingRate,
  OrderSummary,
} from '../../types/sellerWorkflow';

/**
 * Interface for the Seller Workflow Service
 * 
 * This service is responsible for:
 * 1. Providing a dashboard view of seller orders grouped by status
 * 2. Managing order processing workflow (start processing, ready to ship)
 * 3. Generating shipping labels through carrier integrations
 * 4. Confirming shipments and starting delivery monitoring
 * 5. Generating packing slips for order fulfillment
 * 6. Supporting bulk operations for high-volume sellers
 * 
 * @requirement 5.1 - Dashboard displays orders grouped by status
 * @requirement 5.2 - Start processing updates status and notifies buyer
 * @requirement 5.3 - Ready to ship prompts shipping method and generates label
 * @requirement 5.4 - Tracking number validation by carrier format
 * @requirement 5.5 - Shipment confirmation updates status, notifies buyer, starts monitoring
 * @requirement 5.6 - Packing slip with items, quantities, shipping address
 * @requirement 5.7 - Bulk actions for multiple orders
 */
export interface ISellerWorkflowService {
  /**
   * Get the seller's order dashboard with orders grouped by status.
   * 
   * Returns a dashboard view containing:
   * - Summary statistics (counts, pending revenue)
   * - Orders grouped by status (New, Processing, Ready to Ship, Shipped)
   * 
   * @param sellerId - The ID of the seller
   * @param filters - Optional filters to apply to the orders
   * @returns The seller's order dashboard
   * 
   * @requirement 5.1 - Dashboard displays orders grouped by status
   * 
   * @example
   * ```typescript
   * const dashboard = await service.getOrderDashboard('seller-123');
   * console.log(`New orders: ${dashboard.summary.newOrders}`);
   * console.log(`Pending revenue: ${dashboard.summary.totalPendingRevenue}`);
   * ```
   */
  getOrderDashboard(
    sellerId: string,
    filters?: OrderFilters
  ): Promise<SellerOrderDashboard>;

  /**
   * Start processing an order.
   * 
   * This method:
   * 1. Validates the order belongs to the seller
   * 2. Validates the order is in a valid state (PAID)
   * 3. Updates the order status to PROCESSING
   * 4. Creates an audit event
   * 5. Notifies the buyer that their order is being processed
   * 
   * @param orderId - The ID of the order to start processing
   * @param sellerId - The ID of the seller (for authorization)
   * @returns Result of the processing operation
   * 
   * @throws Error if order not found, not owned by seller, or invalid status
   * 
   * @requirement 5.2 - Start processing updates status to PROCESSING and notifies buyer
   * 
   * @example
   * ```typescript
   * const result = await service.startProcessing('order-456', 'seller-123');
   * console.log(`Order ${result.orderId} now ${result.newStatus}`);
   * console.log(`Buyer notified: ${result.buyerNotified}`);
   * ```
   */
  startProcessing(
    orderId: string,
    sellerId: string
  ): Promise<OrderProcessingResult>;

  /**
   * Mark an order as ready to ship.
   * 
   * This method:
   * 1. Validates the order belongs to the seller
   * 2. Validates the order is in PROCESSING status
   * 3. Updates the order status to indicate it's ready for shipment
   * 4. Creates an audit event
   * 
   * After calling this method, the seller should either:
   * - Generate a shipping label using generateShippingLabel()
   * - Confirm shipment with manual tracking using confirmShipment()
   * 
   * @param orderId - The ID of the order to mark as ready
   * @param sellerId - The ID of the seller (for authorization)
   * @returns Result of the operation
   * 
   * @throws Error if order not found, not owned by seller, or invalid status
   * 
   * @requirement 5.3 - Ready to ship prompts shipping method selection
   * 
   * @example
   * ```typescript
   * const result = await service.markReadyToShip('order-456', 'seller-123');
   * // Now prompt seller for shipping method selection
   * ```
   */
  markReadyToShip(
    orderId: string,
    sellerId: string
  ): Promise<OrderProcessingResult>;

  /**
   * Generate a shipping label for an order.
   * 
   * This method:
   * 1. Validates the order belongs to the seller
   * 2. Validates the order is ready for shipping
   * 3. Calls the carrier API to generate a label
   * 4. Stores the tracking number, label URL, and shipment ID
   * 5. Returns the generated label details
   * 
   * Supported carriers: FEDEX, UPS, DHL, USPS
   * 
   * @param orderId - The ID of the order
   * @param sellerId - The ID of the seller (for authorization)
   * @param request - The shipping label request with carrier and package details
   * @returns The generated shipping label
   * 
   * @throws Error if order not found, not owned by seller, or carrier API fails
   * 
   * @requirement 5.3 - Generate shipping label if integrated
   * @requirement 6.1 - Label generation for supported carriers
   * @requirement 6.2 - Rate calculation based on package dimensions
   * @requirement 6.3 - Store tracking number, label URL, shipment ID
   * 
   * @example
   * ```typescript
   * const label = await service.generateShippingLabel('order-456', 'seller-123', {
   *   carrier: 'FEDEX',
   *   serviceType: 'FEDEX_GROUND',
   *   packageDimensions: {
   *     length: 12,
   *     width: 8,
   *     height: 6,
   *     weight: 2.5,
   *     unit: 'in',
   *     weightUnit: 'lb'
   *   },
   *   shipFromAddress: {
   *     name: 'Seller Store',
   *     street: '123 Main St',
   *     city: 'New York',
   *     state: 'NY',
   *     postalCode: '10001',
   *     country: 'US'
   *   }
   * });
   * console.log(`Label URL: ${label.labelUrl}`);
   * console.log(`Tracking: ${label.trackingNumber}`);
   * ```
   */
  generateShippingLabel(
    orderId: string,
    sellerId: string,
    request: ShippingLabelRequest
  ): Promise<ShippingLabel>;

  /**
   * Confirm shipment of an order.
   * 
   * This method:
   * 1. Validates the order belongs to the seller
   * 2. Validates the tracking number format for the carrier
   * 3. Updates the order status to SHIPPED
   * 4. Stores the tracking information
   * 5. Creates an audit event
   * 6. Notifies the buyer with tracking information
   * 7. Starts delivery monitoring (polling carrier for updates)
   * 
   * Can be used with:
   * - Tracking from a generated label (generateShippingLabel)
   * - Manually entered tracking information
   * 
   * @param orderId - The ID of the order
   * @param sellerId - The ID of the seller (for authorization)
   * @param trackingInfo - The tracking information for the shipment
   * @returns Result of the shipment confirmation
   * 
   * @throws Error if order not found, not owned by seller, or invalid tracking
   * 
   * @requirement 5.4 - Validate tracking number format and carrier
   * @requirement 5.5 - Update status to SHIPPED, notify buyer, start monitoring
   * @requirement 6.7 - Allow manual tracking entry without label generation
   * 
   * @example
   * ```typescript
   * // With generated label
   * const result = await service.confirmShipment('order-456', 'seller-123', {
   *   trackingNumber: label.trackingNumber,
   *   carrier: label.carrier
   * });
   * 
   * // With manual tracking
   * const result = await service.confirmShipment('order-456', 'seller-123', {
   *   trackingNumber: '1Z999AA10123456784',
   *   carrier: 'UPS',
   *   estimatedDelivery: new Date('2024-01-15')
   * });
   * 
   * console.log(`Shipment confirmed: ${result.confirmedAt}`);
   * console.log(`Buyer notified: ${result.buyerNotified}`);
   * ```
   */
  confirmShipment(
    orderId: string,
    sellerId: string,
    trackingInfo: TrackingInfoInput
  ): Promise<ShipmentConfirmationResult>;

  /**
   * Get a packing slip for an order.
   * 
   * Returns a packing slip containing:
   * - Order details (ID, date)
   * - Items with quantities and locations
   * - Shipping address
   * - Special instructions or gift messages
   * 
   * @param orderId - The ID of the order
   * @param sellerId - The ID of the seller (for authorization)
   * @returns The packing slip for the order
   * 
   * @throws Error if order not found or not owned by seller
   * 
   * @requirement 5.6 - Packing slip with items, quantities, shipping address
   * 
   * @example
   * ```typescript
   * const packingSlip = await service.getPackingSlip('order-456', 'seller-123');
   * console.log(`Order: ${packingSlip.orderNumber}`);
   * packingSlip.items.forEach(item => {
   *   console.log(`- ${item.quantity}x ${item.productName}`);
   * });
   * ```
   */
  getPackingSlip(
    orderId: string,
    sellerId: string
  ): Promise<PackingSlip>;

  /**
   * Perform a bulk action on multiple orders.
   * 
   * Supported actions:
   * - print_packing_slips: Generate combined PDF of packing slips
   * - generate_labels: Generate shipping labels for multiple orders
   * - mark_shipped: Mark multiple orders as shipped with tracking
   * - export: Export order data to CSV/Excel
   * 
   * Bulk operations:
   * - Process orders sequentially
   * - Report success/failure for each order
   * - Continue on individual failures
   * - Return combined results
   * 
   * @param sellerId - The ID of the seller (for authorization)
   * @param action - The bulk action to perform
   * @returns Result of the bulk operation
   * 
   * @throws Error if no orders specified or invalid action type
   * 
   * @requirement 5.7 - Bulk actions (print labels, mark shipped, export)
   * @requirement 12.1 - Multi-select enables bulk actions
   * @requirement 12.2 - Sequential processing with per-item reporting
   * @requirement 12.5 - Partial failure handling
   * 
   * @example
   * ```typescript
   * // Bulk print packing slips
   * const result = await service.bulkAction('seller-123', {
   *   type: 'print_packing_slips',
   *   orderIds: ['order-1', 'order-2', 'order-3']
   * });
   * console.log(`Combined PDF: ${result.combinedOutputUrl}`);
   * 
   * // Bulk generate labels
   * const labelResult = await service.bulkAction('seller-123', {
   *   type: 'generate_labels',
   *   orderIds: ['order-1', 'order-2'],
   *   options: {
   *     carrier: 'FEDEX',
   *     serviceType: 'FEDEX_GROUND',
   *     packageDimensions: { ... }
   *   }
   * });
   * console.log(`Success: ${labelResult.successful}, Failed: ${labelResult.failed}`);
   * ```
   */
  bulkAction(
    sellerId: string,
    action: BulkAction
  ): Promise<BulkActionResult>;

  /**
   * Validate a tracking number format for a carrier.
   * 
   * Validates the tracking number against known carrier formats:
   * - FEDEX: 12-22 digits
   * - UPS: 1Z followed by 16 alphanumeric characters
   * - DHL: 10-11 digits
   * - USPS: 20-22 digits or 13 characters (international)
   * 
   * @param trackingNumber - The tracking number to validate
   * @param carrier - Optional carrier to validate against (auto-detects if not provided)
   * @returns Validation result with detected carrier
   * 
   * @requirement 5.4 - Validate tracking number format and carrier
   * 
   * @example
   * ```typescript
   * const result = await service.validateTrackingNumber('1Z999AA10123456784');
   * if (result.valid) {
   *   console.log(`Valid ${result.carrier} tracking number`);
   * } else {
   *   console.log(`Invalid: ${result.error}`);
   * }
   * ```
   */
  validateTrackingNumber(
    trackingNumber: string,
    carrier?: string
  ): Promise<TrackingValidationResult>;

  /**
   * Get available shipping rates for an order.
   * 
   * Queries multiple carriers for shipping rates based on:
   * - Package dimensions and weight
   * - Origin and destination addresses
   * - Service types available
   * 
   * @param orderId - The ID of the order
   * @param sellerId - The ID of the seller (for authorization)
   * @param packageDimensions - The package dimensions for rate calculation
   * @param shipFromAddress - The origin address
   * @returns Array of available shipping rates
   * 
   * @requirement 6.2 - Calculate rates based on package dimensions, weight, destination
   * 
   * @example
   * ```typescript
   * const rates = await service.getShippingRates('order-456', 'seller-123', {
   *   length: 12, width: 8, height: 6, weight: 2.5, unit: 'in', weightUnit: 'lb'
   * }, shipFromAddress);
   * 
   * rates.forEach(rate => {
   *   console.log(`${rate.carrier} ${rate.serviceName}: $${rate.cost}`);
   * });
   * ```
   */
  getShippingRates(
    orderId: string,
    sellerId: string,
    packageDimensions: {
      length: number;
      width: number;
      height: number;
      weight: number;
      unit: 'in' | 'cm';
      weightUnit: 'lb' | 'kg';
    },
    shipFromAddress: {
      name: string;
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    }
  ): Promise<ShippingRate[]>;

  /**
   * Get a single order by ID for the seller.
   * 
   * @param orderId - The ID of the order
   * @param sellerId - The ID of the seller (for authorization)
   * @returns The order summary or null if not found
   */
  getOrder(
    orderId: string,
    sellerId: string
  ): Promise<OrderSummary | null>;

  /**
   * Get orders for a seller with pagination and filtering.
   * 
   * @param sellerId - The ID of the seller
   * @param filters - Optional filters to apply
   * @param pagination - Pagination options
   * @returns Paginated list of orders
   */
  getOrders(
    sellerId: string,
    filters?: OrderFilters,
    pagination?: PaginationOptions
  ): Promise<{
    orders: OrderSummary[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;
}

/**
 * Factory function type for creating ISellerWorkflowService instances
 */
export type SellerWorkflowServiceFactory = () => ISellerWorkflowService;

export default ISellerWorkflowService;
