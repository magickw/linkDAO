-- Migration: Tax Liability Tracking System
-- This migration adds tables to track tax obligations, remittances, and compliance
-- Ensures tax funds are separated from platform revenue and properly remitted to authorities

-- Tax Liability Table
CREATE TABLE IF NOT EXISTS tax_liabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    escrow_id UUID,
    tax_jurisdiction VARCHAR(100) NOT NULL, -- e.g., "US-CA", "GB", "DE"
    tax_rate DECIMAL(10, 6) NOT NULL, -- e.g., 0.0825 for 8.25%
    tax_amount DECIMAL(20, 8) NOT NULL, -- Tax amount in platform currency
    taxable_amount DECIMAL(20, 8) NOT NULL, -- Amount subject to tax
    tax_type VARCHAR(50) NOT NULL, -- 'sales_tax', 'vat', 'gst', 'hst', 'pst'
    collection_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    due_date DATE NOT NULL, -- Quarterly or monthly due date
    remittance_date TIMESTAMP,
    remittance_reference VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'calculated', 'filed', 'paid', 'failed', 'partial')),
    remittance_provider VARCHAR(100), -- 'stripe_tax', 'taxjar', 'avalara', 'manual'
    remittance_provider_id VARCHAR(255), -- External ID from provider
    transaction_hash VARCHAR(255), -- For crypto remittances
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB,
    
    CONSTRAINT fk_tax_liabilities_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_tax_liabilities_escrow FOREIGN KEY (escrow_id) REFERENCES escrows(id) ON DELETE SET NULL
);

-- Tax Remittance Batch Table (for grouping multiple tax liabilities)
CREATE TABLE IF NOT EXISTS tax_remittance_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_number VARCHAR(50) UNIQUE NOT NULL,
    remittance_period_start DATE NOT NULL,
    remittance_period_end DATE NOT NULL,
    total_tax_amount DECIMAL(20, 8) NOT NULL,
    total_liabilities INTEGER NOT NULL,
    jurisdiction_breakdown JSONB,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'filed', 'paid', 'failed')),
    filed_at TIMESTAMP,
    paid_at TIMESTAMP,
    remittance_provider VARCHAR(100),
    remittance_provider_batch_id VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Tax Liability to Batch Mapping
CREATE TABLE IF NOT EXISTS tax_remittance_batch_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL,
    tax_liability_id UUID NOT NULL,
    
    CONSTRAINT fk_batch_items_batch FOREIGN KEY (batch_id) REFERENCES tax_remittance_batches(id) ON DELETE CASCADE,
    CONSTRAINT fk_batch_items_liability FOREIGN KEY (tax_liability_id) REFERENCES tax_liabilities(id) ON DELETE CASCADE,
    UNIQUE(batch_id, tax_liability_id)
);

-- Tax Filing Records (for audit and compliance)
CREATE TABLE IF NOT EXISTS tax_filings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID,
    jurisdiction VARCHAR(100) NOT NULL,
    filing_type VARCHAR(50) NOT NULL, -- 'quarterly', 'monthly', 'annual'
    filing_period_start DATE NOT NULL,
    filing_period_end DATE NOT NULL,
    gross_sales DECIMAL(20, 8) NOT NULL,
    taxable_sales DECIMAL(20, 8) NOT NULL,
    tax_collected DECIMAL(20, 8) NOT NULL,
    tax_due DECIMAL(20, 8) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'filed', 'accepted', 'rejected', 'amended')),
    filed_at TIMESTAMP,
    accepted_at TIMESTAMP,
    filing_reference VARCHAR(255),
    filing_provider VARCHAR(100),
    filing_provider_id VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_tax_filings_batch FOREIGN KEY (batch_id) REFERENCES tax_remittance_batches(id) ON DELETE SET NULL
);

-- Tax Compliance Alerts (for monitoring and notifications)
CREATE TABLE IF NOT EXISTS tax_compliance_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(100) NOT NULL, -- 'overdue', 'filing_required', 'payment_failed', 'rate_change'
    severity VARCHAR(50) NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
    jurisdiction VARCHAR(100),
    tax_liability_id UUID,
    message TEXT NOT NULL,
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at TIMESTAMP,
    resolved_by UUID,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_compliance_alerts_liability FOREIGN KEY (tax_liability_id) REFERENCES tax_liabilities(id) ON DELETE SET NULL,
    CONSTRAINT fk_compliance_alerts_resolved_by FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tax_liabilities_order_id ON tax_liabilities(order_id);
CREATE INDEX IF NOT EXISTS idx_tax_liabilities_escrow_id ON tax_liabilities(escrow_id);
CREATE INDEX IF NOT EXISTS idx_tax_liabilities_jurisdiction ON tax_liabilities(tax_jurisdiction);
CREATE INDEX IF NOT EXISTS idx_tax_liabilities_status ON tax_liabilities(status);
CREATE INDEX IF NOT EXISTS idx_tax_liabilities_due_date ON tax_liabilities(due_date);
CREATE INDEX IF NOT EXISTS idx_tax_liabilities_collection_date ON tax_liabilities(collection_date);
CREATE INDEX IF NOT EXISTS idx_tax_liabilities_jurisdiction_status ON tax_liabilities(tax_jurisdiction, status);

