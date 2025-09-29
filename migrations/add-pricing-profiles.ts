import { pgTable, serial, varchar, decimal, text, timestamp, integer, unique } from 'drizzle-orm/pg-core';
import { users, orders } from '../src/lib/schema';

// Create pricing_profiles table
export const pricing_profiles = pgTable('pricing_profiles', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  base_cost_per_gb: decimal('base_cost_per_gb', { precision: 10, scale: 2 }).notNull(),
  discount_percent: decimal('discount_percent', { precision: 5, scale: 2 }).notNull().default('0'),
  min_cost_per_order: decimal('min_cost_per_order', { precision: 10, scale: 2 }).notNull().default('0'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow()
});

// Create user_pricing_profiles table for assignments
export const user_pricing_profiles = pgTable('user_pricing_profiles', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  pricing_profile_id: integer('pricing_profile_id').notNull().references(() => pricing_profiles.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
}, (table) => {
  return {
    user_profile_unique: unique('user_profile_unique').on(table.user_id, table.pricing_profile_id),
  };
});

// Add order_cost column to orders table
export const ordersWithCost = {
  ...orders,
  order_cost: decimal('order_cost', { precision: 10, scale: 2 })
};

// Insert default pricing profiles
const defaultProfiles = [
  {
    name: 'Standard',
    description: 'Regular pricing for most users',
    base_cost_per_gb: 5.00,
    discount_percent: 0.00,
    min_cost_per_order: 10.00
  },
  {
    name: 'Premium',
    description: 'Enhanced pricing with 5% discount',
    base_cost_per_gb: 5.00,
    discount_percent: 5.00,
    min_cost_per_order: 10.00
  },
  {
    name: 'Enterprise',
    description: 'Enterprise pricing with 10% discount',
    base_cost_per_gb: 5.00,
    discount_percent: 10.00,
    min_cost_per_order: 25.00
  },
  {
    name: 'Wholesale',
    description: 'Wholesale pricing with 15% discount',
    base_cost_per_gb: 5.00,
    discount_percent: 15.00,
    min_cost_per_order: 50.00
  }
];

export { defaultProfiles };
