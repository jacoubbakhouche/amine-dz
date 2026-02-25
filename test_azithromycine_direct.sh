#!/bin/bash

# ⚠️ استخدم متغيرات البيئة من Vercel
SUPABASE_URL="${SUPABASE_URL:-https://your-project.supabase.co}"
ANON_KEY="${ANON_KEY:-YOUR_ANON_KEY}"

echo "════════════════════════════════════════════════════════════"
echo "اختبار: طلب مباشر عن Azithromycine"
echo "════════════════════════════════════════════════════════════"
echo ""

# السؤال
QUESTION="اعطيني معلومات على دواء Azithromycine"

echo "📝 السؤال: $QUESTION"
echo ""

# استدعاء الـ Edge Function
RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  "$SUPABASE_URL/functions/v1/pro-rag-consultation" \
  -d "{
    \"question\": \"$QUESTION\",
    \"conversationId\": \"test-direct\",
    \"history\": []
  }")

echo "════════════════════════════════════════════════════════════"
echo "النتيجة:"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "$RESPONSE" | jq '{
  success: .success, 
  retrievedDocuments: .retrievedDocuments,
  contentPreview: .content[0:300]
}'
echo ""
echo "════════════════════════════════════════════════════════════"
