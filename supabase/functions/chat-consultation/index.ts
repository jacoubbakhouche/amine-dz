import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
}

// --- CDSS: Clinical Data Search ---
interface MedicalProduct {
    nom: string;
    cnk: number;
    nci: string | null;
    indications: string[];
    limites: string[];
    profil_patient: string[];
    mecanisme_action: string | null;
    conseil_usage: string | null;
}

interface AbxRule {
    id: string;
    condition: unknown;
    recommendation: unknown;
}

function findRelevance(query: string, clinicalRecords: { source: string; data: unknown }[]) {
    const q = query.toLowerCase();
    const commonWords = ['what', 'are', 'the', 'is', 'a', 'an', 'dose', 'dosage', 'ingredients', 'composition', 'contain', 'how', 'much', 'ppm', 'mg', 'ml'];
    const keywords = q.split(/[^a-z0-9]/).filter((w: string) => w.length > 2 && !commonWords.includes(w));

    const dentalRecord = clinicalRecords.find((r) => r.source === 'dental_products');
    const abxRecord = clinicalRecords.find((r) => r.source === 'antibiotic_rules');

    const products = (dentalRecord?.data as MedicalProduct[]) || [];
    const abxContent = abxRecord?.data as { rules?: AbxRule[]; global_principles?: string[] } | null;
    const rules = abxContent?.rules || [];
    const principles = abxContent?.global_principles || [];

    const matchedProducts = products
        .map((p: MedicalProduct) => {
            const searchString = `${p.nom} ${p.nci || ''} ${p.cnk}`.toLowerCase();
            let matches = 0;
            keywords.forEach((kw: string) => {
                if (searchString.includes(kw)) matches++;
            });
            return { ...p, score: matches };
        })
        .filter((p) => p.score > 0 || q.includes(p.cnk.toString()))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

    const matchedRules = rules.filter((r: AbxRule) =>
        r.id.toLowerCase().includes(q) ||
        JSON.stringify(r.condition).toLowerCase().includes(q)
    ).slice(0, 3);

    return { products: matchedProducts, rules: matchedRules, principles };
}

function buildSystemPrompt(context: { products: unknown[]; rules: unknown[]; principles: string[] }) {
    let contextStr = "";

    if (context.products.length > 0) {
        contextStr += "\n[Dental Products Data]:\n" + JSON.stringify(context.products, null, 2);
    }
    if (context.rules.length > 0) {
        contextStr += "\n[Antibiotic Clinical Rules]:\n" + JSON.stringify(context.rules, null, 2);
    }
    if (context.principles && context.principles.length > 0) {
        contextStr += "\n[Global Principles]:\n" + context.principles.join("\n");
    }

    if (!contextStr) {
        contextStr = "\n[No matching clinical data found for this query. Answer based on general medical knowledge but clearly state that this is not from the official database.]";
    }

    return `You are a professional Clinical Decision Support System (CDSS) for dentists and pharmacists.
Your primary goal is "Precision Chirurgicale" (Surgical Precision) and deterministic logic. 

STRICT RULES (NON-NEGOTIABLE):
1. DATA PRIORITY: Use ONLY the provided [Official Data Foundations] to answer. These foundations TAKE ABSOLUTE PRECEDENCE over your general training data.
2. ZERO HALLUCINATION: If a concentration (like ppm, mg, %) or ingredient is not explicitly written in the provided context, you MUST state "No official data found for this specific detail". 
3. INGREDIENTS VERIFICATION: You MUST check the 'nci' field for every product. Do not assume ingredients.
4. FALLBACK: If the user query is NOT covered by the provided data, state clearly: "No official data found in current clinical guidelines" and provide general medical guidance if appropriate.
5. JUSTIFICATION: Every answer MUST have a "Justification" section referencing CNKs or Rule IDs when available.

CONTEXT FOR USER QUERY:
${contextStr}`;
}

