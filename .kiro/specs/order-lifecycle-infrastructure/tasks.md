# Order Lifecycle Infrastructure - Tasks

## Task 1: Database Schema Setup

- [ ] 1.1 Create `order_receipts` table with all fields (id, order_id, receipt_number, buyer info, items, pricing, payment details, PDF reference, email status) [Requirement 1.1-1.7]
- [ ] 1.2 Create `order_cancellations` table with request/response tracking, auto-approval, and refund fields [Requirement 3.1-3.7]
- [ ] 1.3 Create `delivery_estimates` table with estimate range, calculation factors, and change tracking [Requirement 10.1-10.7]
- [ ] 1.4 Create `seller_notification_queue` table with batching and multi-channel delivery status [Requirement 4.1-4.7]
- [ ] 1.5 Create `seller_notification_preferences` table with channel, quiet hours, and threshold settings [Requirement 4.5]
- [ ] 1.6 Add columns to `orders` table (cancellation_requested_at, cancellation_reason, receipt_generated_at, receipt_id, estimated_delivery_min/max) [Requirements 1, 3, 10]
- [ ] 1.7 Add columns to `tracking_records` table (delivery_estimate_updated_at, exception_type, exception_details) [Requirement 6.6]
- [ ] 1.8 Create indexes for order_events (order_id+type, created_at) [Requirement 9]

### Checkpoint 1: Database schema complete and migrations applied

## Task 2: Receipt Service Implementation

- [ ] 2.1 Create `IReceiptService` interface with generateReceipt, generatePDF, sendReceiptEmail, getReceiptByOrderId, downloadReceipt methods [Requirement 1]
- [ ] 2.2 Implement `ReceiptService.generateReceipt()` to create receipt with all required fields (order ID, items, quantities, prices, fees, taxes, shipping, total) [Requirement 1.1]
- [ ] 2.3 Implement PDF generation using PDFKit/Puppeteer with consistent formatting [Requirement 1.2]
- [ ] 2.4 Implement `sendReceiptEmail()` with PDF attachment when buyer has email configured [Requirement 1.3]
- [ ] 2.5 Add crypto payment details (transaction hash, network, token) to receipt [Requirement 1.5]
- [ ] 2.6 Add fiat payment details (last 4 digits, processor reference, confirmation number) to receipt [Requirement 1.6]
- [ ] 2.7 Add escrow details (contract address, status) to receipt when applicable [Requirement 1.7]
- [ ] 2.8* Write unit tests for receipt content completeness (CP-R1.1, CP-R1.5, CP-R1.6, CP-R1.7)
- [ ] 2.9* Write integration tests for PDF generation and email delivery (CP-R1.2, CP-R1.3)

### Checkpoint 2: Receipt service generates complete receipts with PDF and email

## Task 3: Receipt API Endpoints

- [ ] 3.1 Create `POST /api/orders/:orderId/receipt` endpoint to generate receipt [Requirement 1.1]
- [ ] 3.2 Create `GET /api/orders/:orderId/receipt` endpoint to get receipt details [Requirement 1.4]
- [ ] 3.3 Create `GET /api/orders/:orderId/receipt/download` endpoint for PDF download [Requirement 1.2]
- [ ] 3.4 Create `POST /api/orders/:orderId/receipt/email` endpoint to resend receipt email [Requirement 1.3]
- [ ] 3.5 Implement receipt access authorization (buyer only) [Security]
- [ ] 3.6* Write E2E tests for in-app receipt display with download button (CP-R1.4)

### Checkpoint 3: Receipt endpoints functional with authorization


## Task 4: Order Timeline Service Implementation

- [ ] 4.1 Create `IOrderTimelineService` interface with getTimeline, addMilestone, updateMilestone, syncCarrierTracking methods [Requirement 2]
- [ ] 4.2 Implement `getTimeline()` to return all order states from CREATED to COMPLETED [Requirement 2.1]
- [ ] 4.3 Implement WebSocket broadcast for timeline updates within 1 second of status change [Requirement 2.2]
- [ ] 4.4 Implement milestone timestamp logic (completed show actual, upcoming show estimates) [Requirement 2.6]
- [ ] 4.5 Implement issue highlighting with explanation and suggested actions for delayed/exception states [Requirement 2.5]
- [ ] 4.6 Implement multi-shipment timeline separation for orders with multiple shipments [Requirement 2.7]
- [ ] 4.7* Write unit tests for milestone completeness and timestamp logic (CP-R2.1, CP-R2.6)
- [ ] 4.8* Write integration tests for WebSocket broadcast timing (CP-R2.2)

