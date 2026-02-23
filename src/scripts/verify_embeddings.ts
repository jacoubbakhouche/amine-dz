import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    console.log("🔍 Fetching embeddings count...");
    const { data, error } = await supabase.from('clinical_embeddings').select('source');

    if (error) {
        console.error("Error fetching data:", error.message);
        return;
    }

    const counts: Record<string, number> = {};
    for (const row of data) {
        counts[row.source] = (counts[row.source] || 0) + 1;
    }

    console.log("\n📊 Final Database Embeddings Summary by Source:");
    console.table(counts);
}

verify();
