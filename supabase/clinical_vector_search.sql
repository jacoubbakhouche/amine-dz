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

-- Index for fast similarity search
create index on clinical_embeddings using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Function to search for clinical data
create or replace function match_clinical_data (
  query_embedding vector(384),
  match_threshold float,
  match_count int,
  p_source text default null
)
returns table (
  id uuid,
  source text,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    clinical_embeddings.id,
    clinical_embeddings.source,
    clinical_embeddings.content,
    clinical_embeddings.metadata,
    1 - (clinical_embeddings.embedding <=> query_embedding) as similarity
  from clinical_embeddings
  where (p_source is null or clinical_embeddings.source = p_source)
    and (1 - (clinical_embeddings.embedding <=> query_embedding) > match_threshold)
  order by clinical_embeddings.embedding <=> query_embedding
  limit match_count;
end;
$$;