## Task 5: Timeline API Endpoints

- [ ] 5.1 Create `GET /api/orders/:orderId/timeline` endpoint to get order timeline with milestones [Requirement 2.1]
- [ ] 5.2 Create `GET /api/orders/:orderId/tracking` endpoint to get carrier tracking events [Requirement 2.4]
- [ ] 5.3 Integrate carrier tracking events into order timeline [Requirement 2.4]
- [ ] 5.4* Write integration tests for carrier event integration (CP-R2.4)

### Checkpoint 4: Timeline service with real-time WebSocket updates

## Task 6: Cancellation Service Implementation

- [ ] 6.1 Create `ICancellationService` interface with requestCancellation, approveCancellation, denyCancellation, processAutoApproval methods [Requirement 3]
- [ ] 6.2 Implement cancellation rules: allow immediate for CREATED, PAYMENT_PENDING, PAID [Requirement 3.1]
- [ ] 6.3 Implement cancellation rules: require seller approval for PROCESSING with 24-hour timeout [Requirement 3.2]
- [ ] 6.4 Implement cancellation rejection for SHIPPED+ with redirect to return process [Requirement 3.3]
- [ ] 6.5 Implement refund initiation based on payment method (crypto escrow release, fiat processor refund) [Requirement 3.4]
- [ ] 6.6 Implement immediate multi-channel seller notification on cancellation request [Requirement 3.5]
- [ ] 6.7 Implement cron job for auto-approval after 24 hours of no response [Requirement 3.6]
- [ ] 6.8 Implement side effects: update status to CANCELLED, create audit event, update inventory [Requirement 3.7]
- [ ] 6.9* Write unit tests for cancellation rules by status (CP-R3.1, CP-R3.2, CP-R3.3)
- [ ] 6.10* Write integration tests for refund initiation and auto-approval (CP-R3.4, CP-R3.6, CP-R3.7)

## Task 7: Cancellation API Endpoints

- [ ] 7.1 Create `POST /api/orders/:orderId/cancel` endpoint for buyer cancellation request [Requirement 3.1]
- [ ] 7.2 Create `POST /api/orders/:orderId/cancel/approve` endpoint for seller approval [Requirement 3.2]
- [ ] 7.3 Create `POST /api/orders/:orderId/cancel/deny` endpoint for seller denial [Requirement 3.2]
- [ ] 7.4 Create `GET /api/orders/:orderId/cancel/status` endpoint to get cancellation status [Requirement 3]
- [ ] 7.5 Implement authorization (buyer for request, seller for approve/deny) [Security]

### Checkpoint 5: Cancellation workflow with auto-approval and refund integration


## Task 8: Seller Notification Service Implementation

- [ ] 8.1 Create `ISellerNotificationService` interface with queueNotification, processNotificationQueue, getNotificationPreferences methods [Requirement 4]
- [ ] 8.2 Implement push notification delivery within 30 seconds of new order [Requirement 4.1]
- [ ] 8.3 Implement email notification with order summary, buyer info, and action links [Requirement 4.2]
- [ ] 8.4 Implement in-app notification badge and pending queue addition [Requirement 4.3]
- [ ] 8.5 Implement notification batching (max 1 per minute for rapid orders) [Requirement 4.4]
- [ ] 8.6 Implement quiet hours and channel preference filtering [Requirement 4.5]
- [ ] 8.7 Implement high-value/expedited order priority marking [Requirement 4.6]
- [ ] 8.8 Implement one-click deep link to order details [Requirement 4.7]
- [ ] 8.9 Create cron job to process notification queue every minute [Requirement 4.4]
- [ ] 8.10* Write unit tests for batching logic and preference filtering (CP-R4.4, CP-R4.5, CP-R4.6)
- [ ] 8.11* Write performance tests for notification latency (CP-R4.1)

### Checkpoint 6: Seller notifications with batching and preferences

## Task 9: Seller Workflow Service Implementation

