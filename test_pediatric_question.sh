#!/bin/bash

# ⚠️ استخدم متغيرات البيئة من Vercel
SUPABASE_URL="${SUPABASE_URL:-https://your-project.supabase.co}"
ANON_KEY="${ANON_KEY:-YOUR_ANON_KEY}"

echo "════════════════════════════════════════════════════════════"
echo "اختبار: Abcès dentaire chez enfant 20 kg, posologie précise ?"
echo "════════════════════════════════════════════════════════════"
echo ""

# السؤال
QUESTION="Abcès dentaire chez enfant 20 kg, posologie précise ?"

echo "📝 السؤال: $QUESTION"
echo ""
echo "🤖 جاري الحصول على إجابة من الـ AI..."
echo ""

# استدعاء الـ Edge Function
RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  "$SUPABASE_URL/functions/v1/pro-rag-consultation" \
  -d "{
    \"question\": \"$QUESTION\",
    \"conversationId\": \"test-pediatric\",
    \"history\": []
  }")

echo "════════════════════════════════════════════════════════════"
echo "📊 النتيجة من الـ AI:"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "$RESPONSE" | jq '{success: .success, retrievedDocuments: .retrievedDocuments, content: .content}'
echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ الاختبار انتهى"
echo "════════════════════════════════════════════════════════════"
