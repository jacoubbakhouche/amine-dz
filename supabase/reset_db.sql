-- ====================================================================
-- FULL DATABASE RESET FOR PHARMASSSIT CLINICAL SEARCH
-- Run this in Supabase Dashboard -> SQL Editor
-- ====================================================================

-- 1. DROP EVERYTHING (Force clean slate)
DROP FUNCTION IF EXISTS match_clinical_data CASCADE;
DROP TABLE IF EXISTS clinical_embeddings CASCADE;

-- 2. RECREATE EXTENSION
CREATE EXTENSION IF NOT EXISTS vector;

-- 3. RECREATE TABLE
CREATE TABLE clinical_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  content text NOT NULL,
  metadata jsonb,
  embedding vector(384),
  created_at timestamp with time zone DEFAULT now()
);

-- 4. CREATE INDEX FOR TEXT SEARCH
CREATE INDEX clinical_embeddings_content_idx ON clinical_embeddings USING gin (to_tsvector('simple', content));

-- 5. RECREATE FUNCTION WITH RLS BYPASS (SECURITY DEFINER) & 5 PARAMS
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
    ce.id, ce.source, ce.content, ce.metadata,
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

-- 6. DISABLE RLS FOR TESTING (Table will be publicly readable/writable)
ALTER TABLE clinical_embeddings DISABLE ROW LEVEL SECURITY;
