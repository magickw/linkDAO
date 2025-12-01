# Refund Financial Records Schema Documentation

## Overview

The Refund Financial Records Schema provides comprehensive tracking and management of all refund transactions within the LinkDAO marketplace. This schema supports multi-provider refund processing, financial reconciliation, audit trails, and batch processing capabilities.

## Schema Architecture

### Core Tables

#### 1. refund_financial_records

**Purpose**: Main table for tracking all refund financial transactions

**Key Features**:
- Tracks original and refund amounts
- Records processing fees and financial impacts
- Supports multiple payment providers
- Maintains reconciliation status
- Handles retry logic for failed refunds

**Columns**:
- `id` (uuid, PK): Unique identifier for the refund record
- `return_id` (uuid): Reference to the associated return request
- `refund_id` (varchar): External refund identifier
- `original_amount` (decimal): Original transaction amount
- `refund_amount` (decimal): Amount being refunded
- `processing_fee` (decimal): Fee charged for processing the refund
- `platform_fee_impact` (decimal): Impact on platform fees
- `seller_impact` (decimal): Financial impact on seller revenue
- `payment_provider` (varchar): Provider handling the refund (Stripe, PayPal, blockchain)
- `provider_transaction_id` (varchar): Provider's transaction identifier
- `status` (varchar): Current status (pending, completed, failed, cancelled)
- `processed_at` (timestamp): When the refund was processed
- `reconciled` (boolean): Whether the refund has been reconciled
- `reconciled_at` (timestamp): When reconciliation occurred
- `currency` (varchar): Currency code (USD, EUR, etc.)
- `refund_method` (varchar): Method used for refund
- `failure_reason` (text): Reason for failure if applicable
- `retry_count` (integer): Number of retry attempts
- `metadata` (jsonb): Additional metadata

**Indexes**:
- `idx_refund_records_return_id`: Fast lookup by return ID
- `idx_refund_records_refund_id`: Fast lookup by refund ID
- `idx_refund_records_status`: Filter by status
- `idx_refund_records_provider`: Filter by payment provider
- `idx_refund_records_reconciled`: Filter by reconciliation status
- `idx_refund_records_created_at`: Time-based queries
- `idx_refund_records_processed_at`: Processing time queries
- `idx_refund_records_provider_tx_id`: Provider transaction lookup

---

#### 2. refund_provider_transactions

**Purpose**: Provider-specific transaction details for each refund

**Key Features**:
- Stores provider-specific transaction data
- Tracks blockchain transactions
- Manages webhook data
- Records failure details
- Supports multiple transaction types

**Columns**:
- `id` (uuid, PK): Unique identifier
- `refund_record_id` (uuid, FK): Reference to main refund record
- `provider_name` (varchar): Name of payment provider
- `provider_transaction_id` (varchar): Provider's transaction ID
- `provider_status` (varchar): Status from provider
- `provider_response` (jsonb): Raw provider API response
- `transaction_type` (varchar): Type of transaction
- `amount` (decimal): Transaction amount
- `currency` (varchar): Currency code
- `fee_amount` (decimal): Provider fees
- `net_amount` (decimal): Net amount after fees
- `exchange_rate` (decimal): Exchange rate if applicable
- `destination_account` (varchar): Destination account identifier
- `source_account` (varchar): Source account identifier
- `blockchain_tx_hash` (varchar): Blockchain transaction hash
- `blockchain_network` (varchar): Blockchain network name
- `confirmation_count` (integer): Number of confirmations
- `estimated_completion` (timestamp): Estimated completion time
- `completed_at` (timestamp): Actual completion time
- `failed_at` (timestamp): Failure timestamp
- `failure_code` (varchar): Provider failure code
- `failure_message` (text): Detailed failure message
- `webhook_received` (boolean): Whether webhook was received
- `webhook_data` (jsonb): Webhook payload data

**Indexes**:
- `idx_provider_tx_refund_record`: Link to main refund record
- `idx_provider_tx_provider_name`: Filter by provider
- `idx_provider_tx_provider_tx_id`: Provider transaction lookup
- `idx_provider_tx_status`: Filter by status
- `idx_provider_tx_blockchain_hash`: Blockchain transaction lookup
- `idx_provider_tx_created_at`: Time-based queries

---

#### 3. refund_reconciliation_records

**Purpose**: Reconciliation status tracking for financial accuracy

**Key Features**:
- Tracks expected vs actual amounts
- Identifies discrepancies
- Manages resolution workflow
- Maintains supporting documentation
- Provides audit trail for reconciliation

