import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User as UserIcon,
    Camera,
    Save,
    ArrowLeft,
    CheckCircle2,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import BottomNav from '../components/BottomNav';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const EditProfile: React.FC = () => {
    const navigate = useNavigate();
    const { user, profile, refreshProfile } = useAuth();
    const [fullName, setFullName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (user) {
            setFullName(profile?.full_name || user.user_metadata?.full_name || '');
            setAvatarUrl(profile?.avatar_url || user.user_metadata?.avatar_url || '');
            setLoading(false);
        }
    }, [user, profile]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setSaving(true);
        setMessage(null);

        // 1. Update Auth Metadata
        const { error: authError } = await supabase.auth.updateUser({
            data: {
                full_name: fullName,
                avatar_url: avatarUrl
            }
        });

        if (authError) {
            setMessage({ type: 'error', text: authError.message });
            setSaving(false);
            return;
        }

        // 2. Update Profiles Table
        const { error: profileError } = await supabase
            .from('profiles')
            .update({
                full_name: fullName,
                avatar_url: avatarUrl
            })
            .eq('id', user.id);

        if (profileError) {
            setMessage({ type: 'error', text: profileError.message });
        } else {
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            // Refresh profile in AuthContext so all components update
            await refreshProfile();
        }
        setSaving(false);
    };

    return (
        <div className="flex h-screen bg-[#F8F9FC] text-slate-900 font-sans overflow-hidden">
            <Sidebar />

            <main className="flex-1 overflow-y-auto no-scrollbar">
                <header className="px-12 py-8 flex items-center justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors font-medium"
                    >
                        <ArrowLeft className="w-5 h-5" /> Back
                    </button>
                    <h1 className="text-xl font-bold text-slate-900">Edit Profile</h1>
                    <div className="w-20" /> {/* Spacer */}
                </header>

                <div className="px-6 md:px-12 max-w-2xl mx-auto pb-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-[24px] md:rounded-[32px] border border-slate-100 shadow-xl p-6 md:p-10"
                    >
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <Loader2 className="w-10 h-10 text-primary-600 animate-spin" />
                                <p className="text-slate-500 font-medium text-sm">Loading profile...</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSave} className="space-y-8 md:space-y-10">
                                {/* Profile Avatar Header */}
                                <div className="flex flex-col items-center text-center">
                                    <div className="relative group">
                                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-primary-50 ring-4 ring-primary-50/50">
                                            <img
                                                src={avatarUrl || "https://images.unsplash.com/photo-1559839734-2b71f1536783?auto=format&fit=crop&q=80&w=200"}
                                                alt="Avatar"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 rounded-full transition-opacity cursor-pointer">
                                            <Camera className="text-white w-8 h-8" />
                                        </div>
                                    </div>
                                    <h2 className="mt-4 text-xl md:text-2xl font-bold text-slate-900">Manage Account</h2>
                                    <p className="text-slate-400 text-xs md:text-sm">Update your public profile information</p>
                                </div>

                                {/* Form Fields */}
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs md:text-sm font-bold text-slate-700 ml-1">Full Name</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <UserIcon className="h-5 w-5 text-slate-300 group-focus-within:text-primary-500 transition-colors" />
                                            </div>
                                            <input
                                                type="text"
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                className="block w-full pl-11 bg-slate-50 border-none rounded-xl md:rounded-2xl py-3 md:py-4 focus:ring-2 focus:ring-primary-500 transition-all font-medium text-sm md:text-base text-slate-700"
                                                placeholder="Dr. John Doe"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs md:text-sm font-bold text-slate-700 ml-1">Avatar URL</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Camera className="h-5 w-5 text-slate-300 group-focus-within:text-primary-500 transition-colors" />
                                            </div>
                                            <input
                                                type="url"
                                                value={avatarUrl}
                                                onChange={(e) => setAvatarUrl(e.target.value)}
                                                className="block w-full pl-11 bg-slate-50 border-none rounded-xl md:rounded-2xl py-3 md:py-4 focus:ring-2 focus:ring-primary-500 transition-all font-medium text-sm md:text-base text-slate-700"
                                                placeholder="https://images.unsplash.com/..."
                                            />
                                        </div>
                                        <p className="text-[10px] text-slate-400 ml-1 italic">Provide a link to your professional portrait</p>
                                    </div>
                                </div>

                                {/* Status Messages */}
                                <AnimatePresence>
                                    {message && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className={`flex items-center gap-3 p-4 rounded-xl ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                                }`}
                                        >
                                            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                                            <span className="font-bold text-sm">{message.text}</span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Actions */}
                                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => navigate(-1)}
                                        className="w-full sm:flex-1 bg-slate-100 text-slate-600 py-3 md:py-4 rounded-xl md:rounded-2xl font-bold hover:bg-slate-200 transition-all text-sm md:text-base"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="w-full sm:flex-2 bg-primary-600 text-white py-3 md:py-4 px-8 rounded-xl md:rounded-2xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20 flex items-center justify-center gap-2 disabled:opacity-50 text-sm md:text-base"
                                    >
                                        {saving ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Save className="w-5 h-5" />
                                        )}
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        )}
                    </motion.div>
                </div>
                <BottomNav />
            </main>
        </div>
    );
};

export default EditProfile;
