alter table custom_quizzes add column if not exists description text not null default '';
alter table custom_quizzes add column if not exists subject text not null default 'Математика';
alter table custom_quizzes add column if not exists visibility text not null default 'public';
alter table custom_quizzes add column if not exists slug text;

update custom_quizzes set slug = id::text where slug is null or slug = '';

create unique index if not exists custom_quizzes_slug_idx on custom_quizzes (slug);

create table if not exists custom_attempts (
  id          serial primary key,
  quiz_id     integer not null references custom_quizzes(id) on delete cascade,
  player_name text not null default 'Қонақ',
  score       integer not null,
  total       integer not null,
  created_at  timestamptz not null default now()
);

create index if not exists custom_attempts_quiz_idx on custom_attempts (quiz_id, created_at desc);
