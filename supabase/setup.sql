-- Run once in the SQL Editor of a NEW Supabase project.
-- Existing tables cause an error; this script does not replace existing data.
begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  user_name text not null default '',
  user_image text,
  created_at timestamptz not null default now()
);

create table public.todo_category (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.todo_item (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  todo_text text not null default '',
  checked boolean not null default false,
  category_id bigint,
  sub_id bigint,
  "order" bigint not null default 0,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  check (sub_id is null or sub_id <> id),
  -- Include the owner so another user's category/parent cannot be referenced.
  foreign key (category_id, user_id)
    references public.todo_category(id, user_id) on delete cascade,
  foreign key (sub_id, user_id)
    references public.todo_item(id, user_id) on delete cascade
);

create index todo_category_user_created_idx
  on public.todo_category(user_id, created_at);
create index todo_item_user_order_idx
  on public.todo_item(user_id, "order", id);
create index todo_item_category_idx on public.todo_item(category_id, user_id);
create index todo_item_parent_idx on public.todo_item(sub_id, user_id);

alter table public.profiles enable row level security;
alter table public.todo_category enable row level security;
alter table public.todo_item enable row level security;

create policy profiles_owner on public.profiles
  for all to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy todo_category_owner on public.todo_category
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy todo_item_owner on public.todo_item
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Grants are explicit so this also works when automatic API grants are disabled.
revoke all on public.profiles, public.todo_category, public.todo_item
  from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.todo_category, public.todo_item
  to authenticated;

revoke all on sequence public.todo_category_id_seq, public.todo_item_id_seq
  from public, anon, authenticated;
grant usage, select on sequence public.todo_category_id_seq, public.todo_item_id_seq
  to authenticated;

commit;
