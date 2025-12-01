/**
 * Validation Script for Performance Indexes
 * Task 1.1: Set up database indexes for performance
 * 
 * This script validates that all performance indexes have been created correctly
 * and provides statistics on their usage and effectiveness.
 */

import { db } from '../src/db';
import { sql } from 'drizzle-orm';

interface IndexInfo {
  schemaname: string;
  tablename: string;
  indexname: string;
  indexdef: string;
}

interface IndexStats {
  schemaname: string;
  tablename: string;
  indexname: string;
  idx_scan: number;
  idx_tup_read: number;
  idx_tup_fetch: number;
}

interface TableSize {
  table_name: string;
  total_size: string;
  table_size: string;
  indexes_size: string;
}

/**
 * Expected indexes from the migration
 */
const EXPECTED_INDEXES = [
  // Return Events
  'idx_return_events_user_timestamp',
  'idx_return_events_return_type_timestamp',
  'idx_return_events_category_timestamp',
  
  // Return Analytics Hourly
  'idx_return_analytics_hourly_timestamp',
  'idx_return_analytics_hourly_time_volume',
  
  // Return Analytics Daily
  'idx_return_analytics_daily_timestamp',
  'idx_return_analytics_daily_date_metrics',
  
  // Return Metrics Realtime
  'idx_return_metrics_realtime_timestamp',
  'idx_return_metrics_realtime_alerts',
  
  // Seller Return Performance
  'idx_seller_return_perf_seller_period',
  'idx_seller_return_perf_compliance',
  'idx_seller_return_perf_risk',
  'idx_seller_return_perf_ranking',
  
  // Category Return Analytics
  'idx_category_return_analytics_cat_period',
  'idx_category_return_analytics_rate',
  'idx_category_return_analytics_trend',
  
  // Refund Provider Performance
  'idx_refund_provider_perf_provider_time',
  'idx_refund_provider_perf_health',
  'idx_refund_provider_perf_errors',
  
  // Return Admin Alerts
  'idx_return_admin_alerts_active',
  'idx_return_admin_alerts_type_time',
  'idx_return_admin_alerts_user',
  'idx_return_admin_alerts_return',
  
  // Return Admin Audit Log
  'idx_return_admin_audit_admin_time',
  'idx_return_admin_audit_action_time',
  'idx_return_admin_audit_return',
  'idx_return_admin_audit_user',
  'idx_return_admin_audit_changes',
  
  // Refund Financial Records
  'idx_refund_records_return_status',
  'idx_refund_records_provider_time',
  'idx_refund_records_reconciliation',
  'idx_refund_records_failures',
  'idx_refund_records_financial',
  
  // Refund Provider Transactions
  'idx_provider_tx_provider_status_time',
  'idx_provider_tx_blockchain',
  'idx_provider_tx_failures',
  'idx_provider_tx_refund_time',
  
  // Refund Reconciliation Records
  'idx_reconciliation_status_date',
  'idx_reconciliation_pending',
  'idx_reconciliation_discrepancies',
  'idx_reconciliation_refund_date',
  
  // Refund Transaction Audit Log
  'idx_refund_audit_refund_time',
  'idx_refund_audit_action_time',
  'idx_refund_audit_admin',
  
  // Risk Assessments
  'idx_risk_assessments_user_time',
  'idx_risk_assessments_return_score',
  'idx_risk_assessments_review_needed',
  'idx_risk_assessments_model_outcome',
  
  // User Risk Profiles
  'idx_user_risk_profiles_level_score',
  'idx_user_risk_profiles_watchlist_status',
  'idx_user_risk_profiles_fraud',
  'idx_user_risk_profiles_returns',
  
  // Fraud Patterns
  'idx_fraud_patterns_active_severity',
  'idx_fraud_patterns_entity_scope',
  'idx_fraud_patterns_cluster_time',
  'idx_fraud_patterns_financial',
];

/**
 * Get all indexes in the database
 */
async function getAllIndexes(): Promise<IndexInfo[]> {
  const result = await db.execute(sql`
    SELECT 
      schemaname,
      tablename,
      indexname,
      indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname LIKE 'idx_%'
    ORDER BY tablename, indexname;
  `);
  
  return result.rows as IndexInfo[];
}

/**
 * Get index usage statistics
 */
async function getIndexStats(): Promise<IndexStats[]> {
  const result = await db.execute(sql`
    SELECT 
      schemaname,
      tablename,
      indexname,
      idx_scan,
      idx_tup_read,
      idx_tup_fetch
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
      AND indexname LIKE 'idx_%'
    ORDER BY idx_scan DESC;
  `);
  
  return result.rows as IndexStats[];
}

/**
 * Get table sizes including indexes
 */
