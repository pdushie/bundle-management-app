-- Add processed_by fields to orders table for tracking which admin processed each order
ALTER TABLE orders 
ADD COLUMN processed_by INTEGER REFERENCES users(id),
ADD COLUMN processed_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for faster queries on processed orders
CREATE INDEX IF NOT EXISTS idx_orders_processed_by ON orders(processed_by);
CREATE INDEX IF NOT EXISTS idx_orders_processed_at ON orders(processed_at);
CREATE INDEX IF NOT EXISTS idx_orders_status_processed_by ON orders(status, processed_by);

-- Add comments to document the column purposes
COMMENT ON COLUMN orders.processed_by IS 'ID of the admin user who processed this order';
COMMENT ON COLUMN orders.processed_at IS 'Timestamp when the order was processed by an admin';