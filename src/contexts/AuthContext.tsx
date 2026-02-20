import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    profile: {
        full_name: string | null;
        avatar_url: string | null;
        specialty: string | null;
        date_of_birth?: string | null;
    } | null;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<AuthContextType['profile']>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (userId: string) => {
        const { data } = await supabase
            .from('profiles')
            .select('full_name, avatar_url, specialty, date_of_birth')
            .eq('id', userId)
            .single();

        if (data) {
            setProfile(data);
        }
    };

    const refreshProfile = async () => {
        if (user) {
            await fetchProfile(user.id);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setProfile(null);
    };

    useEffect(() => {
        // Use onAuthStateChange as the SINGLE source of truth
        // It fires INITIAL_SESSION on mount, so no need for a separate getSession()
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, newSession) => {
                setSession(newSession);
                setUser(newSession?.user ?? null);

                if (newSession?.user) {
                    try {
                        await fetchProfile(newSession.user.id);
                    } catch (err) {
                        console.error('Error fetching profile:', err);
                    }
                } else {
                    setProfile(null);
                }
                setLoading(false);
            }
        );

        // Safety net: if auth never resolves, stop loading after 5s
        const timeout = setTimeout(() => setLoading(false), 5000);

        return () => {
            subscription.unsubscribe();
            clearTimeout(timeout);
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, session, loading, profile, signOut, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
