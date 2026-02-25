// ============================================================
// CORS Headers - السماح لأي موقع بالاتصال
// ============================================================
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ============================================================
// Main Handler
// ============================================================
Deno.serve(async (req) => {
  console.log(`[RAG] ${req.method} ${req.url}`);

  // ✅ Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('[CORS] Handling OPTIONS preflight request');
    return new Response('ok', {
      status: 200,
      headers: corsHeaders,
    });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    // Parse request
    console.log('[RAG] Parsing request...');
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error('[RAG] JSON parse error:', e);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    const { question, conversationId, history } = body;
    console.log('[RAG] Question:', question);
    console.log('[RAG] Conversation ID:', conversationId);
    console.log('[RAG] History type:', typeof history, 'Length:', history?.length || 0);
    
    // Validate history format
    const validHistory = Array.isArray(history) 
      ? history.filter((msg: any) => msg.role && msg.content)
      : [];
    console.log('[RAG] Valid history items:', validHistory.length);

    // ============================================================
    // STEP 1: Get embedding from HuggingFace
    // ============================================================
    console.log('[Pipeline] Step 1: Computing embedding...');
    const huggingFaceApiKey = Deno.env.get('HUGGINGFACE_API_KEY');
    let embedding = Array(384).fill(0); // Fallback

    if (huggingFaceApiKey) {
      try {
        const hfResponse = await fetch(
          'https://api-inference.huggingface.co/pipeline/feature-extraction/Xenova/all-MiniLM-L6-v2',
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${huggingFaceApiKey}` },
            body: JSON.stringify({ inputs: question, wait_for_model: true }),
          }
        );

        if (hfResponse.ok) {
          const result = await hfResponse.json();
          if (Array.isArray(result) && result.length > 0) {
            embedding = result[0];
            console.log('[Embedding] ✓ Got embedding from HuggingFace');
          }
        } else {
          console.warn('[Embedding] HuggingFace returned:', hfResponse.status);
        }
      } catch (e) {
        console.warn('[Embedding] Error:', e instanceof Error ? e.message : e);
      }
    } else {
      console.warn('[Embedding] HUGGINGFACE_API_KEY not set');
    }

    // ============================================================
    // STEP 2: Hybrid search in Supabase
    // ============================================================
    console.log('[Pipeline] Step 2: Running hybrid search...');
    let searchResults = [];
    let isFirstMedicineQuestion = false;
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log('[DEBUG] Question:', question);
    console.log('[DEBUG] Supabase URL exists:', !!supabaseUrl);
    console.log('[DEBUG] Service key exists:', !!supabaseServiceKey);

    if (supabaseUrl && supabaseServiceKey) {
      try {
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.43.0');
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Check if this is a first medicine question
        console.log('[Pipeline] Checking if first medicine question...');
        const { data: firstQuestionCheck, error: checkError } = await supabase.rpc('is_first_medicine_question', {
          question: question,
          history: validHistory
        });
        
        if (!checkError && firstQuestionCheck) {
          isFirstMedicineQuestion = true;
          console.log('[Pipeline] ✓ This is a FIRST MEDICINE QUESTION - will use complete card format');
        }

        console.log('[Supabase] Calling simple_search RPC...');
        console.log('[Supabase] Query text:', question);
        
        const { data, error } = await supabase.rpc('simple_search', {
          query_text: question,
          match_count: 8,
        });

        console.log('[Supabase] RPC Response - Error:', error);
        console.log('[Supabase] RPC Response - Data:', data);
        console.log('[Supabase] RPC Response - Data length:', data?.length);

        if (error) {
          console.error('[Supabase] RPC error:', JSON.stringify(error));
          searchResults = [];
        } else {
          searchResults = data || [];
          console.log(`[Supabase] ✓ Got ${searchResults.length} results`);
          
          // Log first result for debugging
          if (searchResults.length > 0) {
            console.log('[Supabase] First result:', {
              id: searchResults[0].id,
              source: searchResults[0].source,
              content_length: searchResults[0].content?.length,
              score: searchResults[0].combined_score,
              drug_name: searchResults[0].metadata?.drug_name
            });
          }
        }
      } catch (e) {
        console.error('[Supabase] Exception:', e instanceof Error ? e.message : e);
        console.error('[Supabase] Stack:', e instanceof Error ? e.stack : '');
      }
    } else {
      console.error('[Supabase] Missing credentials - URL:', !!supabaseUrl, 'Key:', !!supabaseServiceKey);
    }

    // ============================================================
    // STEP 3: Build context
    // ============================================================
    console.log('[Pipeline] Step 3: Building context...');
    console.log('[DEBUG] Search results count:', searchResults.length);
    
    // ⚠️ CHECK 1: Empty results - Return early!
    if (searchResults.length === 0) {
      console.log('[Pipeline] ⚠️ No results found in database');
      return new Response(
        JSON.stringify({
          success: true,
          content: "عذراً، لم نجد معلومات عن هذا في قاعدة بياناتنا. يرجى استشارة طبيب متخصص.",
          retrievedDocuments: 0,
          conversationId: conversationId,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // ⚠️ Log search results for debugging
    console.log('[Pipeline] Search results:');
    searchResults.forEach((r: any, idx: number) => {
      console.log(`  [${idx + 1}] Source: ${r.source}, Content length: ${r.content?.length || 0}`);
    });

    // Build context from results
    let context = '### السياق المستخرج من قاعدة بيانات الأدوية:\n\n';
    searchResults.forEach((result: any, idx: number) => {
      context += `**[${idx + 1}] ${result.source}** (درجة التطابق: ${(result.combined_score * 100).toFixed(1)}%)\n`;
      context += `${result.content}\n\n`;
      context += '---\n\n';
    });

    console.log('[Pipeline] Context length:', context.length);
    console.log('[Pipeline] Context preview:', context.substring(0, 200));

    // ============================================================
    // STEP 4: Generate response with Groq
    // ============================================================
    console.log('[Pipeline] Step 4: Generating consultation...');
    let consultation = 'Unable to generate response.';
    const groqApiKey = Deno.env.get('GROQ_API_KEY');

    if (groqApiKey) {
      try {
        // ⚠️ System Prompt - Adapté selon si c'est une première question ou non
        const systemPrompt = isFirstMedicineQuestion 
          ? `أنت "الخبير الصيدلاني الرقمي" في تطبيق Pharmasssit.

**IMPORTANT - MODE FICHE COMPLÈTE:**
C'est la première question sur ce médicament. Vous DEVEZ fournir une réponse COMPLÈTE et STRUCTURÉE:

📋 **Format obligatoire:**

1️⃣ **Nom du produit**
- Nom commercial + (CNK si disponible)

2️⃣ **Composition complète**
- Principes actifs ET excipients avec doses exactes

3️⃣ **Indications**
- Tous les usages documentés

4️⃣ **Public cible**
- Âge, profil du patient

5️⃣ **Mode d'emploi**
- Posologie exacte, fréquence, conditions (avant/après repas, etc.)

6️⃣ **Situations à éviter**
- Contre-indications et précautions

**Règles:**
1. Utilisez UNIQUEMENT les informations du contexte ci-dessous
2. Ne pas inventer de données
3. Si une section n'a pas d'info, écrivez: "Information non disponible"
4. Terminez par: "🚫 **Remarque:** Consultez toujours un professionnel de santé."

**Contexte disponible:**
${context}`
          : `أنت "الخبير الصيدلاني الرقمي" في تطبيق Pharmasssit.

**التعليمات الحتمية:**
1. استخدم **فقط** المعلومات من السياق المقدم أدناه
2. لا تستخدم معلومات من ذاكرتك عن الأدوية
3. إذا كان السياق **فارغ تماماً (لا يوجد نص)**, قل فقط: "لم نجد بيانات"
4. إذا كان السياق **يحتوي على بيانات**, استخرج المعلومات الكاملة (الاسم، الجرعة، الموانع، التحذيرات، الاستخدام)
5. أضف دائماً في النهاية: "ملاحظة: هذه معلومات استرشادية، استشر الطبيب"
6. قدم الإجابة في صيغة نقاط واضحة ومنظمة

**الأسلوب:** احترافي، بنقاط واضحة، بالعربية/الفرنسية حسب السؤال.

**السياق (المعلومات المتاحة):**
${context}`;

        console.log('[Groq] System prompt length:', systemPrompt.length);
        console.log('[Groq] Is first medicine question?', isFirstMedicineQuestion);
        console.log('[Groq] Context is empty?', context.trim().length === 0);

        console.log('[Groq] Sending request with context length:', context.length);
        
        // 2. إرسال الطلب لـ Groq
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
              { role: 'user', content: `سؤالي: ${question}` }
            ],
            temperature: 0.2,
            max_tokens: 1000,
          }),
        });

        console.log('[Groq] Response status:', groqResponse.status);

        if (groqResponse.ok) {
          const result = await groqResponse.json();
          consultation = result.choices?.[0]?.message?.content || 'No response from Groq';
          console.log('[Groq] ✓ Generated response - Length:', consultation.length);
          console.log('[Groq] Response preview:', consultation.substring(0, 150));
        } else {
          const errorText = await groqResponse.text();
          console.error('[Groq] Error response:', errorText.substring(0, 300));
          
          try {
            const errorData = JSON.parse(errorText);
            consultation = `Groq API error ${groqResponse.status}: ${errorData.error?.message || errorText}`;
          } catch {
            consultation = `Groq API error ${groqResponse.status}: ${errorText.substring(0, 200)}`;
          }
        }
      } catch (e) {
        console.error('[Groq] Exception:', e instanceof Error ? e.message : e);
        consultation = `Error calling Groq: ${e instanceof Error ? e.message : String(e)}`;
      }
    } else {
      console.warn('[Groq] GROQ_API_KEY not set');
      consultation = `خطأ: API key غير متوفر. عدد النتائج المسترجعة: ${searchResults.length}`;
    }

    // ============================================================
    // SUCCESS RESPONSE
    // ============================================================
    console.log('[Pipeline] ✓ Complete! Consultation length:', consultation.length);
    return new Response(
      JSON.stringify({
        success: true,
        content: consultation,
        retrievedDocuments: searchResults.length,
        conversationId: conversationId,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error('[Pipeline] Fatal error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});
