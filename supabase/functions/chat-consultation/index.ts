import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept, x-requested-with',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
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

        // --- Input Cleaning & Keyword Extraction ---
        // 1. Basic Cleaning
        const cleanInput = question.toLowerCase().trim().replace(/[؟?؟،,.[\]]/g, ' ');

        // 2. Numerical/Alphanumeric Optimization (GEL38GR -> GEL 38 GR)
        const optimizedQuery = cleanInput.replace(/([a-zA-Z])(\d)/g, '$1 $2').replace(/(\d)([a-zA-Z])/g, '$1 $2');

        // 3. Automated Keyword Extraction (extract words > 3 chars)
        const keywords = optimizedQuery.split(/\s+/)
            .filter(word => word.length > 3)
            .sort((a, b) => b.length - a.length);

        // Important: Use only the top keywords for text search to avoid paragraph noise
        const searchKeywords = keywords.slice(0, 5).join(' ');

        console.log(`[DEBUG] Input question: "${question}"`);
        console.log(`[DEBUG] Clean Input: "${cleanInput}"`);
        console.log(`[DEBUG] Extraction Keywords: "${searchKeywords}"`);

        // Log vector info
        const isZeroVector = queryVector.every((v: number) => v === 0);
        console.log(`[DEBUG] Vector dimensions: ${queryVector.length}, Is Zero Vector: ${isZeroVector}`);

        // --- 0.5 Table Check ---
        const { count, error: countError } = await db.from('clinical_embeddings').select('*', { count: 'exact', head: true });
        console.log(`[DEBUG] Total rows in clinical_embeddings: ${count}, Error: ${countError?.message || 'none'}`);

        // --- 1. History Management ---
        let activeConvId = conversationId;
        try {
            if (activeConvId) {
                const { data: exists } = await db.from('conversations').select('id').eq('id', activeConvId).maybeSingle();
                if (!exists) activeConvId = null;
            }
            if (!activeConvId) {
                const { data: newConv } = await db.from('conversations').insert({ user_id: userId, title: question.slice(0, 50) }).select().maybeSingle();
                activeConvId = newConv?.id;
            }
            await db.from('chat_messages').insert({ conversation_id: activeConvId, user_id: userId, role: 'user', content: question });
        } catch (e) { console.error("DB History Error (Ignored):", e.message); }

        // --- 2. Clinical Search (Hybrid with Progressive Threshold) ---
        let context = "";
        try {
            console.log(`[DEBUG] RPC match_clinical_data - Dimensions: ${queryVector ? queryVector.length : 'NULL'}`);

            // Tier 1: Initial search (match_threshold: 0.05) - More permissive for Copy-Paste
            let { data: results, error: rpcError } = await db.rpc('match_clinical_data', {
                query_embedding: queryVector,
                query_text: searchKeywords, // Use ONLY extracted keywords
                match_threshold: 0.05,
                match_count: 5
            });

            console.log('Search Results (RPC Tier 1):', results ? results.length : 0);

            // Tier 2: Extreme recovery if nothing found (threshold: 0.0)
            if ((!results || results.length === 0) && !rpcError) {
                console.log("[DEBUG] Tier 1 found 0 results. Trying Tier 2 (threshold: 0.0)...");
                const { data: resultsTier2 } = await db.rpc('match_clinical_data', {
                    query_embedding: queryVector,
                    query_text: searchKeywords,
                    match_threshold: 0.0,
                    match_count: 5
                });
                results = resultsTier2;
                console.log('Search Results (RPC Tier 2):', results ? results.length : 0);
            }

            if (rpcError) console.error("[DEBUG] RPC Error:", rpcError.message);

            if (results && results.length > 0) {
                console.log(`[DEBUG] Final Results count: ${results.length}`);
                context = results.map((r: any) => `[ID: ${r.id}] [Source: ${r.source}] ${r.content}`).join("\n---\n");
            } else {
                console.log("[DEBUG] Primary search failed. Starting Multi-stage Keyword Loop...");

                // Multi-stage Fallback: Loop through significant keywords
                const fallbackContexts = [];
                const topKeywords = keywords.slice(0, 3); // Top 3 keywords for precision

                for (const kw of topKeywords) {
                    console.log(`[DEBUG] Attempting fallback for keyword: "${kw}"`);
                    const { data: kwMatches } = await db.from('clinical_embeddings')
                        .select('id, source, content')
                        .ilike('content', `%${kw}%`)
                        .limit(2);

                    if (kwMatches && kwMatches.length > 0) {
                        fallbackContexts.push(...kwMatches);
                    }
                }

                if (fallbackContexts.length > 0) {
                    console.log(`[DEBUG] Found ${fallbackContexts.length} total matches via Multi-stage loop.`);
                    // Remove duplicates by ID
                    const uniqueMatches = Array.from(new Map(fallbackContexts.map(item => [item.id, item])).values());
                    context = uniqueMatches.map((r: any) => `[ID: ${r.id}] [Source: ${r.source}] ${r.content}`).join("\n---\n");
                }
            }
        } catch (e) { console.error("Search Error (Ignored):", e.message); }

        // --- 2.5 Hard Lock (Anti-hallucination) ---
        if (!context || context.trim() === "") {
            console.log("[HARD LOCK] No clinical data found. Bypassing AI.");

            // Detect language for the failure message
            const isArabicQuery = /[\u0600-\u06FF]/.test(question);
            const lockMessage = isArabicQuery
                ? "عذراً، هذا المنتج أو هذه المعلومات غير مدرجة في قاعدة البيانات السريرية المعتمدة لدينا حالياً. يرجى مراجعة الصيدلي مباشرة."
                : "Désolé, ce produit ou cette information n'est pas répertorié dans notre base de données clinique agréée pour le moment. Veuillez consulter directement votre pharmacien.";

            if (activeConvId) {
                await db.from('chat_messages').insert({ conversation_id: activeConvId, user_id: userId, role: 'assistant', content: lockMessage });
            }

            return new Response(JSON.stringify({ content: lockMessage, conversationId: activeConvId }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // --- 3. AI Completion ---
        console.log("[DEBUG] Final Context being sent to AI:", context ? "Populated" : "EMPTY");
        console.log("البيانات المسترجعة من DB:", context);

        const systemPrompt = `You are "Pharmassist", an intelligent pharmacist assistant.
CRITICAL INSTRUCTIONS:
1. RESPONSE LANGUAGE: You MUST respond in the same language as the user's question (Arabic or French).
2. KNOWLEDGE BASE: Your only source of truth is the "Context" provided below. Do not use external information.
3. AGGREGATION: If the user asks about a "problem" or "symptom" (e.g., dry mouth), analyze all documents. If multiple products treat the same issue, list ALL of them as available options.
4. MAPPING: Since the data is in French, if the user asks in Arabic, find the logical links (e.g., جفاف الفم = Sécheresse buccale).
5. RESPONSE STYLE:
   - Start with a polite welcome.
   - Introduce found solutions (e.g., "Based on clinical records, here are the solutions for [Problem]:").
   - For each product, mention: Name, Uses, and Usage instructions.
   - Always conclude with a recommendation to consult a doctor or pharmacist.
6. FAILURE PROTOCOL: If no product is found in the context after searching, strictly follow the system's rejection message.

**Context (Clinical Records):**
${context || "No clinical data available."}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

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

        const groqData = await groqRes.json();
        const aiContent = groqData.choices?.[0]?.message?.content || "No response.";
        console.log("AI Response Received.");

        // --- 4. Final Save ---
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
