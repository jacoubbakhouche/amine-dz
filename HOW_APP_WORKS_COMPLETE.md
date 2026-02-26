# 📚 شرح كامل كيف يعمل تطبيق Pharmasssit

## 🎯 نظرة عامة

Pharmasssit هو تطبيق استشارة صيدلانية ذكي يستخدم الذكاء الاصطناعي والبحث الدلالي للإجابة على أسئلة المستخدمين حول الأدوية والجرعات والموانع، مع ضمان الحصول على معلومات موثوقة من قاعدة بيانات طبية معتمدة فقط.

---

## 🏗️ البنية المعمارية الكاملة

```
┌─────────────────────────────────────────────────────────────┐
│                   PHARMASSSIT APPLICATION                   │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
        ┌───────▼────────┐  ┌─▼──────────┐ ┌─▼──────────────┐
        │  VERCEL CLOUD  │  │ SUPABASE   │ │   GROQ AI      │
        │  (Frontend)    │  │ (Backend)  │ │  (LLM Model)   │
        └────────────────┘  └────────────┘ └────────────────┘
                │                │                │
        ┌───────▼────────┐  ┌─▼──────────┐     │
        │  React App     │  │ PostgreSQL │     │
        │  - Chat UI     │  │ - Users    │     │
        │  - Auth        │  │ - Messages │     │
        │  - History     │  │ - Medicines│     │
        └────────────────┘  └────────────┘     │
                                │             │
                        ┌───────▼─────────────▼────────┐
                        │   VECTOR DATABASE            │
                        │   pgvector (384 dims)        │
                        │   clinical_embeddings        │
                        └──────────────────────────────┘
```

---

## 📋 الجداول الأساسية في قاعدة البيانات

### 1️⃣ جدول `clinical_embeddings` - البيانات الطبية

```sql
CREATE TABLE clinical_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,          -- اسم الدواء (مثل: "Azithromycine")
  content text NOT NULL,          -- النص الكامل (الجرعة، الموانع، إلخ)
  metadata jsonb,                 -- بيانات إضافية (العمر، الوزن، إلخ)
  embedding vector(384),          -- تمثيل رقمي للمحتوى (للبحث الذكي)
  created_at timestamp with time zone DEFAULT now()
);
```

**مثال على البيانات:**
```
┌────┬──────────────────┬─────────────────────────────────────┐
│ id │     source       │           content                   │
├────┼──────────────────┼─────────────────────────────────────┤
│u1  │ Azithromycine    │ Antibiotic for dental infection ... │
│u2  │ Métronidazole    │ Anaerobic infection treatment ...  │
│u3  │ Amoxicilline     │ Beta-lactam antibiotic for kids ... │
└────┴──────────────────┴─────────────────────────────────────┘
```

### 2️⃣ جدول `conversations` - المحادثات

```sql
CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,  -- صاحب المحادثة
  title text NOT NULL,                           -- اسم المحادثة
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

### 3️⃣ جدول `chat_messages` - الرسائل

```sql
CREATE TABLE chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users NOT NULL,
  role text CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,                         -- النص
  created_at timestamp with time zone DEFAULT now()
);
```

---

## 🔄 تدفق العمل خطوة بخطوة

### **المرحلة 1️⃣: المستخدم يرسل سؤال**

```
المستخدم يكتب في الواجهة:
┌────────────────────────────────────────┐
│ "ما هي جرعة Azithromycine للطفل 20كغ؟"│
└────────────────────────────────────────┘
```

### **المرحلة 2️⃣: معالجة في Frontend (React)**

**ملف:** `src/pages/Chat.tsx`

```typescript
// الخطوة 1: تحويل السؤال إلى vector (embedding)
const questionVector = await generateEmbedding(question);
// النتيجة: [0.123, 0.456, 0.789, ..., 0.999] (384 رقم)

// الخطوة 2: إرسال الطلب إلى Edge Function
const response = await fetch('/api/pro-rag-consultation', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question: "ما هي جرعة Azithromycine للطفل 20كغ؟",
    queryVector: questionVector,      // [0.123, 0.456, ...]
    history: previousMessages,        // الرسائل السابقة
    conversationId: currentConvId     // معرف المحادثة
  })
});
```

### **المرحلة 3️⃣: البحث في قاعدة البيانات (Edge Function)**

**ملف:** `supabase/functions/pro-rag-consultation/index.ts`

```typescript
// الخطوة 1: استقبال الطلب
const { question, queryVector, history, conversationId } = body;

