# 🐛 Pro RAG Pipeline - Troubleshooting Guide

## الأخطاء الشائعة والحلول

---

## ❌ خطأ #1: "hybrid_search function not found"

### الأعراض
```
Error: function hybrid_search(...) does not exist
```

### الحلول المحتملة

**الحل 1: تأكد من تشغيل SQL Script**
```sql
-- في Supabase SQL Editor، شغّل:
supabase/pro_rag_pipeline.sql

-- تحقق من النجاح:
SELECT EXISTS (
  SELECT 1 FROM information_schema.routines 
  WHERE routine_name = 'hybrid_search'
);
-- النتيجة المتوقعة: true
```

**الحل 2: تحقق من الـ Permissions**
```sql
-- تأكد من GRANT statements
GRANT EXECUTE ON FUNCTION hybrid_search TO anon, authenticated, service_role;

-- إذا فشلت GRANT، جرب كـ superuser:
GRANT EXECUTE ON FUNCTION hybrid_search TO postgres;
```

**الحل 3: تحقق من Vector Extension**
```sql
-- تأكد من تفعيل pgvector
SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector');
-- النتيجة المتوقعة: true

-- إذا false:
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## ❌ خطأ #2: "Edge Function deployment failed"

### الأعراض
```
Error: Failed to deploy pro-rag-consultation
```

### الحلول

**الحل 1: تحقق من Supabase CLI**
```bash
# تأكد من تثبيت CLI
supabase --version

# إذا لم تُثبت:
npm install -g supabase
```

**الحل 2: تسجيل الدخول**
```bash
# تسجيل الدخول
supabase login

# حدد المشروع
supabase link --project-id YOUR_PROJECT_ID
```

**الحل 3: Deploy مع Verbose Output**
```bash
supabase functions deploy pro-rag-consultation \
  --project-id YOUR_PROJECT_ID \
  --verbose
```

**الحل 4: تحقق من ملف index.ts**
```bash
# تأكد من وجود الملف
ls -la supabase/functions/pro-rag-consultation/index.ts

# يجب أن يكون موجوداً وغير فارغ
wc -l supabase/functions/pro-rag-consultation/index.ts
# النتيجة المتوقعة: >300 lines
```

---

## ❌ خطأ #3: "HUGGINGFACE_API_KEY not found"

### الأعراض
```
Error: Deno.env.get('HUGGINGFACE_API_KEY') returned undefined
```

### الحلول

**الحل 1: أضف المتغيرات في Supabase Dashboard**
1. اذهب إلى: **Functions** → **pro-rag-consultation**
2. اضغط **Configuration**
3. أضف:
   ```
   HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxx
   GROQ_API_KEY=gsk_xxxxxxxxxxxx
   ```

**الحل 2: تحقق من Format الـ Key**
```bash
# HuggingFace Key يجب أن يبدأ بـ hf_
# مثال صحيح: hf_aBcDeFgHiJkLmNoPqRsT

# Groq Key يجب أن يبدأ بـ gsk_
# مثال صحيح: gsk_aBcDeFgHiJkLmNoPqRsT
```

**الحل 3: Redeploy بعد إضافة المتغيرات**
```bash
# تأكد من حفظ المتغيرات
# ثم redeploy الـ function
supabase functions deploy pro-rag-consultation --project-id YOUR_PROJECT_ID
```

---

## ❌ خطأ #4: "HuggingFace API error 429 (Rate Limit)"

### الأعراض
```
Error: HTTP 429 Too Many Requests
```

### الحلول

**الحل 1: استخدم HuggingFace Pro Account**
```
Current: Free tier (limited requests)
Better: Pro account ($9/month, unlimited)
```

**الحل 2: أضف خاصية wait_for_model في Request**
```typescript
// في pro-rag-consultation/index.ts
const response = await fetch(..., {
  body: JSON.stringify({ 
    inputs: text,
    wait_for_model: true  // ✓ أضيفت بالفعل
  })
});
```

**الحل 3: استخدم Groq للـ Embeddings بدل HuggingFace**
```typescript
// بدل HuggingFace:
// const embedding = await getFromHuggingFace(text);

