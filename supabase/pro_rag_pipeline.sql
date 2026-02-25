-- ========================================================================
-- PROFESSIONAL RAG PIPELINE: Fully Managed Vector Search in Database
-- ========================================================================

-- ========================================================================
-- 1️⃣ HYBRID SEARCH FUNCTION - دمج Vector + Full-Text Search
-- ========================================================================
CREATE OR REPLACE FUNCTION hybrid_search(
  query_text text,
  query_embedding vector(384),
  match_count int DEFAULT 10,
  p_source text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  source text,
  content text,
  metadata jsonb,
  vector_similarity float,
  text_relevance float,
  combined_score float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_threshold float := 0.4;
BEGIN
  RETURN QUERY
  SELECT
    ce.id,
    ce.source,
    ce.content,
    ce.metadata,
    -- Vector similarity (cosine distance)
    (1 - (ce.embedding <=> query_embedding))::float as vector_similarity,
    -- Full-text search ranking
    ts_rank(to_tsvector('simple', ce.content), plainto_tsquery('simple', query_text))::float as text_relevance,
    -- Combined score: 70% vector + 30% text (weighted for quality)
    (
      (1 - (ce.embedding <=> query_embedding)) * 0.7 + 
      (ts_rank(to_tsvector('simple', ce.content), plainto_tsquery('simple', query_text)) * 0.3)
    )::float as combined_score
  FROM clinical_embeddings ce
  WHERE
    -- Filter by source if provided
    (p_source IS NULL OR ce.source = p_source)
    AND
    -- Match either vector similarity OR text search
    (
      (1 - (ce.embedding <=> query_embedding)) > v_threshold
      OR ce.content @@ plainto_tsquery('simple', query_text)
    )
  ORDER BY CASE 
    -- Prioritize full-text matches if available
    WHEN ce.content @@ plainto_tsquery('simple', query_text) THEN combined_score DESC
    ELSE combined_score DESC
  END
  LIMIT match_count;
END;
$$;

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

-- ========================================================================
-- 2️⃣ HNSW INDEX for Ultra-Fast Vector Search (on millions of rows)
-- ========================================================================
-- ⚠️ Run this ONLY after populating clinical_embeddings with data
-- CREATE INDEX IF NOT EXISTS clinical_embeddings_hnsw_idx 
-- ON clinical_embeddings 
-- USING hnsw (embedding vector_cosine_ops) 
-- WITH (m = 16, ef_construction = 64);

-- ========================================================================
-- 3️⃣ TEXT SEARCH INDEX - Standard GIN index for full-text search
-- ========================================================================
CREATE INDEX IF NOT EXISTS clinical_embeddings_text_idx 
ON clinical_embeddings 
USING GIN (to_tsvector('simple', content));

-- ========================================================================
-- 4️⃣ CONVERSATION MEMORY - Track full RAG context per conversation
-- ========================================================================
CREATE TABLE IF NOT EXISTS conversation_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  retrieved_sources uuid[] DEFAULT ARRAY[]::uuid[],
  -- Store the retrieval context for debugging
  context_metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- ========================================================================
-- 5️⃣ EMBEDDING CACHE - Cache computed embeddings to avoid re-computing
-- ========================================================================
CREATE TABLE IF NOT EXISTS embedding_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash text UNIQUE NOT NULL, -- Hash of the query text
  embedding vector(384) NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  accessed_at timestamp with time zone DEFAULT now(),
  access_count int DEFAULT 1
);

-- Index for quick cache lookups
CREATE INDEX IF NOT EXISTS embedding_cache_hash_idx 
ON embedding_cache(query_hash);

-- ========================================================================
-- 6️⃣ EMBEDDING CACHE RETRIEVAL - Get or compute embedding
-- ========================================================================
CREATE OR REPLACE FUNCTION get_or_cache_embedding(
  query_text text,
  query_embedding vector(384)
)
RETURNS vector(384)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  query_hash text;
  cached_embedding vector(384);
BEGIN
  -- Create hash of query
  query_hash := encode(digest(query_text, 'sha256'), 'hex');
  
  -- Try to get from cache
  SELECT embedding INTO cached_embedding
  FROM embedding_cache
  WHERE query_hash = get_or_cache_embedding.query_hash;
  
  IF cached_embedding IS NOT NULL THEN
    -- Update access count and timestamp
    UPDATE embedding_cache
    SET accessed_at = now(), access_count = access_count + 1
    WHERE query_hash = get_or_cache_embedding.query_hash;
    RETURN cached_embedding;
  END IF;
  
  -- Cache miss: store the new embedding
  INSERT INTO embedding_cache (query_hash, embedding)
  VALUES (query_hash, query_embedding);
  
  RETURN query_embedding;
END;
$$;

-- ========================================================================
-- 7️⃣ KNOWLEDGE LOCK - Prevent hallucination by tracking used sources
-- ========================================================================
CREATE TABLE IF NOT EXISTS knowledge_lock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  question text NOT NULL,
  allowed_source_ids uuid[] NOT NULL, -- Only these IDs can be referenced
  created_at timestamp with time zone DEFAULT now(),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- ========================================================================
-- 8️⃣ GRANT PERMISSIONS - Allow Edge Functions to call these functions
-- ========================================================================
GRANT EXECUTE ON FUNCTION hybrid_search TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_or_cache_embedding TO anon, authenticated, service_role;
GRANT SELECT ON embedding_cache TO anon, authenticated, service_role;
GRANT SELECT, INSERT ON conversation_context TO anon, authenticated, service_role;
GRANT SELECT, INSERT ON knowledge_lock TO anon, authenticated, service_role;

-- ========================================================================
-- 9️⃣ DEBUG VIEW - Monitor hybrid search performance
-- ========================================================================
CREATE OR REPLACE VIEW hybrid_search_debug AS
SELECT 
  (SELECT COUNT(*) FROM clinical_embeddings) as total_embeddings,
  (SELECT COUNT(*) FROM embedding_cache) as cached_queries,
  (SELECT COUNT(*) FROM knowledge_lock) as knowledge_locks,
  (SELECT AVG(access_count) FROM embedding_cache) as avg_cache_hits
FROM (SELECT 1) t;

-- ========================================================================
-- 10️⃣ CLEANUP OLD CACHE - Keep cache size manageable (optional)
-- ========================================================================
CREATE OR REPLACE FUNCTION cleanup_old_embeddings(days_old int DEFAULT 30)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count int;
BEGIN
  DELETE FROM embedding_cache
  WHERE created_at < now() - (days_old || ' days')::interval
  AND accessed_at < now() - (days_old || ' days')::interval;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION cleanup_old_embeddings TO service_role;

-- ========================================================================
-- END OF PRO RAG PIPELINE SETUP
-- ========================================================================
