# Refund Financial Records Schema - Quick Reference

## Table Overview

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `refund_financial_records` | Main refund tracking | `id`, `return_id`, `refund_id`, `status`, `refund_amount` |
| `refund_provider_transactions` | Provider-specific details | `refund_record_id`, `provider_name`, `provider_transaction_id` |
| `refund_reconciliation_records` | Reconciliation tracking | `refund_record_id`, `expected_amount`, `actual_amount`, `discrepancy_amount` |
| `refund_transaction_audit_log` | Audit trail | `refund_record_id`, `action_type`, `performed_by` |
| `refund_batch_processing` | Batch operations | `batch_id`, `provider_name`, `batch_status` |
| `refund_batch_items` | Batch item details | `batch_id`, `refund_record_id`, `item_status` |

## Common Queries

### Get Refund with Provider Details
```typescript
const refund = await db
  .select()
  .from(refundFinancialRecords)
  .leftJoin(
    refundProviderTransactions,
    eq(refundFinancialRecords.id, refundProviderTransactions.refundRecordId)
  )
  .where(eq(refundFinancialRecords.id, refundId));
```

### Get Unreconciled Refunds
```typescript
const unreconciled = await db
  .select()
  .from(refundFinancialRecords)
  .where(eq(refundFinancialRecords.reconciled, false))
  .orderBy(desc(refundFinancialRecords.createdAt));
```

### Get Refunds with Discrepancies
```typescript
const discrepancies = await db
  .select()
  .from(refundReconciliationRecords)
  .where(ne(refundReconciliationRecords.discrepancyAmount, '0'))
  .orderBy(desc(refundReconciliationRecords.discrepancyAmount));
```

### Get Batch Processing Status
```typescript
const batch = await db
  .select()
  .from(refundBatchProcessing)
  .leftJoin(
    refundBatchItems,
    eq(refundBatchProcessing.id, refundBatchItems.batchId)
  )
  .where(eq(refundBatchProcessing.batchId, batchId));
```

### Get Audit Trail for Refund
```typescript
const auditLog = await db
  .select()
  .from(refundTransactionAuditLog)
  .where(eq(refundTransactionAuditLog.refundRecordId, refundId))
  .orderBy(desc(refundTransactionAuditLog.timestamp));
```

## Status Values

### Refund Status
- `pending`: Refund initiated but not processed
- `completed`: Refund successfully processed
- `failed`: Refund processing failed
- `cancelled`: Refund was cancelled

### Reconciliation Status
- `pending`: Awaiting reconciliation
- `completed`: Successfully reconciled
- `discrepancy`: Discrepancy detected
- `resolved`: Discrepancy resolved

### Batch Status
- `processing`: Batch currently processing
- `completed`: All items processed
- `failed`: Batch processing failed
- `partial`: Some items failed

### Item Status
- `pending`: Awaiting processing
- `completed`: Successfully processed
- `failed`: Processing failed

## Payment Providers

Supported providers:
- `stripe`: Stripe payments
- `paypal`: PayPal payments
- `blockchain`: Blockchain transactions (ETH, USDC, etc.)
- `bank_transfer`: Direct bank transfers

## Indexes

### Most Important Indexes
- `idx_refund_records_return_id`: Fast return lookup
- `idx_refund_records_status`: Status filtering
- `idx_refund_records_reconciled`: Reconciliation queries
- `idx_provider_tx_provider_tx_id`: Provider transaction lookup
- `idx_reconciliation_discrepancy`: Discrepancy detection

## Best Practices

### Creating Refunds
1. Always create main record first
2. Add provider transaction immediately
3. Log action in audit trail
4. Schedule reconciliation check

### Reconciliation
1. Run daily reconciliation jobs
2. Flag discrepancies immediately
3. Document resolution process
4. Update reconciliation status

### Batch Processing
1. Create batch record first
2. Add items with processing order
3. Update batch statistics as processing
4. Complete batch when all items done

### Audit Logging
1. Log all status changes
2. Include before/after states
3. Record admin actions
4. Capture context information

## Common Patterns

### Create Refund with Provider Transaction
```typescript
await db.transaction(async (tx) => {
  // Create main refund record
  const [refund] = await tx
    .insert(refundFinancialRecords)
    .values({
      returnId,
      refundId,
      originalAmount,
      refundAmount,
      paymentProvider,
      status: 'pending',
    })
    .returning();

  // Create provider transaction
  await tx.insert(refundProviderTransactions).values({
    refundRecordId: refund.id,
    providerName: paymentProvider,
    providerTransactionId,
    transactionType: 'refund',
    amount: refundAmount,
  });

  // Log action
  await tx.insert(refundTransactionAuditLog).values({
    refundRecordId: refund.id,
    actionType: 'created',
    actionDescription: 'Refund record created',
    performedBy: adminId,
  });
});
```

### Update Refund Status
```typescript
await db.transaction(async (tx) => {
  // Get current state
  const [current] = await tx
    .select()
    .from(refundFinancialRecords)
    .where(eq(refundFinancialRecords.id, refundId));

  // Update status
  await tx
    .update(refundFinancialRecords)
    .set({ status: newStatus, processedAt: new Date() })
    .where(eq(refundFinancialRecords.id, refundId));

  // Log change
  await tx.insert(refundTransactionAuditLog).values({
    refundRecordId: refundId,
    actionType: 'status_change',
    actionDescription: `Status changed from ${current.status} to ${newStatus}`,
    performedBy: adminId,
    previousState: { status: current.status },
    newState: { status: newStatus },
  });
});
```

### Reconcile Refund
```typescript
await db.transaction(async (tx) => {
  // Create reconciliation record
  const discrepancy = actualAmount - expectedAmount;
  
  await tx.insert(refundReconciliationRecords).values({
    refundRecordId,
    reconciliationDate: new Date(),
    reconciliationStatus: discrepancy === 0 ? 'completed' : 'discrepancy',
    expectedAmount,
    actualAmount,
    discrepancyAmount: discrepancy,
    reconciledBy: adminId,
  });

  // Update main record if reconciled
  if (discrepancy === 0) {
    await tx
      .update(refundFinancialRecords)
      .set({ reconciled: true, reconciledAt: new Date() })
      .where(eq(refundFinancialRecords.id, refundRecordId));
  }
});
```

## Troubleshooting

### Refund Not Processing
1. Check `status` in `refund_financial_records`
2. Review `failure_reason` if status is 'failed'
3. Check `retry_count` for retry attempts
4. Review provider transaction details

### Reconciliation Discrepancy
1. Query `refund_reconciliation_records` for discrepancy details
2. Check `discrepancy_reason` field
3. Review `supporting_documents` for evidence
4. Follow resolution workflow

### Batch Processing Issues
1. Check `batch_status` in `refund_batch_processing`
2. Review `error_summary` for batch-level errors
3. Query `refund_batch_items` for item-level failures
4. Check individual `error_message` fields

## Validation

Run validation script:
```bash
npm run db:validate-refund-schema
```

Expected output:
- ✅ All tables exist
- ✅ All columns present
- ✅ All indexes created
- ✅ All foreign keys valid

## Support

For issues or questions:
1. Review full documentation: `REFUND_FINANCIAL_RECORDS_SCHEMA.md`
2. Check validation script output
3. Review audit logs for transaction history
4. Contact development team
