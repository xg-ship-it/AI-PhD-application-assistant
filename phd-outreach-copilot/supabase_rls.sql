-- Optional hardening for paid multi-user mode (requires auth integration first)
-- Run only when you add user_id and Supabase Auth in app.

-- alter table public.leads add column if not exists user_id uuid;
-- alter table public.leads enable row level security;

-- create policy "owner can read own leads"
-- on public.leads for select
-- using (auth.uid() = user_id);

-- create policy "owner can insert own leads"
-- on public.leads for insert
-- with check (auth.uid() = user_id);

-- create policy "owner can update own leads"
-- on public.leads for update
-- using (auth.uid() = user_id)
-- with check (auth.uid() = user_id);
