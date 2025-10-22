-- Add last_login_at column to users table for tracking when users last logged in
ALTER TABLE users 
ADD COLUMN last_login_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster queries on last_login_at
CREATE INDEX IF NOT EXISTS idx_users_last_login_at ON users(last_login_at);

-- Add comment to document the column purpose
COMMENT ON COLUMN users.last_login_at IS 'Timestamp of when the user last successfully logged in';