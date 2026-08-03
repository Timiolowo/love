import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  credits: integer("credits").default(0).notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const wraps = sqliteTable("wraps", {
  id: text("id").primaryKey(),
  shareId: text("share_id").notNull().unique(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  personName: text("person_name").notNull(),
  viewerName: text("viewer_name").notNull(),
  connection: text("connection").notNull(),
  result: text("result").notNull(), // JSON string of InsightsResult
  isDisabled: integer("is_disabled").default(0).notNull(), // 1 if disabled by owner
  expiresAt: integer("expires_at").notNull(), // created_at + 14 days
  createdAt: integer("created_at").notNull(),
});

export const payments = sqliteTable("payments", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  guestEmail: text("guest_email"),
  reference: text("reference").notNull().unique(),
  planType: text("plan_type").notNull(), // "guest_single" | "account_bundle" | "anon_chat"
  amount: integer("amount").notNull(), // in minor units (kobo/cents)
  status: text("status").notNull(), // "pending" | "success" | "failed"
  createdAt: integer("created_at").notNull(),
});

export const anonChats = sqliteTable("anon_chats", {
  id: text("id").primaryKey(),
  senderId: text("sender_id").references(() => users.id, { onDelete: "set null" }),
  recipientPhone: text("recipient_phone"),
  intent: text("intent").notNull(), // "Confess" | "Apologise" | "Say thank you" | "Clear the air"
  initialMessage: text("initial_message").notNull(),
  status: text("status").default("pending").notNull(), // "pending" | "accepted" | "declined"
  senderRevealed: integer("sender_revealed").default(0).notNull(),
  recipientRevealed: integer("recipient_revealed").default(0).notNull(),
  senderToken: text("sender_token").notNull(),
  recipientToken: text("recipient_token").notNull(),
  createdAt: integer("created_at").notNull(),
  expiresAt: integer("expires_at").notNull(),
});

export const anonMessages = sqliteTable("anon_messages", {
  id: text("id").primaryKey(),
  chatId: text("chat_id").references(() => anonChats.id, { onDelete: "cascade" }).notNull(),
  senderRole: text("sender_role").notNull(), // "sender" | "recipient"
  text: text("text").notNull(),
  createdAt: integer("created_at").notNull(),
});

export type User = typeof users.$inferSelect;
export type Wrap = typeof wraps.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type AnonChat = typeof anonChats.$inferSelect;
export type AnonMessage = typeof anonMessages.$inferSelect;
