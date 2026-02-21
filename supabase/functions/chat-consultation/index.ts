import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const groqKey = Deno.env.get('GROQ_API_KEY')!;

        const db = createClient(supabaseUrl, supabaseServiceKey);

        // --- 0. Defensive Auth & Fallback ---
        let userId = '00000000-0000-0000-0000-000000000000';
        const authHeader = req.headers.get('Authorization');
        if (authHeader && authHeader.length > 20) {
            try {
                const token = authHeader.replace('Bearer ', '');
                const { data: { user: authUser } } = await db.auth.getUser(token);
                if (authUser) userId = authUser.id;
            } catch (e) { console.warn("JWT Verification skipped/failed."); }
        }

        // If fallback, get first available profile ID to avoid FK issues
        if (userId === '00000000-0000-0000-0000-000000000000') {
            const { data: prof } = await db.from('profiles').select('id').limit(1).single();
            if (prof) userId = prof.id;
        }

        // Defensive body parsing
        let question = "", queryVector = null, history = [], conversationId = null;
        try {
            const body = await req.json();
            question = body.question;
            queryVector = body.queryVector;
            history = body.history || [];
            conversationId = body.conversationId;
        } catch (e) { console.error("Request parse error."); }

        if (!question || !queryVector) throw new Error("Missing required fields (question/vector)");

        // --- Optimized Query for Numerical Search (GEL38GR -> GEL 38 GR) ---
        const optimizedQuery = question.replace(/([a-zA-Z])(\d)/g, '$1 $2').replace(/(\d)([a-zA-Z])/g, '$1 $2');
        console.log("Original Query:", question);
        console.log("Optimized Query:", optimizedQuery);

        // --- 1. Histroy Management (Independent Try-Catch) ---
        let activeConvId = conversationId;
        try {
            if (activeConvId) {
                const { data: exists } = await db.from('conversations').select('id').eq('id', activeConvId).single();
                if (!exists) activeConvId = null;
            }
            if (!activeConvId) {
                const { data: newConv } = await db.from('conversations').insert({ user_id: userId, title: question.slice(0, 50) }).select().single();
                activeConvId = newConv?.id;
            }
            await db.from('chat_messages').insert({ conversation_id: activeConvId, user_id: userId, role: 'user', content: question });
        } catch (e) { console.error("DB History Error (Ignored):", e.message); }

        // --- 2. Clinical Search (Independent Try-Catch) ---
        let context = "";
        try {
            const { data: results, error: rpcError } = await db.rpc('match_clinical_data', {
                query_embedding: queryVector,
                query_text: optimizedQuery,
                match_threshold: 0.1,
                match_count: 5,
                p_source: null
            });
            if (!rpcError && results) {
                context = results.map((r: any) => `[Source: ${r.source}] ${r.content}`).join("\n---\n");
            }
        } catch (e) { console.error("Search Error (Ignored):", e.message); }

        // --- 3. AI Completion with Timeout ---
        console.log("Preparing AI prompt...");
        const systemPrompt = `أنت مساعد طبي وصيدلاني دقيق للغاية. تعمل في "الوضع السريري الآمن".
قاعدتك الذهبية: يجب أن تستخرج الإجابات، والجرعات، والتركيزات حصرياً وبشكل حرفي من "السياق المسترجع" أدناه.
- يمنع منعاً باتاً استخدام معلوماتك العامة أو بيانات التدريب الخاصة بك.
- يمنع منعاً باتاً استنتاج جرعات مضادات حيوية أو تركيزات صيدلانية غير موجودة بوضوح في السياق.
- إذا كان السؤال عن منتج، تركيز، أو جرعة غير متوفرة صراحةً في السياق، يجب أن ترد قائلاً: "عذراً، هذا المنتج أو هذه الجرعة غير مدرجة في قاعدة البيانات السريرية الآمنة المعتمدة لدينا." ولا تقترح أي شيء من خارج السياق.

السياق المسترجع:
${context || "لا توجد بيانات مباشرة متوفرة حالياً."}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

        console.log("Calling Groq API...");
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
                messages: [{ role: "system", content: systemPrompt }, ...history.slice(-3), { role: "user", content: question }],
                model: "llama-3.3-70b-versatile",
                temperature: 0.1,
            }),
        }).finally(() => clearTimeout(timeoutId));

        if (!groqRes.ok) {
            console.error("Groq API Error Status:", groqRes.status);
            throw new Error("AI Service temporary unavailable.");
        }

        console.log("Parsing Groq Response...");
        const groqData = await groqRes.json();
        const aiContent = groqData.choices?.[0]?.message?.content || "No response.";
        console.log("AI Response Received.");

        // --- 4. Final Save (Non-blocking) ---
        if (activeConvId) {
            db.from('chat_messages').insert({ conversation_id: activeConvId, user_id: userId, role: 'assistant', content: aiContent })
                .then(({ error }) => error && console.error("Final Save error"));
        }

        return new Response(JSON.stringify({ content: aiContent, conversationId: activeConvId }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (err: any) {
        console.error("Critical Function Fail:", err.message);
        return new Response(JSON.stringify({ content: "عذراً، حدث خطأ تقني داخلي. يرجى المحاولة مرة أخرى.", error: err.message }), {
            status: 200, // Still return 200 to keep UI alive
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
