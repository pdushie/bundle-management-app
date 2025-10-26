-- Remove the users_role_check constraint to allow RBAC role names
-- This migration removes the old check constraint that limited role values to hardcoded options

-- Drop the existing check constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_role_check' 
        AND table_name = 'users'
    ) THEN
        ALTER TABLE users DROP CONSTRAINT users_role_check;
        RAISE NOTICE 'Dropped users_role_check constraint';
    ELSE
        RAISE NOTICE 'users_role_check constraint does not exist';
    END IF;
END $$;