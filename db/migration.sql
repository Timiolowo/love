CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  credits INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS wraps (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  share_id TEXT NOT NULL UNIQUE,
  chat_name TEXT NOT NULL,
  total_messages INTEGER NOT NULL DEFAULT 0,
  insights_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  reference TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  plan_type TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS anon_chats (
  id TEXT PRIMARY KEY,
  sender_token TEXT NOT NULL UNIQUE,
  recipient_token TEXT NOT NULL UNIQUE,
  intent TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reveal_requested_by_sender INTEGER NOT NULL DEFAULT 0,
  reveal_requested_by_recipient INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS anon_messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  sender_role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
