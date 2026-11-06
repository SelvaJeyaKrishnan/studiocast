-- ====================================================================
-- StudioCast: Hardened Guest Session Authorization
-- Migration: 20261106_harden_guest_session_authorization.sql
-- Updates public.get_guest_session to revalidate parent invitation & status
-- ====================================================================

-- Update public.get_guest_session with exact matching signature and return table
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
  v_invitation record;
  v_studio record;
begin
  -- 1. Fail early on null inputs
  if p_guest_id is null or p_session_secret_hash is null then
    return;
  end if;

  -- 2. Verify guest participant: ID, cryptographic secret hash, and active non-left status
  select * into v_guest
  from public.guest_participants gp
  where gp.id = p_guest_id
    and gp.session_secret_hash = p_session_secret_hash
    and gp.status != 'left';

  if not found then
    return;
  end if;

  -- 3. Verify associated invitation: must be active, not revoked, and not expired
  select * into v_invitation
  from public.studio_invitations si
  where si.id = v_guest.invitation_id
    and si.is_active = true
    and si.revoked_at is null
    and si.expires_at > now();

  if not found then
    return;
  end if;

  -- 4. Verify associated studio still exists
  select s.name into v_studio
  from public.studios s
  where s.id = v_guest.studio_id;

  if not found then
    return;
  end if;

  -- 5. Update heartbeat only after all authorization checks succeed
  update public.guest_participants gp
  set last_seen_at = now()
  where gp.id = p_guest_id;

  -- 6. Return guest session metadata
  return query select
    v_guest.id,
    v_guest.studio_id,
    v_studio.name,
    v_guest.display_name,
    v_guest.status,
    v_guest.joined_at;
end;
$$;

-- Explicitly revoke all privileges from public, anon, authenticated
revoke all on function public.get_guest_session(uuid, text) from public, anon, authenticated;

-- Grant execution strictly to anon and authenticated roles for guest validation
grant execute on function public.get_guest_session(uuid, text) to anon, authenticated;
