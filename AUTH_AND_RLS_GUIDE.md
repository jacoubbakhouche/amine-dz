# 🔐 دليل إعادة تفعيل نظام المصادقة (Auth) وإدارة الـ RLS

هذا الدليل يشرح لك الخطوات التقنية للعودة من نظام "المستخدم الضيف" إلى نظام "المستخدمين الحقيقيين" وكيفية فحص صلاحيات قاعدة البيانات.

---

## 1️⃣ إعادة تفعيل نظام تسجيل الدخول (Front-end)

حالياً، الملف المسؤول عن تعطيل المصادقة هو `src/contexts/AuthContext.tsx`. للعودة للنظام الحقيقي، يجب القيام بما يلي:

1. **حذف كود الـ Mock**: إزالة الحالة الثابتة (Hardcoded state) للمستخدم والسيشن.
2. **تفعيل مستمعات Supabase**: إعادة تفعيل `supabase.auth.onAuthStateChange`.

### الكود الذي يجب تعديله:
في ملف `src/contexts/AuthContext.tsx` (الأسطر 21-43)، نقوم بالعودة إلى القيم الأصلية التي تقرأ من Supabase:

```typescript
// بدلاً من الحالة الثابتة:
const [user, setUser] = useState<User | null>(null);
const [session, setSession] = useState<Session | null>(null);

useEffect(() => {
    // 1. الحصول على السيشن الحالية عند بدء التطبيق
    supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
    });

    // 2. الاستماع لأي تغيير (دخول / خروج)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
}, []);
```

---

## 2️⃣ فهم وفحص الـ RLS (Row Level Security)

الـ RLS هو نظام الحماية داخل Supabase الذي يمنع المستخدم (أ) من رؤية بيانات المستخدم (ب).

### كيف تتحقق إذا كان مفعل أم لا؟
يمكنك فحص ملفات الـ SQL في مجلد `supabase/migrations/` أو من خلال لوحة تحكم Supabase:
1. اذهب إلى **Authentication** -> **Policies**.
2. ابحث عن جدول `conversations` و `chat_messages`.

### السياسات (Policies) التي يجب أن تكون مفعلة:
لكي يعمل النظام بشكل صحيح وآمن، يجب تنفيذ هذه الأوامر في **SQL Editor**:

```sql
-- 1. تفعيل الـ RLS على الجداول
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 2. سياسة للمحادثات: المستخدم يرى محادثاته فقط
CREATE POLICY "Users can only access their own conversations" 
ON conversations FOR ALL 
USING (auth.uid() = user_id);

-- 3. سياسة للرسائل: المستخدم يرى رسائل محادثاته فقط
CREATE POLICY "Users can only access their own messages" 
ON chat_messages FOR ALL 
USING (auth.uid() = user_id);
```

---

## 3️⃣ لماذا قمت بتعطيلها سابقاً؟
لقد قمت بتعطيلها لسببين:
1. **السرعة**: لكي لا تضطر لتسجيل الدخول في كل مرة نقوم فيها بتحديث الصفحة أثناء التطوير.
2. **تجاوز الـ JWT**: الـ Edge Functions كانت تواجه مشاكل أحياناً في التحقق من التوكن (Token) في بيئة التطوير المحلية.

---

## 4️⃣ كيف تتحقق من الـ Screenshots التي أرسلتها؟
بناءً على طلبك، إذا أرسلت لي صوراً لـ Supabase Dashboard:
- ابحث عن أيقونة **القفل (Lock)** بجانب أسماء الجداول. إذا كان القفل مفتوحاً أو باللون الأحمر، يعني أن الـ RLS معطل.
- ابحث عن تبويب **Policies** للتأكد من وجود كلمة `auth.uid() = user_id`.

---

**هل تريد مني البدء في تطبيق هذه التغييرات الآن أم نحتفظ بها كدليل مستقبلي؟**
🚀🎉
