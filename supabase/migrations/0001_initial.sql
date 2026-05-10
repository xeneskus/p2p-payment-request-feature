-- 0001_initial.sql
-- Initial schema for the P2P Payment Request feature.
--   profiles         mirror of auth.users, joined into payment_requests.
--   payment_requests the central table; amount in INTEGER cents; status enum
--                    enforced via CHECK; expiry is a wall-clock column;
--                    state transitions are race-safe via `WHERE status='pending'`.

-- ---------------------------------------------------------------------------
-- Helper: keep emails lowercase
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null unique,
  display_name  text,
  created_at    timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select
  on public.profiles
  for select
  using (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- payment_requests
-- ---------------------------------------------------------------------------

create table if not exists public.payment_requests (
  id                uuid primary key default gen_random_uuid(),
  from_user_id      uuid not null references public.profiles(id) on delete cascade,
  to_email          text not null,
  amount_cents      integer not null check (amount_cents > 0 and amount_cents <= 100000000),
  note              text check (note is null or char_length(note) <= 280),
  status            text not null default 'pending'
                      check (status in ('pending', 'paid', 'declined', 'cancelled', 'expired')),
  shareable_token   uuid not null unique default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  expires_at        timestamptz not null default (now() + interval '7 days'),
  paid_at           timestamptz,
  declined_at       timestamptz,
  cancelled_at      timestamptz
);

-- Reject self-requests via trigger (CHECK cannot reference another table).
create or replace function public.reject_self_request()
returns trigger
language plpgsql
as $$
declare
  sender_email text;
begin
  select email into sender_email from public.profiles where id = new.from_user_id;
  if sender_email is not null and lower(sender_email) = lower(new.to_email) then
    raise exception 'self_request: cannot send a payment request to yourself';
  end if;
  new.to_email := lower(new.to_email);
  return new;
end;
$$;

drop trigger if exists trg_reject_self_request on public.payment_requests;
create trigger trg_reject_self_request
  before insert on public.payment_requests
  for each row execute function public.reject_self_request();

create index if not exists payment_requests_from_status_idx
  on public.payment_requests (from_user_id, status, created_at desc);

create index if not exists payment_requests_to_status_idx
  on public.payment_requests (to_email, status, created_at desc);

create index if not exists payment_requests_pending_expiry_idx
  on public.payment_requests (expires_at)
  where status = 'pending';

alter table public.payment_requests enable row level security;

drop policy if exists payment_requests_select on public.payment_requests;
create policy payment_requests_select
  on public.payment_requests
  for select
  using (
    auth.uid() = from_user_id
    or lower(coalesce(auth.email(), '')) = to_email
  );

drop policy if exists payment_requests_no_client_writes on public.payment_requests;
create policy payment_requests_no_client_writes
  on public.payment_requests
  for all
  using (false)
  with check (false);

-- Enable Realtime on the table so the dashboard channel receives UPDATEs.
alter publication supabase_realtime add table public.payment_requests;
