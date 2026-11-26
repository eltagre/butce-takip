begin;

-- Keep existing policies. The restrictive policy also constrains older permissive policies.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'butcem_transactions', 'butcem_settings', 'butcem_finance_state',
    'butcem_wealth_state', 'butcem_intelligence_state'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from public, anon', table_name);
    execute format('create policy butcem_allow_owner on public.%I for all to authenticated
      using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', table_name);
    execute format('create policy butcem_require_owner on public.%I as restrictive for all to authenticated
      using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', table_name);
  end loop;
end;
$$;

create table public.butcem_transaction_tombstones (
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id text not null,
  primary key (user_id, transaction_id)
);

alter table public.butcem_transaction_tombstones enable row level security;
revoke all on public.butcem_transaction_tombstones from public, anon, authenticated;
grant select, insert on public.butcem_transaction_tombstones to authenticated;

create policy "Read own tombstones" on public.butcem_transaction_tombstones
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Record own tombstones" on public.butcem_transaction_tombstones
  for insert to authenticated with check (user_id = (select auth.uid()));

create function public.butcem_guard_transaction_write()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.user_id::text || ':' || new.id, 0));
  if exists (
    select 1 from public.butcem_transaction_tombstones
    where user_id = new.user_id and transaction_id = new.id
  ) then
    return null;
  end if;
  if tg_op = 'UPDATE' then
    if new.updated_at is null or (old.updated_at is not null and new.updated_at <= old.updated_at) then
      return null;
    end if;
  end if;
  return new;
end;
$$;

create trigger butcem_guard_transaction_write
before insert or update on public.butcem_transactions
for each row execute function public.butcem_guard_transaction_write();

create function public.butcem_record_transaction_delete()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(old.user_id::text || ':' || old.id, 0));
  -- During an account cascade the user row can already be gone.
  if (select auth.uid()) = old.user_id then
    insert into public.butcem_transaction_tombstones (user_id, transaction_id)
    values (old.user_id, old.id) on conflict do nothing;
  end if;
  return old;
end;
$$;

create trigger butcem_record_transaction_delete
after delete on public.butcem_transactions
for each row execute function public.butcem_record_transaction_delete();

create function public.butcem_delete_transactions(expected_owner uuid, transaction_ids text[])
returns void language plpgsql security invoker set search_path = '' as $$
declare
  owner_id uuid := (select auth.uid());
  target_id text;
begin
  if owner_id is null or owner_id is distinct from expected_owner then
    raise exception 'Account changed' using errcode = '42501';
  end if;
  if coalesce(cardinality(transaction_ids), 0) > 100 then
    raise exception 'At most 100 transaction IDs per batch' using errcode = '22023';
  end if;
  for target_id in select distinct id from unnest(transaction_ids) as ids(id) where id <> '' order by id loop
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner_id::text || ':' || target_id, 0));
    insert into public.butcem_transaction_tombstones (user_id, transaction_id)
    values (owner_id, target_id) on conflict do nothing;
    delete from public.butcem_transactions where user_id = owner_id and id = target_id;
  end loop;
end;
$$;

create function public.butcem_guard_settings_write()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if coalesce(new.settings_updated_at, new.updated_at, '-infinity') <=
     coalesce(old.settings_updated_at, old.updated_at, '-infinity') then
    return null;
  end if;
  return new;
end;
$$;

create trigger butcem_guard_settings_write before update on public.butcem_settings
for each row execute function public.butcem_guard_settings_write();

revoke execute on function public.butcem_guard_transaction_write() from public, anon, authenticated;
revoke execute on function public.butcem_record_transaction_delete() from public, anon, authenticated;
revoke execute on function public.butcem_guard_settings_write() from public, anon, authenticated;
revoke execute on function public.butcem_delete_transactions(uuid, text[]) from public, anon;
grant execute on function public.butcem_delete_transactions(uuid, text[]) to authenticated;

commit;
