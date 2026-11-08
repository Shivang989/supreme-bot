-- Group force join rules
CREATE TABLE IF NOT EXISTS force_sub (
  group_id INTEGER PRIMARY KEY,
  button_name TEXT NOT NULL,
  link TEXT NOT NULL,
  target_chat TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Authorized moderators approved per group
CREATE TABLE IF NOT EXISTS force_sub_authorized (
  group_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (group_id, user_id)
);

-- Recorded join requests for private channels/groups
CREATE TABLE IF NOT EXISTS force_sub_requests (
  user_id INTEGER NOT NULL,
  target_chat TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, target_chat)
);