// الخطوة 2: تنظيف السؤال
const cleanInput = question.toLowerCase()
  .trim()
  .replace(/[؟?،,.[\]]/g, ' ');
// النتيجة: "ما هي جرعة azithromycine للطفل 20 كغ"

// الخطوة 3: استخلاص الكلمات المهمة
const keywords = cleanInput.split(/\s+/)
  .filter(word => word.length > 3)
  .sort((a, b) => b.length - a.length);
// النتيجة: ['azithromycine', 'طفل', 'جرعة', '20']

// الخطوة 4: توسيع السؤال باستخدام AI
const expandedQuery = await expandQuery(question, history, groqKey);
// النتيجة: "Azithromycine dosage pediatric 20kg"

// الخطوة 5: البحث في قاعدة البيانات
const results = await db.rpc('match_clinical_data', {
  query_embedding: queryVector,
  query_text: expandedQuery,
  match_threshold: 0.2,
  match_count: 10
});
// النتيجة: 8 وثائق مطابقة
```

### **المرحلة 4️⃣: بناء السياق**

```typescript
// تنسيق البيانات المسترجعة
let context = '### Clinical Data from Pharmaceutical Database:\n\n';

results.forEach((result, idx) => {
  context += `**[${idx + 1}] ${result.source}** (Match: ${result.similarity}%)\n`;
  context += `${result.content}\n\n`;
  context += '---\n\n';
});

// النتيجة النهائية:
/*
### Clinical Data from Pharmaceutical Database:

**[1] Azithromycine** (Match: 95%)
Antibiotic for infections...
• Dosage for children 20kg: 200mg Day 1, then 100mg/day
• Indications: Dental infection, respiratory...
---

**[2] Métronidazole** (Match: 87%)
...
*/
```

### **المرحلة 5️⃣: توليد الإجابة من Groq AI**

**ملف:** `supabase/functions/pro-rag-consultation/index.ts`

```typescript
// بناء الـ System Prompt
const systemPrompt = `You are a Digital Pharmaceutical Expert in Pharmasssit.

**IMPORTANT - COMPLETE RECORD MODE:**
This is the first question about this medication. 
You MUST provide a COMPLETE and STRUCTURED response:

📋 **Mandatory Format:**

1️⃣ **Product Name**
- Brand name + (CNK if available)

2️⃣ **Complete Composition**
- Active ingredients AND excipients with exact doses

3️⃣ **Indications**
- All documented uses

4️⃣ **Target Population**
- Age, patient profile

5️⃣ **Instructions for Use**
- Exact dosage, frequency, conditions

6️⃣ **Situations to Avoid**
- Contraindications and precautions

**Rules:**
1. Use ONLY information from the context below
2. Do not invent data
3. If a section has no info, write: "Information not available"
4. End with: "🚫 **Note:** Always consult a healthcare professional."

**Available Context:**
${context}`;

// إرسال الطلب إلى Groq API
const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${groqApiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'My question: ما هي جرعة Azithromycine للطفل 20كغ؟' }
    ],
    temperature: 0.2,
    max_tokens: 1000,
  }),
});

// استقبال الإجابة
const result = await groqResponse.json();
const aiResponse = result.choices[0].message.content;

// النتيجة:
/*
Azithromycine:

📦 **Product Name**
- Brand: Azithromycine
- CNK: 123456

💊 **Composition**
- Active ingredient: Azithromycin 500mg/5ml
- Excipients: Sugar, flavoring

🎯 **Indications**
- Dental infection
- Respiratory infection
- Bacterial infection

👥 **Target Population**
- Children: Age 4+, Weight 20kg

📋 **Usage Instructions**
- Day 1: 200mg once daily
- Days 2-5: 100mg once daily
- Total duration: 5 days

⚠️ **Contraindications**
- Allergy to macrolides
- Liver disease
- Heart conditions

🚫 **Note:** Always consult a healthcare professional.
*/
```

### **المرحلة 6️⃣: حفظ المحادثة**

```typescript
// حفظ رسالة المستخدم
await db.from('chat_messages').insert({
  conversation_id: conversationId,
  user_id: userId,
  role: 'user',
  content: question
});

