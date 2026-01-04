# Order Lifecycle Infrastructure - Design Document

## Overview

This design document specifies the technical architecture for the complete marketplace order lifecycle infrastructure. The system extends the existing order management capabilities with receipt generation, visual order tracking, cancellation workflows, seller notifications, delivery integration, and administrative monitoring tools.

### Design Goals

1. **Seamless Buyer Experience**: Provide clear visibility into order status with receipts, timelines, and accurate delivery estimates
2. **Efficient Seller Operations**: Streamline order fulfillment with notifications, preparation workflows, and bulk operations
3. **Comprehensive Admin Control**: Enable platform oversight with dashboards, financial monitoring, and intervention tools
4. **Audit Compliance**: Maintain complete audit trails for all order lifecycle events
5. **Real-time Updates**: Leverage existing WebSocket infrastructure for instant status synchronization
6. **Scalable Architecture**: Support high-volume sellers with batched notifications and bulk operations

### Key Design Decisions

- **PDF Generation**: Use server-side PDF generation (PDFKit/Puppeteer) for consistent receipt formatting
- **Notification Batching**: Implement queue-based notification system with configurable batching windows
- **Carrier Integration**: Abstract carrier APIs behind unified interface for extensibility
- **Timeline Visualization**: Client-side timeline component consuming order events via WebSocket
- **Cancellation State Machine**: Implement explicit state transitions with timeout-based auto-approval

## Architecture

### System Context Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Order Lifecycle System                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │    Buyer     │    │    Seller    │    │    Admin     │                   │
│  │   Frontend   │    │   Frontend   │    │   Frontend   │                   │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘                   │
│         │                   │                   │                            │
│         └───────────────────┼───────────────────┘                            │
│                             │                                                │
│                    ┌────────▼────────┐                                       │
│                    │   API Gateway   │                                       │
│                    │  (REST + WS)    │                                       │
│                    └────────┬────────┘                                       │
│                             │                                                │
│  ┌──────────────────────────┼──────────────────────────┐                    │
│  │                          │                          │                    │
│  ▼                          ▼                          ▼                    │
│ ┌────────────┐    ┌────────────────┐    ┌────────────────┐                │
│ │  Receipt   │    │  Order Status  │    │  Cancellation  │                │
│ │  Service   │    │    Service     │    │    Service     │                │
│ └─────┬──────┘    └───────┬────────┘    └───────┬────────┘                │
│       │                   │                     │                          │
│  ┌────▼───────────────────▼─────────────────────▼────┐                    │
│  │              Order Lifecycle Orchestrator          │                    │
│  └────┬───────────────────┬─────────────────────┬────┘                    │
│       │                   │                     │                          │
│  ┌────▼──────┐    ┌───────▼───────┐    ┌───────▼───────┐                  │
│  │ Delivery  │    │  Notification │    │    Audit      │                  │
│  │ Service   │    │    Service    │    │   Service     │                  │
│  └─────┬─────┘    └───────┬───────┘    └───────┬───────┘                  │
│        │                  │                    │                           │
└────────┼──────────────────┼────────────────────┼───────────────────────────┘
         │                  │                    │
    ┌────▼────┐      ┌──────▼──────┐      ┌──────▼──────┐
    │ Carrier │      │   Email/    │      │  Database   │
    │  APIs   │      │   Push      │      │  (Postgres) │
    └─────────┘      └─────────────┘      └─────────────┘
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Backend Services Layer                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌──────────────────┐ │
│  │   ReceiptService    │  │ OrderTimelineService│  │CancellationService│ │
│  │  - generateReceipt  │  │  - getTimeline      │  │  - requestCancel │ │
│  │  - generatePDF      │  │  - updateMilestone  │  │  - approveCancel │ │
│  │  - sendReceiptEmail │  │  - syncCarrierData  │  │  - processRefund │ │
│  └─────────────────────┘  └─────────────────────┘  └──────────────────┘ │
│                                                                          │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌──────────────────┐ │
│  │SellerNotificationSvc│  │SellerWorkflowService│  │DeliveryIntegration│ │
│  │  - queueNotification│  │  - startProcessing  │  │  - calculateRates│ │
│  │  - batchAndSend     │  │  - generateLabel    │  │  - generateLabel │ │
│  │  - respectPrefs     │  │  - confirmShipment  │  │  - pollTracking  │ │
│  └─────────────────────┘  └─────────────────────┘  └──────────────────┘ │
│                                                                          │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌──────────────────┐ │
│  │AdminDashboardService│  │FinancialMonitorSvc  │  │  AuditService    │ │
│  │  - getMetrics       │  │  - getGMV           │  │  - logEvent      │ │
│  │  - getOrdersFiltered│  │  - trackRefunds     │  │  - getAuditLog   │ │
│  │  - performAction    │  │  - generateReport   │  │  - exportLogs    │ │
│  └─────────────────────┘  └─────────────────────┘  └──────────────────┘ │
│                                                                          │
│  ┌─────────────────────┐  ┌─────────────────────┐                       │
│  │DeliveryEstimateService│ │ BulkOperationsService│                      │
│  │  - calculateEstimate│  │  - bulkPrintLabels  │                       │
│  │  - updateEstimate   │  │  - bulkMarkShipped  │                       │
│  │  - notifyChanges    │  │  - bulkExport       │                       │
│  └─────────────────────┘  └─────────────────────┘                       │
└─────────────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Receipt Service

**Purpose**: Generate, store, and deliver order receipts to buyers.

```typescript
interface IReceiptService {
  generateReceipt(orderId: string): Promise<Receipt>;
  generatePDF(receipt: Receipt): Promise<Buffer>;
  sendReceiptEmail(orderId: string, recipientEmail: string): Promise<void>;
  getReceiptByOrderId(orderId: string): Promise<Receipt | null>;
  downloadReceipt(orderId: string): Promise<{ buffer: Buffer; filename: string }>;
}

interface Receipt {
  id: string;
  orderId: string;
  orderNumber: string;
  createdAt: Date;
  
  // Buyer info
  buyerName: string;
  buyerEmail: string;
  shippingAddress: Address;
  
  // Items
  items: ReceiptLineItem[];
  
  // Pricing
  subtotal: number;
  shippingCost: number;
  platformFee: number;
  taxes: number;
  totalAmount: number;
  currency: string;
  
  // Payment details
  paymentMethod: 'crypto' | 'fiat';
  cryptoDetails?: {
    transactionHash: string;
    network: string;
    tokenSymbol: string;
    tokenAmount: string;
  };
  fiatDetails?: {
    processorReference: string;
    last4Digits: string;
    confirmationNumber: string;
  };
  
  // Escrow info
  escrowDetails?: {
    contractAddress: string;
    status: string;
  };
  
  // PDF reference
  pdfUrl?: string;
  pdfGeneratedAt?: Date;
}

interface ReceiptLineItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  imageUrl?: string;
}
```

### 2. Order Timeline Service

**Purpose**: Manage visual order timeline with real-time updates and carrier integration.

