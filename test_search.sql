-- اختبار 1: عد الأدوية في قاعدة البيانات
SELECT COUNT(*) as total_medicines FROM clinical_embeddings;

-- اختبار 2: عرض أول 3 أدوية
SELECT id, source, content, metadata FROM clinical_embeddings LIMIT 3;

-- اختبار 3: اختبار simple_search مع كلمة "خراج"
SELECT simple_search('خراج', 8);

-- اختبار 4: اختبار simple_search مع كلمة "Aspirin"
SELECT simple_search('Aspirin', 8);

-- اختبار 5: اختبار simple_search مع كلمة "abcès"
SELECT simple_search('abcès', 8);
