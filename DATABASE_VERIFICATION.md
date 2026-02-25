# 🗄️ دليل البيانات الموجودة في قاعدة البيانات

## 📌 كيفية التحقق من البيانات المتاحة

### الطريقة 1: من خلال Supabase Dashboard

1. اذهب إلى: [https://app.supabase.com](https://app.supabase.com)
2. اختر المشروع: `wtpodigifgbbvwqrmobo`
3. انقر على **SQL Editor**
4. شغّل الأوامر التالية:

---

## 🔍 استعلامات SQL للتحقق من البيانات

### 1️⃣ عد البيانات حسب النوع

```sql
SELECT source, COUNT(*) as count
FROM clinical_embeddings
GROUP BY source;
```

**النتيجة المتوقعة:**
```
source                    | count
--------------------------|------
dental_products           | 500+
antibiotic_rules          | 50+
dental_products_child     | 300+
category_mapping          | 100+
antibiotic_rules_kce      | 100+
```

---

### 2️⃣ البحث عن منتج محدد (ELUGEL)

```sql
SELECT 
    id,
    source,
    content,
    metadata->>'nom' as product_name,
    metadata->>'cnk' as cnk_code
FROM clinical_embeddings
WHERE content ILIKE '%ELUGEL%'
LIMIT 5;
```

**النتيجة المتوقعة:**
```
يظهر معلومات ELUGEL GEL BUCCAL مع:
- اسم المنتج
- كود CNK
- المادة الفعالة
- الاستخدامات
```

---

### 3️⃣ البحث عن ELVEOR

```sql
SELECT 
    id,
    source,
    content,
    metadata->>'nom' as product_name
FROM clinical_embeddings
WHERE content ILIKE '%ELVEOR%'
LIMIT 5;
```

---

### 4️⃣ البحث عن ELMEX

```sql
SELECT 
    id,
    source,
    content,
    metadata->>'nom' as product_name
FROM clinical_embeddings
WHERE content ILIKE '%ELMEX%'
LIMIT 5;
```

---

### 5️⃣ البحث عن قواعس ESC

```sql
SELECT 
    id,
    source,
    content,
    metadata
FROM clinical_embeddings
WHERE source = 'antibiotic_rules'
    AND content ILIKE '%ESC%'
LIMIT 5;
```

---

### 6️⃣ البحث عن جرعات الأطفال

```sql
SELECT 
    id,
    source,
    content,
    metadata->>'nom_produit' as product_name,
    metadata->>'section_age' as age_group
FROM clinical_embeddings
WHERE source = 'dental_products_child'
LIMIT 10;
```

---

## 📊 معلومات المنتجات الرئيسية

### ELUGEL GEL BUCCAL
```sql
SELECT 
    content,
    metadata
FROM clinical_embeddings
WHERE metadata->>'nom' LIKE '%ELUGEL%'
    AND metadata->>'cnk' = '4118384';
```

**المعلومات المتوقعة:**
```
- اسم: ELUGEL GEL BUCCAL
- CNK: 4118384
- مادة فعالة: Chlorhexidine digluconate 0.2%
- استخدام: علاج الالتهابات
- جرعة: 2-3 مرات يومياً
- مدة: 15 يوم أقصى
```

---

### ELVEOR BLANCHEUR
```sql
SELECT 
    content,
    metadata
FROM clinical_embeddings
WHERE metadata->>'nom' ILIKE '%ELVEOR%BLANCHEUR%';
```

---

### ELMEX OPTIWHITE
```sql
SELECT 
    content,
    metadata
FROM clinical_embeddings
WHERE metadata->>'nom' ILIKE '%ELMEX%OPTIWHITE%';
```

---

## 🎯 أمثلة البيانات المتوقعة

### مثال 1: بيانات منتج
```json
{
  "id": "uuid",
  "source": "dental_products",
  "content": "Product: ELUGEL GEL BUCCAL\nUses: oral infections\nDescription: ...",
  "metadata": {
    "nom": "ELUGEL GEL BUCCAL",
    "cnk": "4118384",
    "composants": ["Chlorhexidine 0.2%", "..."],
    "indications": ["أمراض الفم", "الالتهابات"],
    "posologie": "2-3 مرات يومياً",
    "duree": "15 jours max",
    "contre_indications": ["..."],
    "avertissements": ["..."]
  },
  "similarity": 0.95
}
```

---

### مثال 2: قاعدة ESC
```json
{
  "source": "antibiotic_rules",
  "metadata": {
    "id": "ESC_HIGH_RISK_001",
    "condition": "High-risk endocarditis",
    "recommendation": "Amoxicillin 3g IV/IM 30-60 min before",
    "dosage": "3000mg",
    "duration": "one dose",
    "contraindications": "Penicillin allergy"
  }
}
```

---

## ✅ قائمة التحقق من البيانات

اختبر في Supabase SQL Editor:

- [ ] ELUGEL موجود بـ CNK 4118384
- [ ] ELVEOR موجود كمنتج تبييض
- [ ] ELMEX موجود كمنتج فلورايد
- [ ] قواعس ESC موجودة
- [ ] بيانات الأطفال موجودة
- [ ] كل منتج له معلومات متكاملة
- [ ] لا توجد بيانات فارغة
- [ ] الرموز العربية تظهر صحيح

---

## 🔧 في حالة المشاكل

### المشكلة 1: البيانات فارغة
```sql
-- تحقق من وجود الجدول
SELECT COUNT(*) FROM clinical_embeddings;
```

**الحل:**
```bash
# شغّل script التضمين
npm run generate:embeddings
```

---

### المشكلة 2: البيانات لا تظهر عند البحث
```sql
-- تحقق من الفهرس
SELECT * FROM clinical_embeddings
WHERE content @@ to_tsquery('simple', 'ELUGEL');
```

---

### المشكلة 3: المتجهات فارغة
```sql
-- تحقق من المتجهات
SELECT COUNT(*) 
FROM clinical_embeddings 
WHERE embedding IS NOT NULL;
```

---

## 📝 الأوامر الأساسية

### عرض كل البيانات من نوع
```sql
SELECT 
    id,
    source,
    LENGTH(content) as content_length,
    metadata->>'nom' as name
FROM clinical_embeddings
WHERE source = 'dental_products'
LIMIT 20;
```

### عد العناصر لكل نوع
```sql
SELECT source, COUNT(*) FROM clinical_embeddings GROUP BY source;
```

### البحث النصي البسيط
```sql
SELECT * FROM clinical_embeddings
WHERE content ILIKE '%keyword%'
LIMIT 10;
```

### البحث بالتشابه
```sql
SELECT 
    *,
    1 - (embedding <=> '[متجه هنا]'::vector(384)) as similarity
FROM clinical_embeddings
WHERE 1 - (embedding <=> '[متجه هنا]'::vector(384)) > 0.7
ORDER BY similarity DESC;
```

---

## 🎯 البيانات المتوقعة للاختبارات

### للاختبار 1 (منتج موجود):
**البحث عن:** ELUGEL  
**البيانات:** يجب أن يجد القليل من السجلات مع معلومات كاملة

### للاختبار 2 (منتج غير موجود):
**البحث عن:** Doliprane  
**البيانات:** لا توجد نتائج (صفر سجلات)

### للاختبار 3 (متابعة):
**السياق:** من المحادثة السابقة  
**البيانات:** استخدم نفس سجلات ELUGEL

### للاختبار 4 (بدائل):
**البحث عن:** منتجات التبييض  
**البيانات:** ELVEOR و ELMEX وغيرها

### للاختبار 5 (ESC):
**البحث عن:** antibiotic_rules  
**البيانات:** قواعس المضادات الحيوية

---

## 💾 حفظ البيانات للمراجعة

لحفظ نتائج الاستعلام:

```sql
-- تصدير كـ JSON
SELECT json_agg(
    json_build_object(
        'name', metadata->>'nom',
        'cnk', metadata->>'cnk',
        'content', content
    )
) as data
FROM clinical_embeddings
WHERE source = 'dental_products'
LIMIT 50;
```

---

## 🚀 للبدء الفوري

1. افتح Supabase Dashboard
2. انقر SQL Editor
3. انسخ أحد الاستعلامات أعلاه
4. اضغط Ctrl+Enter
5. تحقق من النتائج

**الآن أنت جاهز للاختبار! 🎉**
