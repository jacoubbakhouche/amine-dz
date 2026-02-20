-- ============================================================
-- REBUILD SCHEMA: Clean Supabase Database for Chat System
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================
-- WARNING: This drops and recreates conversations & chat_messages.
--          Existing chat history will be lost.
--          clinical_data and profiles data are PRESERVED.
-- ============================================================

-- ============================================================
-- STEP 1: Drop ALL existing RLS policies
-- ============================================================

-- chat_messages policies
DROP POLICY IF EXISTS "Users can insert messages into their conversations" ON chat_messages;
DROP POLICY IF EXISTS "Users can view messages from their conversations" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert messages into their conv..." ON chat_messages;
DROP POLICY IF EXISTS "Users can view messages from their conv..." ON chat_messages;

-- conversations policies
DROP POLICY IF EXISTS "Users can create their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete their own conversations" ON conversations;

-- consultations policies
DROP POLICY IF EXISTS "Users can insert their own consultations" ON consultations;
DROP POLICY IF EXISTS "Users can insert own consultations" ON consultations;
DROP POLICY IF EXISTS "Users can view their own consultations" ON consultations;
DROP POLICY IF EXISTS "Users see own consultations" ON consultations;

-- clinical_data policies
DROP POLICY IF EXISTS "Allow authenticated users to read clinical data" ON clinical_data;
DROP POLICY IF EXISTS "Allow authenticated users to read clinical..." ON clinical_data;

-- profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- ============================================================
-- STEP 2: Drop old tables (order matters for FK dependencies)
-- ============================================================

DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS consultations CASCADE;

-- ============================================================
-- STEP 3: Recreate tables with clean schema
-- ============================================================

-- profiles: keep if exists, create if not
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE,
    full_name TEXT,
    specialty TEXT DEFAULT 'General Dentist',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- conversations: linked to auth.users
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT DEFAULT 'New Consultation',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- chat_messages: linked to conversations
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- clinical_data: keep existing table & data, create only if not exists
CREATE TABLE IF NOT EXISTS clinical_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- STEP 4: Enable RLS on all tables
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_data ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 5: Create MINIMAL RLS policies
-- ============================================================
-- Strategy:
--   - Frontend can only READ (SELECT) conversations & messages
--   - All INSERTS/UPDATES/DELETES go through Edge Function
--     using service_role key (which bypasses RLS entirely)
--   - profiles: user can read & update their own
--   - clinical_data: any authenticated user can read

-- profiles
CREATE POLICY "profiles_select_own"
    ON profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
    ON profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- conversations: SELECT only (frontend loads history)
CREATE POLICY "conversations_select_own"
    ON conversations FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- chat_messages: SELECT only (frontend loads message history)
CREATE POLICY "messages_select_own"
    ON chat_messages FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = chat_messages.conversation_id
            AND conversations.user_id = auth.uid()
        )
    );

-- clinical_data: any authenticated user can read
CREATE POLICY "clinical_data_select_authenticated"
    ON clinical_data FOR SELECT
    TO authenticated
    USING (true);

-- ============================================================
-- STEP 6: Performance indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_clinical_data_source ON clinical_data(source);

-- ============================================================
-- STEP 7: Ensure handle_new_user trigger exists
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the trigger to ensure it's correct
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- DONE! Your schema is now clean and ready.
-- ============================================================
