-- Add OTP fields to users table for login verification
ALTER TABLE users 
ADD COLUMN otp_secret varchar(6),
ADD COLUMN otp_expires timestamp,
ADD COLUMN otp_attempts integer DEFAULT 0,
ADD COLUMN otp_locked_until timestamp;

-- Create index for faster OTP lookups
CREATE INDEX IF NOT EXISTS idx_users_otp_expires ON users(otp_expires);
CREATE INDEX IF NOT EXISTS idx_users_otp_locked ON users(otp_locked_until);