- [ ] 9.1 Create `ISellerWorkflowService` interface with getOrderDashboard, startProcessing, markReadyToShip, generateShippingLabel, confirmShipment methods [Requirement 5]
- [ ] 9.2 Implement `getOrderDashboard()` with orders grouped by status (New, Processing, Ready to Ship, Shipped) [Requirement 5.1]
- [ ] 9.3 Implement `startProcessing()` to update status to PROCESSING and notify buyer [Requirement 5.2]
- [ ] 9.4 Implement `markReadyToShip()` with shipping method prompt and label generation [Requirement 5.3]
- [ ] 9.5 Implement tracking number validation by carrier format [Requirement 5.4]
- [ ] 9.6 Implement `confirmShipment()` to update status, notify buyer, start delivery monitoring [Requirement 5.5]
- [ ] 9.7 Implement `getPackingSlip()` with items, quantities, shipping address [Requirement 5.6]
- [ ] 9.8* Write unit tests for dashboard grouping and validation (CP-R5.1, CP-R5.4, CP-R5.6)
- [ ] 9.9* Write integration tests for status updates and notifications (CP-R5.2, CP-R5.5)

## Task 10: Seller Workflow API Endpoints

- [ ] 10.1 Create `GET /api/seller/orders/dashboard` endpoint for seller order dashboard [Requirement 5.1]
- [ ] 10.2 Create `POST /api/seller/orders/:orderId/process` endpoint to start processing [Requirement 5.2]
- [ ] 10.3 Create `POST /api/seller/orders/:orderId/ready` endpoint to mark ready to ship [Requirement 5.3]
- [ ] 10.4 Create `POST /api/seller/orders/:orderId/ship` endpoint to confirm shipment [Requirement 5.5]
- [ ] 10.5 Create `GET /api/seller/orders/:orderId/packing-slip` endpoint for packing slip [Requirement 5.6]
- [ ] 10.6 Implement seller authorization for all endpoints [Security]

### Checkpoint 7: Seller workflow dashboard and order processing


## Task 11: Delivery Integration Service Implementation

- [ ] 11.1 Create `IDeliveryIntegrationService` interface with calculateRates, generateLabel, getTrackingUpdates, pollAllActiveShipments methods [Requirement 6]
- [ ] 11.2 Implement carrier abstraction layer for FEDEX, UPS, DHL, USPS [Requirement 6.1]
- [ ] 11.3 Implement `calculateRates()` using package dimensions, weight, destination [Requirement 6.2]
- [ ] 11.4 Implement `generateLabel()` storing tracking number, label URL, shipment ID [Requirement 6.3]
- [ ] 11.5 Implement tracking poll cron job to sync carrier updates to timeline [Requirement 6.4]
- [ ] 11.6 Implement delivery confirmation handler to update status to DELIVERED and notify both parties [Requirement 6.5]
- [ ] 11.7 Implement delivery exception handler with alerts and resolution options [Requirement 6.6]
- [ ] 11.8 Implement manual tracking entry path without label generation [Requirement 6.7]
- [ ] 11.9* Write unit tests for carrier availability and data persistence (CP-R6.1, CP-R6.3, CP-R6.7)
- [ ] 11.10* Write integration tests for rate calculation and tracking sync (CP-R6.2, CP-R6.4, CP-R6.5, CP-R6.6)

## Task 12: Delivery API Endpoints

- [ ] 12.1 Create `POST /api/shipping/rates` endpoint to calculate shipping rates [Requirement 6.2]
- [ ] 12.2 Create `POST /api/shipping/labels` endpoint to generate shipping label [Requirement 6.1]
- [ ] 12.3 Create `GET /api/shipping/tracking/:trackingNumber` endpoint for tracking updates [Requirement 6.4]
- [ ] 12.4 Implement circuit breaker for carrier API unavailability [Error Handling]

### Checkpoint 8: Delivery integration with label generation and tracking

## Task 13: Delivery Estimate Service Implementation

