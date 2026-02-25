# 📋 دليل حذف وإعادة تحميل البيانات

## 🔴 الخطوة 1: حذف جميع البيانات من clinical_embeddings

```bash
# تسجيل الدخول إلى Supabase CLI
supabase login

# تنفيذ الأوامر على قاعدة البيانات
```

### الأمر الأول - حذف البيانات:
```sql
-- حذف كل البيانات من جدول clinical_embeddings
TRUNCATE TABLE clinical_embeddings CASCADE;

-- التحقق من أن الجدول فارغ
SELECT COUNT(*) FROM clinical_embeddings;
```

---

## 🟢 الخطوة 2: إعادة تحميل البيانات الكاملة

### الطريقة الأولى - استخدام Migration:

```bash
# 1. تطبيق كل Migrations من جديد
supabase migration list
supabase migration up

# 2. أو تطبيق migration معين
supabase migration up 20260225_add_pediatric_medicines.sql
```

### الطريقة الثانية - استخدام SQL Script مباشر:

```bash
# 1. تنفيذ الـ rebuild الكامل
psql "$DATABASE_URL" -f supabase/full_rebuild.sql

# 2. ثم تطبيق جميع الـ migrations
for file in supabase/migrations/*.sql; do
  psql "$DATABASE_URL" -f "$file"
done
```

### الطريقة الثالثة - عبر Supabase Dashboard:

1. اذهب إلى: https://supabase.com/dashboard
2. اختر مشروعك
3. اذهب إلى **SQL Editor**
4. انسخ والصق أوامر SQL المرفقة
5. اضغط **Run**

---

## 🔑 أوامر سريعة (للـ Terminal):

### حذف البيانات:
```bash
# تسجيل الدخول
supabase link

# تنفيذ الحذف
supabase db push --dry-run  # للمعاينة أولاً
supabase db push            # للتنفيذ الفعلي
```

### التحقق من البيانات:
```bash
# عدد الأدوية المحملة
curl -X POST "https://YOUR_PROJECT_ID.supabase.co/rest/v1/rpc/simple_search" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query_text": "drug", "match_count": 100}' | jq 'length'
```

---

## ⚡ أمر شامل (One-liner):

```bash
# حذف واعادة تحميل من GitHub مباشرة
curl -L https://raw.githubusercontent.com/jacoubbakhouche/amine-dz/main/supabase/full_rebuild.sql | \
  psql "$DATABASE_URL"
```

---

## 📊 مراحل العملية:

| المرحلة | الأمر | الحالة |
|--------|------|--------|
| **1. الحذف** | `TRUNCATE TABLE clinical_embeddings;` | ❌ حذف البيانات |
| **2. التحقق** | `SELECT COUNT(*) FROM clinical_embeddings;` | ✅ يجب تكون النتيجة 0 |
| **3. الإعادة** | تطبيق Migrations | ✅ إعادة البيانات |
| **4. التحقق النهائي** | `SELECT COUNT(*) FROM clinical_embeddings;` | ✅ يجب تكون النتيجة > 0 |

---

## 🚨 تحذيرات مهمة:

⚠️ **هذه العملية ستحذف جميع البيانات بشكل نهائي!**
- تأكد من عمل نسخة احتياطية أولاً
- استخدم `--dry-run` للمعاينة قبل التنفيذ الفعلي
- لا تقم بهذا في الإنتاج (Production) بدون إذن

---

## ✅ بعد الانتهاء:

1. ✅ تحقق من عدد البيانات المحملة
2. ✅ اختبر الأسئلة الأساسية
3. ✅ تأكد من أن النتائج صحيحة
4. ✅ اخبرني عن النتيجة!
