CREATE TABLE profile_media (
  profile_id TEXT PRIMARY KEY REFERENCES profiles(id),
  id TEXT NOT NULL UNIQUE,
  mime TEXT NOT NULL CHECK (mime IN ('image/png','video/mp4')),
  bytes INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  rights_acknowledged INTEGER NOT NULL CHECK (rights_acknowledged=1)
);
PRAGMA user_version = 2;
