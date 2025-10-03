-- Add isActive column to users table for enabling/disabling users
ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;

-- Update existing users to be active by default
UPDATE users SET is_active = true WHERE is_active IS NULL;

-- Make the column not null after setting default values
ALTER TABLE users ALTER COLUMN is_active SET NOT NULL;