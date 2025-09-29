-- SQL script to add the cost column to the orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cost DECIMAL(10, 2);
