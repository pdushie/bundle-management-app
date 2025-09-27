import { pgTable, varchar, decimal, integer, boolean, timestamp, serial, bigint, date, text } from 'drizzle-orm/pg-core';
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
  requestMessage: text("request_message"), // User's reason for requesting access
  approvedBy: text("approved_by"), // Changed to text to match actual database
  approvedAt: timestamp("approved_at", { withTimezone: true }), // Added timezone
  rejectedBy: varchar("rejected_by"), 
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"), // Admin's reason for rejection
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
  createdAt: timestamp('created_at').defaultNow(),
});

// Define order entries table
export const orderEntries = pgTable("order_entries", {
  id: serial('id').primaryKey(),
  orderId: varchar('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  number: varchar('number', { length: 15 }).notNull(),
  allocationGB: decimal('allocation_gb', { precision: 10, scale: 2, mode: 'string' }).notNull(),
  status: varchar('status', { length: 20 }), // 'pending', 'sent', or 'error'
  createdAt: timestamp('created_at').defaultNow(),
});

// Define relations for orders
export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
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
