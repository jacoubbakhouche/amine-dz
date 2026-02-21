-- Enable the pgvector extension to work with embeddings
create extension if not exists vector;

-- Create a table to store clinical data chunks and their embeddings
create table if not exists clinical_embeddings (
  id uuid primary key default gen_random_uuid(),
  source text not null, -- 'dental_products' or 'antibiotic_rules'
  content text not null, -- The searchable text
  metadata jsonb, -- Original JSON object for reference
  embedding vector(384), -- 384 dimensions for local models (all-MiniLM-L6-v2)
  created_at timestamp with time zone default now()
);

-- Create a GIN index for fast full-text search
create index if not exists clinical_embeddings_content_idx on clinical_embeddings using gin (to_tsvector('french', content));

-- Function to search for clinical data with Hybrid Search (Vector + Full-Text)
create or replace function match_clinical_data (
  query_embedding vector(384),
  query_text text,
  match_threshold float,
  match_count int,
  p_source text default null
)
returns table (
  id uuid,
  source text,
  content text,
  metadata jsonb,
  similarity float,
  text_rank float
)
language plpgsql
as $$
begin
  return query
  select
    ce.id,
    ce.source,
    ce.content,
    ce.metadata,
    1 - (ce.embedding <=> query_embedding) as similarity,
    ts_rank_cd(to_tsvector('french', ce.content), websearch_to_tsquery('french', query_text)) as text_rank
  from clinical_embeddings ce
  where (p_source is null or ce.source = p_source)
    and (
      -- Hybrid condition: either vector similarity is high enough OR keyword match is found
      (1 - (ce.embedding <=> query_embedding) > match_threshold)
      or 
      (to_tsvector('french', ce.content) @@ websearch_to_tsquery('french', query_text))
    )
  order by 
    -- Higher prominence to text matches (Keyword is often more precise for product names)
    (ts_rank_cd(to_tsvector('french', ce.content), websearch_to_tsquery('french', query_text)) * 2) + 
    (1 - (ce.embedding <=> query_embedding)) desc
  limit match_count;
end;
$$;
