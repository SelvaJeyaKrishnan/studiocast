-- ====================================================================
-- StudioCast: Hardened Studio Invitations & Guest Sessions Schema
-- Migration: 20261106_create_studio_invitations.sql
-- Fully Idempotent & Safe to Rerun (Fresh install or upgrade from any draft)
-- ====================================================================

-- 1. Create Studio Invitations Table
create table if not exists public.studio_invitations (
  id uuid default gen_random_uuid() primary key,
  studio_id uuid references public.studios(id) on delete cascade not null,
  token_hash text unique not null,
  created_by uuid references auth.users(id) on delete cascade not null,
  created_at timestamp with time zone default now() not null,
  expires_at timestamp with time zone not null,
  revoked_at timestamp with time zone,
  is_active boolean default true not null
);

-- Index foreign keys
create index if not exists idx_invitations_studio_id on public.studio_invitations(studio_id);
create index if not exists idx_invitations_created_by on public.studio_invitations(created_by);

-- 2. Create Guest Participants Table
create table if not exists public.guest_participants (
  id uuid default gen_random_uuid() primary key,
  studio_id uuid references public.studios(id) on delete cascade not null,
  invitation_id uuid references public.studio_invitations(id) on delete cascade not null,
  display_name text not null,
  joined_at timestamp with time zone default now() not null,
  last_seen_at timestamp with time zone default now() not null,
  status text default 'waiting' not null check (status in ('waiting', 'admitted', 'left'))
);

-- ====================================================================
-- 2b. Fully Idempotent Column, Backfill, and Constraint Enforcement
-- Runs cleanly whether the column already exists or is newly added
-- ====================================================================
do $$
begin
  -- Step 1: Ensure column exists
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'guest_participants'
      and column_name = 'session_secret_hash'
  ) then
    alter table public.guest_participants
      add column session_secret_hash text;
  end if;

  -- Step 2: Backfill any existing NULL values safely
  -- Notice: Legacy rows receive a unique random UUID-based value prefixed with 'legacy_unauthenticated_'.
  -- Because real session secrets are 64-character hex strings produced by SHA-256,
  -- this prefix format is impossible for any valid client session token to match.
  update public.guest_participants
  set session_secret_hash = 'legacy_unauthenticated_' || gen_random_uuid()::text
  where session_secret_hash is null;

  -- Step 3: Ensure NOT NULL constraint is enforced
  alter table public.guest_participants
    alter column session_secret_hash set not null;

  -- Step 4: Ensure UNIQUE constraint exists safely
  if not exists (
    select 1
    from pg_constraint
    where conname = 'uq_guest_session_secret_hash'
      and conrelid = 'public.guest_participants'::regclass
  ) then
    alter table public.guest_participants
      add constraint uq_guest_session_secret_hash unique (session_secret_hash);
  end if;
end $$;

-- Indexes for guest participants
create index if not exists idx_guests_studio_id on public.guest_participants(studio_id);
create index if not exists idx_guests_invitation_id on public.guest_participants(invitation_id);
create index if not exists idx_guests_session_hash on public.guest_participants(session_secret_hash);

-- 3. Enable Row Level Security (RLS)
alter table public.studio_invitations enable row level security;
alter table public.guest_participants enable row level security;

-- 4. RLS Policies for Studio Invitations (Hosts Only)
drop policy if exists "Studio owners can view invitations" on public.studio_invitations;
create policy "Studio owners can view invitations"
  on public.studio_invitations
  for select
  using ((select auth.uid()) = created_by);

