-- Add pricing profiles to the database schema

-- Create pricing_profiles table
CREATE TABLE IF NOT EXISTS pricing_profiles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_price DECIMAL(10, 2) NOT NULL,
    data_price_per_gb DECIMAL(10, 2) NOT NULL,
    minimum_charge DECIMAL(10, 2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create user_pricing_profiles table for user-profile associations
CREATE TABLE IF NOT EXISTS user_pricing_profiles (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    profile_id INTEGER NOT NULL REFERENCES pricing_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Create triggers for the new tables
CREATE TRIGGER update_pricing_profiles_modtime
BEFORE UPDATE ON pricing_profiles
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_user_pricing_profiles_modtime
BEFORE UPDATE ON user_pricing_profiles
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- Insert default pricing profile
INSERT INTO pricing_profiles (name, description, base_price, data_price_per_gb, minimum_charge) 
VALUES ('Standard', 'Default pricing profile for all users', 10.00, 5.00, 10.00)
ON CONFLICT DO NOTHING;

-- Add order_cost column to the orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cost DECIMAL(10, 2);
