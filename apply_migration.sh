#!/bin/bash

# ⚠️ استخدم متغيرات البيئة من Vercel
# SUPABASE_URL و SERVICE_KEY
SUPABASE_URL="${SUPABASE_URL:-https://your-project.supabase.co}"
SERVICE_KEY="${SERVICE_KEY:-YOUR_SERVICE_KEY}"

# اقرأ ملف الـ SQL
SQL_CONTENT=$(cat /Users/bakhouche/amin/supabase/migrations/20250224_create_simple_search.sql)

echo "جاري تطبيق migration..."

# استدعاء API
curl -s -X POST \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "apikey: $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  "$SUPABASE_URL/rest/v1/rpc/exec" \
  -d "{\"query\": \"$(echo "$SQL_CONTENT" | jq -Rs .)\"}" \
  | jq . || {
    echo "الطريقة الأولى لم تعمل. جاري المحاولة مع psql_exec..."
}
