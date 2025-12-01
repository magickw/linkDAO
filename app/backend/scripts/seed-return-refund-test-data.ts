/**
 * Database Seeding Script for Return and Refund Admin Monitoring
 * Task 1.1: Write database seeding scripts for testing
 * 
 * This script generates comprehensive test data for:
 * - Return events and analytics
 * - Refund financial records
 * - Risk assessments and fraud patterns
 * - User risk profiles
 * - Admin alerts and audit logs
 */

import { db } from '../src/db';
import { sql } from 'drizzle-orm';
import { faker } from '@faker-js/faker';

// Configuration
const SEED_CONFIG = {
  users: 50,
  returns: 200,
  refunds: 180,
  riskAssessments: 150,
  fraudPatterns: 20,
  alerts: 30,
  auditLogs: 100,
};

// Helper functions
const randomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomDecimal = (min: number, max: number, decimals: number = 2) => 
  (Math.random() * (max - min) + min).toFixed(decimals);

// Status and type enums
const RETURN_STATUSES = ['requested', 'approved', 'rejected', 'in_transit', 'received', 'inspected', 'completed', 'cancelled'];
const REFUND_STATUSES = ['pending', 'completed', 'failed', 'cancelled'];
const PAYMENT_PROVIDERS = ['stripe', 'paypal', 'blockchain'];
const RISK_LEVELS = ['low', 'medium', 'high', 'critical'];
const FRAUD_PATTERN_TYPES = ['high_frequency_returns', 'high_value_returns', 'reason_abuse', 'timing_abuse', 'wardrobing'];

/**
 * Main seeding function
 */
