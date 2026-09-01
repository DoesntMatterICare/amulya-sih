create extension if not exists pgcrypto;

alter table public.profiles add column if not exists bio text not null default '';
alter table public.profiles add column if not exists headline text not null default '';
alter table public.profiles add column if not exists location text not null default '';
alter table public.profiles add column if not exists is_public boolean not null default true;

alter table public.communities add column if not exists career_path_id uuid references public.career_paths(id) on delete set null;

create table if not exists public.community_skills (
  community_id uuid not null references public.communities(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  primary key (community_id, skill_id)
);

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text not null default '',
  instructions text not null default '',
  difficulty text not null default 'beginner' check (difficulty in ('beginner','intermediate','advanced')),
  duration_minutes integer not null default 60 check (duration_minutes between 5 and 1440),
  reward_text text not null default 'Journey badge',
  career_path_id uuid references public.career_paths(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists challenges_career_active_idx on public.challenges(career_path_id, is_active);

create table if not exists public.user_challenge_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  status text not null default 'started' check (status in ('started','completed')),
  reflection text not null default '',
  submission_url text,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, challenge_id)
);
create index if not exists user_challenge_progress_user_idx on public.user_challenge_progress(user_id, updated_at desc);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 180),
  description text not null check (char_length(description) between 10 and 5000),
  career_path_id uuid references public.career_paths(id) on delete set null,
  project_url text,
  image_url text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists projects_public_created_idx on public.projects(is_public, created_at desc);
create index if not exists projects_user_created_idx on public.projects(user_id, created_at desc);