```typescript
interface IOrderTimelineService {
  getTimeline(orderId: string): Promise<OrderTimeline>;
  addMilestone(orderId: string, milestone: TimelineMilestone): Promise<void>;
  updateMilestone(orderId: string, milestoneId: string, update: Partial<TimelineMilestone>): Promise<void>;
  syncCarrierTracking(orderId: string): Promise<void>;
  getEstimatedDelivery(orderId: string): Promise<DeliveryEstimate>;
}

interface OrderTimeline {
  orderId: string;
  currentStatus: OrderStatus;
  milestones: TimelineMilestone[];
  estimatedDelivery?: DeliveryEstimate;
  shipments: ShipmentTimeline[];
}

interface TimelineMilestone {
  id: string;
  status: OrderStatus;
  title: string;
  description?: string;
  timestamp?: Date;
  estimatedTime?: Date;
  isCompleted: boolean;
  isCurrent: boolean;
  hasIssue: boolean;
  issueDetails?: {
    type: 'delayed' | 'exception' | 'failed_delivery';
    message: string;
    suggestedActions: string[];
  };
}

interface ShipmentTimeline {
  shipmentId: string;
  trackingNumber: string;
  carrier: string;
  items: string[]; // product IDs
  events: CarrierTrackingEvent[];
  currentStatus: string;
  estimatedDelivery?: Date;
}
```

### 3. Cancellation Service

**Purpose**: Handle order cancellation requests, approvals, and refund processing.

```typescript
interface ICancellationService {
  requestCancellation(orderId: string, buyerId: string, reason: string): Promise<CancellationRequest>;
  approveCancellation(requestId: string, sellerId: string): Promise<void>;
  denyCancellation(requestId: string, sellerId: string, reason: string): Promise<void>;
  processAutoApproval(): Promise<void>; // Cron job for 24-hour timeout
  getCancellationStatus(orderId: string): Promise<CancellationRequest | null>;
}

interface CancellationRequest {
  id: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  requestedAt: Date;
  reason: string;
  status: 'pending' | 'approved' | 'denied' | 'auto_approved';
  respondedAt?: Date;
  responseReason?: string;
  refundStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  refundDetails?: RefundDetails;
}

interface RefundDetails {
  amount: number;
  currency: string;
  method: 'crypto_escrow_release' | 'fiat_processor_refund';
  transactionId?: string;
  processedAt?: Date;
}

// Cancellation rules by status
const CANCELLATION_RULES = {
  CREATED: { allowed: true, requiresApproval: false },
  PAYMENT_PENDING: { allowed: true, requiresApproval: false },
  PAID: { allowed: true, requiresApproval: false },
  PROCESSING: { allowed: true, requiresApproval: true, approvalTimeoutHours: 24 },
  SHIPPED: { allowed: false, redirectTo: 'return_process' },
  DELIVERED: { allowed: false, redirectTo: 'return_process' },
  COMPLETED: { allowed: false, redirectTo: 'return_process' },
  DISPUTED: { allowed: false, message: 'Order is under dispute' },
  CANCELLED: { allowed: false, message: 'Order already cancelled' },
  REFUNDED: { allowed: false, message: 'Order already refunded' }
};
```

### 4. Seller Notification Service

**Purpose**: Manage seller notifications with batching, priority, and preference handling.

```typescript
interface ISellerNotificationService {
  queueNotification(notification: SellerNotification): Promise<void>;
  processNotificationQueue(): Promise<void>; // Runs every minute
  getNotificationPreferences(sellerId: string): Promise<NotificationPreferences>;
  updateNotificationPreferences(sellerId: string, prefs: Partial<NotificationPreferences>): Promise<void>;
}

interface SellerNotification {
  id: string;
  sellerId: string;
  type: 'new_order' | 'cancellation_request' | 'dispute_opened' | 'review_received';
  priority: 'normal' | 'high' | 'urgent';
  orderId?: string;
  title: string;
  body: string;
  data: Record<string, any>;
  channels: ('push' | 'email' | 'in_app')[];
  createdAt: Date;
  sentAt?: Date;
  batchId?: string;
}

interface NotificationPreferences {
  sellerId: string;
  pushEnabled: boolean;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  quietHoursStart?: string; // "22:00"
  quietHoursEnd?: string;   // "08:00"
  quietHoursTimezone?: string;
  batchingEnabled: boolean;
  batchWindowMinutes: number; // default 1
  highValueThreshold?: number; // Orders above this are marked urgent
}

// Batching logic
const NOTIFICATION_BATCHING = {
  maxBatchSize: 10,
  maxBatchWindowMs: 60000, // 1 minute
  urgentBypassBatching: true
};
```

### 5. Seller Workflow Service

**Purpose**: Manage seller order preparation, label generation, and shipment confirmation.

```typescript
interface ISellerWorkflowService {
  getOrderDashboard(sellerId: string, filters?: OrderFilters): Promise<SellerOrderDashboard>;
  startProcessing(orderId: string, sellerId: string): Promise<void>;
  markReadyToShip(orderId: string, sellerId: string): Promise<void>;
  generateShippingLabel(orderId: string, shippingRequest: ShippingLabelRequest): Promise<ShippingLabel>;
  confirmShipment(orderId: string, trackingInfo: TrackingInfo): Promise<void>;
  getPackingSlip(orderId: string): Promise<PackingSlip>;
  bulkAction(sellerId: string, action: BulkAction): Promise<BulkActionResult>;
}

interface SellerOrderDashboard {
  sellerId: string;
  summary: {
    newOrders: number;
    processing: number;
    readyToShip: number;
    shipped: number;
    totalPendingRevenue: number;
  };
  orders: {
    new: OrderSummary[];
    processing: OrderSummary[];
    readyToShip: OrderSummary[];
    shipped: OrderSummary[];
  };
}

interface ShippingLabelRequest {
  carrier: 'FEDEX' | 'UPS' | 'DHL' | 'USPS';
  serviceType: string;
  packageDimensions: {
    length: number;
    width: number;
    height: number;
    weight: number;
    unit: 'in' | 'cm';
    weightUnit: 'lb' | 'kg';
  };
  shipFromAddress: Address;
}

interface ShippingLabel {
  labelId: string;
  trackingNumber: string;
  carrier: string;
  serviceType: string;
  labelUrl: string;
  labelFormat: 'PDF' | 'PNG' | 'ZPL';
  cost: number;
  currency: string;
  estimatedDelivery: Date;
}

interface PackingSlip {
  orderId: string;
  orderNumber: string;
  orderDate: Date;
  items: PackingSlipItem[];
  shippingAddress: Address;
  specialInstructions?: string;
}

interface BulkAction {
  type: 'print_packing_slips' | 'generate_labels' | 'mark_shipped' | 'export';
  orderIds: string[];
  options?: Record<string, any>;
}

interface BulkActionResult {
  totalRequested: number;
  successful: number;
  failed: number;
  results: {
    orderId: string;
    success: boolean;
    error?: string;
    data?: any;
  }[];
}
```

### 6. Delivery Integration Service

**Purpose**: Abstract carrier APIs for rate calculation, label generation, and tracking.

