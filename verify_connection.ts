
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!)

async function verify() {
    console.log("Verifying connection to:", supabaseUrl)
    const { data, error } = await supabase
        .from('clinical_data')
        .select('*')
        .limit(3)

    if (error) {
        console.error("Error fetching data:", error)
        process.exit(1)
    }

    console.log("SUCCESS: Connection restored.")
    console.log("First 3 records from clinical_data:")
    console.log(JSON.stringify(data, null, 2))
}

verify()
