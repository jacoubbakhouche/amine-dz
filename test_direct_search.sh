#!/bin/bash

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}اختبار البحث المباشر في قاعدة البيانات${NC}"
echo -e "${YELLOW}════════════════════════════════════════════════${NC}"

# Get connection string from environment or use default
DB_URL="${DATABASE_URL:-postgresql://postgres:nxz4yhYldhVvSy9A@db.wtpodigifgbbvwqrmobo.supabase.co:5432/postgres}"

if [ -z "$DB_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL not set${NC}"
    exit 1
fi

echo -e "\n${GREEN}1️⃣  عدد الصفوف في clinical_embeddings:${NC}"
psql "$DB_URL" -t -c "SELECT COUNT(*) as total_rows FROM clinical_embeddings;" 2>/dev/null || {
    echo -e "${RED}❌ Connection failed${NC}"
    exit 1
}

echo -e "\n${GREEN}2️⃣  عرض أول 3 صفوف:${NC}"
psql "$DB_URL" -t -c "
SELECT id, source, SUBSTRING(content FROM 1 FOR 60) as content_preview, metadata
FROM clinical_embeddings
LIMIT 3;
" 2>/dev/null

echo -e "\n${GREEN}3️⃣  البحث عن كلمة 'Aspirin':${NC}"
psql "$DB_URL" -t -c "
SELECT id, source, SUBSTRING(content FROM 1 FOR 60), 
       CASE WHEN LOWER(content) LIKE '%aspirin%' THEN 'YES' ELSE 'NO' END as contains_aspirin
FROM clinical_embeddings
WHERE LOWER(content) LIKE '%aspirin%'
LIMIT 5;
" 2>/dev/null

echo -e "\n${GREEN}4️⃣  استدعاء simple_search('Aspirin', 8):${NC}"
psql "$DB_URL" -t -c "
SELECT id, source, SUBSTRING(content FROM 1 FOR 60), text_relevance, combined_score
FROM simple_search('Aspirin', 8);
" 2>/dev/null

echo -e "\n${GREEN}5️⃣  استدعاء simple_search('خراج', 8):${NC}"
psql "$DB_URL" -t -c "
SELECT id, source, SUBSTRING(content FROM 1 FOR 60), text_relevance, combined_score
FROM simple_search('خراج', 8);
" 2>/dev/null

echo -e "\n${GREEN}6️⃣  البحث عن 'abcès':${NC}"
psql "$DB_URL" -t -c "
SELECT id, source, SUBSTRING(content FROM 1 FOR 60), 
       CASE WHEN LOWER(content) LIKE '%abcès%' THEN 'YES' ELSE 'NO' END as found
FROM clinical_embeddings
WHERE LOWER(content) LIKE '%abcès%'
LIMIT 3;
" 2>/dev/null

echo -e "\n${GREEN}7️⃣  استدعاء simple_search('abcès', 8):${NC}"
psql "$DB_URL" -t -c "
SELECT id, source, SUBSTRING(content FROM 1 FOR 60), text_relevance, combined_score
FROM simple_search('abcès', 8);
" 2>/dev/null

echo -e "\n${YELLOW}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ الاختبار انتهى${NC}"
echo -e "${YELLOW}════════════════════════════════════════════════${NC}"
