-- Add cost field to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cost DECIMAL(10, 2);