```typescript
interface IDeliveryIntegrationService {
  calculateRates(request: RateRequest): Promise<ShippingRate[]>;
  generateLabel(request: LabelRequest): Promise<ShippingLabel>;
  getTrackingUpdates(trackingNumber: string, carrier: string): Promise<TrackingUpdate[]>;
  pollAllActiveShipments(): Promise<void>; // Cron job
  handleDeliveryException(shipmentId: string, exception: DeliveryException): Promise<void>;
}

interface RateRequest {
  fromAddress: Address;
  toAddress: Address;
  packageDetails: PackageDetails;
  carriers?: string[]; // Filter to specific carriers
}

interface ShippingRate {
  carrier: string;
  serviceType: string;
  serviceName: string;
  cost: number;
  currency: string;
  estimatedDays: number;
  estimatedDelivery: Date;
  guaranteedDelivery: boolean;
}

interface TrackingUpdate {
  timestamp: Date;
  status: string;
  statusCode: string;
  location?: string;
  description: string;
  isDelivered: boolean;
  isException: boolean;
  exceptionType?: string;
}

interface DeliveryException {
  type: 'failed_attempt' | 'address_issue' | 'damaged' | 'lost' | 'weather_delay' | 'customs_hold';
  description: string;
  actionRequired: boolean;
  suggestedActions: string[];
}
```

### 7. Admin Dashboard Service

**Purpose**: Provide administrative oversight of all marketplace orders.

```typescript
interface IAdminDashboardService {
  getOrderMetrics(dateRange?: DateRange): Promise<OrderMetrics>;
  getOrders(filters: AdminOrderFilters, pagination: Pagination): Promise<PaginatedOrders>;
  getOrderDetails(orderId: string): Promise<AdminOrderDetails>;
  getDelayedOrders(slaThresholdHours: number): Promise<OrderSummary[]>;
  performAdminAction(orderId: string, action: AdminAction): Promise<void>;
  getOrderTrends(dateRange: DateRange, granularity: 'hour' | 'day' | 'week'): Promise<OrderTrends>;
}

interface OrderMetrics {
  totalOrders: number;
  ordersByStatus: Record<OrderStatus, number>;
  averageFulfillmentTimeHours: number;
  disputeRate: number;
  cancellationRate: number;
  todayOrders: number;
  todayRevenue: number;
}

interface AdminOrderFilters {
  status?: OrderStatus[];
  dateRange?: DateRange;
  sellerId?: string;
  buyerId?: string;
  paymentMethod?: 'crypto' | 'fiat';
  amountMin?: number;
  amountMax?: number;
  hasDispute?: boolean;
  isDelayed?: boolean;
  searchQuery?: string;
}

interface AdminOrderDetails {
  order: Order;
  timeline: OrderTimeline;
  auditLog: AuditEvent[];
  buyer: UserSummary;
  seller: UserSummary;
  availableActions: AdminAction[];
  alerts: OrderAlert[];
}

interface AdminAction {
  type: 'contact_buyer' | 'contact_seller' | 'override_status' | 'initiate_refund' | 'escalate_dispute' | 'add_note';
  params?: Record<string, any>;
  requiresJustification: boolean;
}

interface OrderTrends {
  labels: string[];
  datasets: {
    orderVolume: number[];
    revenue: number[];
    statusDistribution: Record<OrderStatus, number[]>;
  };
}
```

### 8. Financial Monitoring Service

**Purpose**: Track financial metrics, refunds, and generate reports.

```typescript
interface IFinancialMonitoringService {
  getFinancialDashboard(dateRange?: DateRange): Promise<FinancialDashboard>;
  getTransactionBreakdown(filters: TransactionFilters): Promise<TransactionBreakdown>;
  trackRefund(refundId: string): Promise<RefundTracking>;
  getSellerPayouts(sellerId: string, dateRange?: DateRange): Promise<SellerPayoutSummary>;
  generateReport(reportType: ReportType, filters: ReportFilters): Promise<ReportResult>;
  flagDiscrepancy(transactionId: string, reason: string): Promise<void>;
}

interface FinancialDashboard {
  gmv: number; // Gross Merchandise Value
  platformFeesCollected: number;
  refundsProcessed: number;
  netRevenue: number;
  currency: string;
  periodComparison: {
    gmvChange: number;
    feesChange: number;
    refundsChange: number;
  };
}

interface TransactionBreakdown {
  byPaymentMethod: {
    crypto: { count: number; volume: number };
    fiat: { count: number; volume: number };
  };
  byCurrency: Record<string, { count: number; volume: number }>;
  byTimePeriod: { period: string; volume: number }[];
}

interface SellerPayoutSummary {
  sellerId: string;
  pending: { count: number; amount: number };
  processing: { count: number; amount: number };
  completed: { count: number; amount: number };
  payouts: PayoutRecord[];
  feeBreakdown: {
    platformFees: number;
    paymentProcessingFees: number;
    refundDeductions: number;
  };
}

interface ReportResult {
  reportId: string;
  type: ReportType;
  generatedAt: Date;
  format: 'csv' | 'xlsx' | 'pdf';
  downloadUrl: string;
  expiresAt: Date;
}
```

### 9. Audit Service

**Purpose**: Maintain comprehensive audit trails for all order lifecycle events.

```typescript
interface IAuditService {
  logEvent(event: AuditEventInput): Promise<AuditEvent>;
  getAuditLog(orderId: string, filters?: AuditFilters): Promise<AuditEvent[]>;
  exportAuditLog(orderId: string, format: 'csv' | 'json'): Promise<ExportResult>;
  getAuditSummary(orderId: string): Promise<AuditSummary>;
}

interface AuditEventInput {
  orderId: string;
  eventType: AuditEventType;
  actor: {
    type: 'user' | 'system' | 'admin';
    id?: string;
    name?: string;
  };
  details: Record<string, any>;
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
}

type AuditEventType = 
  | 'order_created'
  | 'payment_initiated'
  | 'payment_completed'
  | 'status_changed'
  | 'cancellation_requested'
  | 'cancellation_approved'
  | 'cancellation_denied'
  | 'refund_initiated'
  | 'refund_completed'
  | 'shipment_created'
  | 'tracking_updated'
  | 'delivery_confirmed'
  | 'dispute_opened'
  | 'dispute_resolved'
  | 'admin_action'
  | 'communication_sent'
  | 'receipt_generated';

interface AuditEvent {
  id: string;
  orderId: string;
  eventType: AuditEventType;
  actor: {
    type: 'user' | 'system' | 'admin';
    id?: string;
    name?: string;
  };
  timestamp: Date;
  details: Record<string, any>;
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

interface AuditSummary {
  orderId: string;
  totalEvents: number;
  eventsByType: Record<AuditEventType, number>;
  firstEvent: Date;
  lastEvent: Date;
  actors: { type: string; count: number }[];
}
```

### 10. Delivery Estimate Service

**Purpose**: Calculate and update estimated delivery dates.

