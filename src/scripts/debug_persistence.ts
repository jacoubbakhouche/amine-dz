import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function debugSchema() {
    console.log("Checking tables...")
    const { data: _tables, error: tErr } = await supabase.from('chat_messages').select('*').limit(1)
    if (tErr) console.error("Table check error:", tErr)
    else console.log("chat_messages table found.")

    const { data: _columns, error: cErr } = await supabase.rpc('get_table_columns', { table_name: 'chat_messages' })
    if (cErr) console.log("RPC get_table_columns not found, checking with select * results if any.")

    // Check if we can insert manually
    console.log("Attempting manual insert into conversations...")
    const { data: dummyConv, error: dcErr } = await supabase.from('conversations').insert({ user_id: '7d22ca88-4b17-416a-b508-10181820bd34', title: 'Debug Conv' }).select().single()
    if (dcErr) console.error("Manual Conv Insert Error:", dcErr)
    else {
        console.log("Manual Conv Insert Success:", dummyConv.id)
        console.log("Attempting manual insert into chat_messages...")
        const { error: dmErr } = await supabase.from('chat_messages').insert({
            conversation_id: dummyConv.id,
            role: 'user',
            content: 'Hello Debug'
        })
        if (dmErr) console.error("Manual Msg Insert Error:", dmErr)
        else console.log("Manual Msg Insert Success!")
    }
}

debugSchema()