// استخدم OpenAI API (أفضل):
const embedding = await getFromOpenAI(text);
```

---

## ❌ خطأ #5: "No documents retrieved (Empty Results)"

### الأعراض
```
Retrieved 0 documents
Answer: عذراً، هذه المعلومة غير متوفرة في قاعدة البيانات.
```

### الحلول

**الحل 1: تحقق من وجود Data**
```sql
-- في SQL Editor
SELECT COUNT(*) FROM clinical_embeddings;
-- النتيجة يجب أن تكون > 0
```

**الحل 2: إذا كانت النتيجة 0، شغّل SQL Scripts**
```bash
# الخطوات:
1. افتح Supabase SQL Editor
2. شغّل: supabase/rebuild_schema.sql
3. ثم شغّل: supabase/full_rebuild.sql
4. تحقق: SELECT COUNT(*) FROM clinical_embeddings;
```

**الحل 3: تحقق من Embeddings Column**
```sql
-- تأكد من وجود embeddings
SELECT COUNT(*) FROM clinical_embeddings WHERE embedding IS NOT NULL;

-- إذا كانت 0، احسبها:
UPDATE clinical_embeddings SET embedding = ...
```

**الحل 4: خفّف معيار البحث**
```typescript
// في hybrid_search function
// غيّر v_threshold من 0.4 إلى 0.2
const v_threshold float := 0.2; // أخف
```

---

## ❌ خطأ #6: "Groq API Error (rate limit / invalid key)"

### الأعراض
```
Error: 401 Unauthorized
Error: 429 Too Many Requests
```

### الحلول

**الحل 1: تحقق من Groq API Key**
```bash
# جرب الـ Key مباشرة:
curl -H "Authorization: Bearer YOUR_KEY" \
  https://api.groq.com/openai/v1/models

# يجب أن ترى قائمة models
```

**الحل 2: استخدم أرخص Model**
```typescript
// بدل mixtral-8x7b-32768:
model: "mixtral-8x7b-32768"  // أغلى

// استخدم:
model: "llama-2-70b-chat"  // أرخص
```

**الحل 3: أضف Retry Logic**
```typescript
// كود مقترح للـ retry:
async function callGroqWithRetry(messages, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetch(groqUrl, { ... });
    } catch (e) {
      if (i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      } else {
        throw e;
      }
    }
  }
}
```

---

## ❌ خطأ #7: "Chat.tsx - Component not rendering"

### الأعراض
```
Blank page
Or: Error in console about chat-consultation vs pro-rag-consultation
```

### الحلول

**الحل 1: تحقق من استدعاء الـ Function**
```typescript
// يجب أن يكون:
fetch(`${supabaseUrl}/functions/v1/pro-rag-consultation`, ...)

// ليس:
fetch(`${supabaseUrl}/functions/v1/chat-consultation`, ...)
```

**الحل 2: تحقق من Imports**
```typescript
// ✓ صحيح:
import { useAuth } from '../contexts/AuthContext';

// ✗ خطأ (تم حذفه):
import { pipeline, env } from '@xenova/transformers';
```

**الحل 3: Hard Refresh**
```bash
# على Mac: Cmd + Shift + R
# على Windows: Ctrl + Shift + R
# يحذف cache المتصفح
```

**الحل 4: تحقق من Build Errors**
```bash
npm run dev

# إذا كان هناك error في terminal، اقرأه بعناية
# عادة يكون missing import أو syntax error
```

---

## ❌ خطأ #8: "CORS Error"

### الأعراض
```
Access to XMLHttpRequest from 'http://localhost:5173' 
has been blocked by CORS policy
```

### الحلول

**الحل 1: تحقق من CORS Headers في Edge Function**
```typescript
// يجب أن يكون في الـ response headers:
headers: {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST',
  'Access-Control-Allow-Headers': 'Content-Type',
}
// ✓ موجود بالفعل في الـ code
```

**الحل 2: استخدم Supabase Client بدل Fetch**
```typescript
// بدل:
const response = await fetch(supabaseUrl + '/functions/...', {
  headers: { 'Authorization': ... }
});