// حفظ إجابة الـ AI
await db.from('chat_messages').insert({
  conversation_id: conversationId,
  user_id: userId,
  role: 'assistant',
  content: aiResponse
});
```

### **المرحلة 7️⃣: إرسال الإجابة للمستخدم**

```typescript
// إرسال الاستجابة
return new Response(
  JSON.stringify({
    success: true,
    content: aiResponse,
    retrievedDocuments: results.length,
    conversationId: conversationId,
  }),
  {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  }
);
```

### **المرحلة 8️⃣: عرض الإجابة في الواجهة**

```typescript
// تحديث واجهة المستخدم
const chatMessages = [
  ...previousMessages,
  { role: 'user', content: question },
  { role: 'assistant', content: aiResponse }
];

// عرض الإجابة:
┌────────────────────────────────────┐
│ 👤 أنت:                            │
│ "ما هي جرعة Azithromycine..."     │
├────────────────────────────────────┤
│ 🤖 المساعد:                        │
│ Azithromycine:                     │
│                                    │
│ 📦 **Product Name**                │
│ - Brand: Azithromycine             │
│ - CNK: 123456                      │
│                                    │
│ 💊 **Composition**                 │
│ - Active: Azithromycin 500mg/5ml   │
│                                    │
│ [... المزيد ...]                  │
└────────────────────────────────────┘
```

---

## 🔍 آليات البحث المتقدمة

### **1. البحث بتشابه Vector (الدلالي)**

```
السؤال: "جرعة ازيثروميسين"
        ↓
Vector: [0.1, 0.2, 0.3, ..., 0.9] (384 رقم)
        ↓
قارن مع كل vector في قاعدة البيانات
        ↓
احسب التشابه: 1 - distance
        ↓
إذا التشابه > 0.2 → تم العثور عليه!
```

### **2. البحث النصي الكامل (Full-Text Search)**

```sql
SELECT * FROM clinical_embeddings
WHERE to_tsvector('simple', content) @@ 
      plainto_tsquery('simple', 'azithromycine pediatric');
```

### **3. البحث بـ ILIKE (خاص)**

```sql
SELECT * FROM clinical_embeddings
WHERE content ILIKE '%azithromycin%';
```

### **4. الجمع بين الطرق الثلاثة (Hybrid Search)**

```sql
SELECT * 
FROM clinical_embeddings
WHERE 
  -- طريقة 1: تشابه Vector
  (1 - (embedding <=> query_vector) > 0.2)
  OR 
  -- طريقة 2: Full-text
  (to_tsvector('simple', content) @@ 
   plainto_tsquery('simple', query_text))
  OR
  -- طريقة 3: Simple ILIKE
  (content ILIKE '%' || query_text || '%')
ORDER BY similarity DESC;
```

---

## 🛡️ آليات الأمان

### **1. منع الإجابات المخترعة (Anti-Hallucination)**

```typescript
// إذا لم نجد بيانات كافية
if (searchResults.length === 0) {
  return {
    content: "Sorry, no information found in our clinical database. 
              Please consult a healthcare professional.",
    retrievedDocuments: 0,
    blocked: true
  };
}

// إذا كانت جودة النتائج منخفضة جداً
if (bestMatch.similarity < 0.2) {
  return {
    content: "The information found is not reliable enough. 
              Please consult a healthcare professional.",
    retrievedDocuments: 0,
    blocked: true
  };
}
```

### **2. مصادقة المستخدم (Authentication)**

```typescript
// التحقق من JWT Token
const { data: { user: authUser } } = 
  await db.auth.getUser(token);

if (authUser) userId = authUser.id;
```

### **3. صلاحيات الوصول (Authorization)**

```sql
-- كل مستخدم يرى محادثاته فقط
CREATE POLICY "Users can view their own conversations" 
  ON conversations FOR SELECT 
  USING (auth.uid() = user_id);
```

### **4. System Prompt الصارم**

```
🚫 STRICTLY FORBIDDEN:
- Any information from your general knowledge
- Guessing or deducing information not explicitly in the data
- Inventing dosages or contraindications
- Medical advice not present in the files
- Suggesting products not in the provided context
- Copying information from one product to another

✅ ALLOWED ONLY:
- Explicitly present information in the clinical data
- Logical analysis and connections between provided data
- Professional explanation and detail of data
- Clear distinction between each product
```

---

## 📊 مثال عملي متكامل

### **السيناريو:**
مستخدم (طبيب) في بلجيكا يريد معرفة جرعة آمنة لطفل

### **الخطوات:**

```
1. المستخدم يسأل:
   "Abcès dentaire chez enfant 20 kg, posologie précise ?"

