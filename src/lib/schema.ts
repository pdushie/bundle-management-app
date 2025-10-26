import { pgTable, varchar, decimal, integer, boolean, timestamp, serial, bigint, date, text, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Move users table to the TOP - Remove self-references
export const users = pgTable("users", {
  // Update id to integer to match actual database structure
  id: serial("id").notNull().primaryKey(), // Changed from varchar to serial (integer)
  name: varchar("name").notNull(),
  email: varchar("email").notNull().unique(),
  hashedPassword: text("hashed_password").notNull(), // Changed to text to match actual database
  role: varchar("role").default("user"), // 'admin' or 'user'
  status: varchar("status").default("pending"), // 'pending', 'approved', 'rejected'
  isActive: boolean("is_active").default(true).notNull(), // Whether user account is enabled/disabled
  requestMessage: text("request_message"), // User's reason for requesting access
  emailVerified: boolean("email_verified").default(false).notNull(), // Whether email is verified
  verificationToken: varchar("verification_token"), // Email verification token
  verificationTokenExpires: timestamp("verification_token_expires"), // When verification token expires
  approvedBy: text("approved_by"), // Changed to text to match actual database
  approvedAt: timestamp("approved_at", { withTimezone: true }), // Added timezone
  rejectedBy: varchar("rejected_by"), 
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"), // Admin's reason for rejection
  minimumOrderEntries: integer("minimum_order_entries").default(1).notNull(), // Minimum number of entries required in an order
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }), // When user last logged in
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(), // Added missing field
});

// Define orders table
export const orders = pgTable("orders", {
  id: varchar("id").notNull().primaryKey(),
  timestamp: bigint('timestamp', { mode: 'number' }).notNull(),
  date: varchar('date', { length: 10 }).notNull(),
  time: varchar('time', { length: 10 }).notNull(),
  userName: varchar('user_name', { length: 100 }).notNull(),
  userEmail: varchar('user_email', { length: 100 }).notNull(),
  totalData: decimal('total_data', { precision: 10, scale: 2, mode: 'string' }).notNull(),
  totalCount: integer('total_count').notNull(),
  status: varchar('status', { length: 20 }).notNull(), // 'pending' or 'processed'
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }), // Changed to integer to match users.id
  cost: decimal('cost', { precision: 10, scale: 2, mode: 'string' }), // Total order cost
  estimatedCost: decimal('estimated_cost', { precision: 10, scale: 2, mode: 'string' }), // Estimated cost for display
  pricingProfileId: integer('pricing_profile_id'), // ID of the pricing profile used
  pricingProfileName: varchar('pricing_profile_name', { length: 255 }), // Name of the pricing profile used
  processedBy: integer('processed_by').references(() => users.id, { onDelete: 'set null' }), // Admin who processed the order
  processedAt: timestamp('processed_at'), // When the order was processed
  createdAt: timestamp('created_at').defaultNow(),
});

// Define order entries table
export const orderEntries = pgTable("order_entries", {
  id: serial('id').primaryKey(),
  orderId: varchar('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  number: varchar('number', { length: 15 }).notNull(),
  allocationGB: decimal('allocation_gb', { precision: 10, scale: 2, mode: 'string' }).notNull(),
  status: varchar('status', { length: 20 }), // 'pending', 'sent', or 'error'
  cost: decimal('cost', { precision: 10, scale: 2, mode: 'string' }), // Individual entry cost
  createdAt: timestamp('created_at').defaultNow(),
});

// Define relations for orders
export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  processedByUser: one(users, {
    fields: [orders.processedBy],
    references: [users.id],
  }),
  entries: many(orderEntries),
}));

// Define relations for order entries
export const orderEntriesRelations = relations(orderEntries, ({ one }) => ({
  order: one(orders, {
    fields: [orderEntries.orderId],
    references: [orders.id],
  }),
}));

