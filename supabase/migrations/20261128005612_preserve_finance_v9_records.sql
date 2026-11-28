begin;

create function public.butcem_preserve_finance_v9_records()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  prior jsonb := old.payload->'financeV9';
  incoming jsonb := new.payload->'financeV9';
  combined jsonb;
begin
  if prior is null then return new; end if;
  if incoming is null then
    new.payload := jsonb_set(coalesce(new.payload, '{}'::jsonb), '{financeV9}', prior);
    return new;
  end if;
  if incoming->>'version' is distinct from prior->>'version' then
    new.payload := jsonb_set(new.payload, '{financeV9}', prior);
    return new;
  end if;
  if prior->>'version' <> '1' then return new; end if;

  select coalesce(jsonb_agg(entry order by entry->>'id'), '[]'::jsonb)
  into combined
  from (
    select distinct on (entry->>'id') entry
    from (
      select value as entry from jsonb_array_elements(
        case when jsonb_typeof(prior->'records')='array' then prior->'records' else '[]'::jsonb end)
      union all
      select value as entry from jsonb_array_elements(
        case when jsonb_typeof(incoming->'records')='array' then incoming->'records' else '[]'::jsonb end)
    ) candidates
    where jsonb_typeof(entry->'id')='string' and jsonb_typeof(entry->'kind')='string'
      and entry->>'updatedAt' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$'
    order by entry->>'id', entry->>'updatedAt' desc, (entry->>'deleted'='true') desc nulls last, entry::text desc
  ) latest;
  new.payload := jsonb_set(new.payload, '{financeV9}', jsonb_build_object('version',1,'records',combined));
  return new;
end;
$$;

create trigger butcem_preserve_finance_v9_records
before update on public.butcem_intelligence_state
for each row execute function public.butcem_preserve_finance_v9_records();

revoke execute on function public.butcem_preserve_finance_v9_records() from public, anon, authenticated;

commit;