**Columns**:
- `id` (uuid, PK): Unique identifier
- `refund_record_id` (uuid, FK): Reference to main refund record
- `reconciliation_date` (date): Date of reconciliation
- `reconciliation_status` (varchar): Status (pending, completed, discrepancy)
- `expected_amount` (decimal): Expected refund amount
- `actual_amount` (decimal): Actual refund amount
- `discrepancy_amount` (decimal): Difference between expected and actual
- `discrepancy_reason` (text): Explanation of discrepancy
- `reconciled_by` (uuid): Admin who performed reconciliation
- `reconciliation_notes` (text): Notes about reconciliation
- `supporting_documents` (jsonb): References to supporting documents
- `resolution_status` (varchar): Status of discrepancy resolution
- `resolution_notes` (text): Notes about resolution
- `resolved_at` (timestamp): When discrepancy was resolved
- `resolved_by` (uuid): Admin who resolved discrepancy

**Indexes**:
- `idx_reconciliation_refund_record`: Link to main refund record
- `idx_reconciliation_date`: Date-based queries
- `idx_reconciliation_status`: Filter by status
- `idx_reconciliation_discrepancy`: Filter records with discrepancies

---

#### 4. refund_transaction_audit_log

**Purpose**: Comprehensive audit trail for all refund transaction modifications

**Key Features**:
- Tracks all changes to refund records
- Records admin actions
- Maintains before/after states
- Captures context information
- Supports compliance requirements

**Columns**:
- `id` (uuid, PK): Unique identifier
- `refund_record_id` (uuid, FK): Reference to main refund record
- `action_type` (varchar): Type of action performed
- `action_description` (text): Detailed description
- `performed_by` (uuid): User who performed action
- `performed_by_role` (varchar): Role of user
- `previous_state` (jsonb): State before change
- `new_state` (jsonb): State after change
- `ip_address` (varchar): IP address of user
- `user_agent` (text): Browser/client information
- `timestamp` (timestamp): When action occurred

**Indexes**:
- `idx_audit_log_refund_record`: Link to main refund record
- `idx_audit_log_action_type`: Filter by action type
- `idx_audit_log_performed_by`: Filter by user
- `idx_audit_log_timestamp`: Time-based queries

---

#### 5. refund_batch_processing

**Purpose**: Batch processing records for bulk refund operations

**Key Features**:
- Manages bulk refund processing
- Tracks batch statistics
- Monitors processing progress
- Records errors and failures
- Supports provider-specific batching

**Columns**:
- `id` (uuid, PK): Unique identifier
- `batch_id` (varchar, unique): Batch identifier
- `provider_name` (varchar): Payment provider
- `total_refunds` (integer): Total refunds in batch
- `successful_refunds` (integer): Successfully processed
- `failed_refunds` (integer): Failed refunds
- `pending_refunds` (integer): Pending refunds
- `total_amount` (decimal): Total batch amount
- `processed_amount` (decimal): Amount processed so far
- `batch_status` (varchar): Status (processing, completed, failed)
- `started_at` (timestamp): Batch start time
- `completed_at` (timestamp): Batch completion time
- `error_summary` (jsonb): Summary of errors
- `metadata` (jsonb): Additional batch metadata

**Indexes**:
- `idx_batch_processing_batch_id`: Batch lookup
- `idx_batch_processing_provider`: Filter by provider
- `idx_batch_processing_status`: Filter by status
- `idx_batch_processing_started_at`: Time-based queries

---

#### 6. refund_batch_items

**Purpose**: Individual items within refund batch processing operations

**Key Features**:
- Links refunds to batches
- Tracks processing order
- Manages item-level status
- Records errors per item
- Supports retry logic

**Columns**:
- `id` (uuid, PK): Unique identifier
- `batch_id` (uuid, FK): Reference to batch
- `refund_record_id` (uuid, FK): Reference to refund record
- `processing_order` (integer): Order in batch
- `item_status` (varchar): Status (pending, completed, failed)
- `processed_at` (timestamp): Processing timestamp
- `error_message` (text): Error details if failed
- `retry_count` (integer): Number of retries
- `created_at` (timestamp): Creation timestamp

**Indexes**:
- `idx_batch_items_batch_id`: Link to batch
- `idx_batch_items_refund_record`: Link to refund record
- `idx_batch_items_status`: Filter by status

---

## Relationships

```
refund_financial_records (1) ──→ (N) refund_provider_transactions
refund_financial_records (1) ──→ (N) refund_reconciliation_records
refund_financial_records (1) ──→ (N) refund_transaction_audit_log
refund_financial_records (1) ──→ (N) refund_batch_items

refund_batch_processing (1) ──→ (N) refund_batch_items
```

