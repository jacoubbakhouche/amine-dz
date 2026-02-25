-- ============================================================
-- أوامر SQL للتحقق من أدوية الأطفال في قاعدة البيانات
-- ============================================================

-- 1️⃣ عد إجمالي أدوية الأطفال
SELECT COUNT(*) as total_pediatric_medicines
FROM clinical_embeddings
WHERE LOWER(content) LIKE '%enfant%' 
   OR LOWER(content) LIKE '%pediatric%'
   OR LOWER(content) LIKE '%child%';

-- ============================================================

-- 2️⃣ عرض جميع أدوية الأطفال
SELECT 
  metadata->>'drug_name' as الدواء,
  source as المصدر,
  SUBSTRING(content, 1, 100) as معلومات,
  metadata->>'dose_20kg' as "الجرعة (وزن 20 كغ)"
FROM clinical_embeddings
WHERE LOWER(content) LIKE '%enfant%'
   OR LOWER(metadata::text) LIKE '%pediatric%'
ORDER BY metadata->>'drug_name';

-- ============================================================

-- 3️⃣ البحث عن أدوية الأطفال المحددة
SELECT 
  metadata->>'drug_name' as الدواء,
  source,
  SUBSTRING(content, 1, 200) as المحتوى,
  metadata->>'dose_pediatric' as "الجرعة العامة",
  metadata->>'dose_20kg' as "الجرعة (20 كغ)"
FROM clinical_embeddings
WHERE LOWER(metadata::text) LIKE '%enfant%'
  AND LOWER(metadata::text) LIKE '%20 kg%';

-- ============================================================

-- 4️⃣ التحقق من الأدوية الثلاثة الرئيسية
SELECT 
  CASE 
    WHEN LOWER(content) LIKE '%amoxicilline%' THEN 'Amoxicilline'
    WHEN LOWER(content) LIKE '%métronidazole%' THEN 'Métronidazole'
    WHEN LOWER(content) LIKE '%clindamycine%' THEN 'Clindamycine'
  END as الدواء,
  COUNT(*) as عدد_النتائج,
  source as المصدر
FROM clinical_embeddings
WHERE LOWER(content) LIKE '%enfant%'
  AND (LOWER(content) LIKE '%amoxicilline%'
    OR LOWER(content) LIKE '%métronidazole%'
    OR LOWER(content) LIKE '%clindamycine%')
GROUP BY الدواء, source;

-- ============================================================

-- 5️⃣ عرض الأدوية حسب فئة العمر
SELECT 
  metadata->>'age_group' as "مجموعة العمر",
  metadata->>'drug_name' as الدواء,
  metadata->>'dose_20kg' as "الجرعة (20 كغ)",
  source
FROM clinical_embeddings
WHERE metadata->>'age_group' IS NOT NULL
ORDER BY metadata->>'age_group', metadata->>'drug_name';

-- ============================================================

-- 6️⃣ البحث عن أدوية للعدوى اللاهوائية عند الأطفال
SELECT 
  metadata->>'drug_name' as الدواء,
  source,
  content,
  metadata->>'dose_20kg' as "الجرعة"
FROM clinical_embeddings
WHERE LOWER(content) LIKE '%enfant%'
  AND LOWER(content) LIKE '%anaérob%';

-- ============================================================

-- 7️⃣ مقارنة الجرعات: البالغون vs الأطفال
SELECT 
  metadata->>'drug_name' as الدواء,
  SUBSTRING(content, 1, 150) as المعلومات,
  CASE 
    WHEN metadata->>'age_group' = 'Enfants' THEN 'أطفال'
    ELSE 'بالغون'
  END as الفئة,
  metadata->>'dose_pediatric' as "جرعة الأطفال"
FROM clinical_embeddings
WHERE metadata->>'drug_name' IN ('Amoxicilline', 'Métronidazole', 'Ibuprofène')
ORDER BY metadata->>'drug_name', metadata->>'age_group' DESC;

-- ============================================================

-- 8️⃣ الأدوية المتاحة لخراج الأسنان عند الأطفال (وزن 20 كغ)
SELECT 
  metadata->>'drug_name' as الدواء,
  metadata->>'dose_20kg' as "الجرعة المحددة",
  SUBSTRING(metadata->>'uses', 1, 60) as الاستخدام,
  source
FROM clinical_embeddings
WHERE LOWER(content) LIKE '%enfant%'
  AND LOWER(content) LIKE '%abcès%'
ORDER BY metadata->>'drug_name';

-- ============================================================

-- 9️⃣ أعلى 5 أدوية استخدام عند الأطفال
SELECT 
  metadata->>'drug_name' as الدواء,
  COUNT(*) as عدد_الاستخدامات,
  STRING_AGG(DISTINCT source, ', ') as المصادر
FROM clinical_embeddings
WHERE LOWER(content) LIKE '%enfant%'
GROUP BY metadata->>'drug_name'
ORDER BY عدد_الاستخدامات DESC
LIMIT 5;

-- ============================================================

-- 🔟 البحث باستخدام simple_search function
SELECT id, source, content, metadata, combined_score
FROM simple_search('enfant 20 kg abcès dentaire', 10);
