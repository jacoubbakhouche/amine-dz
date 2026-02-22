-- ====================================================================
-- FULL REBUILD SCRIPT FOR PHARMASSSIT DATABASE
-- ====================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create Clinical Embeddings Table
CREATE TABLE IF NOT EXISTS clinical_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  content text NOT NULL,
  metadata jsonb,
  embedding vector(384),
  created_at timestamp with time zone DEFAULT now()
);

-- 3. Create Index for Clinical Embeddings
CREATE INDEX IF NOT EXISTS clinical_embeddings_content_idx ON clinical_embeddings USING gin (to_tsvector('simple', content));

-- 4. Create Match Function (Security Definer to bypass RLS)
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
    ts_rank_cd(to_tsvector('simple', ce.content), plainto_tsquery('simple', query_text)) AS text_rank
  FROM clinical_embeddings ce
  WHERE (p_source IS NULL OR ce.source = p_source)
    AND (
      -- Match by vector similarity
      (1 - (ce.embedding <=> query_embedding) > match_threshold)
      OR 
      -- Match by full-text search (more permissive than websearch)
      (to_tsvector('simple', ce.content) @@ plainto_tsquery('simple', query_text))
      OR
      -- Fallback to simple ILIKE for very short keywords or fuzzy names
      (ce.content ILIKE '%' || query_text || '%')
    )
  ORDER BY 
    similarity DESC,
    text_rank DESC
  LIMIT match_count;
END;
$$;

-- 5. Create Conversations Table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  title text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 6. Create Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  role text CHECK (role IN ('user', 'assistant', 'system')) NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- 7. Configure Row Level Security (RLS)

-- Enable RLS on all tables
ALTER TABLE clinical_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Disable RLS on clinical_embeddings completely for easy testing (or use the policy below)
ALTER TABLE clinical_embeddings DISABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow public read access" ON clinical_embeddings FOR SELECT USING (true);

-- Conversations Policies
CREATE POLICY "Users can view their own conversations" 
  ON conversations FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations" 
  ON conversations FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations" 
  ON conversations FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations" 
  ON conversations FOR DELETE 
  USING (auth.uid() = user_id);

-- Chat Messages Policies
CREATE POLICY "Users can view messages of their conversations" 
  ON chat_messages FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert messages to their conversations" 
  ON chat_messages FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

