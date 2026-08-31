-- =====================================================================
--  Programmer's Hub — Supabase schema
--  Run this whole file in Supabase → SQL Editor.
--  Safe to re-run: every statement is IF NOT EXISTS / DROP POLICY IF EXISTS.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- profiles: one row per signed-in user (id = auth.users.id)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text,
  name          text,
  title         text,
  location      text,
  bio           text,
  skills        text[]        default '{}',
  avatar_url    text,
  github        text,
  linkedin      text,
  website       text,
  whatsapp      text,
  hourly_rate   text,
  experience    text,
  rating        numeric(2, 1) default 0,
  verified      boolean       default false,
  featured      boolean       default false,
  open_to_work  boolean       default true,
  created_at    timestamptz   default now(),
  updated_at    timestamptz   default now()
);

-- ---------------------------------------------------------------------
-- projects: portfolio items published by members
-- ---------------------------------------------------------------------
create table if not exists public.projects (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users (id) on delete cascade,
  author_name  text,
  title        text        not null,
  description  text,
  tags         text[]      default '{}',
  repo_url     text,
  live_url     text,
  cover_url    text,
  featured     boolean     default false,
  created_at   timestamptz default now()
);

create index if not exists projects_user_id_idx on public.projects (user_id);
create index if not exists projects_created_at_idx on public.projects (created_at desc);

-- ---------------------------------------------------------------------
-- jobs: hiring board listings
-- ---------------------------------------------------------------------
create table if not exists public.jobs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users (id) on delete cascade,
  title          text        not null,
  company        text,
  location       text        default 'Remote',
  type           text        default 'Contract',
  level          text,
  budget         text,
  skills         text[]      default '{}',
  description    text,
  contact_email  text,
  created_at     timestamptz default now()
);

create index if not exists jobs_created_at_idx on public.jobs (created_at desc);

-- ---------------------------------------------------------------------
-- applications: developer applications to a role
-- ---------------------------------------------------------------------
create table if not exists public.applications (
  id               uuid primary key default gen_random_uuid(),
  job_id           uuid references public.jobs (id) on delete cascade,
  applicant_name   text,
  applicant_email  text,
  portfolio_url    text,
  message          text,
  created_at       timestamptz default now()
);

-- =====================================================================
--  Row Level Security
-- =====================================================================
alter table public.profiles     enable row level security;
alter table public.projects     enable row level security;
alter table public.jobs         enable row level security;
alter table public.applications enable row level security;

-- profiles: public reads, self writes ---------------------------------
drop policy if exists "Profiles are public" on public.profiles;
create policy "Profiles are public"
  on public.profiles for select
  using (true);

drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- projects: public reads, owner writes --------------------------------
drop policy if exists "Projects are public" on public.projects;
create policy "Projects are public"
  on public.projects for select
  using (true);

drop policy if exists "Users insert own projects" on public.projects;
create policy "Users insert own projects"
  on public.projects for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own projects" on public.projects;
create policy "Users update own projects"
  on public.projects for update
  using (auth.uid() = user_id);

drop policy if exists "Users delete own projects" on public.projects;
create policy "Users delete own projects"
  on public.projects for delete
  using (auth.uid() = user_id);

-- jobs: public reads, owner writes ------------------------------------
drop policy if exists "Jobs are public" on public.jobs;
create policy "Jobs are public"
  on public.jobs for select
  using (true);

drop policy if exists "Users insert own jobs" on public.jobs;
create policy "Users insert own jobs"
  on public.jobs for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own jobs" on public.jobs;
create policy "Users update own jobs"
  on public.jobs for update
  using (auth.uid() = user_id);

drop policy if exists "Users delete own jobs" on public.jobs;
create policy "Users delete own jobs"
  on public.jobs for delete
  using (auth.uid() = user_id);

-- applications: anyone can apply, only the job owner can read ---------
drop policy if exists "Anyone can apply" on public.applications;
create policy "Anyone can apply"
  on public.applications for insert
  with check (true);

drop policy if exists "Job owners read applications" on public.applications;
create policy "Job owners read applications"
  on public.applications for select
  using (
    exists (
      select 1 from public.jobs
      where jobs.id = applications.job_id
        and jobs.user_id = auth.uid()
    )
  );

-- =====================================================================
--  Storage: public avatars bucket
--  (Storage policies live in the storage schema)
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Avatar images are public" on storage.objects;
create policy "Avatar images are public"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Users upload own avatar" on storage.objects;
create policy "Users upload own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users update own avatar" on storage.objects;
create policy "Users update own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- =====================================================================
--  Optional: mark yourself verified / featured
--  update public.profiles set verified = true, featured = true where email = 'alphaluwangula@proton.me';
-- =====================================================================
