import { supabase } from './supabase';

export interface MedicalProduct {
    nom: string;
    cnk: number;
    nci: string | null;
    indications: string[];
    limites: string[];
    profil_patient: string[];
    mecanisme_action: string | null;
    conseil_usage: string | null;
}

export interface AbxRule {
    id: string;
    condition: any;
    recommendation: any;
}

export const findRelevance = async (query: string) => {
    const q = query.toLowerCase();
    // Keywords for search: words > 2 chars, removing common question words
    const commonWords = ['what', 'are', 'the', 'is', 'a', 'an', 'dose', 'dosage', 'ingredients', 'composition', 'contain', 'how', 'much', 'ppm', 'mg', 'ml'];
    const keywords = q.split(/[^a-z0-9]/).filter(w => w.length > 2 && !commonWords.includes(w));

    console.log("CDSS Searching for keywords:", keywords);

    try {
        const { data: clinicalData, error } = await supabase
            .from('clinical_data')
            .select('source, data');

        if (error) throw error;

        const dentalRecord = clinicalData.find(r => r.source === 'dental_products');
        const abxRecord = clinicalData.find(r => r.source === 'antibiotic_rules');

        const products = (dentalRecord?.data as MedicalProduct[]) || [];
        const abxContent = abxRecord?.data as any;
        const rules = (abxContent?.rules as AbxRule[]) || [];
        const principles = (abxContent?.global_principles as string[]) || [];

        // Search in dental products (Ranked by keyword match count)
        const matchedProducts = products
            .map(p => {
                const searchString = `${p.nom} ${p.nci || ''} ${p.cnk}`.toLowerCase();
                let matches = 0;
                keywords.forEach(kw => {
                    if (searchString.includes(kw)) matches++;
                });
                return { ...p, score: matches };
            })
            .filter(p => p.score > 0 || q.includes(p.cnk.toString()))
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);

        console.log("CDSS Found Products:", matchedProducts.map(p => ({ nom: p.nom, cnk: p.cnk, score: p.score })));

        // Search in antibiotic rules
        const matchedRules = rules.filter(r =>
            r.id.toLowerCase().includes(q) ||
            JSON.stringify(r.condition).toLowerCase().includes(q)
        ).slice(0, 3);

        return {
            products: matchedProducts,
            rules: matchedRules,
            principles: principles
        };
    } catch (err) {
        console.error("CDSS Lookup Error:", err);
        return { products: [], rules: [], principles: [] };
    }
};

export const getSystemPrompt = (context: any) => {
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
};
