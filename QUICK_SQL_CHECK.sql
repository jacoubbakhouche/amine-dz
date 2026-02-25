-- ============================================================
-- ✅ أهم 5 أوامر SQL للتحقق السريع
-- ============================================================
-- انسخ هذا الملف والصقه في Supabase SQL Editor

-- 1️⃣ التحقق السريع: هل الأدوية الثلاثة موجودة؟
SELECT 
  'Métronidazole' as الدواء,
  CASE WHEN COUNT(*) > 0 THEN '✅ موجود' ELSE '❌ غير موجود' END as الحالة,
  COUNT(*) as عدد_النتائج
FROM clinical_embeddings
WHERE LOWER(content) LIKE '%métronidazole%'
UNION ALL
SELECT 'Amoxicilline', 
  CASE WHEN COUNT(*) > 0 THEN '✅ موجود' ELSE '❌ غير موجود' END,
  COUNT(*)
FROM clinical_embeddings
WHERE LOWER(content) LIKE '%amoxicilline%'
UNION ALL
SELECT 'Clindamycine',
  CASE WHEN COUNT(*) > 0 THEN '✅ موجود' ELSE '❌ غير موجود' END,
  COUNT(*)
FROM clinical_embeddings
WHERE LOWER(content) LIKE '%clindamycine%';

-- ============================================================

-- 2️⃣ عرض معلومات Métronidazole كاملة
SELECT 
  'Métronidazole' as الدواء,
  source as المصدر,
  content as المعلومات,
  metadata as البيانات_الإضافية
FROM clinical_embeddings
WHERE LOWER(content) LIKE '%métronidazole%'
LIMIT 1;

-- ============================================================

-- 3️⃣ عرض معلومات Amoxicilline كاملة
SELECT 
  'Amoxicilline' as الدواء,
  source as المصدر,
  content as المعلومات,
  metadata as البيانات_الإضافية
FROM clinical_embeddings
WHERE LOWER(content) LIKE '%amoxicilline%'
LIMIT 1;

-- ============================================================

-- 4️⃣ عرض معلومات Clindamycine كاملة
SELECT 
  'Clindamycine' as الدواء,
  source as المصدر,
  content as المعلومات,
  metadata as البيانات_الإضافية
FROM clinical_embeddings
WHERE LOWER(content) LIKE '%clindamycine%'
LIMIT 1;

-- ============================================================

-- 5️⃣ إجمالي الأدوية في قاعدة البيانات
SELECT 
  COUNT(*) as إجمالي_الأدوية,
  COUNT(DISTINCT source) as عدد_المصادر,
  COUNT(DISTINCT metadata->>'drug_name') as عدد_أسماء_الأدوية_الفريدة
FROM clinical_embeddings;
