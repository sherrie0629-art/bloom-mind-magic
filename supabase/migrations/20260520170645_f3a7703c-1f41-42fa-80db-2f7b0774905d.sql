-- Phase 1+3+4: Memory system upgrade

create extension if not exists vector;

-- 1) Cross-agent user profile facts
create table if not exists public.user_profile_facts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  category text not null check (category in ('identity','preference','relationship','value','goal')),
  key text not null,
  value text not null,
  confidence numeric not null default 0.7 check (confidence >= 0 and confidence <= 1),
  source_agent_id text,
  last_confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, category, key)
);

alter table public.user_profile_facts enable row level security;

create policy "Users manage own profile facts"
  on public.user_profile_facts
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_profile_facts_user on public.user_profile_facts(user_id);

-- 2) Add embedding + decay fields to user_memories
alter table public.user_memories
  add column if not exists embedding vector(1536),
  add column if not exists expires_at timestamptz,
  add column if not exists last_used_at timestamptz;

create index if not exists idx_memories_user_agent on public.user_memories(user_id, agent_id);
create index if not exists idx_memories_embedding
  on public.user_memories using hnsw (embedding vector_cosine_ops);

-- 3) Semantic recall RPC: weights current-agent memories higher, applies time decay
create or replace function public.match_user_memories(
  p_user_id uuid,
  p_agent_id text,
  p_query_embedding vector(1536),
  p_match_count int default 8
)
returns table (
  id uuid,
  agent_id text,
  category text,
  content text,
  emotion_tag text,
  importance int,
  created_at timestamptz,
  similarity float,
  score float
)
language sql stable
security definer
set search_path = public
as $$
  select
    m.id,
    m.agent_id,
    m.category,
    m.content,
    m.emotion_tag,
    m.importance,
    m.created_at,
    1 - (m.embedding <=> p_query_embedding) as similarity,
    (1 - (m.embedding <=> p_query_embedding))
      * (case when m.agent_id = p_agent_id then 1.3 else 1.0 end)
      * (m.importance::float)
      * exp(- extract(epoch from (now() - m.created_at)) / (86400 * 60.0)) as score
  from public.user_memories m
  where m.user_id = p_user_id
    and m.embedding is not null
    and (m.expires_at is null or m.expires_at > now())
  order by score desc
  limit p_match_count;
$$;

-- 4) Decay function: soften emotion/event memories, soft-delete very old emotions
create or replace function public.decay_memories()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- After 30 days, decay emotion importance to 1
  update public.user_memories
  set importance = 1
  where category = 'emotion'
    and importance > 1
    and created_at < now() - interval '30 days';

  -- Mark emotion memories older than 60 days as expired (soft delete)
  update public.user_memories
  set expires_at = now()
  where category = 'emotion'
    and expires_at is null
    and created_at < now() - interval '60 days';

  -- Decay event memories after 90 days
  update public.user_memories
  set importance = 1
  where category = 'event'
    and importance > 1
    and created_at < now() - interval '90 days';
end;
$$;
