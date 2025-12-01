/**
 * Validation script for refund financial records schema
 * 
 * This script validates that the refund financial records schema has been
 * properly implemented with all required tables, columns, indexes, and relationships.
 */

import { db } from '../src/db';
import { sql } from 'drizzle-orm';

interface ValidationResult {
  passed: boolean;
  message: string;
  details?: any;
}

class RefundSchemaValidator {
  private results: ValidationResult[] = [];

  async validateTableExists(tableName: string): Promise<boolean> {
    try {
      const result = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ${tableName}
        );
      `);
      
      const exists = result.rows[0]?.exists || false;
      this.results.push({
        passed: exists,
        message: `Table '${tableName}' ${exists ? 'exists' : 'does not exist'}`,
      });
      
      return exists;
    } catch (error) {
      this.results.push({
        passed: false,
        message: `Error checking table '${tableName}': ${error.message}`,
      });
      return false;
    }
  }

  async validateColumns(tableName: string, requiredColumns: string[]): Promise<boolean> {
    try {
      const result = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = ${tableName};
      `);
      
      const existingColumns = result.rows.map((row: any) => row.column_name);
      const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
      
      const passed = missingColumns.length === 0;
      this.results.push({
        passed,
        message: `Table '${tableName}' columns validation ${passed ? 'passed' : 'failed'}`,
        details: passed ? null : { missingColumns },
      });
      
