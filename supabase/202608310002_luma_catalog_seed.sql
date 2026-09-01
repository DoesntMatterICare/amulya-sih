insert into public.skills (slug, name) values
  ('user-research', 'user research'),
  ('interaction-design', 'interaction design'),
  ('prototyping', 'prototyping'),
  ('visual-design', 'visual design'),
  ('product-strategy', 'product strategy'),
  ('customer-discovery', 'customer discovery'),
  ('prioritization', 'prioritization'),
  ('communication', 'communication'),
  ('javascript', 'javascript'),
  ('accessibility', 'accessibility'),
  ('responsive-design', 'responsive design'),
  ('interface-architecture', 'interface architecture'),
  ('web-apis', 'web APIs'),
  ('databases', 'databases'),
  ('frontend', 'frontend'),
  ('backend', 'backend'),
  ('statistics', 'statistics'),
  ('python', 'python'),
  ('data-analysis', 'data analysis'),
  ('experimentation', 'experimentation'),
  ('model-training', 'model training'),
  ('evaluation', 'evaluation'),
  ('deployment', 'deployment'),
  ('network-security', 'network security'),
  ('risk-analysis', 'risk analysis'),
  ('incident-response', 'incident response'),
  ('threat-modeling', 'threat modeling'),
  ('visual-composition', 'visual composition'),
  ('branding', 'branding'),
  ('typography', 'typography'),
  ('illustration', 'illustration')
on conflict (slug) do nothing;

with mapping(career_slug, skill_slug) as (values
  ('ui-ux-designer','user-research'),('ui-ux-designer','interaction-design'),('ui-ux-designer','prototyping'),('ui-ux-designer','visual-design'),
  ('product-manager','product-strategy'),('product-manager','customer-discovery'),('product-manager','prioritization'),('product-manager','communication'),
  ('frontend-engineer','javascript'),('frontend-engineer','accessibility'),('frontend-engineer','responsive-design'),('frontend-engineer','interface-architecture'),
  ('full-stack-developer','web-apis'),('full-stack-developer','databases'),('full-stack-developer','frontend'),('full-stack-developer','backend'),
  ('data-scientist','statistics'),('data-scientist','python'),('data-scientist','data-analysis'),('data-scientist','experimentation'),
  ('machine-learning-engineer','python'),('machine-learning-engineer','model-training'),('machine-learning-engineer','evaluation'),('machine-learning-engineer','deployment'),
  ('cybersecurity-analyst','network-security'),('cybersecurity-analyst','risk-analysis'),('cybersecurity-analyst','incident-response'),('cybersecurity-analyst','threat-modeling'),
  ('graphic-designer','visual-composition'),('graphic-designer','branding'),('graphic-designer','typography'),('graphic-designer','illustration')
)
insert into public.career_path_skills (career_path_id, skill_id)
select career.id, skill.id
from mapping
join public.career_paths career on career.slug = mapping.career_slug
join public.skills skill on skill.slug = mapping.skill_slug
on conflict do nothing;

insert into public.learning_resources (id, title, concept, resource_type, minutes) values
  ('ux-heuristics', 'Evaluate Interfaces with UX Heuristics', 'UX Heuristics', 'lesson', 35),
  ('design-systems', 'Build Consistent Design Systems', 'Design Systems', 'lesson', 42),
  ('figma-prototyping', 'Create Interactive Figma Prototypes', 'Prototyping', 'lesson', 45),
  ('accessible-ui', 'Design Accessible Interfaces', 'Accessibility', 'lesson', 38),
  ('user-research', 'Plan Better User Research', 'User Research', 'lesson', 40),
  ('interaction-patterns', 'Master Interaction Patterns', 'Interaction Design', 'lesson', 36),
  ('visual-hierarchy', 'Strengthen Visual Hierarchy', 'Visual Design', 'lesson', 32),
  ('responsive-layouts', 'Create Responsive Layouts', 'Responsive Design', 'lesson', 44),
  ('product-strategy', 'Shape a Clear Product Strategy', 'Product Strategy', 'lesson', 39),
  ('customer-discovery', 'Run Customer Discovery Interviews', 'Customer Discovery', 'lesson', 37),
  ('frontend-foundations', 'Build Frontend Foundations', 'Frontend', 'lesson', 48),
  ('api-design', 'Understand Practical API Design', 'Web APIs', 'lesson', 41),
  ('data-analysis', 'Explore Data Analysis Basics', 'Data Analysis', 'lesson', 46),
  ('threat-modeling', 'Learn Threat Modeling', 'Threat Modeling', 'lesson', 43)
on conflict (id) do update set title = excluded.title, concept = excluded.concept, resource_type = excluded.resource_type, minutes = excluded.minutes;

insert into public.profiles (user_id, display_name, avatar_url)
select id, coalesce(raw_user_meta_data->>'full_name', split_part(email, '@', 1)), coalesce(raw_user_meta_data->>'avatar_url', '')
from auth.users
on conflict (user_id) do nothing;

insert into public.user_progress (user_id)
select id from auth.users
on conflict (user_id) do nothing;