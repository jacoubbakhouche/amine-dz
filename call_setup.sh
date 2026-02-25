#!/bin/bash

# ⚠️ استخدم متغيرات البيئة من Vercel
SUPABASE_URL="${SUPABASE_URL:-https://your-project.supabase.co}"
SERVICE_KEY="${SERVICE_KEY:-YOUR_SERVICE_KEY}"

echo "جاري محاولة إنشاء simple_search function عبر Edge Function..."

# Call the setup function
curl -s -X POST \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "apikey: $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  "$SUPABASE_URL/functions/v1/setup-simple-search" \
  -d '{}' | jq .
