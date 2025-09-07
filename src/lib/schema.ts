import { pgTable, varchar, decimal, integer, boolean, timestamp, serial, bigint, date, text } from 'drizzle-orm/pg-core';

// Move users table to the TOP
export const users = pgTable("users", {
  id: varchar("id").notNull().primaryKey(),
  name: varchar("name").notNull(),
  email: varchar("email").notNull().unique(),
  hashedPassword: varchar("hashed_password").notNull(),
  role: varchar("role").notNull().default("user"), // 'admin' or 'user'
  status: varchar("status").notNull().default("pending"), // 'pending', 'approved', 'rejected'
  requestMessage: text("request_message"), // User's reason for requesting access
  approvedBy: varchar("approved_by").references(() => users.id), // Self-reference is OK
  approvedAt: timestamp("approved_at"),
  rejectedBy: varchar("rejected_by").references(() => users.id), // Self-reference is OK
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"), // Admin's reason for rejection
  createdAt: timestamp("created_at").defaultNow(),
});

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
  userId: varchar('user_id').references(() => users.id, { onDelete: 'cascade' }), // Now users is defined
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

export const sessions = pgTable("sessions", {
  sessionToken: varchar("session_token").notNull().primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});
