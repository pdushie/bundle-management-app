# Flexible Pricing System

The application includes a flexible pricing system that supports both formula-based and tiered pricing models.

> **Important Note:** When using Neon Database with the HTTP driver, transactions are not supported. The API has been designed to work without transactions.

## Pricing Models

### Formula-Based Pricing
- Base price + (data amount in GB × price per GB)
- Minimum charge can be set as a floor price
- Example: If base price = GHS 10 and price per GB = GHS 5:
  - For 2GB: GHS 10 + (2 × GHS 5) = GHS 20
  - For 5GB: GHS 10 + (5 × GHS 5) = GHS 35

### Tiered Pricing
- Custom prices for different data allocations (1GB, 2GB, 5GB, etc.)
- More flexible than formula-based pricing
- Allows for non-linear pricing strategies
- Example tiers:
  - 1GB: GHS 15
  - 2GB: GHS 25
  - 5GB: GHS 50
  - 10GB: GHS 90
  - 20GB: GHS 160

## Database Schema Setup

### Setting Up Tiered Pricing

Before using tiered pricing, you need to run the schema migration:

```bash
# Using npm
npm run migrate:tiered-pricing
# Using yarn
yarn migrate:tiered-pricing
```

Alternatively, you can fix schema issues with:

```bash
node scripts/fix-schema.js
```

This comprehensive fix script will:
1. Create any missing tables (pricing_profiles, pricing_tiers, user_pricing_profiles)
2. Add any missing columns (is_tiered, updated_at, etc.)
3. Create compatibility views for ORM (pricingProfiles, pricingTiers, userPricingProfiles)
4. Add sample data if tables are empty

### Database Tables

The pricing system uses the following tables:

#### pricing_profiles

| Column        | Type          | Description                               |
|---------------|---------------|-------------------------------------------|
| id            | UUID          | Primary key                               |
| name          | VARCHAR(255)  | Name of the pricing profile               |
| description   | TEXT          | Description of the pricing profile        |
| base_price    | NUMERIC(10,2) | Base price for formula-based pricing      |
| price_per_gb  | NUMERIC(10,2) | Price per GB for formula-based pricing    |
| is_tiered     | BOOLEAN       | Whether this profile uses tiered pricing  |
| created_at    | TIMESTAMP     | Creation timestamp                        |
| updated_at    | TIMESTAMP     | Last update timestamp                     |

#### pricing_tiers

| Column        | Type          | Description                               |
|---------------|---------------|-------------------------------------------|
| id            | UUID          | Primary key                               |
| profile_id    | UUID          | Foreign key to pricing_profiles           |
| data_gb       | NUMERIC(10,2) | Data allocation in GB                     |
| price         | NUMERIC(10,2) | Price for this data allocation            |
| created_at    | TIMESTAMP     | Creation timestamp                        |
| updated_at    | TIMESTAMP     | Last update timestamp                     |

#### user_pricing_profiles

| Column        | Type          | Description                               |
|---------------|---------------|-------------------------------------------|
| id            | UUID          | Primary key                               |
| user_id       | UUID          | Foreign key to users                      |
| profile_id    | UUID          | Foreign key to pricing_profiles           |
| created_at    | TIMESTAMP     | Creation timestamp                        |
| updated_at    | TIMESTAMP     | Last update timestamp                     |

### Using the Pricing Admin Panel

1. Navigate to the Admin → Pricing Profiles section
2. Create a new profile or edit an existing one
3. Toggle "Pricing Type" to switch between formula-based and tiered pricing
4. For tiered pricing:
   - Add tiers manually by specifying data allocations and prices
   - Or import from Excel using the provided upload feature

### Excel Import Format

You can bulk import pricing tiers from Excel files. The expected format is:

| Data GB | Price (GHS) |
|---------|------------|
| 1       | 15.00      |
| 2       | 25.00      |
| 5       | 50.00      |
| 10      | 90.00      |

The first sheet in the Excel file will be used. Column names are flexible and will be auto-detected.

### How Pricing is Applied

When calculating an order's cost:

1. The system checks if the user has a pricing profile assigned
2. If using formula-based pricing, it calculates: basePrice + (dataGB × pricePerGB)
3. If using tiered pricing:
   - It finds the tier matching the order's data amount
   - If no exact match, it uses the next higher tier
   - If the data exceeds all tiers, it uses the highest tier
4. The minimum charge is applied as a floor if the calculated price is lower

### API Integration

The pricing system is fully integrated with the API. When creating or updating pricing profiles via API:

```json
{
  "name": "Premium Tiered",
  "description": "Premium tier-based pricing",
  "basePrice": 10.00,
  "minimumCharge": 10.00,
  "isActive": true,
  "isTiered": true,
  "tiers": [
    { "dataGB": 1, "price": 15.00 },
    { "dataGB": 5, "price": 50.00 },
    { "dataGB": 10, "price": 90.00 }
  ]
}
```

For formula-based pricing, use:

```json
{
  "name": "Standard",
  "description": "Standard formula-based pricing",
  "basePrice": 10.00,
  "dataPricePerGB": 5.00,
  "minimumCharge": 10.00,
  "isActive": true,
  "isTiered": false
}
```
