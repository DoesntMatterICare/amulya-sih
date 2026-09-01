-- Public read-only previews keep the Explorer and Learning Hub useful before sign-in.
drop policy if exists "authenticated read posts" on public.discovery_posts;
drop policy if exists "public read posts" on public.discovery_posts;
create policy "public read posts" on public.discovery_posts
for select to anon, authenticated using (true);

drop policy if exists "authenticated read comments" on public.post_comments;
drop policy if exists "public read comments" on public.post_comments;
create policy "public read comments" on public.post_comments
for select to anon, authenticated using (true);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'career_paths','skills','career_path_skills','learning_resources','resource_career_paths','resource_skills','communities'
  ] loop
    execute format('drop policy if exists "authenticated catalog read" on public.%I', table_name);
    execute format('drop policy if exists "public catalog read" on public.%I', table_name);
    execute format('create policy "public catalog read" on public.%I for select to anon, authenticated using (true)', table_name);
  end loop;
end $$;

-- Each community has one intentionally simple entry point for the realtime chat.
delete from public.community_channels where is_default = false;
update public.community_channels
set name = 'general', slug = 'general', position = 1, is_default = true,
    description = 'Introductions, questions, and community updates.';

create unique index if not exists community_one_default_channel_idx
on public.community_channels (community_id) where is_default;

grant select on public.discovery_posts, public.post_comments,
  public.career_paths, public.skills, public.career_path_skills,
  public.learning_resources, public.resource_career_paths, public.resource_skills,
  public.communities to anon;