- [ ] 13.1 Create `IDeliveryEstimateService` interface with calculateInitialEstimate, updateEstimateFromCarrier, recalculateOnDelay, notifyEstimateChange methods [Requirement 10]
- [ ] 13.2 Implement initial estimate calculation from seller processing time + shipping method [Requirement 10.1]
- [ ] 13.3 Implement estimate update on label generation using carrier transit data [Requirement 10.2]
- [ ] 13.4 Implement estimate recalculation on tracking delays [Requirement 10.3]
- [ ] 13.5 Implement date range display accounting for carrier variability [Requirement 10.4]
- [ ] 13.6 Implement imminent delivery notification (within 24 hours) [Requirement 10.5]
- [ ] 13.7 Implement significant change notification (>2 days difference) [Requirement 10.6]
- [ ] 13.8 Implement historical seller processing time integration [Requirement 10.7]
- [ ] 13.9* Write unit tests for calculation formula and change threshold (CP-R10.1, CP-R10.4, CP-R10.6, CP-R10.7)
- [ ] 13.10* Write integration tests for estimate updates and notifications (CP-R10.2, CP-R10.3, CP-R10.5)

### Checkpoint 9: Delivery estimates with automatic updates and notifications


## Task 14: Admin Dashboard Service Implementation

- [ ] 14.1 Create `IAdminDashboardService` interface with getOrderMetrics, getOrders, getOrderDetails, getDelayedOrders, performAdminAction methods [Requirement 7]
- [ ] 14.2 Implement `getOrderMetrics()` for total orders, by status, avg fulfillment time, dispute rate [Requirement 7.1]
- [ ] 14.3 Implement `getOrders()` with filters: status, date, seller, buyer, payment method, amount [Requirement 7.2]
- [ ] 14.4 Implement `getOrderDetails()` with order, timeline, audit log, available actions [Requirement 7.3]
- [ ] 14.5 Implement `getDelayedOrders()` with SLA threshold highlighting [Requirement 7.4]
- [ ] 14.6 Implement dispute surfacing with evidence access [Requirement 7.5]
- [ ] 14.7 Implement `getOrderTrends()` for volume, revenue, status distribution charts [Requirement 7.6]
- [ ] 14.8 Implement `performAdminAction()` for contact, override status, refund, escalate [Requirement 7.7]
- [ ] 14.9* Write unit tests for metric calculations and SLA threshold logic (CP-R7.1, CP-R7.4, CP-R7.6)
- [ ] 14.10* Write E2E tests for filter functionality and admin actions (CP-R7.2, CP-R7.3, CP-R7.5, CP-R7.7)

## Task 15: Admin Dashboard API Endpoints

- [ ] 15.1 Create `GET /api/admin/orders/metrics` endpoint for order metrics [Requirement 7.1]
- [ ] 15.2 Create `GET /api/admin/orders` endpoint for filtered orders [Requirement 7.2]
- [ ] 15.3 Create `GET /api/admin/orders/:orderId` endpoint for admin order details [Requirement 7.3]
- [ ] 15.4 Create `POST /api/admin/orders/:orderId/action` endpoint for admin actions [Requirement 7.7]
- [ ] 15.5 Create `GET /api/admin/orders/trends` endpoint for order trends [Requirement 7.6]
- [ ] 15.6 Create `GET /api/admin/orders/delayed` endpoint for delayed orders [Requirement 7.4]
- [ ] 15.7 Implement admin authorization for all endpoints [Security]

### Checkpoint 10: Admin dashboard with metrics, filtering, and actions

## Task 16: Financial Monitoring Service Implementation

- [ ] 16.1 Create `IFinancialMonitoringService` interface with getFinancialDashboard, getTransactionBreakdown, trackRefund, getSellerPayouts, generateReport methods [Requirement 8]
- [ ] 16.2 Implement `getFinancialDashboard()` for GMV, fees, refunds, net revenue [Requirement 8.1]
- [ ] 16.3 Implement `getTransactionBreakdown()` by payment method, currency, time period [Requirement 8.2]
- [ ] 16.4 Implement `trackRefund()` with amounts, reasons, payout impact [Requirement 8.3]
- [ ] 16.5 Implement escrow transaction logging for blockchain reconciliation [Requirement 8.4]
- [ ] 16.6 Implement `generateReport()` with CSV/Excel export and date/filter customization [Requirement 8.5]
- [ ] 16.7 Implement `flagDiscrepancy()` for manual review with audit trail [Requirement 8.6]
- [ ] 16.8 Implement `getSellerPayouts()` with pending/processing/completed and fee breakdown [Requirement 8.7]
- [ ] 16.9* Write unit tests for calculation accuracy and aggregation logic (CP-R8.1, CP-R8.2, CP-R8.3, CP-R8.6, CP-R8.7)
- [ ] 16.10* Write integration tests for blockchain logging and export (CP-R8.4, CP-R8.5)

