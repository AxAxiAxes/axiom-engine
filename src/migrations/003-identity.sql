ALTER TABLE profiles ADD COLUMN passport_candidate TEXT
  CHECK (passport_candidate IS NULL OR passport_candidate IN ('XEXAR','XEXAUR','XEXPUR','XEXIAN','XEXAX','XEXXI','XEXAULA'));
PRAGMA user_version = 3;
