import { db } from '../db/connection';
import { safeLogger } from '../utils/safeLogger';
import { sql } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';

async function createSellerPerformanceTables() {
  try {
    safeLogger.info('Creating seller performance tables...');

    // Create seller scorecards table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS seller_scorecards (
        id SERIAL PRIMARY KEY,
        seller_wallet_address VARCHAR(66) NOT NULL,
        overall_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        customer_satisfaction DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        order_fulfillment DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        response_time DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        dispute_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        growth_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        performance_tier VARCHAR(20) DEFAULT 'bronze',
        last_calculated_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (seller_wallet_address) REFERENCES sellers(wallet_address) ON DELETE CASCADE
      )
    `);

    // Create seller performance history table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS seller_performance_history (
        id SERIAL PRIMARY KEY,
        seller_wallet_address VARCHAR(66) NOT NULL,
        metric_type VARCHAR(50) NOT NULL,
        metric_value DECIMAL(10,4) NOT NULL,
        period_start TIMESTAMP NOT NULL,
        period_end TIMESTAMP NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (seller_wallet_address) REFERENCES sellers(wallet_address) ON DELETE CASCADE
      )
    `);

    // Create seller risk assessments table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS seller_risk_assessments (
        id SERIAL PRIMARY KEY,
        seller_wallet_address VARCHAR(66) NOT NULL,
        overall_risk_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        financial_risk DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        operational_risk DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        reputation_risk DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        compliance_risk DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        risk_factors JSONB DEFAULT '[]',
        risk_level VARCHAR(20) DEFAULT 'low',
        mitigation_recommendations JSONB DEFAULT '[]',
        last_assessed_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (seller_wallet_address) REFERENCES sellers(wallet_address) ON DELETE CASCADE
      )
    `);

    // Create seller performance alerts table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS seller_performance_alerts (
        id SERIAL PRIMARY KEY,
        seller_wallet_address VARCHAR(66) NOT NULL,
        alert_type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL DEFAULT 'medium',
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        threshold_value DECIMAL(10,4),
        current_value DECIMAL(10,4),
        recommendations JSONB DEFAULT '[]',
        is_acknowledged BOOLEAN DEFAULT FALSE,
        acknowledged_at TIMESTAMP,
        acknowledged_by VARCHAR(66),
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (seller_wallet_address) REFERENCES sellers(wallet_address) ON DELETE CASCADE
      )
    `);

    // Create marketplace health metrics table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS marketplace_health_metrics (
        id SERIAL PRIMARY KEY,
        metric_name VARCHAR(100) NOT NULL,
        metric_value DECIMAL(15,4) NOT NULL,
        metric_unit VARCHAR(50),
        category VARCHAR(50) NOT NULL,
        period_start TIMESTAMP NOT NULL,
        period_end TIMESTAMP NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create seller growth projections table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS seller_growth_projections (
        id SERIAL PRIMARY KEY,
        seller_wallet_address VARCHAR(66) NOT NULL,
        projection_type VARCHAR(50) NOT NULL,
        current_value DECIMAL(15,4) NOT NULL,
        projected_value DECIMAL(15,4) NOT NULL,
        confidence_interval DECIMAL(5,2) NOT NULL,
        projection_period_months INTEGER NOT NULL,
        success_factors JSONB DEFAULT '[]',
        improvement_recommendations JSONB DEFAULT '[]',
        model_version VARCHAR(20) DEFAULT '1.0',
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (seller_wallet_address) REFERENCES sellers(wallet_address) ON DELETE CASCADE
      )
    `);

    // Create indexes
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_seller_scorecards_wallet ON seller_scorecards(seller_wallet_address)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_seller_scorecards_tier ON seller_scorecards(performance_tier)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_seller_performance_history_wallet_type ON seller_performance_history(seller_wallet_address, metric_type)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_seller_performance_history_period ON seller_performance_history(period_start, period_end)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_seller_risk_assessments_wallet ON seller_risk_assessments(seller_wallet_address)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_seller_risk_assessments_level ON seller_risk_assessments(risk_level)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_seller_performance_alerts_wallet ON seller_performance_alerts(seller_wallet_address)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_seller_performance_alerts_type ON seller_performance_alerts(alert_type)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_marketplace_health_metrics_category ON marketplace_health_metrics(category)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_marketplace_health_metrics_period ON marketplace_health_metrics(period_start, period_end)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_seller_growth_projections_wallet ON seller_growth_projections(seller_wallet_address)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_seller_growth_projections_type ON seller_growth_projections(projection_type)`);

    safeLogger.info('Seller performance tables created successfully!');
  } catch (error) {
    safeLogger.error('Error creating seller performance tables:', error);
    throw error;
  }
}

// Run the script
createSellerPerformanceTables()
  .then(() => {
    safeLogger.info('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    safeLogger.error('Script failed:', error);
    process.exit(1);
  });