async function seedDatabase() {
  console.log('🌱 Starting database seeding for Return and Refund Admin Monitoring...\n');

  try {
    // Step 1: Seed test users
    console.log('📝 Seeding test users...');
    const userIds = await seedUsers();
    console.log(`✅ Created ${userIds.length} test users\n`);

    // Step 2: Seed returns
    console.log('📦 Seeding return records...');
    const returnIds = await seedReturns(userIds);
    console.log(`✅ Created ${returnIds.length} return records\n`);

    // Step 3: Seed return events
    console.log('📊 Seeding return events...');
    await seedReturnEvents(returnIds, userIds);
    console.log(`✅ Created return events\n`);

    // Step 4: Seed refund financial records
    console.log('💰 Seeding refund financial records...');
    const refundIds = await seedRefundFinancialRecords(returnIds);
    console.log(`✅ Created ${refundIds.length} refund records\n`);

    // Step 5: Seed refund provider transactions
    console.log('🏦 Seeding provider transactions...');
    await seedProviderTransactions(refundIds);
    console.log(`✅ Created provider transactions\n`);

    // Step 6: Seed risk assessments
    console.log('⚠️  Seeding risk assessments...');
    await seedRiskAssessments(returnIds, userIds);
    console.log(`✅ Created risk assessments\n`);

    // Step 7: Seed user risk profiles
    console.log('👤 Seeding user risk profiles...');
    await seedUserRiskProfiles(userIds);
    console.log(`✅ Created user risk profiles\n`);

    // Step 8: Seed fraud patterns
    console.log('🚨 Seeding fraud patterns...');
    await seedFraudPatterns(userIds, returnIds);
    console.log(`✅ Created fraud patterns\n`);

    // Step 9: Seed admin alerts
    console.log('🔔 Seeding admin alerts...');
    await seedAdminAlerts(returnIds, userIds);
    console.log(`✅ Created admin alerts\n`);

    // Step 10: Seed audit logs
    console.log('📋 Seeding audit logs...');
    await seedAuditLogs(returnIds, userIds);
    console.log(`✅ Created audit logs\n`);

    // Step 11: Seed analytics aggregations
    console.log('📈 Seeding analytics aggregations...');
    await seedAnalyticsAggregations();
    console.log(`✅ Created analytics aggregations\n`);

    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

/**
 * Seed test users
 */
async function seedUsers(): Promise<string[]> {
  const userIds: string[] = [];
  
  for (let i = 0; i < SEED_CONFIG.users; i++) {
    const result = await db.execute(sql`
      INSERT INTO users (wallet_address, handle, display_name, role, created_at)
      VALUES (
        ${faker.finance.ethereumAddress()},
        ${faker.internet.userName().toLowerCase()},
        ${faker.person.fullName()},
        ${i < 5 ? 'admin' : 'user'},
        ${faker.date.past({ years: 2 })}
      )
      RETURNING id
    `);
    
    userIds.push(result.rows[0].id);
  }
  
  return userIds;
}

/**
 * Seed return records
 */
async function seedReturns(userIds: string[]): Promise<string[]> {
  const returnIds: string[]  = [];
  
  for (let i = 0; i < SEED_CONFIG.returns; i++) {
    const userId = randomElement(userIds);
    const status = randomElement(RETURN_STATUSES);
    const createdAt = faker.date.past({ years: 1 });
    const requestedAmount = randomDecimal(10, 1000, 2);
    
    const result = await db.execute(sql`
      INSERT INTO returns (
        order_id, user_id, seller_id, status, reason, 
        requested_amount, approved_amount, currency,
        created_at, updated_at
      )
      VALUES (
        gen_random_uuid(),
        ${userId},
        ${randomElement(userIds)},
        ${status},
        ${randomElement(['defective', 'wrong_item', 'not_as_described', 'changed_mind', 'damaged'])},
        ${requestedAmount},
        ${status === 'approved' || status === 'completed' ? requestedAmount : '0'},
        'USD',
        ${createdAt},
        ${faker.date.between({ from: createdAt, to: new Date() })}
      )
      RETURNING id
    `);
    
    returnIds.push(result.rows[0].id);
  }
  
  return returnIds;
}

/**
 * Seed return events
 */
async function seedReturnEvents(returnIds: string[], userIds: string[]): Promise<void> {
  const eventTypes = ['created', 'approved', 'rejected', 'shipped', 'received', 'inspected', 'refunded', 'completed'];
  
  for (const returnId of returnIds) {
    const numEvents = randomInt(2, 6);
    let previousTimestamp = faker.date.past({ years: 1 });
    
    for (let i = 0; i < numEvents; i++) {
      const timestamp = faker.date.between({ from: previousTimestamp, to: new Date() });
      
      await db.execute(sql`
        INSERT INTO return_events (
          return_id, event_type, event_category, actor_id, actor_role,
          event_data, timestamp, metadata
        )
        VALUES (
          ${returnId},
          ${randomElement(eventTypes)},
          ${randomElement(['status_change', 'communication', 'inspection', 'refund'])},
          ${randomElement(userIds)},
          ${randomElement(['buyer', 'seller', 'admin', 'system'])},
          ${JSON.stringify({ details: faker.lorem.sentence() })},
          ${timestamp},
          ${JSON.stringify({ ip: faker.internet.ip(), userAgent: faker.internet.userAgent() })}
        )
      `);
      
      previousTimestamp = timestamp;
    }
  }
}

/**
 * Seed refund financial records
 */
async function seedRefundFinancialRecords(returnIds: string[]): Promise<string[]> {
  const refundIds: string[] = [];
  
  // Create refunds for 90% of returns
  const returnsToRefund = returnIds.slice(0, Math.floor(returnIds.length * 0.9));
  
  for (const returnId of returnsToRefund) {
    const originalAmount = randomDecimal(10, 1000, 2);
    const refundAmount = randomDecimal(parseFloat(originalAmount) * 0.8, parseFloat(originalAmount), 2);
    const processingFee = randomDecimal(0.5, 5, 2);
    const status = randomElement(REFUND_STATUSES);
    
    const result = await db.execute(sql`
      INSERT INTO refund_financial_records (
        return_id, refund_id, original_amount, refund_amount,
        processing_fee, platform_fee_impact, seller_impact,
        payment_provider, provider_transaction_id, status,
        processed_at, reconciled, currency, created_at
      )
      VALUES (
        ${returnId},
        ${'REF-' + faker.string.alphanumeric(10).toUpperCase()},
        ${originalAmount},
        ${refundAmount},
        ${processingFee},
        ${randomDecimal(0, 10, 2)},
        ${randomDecimal(parseFloat(refundAmount) * 0.85, parseFloat(refundAmount), 2)},
        ${randomElement(PAYMENT_PROVIDERS)},
        ${'TXN-' + faker.string.alphanumeric(16).toUpperCase()},
        ${status},
        ${status === 'completed' ? faker.date.recent({ days: 30 }) : null},
        ${status === 'completed' && Math.random() > 0.3},
        'USD',
        ${faker.date.past({ years: 1 })}
      )
      RETURNING id
    `);
    
    refundIds.push(result.rows[0].id);
  }
  
  return refundIds;
}

/**
 * Seed refund provider transactions
 */
async function seedProviderTransactions(refundIds: string[]): Promise<void> {
  for (const refundId of refundIds) {
    const provider = randomElement(PAYMENT_PROVIDERS);
    const amount = randomDecimal(10, 1000, 2);
    const feeAmount = randomDecimal(0.5, 5, 2);
    const netAmount = (parseFloat(amount) - parseFloat(feeAmount)).toFixed(2);
    
    await db.execute(sql`
      INSERT INTO refund_provider_transactions (
        refund_record_id, provider_name, provider_transaction_id,
        provider_status, transaction_type, amount, currency,
        fee_amount, net_amount, completed_at, created_at
      )
      VALUES (
        ${refundId},
        ${provider},
        ${'PTX-' + faker.string.alphanumeric(20).toUpperCase()},
        ${randomElement(['completed', 'pending', 'failed'])},
        ${randomElement(['refund', 'reversal', 'chargeback'])},
        ${amount},
        'USD',
        ${feeAmount},
        ${netAmount},
        ${Math.random() > 0.2 ? faker.date.recent({ days: 30 }) : null},
        ${faker.date.past({ years: 1 })}
      )
    `);
  }
}

/**
 * Seed risk assessments
 */
async function seedRiskAssessments(returnIds: string[], userIds: string[]): Promise<void> {
  // Create risk assessments for 75% of returns
  const returnsToAssess = returnIds.slice(0, Math.floor(returnIds.length * 0.75));
  
  for (const returnId of returnsToAssess) {
    const riskScore = randomDecimal(0, 100, 2);
    const riskLevel = parseFloat(riskScore) < 25 ? 'low' : 
                      parseFloat(riskScore) < 50 ? 'medium' :
                      parseFloat(riskScore) < 75 ? 'high' : 'critical';
    
    await db.execute(sql`
      INSERT INTO risk_assessments (
        return_id, user_id, risk_score, risk_level, confidence_score,
        model_version, model_type, recommendation, explanation,
        feature_contributions, predicted_fraud_probability,
        predicted_outcome, reviewed, created_at
      )
      VALUES (
        ${returnId},
        ${randomElement(userIds)},
        ${riskScore},
        ${riskLevel},
        ${randomDecimal(70, 99, 2)},
        ${'v' + randomInt(1, 3) + '.' + randomInt(0, 9)},
        ${randomElement(['rule_based', 'ml_model', 'hybrid'])},
        ${randomElement(['auto_approve', 'manual_review', 'reject', 'escalate'])},
        ${faker.lorem.sentence()},
        ${JSON.stringify([
          { feature: 'return_frequency', weight: 0.3, contribution: randomDecimal(0, 30, 2) },
          { feature: 'order_value', weight: 0.25, contribution: randomDecimal(0, 25, 2) },
          { feature: 'user_history', weight: 0.45, contribution: randomDecimal(0, 45, 2) }
        ])},
        ${randomDecimal(0, 1, 4)},
        ${randomElement(['legitimate', 'suspicious', 'fraudulent'])},
        ${Math.random() > 0.5},
        ${faker.date.past({ years: 1 })}
      )
    `);
  }
}

/**
 * Seed user risk profiles
 */
async function seedUserRiskProfiles(userIds: string[]): Promise<void> {
  for (const userId of userIds) {
    const totalReturns = randomInt(0, 50);
    const approvedReturns = randomInt(0, totalReturns);
    const rejectedReturns = totalReturns - approvedReturns;
    const fraudulentReturns = randomInt(0, Math.floor(totalReturns * 0.1));
    const riskScore = randomDecimal(0, 100, 2);
    const riskLevel = parseFloat(riskScore) < 25 ? 'low' : 
                      parseFloat(riskScore) < 50 ? 'medium' :
                      parseFloat(riskScore) < 75 ? 'high' : 'critical';
    
    await db.execute(sql`
      INSERT INTO user_risk_profiles (
        user_id, current_risk_score, current_risk_level, risk_trend,
        total_returns, approved_returns, rejected_returns, fraudulent_returns,
        approval_rate, total_refund_amount, avg_refund_amount,
        account_status, trust_score, account_age_days,
        on_watchlist, created_at, updated_at
      )
      VALUES (
        ${userId},
        ${riskScore},
        ${riskLevel},
        ${randomElement(['increasing', 'decreasing', 'stable'])},
        ${totalReturns},
        ${approvedReturns},
        ${rejectedReturns},
        ${fraudulentReturns},
        ${totalReturns > 0 ? ((approvedReturns / totalReturns) * 100).toFixed(2) : '0'},
        ${randomDecimal(0, 10000, 2)},
        ${randomDecimal(10, 500, 2)},
        ${randomElement(['active', 'monitored', 'restricted'])},
        ${randomDecimal(0, 100, 2)},
        ${randomInt(1, 730)},
        ${parseFloat(riskScore) > 70},
        ${faker.date.past({ years: 2 })},
        ${faker.date.recent({ days: 30 })}
      )
    `);
  }
}

/**
 * Seed fraud patterns
 */
async function seedFraudPatterns(userIds: string[], returnIds: string[]): Promise<void> {
  for (let i = 0; i < SEED_CONFIG.fraudPatterns; i++) {
    const patternType = randomElement(FRAUD_PATTERN_TYPES);
    const severity = randomElement(['low', 'medium', 'high', 'critical']);
    const scope = randomElement(['user', 'seller', 'system']);
    
    await db.execute(sql`
      INSERT INTO fraud_patterns (
        pattern_type, pattern_name, scope, entity_id,
        description, detection_method, severity, confidence,
        frequency, evidence, affected_returns, affected_users,
        first_detected_at, last_detected_at, detection_window_days,
        estimated_loss, status, created_at
      )
      VALUES (
        ${patternType},
        ${faker.lorem.words(3)},
        ${scope},
        ${scope === 'system' ? null : randomElement(userIds)},
        ${faker.lorem.sentence()},
        ${randomElement(['rule_based', 'statistical', 'ml_model'])},
        ${severity},
        ${randomDecimal(60, 99, 2)},
        ${randomInt(1, 20)},
        ${JSON.stringify([
          { type: 'behavioral', description: faker.lorem.sentence() },
          { type: 'financial', description: faker.lorem.sentence() }
        ])},
        ${JSON.stringify(returnIds.slice(0, randomInt(1, 10)))},
        ${JSON.stringify(userIds.slice(0, randomInt(1, 5)))},
        ${faker.date.past({ years: 1 })},
        ${faker.date.recent({ days: 30 })},
        ${randomInt(7, 365)},
        ${randomDecimal(100, 10000, 2)},
        ${randomElement(['active', 'investigating', 'confirmed', 'resolved'])},
        ${faker.date.past({ years: 1 })}
      )
    `);
  }
}

/**
 * Seed admin alerts
 */
async function seedAdminAlerts(returnIds: string[], userIds: string[]): Promise<void> {
  const alertTypes = ['high_risk_return', 'volume_spike', 'processing_delay', 'fraud_detected', 'policy_violation'];
  
  for (let i = 0; i < SEED_CONFIG.alerts; i++) {
    const alertType = randomElement(alertTypes);
    const severity = randomElement(['low', 'medium', 'high', 'critical']);
    const status = randomElement(['active', 'acknowledged', 'resolved', 'dismissed']);
    
    await db.execute(sql`
      INSERT INTO return_admin_alerts (
        alert_type, severity, title, description,
        related_return_id, related_user_id, status,
        threshold_value, actual_value, acknowledged_by,
        acknowledged_at, resolved_at, created_at
      )
      VALUES (
        ${alertType},
        ${severity},
        ${faker.lorem.words(5)},
        ${faker.lorem.paragraph()},
        ${Math.random() > 0.3 ? randomElement(returnIds) : null},
        ${Math.random() > 0.3 ? randomElement(userIds) : null},
        ${status},
        ${randomDecimal(0, 100, 2)},
        ${randomDecimal(0, 150, 2)},
        ${status !== 'active' ? randomElement(userIds) : null},
        ${status !== 'active' ? faker.date.recent({ days: 7 }) : null},
        ${status === 'resolved' ? faker.date.recent({ days: 3 }) : null},
        ${faker.date.past({ years: 1 })}
      )
    `);
  }
}

/**
 * Seed audit logs
 */
async function seedAuditLogs(returnIds: string[], userIds: string[]): Promise<void> {
  const actionTypes = ['status_change', 'refund_processed', 'risk_assessment', 'manual_review', 'policy_update'];
  
  for (let i = 0; i < SEED_CONFIG.auditLogs; i++) {
    const actionType = randomElement(actionTypes);
    const adminId = randomElement(userIds.slice(0, 5)); // First 5 users are admins
    
    await db.execute(sql`
      INSERT INTO return_admin_audit_log (
        return_id, user_id, admin_id, action_type,
        action_description, before_state, after_state,
        ip_address, user_agent, timestamp
      )
      VALUES (
        ${Math.random() > 0.2 ? randomElement(returnIds) : null},
        ${Math.random() > 0.3 ? randomElement(userIds) : null},
        ${adminId},
        ${actionType},
        ${faker.lorem.sentence()},
        ${JSON.stringify({ status: 'pending', amount: randomDecimal(10, 500, 2) })},
        ${JSON.stringify({ status: 'approved', amount: randomDecimal(10, 500, 2) })},
        ${faker.internet.ip()},
        ${faker.internet.userAgent()},
        ${faker.date.past({ years: 1 })}
      )
    `);
  }
}

/**
 * Seed analytics aggregations
 */
async function seedAnalyticsAggregations(): Promise<void> {
  // Seed hourly analytics for the past 7 days
  const now = new Date();
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const timestamp = new Date(now);
      timestamp.setDate(timestamp.getDate() - day);
      timestamp.setHours(hour, 0, 0, 0);
      
      const totalReturns = randomInt(5, 50);
      const approvedReturns = randomInt(0, totalReturns);
      const rejectedReturns = randomInt(0, totalReturns - approvedReturns);
      
      await db.execute(sql`
        INSERT INTO return_analytics_hourly (
          hour_timestamp, total_returns, approved_returns, rejected_returns,
          pending_returns, avg_processing_time_minutes, total_refund_amount,
          avg_refund_amount, return_rate_percentage, created_at
        )
        VALUES (
          ${timestamp},
          ${totalReturns},
          ${approvedReturns},
          ${rejectedReturns},
          ${totalReturns - approvedReturns - rejectedReturns},
          ${randomDecimal(30, 480, 2)},
          ${randomDecimal(1000, 50000, 2)},
          ${randomDecimal(50, 500, 2)},
          ${randomDecimal(5, 25, 2)},
          ${timestamp}
        )
      `);
    }
  }
  
  // Seed daily analytics for the past 90 days
  for (let day = 0; day < 90; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);
    date.setHours(0, 0, 0, 0);
    
    const totalReturns = randomInt(50, 500);
    const approvedReturns = randomInt(0, totalReturns);
    const rejectedReturns = randomInt(0, totalReturns - approvedReturns);
    
    await db.execute(sql`
      INSERT INTO return_analytics_daily (
        day_date, total_returns, approved_returns, rejected_returns,
        pending_returns, avg_processing_time_minutes, total_refund_amount,
        avg_refund_amount, return_rate_percentage, unique_users,
        unique_sellers, created_at
      )
      VALUES (
        ${date},
        ${totalReturns},
        ${approvedReturns},
        ${rejectedReturns},
        ${totalReturns - approvedReturns - rejectedReturns},
        ${randomDecimal(60, 720, 2)},
        ${randomDecimal(10000, 500000, 2)},
        ${randomDecimal(100, 1000, 2)},
        ${randomDecimal(10, 30, 2)},
        ${randomInt(20, 200)},
        ${randomInt(10, 100)},
        ${date}
      )
    `);
  }
  
  // Seed real-time metrics (last 24 hours in 5-minute intervals)
  for (let i = 0; i < 288; i++) { // 24 hours * 12 (5-min intervals)
    const timestamp = new Date(now);
    timestamp.setMinutes(timestamp.getMinutes() - (i * 5));
    
    await db.execute(sql`
      INSERT INTO return_metrics_realtime (
        interval_timestamp, active_returns, pending_approvals,
        processing_returns, avg_response_time_seconds,
        alert_volume_spike, alert_processing_delay, created_at
      )
      VALUES (
        ${timestamp},
        ${randomInt(10, 100)},
        ${randomInt(5, 50)},
        ${randomInt(5, 30)},
        ${randomDecimal(30, 300, 2)},
        ${Math.random() > 0.9},
        ${Math.random() > 0.85},
        ${timestamp}
      )
    `);
  }
}

/**
 * Execute seeding
 */
seedDatabase()
  .then(() => {
    console.log('\n✨ Seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Seeding failed:', error);
    process.exit(1);
  });