      return passed;
    } catch (error) {
      this.results.push({
        passed: false,
        message: `Error validating columns for '${tableName}': ${error.message}`,
      });
      return false;
    }
  }

  async validateIndexes(tableName: string, requiredIndexes: string[]): Promise<boolean> {
    try {
      const result = await db.execute(sql`
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = ${tableName};
      `);
      
      const existingIndexes = result.rows.map((row: any) => row.indexname);
      const missingIndexes = requiredIndexes.filter(idx => !existingIndexes.includes(idx));
      
      const passed = missingIndexes.length === 0;
      this.results.push({
        passed,
        message: `Table '${tableName}' indexes validation ${passed ? 'passed' : 'failed'}`,
        details: passed ? null : { missingIndexes },
      });
      
      return passed;
    } catch (error) {
      this.results.push({
        passed: false,
        message: `Error validating indexes for '${tableName}': ${error.message}`,
      });
      return false;
    }
  }

  async validateForeignKeys(tableName: string, expectedForeignKeys: number): Promise<boolean> {
    try {
      const result = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = ${tableName}
        AND constraint_type = 'FOREIGN KEY';
      `);
      
      const count = parseInt(result.rows[0]?.count || '0');
      const passed = count === expectedForeignKeys;
      
      this.results.push({
        passed,
        message: `Table '${tableName}' has ${count} foreign keys (expected ${expectedForeignKeys})`,
      });
      
      return passed;
    } catch (error) {
      this.results.push({
        passed: false,
        message: `Error validating foreign keys for '${tableName}': ${error.message}`,
      });
      return false;
    }
  }

  async runValidation(): Promise<void> {
    console.log('🔍 Starting Refund Financial Records Schema Validation...\n');

    // Validate refund_financial_records table
    console.log('📋 Validating refund_financial_records table...');
    await this.validateTableExists('refund_financial_records');
    await this.validateColumns('refund_financial_records', [
      'id', 'return_id', 'refund_id', 'original_amount', 'refund_amount',
      'processing_fee', 'platform_fee_impact', 'seller_impact', 'payment_provider',
      'provider_transaction_id', 'status', 'processed_at', 'reconciled',
      'reconciled_at', 'currency', 'refund_method', 'failure_reason',
      'retry_count', 'metadata', 'created_at', 'updated_at'
    ]);
    await this.validateIndexes('refund_financial_records', [
      'idx_refund_records_return_id',
      'idx_refund_records_refund_id',
      'idx_refund_records_status',
      'idx_refund_records_provider',
      'idx_refund_records_reconciled',
      'idx_refund_records_created_at',
      'idx_refund_records_processed_at',
      'idx_refund_records_provider_tx_id'
    ]);

    // Validate refund_provider_transactions table
    console.log('\n📋 Validating refund_provider_transactions table...');
    await this.validateTableExists('refund_provider_transactions');
    await this.validateColumns('refund_provider_transactions', [
      'id', 'refund_record_id', 'provider_name', 'provider_transaction_id',
      'provider_status', 'provider_response', 'transaction_type', 'amount',
      'currency', 'fee_amount', 'net_amount', 'exchange_rate',
      'destination_account', 'source_account', 'blockchain_tx_hash',
      'blockchain_network', 'confirmation_count', 'estimated_completion',
      'completed_at', 'failed_at', 'failure_code', 'failure_message',
      'webhook_received', 'webhook_data', 'created_at', 'updated_at'
    ]);
    await this.validateForeignKeys('refund_provider_transactions', 1);

    // Validate refund_reconciliation_records table
    console.log('\n📋 Validating refund_reconciliation_records table...');
    await this.validateTableExists('refund_reconciliation_records');
    await this.validateColumns('refund_reconciliation_records', [
      'id', 'refund_record_id', 'reconciliation_date', 'reconciliation_status',
      'expected_amount', 'actual_amount', 'discrepancy_amount', 'discrepancy_reason',
      'reconciled_by', 'reconciliation_notes', 'supporting_documents',
      'resolution_status', 'resolution_notes', 'resolved_at', 'resolved_by',
      'created_at', 'updated_at'
    ]);
    await this.validateForeignKeys('refund_reconciliation_records', 1);

    // Validate refund_transaction_audit_log table
    console.log('\n📋 Validating refund_transaction_audit_log table...');
    await this.validateTableExists('refund_transaction_audit_log');
    await this.validateColumns('refund_transaction_audit_log', [
      'id', 'refund_record_id', 'action_type', 'action_description',
      'performed_by', 'performed_by_role', 'previous_state', 'new_state',
      'ip_address', 'user_agent', 'timestamp'
    ]);
    await this.validateForeignKeys('refund_transaction_audit_log', 1);

    // Validate refund_batch_processing table
    console.log('\n📋 Validating refund_batch_processing table...');
    await this.validateTableExists('refund_batch_processing');
    await this.validateColumns('refund_batch_processing', [
      'id', 'batch_id', 'provider_name', 'total_refunds', 'successful_refunds',
      'failed_refunds', 'pending_refunds', 'total_amount', 'processed_amount',
      'batch_status', 'started_at', 'completed_at', 'error_summary',
      'metadata', 'created_at', 'updated_at'
    ]);

    // Validate refund_batch_items table
    console.log('\n📋 Validating refund_batch_items table...');
    await this.validateTableExists('refund_batch_items');
    await this.validateColumns('refund_batch_items', [
      'id', 'batch_id', 'refund_record_id', 'processing_order',
      'item_status', 'processed_at', 'error_message', 'retry_count',
      'created_at'
    ]);
    await this.validateForeignKeys('refund_batch_items', 2);

    // Print results
    this.printResults();
  }

  private printResults(): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 VALIDATION RESULTS');
    console.log('='.repeat(80) + '\n');

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;

    this.results.forEach((result, index) => {
      const icon = result.passed ? '✅' : '❌';
      console.log(`${icon} ${result.message}`);
      if (result.details) {
        console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
    console.log('='.repeat(80) + '\n');

    if (failed === 0) {
      console.log('🎉 All validations passed! Schema is correctly implemented.');
    } else {
      console.log('⚠️  Some validations failed. Please review the errors above.');
      process.exit(1);
    }
  }
}

// Run validation
async function main() {
  const validator = new RefundSchemaValidator();
  await validator.runValidation();
}

main().catch((error) => {
  console.error('❌ Validation script failed:', error);
  process.exit(1);
});