```typescript
interface IDeliveryEstimateService {
  calculateInitialEstimate(orderId: string): Promise<DeliveryEstimate>;
  updateEstimateFromCarrier(orderId: string, carrierData: CarrierTransitData): Promise<DeliveryEstimate>;
  recalculateOnDelay(orderId: string, delayInfo: DelayInfo): Promise<DeliveryEstimate>;
  notifyEstimateChange(orderId: string, previousEstimate: DeliveryEstimate, newEstimate: DeliveryEstimate): Promise<void>;
  getSellerProcessingTime(sellerId: string): Promise<number>; // Average hours
}

interface DeliveryEstimate {
  orderId: string;
  estimatedDeliveryMin: Date;
  estimatedDeliveryMax: Date;
  confidence: 'high' | 'medium' | 'low';
  factors: {
    sellerProcessingDays: number;
    carrierTransitDays: number;
    bufferDays: number;
  };
  lastUpdated: Date;
  source: 'initial_calculation' | 'carrier_data' | 'delay_adjustment';
}

interface CarrierTransitData {
  carrier: string;
  serviceType: string;
  originZip: string;
  destinationZip: string;
  transitDays: number;
  guaranteedDelivery?: Date;
}

interface DelayInfo {
  reason: string;
  additionalDays: number;
  source: 'carrier' | 'seller' | 'system';
}
```

### 11. Order Search Service

**Purpose**: Provide powerful search and filtering across orders.

```typescript
interface IOrderSearchService {
  search(query: OrderSearchQuery, userContext: UserContext): Promise<OrderSearchResult>;
  getSuggestions(partialQuery: string, userContext: UserContext): Promise<SearchSuggestion[]>;
}

interface OrderSearchQuery {
  searchText?: string; // Order ID, product name, buyer/seller name, tracking number
  filters: {
    status?: OrderStatus[];
    dateRange?: DateRange;
    priceMin?: number;
    priceMax?: number;
    paymentMethod?: 'crypto' | 'fiat';
    carrier?: string;
  };
  sort: {
    field: 'date' | 'amount' | 'status' | 'estimatedDelivery';
    direction: 'asc' | 'desc';
  };
  pagination: Pagination;
}

interface UserContext {
  userId: string;
  role: 'buyer' | 'seller' | 'admin';
}

interface OrderSearchResult {
  orders: OrderSummary[];
  totalCount: number;
  facets: {
    statusCounts: Record<OrderStatus, number>;
    paymentMethodCounts: Record<string, number>;
    carrierCounts: Record<string, number>;
  };
  suggestions?: string[];
}

interface SearchSuggestion {
  type: 'order_id' | 'product' | 'user' | 'tracking';
  value: string;
  displayText: string;
  metadata?: Record<string, any>;
}
```

### 12. Bulk Operations Service

**Purpose**: Handle high-volume seller operations efficiently.

```typescript
interface IBulkOperationsService {
  printPackingSlips(sellerId: string, orderIds: string[]): Promise<BulkPrintResult>;
  generateLabels(sellerId: string, requests: BulkLabelRequest[]): Promise<BulkLabelResult>;
  markShipped(sellerId: string, shipments: BulkShipmentInfo[]): Promise<BulkShipmentResult>;
  exportOrders(sellerId: string, orderIds: string[], format: 'csv' | 'xlsx'): Promise<ExportResult>;
  getOperationProgress(operationId: string): Promise<OperationProgress>;
  cancelOperation(operationId: string): Promise<void>;
}

interface BulkLabelRequest {
  orderId: string;
  carrier: string;
  serviceType: string;
  packageDetails: PackageDetails;
}

interface BulkShipmentInfo {
  orderId: string;
  trackingNumber: string;
  carrier: string;
}

interface BulkPrintResult {
  operationId: string;
  totalRequested: number;
  successful: number;
  failed: number;
  combinedPdfUrl?: string;
  results: {
    orderId: string;
    success: boolean;
    error?: string;
  }[];
}

interface BulkLabelResult {
  operationId: string;
  totalRequested: number;
  successful: number;
  failed: number;
  totalCost: number;
  results: {
    orderId: string;
    success: boolean;
    label?: ShippingLabel;
    error?: string;
  }[];
}

interface OperationProgress {
  operationId: string;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'failed';
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  startedAt: Date;
  completedAt?: Date;
  canCancel: boolean;
}
```

## Data Models

### New Database Tables

#### order_receipts
```sql
CREATE TABLE order_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  receipt_number VARCHAR(50) NOT NULL UNIQUE,
  
  -- Buyer info
  buyer_name VARCHAR(255) NOT NULL,
  buyer_email VARCHAR(255),
  shipping_address JSONB NOT NULL,
  
  -- Items snapshot
  items JSONB NOT NULL, -- Array of ReceiptLineItem
  
  -- Pricing
  subtotal DECIMAL(18, 8) NOT NULL,
  shipping_cost DECIMAL(18, 8) NOT NULL DEFAULT 0,
  platform_fee DECIMAL(18, 8) NOT NULL DEFAULT 0,
  taxes DECIMAL(18, 8) NOT NULL DEFAULT 0,
  total_amount DECIMAL(18, 8) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  
  -- Payment details
  payment_method VARCHAR(20) NOT NULL, -- 'crypto' | 'fiat'
  crypto_details JSONB, -- { transactionHash, network, tokenSymbol, tokenAmount }
  fiat_details JSONB, -- { processorReference, last4Digits, confirmationNumber }
  escrow_details JSONB, -- { contractAddress, status }
  
  -- PDF
  pdf_storage_key VARCHAR(500),
  pdf_generated_at TIMESTAMPTZ,
  
  -- Email
  email_sent_at TIMESTAMPTZ,
  email_status VARCHAR(20), -- 'pending' | 'sent' | 'failed'
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_receipts_order_id ON order_receipts(order_id);
CREATE INDEX idx_order_receipts_receipt_number ON order_receipts(receipt_number);
```

#### order_cancellations
```sql
CREATE TABLE order_cancellations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  buyer_id UUID NOT NULL REFERENCES users(id),
  seller_id UUID NOT NULL REFERENCES users(id),
  
  -- Request details
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT NOT NULL,
  order_status_at_request VARCHAR(50) NOT NULL,
  
  -- Response
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'denied' | 'auto_approved'
  responded_at TIMESTAMPTZ,
  response_reason TEXT,
  responded_by UUID REFERENCES users(id),
  
  -- Auto-approval tracking
  auto_approve_at TIMESTAMPTZ, -- Set to requested_at + 24 hours if requires approval
  
  -- Refund tracking
  refund_status VARCHAR(20), -- 'pending' | 'processing' | 'completed' | 'failed'
  refund_amount DECIMAL(18, 8),
  refund_currency VARCHAR(10),
  refund_method VARCHAR(50), -- 'crypto_escrow_release' | 'fiat_processor_refund'
  refund_transaction_id VARCHAR(255),
  refund_processed_at TIMESTAMPTZ,
  refund_error TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_cancellations_order_id ON order_cancellations(order_id);
CREATE INDEX idx_order_cancellations_status ON order_cancellations(status);
CREATE INDEX idx_order_cancellations_auto_approve ON order_cancellations(auto_approve_at) WHERE status = 'pending';
```

