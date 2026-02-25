-- Check 1: Count medicines
SELECT COUNT(*) as total_medicines FROM clinical_embeddings;

-- Check 2: Show first 2 medicines (just metadata)
SELECT id, source, metadata->'drug_name' as drug_name FROM clinical_embeddings LIMIT 2;

-- Check 3: Show content length
SELECT source, LENGTH(content) as content_length FROM clinical_embeddings LIMIT 2;
