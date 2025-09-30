-- Add estimated_cost column to orders table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'estimated_cost'
    ) THEN
        ALTER TABLE orders ADD COLUMN estimated_cost DECIMAL(10,2);
        
        -- Initialize estimated_cost with the value from cost for existing orders
        UPDATE orders SET estimated_cost = cost WHERE cost IS NOT NULL;
    END IF;
END $$;
