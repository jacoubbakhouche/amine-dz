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
const DENTAIRE_PATH = '/Users/bakhouche/Downloads/dentaire_ia_ready (1).json';
const ABX_PATH = '/Users/bakhouche/Downloads/Antibiotiques dentaires (1).json';

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

    // 2. Load and Process dentaire_ia_ready.json
    if (fs.existsSync(DENTAIRE_PATH)) {
        console.log("\n📦 Processing dentaire_ia_ready.json...");
        const products = JSON.parse(fs.readFileSync(DENTAIRE_PATH, 'utf-8'));
        console.log(`Found ${products.length} products to vectorize.`);

        for (let i = 0; i < products.length; i++) {
            const p = products[i];
            // Merging Name, Uses (Indications), and Description (Mechanisms/Advice)
            const indicationsStr = Array.isArray(p.indications) ? p.indications.join(', ') : (p.indications || 'N/A');
            const content = `Product: ${p.nom}\nUses: ${indicationsStr}\nDescription: ${p.mecanisme_action || ''} ${p.conseil_usage || ''}`.trim();

            try {
                const output = await pipe(content, { pooling: 'mean', normalize: true });
                const embedding = Array.from(output.data);

                await supabase.from('clinical_embeddings').insert({
                    source: 'dental_products',
                    content: content,
                    metadata: p,
                    embedding: embedding
                });
            } catch (err: any) {
                console.error(`\nError processing product ${i}:`, err.message);
            }
            if ((i + 1) % 10 === 0 || i === products.length - 1) {
                process.stdout.write(`\rProgress: ${i + 1}/${products.length}`);
            }
        }
    }

    // 3. Load and Process Antibiotiques dentaires.json
    if (fs.existsSync(ABX_PATH)) {
        console.log("\n\n📦 Processing Antibiotiques dentaires.json...");
        const abxData = JSON.parse(fs.readFileSync(ABX_PATH, 'utf-8'));
        const rules = abxData.rules || [];
        console.log(`Found ${rules.length} antibiotic rules to vectorize.`);

        for (let i = 0; i < rules.length; i++) {
            const r = rules[i];
            // Merging Rule ID, Condition (Uses), and Recommendation (Description)
            const content = `Rule: ${r.id}\nCondition/Uses: ${JSON.stringify(r.condition)}\nRecommendation/Description: ${JSON.stringify(r.recommendation)}`.trim();

            try {
                const output = await pipe(content, { pooling: 'mean', normalize: true });
                const embedding = Array.from(output.data);

                await supabase.from('clinical_embeddings').insert({
                    source: 'antibiotic_rules',
                    content: content,
                    metadata: r,
                    embedding: embedding
                });
            } catch (err: any) {
                console.error(`\nError processing rule ${i}:`, err.message);
            }
            if ((i + 1) % 5 === 0 || i === rules.length - 1) {
                process.stdout.write(`\rProgress: ${i + 1}/${rules.length}`);
            }
        }
    }

    console.log("\n\n✅ Final Vectorization Complete! (Local & Free)");
    process.exit(0);
}

generateEmbeddings().catch(err => {
    console.error("Fatal Error:", err);
    process.exit(1);
});