drop policy if exists "Studio owners can insert invitations" on public.studio_invitations;
create policy "Studio owners can insert invitations"
  on public.studio_invitations
  for insert
  with check (
    (select auth.uid()) = created_by
    and exists (
      select 1 from public.studios s
      where s.id = studio_id and s.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Studio owners can update invitations" on public.studio_invitations;
create policy "Studio owners can update invitations"
  on public.studio_invitations
  for update
  using ((select auth.uid()) = created_by)
  with check ((select auth.uid()) = created_by);

drop policy if exists "Studio owners can delete invitations" on public.studio_invitations;
create policy "Studio owners can delete invitations"
  on public.studio_invitations
  for delete
  using ((select auth.uid()) = created_by);

-- 5. RLS Policies for Guest Participants (Host Visibility Only)
drop policy if exists "Studio owners can view guest participants" on public.guest_participants;
create policy "Studio owners can view guest participants"
  on public.guest_participants
  for select
  using (
    exists (
      select 1 from public.studios s
      where s.id = studio_id and s.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Studio owners can update guest status" on public.guest_participants;
create policy "Studio owners can update guest status"
  on public.guest_participants
  for update
  using (
    exists (
      select 1 from public.studios s
      where s.id = studio_id and s.owner_id = (select auth.uid())
    )
  );

-- ====================================================================
-- 6. EXPLICIT TEARDOWN OF INSECURE LEGACY RPC FUNCTION SIGNATURES
-- Uses to_regprocedure() for deterministic, exact-signature resolution.
-- Does NOT touch the new secure functions with different parameter counts/types.
-- ====================================================================
do $$
declare
  legacy_signatures text[] := array[
    'public.get_guest_session(uuid)',
    'public.leave_guest_session(uuid)',
    'public.register_guest_participant(text, text)'
  ];
  sig text;
  proc regprocedure;
begin
  foreach sig in array legacy_signatures
  loop
    proc := to_regprocedure(sig);
    if proc is not null then
      execute format('revoke all on function %s from public, anon, authenticated', sig);
      execute format('drop function %s', sig);
    end if;
  end loop;
end $$;

-- ====================================================================
-- 7. REVISED & HARDENED SECURITY DEFINER RPC FUNCTIONS
-- ====================================================================

-- 7.1 RPC: Verify Invitation Token (Guest-Facing)
create or replace function public.verify_guest_invitation(p_token_hash text)
returns table (
  invitation_id uuid,
  studio_id uuid,
  studio_name text,
  is_valid boolean,
  error_code text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invitation record;
  v_studio record;
begin
  if p_token_hash is null or length(p_token_hash) = 0 then
    return query select null::uuid, null::uuid, null::text, false, 'invalid_token'::text;
    return;
  end if;

  select * into v_invitation
  from public.studio_invitations
  where token_hash = p_token_hash;

  if not found then
    return query select null::uuid, null::uuid, null::text, false, 'not_found'::text;
    return;
  end if;

  if not v_invitation.is_active or v_invitation.revoked_at is not null then
    return query select null::uuid, null::uuid, null::text, false, 'revoked'::text;
    return;
  end if;

  if v_invitation.expires_at <= now() then
    return query select null::uuid, null::uuid, null::text, false, 'expired'::text;
    return;
  end if;

  select name into v_studio
  from public.studios
  where id = v_invitation.studio_id;

  if not found then
    return query select null::uuid, null::uuid, null::text, false, 'studio_deleted'::text;
    return;
  end if;

  return query select
    v_invitation.id,
    v_invitation.studio_id,
    v_studio.name,
    true,
    null::text;
end;
$$;

revoke all on function public.verify_guest_invitation(text) from public, anon, authenticated;
grant execute on function public.verify_guest_invitation(text) to anon, authenticated;

-- 7.2 RPC: Register Guest Participant (Requires Token Hash + Session Secret Hash)
create or replace function public.register_guest_participant(
  p_token_hash text,
  p_session_secret_hash text,
  p_display_name text
)
returns table (
  guest_id uuid,
  studio_id uuid,
  studio_name text,
  display_name text,
  status text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invitation record;
  v_studio record;
  v_clean_name text;
  v_new_guest_id uuid;
begin
  -- Validate inputs
  v_clean_name := trim(p_display_name);
  if length(v_clean_name) < 2 or length(v_clean_name) > 50 then
    raise exception 'Display name must be between 2 and 50 characters'
      using errcode = '22001';
  end if;

  if p_session_secret_hash is null or length(p_session_secret_hash) < 32 then
    raise exception 'Invalid session credential provided'
      using errcode = '22023';
  end if;

  -- Validate invitation token
  select * into v_invitation
  from public.studio_invitations
  where token_hash = p_token_hash;

  if not found then
    raise exception 'Invalid or unrecognized invitation token'
      using errcode = 'P0002';
  end if;

  if not v_invitation.is_active or v_invitation.revoked_at is not null then
    raise exception 'This invitation has been revoked'
      using errcode = '42501';
  end if;

  if v_invitation.expires_at <= now() then
    raise exception 'This invitation has expired'
      using errcode = '42501';
  end if;

  select name into v_studio
  from public.studios
  where id = v_invitation.studio_id;

  if not found then
    raise exception 'Studio associated with this invitation was not found'
      using errcode = 'P0002';
  end if;

  -- Insert guest participant with hashed session credential
  insert into public.guest_participants (
    studio_id,
    invitation_id,
    session_secret_hash,
    display_name,
    status
  ) values (
    v_invitation.studio_id,
    v_invitation.id,
    p_session_secret_hash,
    v_clean_name,
    'waiting'
  )
  returning id into v_new_guest_id;

  return query select
    v_new_guest_id,
    v_invitation.studio_id,
    v_studio.name,
    v_clean_name,
    'waiting'::text;
end;
$$;

revoke all on function public.register_guest_participant(text, text, text) from public, anon, authenticated;
grant execute on function public.register_guest_participant(text, text, text) to anon, authenticated;

-- 7.3 RPC: Get Guest Waiting Room Session (Requires matching Guest ID & Session Secret Hash)
create or replace function public.get_guest_session(
  p_guest_id uuid,
  p_session_secret_hash text
)
returns table (
  guest_id uuid,
  studio_id uuid,
  studio_name text,
  display_name text,
  status text,
  joined_at timestamp with time zone
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_guest record;
  v_studio record;
begin
  if p_guest_id is null or p_session_secret_hash is null then
    return;
  end if;

  -- Verify session ownership by matching ID and cryptographic secret hash
  select * into v_guest
  from public.guest_participants
  where id = p_guest_id and session_secret_hash = p_session_secret_hash;

  if not found then
    return;
  end if;

  select name into v_studio
  from public.studios
  where id = v_guest.studio_id;

  -- Update heartbeat
  update public.guest_participants
  set last_seen_at = now()
  where id = p_guest_id;

  return query select
    v_guest.id,
    v_guest.studio_id,
    v_studio.name,
    v_guest.display_name,
    v_guest.status,
    v_guest.joined_at;
end;
$$;

revoke all on function public.get_guest_session(uuid, text) from public, anon, authenticated;
grant execute on function public.get_guest_session(uuid, text) to anon, authenticated;

-- 7.4 RPC: Leave Guest Session (Requires matching Guest ID & Session Secret Hash)
create or replace function public.leave_guest_session(
  p_guest_id uuid,
  p_session_secret_hash text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rows_affected integer;
begin
  if p_guest_id is null or p_session_secret_hash is null then
    return false;
  end if;

  update public.guest_participants
  set status = 'left',
      last_seen_at = now()
  where id = p_guest_id and session_secret_hash = p_session_secret_hash;

  get diagnostics v_rows_affected = row_count;
  return v_rows_affected > 0;
end;
$$;

revoke all on function public.leave_guest_session(uuid, text) from public, anon, authenticated;
grant execute on function public.leave_guest_session(uuid, text) to anon, authenticated;
