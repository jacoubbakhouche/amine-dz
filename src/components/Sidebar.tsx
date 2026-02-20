import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity,
    Search,
    Plus,
    Home,
    Folder,
    History,
    Settings,
    MessageSquare,
    Clock
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const SidebarItem = ({ icon: Icon, active = false, onClick }: { icon: any, active?: boolean, onClick?: () => void }) => (
    <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className={`p-4 rounded-2xl flex items-center justify-center transition-all ${active
            ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30'
            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }`}
    >
        <Icon className="w-6 h-6" />
    </motion.button>
);

const Sidebar: React.FC<{ onSelectConversation?: (id: string) => void }> = ({ onSelectConversation }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, profile } = useAuth();
    const [showHistory, setShowHistory] = useState(false);
    const [conversations, setConversations] = useState<any[]>([]);

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
    };

    return (
        <div className="hidden md:flex relative h-full">
            <aside className="w-24 border-r border-slate-100 bg-white flex flex-col items-center py-8 gap-10 h-full overflow-y-auto custom-scrollbar no-scrollbar relative z-30">
                {/* Logo Icon - Redirects to Landing Page */}
                <div
                    className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/40 cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => navigate('/')}
                    title="Page d'accueil"
                >
                    <Activity className="text-white w-7 h-7" />
                </div>

                <div className="flex flex-col gap-6 flex-1">
                    <SidebarItem icon={Plus} onClick={handleNewChat} />
                    <SidebarItem icon={Search} />
                    <SidebarItem icon={Home} active={location.pathname === '/chat'} onClick={() => navigate('/chat')} />
                    <SidebarItem icon={Folder} />
                    <SidebarItem icon={History} active={showHistory} onClick={() => setShowHistory(!showHistory)} />
                </div>

                <div className="flex flex-col gap-6 mt-auto">
                    <SidebarItem icon={Settings} onClick={() => navigate('/profile')} active={location.pathname === '/profile'} />
                    <div
                        onClick={() => navigate('/profile')}
                        className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center border-2 border-white overflow-hidden shadow-sm cursor-pointer hover:ring-2 hover:ring-primary-400 transition-all"
                    >
                        <img
                            src={profile?.avatar_url || user?.user_metadata?.avatar_url || "https://images.unsplash.com/photo-1559839734-2b71f1536783?auto=format&fit=crop&q=80&w=200"}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>
            </aside>

            {/* History Panel */}
            <AnimatePresence>
                {showHistory && (
                    <motion.div
                        initial={{ x: -100, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -100, opacity: 0 }}
                        className="w-64 border-r border-slate-100 bg-white h-full overflow-y-auto py-8 px-4 flex flex-col gap-4 shadow-sm relative z-20"
                    >
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">History</h3>
                        <div className="flex flex-col gap-2">
                            {conversations.map((conv) => (
                                <button
                                    key={conv.id}
                                    onClick={() => {
                                        onSelectConversation?.(conv.id);
                                        setShowHistory(false);
                                    }}
                                    className="flex flex-col gap-1 p-3 rounded-xl hover:bg-slate-50 transition-all text-left group"
                                >
                                    <div className="flex items-center gap-2">
                                        <MessageSquare className="w-3.5 h-3.5 text-primary-500" />
                                        <span className="text-sm font-bold text-slate-700 truncate">{conv.title}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 ml-5">
                                        <Clock className="w-3 h-3 text-slate-300" />
                                        <span className="text-[10px] text-slate-400">
                                            {new Date(conv.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Sidebar;
