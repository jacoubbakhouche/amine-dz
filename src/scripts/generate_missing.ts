import { createClient } from '@supabase/supabase-js';
import { pipeline } from '@xenova/transformers';
import * as dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const PATH = '/Users/bakhouche/Downloads/dental_abx_kce_esc (1).json';

async function generateMissingEmbeddings() {
    console.log("🚀 Starting Vectorization Process for KCE (all-MiniLM-L6-v2)...");
    let pipe = await pipeline('feature-extraction', 'Xenova/all-miniLM-L6-v2');

    const readJson = (path: string) => JSON.parse(fs.readFileSync(path, 'utf-8').replace(/^\uFEFF/, ''));

    if (fs.existsSync(PATH)) {
        const kceData = readJson(PATH);
        const rules = kceData.rules || [];
        console.log(`\n📦 Processing ${rules.length} items for source: antibiotic_rules_kce...`);

        // Wipe ONLY the KCE rules if they exist
        await supabase.from('clinical_embeddings').delete().eq('source', 'antibiotic_rules_kce');

        for (let i = 0; i < rules.length; i++) {
            const r = rules[i];
            const content = `Rule: ${r.id}\nCondition/Uses: ${JSON.stringify(r.condition)}\nRecommendation/Description: ${JSON.stringify(r.recommendation)}`.trim();

            const output = await pipe(content, { pooling: 'mean', normalize: true });
            const embedding = Array.from(output.data);

            await supabase.from('clinical_embeddings').insert({
                source: 'antibiotic_rules_kce',
                content: content,
                metadata: r,
                embedding: embedding
            });
            process.stdout.write(`\rProgress: ${i + 1}/${rules.length}`);
        }
    }

    console.log("\n✅ Done!");
    process.exit(0);
}

generateMissingEmbeddings();
