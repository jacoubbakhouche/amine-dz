import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import {
    Send,
    Plus,
    Image as ImageIcon,
    RefreshCw,
    Globe,
    ChevronDown,
    Loader2,
    Menu,
    Home,
    History,
    User
} from 'lucide-react';
import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabase';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';


const PromptCard = ({ title, desc, icon: Icon, onClick }: { title: string, desc: string, icon: any, onClick: () => void }) => (
    <motion.button
        whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.3, ease: "easeOut" } }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className="glass-card p-5 rounded-2xl border-white/10 dark:border-white/5 hover:border-primary-500/30 transition-all text-left group min-w-[200px] md:min-w-0 md:h-full flex-shrink-0 snap-start shadow-lg backdrop-blur-3xl"
    >
        <h4 className="font-bold text-slate-900 dark:text-white mb-1.5 text-sm leading-tight group-hover:text-primary-500 transition-colors">{title}</h4>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-4 font-medium uppercase tracking-widest">{desc}</p>
        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 dark:text-white/20 group-hover:bg-primary-500/10 group-hover:text-primary-500 transition-all">
            <Icon className="w-4 h-4 group-hover:rotate-12 transition-transform" />
        </div>
    </motion.button>
);

const TypingText = ({ text, onComplete }: { text: string, onComplete?: () => void }) => {
    const [displayed, setDisplayed] = useState('');
    const indexRef = useRef(0);

    useEffect(() => {
        // Reset on new text
        indexRef.current = 0;
        setDisplayed('');

        const CHUNK = 4;   // chars per tick — increase for faster reveal
        const TICK = 16;  // ms per tick  — ~60fps

        const id = setInterval(() => {
            indexRef.current += CHUNK;
            if (indexRef.current >= text.length) {
                setDisplayed(text);
                clearInterval(id);
                onComplete?.();
            } else {
                setDisplayed(text.slice(0, indexRef.current));
            }
        }, TICK);

        return () => clearInterval(id);
    }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <p className="whitespace-pre-wrap text-xs md:text-sm leading-relaxed">
            {displayed}
            {displayed.length < text.length && (
                <span className="inline-block w-0.5 h-3.5 bg-primary-500 ml-0.5 animate-pulse rounded-full" />
            )}
        </p>
    );
};

const TypewriterHeader = ({ text, delay = 0, className = "", onComplete }: { text: string, delay?: number, className?: string, onComplete?: () => void }) => {
    const characters = text.split("");
    const [isVisible, setIsVisible] = useState(false);
    const [key, setKey] = useState(0);

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), delay);
        return () => clearTimeout(timer);
    }, [delay, key]);

    return (
        <motion.span
            key={key}
            initial="hidden"
            animate={isVisible ? "visible" : "hidden"}
            variants={{
                visible: {
                    transition: {
                        staggerChildren: 0.05,
                        onComplete: () => {
                            if (onComplete) onComplete();
                            // Wait then loop
                            setTimeout(() => {
                                setIsVisible(false);
                                setTimeout(() => setKey(prev => prev + 1), 500);
                            }, 4000);
                        }
                    }
                }
            }}
            className={`${className} font-heading tracking-tight`}
        >
            {characters.map((char, i) => (
                <motion.span
                    key={i}
                    variants={{
                        hidden: { opacity: 0, x: -5, filter: "blur(4px)" },
                        visible: { opacity: 1, x: 0, filter: "blur(0px)" }
                    }}
                    transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                >
                    {char}
                </motion.span>
            ))}
        </motion.span>
    );
};

