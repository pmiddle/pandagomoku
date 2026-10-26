CREATE TABLE rooms (
  code TEXT PRIMARY KEY NOT NULL,
  data TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0,
  expires INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX rooms_expiry ON rooms (expires);
--> statement-breakpoint
CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY NOT NULL,
  window INTEGER NOT NULL,
  count INTEGER NOT NULL
);
