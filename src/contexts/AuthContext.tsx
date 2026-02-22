import React, { createContext, useContext, useState, useEffect } from 'react';
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
    const [user] = useState<User | null>({
        id: '00000000-0000-0000-0000-000000000000',
        email: 'guest@pharmasssit.com',
        aud: 'authenticated',
        role: 'authenticated',
        app_metadata: {},
        user_metadata: { full_name: 'Guest User' },
        created_at: new Date().toISOString()
    } as User);
    const [session] = useState<Session | null>({
        access_token: 'mock-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock-refresh',
        user: { id: '00000000-0000-0000-0000-000000000000' } as User
    } as Session);
    const [profile] = useState<AuthContextType['profile']>({
        full_name: 'Guest User',
        avatar_url: null,
        specialty: 'Medical Professional',
        date_of_birth: null
    });
    const [loading] = useState(false);



    const refreshProfile = async () => {
        // Disabled for auth bypass
    };

    const signOut = async () => {
        // For development, we don't actually sign out
        console.log('Sign out bypassed');
    };

    useEffect(() => {
        // Disable real auth listeners for bypass mode
        setLoading(false);
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