## Task 17: Financial Monitoring API Endpoints

- [ ] 17.1 Create `GET /api/admin/financial/dashboard` endpoint for financial dashboard [Requirement 8.1]
- [ ] 17.2 Create `GET /api/admin/financial/transactions` endpoint for transaction breakdown [Requirement 8.2]
- [ ] 17.3 Create `GET /api/admin/financial/payouts/:sellerId` endpoint for seller payouts [Requirement 8.7]
- [ ] 17.4 Create `POST /api/admin/financial/reports` endpoint to generate reports [Requirement 8.5]
- [ ] 17.5 Create `POST /api/admin/financial/flag` endpoint to flag discrepancies [Requirement 8.6]

### Checkpoint 11: Financial monitoring with reporting and reconciliation


## Task 18: Audit Service Implementation

- [ ] 18.1 Create `IAuditService` interface with logEvent, getAuditLog, exportAuditLog, getAuditSummary methods [Requirement 9]
- [ ] 18.2 Implement `logEvent()` to create audit event with timestamp, actor, type, details for all order actions [Requirement 9.1]
- [ ] 18.3 Implement `getAuditLog()` with chronological display and expandable details [Requirement 9.2]
- [ ] 18.4 Implement status change logging with previous/new status, reason, actor [Requirement 9.3]
- [ ] 18.5 Implement payment logging with method, amount, reference, confirmation status [Requirement 9.4]
- [ ] 18.6 Implement communication logging with timestamps and references (privacy-compliant) [Requirement 9.5]
- [ ] 18.7 Implement admin action logging with admin ID, action, justification, outcome [Requirement 9.6]
- [ ] 18.8 Implement `exportAuditLog()` with filtered export for compliance [Requirement 9.7]
- [ ] 18.9* Write unit tests for event content by type (CP-R9.3, CP-R9.4, CP-R9.5, CP-R9.6)
- [ ] 18.10* Write integration tests for event creation and export (CP-R9.1, CP-R9.7)

## Task 19: Audit API Endpoints

- [ ] 19.1 Create `GET /api/orders/:orderId/audit` endpoint for order audit log [Requirement 9.2]
- [ ] 19.2 Create `GET /api/orders/:orderId/audit/export` endpoint for audit export [Requirement 9.7]
- [ ] 19.3* Write E2E tests for audit log display and expansion (CP-R9.2)

### Checkpoint 12: Audit system with comprehensive event logging and export

## Task 20: Order Search Service Implementation

- [ ] 20.1 Create `IOrderSearchService` interface with search and getSuggestions methods [Requirement 11]
- [ ] 20.2 Implement search by order ID, product name, buyer/seller name, tracking number [Requirement 11.1]
- [ ] 20.3 Implement filters: status, date range, price range, payment method, carrier [Requirement 11.2]
- [ ] 20.4 Implement result display with order summary and quick-action buttons [Requirement 11.3]
- [ ] 20.5 Implement no-results suggestions for alternative search terms [Requirement 11.4]
- [ ] 20.6 Implement sort by date, amount, status, estimated delivery [Requirement 11.5]
- [ ] 20.7 Implement role-based defaults (seller sees own orders, admin sees all) [Requirement 11.6, 11.7]
- [ ] 20.8* Write unit tests for suggestion logic and role-based defaults (CP-R11.4, CP-R11.6, CP-R11.7)
- [ ] 20.9* Write integration tests for search across all fields (CP-R11.1)
- [ ] 20.10* Write E2E tests for filter combinations and sort (CP-R11.2, CP-R11.3, CP-R11.5)

## Task 21: Search API Endpoints

- [ ] 21.1 Create `GET /api/orders/search` endpoint for order search [Requirement 11.1]
- [ ] 21.2 Create `GET /api/orders/search/suggestions` endpoint for search suggestions [Requirement 11.4]
- [ ] 21.3 Implement search performance optimization (<500ms for 1000 orders) [Performance]