async function getTableSizes(): Promise<TableSize[]> {
  const result = await db.execute(sql`
    SELECT
      table_name,
      pg_size_pretty(total_bytes) AS total_size,
      pg_size_pretty(table_bytes) AS table_size,
      pg_size_pretty(index_bytes) AS indexes_size
    FROM (
      SELECT
        c.relname AS table_name,
        pg_total_relation_size(c.oid) AS total_bytes,
        pg_relation_size(c.oid) AS table_bytes,
        pg_indexes_size(c.oid) AS index_bytes
      FROM pg_class c
      LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
        AND c.relname IN (
          'return_events',
          'return_analytics_hourly',
          'return_analytics_daily',
          'return_metrics_realtime',
          'seller_return_performance',
          'category_return_analytics',
          'refund_provider_performance',
          'return_admin_alerts',
          'return_admin_audit_log',
          'refund_financial_records',
          'refund_provider_transactions',
          'refund_reconciliation_records',
          'refund_transaction_audit_log',
          'risk_assessments',
          'user_risk_profiles',
          'fraud_patterns'
        )
    ) AS sizes
    ORDER BY total_bytes DESC;
  `);
  
  return result.rows as TableSize[];
}

/**
 * Check for missing indexes
 */
function checkMissingIndexes(existingIndexes: IndexInfo[]): string[] {
  const existingIndexNames = new Set(existingIndexes.map(idx => idx.indexname));
  return EXPECTED_INDEXES.filter(name => !existingIndexNames.has(name));
}

/**
 * Check for unused indexes
 */
function checkUnusedIndexes(stats: IndexStats[]): IndexStats[] {
  return stats.filter(stat => 
    stat.idx_scan === 0 && 
    EXPECTED_INDEXES.includes(stat.indexname)
  );
}

/**
 * Main validation function
 */
async function validatePerformanceIndexes() {
  console.log('🔍 Validating Performance Indexes for Return and Refund Admin Monitoring\n');
  console.log('=' .repeat(80));
  
  try {
    // Get all indexes
    console.log('\n📊 Fetching index information...');
    const allIndexes = await getAllIndexes();
    const relevantIndexes = allIndexes.filter(idx => 
      EXPECTED_INDEXES.includes(idx.indexname)
    );
    
    console.log(`✓ Found ${relevantIndexes.length} relevant indexes`);
    
    // Check for missing indexes
    console.log('\n🔎 Checking for missing indexes...');
    const missingIndexes = checkMissingIndexes(allIndexes);
    
    if (missingIndexes.length === 0) {
      console.log('✅ All expected indexes are present!');
    } else {
      console.log(`❌ Missing ${missingIndexes.length} indexes:`);
      missingIndexes.forEach(name => console.log(`   - ${name}`));
    }
    
    // Get index statistics
    console.log('\n📈 Fetching index usage statistics...');
    const indexStats = await getIndexStats();
    const relevantStats = indexStats.filter(stat => 
      EXPECTED_INDEXES.includes(stat.indexname)
    );
    
    console.log(`✓ Retrieved statistics for ${relevantStats.length} indexes`);
    
    // Check for unused indexes
    console.log('\n⚠️  Checking for unused indexes...');
    const unusedIndexes = checkUnusedIndexes(relevantStats);
    
    if (unusedIndexes.length === 0) {
      console.log('✅ All indexes have been used at least once');
    } else {
      console.log(`⚠️  Found ${unusedIndexes.length} unused indexes (may be normal for new deployment):`);
      unusedIndexes.forEach(stat => 
        console.log(`   - ${stat.indexname} on ${stat.tablename}`)
      );
    }
    
    // Display top used indexes
    console.log('\n🏆 Top 10 Most Used Indexes:');
    const topIndexes = relevantStats
      .sort((a, b) => b.idx_scan - a.idx_scan)
      .slice(0, 10);
    
    topIndexes.forEach((stat, i) => {
      console.log(`   ${i + 1}. ${stat.indexname}`);
      console.log(`      Table: ${stat.tablename}`);
      console.log(`      Scans: ${stat.idx_scan.toLocaleString()}`);
      console.log(`      Tuples Read: ${stat.idx_tup_read.toLocaleString()}`);
      console.log(`      Tuples Fetched: ${stat.idx_tup_fetch.toLocaleString()}`);
    });
    
    // Get table sizes
    console.log('\n💾 Table and Index Sizes:');
    const tableSizes = await getTableSizes();
    
    tableSizes.forEach(size => {
      console.log(`   ${size.table_name}:`);
      console.log(`      Total: ${size.total_size}`);
      console.log(`      Table: ${size.table_size}`);
      console.log(`      Indexes: ${size.indexes_size}`);
    });
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📋 VALIDATION SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Expected Indexes: ${EXPECTED_INDEXES.length}`);
    console.log(`Indexes Found: ${relevantIndexes.length}`);
    console.log(`Missing Indexes: ${missingIndexes.length}`);
    console.log(`Unused Indexes: ${unusedIndexes.length}`);
    
    if (missingIndexes.length === 0) {
      console.log('\n✅ All performance indexes are properly configured!');
      console.log('✅ Database is optimized for return and refund admin monitoring queries.');
      return true;
    } else {
      console.log('\n❌ Some indexes are missing. Please run the migration:');
      console.log('   npm run db:migrate');
      return false;
    }
    
  } catch (error) {
    console.error('\n❌ Error during validation:', error);
    throw error;
  }
}

/**
 * Run validation if executed directly
 */
if (require.main === module) {
  validatePerformanceIndexes()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { validatePerformanceIndexes };
