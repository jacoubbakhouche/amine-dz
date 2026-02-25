-- ============================================================
-- التحقق من الأدوية المقترحة من الـ AI في قاعدة البيانات
-- ============================================================

-- 1. عد إجمالي الأدوية
SELECT COUNT(*) as total_medicines FROM clinical_embeddings;

-- 2. البحث عن Métronidazole
SELECT id, source, content, metadata, combined_score
FROM simple_search('Métronidazole', 5);

-- 3. البحث عن Amoxicilline
SELECT id, source, content, metadata, combined_score
FROM simple_search('Amoxicilline', 5);

-- 4. البحث عن Clindamycine
SELECT id, source, content, metadata, combined_score
FROM simple_search('Clindamycine', 5);

-- ============================================================
-- بحث متقدم بدون استخدام function
-- ============================================================

-- 5. البحث المباشر عن Métronidazole
SELECT id, source, SUBSTRING(content, 1, 100) as content_preview, metadata
FROM clinical_embeddings
WHERE LOWER(content) LIKE '%métronidazole%'
   OR LOWER(metadata::text) LIKE '%métronidazole%';

-- 6. البحث المباشر عن Amoxicilline
SELECT id, source, SUBSTRING(content, 1, 100) as content_preview, metadata
FROM clinical_embeddings
WHERE LOWER(content) LIKE '%amoxicilline%'
   OR LOWER(metadata::text) LIKE '%amoxicilline%';

-- 7. البحث المباشر عن Clindamycine
SELECT id, source, SUBSTRING(content, 1, 100) as content_preview, metadata
FROM clinical_embeddings
WHERE LOWER(content) LIKE '%clindamycine%'
   OR LOWER(metadata::text) LIKE '%clindamycine%';

-- ============================================================
-- عرض جميع الأدوية المتاحة
-- ============================================================

-- 8. عرض أسماء جميع الأدوية الموجودة
SELECT DISTINCT metadata->>'drug_name' as drug_name, source
FROM clinical_embeddings
WHERE metadata->>'drug_name' IS NOT NULL
ORDER BY drug_name;

-- ============================================================
-- إحصائيات عامة
-- ============================================================

-- 9. عدد الأدوية حسب المصدر
SELECT source, COUNT(*) as count
FROM clinical_embeddings
GROUP BY source
ORDER BY count DESC;

-- 10. عرض معلومات كاملة عن Abcès dentaire
SELECT id, source, content, metadata
FROM clinical_embeddings
WHERE LOWER(content) LIKE '%abcès%'
   OR LOWER(content) LIKE '%abscess%'
   OR LOWER(metadata::text) LIKE '%abcès%'
LIMIT 10;
