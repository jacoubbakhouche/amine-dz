#!/bin/bash

# اختبار Supabase RPC مباشرة
SUPABASE_URL="https://wtpodigifgbbvwqrmobo.supabase.co"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0cG9kaWdpZmdibnd2cXJtb2JvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcwMjY0MDE0OCwiZXhwIjoyMDIyOTYwMTQ4fQ.l0Mu_XdElAqr1Pc4JX5LdMdmVCJ0BDpjsRqO3rYePfI"

echo "=========================================="
echo "اختبار SQL Functions مباشرة"
echo "=========================================="

# Test 1: Count medicines
echo -e "\n1️⃣ عدد الأدوية:"
curl -s -X POST \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  "$SUPABASE_URL/rest/v1/rpc/count_medicines" \
  -d '{}' 2>&1 | jq . || echo "لا توجد دالة count_medicines"

# Test 2: Test simple_search with Arabic
echo -e "\n2️⃣ اختبار simple_search('خراج', 8):"
curl -s -X POST \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  "$SUPABASE_URL/rest/v1/rpc/simple_search" \
  -d '{"query_text": "خراج", "match_count": 8}' 2>&1 | jq '.[:2]' || echo "خطأ في الاستدعاء"

# Test 3: Test simple_search with English
echo -e "\n3️⃣ اختبار simple_search('Aspirin', 8):"
curl -s -X POST \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  "$SUPABASE_URL/rest/v1/rpc/simple_search" \
  -d '{"query_text": "Aspirin", "match_count": 8}' 2>&1 | jq '.[:2]' || echo "خطأ في الاستدعاء"

# Test 4: Direct SQL query to count
echo -e "\n4️⃣ عدد الأدوية (SQL مباشر):"
curl -s -X POST \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  "$SUPABASE_URL/rest/v1/clinical_embeddings?select=count()&count=exact" 2>&1 | jq . || echo "خطأ"

echo -e "\n=========================================="
