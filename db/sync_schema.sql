DROP TABLE IF EXISTS wraps;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS anon_chats;
DROP TABLE IF EXISTS anon_messages;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  credits INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE wraps (
  id TEXT PRIMARY KEY,
  share_id TEXT NOT NULL UNIQUE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  person_name TEXT NOT NULL,
  viewer_name TEXT NOT NULL,
  connection TEXT NOT NULL,
  result TEXT NOT NULL,
  is_disabled INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  guest_email TEXT,
  reference TEXT NOT NULL UNIQUE,
  plan_type TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE anon_chats (
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

CREATE TABLE anon_messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  sender_role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
