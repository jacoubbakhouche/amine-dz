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

// Function to generate a random high-quality fallback doctor avatar if needed
const getFallbackAvatar = () => "https://images.unsplash.com/photo-1559839734-2b71f1536783?auto=format&fit=crop&q=80&w=200";

const EditProfile: React.FC = () => {
    const navigate = useNavigate();
    const { user, profile, refreshProfile } = useAuth();
    const [fullName, setFullName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (user) {
            setFullName(profile?.full_name || user.user_metadata?.full_name || '');
            setAvatarUrl(profile?.avatar_url || user.user_metadata?.avatar_url || '');
            setDateOfBirth(profile?.date_of_birth || '');
            setLoading(false);
        }
    }, [user, profile]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            setMessage(null);

            const file = e.target.files?.[0];
            if (!file) return;

            // Validate file type
            if (!file.type.startsWith('image/')) {
                throw new Error('Please select an image file (PNG, JPG, etc.)');
            }

            // Validate file size (max 2MB)
            if (file.size > 2 * 1024 * 1024) {
                throw new Error('File size must be less than 2MB');
            }

            const fileExt = file.name.split('.').pop();
            const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            setAvatarUrl(publicUrl);
            setMessage({ type: 'success', text: 'Image uploaded! Remember to click Save Changes.' });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setUploading(false);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setSaving(true);
        setMessage(null);

        // Update Profiles Table Only (We don't need to duplicate in Auth Metadata if not needed)
        // If we want to keep Auth Metadata in sync, we should be careful not to overwrite with empty
        const metadataUpdate: any = {};
        if (fullName) metadataUpdate.full_name = fullName;
        if (avatarUrl) metadataUpdate.avatar_url = avatarUrl;

        // Optional sync (commented out to rely solely on profiles table for display)
        /*
        const { error: authError } = await supabase.auth.updateUser({
            data: metadataUpdate
        });
        if (authError) console.error("Auth metadata sync error:", authError);
        */

        const { error: profileError } = await supabase
            .from('profiles')
            .update({
                full_name: fullName,
                avatar_url: avatarUrl, // Make sure this is saving the current state
                date_of_birth: dateOfBirth || null // Save DOB or null if empty
            })
            .eq('id', user.id);

        if (profileError) {
            setMessage({ type: 'error', text: profileError.message });
            setSaving(false);
        } else {
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            // Refresh profile in AuthContext so all components update
            await refreshProfile();
            // Force reload to ensure everywhere (sidebar, bottom nav) gets the fresh image
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
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
                                        <div
                                            className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-primary-50 ring-4 ring-primary-50/50 cursor-pointer relative"
                                            onClick={triggerFileInput}
                                        >
                                            <img
                                                src={avatarUrl || getFallbackAvatar()}
                                                alt="Avatar"
                                                className={`w-full h-full object-cover transition-opacity ${uploading ? 'opacity-40' : 'opacity-100'}`}
                                            />
                                            {uploading && (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={triggerFileInput}
                                            className="absolute bottom-1 right-1 bg-white p-2 rounded-full shadow-lg border border-slate-100 text-primary-600 hover:text-primary-700 hover:scale-110 transition-all"
                                        >
                                            <Camera className="w-4 h-4" />
                                        </button>

                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileUpload}
                                            className="hidden"
                                            accept="image/*"
                                        />
                                    </div>
                                    <h2 className="mt-4 text-xl md:text-2xl font-bold text-slate-900">Manage Account</h2>
                                    <p className="text-slate-400 text-xs md:text-sm">Click the photo to change your profile picture</p>

                                    {avatarUrl && !avatarUrl.includes('unsplash.com') && (
                                        <button
                                            type="button"
                                            onClick={() => setAvatarUrl('')}
                                            className="mt-2 text-[10px] font-bold text-rose-500 hover:text-rose-600 uppercase tracking-wider"
                                        >
                                            Remove Photo
                                        </button>
                                    )}
                                </div>

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
                                        <label className="text-xs md:text-sm font-bold text-slate-700 ml-1">Date of Birth</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar text-slate-300 group-focus-within:text-primary-500 transition-colors"><path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" /></svg>
                                            </div>
                                            <input
                                                type="date"
                                                value={dateOfBirth}
                                                onChange={(e) => setDateOfBirth(e.target.value)}
                                                className="block w-full pl-11 bg-slate-50 border-none rounded-xl md:rounded-2xl py-3 md:py-4 focus:ring-2 focus:ring-primary-500 transition-all font-medium text-sm md:text-base text-slate-700"
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 flex items-center gap-4">
                                        <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100">
                                            <AlertCircle className="w-5 h-5 text-primary-500" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-900">Professional Identity</h4>
                                            <p className="text-xs text-slate-400">Your profile information is visible to colleagues during consultations.</p>
                                        </div>
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
