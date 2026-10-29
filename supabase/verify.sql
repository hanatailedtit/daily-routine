-- Run after setup.sql. Fixtures and changes are rolled back.
begin;

insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-000000000001', 'schema-test-owner@example.invalid'),
  ('20000000-0000-4000-8000-000000000002', 'schema-test-other@example.invalid');

insert into public.profiles (id, user_name)
values ('20000000-0000-4000-8000-000000000002', 'Other');

insert into public.todo_category (id, user_id, name) overriding system value values
  (-10001, '10000000-0000-4000-8000-000000000001', 'Owner'),
  (-10002, '20000000-0000-4000-8000-000000000002', 'Other');

insert into public.todo_item (id, user_id, todo_text, category_id, sub_id)
overriding system value values
  (-20001, '10000000-0000-4000-8000-000000000001', 'Parent', -10001, null),
  (-20002, '20000000-0000-4000-8000-000000000002', 'Other', -10002, null),
  (-20003, '10000000-0000-4000-8000-000000000001', 'Legacy child', null, -20001);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

do $$
declare
  owner_id uuid := '10000000-0000-4000-8000-000000000001';
  other_id uuid := '20000000-0000-4000-8000-000000000002';
  category bigint;
  parent bigint;
  child bigint;
  affected bigint;
begin
  assert (select count(*) = 0 from public.profiles), 'Other profile was visible';
  assert (select count(*) = 1 from public.todo_category), 'Category isolation failed';
  assert (select count(*) = 2 from public.todo_item), 'Todo isolation failed';

  insert into public.profiles (id, user_name, user_image)
  values (owner_id, 'Owner', 'data:image/png;base64,test');
  update public.profiles set user_name = 'Renamed' where id = owner_id;
  assert (select user_name = 'Renamed' from public.profiles where id = owner_id);

  insert into public.todo_category (user_id, name) values (owner_id, 'New')
  returning id into category;
  update public.todo_category set name = 'Updated' where id = category;
  assert (select name = 'Updated' from public.todo_category where id = category);

  insert into public.todo_item (user_id, todo_text, category_id)
  values (owner_id, '<p>New parent</p>', category) returning id into parent;
  assert (select not checked and "order" = 0 and created_at is not null
    from public.todo_item where id = parent), 'Todo defaults failed';
  insert into public.todo_item (user_id, todo_text, sub_id)
  values (owner_id, '<p>Child</p>', parent) returning id into child;
  update public.todo_item set checked = true, "order" = 5 where id = parent;
  assert (select checked and "order" = 5 from public.todo_item where id = parent);

  begin
    insert into public.profiles (id) values (other_id);
    raise exception 'Creating another user profile was allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.todo_category (user_id, name) values (other_id, 'Forbidden');
    raise exception 'Creating another user category was allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.todo_item (user_id) values (other_id);
    raise exception 'Creating another user todo was allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.todo_item set user_id = other_id where id = child;
    raise exception 'Transferring todo ownership was allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.todo_item (user_id, category_id) values (owner_id, -10002);
    raise exception 'Referencing another user category was allowed';
  exception when foreign_key_violation then null;
  end;
  begin
    insert into public.todo_item (user_id, sub_id) values (owner_id, -20002);
    raise exception 'Referencing another user parent was allowed';
  exception when foreign_key_violation then null;
  end;

  update public.profiles set user_name = 'Forbidden' where id = other_id;
  get diagnostics affected = row_count;
  assert affected = 0, 'Updating another profile was allowed';
  update public.todo_category set name = 'Forbidden' where id = -10002;
  get diagnostics affected = row_count;
  assert affected = 0, 'Updating another category was allowed';
  update public.todo_item set checked = true where id = -20002;
  get diagnostics affected = row_count;
  assert affected = 0, 'Updating another todo was allowed';
  delete from public.todo_category where id = -10002;
  get diagnostics affected = row_count;
  assert affected = 0, 'Deleting another category was allowed';
  delete from public.todo_item where id = -20002;
  get diagnostics affected = row_count;
  assert affected = 0, 'Deleting another todo was allowed';

  delete from public.todo_item where id = parent;
  assert not exists (select from public.todo_item where id = child), 'Child cascade failed';
  delete from public.todo_category where id = category;
  delete from public.todo_category where id = -10001;
  assert not exists (select from public.todo_item where id in (-20001, -20003)),
    'Category/legacy child cascade failed';
end $$;

set local role anon;
do $$
begin
  begin
    perform * from public.profiles;
    raise exception 'Anonymous profile access was allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    perform * from public.todo_category;
    raise exception 'Anonymous category access was allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    perform * from public.todo_item;
    raise exception 'Anonymous todo access was allowed';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
do $$
begin
  assert (select user_name = 'Other' from public.profiles
    where id = '20000000-0000-4000-8000-000000000002');
  assert (select name = 'Other' from public.todo_category where id = -10002);
  assert (select not checked from public.todo_item where id = -20002);
end $$;

rollback;
select 'CRUD, defaults, RLS, ownership constraints and cascade checks passed' as result;
