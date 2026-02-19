
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// --- CDSS Smart Search (moved from frontend cdss.ts) ---
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
    condition: any;
    recommendation: any;
}

function findRelevance(query: string, clinicalRecords: any[]) {
    const q = query.toLowerCase();
    const commonWords = ['what', 'are', 'the', 'is', 'a', 'an', 'dose', 'dosage', 'ingredients', 'composition', 'contain', 'how', 'much', 'ppm', 'mg', 'ml'];
    const keywords = q.split(/[^a-z0-9]/).filter((w: string) => w.length > 2 && !commonWords.includes(w));

    const dentalRecord = clinicalRecords.find((r: any) => r.source === 'dental_products');
    const abxRecord = clinicalRecords.find((r: any) => r.source === 'antibiotic_rules');

    const products = (dentalRecord?.data as MedicalProduct[]) || [];
    const abxContent = abxRecord?.data as any;
    const rules = (abxContent?.rules as AbxRule[]) || [];
    const principles = (abxContent?.global_principles as string[]) || [];

    // Search dental products (ranked by keyword match count)
    const matchedProducts = products
        .map((p: MedicalProduct) => {
            const searchString = `${p.nom} ${p.nci || ''} ${p.cnk}`.toLowerCase();
            let matches = 0;
            keywords.forEach((kw: string) => {
                if (searchString.includes(kw)) matches++;
            });
            return { ...p, score: matches };
        })
        .filter((p: any) => p.score > 0 || q.includes(p.cnk.toString()))
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 5);

    // Search antibiotic rules
    const matchedRules = rules.filter((r: AbxRule) =>
        r.id.toLowerCase().includes(q) ||
        JSON.stringify(r.condition).toLowerCase().includes(q)
    ).slice(0, 3);

    return { products: matchedProducts, rules: matchedRules, principles };
}

function buildSystemPrompt(context: any) {
    let contextStr = "Official Data Foundations:\n";

    if (context.products.length > 0) {
        contextStr += "\n[Dental Products Data]:\n" + JSON.stringify(context.products, null, 2);
    }
    if (context.rules.length > 0) {
        contextStr += "\n[Antibiotic Clinical Rules]:\n" + JSON.stringify(context.rules, null, 2);
    }
    if (context.principles && context.principles.length > 0) {
        contextStr += "\n[Global Principles]:\n" + context.principles.join("\n");
    }

    return `You are a professional Clinical Decision Support System (CDSS) for dentists and pharmacists.
Your primary goal is "Precision Chirurgicale" (Surgical Precision) and deterministic logic. 

STRICT RULES (NON-NEGOTIABLE):
1. DATA PRIORITY: Use ONLY the provided [Official Data Foundations] to answer. These foundations TAKE ABSOLUTE PRECEDENCE over your general training data. Even if you "think" a value is different, you MUST report what is in the JSON.
2. ZERO HALLUCINATION: If a concentration (like ppm, mg, %) or ingredient is not explicitly written in the provided JSON context, you MUST state "No official data found for this specific detail". 
3. SPECIFIC CASE: For "Dentaid Xeros Spray", if the JSON says 226 ppm, you MUST NOT say 1500 ppm or any other value.
4. INGREDIENTS VERIFICATION: You MUST check the 'nci' field for every product. Do not assume ingredients.
5. FALLBACK: If the user query is NOT covered by the provided data, you MUST state exactly: "No official data found in current clinical guidelines" and NOTHING else.
6. JUSTIFICATION: Every answer MUST have a "Justification" section referencing CNKs or Rule IDs.

CONTEXT FOR USER QUERY:
${contextStr}`;
}

// --- Main Handler ---
serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { question, history = [], conversationId } = await req.json()

        if (!question || typeof question !== 'string') {
            return new Response(
                JSON.stringify({ error: 'Missing or invalid "question" field' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 1. Verify the user from the Authorization header
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Missing authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Client for user operations (respects RLS)
        const userSupabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        const { data: { user }, error: userError } = await userSupabase.auth.getUser()
        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 2. Service client for clinical data (bypasses RLS)
        const serviceSupabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 3. Smart CDSS Search — fetch clinical data and search server-side
        const { data: clinicalRecords } = await serviceSupabase
            .from('clinical_data')
            .select('source, data')

        const context = findRelevance(question, clinicalRecords || []);
        const systemPrompt = buildSystemPrompt(context);

        // 4. Call Groq API (key stays on the server!)
        const groqApiKey = Deno.env.get('GROQ_API_KEY')
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${groqApiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                messages: [
                    { role: "system", content: systemPrompt },
                    ...history,
                    { role: "user", content: question }
                ],
                model: "llama-3.3-70b-versatile",
                temperature: 0.1,
            }),
        })

        const data = await response.json()

        if (!response.ok) {
            console.error("Groq API error:", data);
            return new Response(
                JSON.stringify({ error: data.error?.message || 'AI service error' }),
                { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const aiResponse = data.choices[0]?.message?.content || "No response generated."

        // 5. Save messages to database (both user + assistant)
        if (conversationId) {
            await userSupabase.from('chat_messages').insert([
                { conversation_id: conversationId, role: 'user', content: question },
                { conversation_id: conversationId, role: 'assistant', content: aiResponse }
            ])
        }

        return new Response(
            JSON.stringify({ content: aiResponse }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error("Edge Function error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