// Now define tables that reference users
export const historyEntries = pgTable('history_entries', {
  id: varchar('id').primaryKey(),
  date: date('date').notNull(),
  timestamp: bigint('timestamp', { mode: 'number' }).notNull(),
  totalGB: decimal('total_gb', { precision: 10, scale: 2, mode: 'string' }),
  validCount: integer('valid_count').notNull(),
  invalidCount: integer('invalid_count').notNull(),
  duplicateCount: integer('duplicate_count').notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  // The userId field is now using integer to match the actual database column type
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const phoneEntries = pgTable('phone_entries', {
  id: serial('id').primaryKey(),
  historyEntryId: varchar('history_entry_id').references(() => historyEntries.id, { onDelete: 'cascade' }),
  number: varchar('number', { length: 15 }).notNull(),
  allocationGB: decimal('allocation_gb', { precision: 10, scale: 2, mode: 'string' }),
  isValid: boolean('is_valid').notNull(),
  isDuplicate: boolean('is_duplicate').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define relations for history entries
export const historyEntriesRelations = relations(historyEntries, ({ one, many }) => ({
  user: one(users, {
    fields: [historyEntries.userId],
    references: [users.id],
  }),
  phoneEntries: many(phoneEntries),
}));

// Define relations for phone entries
export const phoneEntriesRelations = relations(phoneEntries, ({ one }) => ({
  historyEntry: one(historyEntries, {
    fields: [phoneEntries.historyEntryId],
    references: [historyEntries.id],
  }),
}));

export const sessions = pgTable("sessions", {
  id: varchar("id").notNull().primaryKey(),
  sessionToken: varchar("session_token").notNull().unique(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

// Define relations for sessions
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

// Pricing profiles schema
export const pricingProfiles = pgTable("pricing_profiles", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  basePrice: decimal("base_price", { precision: 10, scale: 2, mode: 'string' }).notNull(),
  dataPricePerGB: decimal("data_price_per_gb", { precision: 10, scale: 2, mode: 'string' }), // Make this optional for tiered pricing
  minimumCharge: decimal("minimum_charge", { precision: 10, scale: 2, mode: 'string' }).notNull().default("0"),
  isActive: boolean("is_active").notNull().default(true),
  isTiered: boolean("is_tiered").notNull().default(false), // New field to indicate tiered pricing
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// New table for tiered pricing entries
export const pricingTiers = pgTable("pricing_tiers", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull().references(() => pricingProfiles.id, { onDelete: "cascade" }),
  dataGB: decimal("data_gb", { precision: 10, scale: 2, mode: 'string' }).notNull(), // Data allocation in GB
  price: decimal("price", { precision: 10, scale: 2, mode: 'string' }).notNull(), // Price for this tier
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User pricing profile associations
export const userPricingProfiles = pgTable("user_pricing_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  profileId: integer("profile_id").notNull().references(() => pricingProfiles.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Add cost field to orders
export const ordersWithCost = {
  ...orders,
  cost: decimal("cost", { precision: 10, scale: 2, mode: 'string' }),
};

// Define relations for pricing profiles
export const pricingProfilesRelations = relations(pricingProfiles, ({ many }) => ({
  userAssociations: many(userPricingProfiles),
}));

// Define relations for user pricing profiles
export const userPricingProfilesRelations = relations(userPricingProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userPricingProfiles.userId],
    references: [users.id],
  }),
  profile: one(pricingProfiles, {
    fields: [userPricingProfiles.profileId],
    references: [pricingProfiles.id],
  }),
}));

// Announcements schema
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  type: varchar("type", { length: 50 }).notNull().default("info"), // info, warning, error, success
  isActive: boolean("is_active").notNull().default(true),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Define relations for announcements
export const announcementsRelations = relations(announcements, ({ one }) => ({
  creator: one(users, {
    fields: [announcements.createdBy],
    references: [users.id],
  }),
}));

// RBAC Tables
export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  isSystemRole: boolean('is_system_role').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const permissions = pgTable('permissions', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  displayName: varchar('display_name', { length: 150 }).notNull(),
  description: text('description'),
  resource: varchar('resource', { length: 50 }).notNull(),
  action: varchar('action', { length: 50 }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const rolePermissions = pgTable('role_permissions', {
  id: serial('id').primaryKey(),
  roleId: integer('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: integer('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
  grantedAt: timestamp('granted_at').defaultNow(),
  grantedBy: integer('granted_by').references(() => users.id),
}, (table) => {
  return {
    unique: unique().on(table.roleId, table.permissionId),
  };
});

export const userRoles = pgTable('user_roles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: integer('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  assignedAt: timestamp('assigned_at').defaultNow(),
  assignedBy: integer('assigned_by').references(() => users.id),
  expiresAt: timestamp('expires_at'),
  isActive: boolean('is_active').default(true).notNull(),
}, (table) => {
  return {
    unique: unique().on(table.userId, table.roleId),
  };
});

// RBAC Relations
export const rolesRelations = relations(roles, ({ many }) => ({
  rolePermissions: many(rolePermissions),
  userRoles: many(userRoles),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
  grantedByUser: one(users, {
    fields: [rolePermissions.grantedBy],
    references: [users.id],
  }),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
  assignedByUser: one(users, {
    fields: [userRoles.assignedBy],
    references: [users.id],
  }),
}));

// Add relation to users for pricing profiles and announcements
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  orders: many(orders),
  historyEntries: many(historyEntries),
  pricingProfile: many(userPricingProfiles),
  announcements: many(announcements),
  userRoles: many(userRoles),
  assignedRoles: many(userRoles, { relationName: 'assignedBy' }),
  grantedPermissions: many(rolePermissions, { relationName: 'grantedBy' }),
}));
