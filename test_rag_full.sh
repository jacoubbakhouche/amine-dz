#!/bin/bash

echo "=========================================="
echo "اختبار شامل للـ RAG Pipeline"
echo "=========================================="

# ⚠️ متغيرات من Vercel Environment Variables
SUPABASE_URL="${SUPABASE_URL:-https://your-project.supabase.co}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-YOUR_ANON_KEY}"
EDGE_FUNCTION_URL="$SUPABASE_URL/functions/v1/pro-rag-consultation"

# قائمة الأسئلة للاختبار
declare -a questions=(
    "خراج في الأسنان"
    "Aspirin"
    "abcès dentaire"
    "أموكسيسيلين"
)

for question in "${questions[@]}"; do
    echo -e "\n=========================================="
    echo "السؤال: $question"
    echo "=========================================="
    
    # إرسال الطلب
    curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
        -d "{\"question\": \"$question\", \"history\": [], \"conversationId\": \"test-123\"}" \
        "$EDGE_FUNCTION_URL" | jq .
done

echo -e "\n=========================================="
echo "انتهى الاختبار"
echo "=========================================="
