import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!; // Need service role key for writing if RLS is on

if (!supabaseKey) {
    console.error("VITE_SUPABASE_SERVICE_ROLE_KEY is missing in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
    console.log("Starting migration...");

    // 1. Migrate Dental Products
    const dentalPath = path.resolve(__dirname, '../../src/data/dentaire_ia_ready.json');
    const dentalData = JSON.parse(fs.readFileSync(dentalPath, 'utf8'));

    console.log("Cleaning old dental products...");
    await supabase.from('clinical_data').delete().eq('source', 'dental_products');

    console.log(`Uploading ${dentalData.length} dental products...`);
    const { error: dentalError } = await supabase
        .from('clinical_data')
        .insert({ source: 'dental_products', data: dentalData });

    if (dentalError) console.error("Error migrating dental products:", dentalError);
    else console.log("Dental products migrated successfully.");

    // 2. Migrate Antibiotic Rules
    const abxPath = path.resolve(__dirname, '../../src/data/antibiotiques_dentaires.json');
    const abxData = JSON.parse(fs.readFileSync(abxPath, 'utf8'));

    console.log("Cleaning old antibiotic rules...");
    await supabase.from('clinical_data').delete().eq('source', 'antibiotic_rules');

    console.log("Uploading antibiotic rules...");
    const { error: abxError } = await supabase
        .from('clinical_data')
        .insert({ source: 'antibiotic_rules', data: abxData });

    if (abxError) console.error("Error migrating antibiotic rules:", abxError);
    else console.log("Antibiotic rules migrated successfully.");

    process.exit(0);
}

migrate();
