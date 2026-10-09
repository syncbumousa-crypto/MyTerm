-- ============================================================
-- # 🗄️ 🔖  THE PROFILES TABLE
-- # 🔤 SQL
-- # 🎯 One row per user. It keeps the name of the Drive folder they chose
-- #    and the id of their file. No user data is kept here
-- # 🔗 The id column points at the account row that the sign in service
-- #    makes. If an account is deleted, its row here goes with it
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  drive_folder_name text,
  drive_file_id text,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- # 🛡️ 🔐  WHO MAY TOUCH WHICH ROW
-- # 🔤 SQL
-- # 🎯 Turns on row level security, then allows each user to read, add
-- #    and change their own row, and nothing else
-- # 🔗 These rules are what keeps the data safe, not the public key in the
-- #    page. With security on and no rules, the table answers nobody.
-- #    auth.uid() is the id of whoever is asking right now
-- ============================================================
alter table public.profiles enable row level security;

create policy "read own row"
  on public.profiles for select
  using (auth.uid() = id);

create policy "add own row"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "change own row"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
