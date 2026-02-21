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

        // Defensive parsing
        let body: any = {};
        try {
            body = await req.json();
        } catch (e: any) {
            console.error("JSON Parse Error:", e.message);
        }

        const { question, queryVector, history = [], conversationId } = body;

        if (!question || !queryVector) {
            return new Response(JSON.stringify({ error: "Missing fields" }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const db = createClient(supabaseUrl, supabaseServiceKey);

        // 0. Get User from Authentication header (Passed automatically by supabase.functions.invoke)
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new Error("Missing Authorization header");

        const { data: { user }, error: userError } = await db.auth.getUser(authHeader.replace('Bearer ', ''));
        if (userError || !user) throw new Error("Unauthorized: " + userError?.message);

        // 1. Manage Conversation
        let activeConversationId = conversationId;
        if (!activeConversationId) {
            const { data: newConv, error: convError } = await db
                .from('conversations')
                .insert({ user_id: user.id, title: question.slice(0, 50) })
                .select()
                .single();
            if (convError) throw new Error("Failed to create conversation: " + convError.message);
            activeConversationId = newConv.id;
        }

        // 2. Save User Message
        const { error: msgError } = await db.from('chat_messages').insert({
            conversation_id: activeConversationId,
            user_id: user.id,
            role: 'user',
            content: question
        });
        if (msgError) console.error("Error saving user message:", msgError.message);


        // Minimal logging for vector search
        const { data: results, error: rpcError } = await db.rpc('match_clinical_data', {
            query_embedding: queryVector,
            match_threshold: 0.1,
            match_count: 5
        });

        if (rpcError) {
            console.error("RPC Error:", rpcError.message);
        }

        let context = "";
        if (results && results.length > 0) {
            context = results.map((r: any) => r.content).join("\n---\n");
        }

        // Strict requirement: If context is empty, return predefined message immediately
        if (!context) {
            const refusal = "Désolé, aucune donnée correspondante n'a été trouvée dans notre base certifiée. Nous fournissons uniquement des informations conformes aux normes UE & RGPD.";

            // Save refusal as assistant message
            await db.from('chat_messages').insert({
                conversation_id: activeConversationId,
                user_id: user.id,
                role: 'assistant',
                content: refusal
            });

            return new Response(JSON.stringify({
                content: refusal,
                conversationId: activeConversationId
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Strict system prompt as requested
        const systemPrompt = `أنت مساعد طبي ذكي. التزم فقط بالبيانات المسترجعة من الدالة match_clinical_data الموضحة في السياق أدناه.
يمنع منعاً باتاً الإجابة من معلوماتك العامة.
إذا كان السياق (Context) فارغاً، يجب أن ترد بـ: 'Désolé, aucune donnée correspondante n'a été trouvée dans notre base certifiée. Nous fournissons uniquement des informations conformes aux normes UE & RGPD.'.

السياق المسترجع (Retrieved Context):
${context}`;

        // AI call
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${groqKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                messages: [
                    { role: "system", content: systemPrompt },
                    ...history.slice(-3),
                    { role: "user", content: question }
                ],
                model: "llama-3.3-70b-versatile",
                temperature: 0.1,
            }),
        });

        if (!groqRes.ok) throw new Error(`Groq Fail: ${groqRes.status}`);

        const groqData = await groqRes.json();
        const content = groqData.choices?.[0]?.message?.content || "No AI response.";

        // 3. Save Assistant Message
        const { error: aiMsgError } = await db.from('chat_messages').insert({
            conversation_id: activeConversationId,
            user_id: user.id,
            role: 'assistant',
            content: content
        });
        if (aiMsgError) console.error("Error saving AI message:", aiMsgError.message);

        return new Response(JSON.stringify({ content, conversationId: activeConversationId }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (err: any) {
        console.error("Fatal Error:", err.message);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
