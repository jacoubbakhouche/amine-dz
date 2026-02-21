// Deployment sync: Triggering build to pick up new Vercel env variables
import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wtpodigifgbbvwqrmobo.supabase.co';
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase environment variables are missing. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables.');
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder_key',
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            // Bypass Navigator LockManager to prevent 10s timeout errors
            // This avoids: "Acquiring an exclusive Navigator LockManager lock timed out"
            lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
                return await fn();
            },
        }
    }
);
