import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkPersistence() {
    console.log("Checking conversations...")
    const { data: convs, error: cErr } = await supabase.from('conversations').select('*').order('created_at', { ascending: false }).limit(5)
    if (cErr) console.error("Conv Error:", cErr)
    else console.log("Recent Conversations:", convs)

    if (convs && convs.length > 0) {
        const lastId = convs[0].id
        console.log(`Checking messages for conversation ${lastId}...`)
        const { data: msgs, error: mErr } = await supabase.from('chat_messages').select('*').eq('conversation_id', lastId).order('created_at', { ascending: true })
        if (mErr) console.error("Msg Error:", mErr)
        else console.log("Messages found:", msgs.length, msgs)
    }
}

checkPersistence()
