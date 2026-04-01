begin;

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text,
  stage text,
  status text not null default 'active',
  founder_name text,
  founder_contact text,
  description text,
  source text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sourcing_results (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  platform text not null,
  url text,
  title text,
  summary text,
  raw_data jsonb not null default '{}'::jsonb,
  sourced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  match_type text,
  confidence_score numeric(3, 2) check (confidence_score is null or (confidence_score >= 0 and confidence_score <= 1)),
  rationale text,
  matched_with text,
  status text not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  status text not null default 'active',
  next_followup_at timestamptz,
  last_activity text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_projects_status on public.projects(status);
create index if not exists idx_projects_created_at on public.projects(created_at desc);
create index if not exists idx_sourcing_results_project_id on public.sourcing_results(project_id);
create index if not exists idx_sourcing_results_sourced_at on public.sourcing_results(sourced_at desc);
create index if not exists idx_matches_project_id on public.matches(project_id);
create index if not exists idx_matches_status on public.matches(status);
create index if not exists idx_matches_created_at on public.matches(created_at desc);
create index if not exists idx_portfolio_items_project_id on public.portfolio_items(project_id);
create index if not exists idx_portfolio_items_next_followup_at on public.portfolio_items(next_followup_at);

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
before update on public.projects
for each row
execute function public.set_updated_at();

drop trigger if exists set_portfolio_items_updated_at on public.portfolio_items;
create trigger set_portfolio_items_updated_at
before update on public.portfolio_items
for each row
execute function public.set_updated_at();

grant usage on schema public to anon, authenticated, service_role;

revoke all privileges on public.projects from public, anon, authenticated;
grant select on public.projects to anon, authenticated;
grant all privileges on public.projects to service_role;
alter table public.projects enable row level security;
drop policy if exists "anon read projects" on public.projects;
create policy "anon read projects"
on public.projects
for select
to anon, authenticated
using (true);
drop policy if exists "service role full access projects" on public.projects;
create policy "service role full access projects"
on public.projects
for all
to service_role
using (true)
with check (true);

revoke all privileges on public.sourcing_results from public, anon, authenticated;
grant select on public.sourcing_results to anon, authenticated;
grant all privileges on public.sourcing_results to service_role;
alter table public.sourcing_results enable row level security;
drop policy if exists "anon read sourcing_results" on public.sourcing_results;
create policy "anon read sourcing_results"
on public.sourcing_results
for select
to anon, authenticated
using (true);
drop policy if exists "service role full access sourcing_results" on public.sourcing_results;
create policy "service role full access sourcing_results"
on public.sourcing_results
for all
to service_role
using (true)
with check (true);

revoke all privileges on public.matches from public, anon, authenticated;
grant select on public.matches to anon, authenticated;
grant all privileges on public.matches to service_role;
alter table public.matches enable row level security;
drop policy if exists "anon read matches" on public.matches;
create policy "anon read matches"
on public.matches
for select
to anon, authenticated
using (true);
drop policy if exists "service role full access matches" on public.matches;
create policy "service role full access matches"
on public.matches
for all
to service_role
using (true)
with check (true);

revoke all privileges on public.portfolio_items from public, anon, authenticated;
grant select on public.portfolio_items to anon, authenticated;
grant all privileges on public.portfolio_items to service_role;
alter table public.portfolio_items enable row level security;
drop policy if exists "anon read portfolio_items" on public.portfolio_items;
create policy "anon read portfolio_items"
on public.portfolio_items
for select
to anon, authenticated
using (true);
drop policy if exists "service role full access portfolio_items" on public.portfolio_items;
create policy "service role full access portfolio_items"
on public.portfolio_items
for all
to service_role
using (true)
with check (true);

commit;
