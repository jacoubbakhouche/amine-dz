
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    LogOut,
    Stethoscope,
    BookOpen,
    History,
    Chrome,
    ArrowRight
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { supabase } from '../lib/supabase';

const ActionCard = ({ icon: Icon, title, desc, color, to }: { icon: any, title: string, desc: string, color: string, to?: string }) => (
    <Link to={to || '#'} className="block w-full">
        <motion.button
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className="flex flex-col items-start p-8 rounded-[32px] bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all text-left group w-full h-[280px]"
        >
            <div className={`p-4 rounded-2xl bg-${color}-50 mb-6 group-hover:scale-110 transition-transform`}>
                <Icon className={`w-8 h-8 text-${color}-500`} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
            <p className="text-slate-500 leading-relaxed text-sm">{desc}</p>
        </motion.button>
    </Link>
);

const Dashboard: React.FC = () => {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (profile) {
                    setUser({
                        ...session.user,
                        user_metadata: {
                            ...session.user.user_metadata,
                            full_name: profile.full_name,
                            avatar_url: profile.avatar_url
                        }
                    });
                } else {
                    setUser(session.user);
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        };

        checkUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    const handleGoogleLogin = async () => {
        await supabase.auth.signInWithOAuth({ provider: 'google' });
    };

    return (
        <div className="flex h-screen bg-[#F8F9FC] text-slate-900 font-sans overflow-hidden">
            <Sidebar />

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-y-auto custom-scrollbar no-scrollbar">
                {/* Top Header */}
                <header className="px-12 py-8 flex items-center justify-between">
                    <div className="flex items-center gap-12 font-medium text-slate-400">
                        <span className="text-slate-900 font-bold border-b-2 border-slate-900 pb-1">Dashboard</span>
                        <span className="hover:text-slate-600 cursor-pointer transition-colors">Schedule</span>
                        <span className="hover:text-slate-600 cursor-pointer transition-colors">Patients</span>
                    </div>
                </header>

                {/* Content Area */}
                <div className="px-12 pb-12 flex-1">
                    <div className="grid lg:grid-cols-[1fr,400px] gap-12 items-start">
                        {/* Left Column */}
                        <div className="space-y-12">
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.6 }}
                            >
                                <h1 className="text-5xl lg:text-6xl font-bold font-heading leading-tight tracking-tight text-slate-900">
                                    Hi there, <span className="text-primary-600">Doctor</span><br />
                                    What would you like to check today?
                                </h1>
                                <p className="mt-6 text-slate-500 text-lg max-w-xl leading-relaxed">
                                    Use our AI assistant to verify clinical guidelines, check dosages, or manage your medical practice with precision.
                                </p>
                            </motion.div>

                            {/* User Connection Card */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm transition-all"
                            >
                                {loading ? (
                                    <div className="flex items-center justify-center p-4">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                                    </div>
                                ) : user ? (
                                    <div className="flex items-center justify-between">
                                        <div
                                            onClick={() => navigate('/profile')}
                                            className="flex items-center gap-4 cursor-pointer group/user"
                                        >
                                            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 overflow-hidden ring-4 ring-primary-50 group-hover/user:ring-primary-100 transition-all">
                                                <img
                                                    src={user.user_metadata?.avatar_url || "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=200"}
                                                    alt="Avatar"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 group-hover/user:text-primary-600 transition-colors">Welcome, {user.user_metadata?.full_name || user.email?.split('@')[0]}</h4>
                                                <p className="text-xs text-slate-400">{user.email}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleLogout}
                                            className="flex items-center gap-2 text-rose-500 font-bold text-sm hover:text-rose-600 transition-colors p-2 hover:bg-rose-50 rounded-xl"
                                        >
                                            <LogOut className="w-4 h-4" /> Logout
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="flex flex-col gap-2">
                                            <h4 className="font-bold text-slate-900 text-xl tracking-tight">Access Medical AI Assistant</h4>
                                            <p className="text-sm text-slate-500">Sign in to save your clinical history and personalized guidelines.</p>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-4">
                                            <button
                                                onClick={handleGoogleLogin}
                                                className="flex-1 flex items-center justify-center gap-2 bg-white border border-slate-200 py-3 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
                                            >
                                                <Chrome className="w-5 h-5" /> Google
                                            </button>
                                            <Link
                                                to="/login"
                                                className="flex-1 flex items-center justify-center gap-2 bg-primary-600 text-white py-3 rounded-2xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20"
                                            >
                                                Sign In <ArrowRight className="w-5 h-5" />
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </motion.div>

                            {/* Action Cards Grid */}
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <ActionCard
                                    icon={Stethoscope}
                                    title="Start AI Consultation"
                                    desc="Analyze symptoms with guidelines"
                                    color="primary"
                                    to="/chat?new=true"
                                />
                                <ActionCard
                                    icon={History}
                                    title="Patient History"
                                    desc="View previous consultations"
                                    color="orange"
                                />
                                <ActionCard
                                    icon={BookOpen}
                                    title="Clinical Guidelines"
                                    desc="Browse R1-R14 medical rules"
                                    color="blue"
                                />
                            </div>
                        </div>

                        {/* Right Column - Large Decoration */}
                        <div className="hidden lg:flex flex-col items-center justify-center pt-20">
                            <motion.div
                                animate={{
                                    scale: [1, 1.05, 1],
                                    rotate: [0, 5, 0]
                                }}
                                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                                className="relative"
                            >
                                <div className="w-[450px] h-[450px] bg-primary-100 rounded-full absolute -top-10 -right-10 blur-3xl opacity-50" />
                                <div className="w-[400px] h-[400px] bg-primary-200 rounded-full relative z-10 overflow-hidden shadow-2xl border-[12px] border-white/50 backdrop-blur-sm">
                                    <div className="absolute inset-0 bg-gradient-to-tr from-primary-600/20 to-transparent z-20" />
                                    <img
                                        src="https://images.unsplash.com/photo-1559839734-2b71f1536783?auto=format&fit=crop&q=80&w=800"
                                        alt="Doctor"
                                        className="w-full h-full object-cover grayscale-[20%] hover:grayscale-0 transition-all duration-700"
                                    />
                                </div>

                                {/* Decorative Dots/Elements */}
                                <div className="absolute -top-4 -left-4 w-24 h-24 border-t-4 border-l-4 border-primary-400/30 rounded-tl-3xl z-20" />
                                <div className="absolute -bottom-4 -right-4 w-24 h-24 border-b-4 border-r-4 border-primary-400/30 rounded-br-3xl z-20" />
                            </motion.div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
