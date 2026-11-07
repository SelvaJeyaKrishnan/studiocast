-- ====================================================================
-- StudioCast: Atomic Guest Admission & Durable Eviction Queue
-- Migration: 20261107_atomic_admission_and_eviction_queue.sql
-- ====================================================================

-- 1. Create durable eviction queue table
create table if not exists public.pending_livekit_evictions (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  invitation_id uuid references public.studio_invitations(id) on delete cascade,
  guest_id uuid references public.guest_participants(id) on delete cascade,
  room_name text not null,
  participant_identity text not null,
  revoke_token_ts bigint not null,
  status text not null default 'pending' check (status in ('pending', 'failed', 'completed')),
  attempts integer not null default 0,
  last_error text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint uq_pending_evictions_room_identity unique (room_name, participant_identity)
);

-- Indexes for efficient queries during revocations and retry sweeps
create index if not exists idx_pending_evictions_studio_status 
  on public.pending_livekit_evictions (studio_id, status);

create index if not exists idx_pending_evictions_invitation_status 
  on public.pending_livekit_evictions (invitation_id, status);

-- Enable Row Level Security
alter table public.pending_livekit_evictions enable row level security;

-- RLS Policy: Only authenticated studio owners can view pending evictions for their studios
create policy "Studio owners can view pending evictions"
  on public.pending_livekit_evictions
  for select
  to authenticated
  using (
    exists (
      select 1 from public.studios s
      where s.id = pending_livekit_evictions.studio_id
        and s.owner_id = auth.uid()
    )
  );

-- RLS Policy: Only authenticated studio owners can insert pending evictions for their studios
create policy "Studio owners can insert pending evictions"
  on public.pending_livekit_evictions
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.studios s
      where s.id = pending_livekit_evictions.studio_id
        and s.owner_id = auth.uid()
    )
  );

-- RLS Policy: Only authenticated studio owners can update pending evictions for their studios
create policy "Studio owners can update pending evictions"
  on public.pending_livekit_evictions
  for update
  to authenticated
  using (
    exists (
      select 1 from public.studios s
      where s.id = pending_livekit_evictions.studio_id
        and s.owner_id = auth.uid()
    )
  );

-- 2. Create atomic guest admission stored procedure (RPC)
create or replace function public.admit_guest_participant(
  p_studio_id uuid,
  p_guest_id uuid
)
returns table (
  success boolean,
  status text,
  error_message text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_studio_id uuid;
  v_invitation record;
  v_guest record;
begin
  -- Validate caller authentication
  if auth.uid() is null then
    return query select false, null::text, 'Unauthorized: Please sign in.'::text;
    return;
  end if;

  if p_studio_id is null or p_guest_id is null then
    return query select false, null::text, 'Invalid studio or guest identifier.'::text;
    return;
  end if;

  -- 1. L1 Lock: studios (scoped to caller's ownership)
  select id into v_studio_id
  from public.studios
  where id = p_studio_id
    and owner_id = auth.uid()
  for update;

  if not found then
    return query select false, null::text, 'Studio not found or access denied.'::text;
    return;
  end if;

  -- Read guest's invitation id
  select invitation_id into v_guest
  from public.guest_participants
  where id = p_guest_id
    and studio_id = p_studio_id;

  if not found then
    return query select false, null::text, 'Guest participant not found in this studio.'::text;
    return;
  end if;

  -- 2. L3 Lock: studio_invitations
  select * into v_invitation
  from public.studio_invitations
  where id = v_guest.invitation_id
    and studio_id = p_studio_id
  for update;

  if not found or v_invitation.is_active = false or v_invitation.revoked_at is not null then
    return query select false, null::text, 'Cannot admit guest: invitation has been revoked.'::text;
    return;
  end if;

  if v_invitation.expires_at <= now() then
    return query select false, null::text, 'Cannot admit guest: invitation has expired.'::text;
    return;
  end if;

  -- 3. L4 Lock: guest_participants
  select * into v_guest
  from public.guest_participants
  where id = p_guest_id
    and studio_id = p_studio_id
  for update;

  if v_guest.status = 'admitted' then
    return query select true, 'admitted'::text, null::text;
    return;
  end if;

  if v_guest.status = 'left' then
    return query select false, 'left'::text, 'Cannot admit a guest who has already left or been removed from the studio.'::text;
    return;
  end if;

  if v_guest.status != 'waiting' then
    return query select false, v_guest.status, ('Cannot admit guest with status: ' || v_guest.status)::text;
    return;
  end if;

  -- 4. Atomic state transition
  update public.guest_participants
  set status = 'admitted',
      last_seen_at = now()
  where id = p_guest_id;

  return query select true, 'admitted'::text, null::text;
end;
$$;

-- Security hardening on RPC
revoke all on function public.admit_guest_participant(uuid, uuid) from public, anon, authenticated;
grant execute on function public.admit_guest_participant(uuid, uuid) to authenticated;
