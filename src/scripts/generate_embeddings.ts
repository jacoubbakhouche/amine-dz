import { createClient } from '@supabase/supabase-js';
import { pipeline } from '@xenova/transformers';
import * as dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseKey) {
    console.error("❌ Missing VITE_SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Paths to your JSON files in Downloads
const PATHS = {
    DENTAIRE: '/Users/bakhouche/Downloads/dentaire_ia_ready (1).json',
    ABX: '/Users/bakhouche/Downloads/Antibiotiques dentaires.json',
    ENFANT: '/Users/bakhouche/Downloads/base_enfant_dentaire (1).json',
    MAPPING: '/Users/bakhouche/Downloads/mapping_adulte (1).json',
    KCE: '/Users/bakhouche/Downloads/dental_abx_kce_esc (1).json'
};

async function generateEmbeddings() {
    console.log("🚀 Starting Local Vectorization Process (all-MiniLM-L6-v2)...");

    // Load the model
    let pipe;
    try {
        pipe = await pipeline('feature-extraction', 'Xenova/all-miniLM-L6-v2');
    } catch (err: any) {
        console.error("⚠️ Model initialization error:", err.message);
        process.exit(1);
    }

    // 1. Clear existing embeddings
    console.log("🧹 Cleaning old embeddings...");
    await supabase.from('clinical_embeddings').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Helper function to embed and insert
    const processItems = async (items: any[], sourceName: string, formatContent: (item: any) => string) => {
        console.log(`\n📦 Processing ${items.length} items for source: ${sourceName}...`);
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const content = formatContent(item);

            try {
                const output = await pipe(content, { pooling: 'mean', normalize: true });
                const embedding = Array.from(output.data);

                const { error } = await supabase.from('clinical_embeddings').insert({
                    source: sourceName,
                    content: content,
                    metadata: item,
                    embedding: embedding
                });

                if (error) {
                    console.error(`Supabase Insert Error at index ${i}:`, error.message);
                }
            } catch (err: any) {
                console.error(`\nError processing item ${i} in ${sourceName}:`, err.message);
            }

            if ((i + 1) % 10 === 0 || i === items.length - 1) {
                process.stdout.write(`\rProgress: ${i + 1}/${items.length}`);
            }
        }
        console.log(); // Newline after progress bar
    };

    const readJson = (path: string) => JSON.parse(fs.readFileSync(path, 'utf-8').replace(/^\uFEFF/, ''));

    // 2. Load and Process dentaire_ia_ready.json
    if (fs.existsSync(PATHS.DENTAIRE)) {
        const products = readJson(PATHS.DENTAIRE);
        await processItems(products, 'dental_products', (p) => {
            const indicationsStr = Array.isArray(p.indications) ? p.indications.join(', ') : (p.indications || 'N/A');
            return `Product: ${p.nom}\nUses: ${indicationsStr}\nDescription: ${p.mecanisme_action || ''} ${p.conseil_usage || ''}`.trim();
        });
    }

    // 3. Load and Process base_enfant_dentaire.json
    if (fs.existsSync(PATHS.ENFANT)) {
        const childProducts = readJson(PATHS.ENFANT);
        await processItems(childProducts.produits || [], 'dental_products_child', (p) => {
            const indicationsStr = Array.isArray(p.indications) ? p.indications.join(', ') : (p.indications || 'N/A');
            const conseilsStr = Array.isArray(p.conseils) ? p.conseils.join(', ') : (p.conseils || '');
            return `Product: ${p.nom_produit}\nAge Group: ${p.section_age || ''}\nUses: ${indicationsStr}\nDosage: ${p.posologie || ''}\nAdvice: ${conseilsStr}`.trim();
        });
    }

    // 4. Load and Process mapping_adulte.json
    if (fs.existsSync(PATHS.MAPPING)) {
        const mappingObj = readJson(PATHS.MAPPING);
        const mappingItems = Object.entries(mappingObj).map(([key, value]: [string, any]) => ({ category: key, ...value }));
        await processItems(mappingItems, 'category_mapping', (m) => {
            const kw = Array.isArray(m.keywords) ? m.keywords.join(', ') : '';
            const cnks = Array.isArray(m.cnk) ? m.cnk.join(', ') : '';
            return `Category: ${m.category}\nKeywords: ${kw}\nRelated CNKs: ${cnks}`.trim();
        });
    }

    // 5. Load and Process Antibiotiques dentaires.json
    if (fs.existsSync(PATHS.ABX)) {
        const abxData = readJson(PATHS.ABX);
        const rules = abxData.rules || [];
        await processItems(rules, 'antibiotic_rules', (r) => {
            return `Rule: ${r.id}\nCondition/Uses: ${JSON.stringify(r.condition)}\nRecommendation/Description: ${JSON.stringify(r.recommendation)}`.trim();
        });
    }

    // 6. Load and Process dental_abx_kce_esc.json
    if (fs.existsSync(PATHS.KCE)) {
        const kceRules = readJson(PATHS.KCE);
        await processItems(kceRules.rules || [], 'antibiotic_rules_kce', (r) => {
            return `Rule: ${r.id}\nCondition/Uses: ${JSON.stringify(r.condition)}\nRecommendation/Description: ${JSON.stringify(r.recommendation)}`.trim();
        });
    }

    console.log("\n\n✅ Final Vectorization Complete! (Local & Free)");
    process.exit(0);
}

generateEmbeddings().catch(err => {
    console.error("Fatal Error:", err);
    process.exit(1);
});