#### delivery_estimates
```sql
CREATE TABLE delivery_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  shipment_id UUID REFERENCES shipments(id),
  
  -- Estimate range
  estimated_delivery_min TIMESTAMPTZ NOT NULL,
  estimated_delivery_max TIMESTAMPTZ NOT NULL,
  confidence VARCHAR(10) NOT NULL DEFAULT 'medium', -- 'high' | 'medium' | 'low'
  
  -- Calculation factors
  seller_processing_days INTEGER NOT NULL DEFAULT 1,
  carrier_transit_days INTEGER NOT NULL DEFAULT 3,
  buffer_days INTEGER NOT NULL DEFAULT 1,
  
  -- Source tracking
  source VARCHAR(30) NOT NULL, -- 'initial_calculation' | 'carrier_data' | 'delay_adjustment'
  carrier_data JSONB, -- Raw carrier transit data if available
  
  -- Change tracking
  previous_estimate_min TIMESTAMPTZ,
  previous_estimate_max TIMESTAMPTZ,
  change_reason TEXT,
  buyer_notified_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_delivery_estimates_order_id ON delivery_estimates(order_id);
CREATE INDEX idx_delivery_estimates_shipment_id ON delivery_estimates(shipment_id);
CREATE UNIQUE INDEX idx_delivery_estimates_active ON delivery_estimates(order_id) 
  WHERE shipment_id IS NULL; -- Only one active estimate per order without shipment
```

#### seller_notification_queue
```sql
CREATE TABLE seller_notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES users(id),
  
  -- Notification content
  type VARCHAR(50) NOT NULL, -- 'new_order' | 'cancellation_request' | 'dispute_opened' | 'review_received'
  priority VARCHAR(10) NOT NULL DEFAULT 'normal', -- 'normal' | 'high' | 'urgent'
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  order_id UUID REFERENCES orders(id),
  
  -- Delivery channels
  channels TEXT[] NOT NULL DEFAULT ARRAY['push', 'email', 'in_app'],
  
  -- Batching
  batch_id UUID,
  batch_window_end TIMESTAMPTZ,
  
  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending' | 'batched' | 'sent' | 'failed'
  sent_at TIMESTAMPTZ,
  error TEXT,
  
  -- Delivery status per channel
  push_sent_at TIMESTAMPTZ,
  push_status VARCHAR(20),
  email_sent_at TIMESTAMPTZ,
  email_status VARCHAR(20),
  in_app_sent_at TIMESTAMPTZ,
  in_app_status VARCHAR(20),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_seller_notification_queue_seller_id ON seller_notification_queue(seller_id);
CREATE INDEX idx_seller_notification_queue_status ON seller_notification_queue(status);
CREATE INDEX idx_seller_notification_queue_batch ON seller_notification_queue(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX idx_seller_notification_queue_pending ON seller_notification_queue(batch_window_end) 
  WHERE status = 'pending';
```

#### seller_notification_preferences
```sql
CREATE TABLE seller_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES users(id) UNIQUE,
  
  -- Channel preferences
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Quiet hours
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  quiet_hours_timezone VARCHAR(50) DEFAULT 'UTC',
  
  -- Batching
  batching_enabled BOOLEAN NOT NULL DEFAULT true,
  batch_window_minutes INTEGER NOT NULL DEFAULT 1,
  
  -- Thresholds
  high_value_threshold DECIMAL(18, 8), -- Orders above this are marked urgent
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_seller_notification_preferences_seller ON seller_notification_preferences(seller_id);
```

### Existing Table Enhancements

#### orders table additions
```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_requested_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS receipt_generated_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS receipt_id UUID REFERENCES order_receipts(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery_min TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery_max TIMESTAMPTZ;
```

#### order_events table - ensure event types
```sql
-- Ensure order_events supports all lifecycle event types
-- Event types to support:
-- 'order_created', 'payment_initiated', 'payment_completed', 'status_changed',
-- 'cancellation_requested', 'cancellation_approved', 'cancellation_denied', 'cancellation_auto_approved',
-- 'refund_initiated', 'refund_completed', 'refund_failed',
-- 'shipment_created', 'label_generated', 'tracking_updated', 'delivery_confirmed', 'delivery_exception',
-- 'dispute_opened', 'dispute_resolved',
-- 'admin_action', 'communication_sent', 'receipt_generated', 'estimate_updated'

CREATE INDEX IF NOT EXISTS idx_order_events_order_id_type ON order_events(order_id, event_type);
CREATE INDEX IF NOT EXISTS idx_order_events_created_at ON order_events(created_at);
```

#### tracking_records table additions
```sql
ALTER TABLE tracking_records ADD COLUMN IF NOT EXISTS delivery_estimate_updated_at TIMESTAMPTZ;
ALTER TABLE tracking_records ADD COLUMN IF NOT EXISTS exception_type VARCHAR(50);
ALTER TABLE tracking_records ADD COLUMN IF NOT EXISTS exception_details JSONB;
ALTER TABLE tracking_records ADD COLUMN IF NOT EXISTS exception_resolved_at TIMESTAMPTZ;
ALTER TABLE tracking_records ADD COLUMN IF NOT EXISTS last_carrier_poll_at TIMESTAMPTZ;
```

### API Endpoints

#### Receipt Endpoints
```
POST   /api/orders/:orderId/receipt          - Generate receipt for order
GET    /api/orders/:orderId/receipt          - Get receipt details
GET    /api/orders/:orderId/receipt/download - Download receipt PDF
POST   /api/orders/:orderId/receipt/email    - Resend receipt email
```

#### Timeline Endpoints
```
GET    /api/orders/:orderId/timeline         - Get order timeline with milestones
GET    /api/orders/:orderId/tracking         - Get carrier tracking events
```

#### Cancellation Endpoints
```
POST   /api/orders/:orderId/cancel           - Request cancellation (buyer)
POST   /api/orders/:orderId/cancel/approve   - Approve cancellation (seller)
POST   /api/orders/:orderId/cancel/deny      - Deny cancellation (seller)
GET    /api/orders/:orderId/cancel/status    - Get cancellation status
```

#### Seller Workflow Endpoints
```
GET    /api/seller/orders/dashboard          - Get seller order dashboard
POST   /api/seller/orders/:orderId/process   - Start processing order
POST   /api/seller/orders/:orderId/ready     - Mark ready to ship
POST   /api/seller/orders/:orderId/ship      - Confirm shipment
GET    /api/seller/orders/:orderId/packing-slip - Get packing slip
POST   /api/seller/orders/bulk               - Perform bulk action
```

#### Delivery Endpoints
```
POST   /api/shipping/rates                   - Calculate shipping rates
POST   /api/shipping/labels                  - Generate shipping label
GET    /api/shipping/tracking/:trackingNumber - Get tracking updates
```

#### Admin Endpoints
```
GET    /api/admin/orders/metrics             - Get order metrics
GET    /api/admin/orders                     - Get filtered orders
GET    /api/admin/orders/:orderId            - Get admin order details
POST   /api/admin/orders/:orderId/action     - Perform admin action
GET    /api/admin/orders/trends              - Get order trends
GET    /api/admin/orders/delayed             - Get delayed orders
```