// --- Main Handler ---
serve(async (req: Request) => {
    console.log("=== [chat-consultation] START ===");
    console.log("[Step 0] Method:", req.method);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        console.log("[Step 0] CORS preflight — OK");
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // ──────────────────────────────────────────────
        // STEP 1: Parse request body
        // ──────────────────────────────────────────────
        let question: string;
        let history: { role: string; content: string }[] = [];
        let conversationId: string | null = null;

        try {
            const body = await req.json();
            question = body.question;
            history = body.history || [];
            conversationId = body.conversationId || null;
            console.log("[Step 1] Parsed OK. question:", question?.slice(0, 60), "| history:", history.length, "| convId:", conversationId);
        } catch (parseErr) {
            console.error("[Step 1] Parse failed:", parseErr);
            return jsonResponse({ error: "Invalid request body" }, 400);
        }

        if (!question || typeof question !== 'string' || question.trim().length === 0) {
            return jsonResponse({ error: 'Missing or invalid "question" field' }, 400);
        }

        // ──────────────────────────────────────────────
        // STEP 2: Verify user auth (JWT)
        // ──────────────────────────────────────────────
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            console.error("[Step 2] No Authorization header");
            return jsonResponse({ error: "Missing authorization header" }, 401);
        }

        // Extract the raw JWT token from "Bearer <token>"
        const token = authHeader.replace('Bearer ', '');
        console.log("[Step 2] Token extracted, length:", token.length);

        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

        console.log("[Step 2] Env — URL:", supabaseUrl ? "✅" : "❌", "ANON:", supabaseAnonKey ? "✅" : "❌", "SERVICE:", serviceRoleKey ? "✅" : "❌");

        if (!supabaseUrl || !serviceRoleKey) {
            console.error("[Step 2] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
            return jsonResponse({ error: "Server misconfiguration" }, 500);
        }

        // Use service role client to verify the JWT token directly
        // This avoids the "Auth session missing" issue with anon key client
        const db = createClient(supabaseUrl, serviceRoleKey);

        let userId: string;
        try {
            const { data: { user }, error: userError } = await db.auth.getUser(token);
            if (userError || !user) {
                console.error("[Step 2] Auth failed:", userError?.message || "No user");
                return jsonResponse({ error: "Unauthorized: " + (userError?.message || "Invalid token") }, 401);
            }
            userId = user.id;
            console.log("[Step 2] Auth OK — userId:", userId);
        } catch (authErr) {
            console.error("[Step 2] Auth exception:", authErr);
            return jsonResponse({ error: "Authentication failed" }, 401);
        }


        // db (service role client) already created above — used for ALL DB operations

        // ──────────────────────────────────────────────
        // STEP 3: Create or verify conversation
        // ──────────────────────────────────────────────
        if (!conversationId) {
            console.log("[Step 3] No conversationId — creating new conversation...");
            const { data: newConv, error: convError } = await db
                .from('conversations')
                .insert({
                    user_id: userId,
                    title: question.slice(0, 50) + (question.length > 50 ? '...' : '')
                })
                .select('id')
                .single();

            if (convError || !newConv) {
                console.error("[Step 3] Failed to create conversation:", convError?.message);
                return jsonResponse({ error: "Failed to create conversation" }, 500);
            }
            conversationId = newConv.id;
            console.log("[Step 3] Conversation created:", conversationId);
        } else {
            // Verify the conversation belongs to this user
            const { data: existing, error: checkErr } = await db
                .from('conversations')
                .select('id')
                .eq('id', conversationId)
                .eq('user_id', userId)
                .single();

            if (checkErr || !existing) {
                console.error("[Step 3] Conversation not found or not owned:", checkErr?.message);
                return jsonResponse({ error: "Conversation not found" }, 404);
            }
            console.log("[Step 3] Conversation verified:", conversationId);
        }

        // ──────────────────────────────────────────────
        // STEP 4: Fetch clinical data (service role — bypasses RLS)
        // ──────────────────────────────────────────────
        let clinicalRecords: { source: string; data: unknown }[] = [];
        try {
            const { data, error: clinicalError } = await db
                .from('clinical_data')
                .select('source, data');

            if (clinicalError) {
                console.warn("[Step 4] Clinical data error:", clinicalError.message);
            } else {
                clinicalRecords = data || [];
            }
            console.log("[Step 4] Clinical records:", clinicalRecords.length);
        } catch (dbErr) {
            console.warn("[Step 4] Clinical data exception:", dbErr);
        }

        // ──────────────────────────────────────────────
        // STEP 5: Build context + call Groq API
        // ──────────────────────────────────────────────
        const context = findRelevance(question, clinicalRecords);
        const systemPrompt = buildSystemPrompt(context);
        console.log("[Step 5] Context — products:", context.products.length, "| rules:", context.rules.length);

        const groqApiKey = Deno.env.get('GROQ_API_KEY');
        if (!groqApiKey) {
            console.error("[Step 5] GROQ_API_KEY missing!");
            return jsonResponse({ error: "AI service not configured" }, 500);
        }

        const groqMessages = [
            { role: "system", content: systemPrompt },
            ...history.slice(-10),
            { role: "user", content: question }
        ];

        console.log("[Step 5] Calling Groq with", groqMessages.length, "messages...");

        let aiResponse: string;
        try {
            const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${groqApiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messages: groqMessages,
                    model: "llama-3.3-70b-versatile",
                    temperature: 0.1,
                    max_tokens: 2048,
                }),
            });

            console.log("[Step 5] Groq status:", groqRes.status);
            const groqData = await groqRes.json();

            if (!groqRes.ok) {
                console.error("[Step 5] Groq error:", JSON.stringify(groqData));
                return jsonResponse({ error: "AI service error: " + (groqData?.error?.message || groqRes.status) }, 502);
            }

            aiResponse = groqData?.choices?.[0]?.message?.content || "No response generated.";
            console.log("[Step 5] Groq OK — length:", aiResponse.length);
        } catch (groqErr) {
            console.error("[Step 5] Groq exception:", groqErr);
            return jsonResponse({ error: "Failed to reach AI service" }, 502);
        }

        // ──────────────────────────────────────────────
        // STEP 6: Save both messages (service role — bypasses RLS)
        // ──────────────────────────────────────────────
        try {
            const { error: insertError } = await db
                .from('chat_messages')
                .insert([
                    { conversation_id: conversationId, role: 'user', content: question },
                    { conversation_id: conversationId, role: 'assistant', content: aiResponse }
                ]);

            if (insertError) {
                console.warn("[Step 6] Message save error:", insertError.message);
                // Don't fail — AI already responded, just log the error
            } else {
                console.log("[Step 6] Messages saved OK");
            }
        } catch (saveErr) {
            console.warn("[Step 6] Message save exception:", saveErr);
        }

        // ──────────────────────────────────────────────
        // STEP 7: Return success with conversationId
        // ──────────────────────────────────────────────
        console.log("=== [chat-consultation] SUCCESS ===");
        return jsonResponse({
            content: aiResponse,
            conversationId: conversationId
        });

    } catch (err) {
        console.error("=== [chat-consultation] UNHANDLED ERROR ===", err);
        return jsonResponse({ error: "Internal server error: " + String(err) }, 500);
    }
})
