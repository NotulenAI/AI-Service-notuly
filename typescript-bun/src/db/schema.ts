import { pgTable, varchar, text, timestamp, jsonb, uuid, vector } from "drizzle-orm/pg-core";

export const roles = pgTable("roles", {
  id: uuid().primaryKey().defaultRandom(),
  name: varchar().notNull(),
  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow().notNull(),
  deleted_at: timestamp(),
  created_by: uuid(),
  updated_by: uuid(),
  deleted_by: uuid(),
});

export const users = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),
  username: varchar().notNull(),
  password: varchar().notNull(),
  role_id: uuid().references(() => roles.id),
  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow().notNull(),
  deleted_at: timestamp(),
  created_by: uuid(),
  updated_by: uuid(),
  deleted_by: uuid(),
});

export const meetings = pgTable("meetings", {
  id: uuid().primaryKey().defaultRandom(),
  name: varchar().notNull(),
  agenda: text(),
  note: text(),
  location: text(),
  summary: text(),
  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow().notNull(),
  deleted_at: timestamp(),
  created_by: uuid().references(() => users.id),
  updated_by: uuid().references(() => users.id),
  deleted_by: uuid().references(() => users.id),
});

export const meeting_parts = pgTable("meeting_parts", {
  id: uuid().primaryKey().defaultRandom(),
  start_time: timestamp().notNull(),
  end_time: timestamp(),
  keywords: jsonb(),
  action_items: jsonb(),
  participants: jsonb().notNull(),
  meeting_id: uuid().notNull().references(() => meetings.id),
  file_url: text().notNull(),
  transcript: jsonb(),
  embedding: vector('embedding', { dimensions: 1024 }),
  status: varchar().default("uploaded"),
  created_at: timestamp().defaultNow().notNull(),
  created_by: uuid().references(() => users.id),
});

export const chat_sessions = pgTable("chat_sessions", {
  id: uuid().primaryKey().defaultRandom(),
  user_id: uuid().references(() => users.id),
  meeting_id: uuid().references(() => meetings.id),
  title: varchar(),
  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow().notNull(),
  deleted_at: timestamp(),
  created_by: uuid().references(() => users.id),
  updated_by: uuid().references(() => users.id),
  deleted_by: uuid().references(() => users.id),
});

export const chat_messages = pgTable("chat_messages", {
  id: uuid().primaryKey().defaultRandom(),
  chat_session_id: uuid().notNull().references(() => chat_sessions.id),
  body: text(),
  role: varchar().notNull(),
  feedback: varchar().default("processing").notNull(),
  context: jsonb(),
  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow().notNull(),
  created_by: uuid().references(() => users.id),
  updated_by: uuid().references(() => users.id),
});