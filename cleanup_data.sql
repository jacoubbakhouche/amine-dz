-- ====================================================================
-- CLEANUP AND RESTORE DATABASE SCRIPT
-- ====================================================================

-- 🔴 STEP 1: DELETE ALL DATA
-- ====================================================================

-- حذف كل البيانات من clinical_embeddings
TRUNCATE TABLE clinical_embeddings CASCADE;

-- التحقق من أن الجدول فارغ
SELECT 'Step 1: Cleanup' as step, COUNT(*) as remaining_records FROM clinical_embeddings;

-- ====================================================================
-- 🟢 STEP 2: VERIFY SCHEMA EXISTS
-- ====================================================================

-- تحقق من وجود الجدول
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'clinical_embeddings';

-- عرض أعمدة الجدول
\d clinical_embeddings

-- ====================================================================
-- ✅ DONE
-- ====================================================================

-- يمكنك الآن تطبيق Migrations جديدة أو رفع البيانات من JSON
-- Run: supabase db push
-- أو استخدم: psql "$DATABASE_URL" -f supabase/migrations/*.sql
