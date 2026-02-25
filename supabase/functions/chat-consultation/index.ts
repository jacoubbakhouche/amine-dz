import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept, x-requested-with',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

// --- Helper: Query Expansion via Groq (Context-Aware) ---
async function expandQuery(question: string, history: any[], groqKey: string): Promise<string> {
    // Only expand if question is short or lacks drug names (< 30 chars or no uppercase letters)
    if (question.length >= 30 && /[A-Z]/.test(question)) {
        console.log("[DEBUG] Query long enough and contains drug names, using as-is.");
        return question;
    }

    try {
        console.log("[DEBUG] Short/vague query detected. Contextualizing with history...");

        // Include last 6 messages for better context
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
                        content: `You are a search query rewriter for a pharmaceutical database. Your ONLY job:
1. Read the conversation history below.
2. Identify the LAST product/drug/topic discussed.
3. Rewrite the user's latest question into an explicit search query that includes the product name.

RULES:
- Output ONLY the rewritten query, nothing else. No explanations, no greetings.
- If the user says "other options", "alternatives", or "بدائل", output: "alternatives to [LAST PRODUCT NAME]"
- If the user says "how to use it", "dosage", "كيفاش نستعملو", output: "[LAST PRODUCT NAME] dosage usage"
- If the user asks "ماذا عن المنتج السابق", find the previous product in history and output its name.
- If the question is already specific (contains a product name), return it unchanged.
- NEVER add explanations. Output ONLY the search query string.`
                    },
                    {
                        role: "user",
                        content: `Conversation History:\n${historyContext}\n\nLatest User Question: "${question}"`
                    }
                ],
                temperature: 0.0,
            }),
        }).finally(() => clearTimeout(timeoutId));

        if (expandRes.ok) {
            const expandData = await expandRes.json();
            const expanded = expandData.choices?.[0]?.message?.content?.trim() || question;
            console.log(`[DEBUG] Context-aware query: "${expanded}"`);
            return expanded;
        } else {
            console.warn("[DEBUG] Groq expansion request failed, using original.");
        }
    } catch (e: any) {
        console.warn("[DEBUG] Query expansion error (timeout or network):", (e as Error).message);
    }

    return question;
}

