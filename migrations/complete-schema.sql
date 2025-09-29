-- Complete schema file for pricing profiles and tiers
-- Note: All monetary values are in GHS (Ghanaian Cedi)

-- Create pricing_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS pricing_profiles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  base_price DECIMAL(10, 2) NOT NULL, -- in GHS (Ghanaian Cedi)
  data_price_per_gb DECIMAL(10, 2), -- in GHS per GB
  minimum_charge DECIMAL(10, 2) NOT NULL DEFAULT 0, -- in GHS
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_tiered BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create pricing_tiers table if it doesn't exist
CREATE TABLE IF NOT EXISTS pricing_tiers (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES pricing_profiles(id) ON DELETE CASCADE,
  data_gb DECIMAL(10, 2) NOT NULL, -- Data allocation in GB
  price DECIMAL(10, 2) NOT NULL, -- Price in GHS (Ghanaian Cedi)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create user_pricing_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_pricing_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  profile_id INTEGER NOT NULL REFERENCES pricing_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pricing_tiers_profile_id ON pricing_tiers(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_pricing_profiles_user_id ON user_pricing_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_pricing_profiles_profile_id ON user_pricing_profiles(profile_id);
