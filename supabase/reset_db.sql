-- 1. DROP EXISTING STRUCTURES
DROP FUNCTION IF EXISTS match_clinical_data CASCADE;
DROP TABLE IF EXISTS clinical_embeddings CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;

-- 2. ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS vector;

-- 3. RECREATE TABLES (Clean Slate)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  role TEXT CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE clinical_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  embedding VECTOR(384),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. RECREATE SEARCH FUNCTION
CREATE OR REPLACE FUNCTION match_clinical_data (
  query_embedding VECTOR(384),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id UUID,
  source TEXT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    clinical_embeddings.id,
    clinical_embeddings.source,
    clinical_embeddings.content,
    clinical_embeddings.metadata,
    1 - (clinical_embeddings.embedding <=> query_embedding) AS similarity
  FROM clinical_embeddings
  WHERE 1 - (clinical_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY clinical_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 5. ENABLE RLS AND POLICIES
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own conversations" 
ON conversations FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own messages" 
ON chat_messages FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Anyone authenticated can read clinical data" 
ON clinical_embeddings FOR SELECT TO authenticated USING (true);
