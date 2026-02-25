#!/bin/bash

echo "=========================================="
echo "فحص بيانات قاعدة البيانات"
echo "=========================================="

# قائمة الجداول
echo -e "\n1️⃣ الجداول الموجودة:"
psql "$DATABASE_URL" -t -c "\dt" 2>/dev/null || echo "❌ لم نتمكن من الاتصال بـ psql"

# عد الأدوية
echo -e "\n2️⃣ عدد الأدوية:"
psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM clinical_embeddings;" 2>/dev/null || echo "جاري الفحص..."

# عرض أول دواء
echo -e "\n3️⃣ أول دواء في القاعدة:"
psql "$DATABASE_URL" -t -c "SELECT id, source, LEFT(content, 150) FROM clinical_embeddings LIMIT 1;" 2>/dev/null || echo "جاري الفحص..."

# اختبار البحث
echo -e "\n4️⃣ اختبار البحث عن 'خراج':"
psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM simple_search('خراج', 8);" 2>/dev/null || echo "جاري الفحص..."

echo -e "\n=========================================="
