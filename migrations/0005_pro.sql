create table if not exists subscriptions (
  user_id            text primary key,
  plan               text not null,
  price_kzt          integer not null,
  status             text not null,
  current_period_end timestamptz not null,
  created_at         timestamptz not null default now()
);
