import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Plus,
    Home,
    Folder,
    History,
    Settings,
    MessageSquare,
    Clock,
    Menu,
    X
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

const SidebarItem = ({ icon: Icon, active = false, onClick, title }: { icon: any, active?: boolean, onClick?: () => void, title?: string }) => (
    <motion.button
        whileHover={{ scale: 1.05, x: 4, backgroundColor: 'rgba(0, 0, 0, 0.05)' }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        title={title}
        className={`p-3.5 rounded-2xl flex items-center justify-center transition-all border ${active
            ? 'bg-primary-500/80 text-white shadow-lg shadow-primary-500/20 border-white/20'
            : 'text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/10 border-transparent'
            }`}
    >
        <Icon className="w-5 h-5" />
    </motion.button>
);

const Sidebar: React.FC<{ onSelectConversation?: (id: string) => void }> = ({ onSelectConversation }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, profile } = useAuth();
    const [showHistory, setShowHistory] = useState(false);
    const [conversations, setConversations] = useState<any[]>([]);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        if (showHistory) {
            fetchConversations();
        }
    }, [showHistory]);

    const fetchConversations = async () => {
        if (!user) return;

        const { data } = await supabase
            .from('conversations')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (data) setConversations(data);
    };

    const handleNewChat = () => {
        navigate('/chat?new=true');
        setShowHistory(false);
        setIsMenuOpen(false);
    };

    const navItems = [
        { icon: Plus, onClick: handleNewChat, title: "Nouveau Chat" },
        { icon: Search, title: "Recherche" },
        { icon: Home, active: location.pathname === '/chat', onClick: () => { navigate('/chat'); setIsMenuOpen(false); }, title: "Accueil" },
        { icon: Folder, title: "Dossiers" },
        { icon: History, active: showHistory, onClick: () => { setShowHistory(!showHistory); setIsMenuOpen(false); }, title: "Historique" },
    ];

    const bottomItems = [
        { icon: Settings, onClick: () => { navigate('/profile'); setIsMenuOpen(false); }, active: location.pathname === '/profile', title: "Paramètres" },
    ];

    return (
        <div className="hidden md:flex relative h-full">
            <aside className="w-20 glass border-r border-white/5 flex flex-col items-center py-6 h-full overflow-y-auto no-scrollbar relative z-30 transition-all">

                {/* Menu Toggle Button */}
                <motion.button
                    whileHover={{ scale: 1.05, backgroundColor: 'rgba(0, 0, 0, 0.05)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all mb-8 border backdrop-blur-md ${isMenuOpen
                        ? 'bg-primary-500/20 text-primary-400 border-primary-500/30'
                        : 'bg-slate-900/5 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10 shadow-sm'
                        }`}
                >
                    {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </motion.button>

                {/* Animated Menu Content */}
                <div className="flex-1 flex flex-col items-center w-full">
                    <AnimatePresence>
                        {isMenuOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: -20, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: 'auto' }}
                                exit={{ opacity: 0, y: -20, height: 0 }}
                                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                                className="flex flex-col gap-4 items-center w-full overflow-hidden"
                            >
                                {navItems.map((item, index) => (
                                    <SidebarItem key={index} {...item} />
                                ))}

                                <div className="w-8 h-[1px] bg-slate-200 dark:bg-white/10 my-2" />

                                <ThemeToggle />
                                {bottomItems.map((item, index) => (
                                    <SidebarItem key={index} {...item} />
                                ))}

                                <div
                                    onClick={() => { navigate('/profile'); setIsMenuOpen(false); }}
                                    className="w-10 h-10 rounded-full bg-slate-900/5 dark:bg-primary-900/40 flex items-center justify-center border border-slate-200 dark:border-white/20 overflow-hidden shadow-sm cursor-pointer hover:ring-2 hover:ring-primary-500/50 transition-all mt-2"
                                >
                                    <img
                                        src={profile?.avatar_url || user?.user_metadata?.avatar_url || "https://images.unsplash.com/photo-1559839734-2b71f1536783?auto=format&fit=crop&q=80&w=200"}
                                        alt="Avatar"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Always visible logo at bottom */}
                <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="mt-auto w-10 h-10 bg-slate-900/10 dark:bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center shadow-lg cursor-pointer overflow-hidden border border-slate-200 dark:border-white/30 hover:border-primary-400 transition-all"
                    onClick={() => navigate('/')}
                    title="Page d'accueil"
                >
                    <img src="/og-image.png" alt="Logo" className="w-full h-full object-cover" />
                </motion.div>
            </aside>

            {/* History Panel */}
            <AnimatePresence>
                {showHistory && (
                    <motion.div
                        initial={{ x: -100, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -100, opacity: 0 }}
                        className="w-72 glass-card border-r border-slate-200 dark:border-white/5 h-full overflow-y-auto py-8 px-6 flex flex-col gap-6 shadow-2xl relative z-20 backdrop-blur-3xl"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest">History</h3>
                            <button onClick={() => setShowHistory(false)} className="p-1.5 rounded-lg bg-slate-900/5 dark:bg-white/10 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex flex-col gap-3">
                            {conversations.length > 0 ? conversations.map((conv) => (
                                <button
                                    key={conv.id}
                                    onClick={() => {
                                        onSelectConversation?.(conv.id);
                                        setShowHistory(false);
                                    }}
                                    className="flex flex-col gap-2 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all text-left group backdrop-blur-sm"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-primary-500/10 text-primary-400 group-hover:bg-primary-500/20 transition-colors">
                                            <MessageSquare className="w-4 h-4" />
                                        </div>
                                        <span className="text-sm font-semibold text-slate-200 truncate group-hover:text-white transition-colors">{conv.title}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 ml-9">
                                        <Clock className="w-3 h-3 text-slate-500" />
                                        <span className="text-[10px] text-slate-500 font-medium">
                                            {new Date(conv.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </button>
                            )) : (
                                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                    <MessageSquare className="w-8 h-8 text-slate-600 mb-3 opacity-20" />
                                    <p className="text-xs text-slate-500 font-medium leading-relaxed">Aucune conversation trouvée.</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Sidebar;
