alter table public.discovery_posts alter column user_id drop not null;
alter table public.discovery_posts add column if not exists author_name text not null default '';

insert into public.discovery_posts (id, user_id, community_id, author_name, title, body) values
  (
    '11111111-1111-4111-8111-111111111111',
    null,
    (select id from public.communities where slug = 'ui-ux-design'),
    'Sarah K.',
    'How do you improve low-fidelity wireframes before moving to high-fidelity?',
    'I often struggle to align component groupings cleanly and keep layout proportions balanced before laying out high-fidelity mockups. What checklist points do you follow?'
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    null,
    (select id from public.communities where slug = 'ai-engineering'),
    'Arjun M.',
    'Best roadmaps for beginners learning generative AI in 2026?',
    'Looking for a structured timeline to learn neural networks and LLMs from absolute scratch. Are there recommended interactive notebooks or custom agents courses?'
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    null,
    (select id from public.communities where slug = 'full-stack-development'),
    'Emma S.',
    'How should beginners structure a portfolio project repository?',
    'Is it better to highlight architectural layout drawings inside README markdown, or should I host interactive demo deployments directly at the top of the repository details?'
  )
on conflict (id) do update set
  community_id = excluded.community_id,
  author_name = excluded.author_name,
  title = excluded.title,
  body = excluded.body;