CREATE INDEX IF NOT EXISTS idx_tax_remittance_batches_period ON tax_remittance_batches(remittance_period_start, remittance_period_end);
CREATE INDEX IF NOT EXISTS idx_tax_remittance_batches_status ON tax_remittance_batches(status);
CREATE INDEX IF NOT EXISTS idx_tax_remittance_batches_created_at ON tax_remittance_batches(created_at);

CREATE INDEX IF NOT EXISTS idx_tax_filings_jurisdiction ON tax_filings(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_tax_filings_period ON tax_filings(filing_period_start, filing_period_end);
CREATE INDEX IF NOT EXISTS idx_tax_filings_status ON tax_filings(status);

CREATE INDEX IF NOT EXISTS idx_tax_compliance_alerts_resolved ON tax_compliance_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_tax_compliance_alerts_created_at ON tax_compliance_alerts(created_at);

-- Comments for documentation
COMMENT ON TABLE tax_liabilities IS 'Tracks individual tax obligations from each transaction';
COMMENT ON COLUMN tax_liabilities.tax_jurisdiction IS 'Tax jurisdiction code (e.g., US-CA, GB, DE)';
COMMENT ON COLUMN tax_liabilities.tax_rate IS 'Tax rate as decimal (0.0825 = 8.25%)';
COMMENT ON COLUMN tax_liabilities.due_date IS 'Date when tax must be remitted to authority';
COMMENT ON COLUMN tax_liabilities.remittance_provider IS 'Service used for tax remittance';

COMMENT ON TABLE tax_remittance_batches IS 'Groups multiple tax liabilities for batch processing and remittance';
COMMENT ON COLUMN tax_remittance_batches.batch_number IS 'Unique identifier for the remittance batch';

COMMENT ON TABLE tax_filings IS 'Records tax filings with authorities for audit and compliance';
COMMENT ON TABLE tax_compliance_alerts IS 'Alerts for tax compliance monitoring and notifications';

-- Add tax_liability_id to orders table (for direct reference)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_liability_id UUID;
ALTER TABLE orders ADD CONSTRAINT fk_orders_tax_liability FOREIGN KEY (tax_liability_id) REFERENCES tax_liabilities(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_orders_tax_liability_id ON orders(tax_liability_id);

-- Add tax_escrow_amount to escrows table (for crypto tax separation)
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS tax_escrow_amount DECIMAL(20, 8) DEFAULT 0;
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS tax_escrow_remitted BOOLEAN DEFAULT FALSE;
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS tax_escrow_remitted_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_escrows_tax_escrow_remitted ON escrows(tax_escrow_remitted);

-- Function to calculate tax remittance due date based on jurisdiction
CREATE OR REPLACE FUNCTION calculate_tax_due_date(
    jurisdiction VARCHAR(100),
    collection_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) RETURNS DATE AS $$
DECLARE
    due_date DATE;
BEGIN
    -- US: Quarterly (March 31, June 30, Sept 30, Dec 31)
    IF jurisdiction LIKE 'US-%' THEN
        CASE 
            WHEN EXTRACT(MONTH FROM collection_date) <= 3 THEN
                due_date := MAKE_DATE(EXTRACT(YEAR FROM collection_date)::INT, 4, 30);
            WHEN EXTRACT(MONTH FROM collection_date) <= 6 THEN
                due_date := MAKE_DATE(EXTRACT(YEAR FROM collection_date)::INT, 7, 31);
            WHEN EXTRACT(MONTH FROM collection_date) <= 9 THEN
                due_date := MAKE_DATE(EXTRACT(YEAR FROM collection_date)::INT, 10, 31);
            ELSE
                due_date := MAKE_DATE(EXTRACT(YEAR FROM collection_date)::INT + 1, 1, 31);
        END CASE;
    
    -- UK: Quarterly
    ELSIF jurisdiction = 'GB' THEN
        CASE 
            WHEN EXTRACT(MONTH FROM collection_date) <= 3 THEN
                due_date := MAKE_DATE(EXTRACT(YEAR FROM collection_date)::INT, 5, 7);
            WHEN EXTRACT(MONTH FROM collection_date) <= 6 THEN
                due_date := MAKE_DATE(EXTRACT(YEAR FROM collection_date)::INT, 8, 7);
            WHEN EXTRACT(MONTH FROM collection_date) <= 9 THEN
                due_date := MAKE_DATE(EXTRACT(YEAR FROM collection_date)::INT, 11, 7);
            ELSE
                due_date := MAKE_DATE(EXTRACT(YEAR FROM collection_date)::INT + 1, 2, 7);
        END CASE;
    
    -- EU countries: Monthly (last day of following month)
    ELSE
        due_date := (DATE_TRUNC('month', collection_date) + INTERVAL '2 months' - INTERVAL '1 day')::DATE;
    END IF;
    
    RETURN due_date;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate due date
CREATE OR REPLACE FUNCTION set_tax_due_date()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.due_date IS NULL THEN
        NEW.due_date := calculate_tax_due_date(NEW.tax_jurisdiction, NEW.collection_date);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tax_liabilities_set_due_date
    BEFORE INSERT OR UPDATE OF tax_jurisdiction, collection_date
    ON tax_liabilities
    FOR EACH ROW
    EXECUTE FUNCTION set_tax_due_date();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tax_liabilities_updated_at
    BEFORE UPDATE ON tax_liabilities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_tax_remittance_batches_updated_at
    BEFORE UPDATE ON tax_remittance_batches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_tax_filings_updated_at
    BEFORE UPDATE ON tax_filings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();