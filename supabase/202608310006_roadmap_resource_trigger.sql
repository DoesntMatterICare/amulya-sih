create or replace function public.link_new_roadmap_day_resource()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare selected_resource text;
begin
  select resource.id into selected_resource
  from public.career_roadmaps roadmap
  join public.resource_career_paths relation on relation.career_path_id = roadmap.career_path_id
  join public.learning_resources resource on resource.id = relation.resource_id and resource.is_published = true
  where roadmap.id = new.roadmap_id
  order by resource.is_featured desc, resource.id
  offset greatest(new.day_number - 1, 0)
  limit 1;

  if selected_resource is null then
    select resource.id into selected_resource
    from public.learning_resources resource
    where resource.is_published = true
    order by resource.is_featured desc, resource.id
    offset greatest(new.day_number - 1, 0)
    limit 1;
  end if;

  if selected_resource is not null then
    insert into public.roadmap_day_resources (roadmap_day_id, resource_id, position, is_required)
    values (new.id, selected_resource, 1, true)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists link_new_roadmap_day_resource_trigger on public.roadmap_days;
create trigger link_new_roadmap_day_resource_trigger
after insert on public.roadmap_days
for each row execute procedure public.link_new_roadmap_day_resource();