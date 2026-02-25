#!/bin/bash

# ⚠️ استخدم متغيرات البيئة من Vercel
SUPABASE_URL="${SUPABASE_URL:-https://your-project.supabase.co}"
SERVICE_KEY="${SERVICE_KEY:-YOUR_SERVICE_KEY}"

echo "════════════════════════════════════════════════════════════"
echo "التحقق من الأدوية المقترحة من قبل الـ AI"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "السؤال: Abcès dentaire chez adulte sans allergie, que proposer ?"
echo ""
echo "الأدوية المقترحة من الـ AI:"
echo "1. Métronidazole"
echo "2. Amoxicilline"
echo "3. Clindamycine"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""

# Function to check if a drug exists
check_drug() {
    local drug_name=$1
    echo "🔍 البحث عن: $drug_name"
    
    result=$(curl -s -X POST \
      -H "Authorization: Bearer $SERVICE_KEY" \
      -H "apikey: $SERVICE_KEY" \
      -H "Content-Type: application/json" \
      "$SUPABASE_URL/rest/v1/rpc/simple_search" \
      -d "{\"query_text\": \"$drug_name\", \"match_count\": 5}")
    
    count=$(echo "$result" | jq 'length' 2>/dev/null || echo "0")
    
    if [ "$count" -gt "0" ]; then
        echo "✅ موجود في قاعدة البيانات - $count نتيجة"
        echo "$result" | jq '.[] | {source: .source, drug: (.metadata.drug_name // .content[0:50])}' 2>/dev/null
    else
        echo "❌ غير موجود أو خطأ في البحث"
        echo "Response: $result" | jq '.' 2>/dev/null || echo "Response: $result"
    fi
    echo ""
}

# Check each drug
check_drug "Métronidazole"
check_drug "Amoxicilline"
check_drug "Clindamycine"

echo "════════════════════════════════════════════════════════════"
echo "النتيجة النهائية:"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "إذا ظهرت ✅ لجميع الأدوية → البيانات من قاعدة البيانات ✓"
echo "إذا ظهرت ❌ → البيانات قد تكون هلوسة أو غير دقيقة ✗"
echo ""
