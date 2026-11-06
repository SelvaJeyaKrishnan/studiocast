-- ====================================================================
-- StudioCast: Database Schema & Row Level Security for Projects
-- Idempotent & Safe to Rerun
-- ====================================================================

-- 1. Create Public Projects Table
create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text default '' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index user_id for high-performance user project lookups
create index if not exists idx_projects_user_id on public.projects (user_id);

-- 2. Enable Row Level Security (RLS)
alter table public.projects enable row level security;

-- 3. Idempotent RLS Policies

-- Policy 1: Users can view only their own projects
drop policy if exists "Users can view own projects" on public.projects;
create policy "Users can view own projects"
  on public.projects
  for select
  using ((select auth.uid()) = user_id);

-- Policy 2: Users can insert their own projects
drop policy if exists "Users can insert own projects" on public.projects;
create policy "Users can insert own projects"
  on public.projects
  for insert
  with check ((select auth.uid()) = user_id);

-- Policy 3: Users can update only their own projects
drop policy if exists "Users can update own projects" on public.projects;
create policy "Users can update own projects"
  on public.projects
  for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Policy 4: Users can delete only their own projects
drop policy if exists "Users can delete own projects" on public.projects;
create policy "Users can delete own projects"
  on public.projects
  for delete
  using ((select auth.uid()) = user_id);

-- 4. Automatically update updated_at timestamp on projects update
drop trigger if exists on_projects_updated on public.projects;
create trigger on_projects_updated
  before update on public.projects
  for each row execute function public.handle_updated_at();
