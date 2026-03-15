-- Run in Supabase SQL editor
create table if not exists public.leads (
  id text primary key,
  professor_name text not null,
  school text not null,
  research_summary text,
  url text,
  keywords jsonb not null default '[]'::jsonb,
  status text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  next_follow_up_at timestamptz,
  match_score int,
  emails jsonb not null default '[]'::jsonb
);

create index if not exists leads_updated_at_idx on public.leads (updated_at desc);
