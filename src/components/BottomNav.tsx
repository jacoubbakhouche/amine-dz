
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Home,
    MessageSquare,
    History,
    User,
    Plus
} from 'lucide-react';

const NavItem = ({ icon: Icon, active, onClick, label }: { icon: any, active: boolean, onClick: () => void, label: string }) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center flex-1 py-3 gap-1 transition-colors ${active ? 'text-primary-600' : 'text-slate-400'
            }`}
    >
        <div className="relative">
            <Icon className="w-6 h-6" />
            {active && (
                <motion.div
                    layoutId="activeTab"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary-600 rounded-full"
                />
            )}
        </div>
        <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
    </button>
);

const BottomNav: React.FC<{ onHistoryClick?: () => void }> = ({ onHistoryClick }) => {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 px-2 pb-safe-area-inset-bottom flex items-center justify-around z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
            <NavItem
                icon={Home}
                label="Home"
                active={location.pathname === '/chat'}
                onClick={() => navigate('/chat')}
            />
            <NavItem
                icon={MessageSquare}
                label="Chat"
                active={location.pathname === '/chat' && !location.search.includes('new=true')}
                onClick={() => navigate('/chat')}
            />

            <div className="flex-1 flex justify-center -translate-y-4">
                <button
                    onClick={() => navigate('/chat?new=true')}
                    className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary-500/40 active:scale-95 transition-transform"
                >
                    <Plus className="w-7 h-7" />
                </button>
            </div>

            <NavItem
                icon={History}
                label="History"
                active={false}
                onClick={onHistoryClick || (() => navigate('/chat'))}
            />
            <NavItem
                icon={User}
                label="Profile"
                active={location.pathname === '/profile'}
                onClick={() => navigate('/profile')}
            />
        </nav>
    );
};

export default BottomNav;