### Checkpoint 13: Order search with filtering, sorting, and role-based access


## Task 22: Bulk Operations Service Implementation

- [ ] 22.1 Create `IBulkOperationsService` interface with printPackingSlips, generateLabels, markShipped, exportOrders, getOperationProgress, cancelOperation methods [Requirement 12]
- [ ] 22.2 Implement `printPackingSlips()` for multiple orders with combined PDF output [Requirement 12.1]
- [ ] 22.3 Implement `generateLabels()` with sequential processing and per-item reporting [Requirement 12.2]
- [ ] 22.4 Implement `markShipped()` with tracking info validation for all selected orders [Requirement 12.3]
- [ ] 22.5 Implement `exportOrders()` to CSV/Excel with all order details [Requirement 12.4]
- [ ] 22.6 Implement partial failure handling (complete successful, report failures) [Requirement 12.5]
- [ ] 22.7 Implement progress tracking with cancellation support [Requirement 12.6]
- [ ] 22.8 Implement completion summary notification with success/failure counts [Requirement 12.7]
- [ ] 22.9* Write unit tests for validation logic (CP-R12.3)
- [ ] 22.10* Write integration tests for sequential processing and partial failure (CP-R12.2, CP-R12.4, CP-R12.5, CP-R12.7)
- [ ] 22.11* Write E2E tests for action availability and progress UI (CP-R12.1, CP-R12.6)

## Task 23: Bulk Operations API Endpoint

- [ ] 23.1 Create `POST /api/seller/orders/bulk` endpoint for bulk actions [Requirement 12.1]
- [ ] 23.2 Implement rate limiting for bulk operations [Security]
- [ ] 23.3 Implement bulk operation performance target (100 orders/minute) [Performance]

### Checkpoint 14: Bulk operations with progress tracking and partial failure handling

## Task 24: Error Handling Implementation

- [ ] 24.1 Implement receipt service error handling (PDF retry, email queue, partial data fallback) [Error Handling]
- [ ] 24.2 Implement cancellation service error handling (refund retry, admin alerts) [Error Handling]
- [ ] 24.3 Implement delivery integration error handling (circuit breaker, cached rates fallback) [Error Handling]
- [ ] 24.4 Implement notification service error handling (channel fallback, retry queue) [Error Handling]
- [ ] 24.5 Implement admin dashboard error handling (cached metrics, pagination warnings) [Error Handling]
- [ ] 24.6 Implement bulk operations error handling (partial completion, conflict detection) [Error Handling]
- [ ] 24.7 Create standardized error response format with codes and suggested actions [Error Handling]

### Checkpoint 15: Comprehensive error handling across all services

## Task 25: Integration and Performance Testing

- [ ] 25.1* Write integration tests for receipt generation on payment completion
- [ ] 25.2* Write integration tests for cancellation auto-approval cron job
- [ ] 25.3* Write integration tests for carrier tracking sync to timeline
- [ ] 25.4* Write integration tests for WebSocket timeline broadcasts
- [ ] 25.5* Write performance tests for receipt PDF generation (<3 seconds)
- [ ] 25.6* Write performance tests for notification delivery (<30 seconds push, <60 seconds email)
- [ ] 25.7* Write performance tests for dashboard metrics load (<2 seconds)
- [ ] 25.8* Write performance tests for search results (<500ms for 1000 orders)
- [ ] 25.9* Write load tests for 100 concurrent order creations with receipt generation
- [ ] 25.10* Write load tests for bulk operations with 500 orders

### Checkpoint 16: All integration and performance tests passing

## Task 26: End-to-End Testing

- [ ] 26.1* Write E2E tests for buyer journey: purchase → receipt → timeline → track delivery
- [ ] 26.2* Write E2E tests for buyer journey: request cancellation → receive refund → verify status
- [ ] 26.3* Write E2E tests for seller journey: notification → process → label → ship
- [ ] 26.4* Write E2E tests for seller journey: dashboard → bulk print → bulk ship
- [ ] 26.5* Write E2E tests for admin journey: metrics → filter delayed → take action
- [ ] 26.6* Write E2E tests for admin journey: generate report → export CSV
- [ ] 26.7* Write security tests for authorization across all endpoints

### Checkpoint 17: All E2E tests passing, system ready for deployment
