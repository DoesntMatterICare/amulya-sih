create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text not null default '',
  active_career_name text not null default '',
  assessment_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.career_paths (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text unique not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text unique not null
);

create table if not exists public.career_path_skills (
  career_path_id uuid not null references public.career_paths(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  primary key (career_path_id, skill_id)
);

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  questions jsonb not null default '[]'::jsonb,
  answers jsonb not null default '{}'::jsonb,
  insights jsonb not null default '[]'::jsonb,
  selected_path_id uuid references public.career_paths(id) on delete set null,
  selected_path text not null default '',
  raw_result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists assessments_user_created_idx on public.assessments(user_id, created_at desc);

create table if not exists public.career_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  career_path_id uuid references public.career_paths(id) on delete set null,
  career_name text not null,
  rank smallint not null check (rank between 1 and 3),
  match_percent smallint not null check (match_percent between 0 and 100),
  rationale text not null default '',
  skills jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (assessment_id, rank)
);
create index if not exists career_recommendations_user_idx on public.career_recommendations(user_id);

create table if not exists public.career_roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assessment_id uuid references public.assessments(id) on delete set null,
  career_path_id uuid references public.career_paths(id) on delete set null,
  career_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists career_roadmaps_user_active_idx on public.career_roadmaps(user_id, is_active, created_at desc);

create table if not exists public.roadmap_days (
  id uuid primary key default gen_random_uuid(),
  roadmap_id uuid not null references public.career_roadmaps(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  day_number smallint not null check (day_number between 1 and 7),
  title text not null,
  objective text not null default '',
  activity text not null default '',
  duration_minutes integer not null default 30 check (duration_minutes between 5 and 480),
  status text not null default 'upcoming' check (status in ('upcoming', 'current', 'completed')),
  unique (roadmap_id, day_number)
);
create index if not exists roadmap_days_user_idx on public.roadmap_days(user_id, roadmap_id);

create table if not exists public.learning_resources (
  id text primary key,
  title text not null,
  concept text not null,
  resource_type text not null default 'article',
  minutes integer not null default 0 check (minutes >= 0),
  url text,
  created_at timestamptz not null default now()
);

create table if not exists public.resource_career_paths (
  resource_id text not null references public.learning_resources(id) on delete cascade,
  career_path_id uuid not null references public.career_paths(id) on delete cascade,
  primary key (resource_id, career_path_id)
);

create table if not exists public.user_resource_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_id text not null references public.learning_resources(id) on delete cascade,
  status text not null default 'started' check (status in ('started', 'completed')),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, resource_id)
);
create index if not exists user_resource_progress_user_idx on public.user_resource_progress(user_id);

create table if not exists public.user_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  completed_resource_ids text[] not null default '{}',
  completed_weekly_tasks text[] not null default '{}',
  completed_projects integer not null default 0 check (completed_projects >= 0),
  completed_challenges integer not null default 0 check (completed_challenges >= 0),
  completed_certificates integer not null default 0 check (completed_certificates >= 0),
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  last_completed_date date,
  updated_at timestamptz not null default now()
);

