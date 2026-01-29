-- Migration: Add refund_status and refund_details to order_cancellations table
-- Date: 2026-01-29
-- Description: This migration adds missing refund tracking fields to support automatic refund processing

-- Check if columns exist before adding them
DO $$
BEGIN
    -- Add refund_status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'order_cancellations' 
        AND column_name = 'refund_status'
    ) THEN
        ALTER TABLE order_cancellations 
        ADD COLUMN refund_status VARCHAR(32) DEFAULT 'pending';
        
        RAISE NOTICE 'Added refund_status column to order_cancellations';
    END IF;

    -- Add refund_details column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'order_cancellations' 
        AND column_name = 'refund_details'
    ) THEN
        ALTER TABLE order_cancellations 
        ADD COLUMN refund_details JSONB DEFAULT '{}';
        
        RAISE NOTICE 'Added refund_details column to order_cancellations';
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_order_cancellations_refund_status 
ON order_cancellations(refund_status) 
WHERE refund_status IS NOT NULL;

COMMENT ON COLUMN order_cancellations.refund_status IS 'Refund processing status: pending, processing, completed, failed';
COMMENT ON COLUMN order_cancellations.refund_details IS 'JSON object containing refund transaction details, timestamps, and metadata';