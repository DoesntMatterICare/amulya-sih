alter table public.learning_resources add column if not exists description text not null default '';
alter table public.learning_resources add column if not exists difficulty text not null default 'beginner';
alter table public.learning_resources add column if not exists is_featured boolean not null default false;
alter table public.learning_resources add column if not exists is_published boolean not null default true;
alter table public.learning_resources add column if not exists updated_at timestamptz not null default now();

alter table public.communities add column if not exists member_count integer not null default 0;

create table if not exists public.resource_skills (
  resource_id text not null references public.learning_resources(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  primary key (resource_id, skill_id)
);

create table if not exists public.roadmap_day_resources (
  roadmap_day_id uuid not null references public.roadmap_days(id) on delete cascade,
  resource_id text not null references public.learning_resources(id) on delete cascade,
  position smallint not null default 1 check (position between 1 and 10),
  is_required boolean not null default true,
  primary key (roadmap_day_id, resource_id)
);
create index if not exists roadmap_day_resources_resource_idx on public.roadmap_day_resources(resource_id);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.discovery_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_comment_id uuid references public.post_comments(id) on delete cascade,
  author_name text not null default '',
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists post_comments_post_created_idx on public.post_comments(post_id, created_at);
create index if not exists post_comments_parent_idx on public.post_comments(parent_comment_id);

create table if not exists public.community_channels (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  slug text not null,
  name text not null,
  description text not null default '',
  position smallint not null default 1,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (community_id, slug)
);
create index if not exists community_channels_community_idx on public.community_channels(community_id, position);

create table if not exists public.community_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.community_channels(id) on delete cascade,
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reply_to_message_id uuid references public.community_messages(id) on delete set null,
  author_name text not null default '',
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists community_messages_channel_created_idx on public.community_messages(channel_id, created_at desc);
alter table public.community_messages replica identity full;
alter table public.post_comments replica identity full;
alter table public.discovery_posts replica identity full;

create or replace function public.enforce_one_level_comment_reply()
returns trigger
language plpgsql
as $$
declare parent_parent uuid;
declare parent_post uuid;
begin
  if new.parent_comment_id is null then return new; end if;
  select parent_comment_id, post_id into parent_parent, parent_post
  from public.post_comments where id = new.parent_comment_id;
  if parent_post is null or parent_post <> new.post_id then
    raise exception 'Reply parent must belong to the same post';
  end if;
  if parent_parent is not null then
    raise exception 'Only one reply level is supported';
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_one_level_comment_reply_trigger on public.post_comments;
create trigger enforce_one_level_comment_reply_trigger
before insert or update of parent_comment_id, post_id on public.post_comments
for each row execute procedure public.enforce_one_level_comment_reply();

create or replace function public.refresh_community_member_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare target_community uuid;
begin
  if tg_op = 'DELETE' then
    target_community := old.community_id;
  else
    target_community := new.community_id;
  end if;
  update public.communities
  set member_count = (select count(*) from public.community_memberships where community_id = target_community)
  where id = target_community;
  return null;
end;
$$;
drop trigger if exists refresh_community_member_count_trigger on public.community_memberships;
create trigger refresh_community_member_count_trigger
after insert or delete on public.community_memberships
for each row execute procedure public.refresh_community_member_count();
update public.communities community
set member_count = (select count(*) from public.community_memberships membership where membership.community_id = community.id);

insert into public.community_channels (community_id, slug, name, description, position, is_default)
select community.id, channel.slug, channel.name, channel.description, channel.position, channel.is_default
from public.communities community
cross join (values
  ('general', 'general', 'Introductions, questions, and community updates.', 1, true),
  ('feedback', 'feedback', 'Share work and ask for constructive feedback.', 2, false),
  ('opportunities', 'opportunities', 'Collaborations, events, and learning opportunities.', 3, false)
) as channel(slug, name, description, position, is_default)
on conflict (community_id, slug) do update set
  name = excluded.name,
  description = excluded.description,
  position = excluded.position,
  is_default = excluded.is_default;

insert into public.skills (slug, name) values
  ('design-thinking', 'design thinking'),
  ('wireframing', 'wireframing'),
  ('information-architecture', 'information architecture')
on conflict (slug) do nothing;

update public.learning_resources set
  description = case id
    when 'design-thinking-guide' then 'An interactive walkthrough of empathize, define, ideate, prototype, and test.'
    when 'design-thinking-brainstorm' then 'Practice divergent thinking and generate stronger solution directions.'
    when 'user-research-interviews' then 'Prepare unbiased questions and run useful user interviews.'
    when 'user-research-personas' then 'Turn observed behavior patterns into evidence-based personas.'
    when 'user-research-script' then 'Draft a practical interview script with open-ended questions.'
    when 'wireframing-sketching' then 'Build low-fidelity interface layouts quickly with simple shapes.'
    when 'wireframing-tools' then 'Compare modern wireframing tools and efficient layout workflows.'
    when 'wireframing-landing-page' then 'Apply grid and hierarchy principles to a landing-page sketch.'
    when 'ia-card-sorting' then 'Learn open and closed card-sorting methods for content structure.'
    when 'ia-sitemaps' then 'Map page relationships into a clear information hierarchy.'
    when 'visual-design-grids' then 'Use spacing and grid systems to create stronger visual rhythm.'
    when 'visual-design-color' then 'Choose accessible color palettes with semantic roles.'
    when 'prototyping-micro' then 'Use motion to communicate feedback, hierarchy, and system state.'
    when 'prototyping-flow' then 'Connect a focused three-screen flow into a testable prototype.'
    else coalesce(nullif(description, ''), title)
  end,
  difficulty = 'beginner',
  is_featured = id in ('design-thinking-guide','user-research-interviews','wireframing-sketching','prototyping-flow'),
  updated_at = now();

with mapping(resource_id, skill_slug) as (values
  ('design-thinking-guide','design-thinking'),('design-thinking-guide','user-research'),
  ('design-thinking-brainstorm','design-thinking'),('design-thinking-brainstorm','experimentation'),
  ('user-research-interviews','user-research'),('user-research-interviews','communication'),
  ('user-research-personas','user-research'),('user-research-personas','data-analysis'),
  ('user-research-script','user-research'),('user-research-script','communication'),
  ('wireframing-sketching','wireframing'),('wireframing-sketching','interaction-design'),
  ('wireframing-tools','wireframing'),('wireframing-tools','prototyping'),
  ('wireframing-landing-page','wireframing'),('wireframing-landing-page','visual-design'),
  ('ia-card-sorting','information-architecture'),('ia-card-sorting','user-research'),
  ('ia-sitemaps','information-architecture'),('ia-sitemaps','interaction-design'),
  ('visual-design-grids','visual-design'),('visual-design-grids','responsive-design'),
  ('visual-design-color','visual-design'),('visual-design-color','accessibility'),
  ('prototyping-micro','prototyping'),('prototyping-micro','interaction-design'),
  ('prototyping-flow','prototyping'),('prototyping-flow','interaction-design'),
  ('ux-heuristics','interaction-design'),('design-systems','visual-design'),
  ('figma-prototyping','prototyping'),('accessible-ui','accessibility'),
  ('user-research','user-research'),('interaction-patterns','interaction-design'),
  ('visual-hierarchy','visual-design'),('responsive-layouts','responsive-design'),
  ('product-strategy','product-strategy'),('customer-discovery','customer-discovery'),
  ('frontend-foundations','frontend'),('api-design','web-apis'),
  ('data-analysis','data-analysis'),('threat-modeling','threat-modeling')
)
insert into public.resource_skills (resource_id, skill_id)
select mapping.resource_id, skill.id
from mapping join public.skills skill on skill.slug = mapping.skill_slug
join public.learning_resources resource on resource.id = mapping.resource_id
on conflict do nothing;

with career_mapping(resource_id, career_slug) as (values
  ('ux-heuristics','ui-ux-designer'),('design-systems','ui-ux-designer'),('figma-prototyping','ui-ux-designer'),
  ('accessible-ui','ui-ux-designer'),('accessible-ui','frontend-engineer'),('user-research','ui-ux-designer'),
  ('interaction-patterns','ui-ux-designer'),('visual-hierarchy','graphic-designer'),('responsive-layouts','frontend-engineer'),
  ('product-strategy','product-manager'),('customer-discovery','product-manager'),('frontend-foundations','frontend-engineer'),
  ('frontend-foundations','full-stack-developer'),('api-design','full-stack-developer'),('data-analysis','data-scientist'),
  ('threat-modeling','cybersecurity-analyst')
)
insert into public.resource_career_paths (resource_id, career_path_id)
select mapping.resource_id, career.id
from career_mapping mapping join public.career_paths career on career.slug = mapping.career_slug
on conflict do nothing;

with candidates as (
  select roadmap_day.id as roadmap_day_id, resource.id as resource_id, roadmap_day.day_number,
         row_number() over (partition by roadmap_day.id order by resource.is_featured desc, resource.id) as resource_rank,
         count(*) over (partition by roadmap_day.id) as resource_count
  from public.roadmap_days roadmap_day
  join public.career_roadmaps roadmap on roadmap.id = roadmap_day.roadmap_id
  join public.resource_career_paths relation on relation.career_path_id = roadmap.career_path_id
  join public.learning_resources resource on resource.id = relation.resource_id and resource.is_published = true
)
insert into public.roadmap_day_resources (roadmap_day_id, resource_id, position, is_required)
select roadmap_day_id, resource_id, 1, true
from candidates
where resource_rank = ((day_number - 1) % resource_count) + 1
on conflict do nothing;

create or replace function public.complete_roadmap_days_from_resource()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status = 'completed' then
    update public.roadmap_days roadmap_day
    set status = 'completed'
    from public.roadmap_day_resources relation
    where relation.roadmap_day_id = roadmap_day.id
      and relation.resource_id = new.resource_id
      and roadmap_day.user_id = new.user_id;
  end if;
  return new;
end;
$$;
drop trigger if exists complete_roadmap_days_from_resource_trigger on public.user_resource_progress;
create trigger complete_roadmap_days_from_resource_trigger
after insert or update of status on public.user_resource_progress
for each row execute procedure public.complete_roadmap_days_from_resource();

alter table public.resource_skills enable row level security;
alter table public.roadmap_day_resources enable row level security;
alter table public.post_comments enable row level security;
alter table public.community_channels enable row level security;
alter table public.community_messages enable row level security;

drop policy if exists "authenticated catalog read" on public.resource_skills;
create policy "authenticated catalog read" on public.resource_skills for select to authenticated using (true);

drop policy if exists "select own roadmap resources" on public.roadmap_day_resources;
drop policy if exists "insert own roadmap resources" on public.roadmap_day_resources;
create policy "select own roadmap resources" on public.roadmap_day_resources for select to authenticated
using (exists (select 1 from public.roadmap_days day where day.id = roadmap_day_id and day.user_id = (select auth.uid())));
create policy "insert own roadmap resources" on public.roadmap_day_resources for insert to authenticated
with check (exists (select 1 from public.roadmap_days day where day.id = roadmap_day_id and day.user_id = (select auth.uid())));

drop policy if exists "authenticated read comments" on public.post_comments;
drop policy if exists "insert own comments" on public.post_comments;
drop policy if exists "update own comments" on public.post_comments;
drop policy if exists "delete own comments" on public.post_comments;
create policy "authenticated read comments" on public.post_comments for select to authenticated using (true);
create policy "insert own comments" on public.post_comments for insert to authenticated with check (user_id = (select auth.uid()));
create policy "update own comments" on public.post_comments for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "delete own comments" on public.post_comments for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "members read channels" on public.community_channels;
create policy "members read channels" on public.community_channels for select to authenticated
using (exists (select 1 from public.community_memberships membership where membership.community_id = community_channels.community_id and membership.user_id = (select auth.uid())));

drop policy if exists "members read messages" on public.community_messages;
drop policy if exists "members send messages" on public.community_messages;
drop policy if exists "authors update messages" on public.community_messages;
drop policy if exists "authors delete messages" on public.community_messages;
create policy "members read messages" on public.community_messages for select to authenticated
using (exists (select 1 from public.community_memberships membership where membership.community_id = community_messages.community_id and membership.user_id = (select auth.uid())));
create policy "members send messages" on public.community_messages for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.community_memberships membership where membership.community_id = community_messages.community_id and membership.user_id = (select auth.uid()))
  and exists (select 1 from public.community_channels channel where channel.id = channel_id and channel.community_id = community_messages.community_id)
);
create policy "authors update messages" on public.community_messages for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "authors delete messages" on public.community_messages for delete to authenticated using (user_id = (select auth.uid()));

grant select on public.resource_skills to authenticated;
grant select, insert on public.roadmap_day_resources to authenticated;
grant select, insert, update, delete on public.post_comments to authenticated;
grant select on public.community_channels to authenticated;
grant select, insert, update, delete on public.community_messages to authenticated;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'community_messages') then
    alter publication supabase_realtime add table public.community_messages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'post_comments') then
    alter publication supabase_realtime add table public.post_comments;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'discovery_posts') then
    alter publication supabase_realtime add table public.discovery_posts;
  end if;
end $$;