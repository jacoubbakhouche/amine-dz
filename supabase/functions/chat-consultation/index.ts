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
    } catch (e) {
        console.warn("[DEBUG] Query expansion error (timeout or network):", e.message);
    }

    return question;
}

// --- Helper: Extract structured data from context ---
function parseContextForStructure(context: string): { drugs: any[], symptoms: string[] } {
    const drugs = [];
    const symptoms = [];

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
        } catch (e) { console.error("DB History Error (Ignored):", e.message); }

        // --- 2. Clinical Search (Using expanded query) ---
        let context = "";
        try {
            console.log(`[DEBUG] RPC match_clinical_data - Query: "${expandedQuery}", Dimensions: ${queryVector ? queryVector.length : 'NULL'}`);

            // --- NEW: Contextual Search Enhancement ---
            // If question is very short, combine with last user message for better context
            let searchQuery = expandedQuery;
            if (history.length > 0 && question.length < 20) {
                const lastUserMessage = history.filter((m: any) => m.role === 'user').pop()?.content || "";
                if (lastUserMessage) {
                    searchQuery = `${lastUserMessage} ${question}`;
                    console.log(`[DEBUG] Short question detected. Enhanced search query: "${searchQuery}"`);
                }
            }

            // --- TIER 0: EXACT MATCH (Hybrid Search) ---
            console.log(`[DEBUG] Tier 0: Checking for exact match on product name...`);
            let results = [];
            let rpcError = null;

            // Use the top keyword for exact matching
            const searchCandidate = keywords.length > 0 ? keywords[0] : cleanInput;

            if (searchCandidate.length > 2) {
                const { data: exactMatches, error: exactError } = await db
                    .from('clinical_embeddings')
                    .select('id, source, content, metadata')
                    .ilike('metadata->>nom', `%${searchCandidate}%`)
                    .limit(3);

                if (exactMatches && exactMatches.length > 0) {
                    console.log(`[DEBUG] Tier 0 found ${exactMatches.length} exact matches! Bypassing Vector Search.`);
                    results = exactMatches.map((m: any) => ({ ...m, similarity: 1.0 })); // Mock similarity
                }
            }

            if (!results || results.length === 0) {
                console.log(`[DEBUG] Tier 0 no exact match. Proceeding to Vector Search (Tier 1)...`);
                const rpcRes = await db.rpc('match_clinical_data', {
                    query_embedding: queryVector,
                    query_text: searchQuery, // Uses contextual search query
                    match_threshold: 0.05,
                    match_count: 10
                });
                results = rpcRes.data;
                rpcError = rpcRes.error;
            }

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
                context = uniqueResults.map((r: any) => `[ID: ${r.id}] [Source: ${r.source}] [Similarity: ${r.similarity?.toFixed(3) || 'N/A'}] ${r.content}`).join("\n---\n");
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
        } catch (e) { console.error("Search Error (Ignored):", e.message); }

        // Detect greeting patterns
        const greetingPatterns = /^(مرحبا|السلام عليكم|صباح الخير|مساء الخير|السلام|hi|hello|bonjour|salut|bonsoir|hey)\b/i;
        const isGreeting = greetingPatterns.test(question.trim());

        // --- 2.5 Hard Lock (Anti-hallucination) - ENHANCED ---
        // Detect if data is effectively empty even if context string exists
        const isDataEmpty = !context || context.trim() === "" ||
            (context.includes("Source:") && !context.includes("Composition") && !context.includes("Indications") && context.length < 100);

        if (isDataEmpty && !isGreeting) {
            console.log("[HARD LOCK] Data effectively empty or missing. Bypassing AI.");
            const lockMessage = "Désolé, les détails cliniques pour ce produit ne sont pas encore répertoriés dans notre base de données. Veuillez consulter votre pharmacien.";

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

        const systemPrompt = `Voici votre identité et vos instructions strictes :

**1. Votre identité :**
Vous êtes un expert en pharmacie dentaire (Belgique), spécialisé dans l'analyse des données cliniques jointes uniquement. Répondez dans la langue de l'utilisateur (français ou arabe) en utilisant la terminologie médicale française officielle.

**🚨 Règle d'OR (Anti-Hallucination) :**
- Utilisez **UNIQUEMENT** les informations présentes dans le JSON/Documents fournis pour le produit actuel.
- Si les données cliniques (composition, posologie, précautions) sont absentes du contexte fourni, vous devez **ARRÊTER** immédiatement et dire que les détails ne sont pas répertoriés.
- Il est **STRICTEMENT INTERDIT** d'utiliser les caractéristiques d'un produit précédent discuté dans l'historique pour décrire un nouveau produit. Chaque produit est une entité isolée.

**2. Votre mission principale :**
Répondre aux questions des utilisateurs en vous basant **exclusivement** sur les documents joints (Contexte Clinique).

**3. 🎯 Gestion des salutations :**
- Si le message de l'utilisateur est une simple salutation (ex : Bonjour, Salut, مرحبا, السلام عليكم) :
  - Répondez poliment et professionnellement sans mentionner l'absence de données.
  - Exemple : "Bonjour ! Je suis votre assistant pharmaceutique intelligent. Comment puis-je vous aider aujourd'hui ?"
  - Ne jamais mentionner "pas de données" ou "base de données" dans les réponses aux salutations.

**4. 🔄 Questions contextuelles et suivi :**
- Consultez l'historique de la conversation (History) avec précision. Si l'utilisateur demande "d'autres alternatives" ou "qu'en est-il du produit précédent ?", recherchez les derniers produits discutés et fournissez la comparaison basée uniquement sur les dossiers joints.
- Si l'utilisateur pose des questions vagues ("Comment l'utiliser ?", "Quelle est la posologie ?", "كيفاش نستعملو؟") :
  - Supposez que la question concerne le dernier médicament ou produit mentionné dans le contexte.
  - Recherchez ce produit dans le texte joint et fournissez les informations directement.
  - S'il n'y a pas de produit spécifique dans le contexte, demandez à l'utilisateur de préciser.

**5. 🔒 Verrouillage strict des connaissances (Knowledge Lock) :**
- Si l'utilisateur demande un médicament ou une information (ex : Doliprane, Paracétamol) qui n'est **pas** dans le texte joint, dites : "Désolé, ce produit n'est pas référencé dans notre base de données clinique approuvée actuellement."
- **Ne jamais suggérer d'alternatives provenant de votre mémoire externe.**
- **Ne jamais fournir de posologies ou d'informations médicales non trouvées dans le contexte.**

**6. Agrégation intelligente :**
- Si vous trouvez plusieurs produits pour le même problème ou symptôme dans le texte, mentionnez-les **tous**.
- Classez-les par pertinence selon la base de données.

**7. Gestion des langues :**
- Recherchez les liens logiques entre l'arabe et le français (ex : جفاف الفم = Sécheresse buccale).
- Si vous ne trouvez pas de traduction ou de lien logique, indiquez que l'information n'est pas disponible.
- Utilisez toujours la terminologie médicale française officielle, même si vous répondez en arabe.

**8. Style de réponse clinique détaillé (Format Clinique) :**

**a) Lors de la première mention d'un produit (Rapport complet) :**
Si les données existent, fournissez-les obligatoirement dans cet ordre :

📌 **Contexte clinique :** (Résumé de l'état de santé/problème).
🎯 **Objectifs thérapeutiques :** (Bénéfices attendus).
🧴 **Produit recommandé (Détails) :**
  - **Nom et CNK :** Nom complet + code.
  - **Composition (NCI) :** Ingrédients principaux (fluorure, nitrate, etc.).
  - **Données du patient :** Groupe d'âge, Contre-indications exactes.
  - **Mode d'emploi :** Instructions détaillées issues du dossier.
💊 **Protocole antibiotique :** (Si disponible).
⚠️ **Sécurité et mises en garde :** Avertissements importants et situations à éviter.

**b) Pour les questions de suivi (Follow-up) :**
- Répondez directement et concisement sans répéter le contexte.
- Les mises en garde (ex: restrictions d'âge) doivent être signalées immédiatement par un ⚠️.
- Maintenez un ton professionnel et soigné. Vous pouvez utiliser des émojis de manière pertinente pour rendre la lecture agréable et "belle" (ex: ✅, �, 💡), tout en restant sérieux et clinique. Utilisez toujours les icônes structurelles (📌🎯🧴💊⚠️).

**9. 🔬 Extraction stricte et Isolation (Anti-Hallucination) :**
- **Vérification de la Source :** Utilisez UNIQUEMENT les informations présentes dans le JSON fourni pour le produit actuel.
- **Gestion du Vide (Hard Stop) :** Si les champs cliniques (mecanisme_action, nci, conseil_usage) dans le JSON sont "null" ou vides, vous devez répondre : "Désolé, les détails cliniques pour ce produit ne sont pas encore répertoriés dans notre base de données. Veuillez consulter votre pharmacien."
- **Interdiction de Transfert :** N'utilisez jamais les caractéristiques d'un produit précédent (ex: Oral-B) pour décrire un produit actuel (ex: Melident).
- Ne dites jamais "tous les groupes d'âge" sauf si le champ profil_patient le mentionne explicitement.

**10. Conclusion obligatoire (pour les questions non-salutations) :**
- Terminez toujours par : "Veuillez consulter votre médecin ou pharmacien pour déterminer la posologie et la durée appropriées à votre état de santé."

**⚠️ Avertissement critique :**
- Si le contexte joint est vide ou ne contient pas d'informations pertinentes (et ce n'est pas une salutation), dites : "Désolé, aucune donnée n'est disponible pour cette demande actuellement. Veuillez consulter votre pharmacien."
- **Ne devinez jamais, ne spéculez jamais, n'utilisez jamais d'informations externes.**

**11. 🔍 Intelligence dans la présentation des alternatives :**
- Si l'utilisateur demande des options supplémentaires, recherchez dans les dossiers tout produit partageant les mêmes "Indications" ou "Catégorie" et présentez-le comme alternative approuvée, en précisant les différences si mentionnées dans le texte.

**12. 🚫 Correspondance stricte des catégories (Category Matching) :**
- Ne suggérez jamais un produit d'une catégorie différente de celle demandée par l'utilisateur.
- Exemple : Si l'utilisateur demande un produit pour "le nettoyage interdentaire", ne suggérez pas un adhésif pour prothèses (comme COREGA).
- Associez les produits uniquement selon le champ "Indications" ou "Catégorie" mentionné dans les dossiers cliniques.
- En cas de doute sur la correspondance de catégorie, mentionnez explicitement la catégorie prévue du produit.

---

**Documents médicaux de référence (Contexte Clinique) :**
${context || "Aucune donnée disponible pour cette demande actuellement."}`;

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
                frequency_penalty: 0.8,
                presence_penalty: 0.6,
                max_tokens: 600
            }),
        }).finally(() => clearTimeout(timeoutId));

        if (!groqRes.ok) {
            const errBody = await groqRes.text().catch(() => "unreadable");
            console.error("Groq API Error:", groqRes.status, errBody);
            throw new Error(`AI Service error (${groqRes.status})`);
        }

        const groqData = await groqRes.json();
        let aiContent = groqData.choices?.[0]?.message?.content || "No response.";
        console.log("AI Response Received.");

        // --- 3.5 NEW: Validation (Inference Loop Prevention) ---
        // Check if a word is repeated 5 or more times consecutively
        const repetitionRegex = /\b(\w+)(?:\s+\1){4,}\b/gi;
        if (repetitionRegex.test(aiContent)) {
            console.error("[SAFETY] Inference loop detected (excessive word repetition). Cutting response.");
            aiContent = "Désolé, une erreur technique (boucle logique) s'est produite lors de la génération de la réponse. La réponse a été interrompue par mesure de sécurité. Veuillez reformuler votre question ou consulter directement votre pharmacien.";
        }

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
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
