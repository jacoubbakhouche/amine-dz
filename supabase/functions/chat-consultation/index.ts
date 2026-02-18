
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { question, history = [] } = await req.json()

        // 1. Initialize Supabase with Service Role Key (to bypass RLS for clinical data if needed)
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 2. Retrieval: Fetch Clinical Knowledge from DB
        const { data: clinicalRecords } = await supabase
            .from('clinical_data')
            .select('*')

        let context = ""
        if (clinicalRecords) {
            clinicalRecords.forEach(rec => {
                context += `\nSource: ${rec.source}\nData: ${JSON.stringify(rec.data)}\n`
            })
        }

        // 3. Construct System Prompt (Dynamic Grounding)
        const systemPrompt = `
You are a Clinical Decision Support System (CDSS) for dentists.
Your goal is to provide deterministic medical insights based ONLY on the provided context.

CRITICAL RULES:
1. NEVER hallucinate. If the information isn't in the context, say "No official data found in the clinical database."
2. ALWAYS cite your source (e.g., "According to Antibiotic Rule R3..." or "Based on Dental Product data...").
3. Be concise and professional.

CONTEXT DATA:
${context}
    `.trim()

        // 4. Call Groq API
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
                temperature: 0.1, // Keep it deterministic
            }),
        })

        const data = await response.json()
        const aiResponse = data.choices[0]?.message?.content || "No response generated."

        return new Response(
            JSON.stringify({ content: aiResponse }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
