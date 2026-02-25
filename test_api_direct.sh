#!/bin/bash

# ⚠️ استخدم متغيرات البيئة من Vercel
SUPABASE_URL="${SUPABASE_URL:-https://your-project.supabase.co}"
SERVICE_KEY="${SERVICE_KEY:-YOUR_SERVICE_KEY}"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}اختبار REST API مباشر للبيانات${NC}"
echo -e "${YELLOW}════════════════════════════════════════════════${NC}"

echo -e "\n${GREEN}1️⃣  عدد الصفوف في clinical_embeddings:${NC}"
curl -s \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "apikey: $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  "$SUPABASE_URL/rest/v1/clinical_embeddings?select=count()&count=exact" | jq '.' 2>/dev/null || echo "Error"

echo -e "\n${GREEN}2️⃣  عرض أول 3 صفوف:${NC}"
curl -s \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "apikey: $SERVICE_KEY" \
  "$SUPABASE_URL/rest/v1/clinical_embeddings?select=id,source,content&limit=3" | jq '.[] | {id: .id, source: .source, content_preview: (.content | .[0:60])}' 2>/dev/null || echo "Error"

echo -e "\n${GREEN}3️⃣  البحث عن Aspirin:${NC}"
curl -s \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "apikey: $SERVICE_KEY" \
  "$SUPABASE_URL/rest/v1/clinical_embeddings?select=id,source,content&content=ilike.*Aspirin*&limit=5" | jq '.[] | {source: .source, found: "YES"}' 2>/dev/null || echo "Error"

echo -e "\n${GREEN}4️⃣  استدعاء simple_search RPC مع 'Aspirin':${NC}"
curl -s -X POST \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "apikey: $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  "$SUPABASE_URL/rest/v1/rpc/simple_search" \
  -d '{"query_text": "Aspirin", "match_count": 8}' | jq '.' 2>/dev/null || echo "Error calling RPC"

echo -e "\n${GREEN}5️⃣  استدعاء simple_search RPC مع 'خراج':${NC}"
curl -s -X POST \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "apikey: $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  "$SUPABASE_URL/rest/v1/rpc/simple_search" \
  -d '{"query_text": "خراج", "match_count": 8}' | jq '.' 2>/dev/null || echo "Error calling RPC"

echo -e "\n${YELLOW}════════════════════════════════════════════════${NC}"