// --- Helper: Extract structured data from context ---
function parseContextForStructure(context: string): { drugs: any[], symptoms: string[] } {
    const drugs: any[] = [];
    const symptoms: string[] = [];

    // Split by document separator
    const documents = context.split("\n---\n");

    for (const doc of documents) {
        // Extract drug name (usually after [ID: ...] [Source: ...])
        const idMatch = doc.match(/\[ID: ([^\]]+)\]/);
        const sourceMatch = doc.match(/\[Source: ([^\]]+)\]/);

        if (idMatch || sourceMatch) {
            drugs.push({
                id: idMatch?.[1] || 'unknown',
                source: sourceMatch?.[1] || 'unknown',
                content: doc.replace(/\[ID: [^\]]+\]\s*\[Source: [^\]]+\]\s*/, '').trim()
            });
        }
    }

    return { drugs, symptoms };
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

        // --- NEW: Query Expansion (Context-Aware) ---
        const expandedQuery = await expandQuery(question, history, groqKey);
        console.log(`[DEBUG] Search query (after expansion): "${expandedQuery}"`);

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
        } catch (e: any) { console.error("DB History Error (Ignored):", (e as Error).message); }

        // --- 2. Clinical Search (Using expanded query) ---
        let context = "";
        try {
        console.log(`[DEBUG] RPC match_clinical_data - Query: "${expandedQuery}", Dimensions: ${queryVector ? queryVector.length : 'NULL'}`);

            // --- NEW: Contextual Search Enhancement ---
            // If question is very short, combine with last user message for better context
            let searchQuery = expandedQuery;
            if (history.length > 0 && question.length < 20) {
                const lastUserMessage = history.filter((m: any) => m.role === 'user').pop()?.content || "";
                if (lastUserMessage && lastUserMessage.length > 5) {
                    searchQuery = `${lastUserMessage} ${question}`;
                    console.log(`[DEBUG] Short question detected. Enhanced search query: "${searchQuery}"`);
                }
            }

            // Try to find previous medication/product context from history
            let previousProductContext = "";
            if (history.length > 0) {
                const recentAssistantMessages = history.filter((m: any) => m.role === 'assistant').slice(-3);
                const productPattern = /📦 المنتج: ([^\n]+)|Product: ([^\n]+)/g;
                let match;
                while ((match = productPattern.exec(recentAssistantMessages.map((m: any) => m.content).join(" "))) !== null) {
                    previousProductContext = match[1] || match[2];
                }
            }
            if (previousProductContext) {
                console.log(`[DEBUG] Found previous product context: "${previousProductContext}"`);
            }

            let { data: results, error: rpcError } = await db.rpc('match_clinical_data', {
                query_embedding: queryVector,
                query_text: searchQuery, // Uses contextual search query
                match_threshold: 0.05,
                match_count: 10
            });

            console.log('Search Results (RPC Tier 1):', results ? results.length : 0);

            // --- NEW: Similarity Threshold Validation ---
            if (results && results.length > 0) {
                // Check if best match meets minimum similarity threshold
                const bestMatch = results[0];
                const minSimilarity = 0.2;

                if (bestMatch.similarity && bestMatch.similarity < minSimilarity) {
                    console.log(`[SAFETY] Best match similarity (${bestMatch.similarity}) below threshold (${minSimilarity}). Treating as no results.`);
                    results = [];
                } else {
                    console.log(`[DEBUG] Best match similarity: ${bestMatch.similarity} (threshold: ${minSimilarity}) ✓`);
                }
            }

            // Tier 2: Extreme recovery if nothing found (threshold: 0.0)
            if ((!results || results.length === 0) && !rpcError) {
                console.log("[DEBUG] Tier 1 found 0 results or below threshold. Trying Tier 2 (threshold: 0.0)...");
                const { data: resultsTier2 } = await db.rpc('match_clinical_data', {
                    query_embedding: queryVector,
                    query_text: expandedQuery,
                    match_threshold: 0.0,
                    match_count: 10
                });

                // Apply threshold check to Tier 2 as well
                if (resultsTier2 && resultsTier2.length > 0) {
                    const bestMatchTier2 = resultsTier2[0];
                    if (bestMatchTier2.similarity && bestMatchTier2.similarity < 0.1) {
                        console.log(`[SAFETY] Tier 2 best match similarity (${bestMatchTier2.similarity}) too low. Rejecting.`);
                        results = [];
                    } else {
                        results = resultsTier2;
                        console.log('Search Results (RPC Tier 2):', results ? results.length : 0);
                    }
                }
            }

            if (rpcError) console.error("[DEBUG] RPC Error:", rpcError.message);

            if (results && results.length > 0) {
                console.log(`[DEBUG] Final Results count: ${results.length}`);
                const uniqueResults = Array.from(new Map(results.map((r: any) => [r.source || r.id, r])).values());
                // Format context with explicit sections
                context = uniqueResults.map((r: any) => {
                    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 Produit: ${r.source || r.id}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${r.content}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    `.trim();
                }).join("\n\n");
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
                        .limit(3); // Increased limit

                    if (kwMatches && kwMatches.length > 0) {
                        fallbackContexts.push(...kwMatches);
                    }
                }

                if (fallbackContexts.length === 0 && history.length > 0) {
                    console.log("[DEBUG] Keyword fallback empty. Extracting topics from conversation history...");
                    const historyText = history.slice(-6)
                        .filter((m: any) => m.role === 'assistant')
                        .map((m: any) => m.content)
                        .join(' ');
                    const topicWords = historyText.match(/\b[A-Z][a-zA-Z-]{2,}\b/g) || [];
                    const uniqueTopics = [...new Set(topicWords)].slice(0, 3);

                    for (const topic of uniqueTopics) {
                        console.log(`[DEBUG] History topic fallback: "${topic}"`);
                        const { data: topicMatches } = await db.from('clinical_embeddings')
                            .select('id, source, content')
                            .ilike('content', `%${topic}%`)
                            .limit(3);
                        if (topicMatches?.length) fallbackContexts.push(...topicMatches);
                    }
                }

                if (fallbackContexts.length > 0) {
                    console.log(`[DEBUG] Found ${fallbackContexts.length} total matches via fallback.`);
                    // Remove duplicates by ID
                    const uniqueMatches = Array.from(new Map(fallbackContexts.map(item => [item.id, item])).values());
                    context = uniqueMatches.map((r: any) => `[ID: ${r.id}] [Source: ${r.source}] ${r.content}`).join("\n---\n");
                }
            }
        } catch (e: any) { console.error("Search Error (Ignored):", (e as Error).message); }

        // --- 2.5 Hard Lock (Anti-hallucination) - ENHANCED ---
        // Check if question is just a greeting
        const greetingPatternsCheck = /^(مرحبا|السلام عليكم|صباح الخير|مساء الخير|السلام|hi|hello|bonjour|salut|bonsoir|hey|coucou|ça va)\b/i;
        const isGreetingCheck = greetingPatternsCheck.test(question.trim());

        if ((!context || context.trim() === "") && !isGreetingCheck) {
            console.log("[HARD LOCK] No clinical data found (or similarity too low). User is not greeting. Blocking.");

            // Failure message (French only - Belgium market)
            const lockMessage = "Désolé, aucun médicament dans notre base de données clinique approuvée ne traite actuellement ce symptôme spécifique. Veuillez consulter directement votre pharmacien pour obtenir les conseils appropriés.";

            if (activeConvId) {
                await db.from('chat_messages').insert({ conversation_id: activeConvId, user_id: userId, role: 'assistant', content: lockMessage });
            }

            return new Response(JSON.stringify({ content: lockMessage, conversationId: activeConvId, blocked: true }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // --- 3. AI Completion with Strict System Prompt ---
        console.log("[DEBUG] Final Context being sent to AI:", context ? "Populated" : "EMPTY");

        // Detect greeting patterns (French only)
        const greetingPatternsFinal = /^(bonjour|bonsoir|salut|hi|hello|hey|coucou|ça va|comment ça va)\b/i;
        const isGreetingFinal = greetingPatternsFinal.test(question.trim());

        // Extract product names from context for personalized prompt
        const productNameMatches = context.match(/📦 Produit: ([^\n]+)/g) || [];
        const productNames = productNameMatches.map(m => m.replace('📦 Produit: ', '').trim());
        
        // Build personalized instruction based on actual data retrieved
        let dataInstructions = "";
        if (productNames.length > 0 && context.length > 0) {
            dataInstructions = `
⚡ **Données Disponibles pour cette Demande:**
Produits: ${productNames.join(', ')}

👉 **Instructions Critiques:**
- Utilisez UNIQUEMENT les données des produits listés ci-dessus
- Ne mélangez pas les informations d'un produit avec un autre
- Chaque produit a des utilisations et dosages différents
- Assurez-vous de donner les bonnes informations pour chaque produit exactement
`;
        }

        const systemPrompt = `Vous êtes un assistant pharmacien spécialisé qui s'appuie 100% uniquement sur les données cliniques fournies.

═══════════════════════════════════════════════════════════════
⚖️ LA RÈGLE D'OR (THE GOLDEN RULE)
═══════════════════════════════════════════════════════════════

🚫 **STRICTEMENT INTERDIT:**
- Toute information provenant de vos connaissances générales sur les médicaments
- Deviner ou déduire des informations non trouvées explicitement dans les données
- Inventer des posologies ou des contre-indications
- Donner des conseils médicaux non présents dans les dossiers
- Suggérer des produits ne figurant pas dans le contexte fourni
- Copier les mêmes informations d'un produit à l'autre

✅ **AUTORISÉ UNIQUEMENT:**
- Informations explicitement présentes dans les "Données Cliniques de Référence" ci-dessous
- Analyse et lien logique entre les données fournies
- Explication et détail des données en style professionnel
- Distinction claire entre chaque produit

═══════════════════════════════════════════════════════════════
${dataInstructions}
═══════════════════════════════════════════════════════════════

📋 **Instructions de Traitement des Questions:**

1️⃣ **Pour la première question sur un médicament/produit:**
   - Nom du produit + Code (CNK) s'il existe
   - Formulation complète (principes actifs et excipients) - C'EST LA PRIORITÉ!
   - Indications (Indication Thérapeutique) - diffère d'un produit à l'autre
   - Profil Patient Ciblé
   - Mode d'utilisation (posologie, fréquence) - DOIT être différent pour chaque produit
   - Avertissements et contre-indications - NE PAS copier d'un autre produit

2️⃣ **Pour les questions de suivi (Follow-up):**
   - Répondez directement à la question posée
   - Ne répétez pas les informations antérieures
   - S'il y a un avertissement, commencez par celui-ci

3️⃣ **Lors d'une demande de "plus d'options" ou "alternatives":**
   - Recherchez dans les données un autre produit de la même catégorie
   - Mentionnez les différences entre les produits
   - Chaque produit a des utilisations et posologies différentes

4️⃣ **Quand une question porte sur un produit non présent dans les données:**
   - Répondez littéralement: "Désolé, ce produit n'est pas répertorié dans notre base de données clinique approuvée."
   - NE PAS suggérer d'alternatives de votre propre connaissance

5️⃣ **Pour les questions peu claires:**
   - Assumez qu'elles concernent le dernier produit mentionné
   - Si ce n'est pas clair, demandez une clarification

6️⃣ **Lors de la détection d'une contradiction (ex: âge de l'enfant < limite autorisée):**
   - L'AVERTISSEMENT DE SÉCURITÉ EST LA PRIORITÉ ABSOLUE
   - Commencez par: "⚠️ AVERTISSEMENT IMPORTANT"

═══════════════════════════════════════════════════════════════
📦 DONNÉES CLINIQUES DE RÉFÉRENCE
═══════════════════════════════════════════════════════════════

${context || "Aucune donnée disponible actuellement pour cette requête."}

═══════════════════════════════════════════════════════════════`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        console.log("Calling Groq API with strict knowledge-locked prompt...");
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
                messages: [{ role: "system", content: systemPrompt }, ...history.slice(-6), { role: "user", content: question }],
                model: "llama-3.1-8b-instant",
                temperature: 0.1,
            }),
        }).finally(() => clearTimeout(timeoutId));

        if (!groqRes.ok) {
            const errBody = await groqRes.text().catch(() => "unreadable");
            console.error("Groq API Error:", groqRes.status, errBody);
            throw new Error(`AI Service error (${groqRes.status})`);
        }

        const groqData = await groqRes.json();
        const aiContent = groqData.choices?.[0]?.message?.content || "No response.";
        console.log("AI Response Received.");

        // --- 4. Final Save ---
        if (activeConvId) {
            db.from('chat_messages').insert({ conversation_id: activeConvId, user_id: userId, role: 'assistant', content: aiContent })
                .then((result: any) => result?.error && console.error("Final Save error"));
        }

        return new Response(JSON.stringify({ content: aiContent, conversationId: activeConvId }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (err: any) {
        console.error("Critical Function Fail:", err.message);
        return new Response(JSON.stringify({ content: "Désolé, une erreur technique interne s'est produite. Veuillez réessayer.", error: err.message }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

