-- ========================================================================
-- Migration: Create simple_search function for RAG
-- ========================================================================
-- Timestamp: 2025-02-24
-- Description: Creates the simple_search RPC function used by pro-rag-consultation
-- This function enables text-based search on clinical_embeddings

-- Drop old versions if they exist
DROP FUNCTION IF EXISTS simple_search(text, int) CASCADE;

-- ========================================================================
-- 2️⃣ Alternative Simple Search Function (for zero-vector embeddings)
-- ========================================================================
CREATE OR REPLACE FUNCTION simple_search(
  query_text text,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  source text,
  content text,
  metadata jsonb,
  text_relevance float,
  combined_score float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH search_results AS (
    SELECT
      ce.id,
      ce.source,
      ce.content,
      ce.metadata,
      -- Substring match (most reliable)
      CASE 
        WHEN LOWER(ce.content) LIKE '%' || LOWER(query_text) || '%' THEN 0.8
        ELSE 0
      END as substring_score,
      -- Metadata match
      CASE 
        WHEN LOWER(ce.metadata::text) LIKE '%' || LOWER(query_text) || '%' THEN 0.7
        ELSE 0
      END as metadata_score,
      -- Full text search (if available)
      COALESCE(ts_rank(to_tsvector('simple', ce.content), plainto_tsquery('simple', query_text)), 0)::float as fts_score
    FROM clinical_embeddings ce
  )
  SELECT
    sr.id,
    sr.source,
    sr.content,
    sr.metadata,
    GREATEST(sr.substring_score, sr.metadata_score, sr.fts_score)::float as text_relevance,
    GREATEST(sr.substring_score, sr.metadata_score, sr.fts_score)::float as combined_score
  FROM search_results sr
  WHERE (sr.substring_score > 0 OR sr.metadata_score > 0 OR sr.fts_score > 0)
  ORDER BY combined_score DESC, sr.substring_score DESC
  LIMIT match_count;
END;
$$;

-- Make it executable by anon role (for Edge Functions)
GRANT EXECUTE ON FUNCTION simple_search(text, int) TO anon;
GRANT EXECUTE ON FUNCTION simple_search(text, int) TO authenticated;
