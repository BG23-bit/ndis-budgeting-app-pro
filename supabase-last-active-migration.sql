-- Track when each user last opened the app (for the /admin "Last active" column).
-- Run once in the Supabase SQL editor.

alter table profiles
  add column if not exists last_active_at timestamptz;

-- Optional: makes sorting/filtering by recent activity fast once you have many rows.
create index if not exists profiles_last_active_at_idx
  on profiles (last_active_at desc nulls last);