2. الواجهة تحول السؤال لـ vector:
   questionVector = embedding(السؤال) → [0.1, 0.2, ..., 0.9]

3. Edge Function يبحث:
   - expandedQuery = "dental abscess pediatric dosage 20kg"
   - يجد: 8 وثائق (Azithromycine, Métronidazole, Amoxicilline, ...)

4. بناء السياق:
   "📦 Azithromycine
    • Dosage: 200mg (Day 1) + 100mg/day (Days 2-5)
    • Age: Pediatric (4+ years)
    
    📦 Métronidazole
    • Dosage: 300-400mg/day
    • For: Anaerobic infection"

5. Groq AI يجيب:
   "For a dental abscess in a 20kg child:
   
   First choice: Azithromycine
   • Day 1: 200mg once
   • Days 2-5: 100mg once daily
   
   Alternative: Métronidazole
   • 300-400mg daily
   
   ⚠️ Must consult dentist or pediatrician!"

6. حفظ في قاعدة البيانات:
   INSERT INTO chat_messages...

7. عرض الإجابة للمستخدم:
   ✅ تم بنجاح مع 8 وثائق مسترجعة
```

---

## 🚀 التقنيات المستخدمة

| المكون | التقنية | الوصف |
|-------|---------|--------|
| **Frontend** | React + TypeScript | واجهة المستخدم التفاعلية |
| **Deployment** | Vercel | استضافة التطبيق |
| **Backend** | Supabase + Deno | خوادم Edge Functions |
| **Database** | PostgreSQL | قاعدة البيانات الرئيسية |
| **Vectors** | pgvector | تخزين وبحث الـ embeddings |
| **AI** | Groq LLaMA 3.3 70B | توليد الإجابات |
| **Auth** | Supabase Auth | مصادقة المستخدمين |
| **Language** | French | لغة التطبيق (السوق البلجيكية) |

---

## 🔐 نقاط الأمان الحاسمة

✅ **1. عدم الاستناد على المعرفة العامة**
- الـ System Prompt يفرض استخدام البيانات فقط

✅ **2. التحقق من جودة النتائج**
- إذا كانت التشابه < 0.2 → لا إجابة

✅ **3. حفظ السجل الكامل**
- كل سؤال وإجابة محفوظة في قاعدة البيانات

✅ **4. عزل البيانات الحساسة**
- كل مستخدم يرى بيانات نفسه فقط

✅ **5. تحذيرات واضحة**
- "استشر الطبيب دائماً" في كل إجابة

---

## 📈 الإحصائيات

| المقياس | الرقم |
|---------|------|
| **عدد الأدوية** | 50+ |
| **أدوية الأطفال** | 10+ |
| **اللغات المدعومة** | الفرنسية فقط |
| **حد أقصى لأبعاد Vector** | 384 |
| **نموذج AI** | LLaMA 3.3 70B |
| **الدول المستهدفة** | بلجيكا 🇧🇪 |

---

## 🎯 النقاط المهمة

1. **البحث الذكي**: يجمع بين Vector search و Full-text search
2. **الأمان أولاً**: لا إجابات بدون بيانات مؤكدة
3. **المحادثات المستمرة**: يتذكر السياق السابق
4. **اللغة الفرنسية**: 100% للسوق البلجيكية
5. **قابل للتوسع**: يمكن إضافة أدوية وبيانات جديدة
6. **عالي الأداء**: استجابة سريعة < 2 ثانية

---

## 🔄 رسم تخطيطي للتدفق الكامل

```
┌──────────────────┐
│  المستخدم يكتب   │
│      سؤال        │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  React Frontend  │
│ - تحويل لـ vector │
│ - إرسال طلب      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Supabase Edge    │
│ - توسيع السؤال  │
│ - البحث في DB   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ PostgreSQL +     │
│ pgvector         │
│ - البحث Vector   │
│ - Full-text      │
│ - ILIKE          │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ بناء السياق      │
│ تنسيق البيانات  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Groq AI API      │
│ - توليد الإجابة│
│ - تطبيق rules   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ حفظ المحادثة    │
│ في قاعدة البيانات
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ عرض الإجابة     │
│ في الواجهة      │
└──────────────────┘
```

---

**هذا هو الشرح الكامل لكيفية عمل التطبيق! 🎉**
