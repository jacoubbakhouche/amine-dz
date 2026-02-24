-- Drop ALL versions to clear the overload confusion
DROP FUNCTION IF EXISTS match_clinical_data(vector, text, float, int);
DROP FUNCTION IF EXISTS match_clinical_data(vector, text, float, int, text);
DROP FUNCTION IF EXISTS match_clinical_data(vector, float, int, text, text);
DROP FUNCTION IF EXISTS match_clinical_data(vector, text, double precision, int, text);
DROP FUNCTION IF EXISTS match_clinical_data(vector, double precision, int, text, text);

-- Recreate the SINGLE definitive version
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
    (1 - (ce.embedding <=> query_embedding))::float AS similarity,
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
