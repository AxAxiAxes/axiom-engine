CREATE TABLE agent_sources (
  profile_id TEXT PRIMARY KEY REFERENCES profiles(id),
  source_json TEXT NOT NULL
);
PRAGMA user_version = 4;
