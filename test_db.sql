-- فحص جدول الأدوية
SELECT COUNT(*) as total_drugs FROM clinical_embeddings;
SELECT id, source, content FROM clinical_embeddings LIMIT 5;
