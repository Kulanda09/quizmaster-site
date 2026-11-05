create table if not exists attempts (
  id         serial primary key,
  user_id    text not null,
  subject    text not null,
  score      integer not null,
  total      integer not null,
  created_at timestamptz not null default now()
);
create index if not exists attempts_user_id_idx on attempts (user_id, created_at desc);
