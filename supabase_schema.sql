-- 在 Supabase Dashboard > SQL Editor 中执行此脚本

create extension if not exists "uuid-ossp";

-- 词书表：每行一本词书，words 用 JSONB 存储
create table if not exists word_books (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id text not null,
  name text not null,
  words jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, book_id)
);

-- 学习记录表：每行一个单词的学习记录
create table if not exists learning_records (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id text not null,
  word_id text not null,
  status text not null default 'new',
  review_count integer not null default 0,
  correct_count integer not null default 0,
  consecutive_correct integer not null default 0,
  ease_factor real not null default 2.5,
  interval_days real not null default 0,
  last_reviewed_at timestamptz,
  next_review_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, book_id, word_id)
);

-- 用户设置表：每行一个用户
create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null default '',
  daily_limit integer not null default 20,
  dark_mode boolean not null default false,
  migrated_from_local boolean not null default false,
  updated_at timestamptz not null default now()
);

-- 索引
create index if not exists idx_word_books_user on word_books(user_id);
create index if not exists idx_learning_records_user on learning_records(user_id);
create index if not exists idx_learning_records_book_word on learning_records(user_id, book_id, word_id);

-- 行级安全：用户只能访问自己的数据
alter table word_books enable row level security;
alter table learning_records enable row level security;
alter table user_settings enable row level security;

drop policy if exists "word_books_owner" on word_books;
create policy "word_books_owner" on word_books
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "learning_records_owner" on learning_records;
create policy "learning_records_owner" on learning_records
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_settings_owner" on user_settings;
create policy "user_settings_owner" on user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 自动更新 updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists word_books_updated_at on word_books;
create trigger word_books_updated_at before update on word_books
  for each row execute function update_updated_at();

drop trigger if exists learning_records_updated_at on learning_records;
create trigger learning_records_updated_at before update on learning_records
  for each row execute function update_updated_at();

drop trigger if exists user_settings_updated_at on user_settings;
create trigger user_settings_updated_at before update on user_settings
  for each row execute function update_updated_at();