#### Financial Endpoints
```
GET    /api/admin/financial/dashboard        - Get financial dashboard
GET    /api/admin/financial/transactions     - Get transaction breakdown
GET    /api/admin/financial/payouts/:sellerId - Get seller payouts
POST   /api/admin/financial/reports          - Generate financial report
POST   /api/admin/financial/flag             - Flag transaction discrepancy
```

#### Audit Endpoints
```
GET    /api/orders/:orderId/audit            - Get order audit log
GET    /api/orders/:orderId/audit/export     - Export audit log
```

#### Search Endpoints
```
GET    /api/orders/search                    - Search orders
GET    /api/orders/search/suggestions        - Get search suggestions
```

## Correctness Properties

Based on analysis of all 84 acceptance criteria across 12 requirements, the following correctness properties must be verified:

### Receipt System Properties (Req 1)

| Property ID | Description | Verification Method |
|-------------|-------------|---------------------|
| CP-R1.1 | Receipt generation triggers on payment completion and contains all required fields (order ID, items, quantities, prices, fees, taxes, shipping, total) | Unit test: verify receipt content completeness |
| CP-R1.2 | PDF generation produces valid, downloadable document accessible from order history | Integration test: generate PDF, verify file validity and accessibility |
| CP-R1.3 | Email delivery occurs when buyer has configured email, with receipt attachment | Integration test: mock email service, verify attachment |
| CP-R1.4 | In-app receipt displays all transaction details with functional download button | E2E test: render receipt view, verify all fields and download action |
| CP-R1.5 | Crypto payment receipts include transaction hash, network, and token details | Unit test: verify crypto details presence for crypto orders |
| CP-R1.6 | Fiat payment receipts include last 4 digits, processor reference, confirmation number | Unit test: verify fiat details presence for fiat orders |
| CP-R1.7 | Escrow-protected orders show escrow status and contract address on receipt | Unit test: verify escrow details presence when applicable |

### Timeline Properties (Req 2)

| Property ID | Description | Verification Method |
|-------------|-------------|---------------------|
| CP-R2.1 | Timeline displays all order states from CREATED to COMPLETED | Unit test: verify milestone completeness |
| CP-R2.2 | Status changes broadcast via WebSocket within 1 second and highlight current state | Integration test: mock WebSocket, verify broadcast timing and state |
| CP-R2.3 | PROCESSING/SHIPPED orders display estimated delivery date | Unit test: verify estimate presence for applicable statuses |
| CP-R2.4 | Carrier tracking events integrate into timeline when available | Integration test: mock carrier API, verify event integration |
| CP-R2.5 | Issues (delayed, exception) highlighted with explanation and suggested actions | Unit test: verify issue display for exception scenarios |
| CP-R2.6 | Completed milestones show timestamps; upcoming show estimates | Unit test: verify timestamp/estimate logic |
| CP-R2.7 | Multi-shipment orders display separate tracking timelines per shipment | Unit test: verify timeline separation for multi-shipment orders |

### Cancellation Properties (Req 3)

| Property ID | Description | Verification Method |
|-------------|-------------|---------------------|
| CP-R3.1 | Orders in CREATED, PAYMENT_PENDING, PAID allow immediate cancellation | Unit test: verify cancellation allowed for each status |
| CP-R3.2 | PROCESSING orders require seller approval with 24-hour timeout | Unit test: verify approval requirement and timeout setting |
| CP-R3.3 | SHIPPED+ orders reject cancellation and redirect to return process | Unit test: verify rejection and redirect message |
| CP-R3.4 | Approved cancellations initiate correct refund method (crypto/fiat) | Integration test: verify refund initiation by payment type |
| CP-R3.5 | Cancellation requests trigger immediate multi-channel seller notification | Integration test: verify notification timing (<30s) and channels |
| CP-R3.6 | Unanswered cancellation requests auto-approve after 24 hours | Integration test: verify cron job auto-approval logic |
| CP-R3.7 | Cancelled orders update status, create audit event, update inventory | Integration test: verify all three side effects |

### Seller Notification Properties (Req 4)

| Property ID | Description | Verification Method |
|-------------|-------------|---------------------|
| CP-R4.1 | New order push notifications sent within 30 seconds | Performance test: measure notification latency |
| CP-R4.2 | Email notifications include order summary, buyer info, action links | Unit test: verify email content completeness |
| CP-R4.3 | In-app badge displays and order added to pending queue | Integration test: verify badge increment and queue addition |
| CP-R4.4 | Rapid orders batch to max 1 notification per minute | Unit test: verify batching logic with rapid order simulation |
| CP-R4.5 | Quiet hours and channel preferences respected | Unit test: verify preference filtering logic |
| CP-R4.6 | High-value/expedited orders marked as high priority | Unit test: verify priority assignment logic |
| CP-R4.7 | Notification provides one-click access to order details | E2E test: verify deep link functionality |

### Seller Workflow Properties (Req 5)

| Property ID | Description | Verification Method |
|-------------|-------------|---------------------|
| CP-R5.1 | Dashboard groups orders by status (New, Processing, Ready to Ship, Shipped) | Unit test: verify grouping logic |
| CP-R5.2 | Starting processing updates status to PROCESSING and notifies buyer | Integration test: verify status change and notification |
| CP-R5.3 | Ready to ship prompts shipping method and generates label if integrated | E2E test: verify prompt and label generation flow |
| CP-R5.4 | Manual tracking entry validates format and carrier | Unit test: verify validation rules per carrier |
| CP-R5.5 | Shipment confirmation updates status, notifies buyer, starts monitoring | Integration test: verify all three actions |
| CP-R5.6 | Packing slip displays items, quantities, shipping address | Unit test: verify packing slip content |
| CP-R5.7 | Bulk actions (print, ship, export) available for multiple orders | Integration test: verify bulk action execution |

### Delivery Integration Properties (Req 6)

| Property ID | Description | Verification Method |
|-------------|-------------|---------------------|
| CP-R6.1 | Label generation offered for FEDEX, UPS, DHL, USPS | Unit test: verify carrier availability |
| CP-R6.2 | Rate calculation uses package dimensions, weight, destination | Integration test: mock carrier API, verify rate request params |
| CP-R6.3 | Generated labels store tracking number, label URL, shipment ID | Unit test: verify data persistence |
| CP-R6.4 | Active shipments polled for tracking updates and synced to timeline | Integration test: verify polling and sync |
| CP-R6.5 | Carrier delivery confirmation updates status to DELIVERED, notifies both parties | Integration test: verify status update and dual notification |
| CP-R6.6 | Delivery exceptions alert both parties with resolution options | Integration test: verify exception handling and notifications |
| CP-R6.7 | Manual shipping allows tracking entry without label generation | Unit test: verify manual entry path |

### Admin Dashboard Properties (Req 7)

