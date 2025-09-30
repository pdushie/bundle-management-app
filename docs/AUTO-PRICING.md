# Automatic Tier-Based Pricing

This document explains the implementation of automatic tier-based pricing in the bundle management app.

## Overview

The app now automatically applies tier-based pricing calculations whenever a user sends an order. This ensures that all orders and order entries have accurate costs based on the user's pricing profile and the appropriate pricing tiers.

## Implementation Details

### Core Components:

1. **Cost Calculation Middleware (`costCalculationMiddleware.ts`)**
   - Provides an `ensureOrderCosts` function that calculates costs for orders
   - Automatically applies the correct tier pricing to each entry
   - Updates both individual entry costs and the total order cost

2. **Updated Order Endpoints**
   - `/api/orders/add`: Uses the middleware to calculate costs when orders are created
   - `/api/orders/update`: Uses the middleware to recalculate costs when orders are updated

3. **Migration Tool**
   - `update-all-order-costs.js`: Updates all existing orders with correct tier-based pricing

## How Pricing Works

1. When a user submits an order, the system:
   - Gets the user's pricing profile
   - Retrieves the applicable pricing tiers for that profile
   - Calculates the cost for each entry based on its allocation size
   - Updates the total order cost as the sum of all entry costs
   - Applies minimum charge if necessary

2. For each entry, pricing is determined by:
   - Finding the exact tier matching the allocation size
   - If no exact match, using the next higher tier
   - If no higher tier exists, using the highest available tier
   - Applying tier-based pricing regardless of the profile settings

## Running the Migration

To update all existing orders with correct tier-based pricing:

```bash
# On Windows
node update-all-order-costs.js

# On Linux/Mac
chmod +x update-all-order-costs.js
./update-all-order-costs.js
```

## Benefits

- Consistent pricing across all orders
- Accurate cost calculations for reporting
- Better user experience with transparent pricing
- Eliminated need for manual cost updates
