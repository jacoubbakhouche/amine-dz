import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
    const { data, error } = await supabase
        .from('clinical_data')
        .select('*');

    if (error) {
        console.error(error);
        return;
    }

    const dentalRecord = data.find(r => r.source === 'dental_products');
    const products = dentalRecord?.data || [];
    const target = products.find((p: any) => p.cnk === 2577096);

    console.log("Product Name:", target?.nom);
    console.log("Product NCI:", target?.nci);
    process.exit(0);
}

check();
