import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept, x-requested-with',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

// --- Helper: Query Expansion via Groq (Context-Aware) ---
async function expandQuery(question: string, history: any[], groqKey: string): Promise<string> {
    if (question.length >= 30 && /[A-Z]/.test(question)) {
        return question;
    }

    try {
        const historyContext = history.slice(-6).map((m: any) => `${m.role}: ${m.content}`).join("\n");
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const expandRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [
                    {
                        role: "system",
                        content: `You are a search query rewriter for a pharmaceutical database. Output ONLY the search query.`
                    },
                    {
                        role: "user",
                        content: `History:\n${historyContext}\n\nQuestion: "${question}"`
                    }
                ],
                temperature: 0.0,
            }),
        }).finally(() => clearTimeout(timeoutId));

        if (expandRes.ok) {
            const expandData = await expandRes.json();
            return expandData.choices?.[0]?.message?.content?.trim() || question;
        }
    } catch (e) { console.warn("Query expansion failed."); }
    return question;
}

// --- Helper: Medical Safety Auditor ---
async function auditResponse(originalQuestion: string, aiResponse: string, context: string, groqKey: string): Promise<{ safe: boolean, reason?: string }> {
    try {
        const auditRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [
                    {
                        role: "system",
                        content: `You are a Medical Fact-Checker. Compare AI RESPONSE against CLINICAL CONTEXT. FAIL if hallucination found. Output 'SAFE' or 'ERROR: [reason]'.`
                    },
                    {
                        role: "user",
                        content: `CONTEXT:\n${context}\n\nRESPONSE:\n${aiResponse}`
                    }
                ],
                temperature: 0.0,
            }),
        });

        if (auditRes.ok) {
            const auditData = await auditRes.json();
            const result = auditData.choices?.[0]?.message?.content?.trim() || "ERROR: Audit failed";
            if (result.includes("SAFE") && !result.includes("ERROR")) return { safe: true };
            return { safe: false, reason: result.replace("ERROR:", "").trim() };
        }
    } catch (e) { console.error("Audit error:", e); }
    return { safe: true };
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const groqKey = Deno.env.get('GROQ_API_KEY')!;
        const db = createClient(supabaseUrl, supabaseServiceKey);

        const body = await req.json();
        const { question, queryVector, history = [], conversationId, userId = 'anonymous' } = body;

        if (!question || !queryVector) throw new Error("Missing question or vector");

        const expandedQuery = await expandQuery(question, history, groqKey);

        // --- Search (Tiers) ---
        let results = [];
        // Tier 1: Vector Search
        const { data: rpcRes, error: rpcError } = await db.rpc('match_clinical_data', {
            query_embedding: queryVector,
            query_text: expandedQuery,
            match_threshold: 0.2,
            match_count: 5
        });
        results = rpcRes || [];

        // Tier 2 Fallback: Lower threshold
        if (results.length === 0) {
            const { data: rpcRes2 } = await db.rpc('match_clinical_data', {
                query_embedding: queryVector,
                query_text: expandedQuery,
                match_threshold: 0.1,
                match_count: 5
            });
            results = rpcRes2 || [];
        }

        let context = results.map((r: any) => `[NOM: ${r.metadata?.nom || 'N/A'}] [USAGE: ${r.metadata?.conseil_usage || 'N/A'}] [INDICATIONS: ${r.metadata?.indications || 'N/A'}] [DESC: ${r.content}]`).join("\n---\n");

        if (!context && !/hello|hi|bonjour|مرحبا/i.test(question)) {
            const lockMsg = "Désolé, les détails cliniques pour ce produit ne sont pas encore répertoriés. Veuillez consulter votre pharmacien.";
            return new Response(JSON.stringify({ content: lockMsg }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const systemPrompt = `Vous êtes un expert en pharmacie dentaire (Belgique). Utilisez UNIQUEMENT le contexte fourni.
        
CONTEXTE:
${context}

HISTORIQUE:
${history.slice(-4).map((m: any) => `${m.role}: ${m.content}`).join("\n")}`;

        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                messages: [{ role: "system", content: systemPrompt }, { role: "user", content: question }],
                model: "llama-3.1-8b-instant",
                temperature: 0.1,
                max_tokens: 600
            }),
        });

        const groqData = await groqRes.json();
        let aiContent = groqData.choices?.[0]?.message?.content || "No response.";

        // Audit
        const audit = await auditResponse(question, aiContent, context, groqKey);
        if (!audit.safe) {
            aiContent = "⚠️ Désolé, une imprécision technique a été détectée. Veuillez consulter votre pharmacien.";
        }

        // Save
        let activeConvId = conversationId;
        if (!activeConvId) {
            const { data: newConv } = await db.from('conversations').insert({ user_id: userId === 'anonymous' ? null : userId, title: question.slice(0, 50) }).select().single();
            activeConvId = newConv?.id;
        }
        await db.from('chat_messages').insert({ conversation_id: activeConvId, user_id: userId === 'anonymous' ? null : userId, role: 'assistant', content: aiContent });

        return new Response(JSON.stringify({ content: aiContent, conversationId: activeConvId }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (err: any) {
        return new Response(JSON.stringify({ content: "خطأ تقني.", error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
