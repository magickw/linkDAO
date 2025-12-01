/**
 * Validation Script for Risk Assessment Data Models
 * 
 * This script validates the risk assessment schema implementation
 * and ensures all tables, indexes, and constraints are properly created.
 */

import { db } from '../src/db';
import { sql } from 'drizzle-orm';

interface ValidationResult {
  check: string;
  passed: boolean;
  message: string;
  details?: any;
}

const results: ValidationResult[] = [];

async function validateTable(tableName: string, expectedColumns: string[]): Promise<void> {
  try {
    const result = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = ${tableName}
      ORDER BY ordinal_position
    `);

    const columns = result.rows.map((row: any) => row.column_name);
    const missingColumns = expectedColumns.filter(col => !columns.includes(col));
    
    if (missingColumns.length === 0) {
      results.push({
        check: `Table: ${tableName}`,
        passed: true,
        message: `All expected columns present (${columns.length} columns)`,
        details: { columns }
      });
    } else {
      results.push({
        check: `Table: ${tableName}`,
        passed: false,
        message: `Missing columns: ${missingColumns.join(', ')}`,
        details: { found: columns, missing: missingColumns }
      });
    }
  } catch (error) {
    results.push({
      check: `Table: ${tableName}`,
      passed: false,
      message: `Error validating table: ${error.message}`,
      details: { error }
    });
  }
}

async function validateIndexes(tableName: string, expectedIndexCount: number): Promise<void> {
  try {
    const result = await db.execute(sql`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = ${tableName}
    `);

    const indexCount = result.rows.length;
    
    if (indexCount >= expectedIndexCount) {
      results.push({
        check: `Indexes: ${tableName}`,
        passed: true,
        message: `Found ${indexCount} indexes (expected at least ${expectedIndexCount})`,
        details: { indexes: result.rows.map((r: any) => r.indexname) }
      });
    } else {
      results.push({
        check: `Indexes: ${tableName}`,
        passed: false,
        message: `Only ${indexCount} indexes found (expected at least ${expectedIndexCount})`,
        details: { indexes: result.rows.map((r: any) => r.indexname) }
      });
    }
  } catch (error) {
    results.push({
      check: `Indexes: ${tableName}`,
      passed: false,
      message: `Error validating indexes: ${error.message}`,
      details: { error }
    });
  }
}

async function validateConstraints(tableName: string, constraintType: string): Promise<void> {
  try {
    const result = await db.execute(sql`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = ${tableName}
        AND constraint_type = ${constraintType}
    `);

    const constraintCount = result.rows.length;
    
    results.push({
      check: `${constraintType} Constraints: ${tableName}`,
      passed: constraintCount > 0,
      message: `Found ${constraintCount} ${constraintType} constraints`,
      details: { constraints: result.rows.map((r: any) => r.constraint_name) }
    });
  } catch (error) {
    results.push({
      check: `${constraintType} Constraints: ${tableName}`,
      passed: false,
      message: `Error validating constraints: ${error.message}`,
      details: { error }
    });
  }
}

async function validateTriggers(tableName: string): Promise<void> {
  try {
    const result = await db.execute(sql`
      SELECT trigger_name, event_manipulation, action_statement
      FROM information_schema.triggers
      WHERE event_object_table = ${tableName}
    `);

    const triggerCount = result.rows.length;
    
    results.push({
      check: `Triggers: ${tableName}`,
      passed: true,
      message: `Found ${triggerCount} triggers`,
      details: { triggers: result.rows.map((r: any) => r.trigger_name) }
    });
  } catch (error) {
    results.push({
      check: `Triggers: ${tableName}`,
      passed: false,
      message: `Error validating triggers: ${error.message}`,
      details: { error }
    });
  }
}

async function validateMaterializedView(viewName: string): Promise<void> {
  try {
    const result = await db.execute(sql`
      SELECT schemaname, matviewname
      FROM pg_matviews
      WHERE matviewname = ${viewName}
    `);

    if (result.rows.length > 0) {
      results.push({
        check: `Materialized View: ${viewName}`,
        passed: true,
        message: 'Materialized view exists',
        details: { view: result.rows[0] }
      });
    } else {
      results.push({
        check: `Materialized View: ${viewName}`,
        passed: false,
        message: 'Materialized view not found'
      });
    }
  } catch (error) {
    results.push({
      check: `Materialized View: ${viewName}`,
      passed: false,
      message: `Error validating view: ${error.message}`,
      details: { error }
    });
  }
}

async function testDataInsertion(): Promise<void> {
  try {
    // Test inserting a sample risk rule
    const testRule = await db.execute(sql`
      INSERT INTO risk_rules (
        rule_name, rule_code, rule_category, description, 
        condition, risk_score_impact, severity
      ) VALUES (
        'Test Rule', 'TEST_RULE', 'frequency', 'Test rule for validation',
        '{"metric": "test", "operator": ">", "value": 1}'::jsonb,
        10.0, 'low'
      )
      RETURNING id
    `);

    const ruleId = testRule.rows[0].id;

    // Clean up test data
    await db.execute(sql`DELETE FROM risk_rules WHERE id = ${ruleId}`);

    results.push({
      check: 'Data Insertion Test',
      passed: true,
      message: 'Successfully inserted and deleted test data'
    });
  } catch (error) {
    results.push({
      check: 'Data Insertion Test',
      passed: false,
      message: `Error testing data insertion: ${error.message}`,
      details: { error }
    });
  }
}

async function runValidation(): Promise<void> {
  console.log('🔍 Starting Risk Assessment Schema Validation...\n');

  // Validate risk_assessments table
  await validateTable('risk_assessments', [
    'id', 'return_id', 'user_id', 'risk_score', 'risk_level', 
    'confidence_score', 'model_version', 'model_type', 'recommendation',
    'explanation', 'feature_contributions', 'created_at', 'updated_at'
  ]);
  await validateIndexes('risk_assessments', 8);
  await validateConstraints('risk_assessments', 'CHECK');
  await validateConstraints('risk_assessments', 'FOREIGN KEY');
  await validateTriggers('risk_assessments');

  // Validate risk_features table
  await validateTable('risk_features', [
    'id', 'assessment_id', 'feature_name', 'feature_category',
    'feature_value', 'normalized_value', 'weight', 'contribution',
    'risk_indicator', 'created_at'
  ]);
  await validateIndexes('risk_features', 5);

  // Validate fraud_patterns table
  await validateTable('fraud_patterns', [
    'id', 'pattern_type', 'pattern_name', 'scope', 'entity_id',
    'description', 'detection_method', 'severity', 'confidence',
    'frequency', 'evidence', 'status', 'created_at', 'updated_at'
  ]);
  await validateIndexes('fraud_patterns', 9);
  await validateTriggers('fraud_patterns');

  // Validate user_risk_profiles table
  await validateTable('user_risk_profiles', [
    'id', 'user_id', 'current_risk_score', 'current_risk_level',
    'risk_trend', 'total_returns', 'approved_returns', 'rejected_returns',
    'fraudulent_returns', 'account_status', 'trust_score', 'on_watchlist',
    'created_at', 'updated_at'
  ]);
  await validateIndexes('user_risk_profiles', 7);
  await validateTriggers('user_risk_profiles');

  // Validate risk_rules table
  await validateTable('risk_rules', [
    'id', 'rule_name', 'rule_code', 'rule_category', 'description',
    'condition', 'threshold_value', 'risk_score_impact', 'severity',
    'is_active', 'execution_order', 'times_triggered', 'created_at', 'updated_at'
  ]);
  await validateIndexes('risk_rules', 5);
  await validateTriggers('risk_rules');

  // Validate risk_rule_executions table
  await validateTable('risk_rule_executions', [
    'id', 'rule_id', 'assessment_id', 'return_id', 'triggered',
    'threshold_value', 'actual_value', 'risk_score_added', 'executed_at'
  ]);
  await validateIndexes('risk_rule_executions', 5);
  await validateTriggers('risk_rule_executions');

  // Validate fraud_investigation_cases table
  await validateTable('fraud_investigation_cases', [
    'id', 'case_number', 'case_type', 'primary_user_id', 'title',
    'description', 'severity', 'priority', 'status', 'assigned_to',
    'resolution', 'opened_at', 'created_at', 'updated_at'
  ]);
  await validateIndexes('fraud_investigation_cases', 7);
  await validateTriggers('fraud_investigation_cases');

  // Validate materialized views
  await validateMaterializedView('high_risk_users_summary');
  await validateMaterializedView('active_fraud_patterns_summary');

  // Test data insertion
  await testDataInsertion();

  // Print results
  console.log('\n📊 Validation Results:\n');
  console.log('='.repeat(80));

  let passedCount = 0;
  let failedCount = 0;

  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.check}`);
    console.log(`   ${result.message}`);
    
    if (result.details && !result.passed) {
      console.log(`   Details:`, JSON.stringify(result.details, null, 2));
    }
    console.log('');

    if (result.passed) {
      passedCount++;
    } else {
      failedCount++;
    }
  });

  console.log('='.repeat(80));
  console.log(`\n📈 Summary: ${passedCount} passed, ${failedCount} failed\n`);

  if (failedCount === 0) {
    console.log('🎉 All validation checks passed! Risk assessment schema is properly configured.\n');
  } else {
    console.log('⚠️  Some validation checks failed. Please review the errors above.\n');
    process.exit(1);
  }
}

// Run validation
runValidation()
  .then(() => {
    console.log('✨ Validation complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Validation failed with error:', error);
    process.exit(1);
  });