---

## Usage Examples

### 1. Creating a Refund Record

```typescript
import { db } from '../db';
import { refundFinancialRecords } from '../db/schema';

const refund = await db.insert(refundFinancialRecords).values({
  returnId: 'return-uuid',
  refundId: 'REF-12345',
  originalAmount: '100.00',
  refundAmount: '95.00',
  processingFee: '5.00',
  platformFeeImpact: '2.00',
  sellerImpact: '93.00',
  paymentProvider: 'stripe',
  providerTransactionId: 'pi_abc123',
  status: 'pending',
  currency: 'USD',
}).returning();
```

### 2. Recording Provider Transaction

```typescript
import { refundProviderTransactions } from '../db/schema';

const providerTx = await db.insert(refundProviderTransactions).values({
  refundRecordId: refund.id,
  providerName: 'stripe',
  providerTransactionId: 'pi_abc123',
  providerStatus: 'succeeded',
  transactionType: 'refund',
  amount: '95.00',
  currency: 'USD',
  feeAmount: '2.75',
  netAmount: '92.25',
  completedAt: new Date(),
}).returning();
```

### 3. Reconciliation Check

```typescript
import { refundReconciliationRecords } from '../db/schema';

const reconciliation = await db.insert(refundReconciliationRecords).values({
  refundRecordId: refund.id,
  reconciliationDate: new Date(),
  reconciliationStatus: 'completed',
  expectedAmount: '95.00',
  actualAmount: '95.00',
  discrepancyAmount: '0.00',
  reconciledBy: 'admin-uuid',
}).returning();
```

### 4. Audit Log Entry

```typescript
import { refundTransactionAuditLog } from '../db/schema';

await db.insert(refundTransactionAuditLog).values({
  refundRecordId: refund.id,
  actionType: 'status_change',
  actionDescription: 'Refund status changed from pending to completed',
  performedBy: 'admin-uuid',
  performedByRole: 'admin',
  previousState: { status: 'pending' },
  newState: { status: 'completed' },
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
});
```

---

## Migration Instructions

### Running the Migration

```bash
# Apply the migration
npm run db:migrate

# Verify the migration
npm run db:validate-refund-schema
```

### Rollback (if needed)

```sql
-- Drop tables in reverse order of dependencies
DROP TABLE IF EXISTS refund_batch_items CASCADE;
DROP TABLE IF EXISTS refund_batch_processing CASCADE;
DROP TABLE IF EXISTS refund_transaction_audit_log CASCADE;
DROP TABLE IF EXISTS refund_reconciliation_records CASCADE;
DROP TABLE IF EXISTS refund_provider_transactions CASCADE;
DROP TABLE IF EXISTS refund_financial_records CASCADE;
```

---

## Performance Considerations

### Indexing Strategy

All tables include comprehensive indexes for:
- Foreign key relationships
- Status filtering
- Time-based queries
- Provider lookups
- Transaction ID lookups

### Query Optimization

- Use indexes for filtering and sorting
- Leverage JSONB indexes for metadata queries
- Consider partitioning for large datasets
- Use connection pooling for concurrent access

### Monitoring

Monitor these metrics:
- Query execution times
- Index usage statistics
- Table sizes and growth rates
- Lock contention
- Reconciliation discrepancy rates

---

## Security Considerations

### Data Protection

- Sensitive financial data should be encrypted at rest
- Use SSL/TLS for data in transit
- Implement row-level security where appropriate
- Audit all access to financial records

### Access Control

- Restrict direct database access
- Use application-level permissions
- Implement role-based access control
- Log all administrative actions

### Compliance

- Maintain audit trails for all transactions
- Support data retention policies
- Enable data export for regulatory requirements
- Implement data anonymization where needed

---

## Maintenance

### Regular Tasks

1. **Daily**: Monitor reconciliation discrepancies
2. **Weekly**: Review failed refunds and retry logic
3. **Monthly**: Analyze batch processing performance
4. **Quarterly**: Audit trail review and archival

### Troubleshooting

Common issues and solutions:
- **Reconciliation discrepancies**: Check provider transaction logs
- **Failed refunds**: Review error messages and retry counts
- **Slow queries**: Analyze query plans and index usage
- **Data inconsistencies**: Run validation scripts

---

## Support

For questions or issues related to the refund financial records schema:
- Review this documentation
- Check the validation script output
- Consult the design document
- Contact the development team
