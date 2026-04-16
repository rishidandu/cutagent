-- Stripe billing columns on users table
alter table users
  add column if not exists credits_cents int not null default 100,
  add column if not exists subscription_tier text not null default 'free',
  add column if not exists stripe_customer_id text unique,
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_status text,
  add column if not exists period_end timestamptz;

create index if not exists idx_users_stripe_customer on users(stripe_customer_id);

-- Audit ledger for credit changes
create table if not exists credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  delta_cents int not null,
  balance_after_cents int not null,
  reason text not null,
  stripe_event_id text,
  generation_id uuid references generation_history(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_credit_tx_user on credit_transactions(user_id, created_at desc);
create unique index if not exists idx_credit_tx_event on credit_transactions(stripe_event_id) where stripe_event_id is not null;

-- Atomic deduction RPC — returns new balance, or NULL if insufficient
create or replace function deduct_credits(p_user uuid, p_cents int)
returns int language plpgsql as $$
declare new_balance int;
begin
  update users set credits_cents = credits_cents - p_cents
    where id = p_user and credits_cents >= p_cents
    returning credits_cents into new_balance;
  return new_balance;
end; $$;