const Chat: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [revealStage, setRevealStage] = useState(0); // 0: centered typing, 1: shift up + mascot, 2: cards
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Reset state when navigating to ?new=true
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('new') === 'true') {
            setMessages([]);
            setCurrentConversationId(null);
            setInput('');
            // Clean up the URL so refresh doesn't re-trigger this
            navigate('/chat', { replace: true });
        }
    }, [location, navigate]);

    // Load conversations/messages when ID changes or user is set
    useEffect(() => {
        const fetchMessages = async () => {
            if (!user || !currentConversationId) return;

            const { data: msgs } = await supabase
                .from('chat_messages')
                .select('role, content')
                .eq('conversation_id', currentConversationId)
                .order('created_at', { ascending: true });

            if (msgs) {
                setMessages(msgs as any);
            }
        };

        fetchMessages();
    }, [user, currentConversationId]);

    // Initial load: get most recent conversation if none active
    useEffect(() => {
        const initChat = async () => {
            if (!user || currentConversationId) return;

            const { data: convs } = await supabase
                .from('conversations')
                .select('id')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1);

            if (convs && convs.length > 0) {
                setCurrentConversationId(convs[0].id);
            }
        };

        initChat();
    }, [user]);

    // Auto-scroll on new messages with improved behavior
    useEffect(() => {
        if (chatEndRef.current) {
            // Scroll to bottom with smooth behavior
            setTimeout(() => {
                if (chatEndRef.current) {
                    chatEndRef.current.scrollTop = chatEndRef.current.scrollHeight;
                }
            }, 0);
        }
    }, [messages, loading]);

    // ──────────────────────────────────────────────
    // Send message: ALL data operations go through the Edge Function
    // No direct DB inserts from the frontend
    // ──────────────────────────────────────────────
    const handleSendMessage = async (text: string = input) => {
        if (!text.trim() || loading) return;

        try {
            await sendToEdgeFunction(text);
        } catch (err: any) {
            console.error("Critical handleSendMessage error:", err);
            setLoading(false);
            setStatusText('');
        }
    };

    const [statusText, setStatusText] = useState('');

    const sendToEdgeFunction = async (text: string) => {
        if (!text.trim()) return;

        // 1. Optimistic Update (Instant UI)
        const userMsg = { role: 'user' as const, content: text };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);
        setStatusText("🔍 جاري تحليل السؤال...");

        try {
            // 2. Use NEW PRO RAG Function (Server-side embedding + hybrid search)
            setStatusText("📊 جاري معالجة البيانات من قاعدة البيانات...");

            const response = await fetch(`${supabaseUrl}/functions/v1/pro-rag-consultation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'apikey': supabaseAnonKey,
                    'Authorization': `Bearer ${supabaseAnonKey}`
                },
                body: JSON.stringify({
                    question: text,
                    // Server handles embedding computation
                    history: messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
                    conversationId: currentConversationId
                })
            });

            if (!response.ok) {
                throw new Error(`Connection error: ${response.status} ${response.statusText}`);
            }

            // Safe parse: read as text first to catch HTML error pages
            const responseText = await response.text();
            let data;
            try {
                data = JSON.parse(responseText);
            } catch {
                console.error("[Chat] Non-JSON response received:", responseText.substring(0, 300));
                throw new Error("Server returned an invalid response. Please check Edge Function deployment.");
            }

            if (!data?.success) throw new Error(data?.error || "Unknown error");
            if (!data?.content) throw new Error("No content in response");

            // 3. Success
            setStatusText("✅ جاري عرض النتيجة...");
            const aiResponse = data.content;

            if (data?.conversationId && !currentConversationId) {
                setCurrentConversationId(data.conversationId);
            }

            console.log(`[Chat] Retrieved ${data.retrievedDocuments} documents for this query`);

            setMessages(prev => [...prev, { role: 'assistant', content: aiResponse, isNew: true }]);
        } catch (err: any) {
            console.error("[Chat Error]:", err);
            let errorMsg = "عذراً، حدث خطأ في النظام. يرجى المحاولة لاحقاً.";

            if (err.message?.includes('Unexpected token')) {
                errorMsg = "⚠️ خطأ في قاعدة البيانات: لم نتمكن من العثور على الدالة المطلوبة. تأكد من تشغيل ملف SQL المرفق.";
            } else if (err.message) {
                errorMsg = `⚠️ ${err.message}`;
            }

            setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
        } finally {
            setLoading(false);
            setStatusText('');
        }
    };

    // Show loading state while auth is being restored
    if (authLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#F8F9FC]">
                <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-mesh text-slate-900 dark:text-slate-100 font-sans overflow-hidden transition-colors relative">
            {/* Background Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-primary-600/10 dark:bg-primary-600/20 rounded-full blur-[120px] animate-pulse z-0" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/10 dark:bg-purple-600/20 rounded-full blur-[150px] animate-pulse z-0" />

            <Sidebar onSelectConversation={setCurrentConversationId} />

            <main className="flex-1 flex flex-col relative pb-0 min-w-0 w-full overflow-x-hidden z-10 transition-all">
                {/* Mobile Top Header (Floating Style) */}
                <div className="md:hidden flex items-center justify-between px-6 py-5 z-50 sticky top-0 bg-transparent">
                    <div
                        className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => navigate('/')}
                    >
                        <div className="w-9 h-9 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/20">
                            <img src="/og-image.png" alt="Logo" className="w-full h-full object-cover" />
                        </div>
                        <span className="font-heading font-bold text-white tracking-tight text-lg">Pharmasssit</span>
                    </div>
                    <div className="relative">
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="p-2.5 rounded-xl bg-white/5 text-white/70 hover:bg-white/10 transition-all border border-white/10 shadow-lg"
                        >
                            <Menu className="w-5 h-5" />
                        </button>

                        <AnimatePresence>
                            {mobileMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                    transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                                    className="absolute right-0 mt-2 w-56 glass-card backdrop-blur-3xl shadow-2xl border border-white/20 overflow-hidden z-50 py-3"
                                >
                                    {[
                                        { icon: Home, label: 'Home', path: '/chat', onClick: () => navigate('/chat') },
                                        { icon: Plus, label: 'New Chat', path: '/chat?new=true', onClick: () => navigate('/chat?new=true') },
                                        { icon: History, label: 'History', path: '/chat', onClick: () => { setMessages([]); setMobileMenuOpen(false); } },
                                        { icon: User, label: 'Profile', path: '/profile', onClick: () => navigate('/profile') }
                                    ].map((item, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                item.onClick();
                                                setMobileMenuOpen(false);
                                            }}
                                            className="w-full flex items-center gap-4 px-5 py-3.5 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white transition-all text-left border-b border-white/5 last:border-0"
                                        >
                                            <div className="p-2 rounded-lg bg-white/5 text-white/50">
                                                <item.icon className="w-4 h-4" />
                                            </div>
                                            {item.label}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <div ref={chatEndRef} className="flex-1 overflow-y-auto custom-scrollbar no-scrollbar px-4 md:px-8 py-4 md:py-8 scroll-smooth">
                    <div className="max-w-3xl mx-auto w-full pb-4">
                        <AnimatePresence>
                            {messages.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex flex-col items-center w-full"
                                >
                                    {/* Scrollable Container for Landing State */}
                                    <div className="w-full flex flex-col items-center">
                                        <motion.div
                                            animate={{
                                                minHeight: revealStage === 0 ? "70vh" : "20vh",
                                                paddingTop: revealStage === 0 ? "18vh" : "0vh"
                                            }}
                                            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                                            className="flex flex-col items-center justify-center w-full mb-6 md:mb-8"
                                        >
                                            <motion.div
                                                initial={{ filter: "blur(15px)", opacity: 0, scale: 0.95 }}
                                                animate={{ filter: "blur(0px)", opacity: 1, scale: 1 }}
                                                transition={{ duration: 1.2, ease: "easeOut" }}
                                                className="mb-4"
                                            >
                                                <div className="relative">
                                                    <div className="absolute -inset-4 bg-primary-500/10 rounded-full blur-3xl opacity-50" />
                                                    <h1 className="text-3xl md:text-5xl font-black font-heading mb-3 text-center leading-[1.05] tracking-tighter relative">
                                                        <TypewriterHeader
                                                            text="Médecin IA"
                                                            className="block text-slate-900 dark:text-white"
                                                        />
                                                        <TypewriterHeader
                                                            text="Deterministic Insights"
                                                            delay={2000}
                                                            onComplete={() => {
                                                                if (revealStage === 0) {
                                                                    setTimeout(() => setRevealStage(1), 300);
                                                                }
                                                            }}
                                                            className="bg-clip-text text-transparent bg-gradient-to-br from-primary-500 via-primary-600 to-purple-600 dark:from-primary-400 dark:via-primary-500 dark:to-purple-600"
                                                        />
                                                    </h1>
                                                </div>
                                            </motion.div>

                                            {/* Integrated Bot Mascot & Cards Section */}
                                            <AnimatePresence>
                                                {revealStage >= 1 && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 30 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                                                        className="relative flex flex-col items-center w-full"
                                                    >
                                                        {/* Mascot floating above the cards grid */}
                                                        <div className="absolute -top-20 md:-top-28 left-1/2 -translate-x-1/2 md:-translate-x-[260px] z-20">
                                                            <div className="relative">
                                                                <motion.div
                                                                    initial={{ opacity: 0, x: 20 }}
                                                                    animate={{ opacity: 1, x: 0 }}
                                                                    transition={{ delay: 1.5 }}
                                                                    className="glass-bubble absolute -top-12 -right-32 md:-top-16 md:-right-44 text-slate-700 dark:text-white font-bold text-xs md:text-sm whitespace-nowrap z-30 shadow-2xl"
                                                                >
                                                                    <TypewriterHeader
                                                                        text="Hey there! 👋 Need a boost?"
                                                                        delay={2000}
                                                                        onComplete={() => { }}
                                                                    />
                                                                    <div className="absolute bottom-[-6px] left-6 w-3 h-3 bg-white/60 dark:bg-white/10 rotate-45 border-r border-b border-white/40 dark:border-white/20" />
                                                                </motion.div>

                                                                <div className="w-14 h-14 md:w-32 md:h-32 relative group">
                                                                    <div className="absolute inset-0 bg-primary-500/10 rounded-full blur-xl group-hover:bg-primary-500/20 transition-all duration-700" />
                                                                    <motion.div
                                                                        animate={{
                                                                            y: [0, -10, 0],
                                                                        }}
                                                                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                                                        className="relative w-full h-full"
                                                                    >
                                                                        <img
                                                                            src="/annaba.png"
                                                                            alt="Mascot"
                                                                            className="w-full h-full object-contain filter drop-shadow-2xl"
                                                                        />
                                                                    </motion.div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <p className="text-slate-500 dark:text-white/40 text-sm md:text-base mb-6 md:mb-10 text-center max-w-lg px-6 font-medium leading-relaxed relative z-10 pt-4">
                                                            Query the official medical guidelines and product databases with <span className="text-primary-600 dark:text-white font-bold text-base md:text-lg">state-of-the-art accuracy</span> and zero hallucination.
                                                        </p>

                                                        <div className="flex md:grid md:grid-cols-2 lg:grid-cols-4 gap-3 w-full mb-6 md:mb-10 overflow-x-auto no-scrollbar snap-x snap-mandatory px-4 md:px-0 pb-4 md:pb-0 relative z-10">
                                                            {[
                                                                { title: "Abscess (Child)", desc: "Verify R3 extension rules", prompt: "What is the antibiotic regimen for a dental abscess in a child with red flags?" },
                                                                { title: "Metformin", desc: "Mechanism of action", prompt: "Explain the mechanism of Metformin based on the official database." },
                                                                { title: "Gingivitis", desc: "Hygiène bucco-dentaire", prompt: "How to prevent gingivitis using INTERDENTAL brushes?" },
                                                                { title: "Endocarditis", desc: "High risk ESC rules", prompt: "What is the ESC prophylaxis regimen for high-risk endocarditis patients?" }
                                                            ].map((card, i) => (
                                                                <PromptCard
                                                                    key={i}
                                                                    {...card}
                                                                    icon={RefreshCw}
                                                                    onClick={() => handleSendMessage(card.prompt)}
                                                                />
                                                            ))}
                                                        </div>

                                                        <button className="flex items-center gap-3 text-slate-400 dark:text-white/30 font-bold text-xs hover:text-primary-500 dark:hover:text-white transition-all uppercase tracking-widest group mb-10 relative z-10">
                                                            <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-700" /> Refresh Prompts
                                                        </button>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    </div>
                                </motion.div>
                            ) : (
                                <div className="space-y-4 md:space-y-6 pb-16 px-2">
                                    {messages.map((msg, idx) => (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                                        >
                                            <div className={`max-w-[85%] md:max-w-[75%] p-4 md:p-5 rounded-2xl shadow-lg transition-all ${msg.role === 'user'
                                                ? 'bg-primary-600 dark:bg-white/10 text-white backdrop-blur-2xl border border-primary-500/50 dark:border-white/20'
                                                : 'glass-card text-slate-900 dark:text-white'
                                                }`}>
                                                {msg.role === 'assistant' && msg.isNew ? (
                                                    <TypingText text={msg.content} />
                                                ) : (
                                                    <p className="whitespace-pre-wrap text-sm md:text-[15px] leading-[1.7] font-medium">{msg.content}</p>
                                                )}
                                            </div>

                                            {/* Action Buttons for Assistant Messages */}
                                            {msg.role === 'assistant' && (
                                                <div className="flex gap-2 mt-2 ml-2">
                                                    <motion.button
                                                        whileHover={{ scale: 1.1 }}
                                                        onClick={() => navigator.clipboard.writeText(msg.content)}
                                                        className="p-2.5 rounded-xl bg-slate-900/5 dark:bg-white/5 text-slate-400 dark:text-white/30 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/10 dark:hover:bg-white/10 transition-all border border-slate-200 dark:border-white/5"
                                                        title="Copy Message"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                                                    </motion.button>

                                                    <motion.button
                                                        whileHover={{ scale: 1.1 }}
                                                        onClick={() => document.querySelector('textarea')?.focus()}
                                                        className="p-2.5 rounded-xl bg-slate-900/5 dark:bg-white/5 text-slate-400 dark:text-white/30 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/10 dark:hover:bg-white/10 transition-all border border-slate-200 dark:border-white/5"
                                                        title="Reply"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><path d="m9 10-3 3 3 3" /><path d="M6 13h11" /></svg>
                                                    </motion.button>
                                                </div>
                                            )}
                                        </motion.div>
                                    ))}
                                    {loading && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="flex flex-col items-start"
                                        >
                                            <div className="glass-card text-slate-900 dark:text-white p-4 md:p-5 rounded-2xl max-w-[85%] md:max-w-[75%] shadow-lg">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex gap-1.5">
                                                        <motion.div
                                                            animate={{ scale: [1, 1.2, 1] }}
                                                            transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                                                            className="w-2 h-2 bg-primary-600 dark:bg-primary-400 rounded-full"
                                                        />
                                                        <motion.div
                                                            animate={{ scale: [1, 1.2, 1] }}
                                                            transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                                                            className="w-2 h-2 bg-primary-600 dark:bg-primary-400 rounded-full"
                                                        />
                                                        <motion.div
                                                            animate={{ scale: [1, 1.2, 1] }}
                                                            transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                                                            className="w-2 h-2 bg-primary-600 dark:bg-primary-400 rounded-full"
                                                        />
                                                    </div>
                                                    <span className="text-sm md:text-[15px] font-medium text-slate-600 dark:text-white/70">
                                                        {statusText || "جاري المعالجة..."}
                                                    </span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Chat Input Area */}
                <div className="max-w-3xl mx-auto w-full px-4 md:px-8 pb-4 md:pb-6 z-20">
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="glass-card rounded-2xl p-3 md:p-4 shadow-xl dark:shadow-[0_16px_60px_-10px_rgba(0,0,0,0.8)] border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 transition-all backdrop-blur-3xl"
                    >
                        <div className="flex items-center gap-3 mb-2 px-1">
                            <button className="flex items-center gap-2 text-[10px] md:text-xs font-bold text-slate-400 dark:text-white/50 bg-slate-900/5 dark:bg-white/5 hover:bg-slate-900/10 dark:hover:bg-white/10 px-4 py-2 rounded-full border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-all uppercase tracking-widest">
                                <Globe className="w-3.5 h-3.5" /> All Web <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <textarea
                            className="w-full bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20 text-sm md:text-base font-medium resize-none px-1 min-h-[40px] md:min-h-[52px] custom-scrollbar"
                            placeholder="Ask whatever you want...."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey && window.innerWidth > 768) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                        />

                        <div className="flex items-center gap-3 px-1 pt-3 border-t border-slate-100 dark:border-white/5">
                            <button className="flex items-center gap-1.5 text-slate-400 dark:text-white/40 text-xs font-bold hover:text-slate-900 dark:hover:text-white transition-all uppercase tracking-widest group">
                                <div className="p-1.5 rounded-lg bg-slate-900/5 dark:bg-white/5 group-hover:bg-slate-900/10 dark:group-hover:bg-white/10 transition-colors">
                                    <Plus className="w-4 h-4" />
                                </div>
                                <span className="hidden sm:inline">Attachment</span>
                            </button>
                            <button className="flex items-center gap-1.5 text-slate-400 dark:text-white/40 text-xs font-bold hover:text-slate-900 dark:hover:text-white transition-all uppercase tracking-widest group">
                                <div className="p-1.5 rounded-lg bg-slate-900/5 dark:bg-white/5 group-hover:bg-slate-900/10 dark:group-hover:bg-white/10 transition-colors">
                                    <ImageIcon className="w-4 h-4" />
                                </div>
                                <span className="hidden sm:inline">Image</span>
                            </button>

                            <div className="flex-1" />

                            <div className="flex items-center gap-3">
                                <span className="hidden xs:inline text-slate-400 dark:text-white/20 text-xs font-bold uppercase tracking-widest">{input.length}/1000</span>
                                <motion.button
                                    whileHover={{ scale: 1.05, backgroundColor: 'rgba(14, 165, 233, 0.9)' }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleSendMessage()}
                                    disabled={loading || !input.trim()}
                                    className="bg-primary-600 dark:bg-white/10 text-white p-3 rounded-xl shadow-lg border border-primary-500/50 dark:border-white/20 transition-all disabled:opacity-30 disabled:shadow-none backdrop-blur-xl"
                                >
                                    <Send className="w-4 h-4 md:w-5 md:h-5" />
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </main>
        </div>
    );
};

export default Chat;
