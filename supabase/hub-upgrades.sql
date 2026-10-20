-- =====================================================================
--  Programmer's Hub — Hub dashboard upgrades (safe to re-run)
--
--  Paste this whole file into Supabase → SQL Editor → Run.
--  It is the incremental migration for the realtime / verified-metrics /
--  upvotes / sponsored features added to Hub.jsx. The same statements
--  also live in schema.sql, so a fresh setup only needs schema.sql.
--
--  No new tables. No RLS changes: the new columns ride on the existing
--  public-read / owner-write policies for profiles, projects and jobs.
-- =====================================================================

-- 1. profiles: verified GitHub metrics, availability detail, spotlight flag
alter table public.profiles add column if not exists github_metrics    jsonb   default '[]'::jsonb;
alter table public.profiles add column if not exists availability_note text;
alter table public.profiles add column if not exists available_from    date;
alter table public.profiles add column if not exists sponsored         boolean default false;

-- 2. projects: server-side upvote score (the client overlays local votes)
alter table public.projects add column if not exists upvotes integer not null default 0;

-- 3. jobs: paid / spotlighted placements (animated sponsored border)
alter table public.jobs add column if not exists sponsored boolean default false;

-- 4. Realtime: stream profile / project / job changes to the Hub
--    dashboard (`useHubRealtime`). Guarded so re-running never errors
--    when the tables are already in the publication.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles'
    ) then
      alter publication supabase_realtime add table public.profiles;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'projects'
    ) then
      alter publication supabase_realtime add table public.projects;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'jobs'
    ) then
      alter publication supabase_realtime add table public.jobs;
    end if;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Optional examples (uncomment, edit, run once)
-- ---------------------------------------------------------------------
-- Verified GitHub metrics + availability for one developer:
-- update public.profiles
-- set github_metrics = '[{"language":"JavaScript","percent":60},{"language":"Go","percent":40}]'::jsonb,
--     availability_note = 'Available for contract starting Nov 1',
--     available_from = '2026-11-01',
--     sponsored = true
-- where email = 'you@example.com';
--
-- Spotlight a job and seed a project's upvotes:
-- update public.jobs set sponsored = true where title ilike '%senior%';
-- update public.projects set upvotes = 342 where title ilike '%paybridge%';

-- ---------------------------------------------------------------------
-- Verify: expect github_metrics / availability_note / available_from /
-- sponsored on profiles, upvotes on projects, sponsored on jobs —
-- and all three tables listed under the supabase_realtime publication.
-- ---------------------------------------------------------------------
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and column_name in ('github_metrics', 'availability_note', 'available_from', 'sponsored', 'upvotes')
order by table_name, column_name;

select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
order by tablename;
