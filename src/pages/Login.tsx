import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { Mail, Lock, Chrome, Loader2, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setError(error.message);
        else navigate('/dashboard');
        setLoading(false);
    };

    const handleGoogleLogin = async () => {
        const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
        if (error) setError(error.message);
    };

    return (
        <div className="min-h-screen bg-mesh flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Orbs */}
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary-600/20 rounded-full blur-[150px] animate-pulse z-0" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[150px] animate-pulse z-0" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full glass-card p-10 shadow-2xl relative z-10"
            >
                <div className="text-center mb-10">
                    <h2 className="text-4xl font-bold font-heading text-white mb-3">Welcome Back</h2>
                    <p className="text-white/50 font-medium">Log in to your medical AI assistant</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-6 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleEmailLogin} className="space-y-4">
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                        <input
                            type="email"
                            placeholder="Email Address"
                            className="glass-input w-full pl-12 text-white placeholder:text-white/20"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                        <input
                            type="password"
                            placeholder="Password"
                            className="glass-input w-full pl-12 text-white placeholder:text-white/20"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-white/10 text-white border border-white/20 rounded-2xl py-5 font-bold shadow-2xl hover:bg-white/20 transition-all flex items-center justify-center gap-2 backdrop-blur-xl"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Sign In <ArrowRight className="w-5 h-5" /></>}
                    </button>
                </form>

                <div className="relative my-10 text-center">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-100"></div>
                    </div>
                    <span className="relative bg-white px-4 text-slate-400 text-sm">Or continue with</span>
                </div>

                <button
                    onClick={handleGoogleLogin}
                    className="w-full bg-white/5 border border-white/10 text-white rounded-2xl py-4 font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2 mb-8"
                >
                    <Chrome className="w-5 h-5 text-white/50" /> Google
                </button>

                <p className="text-center text-white/40 text-sm font-medium">
                    Don't have an account? <Link to="/register" className="text-white font-bold hover:text-primary-400">Register</Link>
                </p>
            </motion.div>
        </div>
    );
};

export default Login;