create table if not exists public.project_skills (
  project_id uuid not null references public.projects(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  primary key (project_id, skill_id)
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname='projects_profile_fk') then
    alter table public.projects add constraint projects_profile_fk foreign key (user_id) references public.profiles(user_id) on delete cascade;
  end if;
end $$;

create table if not exists public.badges (
  id text primary key,
  title text unique not null,
  description text not null default '',
  icon text not null default '✦'
);

create table if not exists public.user_badges (
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id text not null references public.badges(id) on delete cascade,
  source_type text not null default '',
  source_id text,
  awarded_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);
create index if not exists user_badges_user_idx on public.user_badges(user_id, awarded_at desc);

create or replace function public.set_luma_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists challenges_updated_at on public.challenges;
create trigger challenges_updated_at before update on public.challenges for each row execute procedure public.set_luma_updated_at();
drop trigger if exists projects_updated_at on public.projects;
create trigger projects_updated_at before update on public.projects for each row execute procedure public.set_luma_updated_at();
drop trigger if exists challenge_progress_updated_at on public.user_challenge_progress;
create trigger challenge_progress_updated_at before update on public.user_challenge_progress for each row execute procedure public.set_luma_updated_at();

insert into public.badges (id,title,description,icon) values
  ('first-resource','First Step','Completed a first learning resource.','🌱'),
  ('first-project','Project Builder','Published a first student project.','🚀'),
  ('first-challenge','Challenge Complete','Completed a first weekly challenge.','🏆'),
  ('community-contributor','Community Contributor','Published a first community discussion.','👥')
on conflict (id) do update set title=excluded.title, description=excluded.description, icon=excluded.icon;

create or replace function public.sync_project_achievements()
returns trigger language plpgsql security definer set search_path=public as $$
declare target_user uuid;
begin
  target_user := coalesce(new.user_id, old.user_id);
  insert into public.user_progress(user_id, completed_projects)
  values (target_user, (select count(*) from public.projects where user_id=target_user))
  on conflict (user_id) do update set completed_projects=excluded.completed_projects, updated_at=now();
  if tg_op <> 'DELETE' then
    insert into public.user_badges(user_id,badge_id,source_type,source_id)
    values (target_user,'first-project','project',new.id::text) on conflict do nothing;
  end if;
  return coalesce(new,old);
end; $$;
drop trigger if exists projects_sync_achievements on public.projects;
create trigger projects_sync_achievements after insert or update or delete on public.projects for each row execute procedure public.sync_project_achievements();

create or replace function public.sync_challenge_achievements()
returns trigger language plpgsql security definer set search_path=public as $$
declare target_user uuid;
begin
  target_user := coalesce(new.user_id, old.user_id);
  insert into public.user_progress(user_id, completed_challenges)
  values (target_user, (select count(*) from public.user_challenge_progress where user_id=target_user and status='completed'))
  on conflict (user_id) do update set completed_challenges=excluded.completed_challenges, updated_at=now();
  if tg_op <> 'DELETE' and new.status='completed' then
    insert into public.user_badges(user_id,badge_id,source_type,source_id)
    values (target_user,'first-challenge','challenge',new.challenge_id::text) on conflict do nothing;
  end if;
  return coalesce(new,old);
end; $$;
drop trigger if exists challenge_progress_sync_achievements on public.user_challenge_progress;
create trigger challenge_progress_sync_achievements after insert or update or delete on public.user_challenge_progress for each row execute procedure public.sync_challenge_achievements();

create or replace function public.award_resource_badge()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status='completed' then
    insert into public.user_badges(user_id,badge_id,source_type,source_id)
    values (new.user_id,'first-resource','resource',new.resource_id) on conflict do nothing;
  end if;
  return new;
end; $$;
drop trigger if exists resource_progress_award_badge on public.user_resource_progress;
create trigger resource_progress_award_badge after insert or update on public.user_resource_progress for each row execute procedure public.award_resource_badge();

create or replace function public.award_community_badge()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.user_id is not null then
    insert into public.user_badges(user_id,badge_id,source_type,source_id)
    values (new.user_id,'community-contributor','post',new.id::text) on conflict do nothing;
  end if;
  return new;
end; $$;
drop trigger if exists discovery_post_award_badge on public.discovery_posts;
create trigger discovery_post_award_badge after insert on public.discovery_posts for each row execute procedure public.award_community_badge();

update public.communities c set career_path_id=cp.id
from public.career_paths cp where
  (c.slug='ui-ux-design' and cp.slug='ui-ux-designer') or
  (c.slug='graphic-design' and cp.slug='graphic-designer') or
  (c.slug='full-stack-development' and cp.slug='full-stack-developer') or
  (c.slug='ai-engineering' and cp.slug='machine-learning-engineer') or
  (c.slug='data-science' and cp.slug='data-scientist') or
  (c.slug='cybersecurity' and cp.slug='cybersecurity-analyst') or
  (c.slug in ('product-designers','ux-researchers','design-mentors') and cp.slug='ui-ux-designer');

insert into public.community_skills(community_id,skill_id)
select distinct c.id,s.id from public.communities c
join public.career_paths cp on cp.id=c.career_path_id
join public.career_path_skills cps on cps.career_path_id=cp.id
join public.skills s on s.id=cps.skill_id
on conflict do nothing;

insert into public.challenges(slug,title,description,instructions,difficulty,duration_minutes,reward_text,career_path_id)
select 'ui-ux-login-redesign','Redesign a Login Experience','Improve the login flow of an app you use.','Create a low-fidelity flow, explain two usability decisions, and share an optional prototype link.','beginner',120,'Journey XP + Challenge Complete badge',id from public.career_paths where slug='ui-ux-designer'
on conflict (slug) do update set title=excluded.title,description=excluded.description,instructions=excluded.instructions,career_path_id=excluded.career_path_id;
insert into public.challenges(slug,title,description,instructions,difficulty,duration_minutes,reward_text,career_path_id)
select 'frontend-accessible-landing','Build an Accessible Landing Page','Create a responsive landing page with keyboard-friendly interactions.','Share a live link or repository and reflect on one accessibility improvement.','beginner',150,'Journey XP + Challenge Complete badge',id from public.career_paths where slug='frontend-engineer'
on conflict (slug) do update set title=excluded.title,description=excluded.description,instructions=excluded.instructions,career_path_id=excluded.career_path_id;
insert into public.challenges(slug,title,description,instructions,difficulty,duration_minutes,reward_text,career_path_id)
select 'full-stack-feedback-board','Build a Feedback Board','Create a small full-stack feedback board with persisted entries.','Share a repository or deployment and describe your data model.','intermediate',180,'Journey XP + Challenge Complete badge',id from public.career_paths where slug='full-stack-developer'
on conflict (slug) do update set title=excluded.title,description=excluded.description,instructions=excluded.instructions,career_path_id=excluded.career_path_id;
insert into public.challenges(slug,title,description,instructions,difficulty,duration_minutes,reward_text,career_path_id)
select 'data-story','Tell a Story with Data','Explore a dataset and communicate one useful finding.','Share a notebook, chart, or short write-up and explain your conclusion.','beginner',120,'Journey XP + Challenge Complete badge',id from public.career_paths where slug='data-scientist'
on conflict (slug) do update set title=excluded.title,description=excluded.description,instructions=excluded.instructions,career_path_id=excluded.career_path_id;
insert into public.challenges(slug,title,description,instructions,difficulty,duration_minutes,reward_text,career_path_id)
select 'ml-model-card','Write a Model Card','Document the intended use, limitations, and evaluation of a simple model.','Share a model card and reflect on one responsible-AI tradeoff.','intermediate',120,'Journey XP + Challenge Complete badge',id from public.career_paths where slug='machine-learning-engineer'
on conflict (slug) do update set title=excluded.title,description=excluded.description,instructions=excluded.instructions,career_path_id=excluded.career_path_id;
insert into public.challenges(slug,title,description,instructions,difficulty,duration_minutes,reward_text,career_path_id)
select 'security-threat-model','Threat Model a Student App','Identify assets, threats, and mitigations for a student-facing app.','Submit a simple threat table and explain your highest-priority mitigation.','beginner',90,'Journey XP + Challenge Complete badge',id from public.career_paths where slug='cybersecurity-analyst'
on conflict (slug) do update set title=excluded.title,description=excluded.description,instructions=excluded.instructions,career_path_id=excluded.career_path_id;
insert into public.challenges(slug,title,description,instructions,difficulty,duration_minutes,reward_text,career_path_id)
select 'product-prioritization','Prioritize a Product Backlog','Turn user feedback into a focused first release.','Share five backlog items, your prioritization method, and a short reflection.','beginner',90,'Journey XP + Challenge Complete badge',id from public.career_paths where slug='product-manager'
on conflict (slug) do update set title=excluded.title,description=excluded.description,instructions=excluded.instructions,career_path_id=excluded.career_path_id;
insert into public.challenges(slug,title,description,instructions,difficulty,duration_minutes,reward_text,career_path_id)
select 'brand-system','Create a Mini Brand System','Define a compact visual system for a student project.','Share color, type, and logo choices with a brief rationale.','beginner',120,'Journey XP + Challenge Complete badge',id from public.career_paths where slug='graphic-designer'
on conflict (slug) do update set title=excluded.title,description=excluded.description,instructions=excluded.instructions,career_path_id=excluded.career_path_id;

insert into public.projects(id,user_id,title,description,career_path_id,project_url,is_public)
select '44444444-4444-4444-8444-444444444444',u.id,'Campus Companion App','A student-focused planning concept that brings class schedules, task priorities, and campus resources into one accessible flow.',cp.id,'https://github.com/',true
from auth.users u cross join public.career_paths cp
where u.email='luma.e2e.20260831@outlook.com' and cp.slug='ui-ux-designer'
on conflict (id) do update set title=excluded.title,description=excluded.description,career_path_id=excluded.career_path_id,is_public=true;
insert into public.projects(id,user_id,title,description,career_path_id,project_url,is_public)
select '55555555-5555-4555-8555-555555555555',u.id,'Accessible Portfolio Starter','A responsive portfolio starter with semantic navigation, keyboard-friendly controls, and accessible project cards.',cp.id,'https://github.com/',true
from auth.users u cross join public.career_paths cp
where u.email='luma.e2e.20260831@outlook.com' and cp.slug='frontend-engineer'
on conflict (id) do update set title=excluded.title,description=excluded.description,career_path_id=excluded.career_path_id,is_public=true;
insert into public.project_skills(project_id,skill_id)
select p.id,s.id from public.projects p join public.skills s on s.slug in ('prototyping','accessibility')
where p.id='44444444-4444-4444-8444-444444444444' on conflict do nothing;
insert into public.project_skills(project_id,skill_id)
select p.id,s.id from public.projects p join public.skills s on s.slug in ('javascript','accessibility')
where p.id='55555555-5555-4555-8555-555555555555' on conflict do nothing;

alter table public.community_skills enable row level security;
alter table public.challenges enable row level security;
alter table public.user_challenge_progress enable row level security;
alter table public.projects enable row level security;
alter table public.project_skills enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;

drop policy if exists "public read profiles" on public.profiles;
create policy "public read profiles" on public.profiles for select to anon,authenticated using (is_public or (select auth.uid())=user_id);
drop policy if exists "public read community skills" on public.community_skills;
create policy "public read community skills" on public.community_skills for select to anon,authenticated using (true);
drop policy if exists "public read challenges" on public.challenges;
create policy "public read challenges" on public.challenges for select to anon,authenticated using (is_active);
drop policy if exists "select own challenge progress" on public.user_challenge_progress;
drop policy if exists "insert own challenge progress" on public.user_challenge_progress;
drop policy if exists "update own challenge progress" on public.user_challenge_progress;
create policy "select own challenge progress" on public.user_challenge_progress for select to authenticated using ((select auth.uid())=user_id);
create policy "insert own challenge progress" on public.user_challenge_progress for insert to authenticated with check ((select auth.uid())=user_id);
create policy "update own challenge progress" on public.user_challenge_progress for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists "public read projects" on public.projects;
drop policy if exists "insert own project" on public.projects;
drop policy if exists "update own project" on public.projects;
drop policy if exists "delete own project" on public.projects;
create policy "public read projects" on public.projects for select to anon,authenticated using (is_public or (select auth.uid())=user_id);
create policy "insert own project" on public.projects for insert to authenticated with check ((select auth.uid())=user_id);
create policy "update own project" on public.projects for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "delete own project" on public.projects for delete to authenticated using ((select auth.uid())=user_id);
drop policy if exists "public read project skills" on public.project_skills;
drop policy if exists "owner manage project skills" on public.project_skills;
create policy "public read project skills" on public.project_skills for select to anon,authenticated using (true);
create policy "owner manage project skills" on public.project_skills for all to authenticated using (exists(select 1 from public.projects p where p.id=project_id and p.user_id=(select auth.uid()))) with check (exists(select 1 from public.projects p where p.id=project_id and p.user_id=(select auth.uid())));
drop policy if exists "public read badges" on public.badges;
create policy "public read badges" on public.badges for select to anon,authenticated using (true);
drop policy if exists "public read user badges" on public.user_badges;
create policy "public read user badges" on public.user_badges for select to anon,authenticated using (true);

grant select on public.profiles,public.community_skills,public.challenges,public.projects,public.project_skills,public.badges,public.user_badges to anon;
grant select on public.community_skills,public.challenges,public.badges,public.user_badges to authenticated;
grant select,insert,update on public.user_challenge_progress to authenticated;
grant select,insert,update,delete on public.projects,public.project_skills to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
  ('avatars','avatars',true,5242880,array['image/jpeg','image/png','image/webp','image/gif']),
  ('project-images','project-images',true,5242880,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "public read luma media" on storage.objects;
drop policy if exists "upload own luma media" on storage.objects;
drop policy if exists "update own luma media" on storage.objects;
drop policy if exists "delete own luma media" on storage.objects;
create policy "public read luma media" on storage.objects for select to anon,authenticated using (bucket_id in ('avatars','project-images'));
create policy "upload own luma media" on storage.objects for insert to authenticated with check (bucket_id in ('avatars','project-images') and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "update own luma media" on storage.objects for update to authenticated using (bucket_id in ('avatars','project-images') and owner_id=(select auth.uid())::text) with check (bucket_id in ('avatars','project-images') and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "delete own luma media" on storage.objects for delete to authenticated using (bucket_id in ('avatars','project-images') and owner_id=(select auth.uid())::text);