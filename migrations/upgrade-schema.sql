-- Bundle Management App Schema Upgrade
-- This script adds any missing columns or indices to the existing schema

-- Add missing columns to tables if they don't exist
DO $$
BEGIN
    -- Add processed_by column to orders if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'processed_by'
    ) THEN
        ALTER TABLE "orders" ADD COLUMN "processed_by" varchar REFERENCES "users" ("id") ON DELETE SET NULL;
    END IF;
    
    -- Add processed_at column to orders if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'processed_at'
    ) THEN
        ALTER TABLE "orders" ADD COLUMN "processed_at" timestamp;
    END IF;
    
    -- Add comment column to order_entries if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'order_entries' AND column_name = 'comment'
    ) THEN
        ALTER TABLE "order_entries" ADD COLUMN "comment" text;
    END IF;
    
    -- Add user_id column to history_entries if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'history_entries' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE "history_entries" ADD COLUMN "user_id" integer REFERENCES "users" ("id") ON DELETE CASCADE;
    END IF;
END $$;

-- Create missing indices if they don't exist
DO $$
BEGIN
    -- Create index on orders.status if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_orders_status'
    ) THEN
        CREATE INDEX idx_orders_status ON orders(status);
    END IF;
    
    -- Create index on orders.user_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_orders_user_id'
    ) THEN
        CREATE INDEX idx_orders_user_id ON orders(user_id);
    END IF;
    
    -- Create index on order_entries.order_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_order_entries_order_id'
    ) THEN
        CREATE INDEX idx_order_entries_order_id ON order_entries(order_id);
    END IF;
END $$;
