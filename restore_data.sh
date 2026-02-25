#!/bin/bash

# ====================================================================
# AUTOMATIC DATA CLEANUP AND RESTORE SCRIPT
# ====================================================================

set -e

echo "════════════════════════════════════════════════════════════"
echo "🔴 خطوة 1: حذف جميع البيانات من clinical_embeddings"
echo "════════════════════════════════════════════════════════════"

# قراءة متغيرات البيئة من .env إذا كانت موجودة
if [ -f .env ]; then
    source .env
fi

# استخدم DATABASE_URL من متغيرات البيئة أو اسأل المستخدم
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL غير مضبوط"
    echo "الرجاء تعيين: export DATABASE_URL='postgresql://...'"
    exit 1
fi

# تنفيذ الحذف
psql "$DATABASE_URL" << EOF
TRUNCATE TABLE clinical_embeddings CASCADE;
SELECT COUNT(*) as "Records Remaining" FROM clinical_embeddings;
EOF

echo ""
echo "✅ تم حذف البيانات بنجاح!"
echo ""

# ====================================================================
echo "════════════════════════════════════════════════════════════"
echo "🟢 خطوة 2: إعادة تحميل البيانات من Migrations"
echo "════════════════════════════════════════════════════════════"

# تطبيق جميع migrations
echo "🔄 جاري تطبيق migrations..."

# الطريقة 1: استخدام supabase CLI (إذا كانت مثبتة)
if command -v supabase &> /dev/null; then
    echo "✅ وجدت Supabase CLI - جاري التطبيق..."
    supabase db push
    echo "✅ تم تطبيق Migrations بنجاح!"
else
    echo "⚠️ Supabase CLI غير مثبت - استخدام psql..."
    
    # تطبيق يدوي من خلال psql
    for file in supabase/migrations/*.sql; do
        if [ -f "$file" ]; then
            echo "📝 تطبيق: $(basename $file)"
            psql "$DATABASE_URL" -f "$file"
        fi
    done
    
    echo "✅ تم تطبيق جميع الـ Migrations!"
fi

echo ""

# ====================================================================
echo "════════════════════════════════════════════════════════════"
echo "📊 خطوة 3: التحقق من البيانات المحملة"
echo "════════════════════════════════════════════════════════════"

psql "$DATABASE_URL" << EOF
-- عدد السجلات
SELECT 'إجمالي الأدوية' as "البيان", COUNT(*) as "العدد" 
FROM clinical_embeddings;

-- المصادر المختلفة
SELECT 'المصادر المختلفة' as "البيان", COUNT(DISTINCT source) as "العدد"
FROM clinical_embeddings;

-- أمثلة على البيانات
SELECT 
    'أول 5 أدوية' as "البيان",
    source, 
    LENGTH(content) as "حجم النص"
FROM clinical_embeddings 
LIMIT 5;
EOF

echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ انتهت عملية الاستعادة بنجاح!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "🎯 الخطوات التالية:"
echo "  1. اختبر الأسئلة الأساسية"
echo "  2. تحقق من أن النتائج صحيحة"
echo "  3. اخبرني عن النتيجة!"
echo ""
