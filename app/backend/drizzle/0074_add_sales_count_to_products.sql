-- Migration: Add sales_count column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS sales_count INTEGER DEFAULT 0;