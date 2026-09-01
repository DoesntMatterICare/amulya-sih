insert into public.learning_resources (id, title, concept, resource_type, minutes) values
  ('design-thinking-guide', 'Guide: The 5 Phases of Design Thinking', 'design-thinking', 'guide', 8),
  ('design-thinking-brainstorm', 'Article: Brainstorming without Constraints', 'design-thinking', 'article', 7),
  ('user-research-interviews', 'Guide: Conducting Effective User Interviews', 'user-research', 'guide', 10),
  ('user-research-personas', 'Article: Creating Realistic User Personas', 'user-research', 'article', 8),
  ('user-research-script', 'Challenge: Draft Your First Interview Script', 'user-research', 'challenge', 7),
  ('wireframing-sketching', 'Guide: Low-Fidelity Sketching Techniques', 'wireframing', 'guide', 15),
  ('wireframing-tools', 'Article: Digital Wireframing Tools Guide', 'wireframing', 'article', 10),
  ('wireframing-landing-page', 'Challenge: Design a Landing Page Sketch', 'wireframing', 'challenge', 15),
  ('ia-card-sorting', 'Guide: Card Sorting Methodologies', 'information-architecture', 'guide', 12),
  ('ia-sitemaps', 'Article: Creating Comprehensive Sitemaps', 'information-architecture', 'article', 10),
  ('visual-design-grids', 'Guide: Grid Systems & Layout Layouts', 'visual-design', 'guide', 20),
  ('visual-design-color', 'Article: Selecting Color Palettes', 'visual-design', 'article', 15),
  ('prototyping-micro', 'Guide: Interactive Micro-Animations', 'prototyping', 'guide', 15),
  ('prototyping-flow', 'Challenge: Connect a 3-Screen App Flow', 'prototyping', 'challenge', 20)
on conflict (id) do update set
  title = excluded.title,
  concept = excluded.concept,
  resource_type = excluded.resource_type,
  minutes = excluded.minutes;

insert into public.resource_career_paths (resource_id, career_path_id)
select resource.id, career.id
from public.learning_resources resource
cross join public.career_paths career
where career.slug = 'ui-ux-designer'
  and resource.id in (
    'design-thinking-guide','design-thinking-brainstorm','user-research-interviews','user-research-personas',
    'user-research-script','wireframing-sketching','wireframing-tools','wireframing-landing-page',
    'ia-card-sorting','ia-sitemaps','visual-design-grids','visual-design-color','prototyping-micro','prototyping-flow'
  )
on conflict do nothing;