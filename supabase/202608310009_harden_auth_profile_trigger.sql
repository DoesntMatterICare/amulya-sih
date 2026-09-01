create or replace function public.handle_new_luma_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  safe_display_name text;
  safe_avatar_url text;
begin
  safe_display_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Luma Learner'
  );
  safe_avatar_url := coalesce(nullif(btrim(new.raw_user_meta_data ->> 'avatar_url'), ''), '');

  insert into public.profiles (user_id, display_name, avatar_url)
  values (new.id, safe_display_name, safe_avatar_url)
  on conflict (user_id) do update
  set display_name = case when public.profiles.display_name = '' then excluded.display_name else public.profiles.display_name end,
      avatar_url = case when public.profiles.avatar_url = '' then excluded.avatar_url else public.profiles.avatar_url end,
      updated_at = now();

  insert into public.user_progress (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

alter function public.handle_new_luma_user() owner to postgres;
revoke all on function public.handle_new_luma_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_luma on auth.users;
create trigger on_auth_user_created_luma
after insert on auth.users
for each row execute procedure public.handle_new_luma_user();