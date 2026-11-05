create table if not exists custom_quizzes (
  id         serial primary key,
  user_id    text not null,
  title      text not null,
  questions  jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists custom_quizzes_user_idx on custom_quizzes (user_id, created_at desc);
