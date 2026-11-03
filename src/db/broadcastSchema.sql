-- Eligible Destinations Registry
CREATE TABLE IF NOT EXISTS broadcast_chat_registry (
  chat_id INTEGER PRIMARY KEY,
  chat_type TEXT NOT NULL, -- 'private', 'group', 'supergroup', 'channel'
  title TEXT,
  can_send INTEGER DEFAULT 1,
  can_pin INTEGER DEFAULT 0,
  allow_broadcast INTEGER DEFAULT 1,
  allow_tag_all INTEGER DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS broadcast_user_registry (
  user_id INTEGER PRIMARY KEY,
  first_name TEXT,
  username TEXT,
  is_opted_out INTEGER DEFAULT 0,
  is_blocked INTEGER DEFAULT 0,
  last_interaction INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS broadcast_group_members (
  chat_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  first_name TEXT NOT NULL,
  username TEXT,
  last_seen INTEGER NOT NULL,
  PRIMARY KEY (chat_id, user_id)
);

-- Active Campaigns
CREATE TABLE IF NOT EXISTS broadcast_campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  scope TEXT NOT NULL, -- 'global' | 'dm_only'
  mode TEXT NOT NULL, -- 'copy' | 'forward'
  content_type TEXT NOT NULL, -- 'single' | 'sequence' | 'album'
  content_payload TEXT NOT NULL, -- JSON-serialized payload
  button_payload TEXT, -- JSON-serialized inline keyboard
  audience_filter TEXT NOT NULL, -- 'all' | 'private' | 'groups' | 'channels'
  pin_mode TEXT DEFAULT 'none', -- 'none' | 'quiet' | 'loud'
  pin_destination TEXT DEFAULT 'all', -- 'all' | 'groups' | 'channels' | 'private'
  pin_item_index INTEGER DEFAULT 0,
  tag_all_enabled INTEGER DEFAULT 0,
  tag_all_groups TEXT, -- JSON array of selected group IDs or 'all'
  is_silent INTEGER DEFAULT 0,
  protect_content INTEGER DEFAULT 0,
  disable_link_preview INTEGER DEFAULT 0,
  scheduled_at INTEGER, -- UTC Epoch timestamp
  status TEXT NOT NULL, -- 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled'
  owner_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  started_at INTEGER,
  completed_at INTEGER
);

-- Recipient Snapshots (Frozen at Confirmation)
CREATE TABLE IF NOT EXISTS broadcast_recipients (
  campaign_id TEXT NOT NULL,
  destination_id INTEGER NOT NULL,
  destination_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending' | 'excluded'
  exclusion_reason TEXT,
  PRIMARY KEY (campaign_id, destination_id)
);

-- Execution Work Queue
CREATE TABLE IF NOT EXISTS broadcast_jobs (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  destination_id INTEGER NOT NULL,
  destination_type TEXT NOT NULL,
  item_index INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending', -- 'pending' | 'processing' | 'sent' | 'retry_wait' | 'failed' | 'skipped'
  attempts INTEGER DEFAULT 0,
  worker_lease INTEGER DEFAULT 0,
  retry_after INTEGER DEFAULT 0,
  sent_message_id INTEGER,
  pinned_message_id INTEGER,
  last_error TEXT,
  updated_at INTEGER NOT NULL,
  UNIQUE(campaign_id, destination_id, item_index)
);

-- Wizard Interactive Session
CREATE TABLE IF NOT EXISTS broadcast_wizards (
  owner_id INTEGER PRIMARY KEY,
  step TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  session_data TEXT NOT NULL, -- JSON draft
  updated_at INTEGER NOT NULL
);

-- Audit & Delivery Logs
CREATE TABLE IF NOT EXISTS broadcast_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id TEXT NOT NULL,
  destination_id INTEGER NOT NULL,
  event TEXT NOT NULL,
  detail TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_b_jobs_claim ON broadcast_jobs (status, worker_lease, retry_after);
CREATE INDEX IF NOT EXISTS idx_b_recipients ON broadcast_recipients (campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_b_group_members ON broadcast_group_members (chat_id);