| Property ID | Description | Verification Method |
|-------------|-------------|---------------------|
| CP-R7.1 | Dashboard displays real-time metrics (total, by status, avg fulfillment, dispute rate) | Unit test: verify metric calculations |
| CP-R7.2 | Filters available: status, date, seller, buyer, payment method, amount | E2E test: verify filter functionality |
| CP-R7.3 | Order selection shows details, timeline, audit log, available actions | E2E test: verify detail view completeness |
| CP-R7.4 | Delayed orders (beyond SLA) highlighted with alerts | Unit test: verify SLA threshold logic |
| CP-R7.5 | Disputes surfaced prominently with evidence access | E2E test: verify dispute visibility and evidence links |
| CP-R7.6 | Trend charts show volume, revenue, status distribution over time | Unit test: verify chart data aggregation |
| CP-R7.7 | Admin actions available: contact, override status, refund, escalate | E2E test: verify action availability and execution |

### Financial Monitoring Properties (Req 8)

| Property ID | Description | Verification Method |
|-------------|-------------|---------------------|
| CP-R8.1 | Dashboard displays GMV, fees, refunds, net revenue | Unit test: verify calculation accuracy |
| CP-R8.2 | Transaction breakdown by payment method, currency, time period | Unit test: verify aggregation logic |
| CP-R8.3 | Refunds tracked with amounts, reasons, payout impact | Unit test: verify refund tracking completeness |
| CP-R8.4 | Escrow transactions log blockchain details for reconciliation | Integration test: verify blockchain event logging |
| CP-R8.5 | Reports exportable to CSV/Excel with date/filter customization | Integration test: verify export functionality |
| CP-R8.6 | Discrepancies flagged for manual review with audit trail | Unit test: verify flagging logic |
| CP-R8.7 | Seller payouts show pending/processing/completed with fee breakdown | Unit test: verify payout status tracking |

### Audit System Properties (Req 9)

| Property ID | Description | Verification Method |
|-------------|-------------|---------------------|
| CP-R9.1 | All order actions create audit event with timestamp, actor, type, details | Integration test: verify event creation for all action types |
| CP-R9.2 | Audit log displays chronological events with expandable details | E2E test: verify log display and expansion |
| CP-R9.3 | Status changes log previous/new status, reason, actor | Unit test: verify status change event content |
| CP-R9.4 | Payments log method, amount, reference, confirmation status | Unit test: verify payment event content |
| CP-R9.5 | Communications log timestamps and references (not full content) | Unit test: verify privacy-compliant logging |
| CP-R9.6 | Admin actions log admin ID, action, justification, outcome | Unit test: verify admin action event content |
| CP-R9.7 | Audit export supports filtered export for compliance | Integration test: verify filtered export functionality |

### Delivery Estimate Properties (Req 10)

| Property ID | Description | Verification Method |
|-------------|-------------|---------------------|
| CP-R10.1 | Initial estimate calculated from seller processing time + shipping method | Unit test: verify calculation formula |
| CP-R10.2 | Label generation updates estimate with carrier transit data | Integration test: verify estimate update on label creation |
| CP-R10.3 | Tracking delays trigger estimate recalculation | Integration test: verify recalculation on delay events |
| CP-R10.4 | Estimates display as date range accounting for variability | Unit test: verify range calculation |
| CP-R10.5 | Imminent delivery (24h) triggers buyer notification | Integration test: verify notification timing |
| CP-R10.6 | Significant changes (>2 days) notify buyer | Unit test: verify change threshold logic |
| CP-R10.7 | Historical seller data factors into estimates | Unit test: verify historical data integration |

### Search Properties (Req 11)

| Property ID | Description | Verification Method |
|-------------|-------------|---------------------|
| CP-R11.1 | Search supports order ID, product name, buyer/seller name, tracking number | Integration test: verify search across all fields |
| CP-R11.2 | Filters: status, date, price, payment method, carrier | E2E test: verify filter combinations |
| CP-R11.3 | Results show order summary with quick-action buttons | E2E test: verify result display and actions |
| CP-R11.4 | No results suggests alternatives | Unit test: verify suggestion logic |
| CP-R11.5 | Sort by date, amount, status, estimated delivery | E2E test: verify sort functionality |
| CP-R11.6 | Seller view defaults to own orders with buyer filters | Unit test: verify role-based defaults |
| CP-R11.7 | Admin view shows all orders with additional filters | Unit test: verify admin filter availability |

### Bulk Operations Properties (Req 12)

| Property ID | Description | Verification Method |
|-------------|-------------|---------------------|
| CP-R12.1 | Multi-select enables bulk actions (print, labels, ship, export) | E2E test: verify action availability on selection |
| CP-R12.2 | Bulk label generation processes sequentially with per-item reporting | Integration test: verify sequential processing and reporting |
| CP-R12.3 | Bulk ship validates tracking info presence for all selected | Unit test: verify validation logic |
| CP-R12.4 | Bulk export generates CSV/Excel with all order details | Integration test: verify export content completeness |
| CP-R12.5 | Partial failures complete successful items, report failures | Integration test: verify partial failure handling |
| CP-R12.6 | Progress indicator shown with cancellation option | E2E test: verify progress UI and cancel functionality |
| CP-R12.7 | Completion sends summary notification with counts | Integration test: verify summary notification |

## Error Handling

### Receipt Service Errors

| Error Scenario | Handling Strategy | User Impact |
|----------------|-------------------|-------------|
| PDF generation fails | Retry 3x with exponential backoff, log error, mark receipt as pending | User sees "Receipt generating..." with retry option |
| Email delivery fails | Queue for retry, log failure, mark email_status as 'failed' | User can manually request resend |
| Missing order data | Return 404 with clear message | User sees "Order not found" |
| Invalid payment data | Log warning, generate receipt with available data, flag for review | Receipt generated with partial data |

### Cancellation Service Errors

| Error Scenario | Handling Strategy | User Impact |
|----------------|-------------------|-------------|
| Order not cancellable (wrong status) | Return 400 with status-specific message and redirect | User sees explanation and alternative action |
| Refund initiation fails | Mark refund_status as 'failed', alert admin, retry queue | User notified of delay, admin investigates |
| Seller notification fails | Queue for retry, proceed with cancellation | Cancellation proceeds, notification retried |
| Auto-approval cron fails | Alert ops, manual intervention required | Cancellations may be delayed |

### Delivery Integration Errors

| Error Scenario | Handling Strategy | User Impact |
|----------------|-------------------|-------------|
| Carrier API unavailable | Circuit breaker, fallback to cached rates, alert | User sees cached rates or "temporarily unavailable" |
| Label generation fails | Return error with carrier message, allow retry | User can retry or choose different carrier |
| Tracking poll fails | Exponential backoff, continue polling other shipments | Timeline shows "last updated" timestamp |
| Invalid tracking number | Return validation error with format hint | User corrects input |

### Notification Service Errors

| Error Scenario | Handling Strategy | User Impact |
|----------------|-------------------|-------------|
| Push notification fails | Log failure, continue with other channels | User receives email/in-app notification |
| Email service unavailable | Queue for retry with exponential backoff | Email delayed but eventually delivered |
| Batch processing fails | Process individually, log batch failure | Notifications may arrive unbatched |

