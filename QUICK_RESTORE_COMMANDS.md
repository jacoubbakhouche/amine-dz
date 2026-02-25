# 🚀 أوامر حذف وإعادة تحميل البيانات - دليل سريع

## ⚡ الأمر السريع (اختر واحد):

### الخيار 1️⃣ - استخدام Script Bash (الأفضل):
```bash
cd /Users/bakhouche/amin
bash restore_data.sh
```

### الخيار 2️⃣ - استخدام Supabase CLI:
```bash
supabase login
supabase link

# حذف البيانات
supabase db reset

# أو تطبيق migrations محددة
supabase migration up
```

### الخيار 3️⃣ - استخدام psql مباشر:
```bash
# تعيين متغير البيانات
export DATABASE_URL="postgresql://user:password@db.supabase.co/postgres"

# حذف البيانات
psql "$DATABASE_URL" -f cleanup_data.sql

# إعادة تحميل البيانات
for file in supabase/migrations/*.sql; do
    psql "$DATABASE_URL" -f "$file"
done
```

### الخيار 4️⃣ - عبر Supabase Dashboard (الويب):
1. اذهب إلى: https://supabase.com/dashboard
2. اختر مشروع: `amine-dz`
3. اذهب إلى **SQL Editor**
4. انسخ الأوامر أدناه
5. اضغط **Run**

---

## 📝 أوامر SQL للتنفيذ المباشر:

### حذف البيانات:
```sql
-- حذف كل البيانات
TRUNCATE TABLE clinical_embeddings CASCADE;

-- التحقق
SELECT COUNT(*) as records FROM clinical_embeddings;
```

### التحقق من النتائج:
```sql
-- عدد الأدوية
SELECT COUNT(*) FROM clinical_embeddings;

-- المصادر المختلفة
SELECT DISTINCT source FROM clinical_embeddings;

-- أمثلة
SELECT source, content FROM clinical_embeddings LIMIT 5;
```

---

## 🔧 ملفات المساعدة:

| الملف | الوصف |
|------|--------|
| `restore_data.sh` | Script تلقائي (الأسهل) |
| `cleanup_data.sql` | أوامر SQL للحذف |
| `supabase/full_rebuild.sql` | إعادة بناء كاملة |
| `supabase/migrations/*.sql` | ملفات إعادة التحميل |

---

## ✅ خطوات التنفيذ:

**الخطوة 1:** تأكد من وجود DATABASE_URL
```bash
echo $DATABASE_URL
```

**الخطوة 2:** قم بالحذف
```bash
psql "$DATABASE_URL" -c "TRUNCATE TABLE clinical_embeddings CASCADE;"
```

**الخطوة 3:** تحقق من الحذف
```bash
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM clinical_embeddings;"
# يجب تكون النتيجة: 0
```

**الخطوة 4:** أعد تحميل البيانات
```bash
bash restore_data.sh
```

**الخطوة 5:** تحقق من النتائج
```bash
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM clinical_embeddings;"
# يجب تكون النتيجة > 0
```

---

## 🎯 بدائل إذا كنت تريد JSON:

إذا كانت لديك ملفات JSON للبيانات:

```bash
# 1. تحويل JSON إلى SQL
cat data.json | jq -r '.[] | "INSERT INTO clinical_embeddings (source, content) VALUES (\"\(.source)\", \"\(.content)\");"' > data.sql

# 2. تنفيذ الـ SQL
psql "$DATABASE_URL" -f data.sql
```

---

## 🚨 تحذيرات:

⚠️ هذه العملية **حتمية وغير قابلة للرجوع**!
- استخدم `--dry-run` أولاً
- تأكد من وجود نسخة احتياطية
- في الإنتاج، استخدم نسخة منفصلة أولاً

---

**اختر الأمر المناسب أعلاه وأخبرني بالنتيجة! 🚀**
