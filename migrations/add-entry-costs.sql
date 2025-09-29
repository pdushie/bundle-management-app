-- Add cost field to order entries table
ALTER TABLE order_entries ADD COLUMN IF NOT EXISTS cost DECIMAL(10, 2);

-- Update order type to include pricing profile information
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pricing_profile_id INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pricing_profile_name VARCHAR(255);
