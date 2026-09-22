-- PinDo 7.0 cloud schema. Run once in Supabase SQL Editor.
-- The anon key may be shipped in the desktop app; never ship the service_role key.

create extension if not exists pgcrypto;

create table if not exists public.pindo_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  display_name text not null default '',
  account_status text not null default 'active' check (account_status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pindo_admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'support' check (role in ('owner', 'admin', 'support')),
  created_at timestamptz not null default now()
);

create table if not exists public.pindo_devices (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  platform text not null,
  app_version text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists pindo_devices_user_idx on public.pindo_devices(user_id, last_seen_at desc);

create table if not exists public.pindo_sync_documents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 0,
  payload jsonb not null default '{}'::jsonb,
  checksum text not null default '',
  device_id uuid,
  updated_at timestamptz not null default now()
);

create table if not exists public.pindo_sync_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  revision bigint not null,
  checksum text not null,
  device_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists pindo_sync_history_user_idx on public.pindo_sync_history(user_id, revision desc);

create or replace function public.pindo_create_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.pindo_profiles(user_id, email, display_name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data->>'display_name', ''))
  on conflict (user_id) do update set email = excluded.email, updated_at = now();
  return new;
end $$;
drop trigger if exists pindo_auth_user_created on auth.users;
create trigger pindo_auth_user_created after insert or update of email on auth.users
for each row execute function public.pindo_create_profile();

insert into public.pindo_profiles(user_id, email)
select id, coalesce(email, '') from auth.users
on conflict (user_id) do update set email = excluded.email, updated_at = now();

create or replace function public.pindo_account_active(target uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.pindo_profiles where user_id = target and account_status = 'active');
$$;

create or replace function public.pindo_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.pindo_admin_roles where user_id = auth.uid() and role in ('owner','admin'));
$$;

alter table public.pindo_profiles enable row level security;
alter table public.pindo_admin_roles enable row level security;
alter table public.pindo_devices enable row level security;
alter table public.pindo_sync_documents enable row level security;
alter table public.pindo_sync_history enable row level security;

drop policy if exists "profile own read" on public.pindo_profiles;
create policy "profile own read" on public.pindo_profiles for select using (user_id = auth.uid() or public.pindo_is_admin());
drop policy if exists "device own access" on public.pindo_devices;
create policy "device own access" on public.pindo_devices for all using (user_id = auth.uid() and public.pindo_account_active()) with check (user_id = auth.uid() and public.pindo_account_active());
drop policy if exists "sync own read" on public.pindo_sync_documents;
create policy "sync own read" on public.pindo_sync_documents for select using (user_id = auth.uid() and public.pindo_account_active());
drop policy if exists "history own read" on public.pindo_sync_history;
create policy "history own read" on public.pindo_sync_history for select using (user_id = auth.uid() and public.pindo_account_active());
drop policy if exists "admin roles own read" on public.pindo_admin_roles;
create policy "admin roles own read" on public.pindo_admin_roles for select using (user_id = auth.uid());

create or replace function public.pindo_push_sync(p_base_revision bigint, p_device_id uuid, p_payload jsonb, p_checksum text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare current_row public.pindo_sync_documents%rowtype; next_revision bigint;
begin
  if auth.uid() is null then raise exception 'unauthorized' using errcode = '42501'; end if;
  if not public.pindo_account_active() then raise exception 'account_suspended' using errcode = '42501'; end if;
  if octet_length(p_payload::text) > 2097152 then raise exception 'payload_too_large' using errcode = '22001'; end if;
  select * into current_row from public.pindo_sync_documents where user_id = auth.uid() for update;
  if found and current_row.revision <> p_base_revision then
    return jsonb_build_object('conflict', true, 'current', jsonb_build_object('revision',current_row.revision,'state',current_row.payload,'checksum',current_row.checksum,'deviceId',current_row.device_id,'updatedAt',extract(epoch from current_row.updated_at)*1000));
  end if;
  if not found and p_base_revision <> 0 then return jsonb_build_object('conflict', true, 'current', null); end if;
  next_revision := p_base_revision + 1;
  insert into public.pindo_sync_documents(user_id,revision,payload,checksum,device_id,updated_at)
  values(auth.uid(),next_revision,p_payload,p_checksum,p_device_id,now())
  on conflict(user_id) do update set revision=excluded.revision,payload=excluded.payload,checksum=excluded.checksum,device_id=excluded.device_id,updated_at=now();
  insert into public.pindo_sync_history(user_id,revision,checksum,device_id) values(auth.uid(),next_revision,p_checksum,p_device_id);
  delete from public.pindo_sync_history where user_id=auth.uid() and id not in (select id from public.pindo_sync_history where user_id=auth.uid() order by revision desc limit 20);
  return jsonb_build_object('conflict',false,'revision',next_revision,'checksum',p_checksum,'updatedAt',extract(epoch from now())*1000);
end $$;

create or replace function public.pindo_admin_list_users()
returns table(user_id uuid,email text,display_name text,account_status text,created_at timestamptz,updated_at timestamptz,device_count bigint,last_seen_at timestamptz,revision bigint)
language plpgsql security definer set search_path = public as $$
begin
  if not public.pindo_is_admin() then raise exception 'admin_required' using errcode='42501'; end if;
  return query select p.user_id,p.email,p.display_name,p.account_status,p.created_at,p.updated_at,count(d.id),max(d.last_seen_at),coalesce(max(s.revision),0)
  from public.pindo_profiles p left join public.pindo_devices d on d.user_id=p.user_id left join public.pindo_sync_documents s on s.user_id=p.user_id
  group by p.user_id,p.email,p.display_name,p.account_status,p.created_at,p.updated_at order by p.created_at desc;
end $$;

create or replace function public.pindo_admin_set_user_status(p_user_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.pindo_is_admin() then raise exception 'admin_required' using errcode='42501'; end if;
  if p_status not in ('active','suspended') then raise exception 'invalid_status'; end if;
  update public.pindo_profiles set account_status=p_status,updated_at=now() where user_id=p_user_id;
end $$;

revoke all on function public.pindo_push_sync(bigint,uuid,jsonb,text) from public;
grant execute on function public.pindo_push_sync(bigint,uuid,jsonb,text) to authenticated;
revoke all on function public.pindo_admin_list_users() from public;
grant execute on function public.pindo_admin_list_users() to authenticated;
revoke all on function public.pindo_admin_set_user_status(uuid,text) from public;
grant execute on function public.pindo_admin_set_user_status(uuid,text) to authenticated;

-- After your first account is registered, make it the owner by running:
-- insert into public.pindo_admin_roles(user_id, role)
-- select id, 'owner' from auth.users where email = 'YOUR_EMAIL' on conflict (user_id) do update set role='owner';
