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

-- Create a GIN index for fast full-text search (using 'simple' to preserve exact numbers/terms like 1.25%)
create index if not exists clinical_embeddings_content_idx on clinical_embeddings using gin (to_tsvector('simple', content));

-- ====================================================================
-- STEP 1: DROP all old versions to prevent parameter mismatch errors
-- ====================================================================
DROP FUNCTION IF EXISTS match_clinical_data(vector, text, float, int);
DROP FUNCTION IF EXISTS match_clinical_data(vector, text, float, int, text);
DROP FUNCTION IF EXISTS match_clinical_data(vector, text, double precision, int, text);

-- ====================================================================
-- STEP 2: Recreate with SECURITY DEFINER (bypasses RLS)
-- ====================================================================
CREATE OR REPLACE FUNCTION match_clinical_data (
  query_embedding vector(384),
  query_text text,
  match_threshold float,
  match_count int,
  p_source text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  source text,
  content text,
  metadata jsonb,
  similarity float,
  text_rank float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ce.id,
    ce.source,
    ce.content,
    ce.metadata,
    1 - (ce.embedding <=> query_embedding) AS similarity,
    ts_rank_cd(to_tsvector('simple', ce.content), websearch_to_tsquery('simple', query_text)) AS text_rank
  FROM clinical_embeddings ce
  WHERE (p_source IS NULL OR ce.source = p_source)
    AND (
      (1 - (ce.embedding <=> query_embedding) > match_threshold)
      OR 
      (to_tsvector('simple', ce.content) @@ websearch_to_tsquery('simple', query_text))
    )
  ORDER BY 
    (ts_rank_cd(to_tsvector('simple', ce.content), websearch_to_tsquery('simple', query_text)) * 3.0) + 
    (1 - (ce.embedding <=> query_embedding)) DESC
  LIMIT match_count;
END;
$$;

-- ====================================================================
-- STEP 3: Disable RLS on clinical_embeddings for testing
-- ====================================================================
ALTER TABLE clinical_embeddings DISABLE ROW LEVEL SECURITY;
