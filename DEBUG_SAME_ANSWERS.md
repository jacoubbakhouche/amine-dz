# 🔧 تشخيص المشكلة - ELUGEL و ABOCA

## المشكلة 🔴
التطبيق يعطي **نفس التحذيرات وطريقة الاستخدام** لكل المنتجات!

---

## الحل: استعلامات SQL للتحقق

### 1️⃣ البحث عن ELUGEL في قاعدة البيانات
```sql
SELECT 
    id,
    source,
    content,
    metadata->>'nom' as nom,
    metadata->>'cnk' as cnk,
    similarity
FROM clinical_embeddings
WHERE content ILIKE '%ELUGEL%'
OR metadata->>'nom' ILIKE '%ELUGEL%'
ORDER BY id
LIMIT 5;
```

**يجب أن تظهر:**
- معلومات مختلفة عن ELUGEL
- جرعات محددة لـ ELUGEL
- تحذيرات خاصة بـ ELUGEL فقط

---

### 2️⃣ البحث عن ABOCA في قاعدة البيانات
```sql
SELECT 
    id,
    source,
    content,
    metadata->>'nom' as nom,
    metadata->>'cnk' as cnk,
    similarity
FROM clinical_embeddings
WHERE content ILIKE '%ABOCA%'
OR metadata->>'nom' ILIKE '%ABOCA%'
ORDER BY id
LIMIT 5;
```

**يجب أن تظهر:**
- معلومات مختلفة عن ABOCA
- جرعات محددة لـ ABOCA
- تحذيرات خاصة بـ ABOCA فقط

---

### 3️⃣ مقارنة البيانات
```sql
-- ELUGEL
SELECT COUNT(*) as ELUGEL_count
FROM clinical_embeddings
WHERE content ILIKE '%ELUGEL%';

-- ABOCA
SELECT COUNT(*) as ABOCA_count
FROM clinical_embeddings
WHERE content ILIKE '%ABOCA%';
```

---

## ✅ الحل المطبق

تم تحديث `index.ts` في Edge Function لـ:

### 1. استخراج أسماء المنتجات من البيانات المسحوبة
```typescript
const productNameMatches = context.match(/📦 المنتج: ([^\n]+)/g) || [];
const productNames = productNameMatches.map(m => m.replace('📦 المنتج: ', '').trim());
```

### 2. إضافة تعليمات شخصية حسب كل منتج
```typescript
let dataInstructions = "";
if (productNames.length > 0 && context.length > 0) {
    dataInstructions = `
⚡ **البيانات المتاحة في هذا الطلب:**
المنتجات: ${productNames.join(', ')}

👉 **تعليمات مهمة:**
- استخدم فقط البيانات من المنتجات المذكورة أعلاه
- لا تخلط معلومات منتج بمنتج آخر
- كل منتج له استخدامات وجرعات مختلفة
- تأكد من إعطاء المعلومات الصحيحة لكل منتج بالضبط
`;
}
```

### 3. إضافة تعليمات واضحة في System Prompt
```
- التركيبة الكاملة - أهم شيء!
- الاستخدامات - تختلف من منتج لآخر
- طريقة الاستخدام - يجب أن تكون مختلفة لكل منتج
- التحذيرات والموانع - لا تنسخ من منتج آخر
```

---

## 🚀 الخطوات التالية

### خطوة 1: التحقق من البيانات
```bash
# شغّل Supabase SQL Editor
# انسخ الاستعلامات أعلاه
# تأكد من أن البيانات مختلفة فعلاً
```

### خطوة 2: اختبر التطبيق مرة أخرى
```bash
npm run dev
http://localhost:5173/chat
```

### خطوة 3: اسأل الأسئلة
```
1. معلومات عن ELUGEL
2. معلومات عن ABOCA
3. قارن بين الجرعات
```

---

## 📋 ما الذي يجب أن تراه الآن

### قبل الإصلاح ❌
```
ELUGEL: جرعة 2-3 مرات + تحذيرات عامة
ABOCA:  جرعة 2-3 مرات + نفس التحذيرات
```

### بعد الإصلاح ✅
```
ELUGEL: جرعة محددة + تحذيرات ELUGEL
ABOCA:  جرعة مختلفة + تحذيرات ABOCA
```

---

## 🔍 التشخيص الإضافي

إذا استمرت المشكلة:

### 1. تحقق من الـ Logs
```bash
# في Supabase Functions، شاهد الـ Logs
# ابحث عن: "[DEBUG] Final Context being sent to AI"
# تأكد من أن كل منتج له بيانات مختلفة
```

### 2. تحقق من البيانات المسحوبة
```sql
-- انظر ماذا يسحب من قاعدة البيانات
SELECT 
    content,
    metadata
FROM clinical_embeddings
WHERE content ILIKE '%ELUGEL%'
LIMIT 1;
```

### 3. قارن مع ABOCA
```sql
SELECT 
    content,
    metadata
FROM clinical_embeddings
WHERE content ILIKE '%ABOCA%'
LIMIT 1;
```

---

## 💡 نصائح إضافية

1. **إذا كانت البيانات متطابقة:**
   - المشكلة في البيانات نفسها
   - احتاج تحديث البيانات في قاعدة البيانات

2. **إذا كانت البيانات مختلفة:**
   - الإصلاح يجب أن يعمل الآن
   - اختبر مرة أخرى

3. **إذا استمرت المشكلة:**
   - تحقق من Groq API logs
   - قد تكون مشكلة في كيفية معالجة البيانات

---

## ✅ قائمة الفحص

- [ ] قرأت المشكلة بوضوح
- [ ] فهمت السبب (نفس التعليمات لكل منتج)
- [ ] طبقت الإصلاح (تحديث System Prompt)
- [ ] اختبرت الأسئلة مرة أخرى
- [ ] رأيت الفرق الآن ✅

---

**الآن اختبر التطبيق من جديد! 🚀**