create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text unique not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.community_memberships (
  user_id uuid not null references auth.users(id) on delete cascade,
  community_id uuid not null references public.communities(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (user_id, community_id)
);

create table if not exists public.discovery_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  community_id uuid not null references public.communities(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 180),
  body text not null check (char_length(body) between 1 and 5000),
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists discovery_posts_community_created_idx on public.discovery_posts(community_id, created_at desc);
create index if not exists discovery_posts_user_created_idx on public.discovery_posts(user_id, created_at desc);

create table if not exists public.saved_posts (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.discovery_posts(id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table if not exists public.chat_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists chat_sessions_user_updated_idx on public.chat_sessions(user_id, updated_at desc);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 8000),
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_session_created_idx on public.chat_messages(user_id, session_id, created_at);

insert into public.career_paths (slug, name) values
  ('ui-ux-designer', 'UI/UX Designer'),
  ('product-manager', 'Product Manager'),
  ('frontend-engineer', 'Frontend Engineer'),
  ('full-stack-developer', 'Full Stack Developer'),
  ('data-scientist', 'Data Scientist'),
  ('machine-learning-engineer', 'Machine Learning Engineer'),
  ('cybersecurity-analyst', 'Cybersecurity Analyst'),
  ('graphic-designer', 'Graphic Designer')
on conflict (slug) do nothing;

insert into public.communities (slug, name) values
  ('ui-ux-design', 'UI/UX Design'),
  ('graphic-design', 'Graphic Design'),
  ('full-stack-development', 'Full Stack Development'),
  ('ai-engineering', 'AI Engineering'),
  ('data-science', 'Data Science'),
  ('cybersecurity', 'Cybersecurity'),
  ('product-designers', 'Product Designers'),
  ('ux-researchers', 'UX Researchers'),
  ('design-mentors', 'Design Mentors')
on conflict (slug) do nothing;

create or replace function public.handle_new_luma_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (user_id) do nothing;
  insert into public.user_progress (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_luma on auth.users;
create trigger on_auth_user_created_luma
after insert on auth.users
for each row execute procedure public.handle_new_luma_user();

alter table public.profiles enable row level security;
alter table public.assessments enable row level security;
alter table public.career_recommendations enable row level security;
alter table public.career_roadmaps enable row level security;
alter table public.roadmap_days enable row level security;
alter table public.user_resource_progress enable row level security;
alter table public.user_progress enable row level security;
alter table public.community_memberships enable row level security;
alter table public.discovery_posts enable row level security;
alter table public.saved_posts enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.career_paths enable row level security;
alter table public.skills enable row level security;
alter table public.career_path_skills enable row level security;
alter table public.learning_resources enable row level security;
alter table public.resource_career_paths enable row level security;
alter table public.communities enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles','assessments','career_recommendations','career_roadmaps','roadmap_days',
    'user_resource_progress','user_progress','community_memberships','saved_posts','chat_sessions','chat_messages'
  ] loop
    execute format('drop policy if exists "select own" on public.%I', table_name);
    execute format('drop policy if exists "insert own" on public.%I', table_name);
    execute format('drop policy if exists "update own" on public.%I', table_name);
    execute format('drop policy if exists "delete own" on public.%I', table_name);
    execute format('create policy "select own" on public.%I for select to authenticated using ((select auth.uid()) = user_id)', table_name);
    execute format('create policy "insert own" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', table_name);
    execute format('create policy "update own" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', table_name);
    execute format('create policy "delete own" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', table_name);
  end loop;
end $$;

drop policy if exists "authenticated read posts" on public.discovery_posts;
drop policy if exists "insert own" on public.discovery_posts;
drop policy if exists "update own" on public.discovery_posts;
drop policy if exists "delete own" on public.discovery_posts;
create policy "authenticated read posts" on public.discovery_posts for select to authenticated using (true);
create policy "insert own" on public.discovery_posts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "update own" on public.discovery_posts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "delete own" on public.discovery_posts for delete to authenticated using ((select auth.uid()) = user_id);

do $$
declare table_name text;
begin
  foreach table_name in array array['career_paths','skills','career_path_skills','learning_resources','resource_career_paths','communities'] loop
    execute format('drop policy if exists "authenticated catalog read" on public.%I', table_name);
    execute format('create policy "authenticated catalog read" on public.%I for select to authenticated using (true)', table_name);
  end loop;
end $$;

grant usage on schema public to authenticated;
grant select on public.career_paths, public.skills, public.career_path_skills, public.learning_resources, public.resource_career_paths, public.communities to authenticated;
grant select, insert, update, delete on public.profiles, public.assessments, public.career_recommendations, public.career_roadmaps, public.roadmap_days, public.user_resource_progress, public.user_progress, public.community_memberships, public.discovery_posts, public.saved_posts, public.chat_sessions, public.chat_messages to authenticated;