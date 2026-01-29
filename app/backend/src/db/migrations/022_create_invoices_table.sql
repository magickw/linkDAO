-- Migration: 022 - Create invoices table for tax and seller invoices
-- Description: Adds comprehensive invoice management for tax invoices and seller commission statements

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(100) UNIQUE NOT NULL,
  invoice_type VARCHAR(20) NOT NULL, -- 'tax', 'seller', 'purchase_order'

  -- References
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  buyer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  seller_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Dates
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,

  -- Financial details
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  subtotal DECIMAL(20, 8) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(20, 8) DEFAULT 0,
  total_amount DECIMAL(20, 8) NOT NULL DEFAULT 0,

  -- Tax information
  buyer_tax_id VARCHAR(100),
  seller_tax_id VARCHAR(100),
  tax_rate DECIMAL(5, 2),
  tax_jurisdiction VARCHAR(100),

  -- Items and metadata
  items JSONB NOT NULL DEFAULT '[]',
  metadata JSONB,

  -- PDF storage
  pdf_url TEXT,
  pdf_s3_key TEXT,

  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, issued, paid, archived

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  issued_at TIMESTAMP,
  paid_at TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_buyer_id ON invoices(buyer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_seller_id ON invoices(seller_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_type ON invoices(invoice_type);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_seller_id_created_at ON invoices(seller_id, created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_buyer_id_created_at ON invoices(buyer_id, created_at);

-- Add audit trigger to track updates
CREATE OR REPLACE FUNCTION update_invoices_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS invoices_timestamp_trigger ON invoices;
CREATE TRIGGER invoices_timestamp_trigger
BEFORE UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION update_invoices_timestamp();

-- Add status update trigger to track when invoice is issued
CREATE OR REPLACE FUNCTION update_invoices_issued_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'issued' AND OLD.status != 'issued' THEN
    NEW.issued_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS invoices_issued_at_trigger ON invoices;
CREATE TRIGGER invoices_issued_at_trigger
BEFORE UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION update_invoices_issued_at();

-- Add status update trigger to track when invoice is paid
CREATE OR REPLACE FUNCTION update_invoices_paid_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    NEW.paid_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS invoices_paid_at_trigger ON invoices;
CREATE TRIGGER invoices_paid_at_trigger
BEFORE UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION update_invoices_paid_at();
