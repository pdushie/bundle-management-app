-- Bundle Management App Database Schema Check
-- This script checks for any missing tables or columns that might be needed

-- Check if any tables are missing from the schema
DO $$
DECLARE
    missing_tables TEXT := '';
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'history_entries') THEN
        missing_tables := missing_tables || 'history_entries, ';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'phone_entries') THEN
        missing_tables := missing_tables || 'phone_entries, ';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'orders') THEN
        missing_tables := missing_tables || 'orders, ';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'order_entries') THEN
        missing_tables := missing_tables || 'order_entries, ';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'users') THEN
        missing_tables := missing_tables || 'users, ';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'sessions') THEN
        missing_tables := missing_tables || 'sessions, ';
    END IF;
    
    IF LENGTH(missing_tables) > 0 THEN
        RAISE NOTICE 'Missing tables: %', LEFT(missing_tables, LENGTH(missing_tables) - 2);
    ELSE
        RAISE NOTICE 'All required tables exist.';
    END IF;
END $$;

-- Check for missing columns in existing tables
DO $$
DECLARE
    column_exists BOOLEAN;
    missing_columns TEXT := '';
BEGIN
    -- Check orders table columns
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'processed_by'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        missing_columns := missing_columns || 'orders.processed_by, ';
    END IF;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'processed_at'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        missing_columns := missing_columns || 'orders.processed_at, ';
    END IF;
    
    -- Check order_entries table columns
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'order_entries' AND column_name = 'comment'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        missing_columns := missing_columns || 'order_entries.comment, ';
    END IF;
    
    -- Check users table columns
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'email_verified'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        missing_columns := missing_columns || 'users.email_verified, ';
    END IF;
    
    -- Check history_entries table columns
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'history_entries' AND column_name = 'user_id'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        missing_columns := missing_columns || 'history_entries.user_id, ';
    END IF;
    
    IF LENGTH(missing_columns) > 0 THEN
        RAISE NOTICE 'Missing columns: %', LEFT(missing_columns, LENGTH(missing_columns) - 2);
    ELSE
        RAISE NOTICE 'All required columns exist.';
    END IF;
END $$;

-- Check for missing indices
DO $$
DECLARE
    index_exists BOOLEAN;
    missing_indices TEXT := '';
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_orders_status'
    ) INTO index_exists;
    
    IF NOT index_exists THEN
        missing_indices := missing_indices || 'idx_orders_status, ';
    END IF;
    
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_orders_user_id'
    ) INTO index_exists;
    
    IF NOT index_exists THEN
        missing_indices := missing_indices || 'idx_orders_user_id, ';
    END IF;
    
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_order_entries_order_id'
    ) INTO index_exists;
    
    IF NOT index_exists THEN
        missing_indices := missing_indices || 'idx_order_entries_order_id, ';
    END IF;
    
    IF LENGTH(missing_indices) > 0 THEN
        RAISE NOTICE 'Missing indices: %', LEFT(missing_indices, LENGTH(missing_indices) - 2);
    ELSE
        RAISE NOTICE 'All required indices exist.';
    END IF;
END $$;
