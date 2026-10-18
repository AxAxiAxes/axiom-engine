CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  purpose TEXT NOT NULL,
  instructions TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  template INTEGER NOT NULL DEFAULT 0 CHECK (template IN (0, 1))
);
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE runs (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending','running','completed','failed','cancelled','interrupted')),
  model TEXT NOT NULL,
  digest TEXT NOT NULL,
  instructions TEXT NOT NULL,
  error_code TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE messages (
  id INTEGER PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL
);
CREATE INDEX messages_conversation ON messages(conversation_id, id);
CREATE INDEX runs_conversation ON runs(conversation_id, created_at);
CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
PRAGMA user_version = 1;