### Admin Dashboard Errors

| Error Scenario | Handling Strategy | User Impact |
|----------------|-------------------|-------------|
| Metrics calculation timeout | Return cached metrics with staleness indicator | Admin sees slightly stale data |
| Filter query too broad | Return paginated results with warning | Admin prompted to narrow filters |
| Admin action fails | Log failure, return detailed error, allow retry | Admin sees error and can retry |

### Bulk Operations Errors

| Error Scenario | Handling Strategy | User Impact |
|----------------|-------------------|-------------|
| Partial operation failure | Complete successful items, report failures with reasons | User sees success/failure breakdown |
| Operation timeout | Save progress, allow resume | User can resume from last successful item |
| Concurrent modification | Detect conflicts, skip conflicted items, report | User informed of skipped items |

### Global Error Handling Patterns

```typescript
// Standard error response format
interface OrderLifecycleError {
  code: string;
  message: string;
  details?: Record<string, any>;
  retryable: boolean;
  suggestedAction?: string;
}

// Error codes
const ERROR_CODES = {
  // Receipt errors
  RECEIPT_GENERATION_FAILED: 'RECEIPT_001',
  RECEIPT_PDF_FAILED: 'RECEIPT_002',
  RECEIPT_EMAIL_FAILED: 'RECEIPT_003',
  
  // Cancellation errors
  CANCELLATION_NOT_ALLOWED: 'CANCEL_001',
  CANCELLATION_ALREADY_REQUESTED: 'CANCEL_002',
  REFUND_INITIATION_FAILED: 'CANCEL_003',
  
  // Delivery errors
  CARRIER_UNAVAILABLE: 'DELIVERY_001',
  LABEL_GENERATION_FAILED: 'DELIVERY_002',
  INVALID_TRACKING_NUMBER: 'DELIVERY_003',
  
  // Notification errors
  NOTIFICATION_DELIVERY_FAILED: 'NOTIFY_001',
  
  // Bulk operation errors
  BULK_OPERATION_PARTIAL_FAILURE: 'BULK_001',
  BULK_OPERATION_TIMEOUT: 'BULK_002',
};
```

## Testing Strategy

### Unit Tests

**Coverage Target: 90%**

#### Receipt Service Tests
- Receipt content generation for all payment types (crypto, fiat, escrow)
- PDF generation with valid output
- Receipt field validation and completeness
- Currency formatting and calculations

#### Cancellation Service Tests
- Cancellation rules by order status
- Approval/denial workflow logic
- Auto-approval timeout calculation
- Refund method selection by payment type

#### Notification Service Tests
- Notification batching logic
- Quiet hours filtering
- Priority assignment rules
- Channel preference filtering

#### Timeline Service Tests
- Milestone generation for all order states
- Timestamp vs estimate logic
- Multi-shipment timeline separation
- Issue highlighting logic

#### Delivery Estimate Tests
- Initial estimate calculation formula
- Estimate update on carrier data
- Change threshold detection (>2 days)
- Historical data integration

#### Search Service Tests
- Query parsing and field matching
- Filter combination logic
- Role-based result filtering
- Sort functionality

#### Bulk Operations Tests
- Validation logic for bulk actions
- Partial failure handling
- Progress tracking accuracy

### Integration Tests

**Coverage Target: 80%**

#### Receipt Integration
```typescript
describe('Receipt Integration', () => {
  it('generates receipt on payment completion', async () => {
    // Create order, complete payment, verify receipt created
  });
  
  it('sends email with PDF attachment when configured', async () => {
    // Mock email service, verify attachment
  });
});
```

#### Cancellation Integration
```typescript
describe('Cancellation Integration', () => {
  it('processes immediate cancellation for PAID orders', async () => {
    // Create PAID order, request cancellation, verify refund initiated
  });
  
  it('auto-approves after 24 hours for PROCESSING orders', async () => {
    // Create PROCESSING order, request cancellation, advance time, verify auto-approval
  });
});
```

#### Delivery Integration
```typescript
describe('Delivery Integration', () => {
  it('syncs carrier tracking to order timeline', async () => {
    // Mock carrier API, trigger poll, verify timeline update
  });
  
  it('updates order status on delivery confirmation', async () => {
    // Mock delivery event, verify status change and notifications
  });
});
```

#### WebSocket Integration
```typescript
describe('WebSocket Integration', () => {
  it('broadcasts timeline updates on status change', async () => {
    // Connect WebSocket, change order status, verify broadcast
  });
});
```

### End-to-End Tests

**Coverage: Critical user journeys**

#### Buyer Journey Tests
1. Complete purchase → receive receipt → view timeline → track delivery
2. Request cancellation → receive refund → verify status
3. Search orders → filter by status → view details

#### Seller Journey Tests
1. Receive notification → process order → generate label → confirm shipment
2. View dashboard → bulk print packing slips → bulk mark shipped
3. Respond to cancellation request → approve/deny

#### Admin Journey Tests
1. View metrics dashboard → filter delayed orders → take action
2. Generate financial report → export to CSV
3. View audit log → export for compliance

### Performance Tests

**Targets:**
- Receipt PDF generation: <3 seconds
- Notification delivery: <30 seconds (push), <60 seconds (email)
- Dashboard metrics load: <2 seconds
- Search results: <500ms for 1000 orders
- Bulk operations: 100 orders/minute

```typescript
describe('Performance', () => {
  it('generates receipt PDF within 3 seconds', async () => {
    const start = Date.now();
    await receiptService.generatePDF(receipt);
    expect(Date.now() - start).toBeLessThan(3000);
  });
  
  it('delivers push notification within 30 seconds', async () => {
    // Measure notification latency
  });
});
```

### Load Tests

**Scenarios:**
- 100 concurrent order creations with receipt generation
- 50 sellers receiving notifications simultaneously
- 10 admins querying dashboard concurrently
- Bulk operations with 500 orders

### Security Tests

- Receipt access authorization (buyer only)
- Cancellation authorization (buyer/seller roles)
- Admin action authorization and audit logging
- Input validation for search queries
- Rate limiting on bulk operations

### Test Data Requirements

```typescript
// Test fixtures
const testOrders = {
  cryptoOrder: { /* crypto payment order */ },
  fiatOrder: { /* fiat payment order */ },
  escrowOrder: { /* escrow-protected order */ },
  multiShipmentOrder: { /* order with multiple shipments */ },
  cancelledOrder: { /* cancelled order */ },
  delayedOrder: { /* order past SLA */ },
};

const testSellers = {
  highVolumeSeller: { /* seller with many orders */ },
  newSeller: { /* seller with no history */ },
};
```

### CI/CD Integration

```yaml
# Test pipeline stages
stages:
  - unit-tests:
      coverage-threshold: 90%
      timeout: 10m
  
  - integration-tests:
      coverage-threshold: 80%
      timeout: 20m
      services:
        - postgres
        - redis
  
  - e2e-tests:
      timeout: 30m
      browser: chromium
  
  - performance-tests:
      timeout: 15m
      thresholds:
        receipt-generation: 3s
        notification-delivery: 30s
```