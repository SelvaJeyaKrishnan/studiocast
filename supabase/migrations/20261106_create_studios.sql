-- ====================================================================
-- StudioCast: Database Schema, Ownership Integrity & RLS for Studios
-- Migration: 20261106_create_studios.sql
-- Idempotent & Safe to Rerun
-- ====================================================================

-- 1. Create Public Studios Table
create table if not exists public.studios (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete set null,
  name text not null,
  description text default '' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index foreign keys for performance
create index if not exists idx_studios_owner_id on public.studios (owner_id);
create index if not exists idx_studios_project_id on public.studios (project_id);

-- 2. Enable Row Level Security (RLS)
alter table public.studios enable row level security;

-- 3. Idempotent RLS Policies

-- Policy 1: Users can view only their own studios
drop policy if exists "Users can view own studios" on public.studios;
create policy "Users can view own studios"
  on public.studios
  for select
  using ((select auth.uid()) = owner_id);

-- Policy 2: Users can insert their own studios
drop policy if exists "Users can insert own studios" on public.studios;
create policy "Users can insert own studios"
  on public.studios
  for insert
  with check ((select auth.uid()) = owner_id);

-- Policy 3: Users can update only their own studios
drop policy if exists "Users can update own studios" on public.studios;
create policy "Users can update own studios"
  on public.studios
  for update
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

-- Policy 4: Users can delete only their own studios
drop policy if exists "Users can delete own studios" on public.studios;
create policy "Users can delete own studios"
  on public.studios
  for delete
  using ((select auth.uid()) = owner_id);

-- 4. Database-Level Validation: Studio and Project Ownership Integrity
-- Prevents a user from associating their studio with another user's project
create or replace function public.validate_studio_project_ownership()
returns trigger as $$
declare
  project_owner uuid;
begin
  -- If project_id is NULL, no project association is made; allow operation
  if NEW.project_id is null then
    return NEW;
  end if;

  -- Lookup the project's owner
  select user_id into project_owner
  from public.projects
  where id = NEW.project_id;

  -- If referenced project does not exist
  if project_owner is null then
    raise exception 'Referenced project does not exist or has been deleted.'
      using errcode = 'foreign_key_violation';
  end if;

  -- If project belongs to a different user, reject
  if project_owner <> NEW.owner_id then
    raise exception 'Unauthorized project association: Studio owner (%) does not own project (%).',
      NEW.owner_id, NEW.project_id
      using errcode = '42501'; -- insufficient_privilege
  end if;

  return NEW;
end;
$$ language plpgsql security invoker;

-- Attach validation trigger on studios before INSERT or UPDATE
drop trigger if exists on_studio_project_validate on public.studios;
create trigger on_studio_project_validate
  before insert or update of project_id, owner_id on public.studios
  for each row execute function public.validate_studio_project_ownership();

-- 5. Automatically update updated_at timestamp on studios update
drop trigger if exists on_studios_updated on public.studios;
create trigger on_studios_updated
  before update on public.studios
  for each row execute function public.handle_updated_at();
