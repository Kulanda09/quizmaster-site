alter table custom_quizzes add column if not exists join_code text;

create unique index if not exists custom_quizzes_join_code_idx on custom_quizzes (join_code);
