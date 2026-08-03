DROP TABLE IF EXISTS anon_messages;
DROP TABLE IF EXISTS anon_chats;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS wraps;
DROP TABLE IF EXISTS users;

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
  amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE anon_chats (
  id TEXT PRIMARY KEY,
  sender_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  recipient_phone TEXT,
  sender_phone TEXT,
  recipient_name TEXT,
  intent TEXT NOT NULL,
  initial_message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  sender_revealed INTEGER NOT NULL DEFAULT 0,
  recipient_revealed INTEGER NOT NULL DEFAULT 0,
  sender_token TEXT NOT NULL UNIQUE,
  recipient_token TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE anon_messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL REFERENCES anon_chats(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