// استخدم:
const { data, error } = await supabase.functions.invoke('pro-rag-consultation', {
  body: { ... }
});
```

---

## ❌ خطأ #9: "Database Connection Error"

### الأعراض
```
Error: connection refused
Error: ECONNREFUSED
```

### الحلول

**الحل 1: تحقق من الـ DATABASE_URL**
```bash
# تأكد من موجود في environment
echo $DATABASE_URL

# يجب أن تراه مثل:
# postgresql://user:pass@db.xxx.supabase.co:5432/postgres
```

**الحل 2: تحقق من Connection String**
```bash
# في Supabase Dashboard:
1. اذهب إلى: Settings → Database
2. انسخ Connection String
3. استخدمه في الـ environment
```

**الحل 3: تحقق من Firewall**
```bash
# قد تحتاج لإضافة IP address للـ allowlist
# في Supabase: Database → Connection pooling → Allowlist
```

---

## ❌ خطأ #10: "Performance - Slow queries"

### الأعراض
```
Queries taking >5 seconds
Database CPU at 100%
```

### الحلول

**الحل 1: أضف HNSW Index (خطوة مهمة!)**
```sql
-- تشغيل بعد ملء البيانات
CREATE INDEX IF NOT EXISTS clinical_embeddings_hnsw_idx 
ON clinical_embeddings 
USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);

-- ثم تحقق:
SELECT * FROM pg_stat_indexes 
WHERE relname = 'clinical_embeddings_hnsw_idx';
```

**الحل 2: Analyze Query Performance**
```sql
-- شغّل EXPLAIN ANALYZE
EXPLAIN ANALYZE
SELECT * FROM hybrid_search(
  'test query',
  ARRAY[...]::vector(384),
  10
);

-- ابحث عن "Seq Scan" (بطيء)
-- يجب أن تراه "Index Scan" (سريع)
```

**الحل 3: قلل match_count**
```typescript
// بدل:
const { data } = await supabase.rpc("hybrid_search", {
  match_count: 50  // كثير جداً
});

// استخدم:
const { data } = await supabase.rpc("hybrid_search", {
  match_count: 8  // كافي ودقيق
});
```

---

## 🛠️ Quick Debug Checklist

```
□ SQL Functions exist: SELECT COUNT(*) FROM information_schema.routines WHERE routine_name = 'hybrid_search';
□ Edge Function deployed: supabase functions list
□ API Keys set: Check Supabase Functions Configuration
□ Data in DB: SELECT COUNT(*) FROM clinical_embeddings;
□ Embeddings computed: SELECT COUNT(*) FROM clinical_embeddings WHERE embedding IS NOT NULL;
□ HNSW Index created: SELECT * FROM pg_stat_indexes;
□ Frontend uses pro-rag: grep "pro-rag-consultation" src/pages/Chat.tsx
□ Browser cache cleared: Hard refresh (Cmd+Shift+R)
□ Dev server running: npm run dev
□ Network requests OK: Check DevTools Network tab
□ Console errors cleared: Check DevTools Console tab
```

---

## 📞 إذا لم تحل المشكلة

1. **تحقق من الـ Logs:**
   ```bash
   # Supabase Logs
   supabase functions logs pro-rag-consultation
   
   # Browser Console
   F12 → Console tab
   ```

2. **اقرأ الأخطاء بعناية:**
   - رسالة الخطأ تخبرك ماذا يحدث
   - ابحث عن الكلمات الرئيسية

3. **شغّل Tests:**
   ```bash
   # SQL Test
   SELECT * FROM hybrid_search(...);
   
   # API Test
   curl -X POST ... pro-rag-consultation
   ```

4. **أرجع للـ Documentation:**
   - PRO_RAG_DEPLOYMENT.md
   - PRO_RAG_ARCHITECTURE.md

---

## ✅ Everything Working?

إذا كل شيء يشتغل:
1. تهانينا! 🎉
2. اختبر مع queries حقيقية
3. راقب الـ Performance
4. استمتع بـ Pro RAG Pipeline!

---

*آخر تحديث: 2026-02-24*
