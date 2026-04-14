-- CutAgent: Full platform schema
-- NextAuth adapter tables + application tables

-- ── NextAuth.js required tables ──

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text unique,
  "emailVerified" timestamptz,
  image text,
  created_at timestamptz default now()
);

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references users(id) on delete cascade,
  type text not null,
  provider text not null,
  "providerAccountId" text not null,
  refresh_token text,
  access_token text,
  expires_at bigint,
  token_type text,
  scope text,
  id_token text,
  session_state text,
  unique(provider, "providerAccountId")
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  "sessionToken" text unique not null,
  "userId" uuid not null references users(id) on delete cascade,
  expires timestamptz not null
);

create table if not exists verification_tokens (
  identifier text not null,
  token text unique not null,
  expires timestamptz not null,
  primary key (identifier, token)
);

-- ── Application tables ──

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null default 'Untitled',
  scenes jsonb not null default '[]'::jsonb,
  style_context jsonb not null default '{}'::jsonb,
  audio_tracks jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_projects_user_id on projects(user_id);
create index idx_projects_updated_at on projects(updated_at desc);

create table if not exists generation_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  scene_id text not null,
  scene_index int not null,
  model_name text not null,
  model_id text not null,
  duration numeric(5,2) not null,
  cost numeric(10,4) not null,
  created_at timestamptz default now()
);

create index idx_gen_history_user on generation_history(user_id);
create index idx_gen_history_project on generation_history(project_id);

create table if not exists waitlist (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  source text default 'website',
  created_at timestamptz default now()
);

create table if not exists usage_limits (
  user_id uuid primary key references users(id) on delete cascade,
  tier text default 'free',
  monthly_budget_cents int default 0,
  generations_this_month int default 0,
  period_start timestamptz default date_trunc('month', now())
);

-- ── Row-Level Security ──

alter table projects enable row level security;
alter table generation_history enable row level security;
alter table usage_limits enable row level security;

create policy "Users manage own projects"
  on projects for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users read own history"
  on generation_history for select
  using (user_id = auth.uid());

create policy "Service inserts history"
  on generation_history for insert
  with check (true);

create policy "Users read own limits"
  on usage_limits for select
  using (user_id = auth.uid());
