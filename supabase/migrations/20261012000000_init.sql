create table public.orders (
  id uuid primary key default gen_random_uuid(),
  app text not null,
  reference_id text not null,
  amount integer not null check (amount > 0),
  description text,
  status text not null default 'Pending' check (status in ('Pending', 'Paid')),
  payos_order_code bigint unique,
  checkout_url text,
  qr_code text,
  paid_at timestamptz,
  handler_status text not null default 'Pending' check (handler_status in ('Pending', 'Done', 'Failed')),
  handler_attempts integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (app, reference_id)
);

-- No policy on purpose: only the secret key, which bypasses RLS, may read or write orders
alter table public.orders enable row level security;
