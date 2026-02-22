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
import { pipeline, env } from '@xenova/transformers';

// Configuration for local/remote models
env.allowLocalModels = false; // Disable loading from public/models/
// No need to set remoteHost, the default HuggingFace host is correct.

// Global reference for the embedding pipeline
let embeddingPipeline: any = null;


const PromptCard = ({ title, desc, icon: Icon, onClick }: { title: string, desc: string, icon: any, onClick: () => void }) => (
    <motion.button
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        onClick={onClick}
        className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all text-left group min-w-[240px] md:min-w-0 md:h-full flex-shrink-0 snap-start"
    >
        <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2 leading-tight">{title}</h4>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-4">{desc}</p>
        <div className="text-slate-300 dark:text-slate-600 group-hover:text-primary-500 transition-colors">
            <Icon className="w-5 h-5" />
        </div>
    </motion.button>
);

const TypingText = ({ text, onComplete }: { text: string, onComplete?: () => void }) => {
    const [displayedText, setDisplayedText] = useState("");
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (currentIndex < text.length) {
            const timeout = setTimeout(() => {
                setDisplayedText(prev => prev + text[currentIndex]);
                setCurrentIndex(prev => prev + 1);
            }, 10);
            return () => clearTimeout(timeout);
        } else if (onComplete) {
            onComplete();
        }
    }, [currentIndex, text, onComplete]);

    return <p className="whitespace-pre-wrap text-xs md:text-sm leading-relaxed">{displayedText}</p>;
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

    // Auto-scroll on new messages
    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollTop = chatEndRef.current.scrollHeight;
        }
    }, [messages]);

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
        setStatusText("Preparing AI...");

        try {
            // 2. Vectorization (Local & Free) with Timeout Fallback
            let queryVector = Array(384).fill(0); // Default fallback vector
            try {
                if (!embeddingPipeline) {
                    setStatusText("Waking up AI model...");
                    // Add timeout to pipeline load
                    embeddingPipeline = await Promise.race([
                        pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2'),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Model load timeout')), 5000))
                    ]);
                }

                setStatusText("Analyzing question...");
                // Add timeout to embedding generation
                const output = await Promise.race([
                    embeddingPipeline(text, { pooling: 'mean', normalize: true }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Embedding generation timeout')), 3000))
                ]) as any;

                queryVector = Array.from(output.data);
            } catch (e) {
                console.warn("Local embedding failed or timed out, using fallback vector.", e);
                // We proceed with the zero vector. The SQL will still match based on `query_text` (keyword match)
            }

            // 3. Fast Edge Function Call
            setStatusText("Consulting Medical AI...");

            // For bypass mode, we just use the anon key. 
            // The Edge Function is already configured with --no-verify-jwt
            const response = await fetch(`${supabaseUrl}/functions/v1/chat-consultation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'apikey': supabaseAnonKey
                },
                body: JSON.stringify({
                    question: text,
                    queryVector,
                    history: messages.slice(-4).map(m => ({ role: m.role, content: m.content })),
                    conversationId: currentConversationId
                })
            });

            if (!response.ok) {
                throw new Error(`Connection error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            if (data?.error && !data?.content) throw new Error(data.error);

            // 4. Success
            const aiResponse = data?.content || "عذراً، لم أتمكن من الحصول على إجابة.";
            if (data?.conversationId && !currentConversationId) {
                setCurrentConversationId(data.conversationId);
            }

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
        <div className="flex h-screen bg-[#F8F9FC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans overflow-hidden transition-colors">
            <Sidebar onSelectConversation={setCurrentConversationId} />

            <main className="flex-1 flex flex-col relative pb-0 min-w-0 w-full overflow-x-hidden">
                {/* Mobile Top Header */}
                <div className="md:hidden flex items-center justify-between p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 z-50 sticky top-0">
                    <div
                        className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => navigate('/')}
                    >
                        <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md flex items-center justify-center bg-white dark:bg-slate-800">
                            <img src="/og-image.png" alt="Logo" className="w-full h-full object-cover" />
                        </div>
                        <span className="font-heading font-bold text-slate-800 dark:text-white">Pharmasssit</span>
                    </div>
                    <div className="relative">
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            <Menu className="w-5 h-5" />
                        </button>

                        <AnimatePresence>
                            {mobileMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden z-50 py-2"
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
                                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary-600 dark:hover:text-primary-400 transition-colors text-left border-b border-slate-50 dark:border-slate-800 last:border-0"
                                        >
                                            <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-500">
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

                <div ref={chatEndRef} className="flex-1 overflow-y-auto custom-scrollbar no-scrollbar px-3 md:px-8 py-4 md:py-12">
                    <div className="max-w-4xl mx-auto w-full">
                        <AnimatePresence>
                            {messages.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="flex flex-col items-center justify-center min-h-[50vh] md:min-h-[60vh] py-8"
                                >
                                    <h1 className="text-2xl md:text-5xl font-bold font-heading mb-4 text-center leading-tight px-4 w-full">
                                        Clinical Support <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-indigo-500">Engine</span><br />
                                        <span className="text-slate-800 dark:text-white">Deterministic Insights</span>
                                    </h1>
                                    <p className="text-slate-400 dark:text-slate-500 text-[10px] md:text-sm mb-8 md:mb-12 text-center max-w-xs md:max-w-md px-4">Query the official dental guidelines and product databases with zero hallucination.</p>

                                    <div className="flex md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 w-full mb-8 md:mb-12 overflow-x-auto no-scrollbar snap-x snap-mandatory px-4 md:px-0 pb-4 md:pb-0">

                                        <PromptCard
                                            title="Abscess (Child)"
                                            desc="Verify R3 extension rules"
                                            icon={RefreshCw}
                                            onClick={() => handleSendMessage("What is the antibiotic regimen for a dental abscess in a child with red flags?")}
                                        />
                                        <PromptCard
                                            title="Metformin"
                                            desc="Mechanism of action"
                                            icon={RefreshCw}
                                            onClick={() => handleSendMessage("Explain the mechanism of Metformin based on the official database.")}
                                        />
                                        <PromptCard
                                            title="Gingivitis"
                                            desc="Hygiène bucco-dentaire"
                                            icon={RefreshCw}
                                            onClick={() => handleSendMessage("How to prevent gingivitis using INTERDENTAL brushes?")}
                                        />
                                        <PromptCard
                                            title="Endocarditis"
                                            desc="High risk ESC rules"
                                            icon={RefreshCw}
                                            onClick={() => handleSendMessage("What is the ESC prophylaxis regimen for high-risk endocarditis patients?")}
                                        />
                                    </div>

                                    <button className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-xs md:text-sm hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                                        <RefreshCw className="w-4 h-4" /> Refresh Prompts
                                    </button>
                                </motion.div>
                            ) : (
                                <div className="space-y-6 md:space-y-8 pb-12">
                                    {messages.map((msg, idx) => (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                                        >
                                            <div className={`max-w-[90%] md:max-w-[80%] p-4 md:p-6 rounded-2xl md:rounded-3xl ${msg.role === 'user'
                                                ? 'bg-primary-600 text-white shadow-lg'
                                                : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white border border-slate-100 dark:border-slate-800 shadow-sm'
                                                }`}>
                                                {msg.role === 'assistant' && msg.isNew ? (
                                                    <TypingText text={msg.content} />
                                                ) : (
                                                    <p className="whitespace-pre-wrap text-xs md:text-sm leading-relaxed">{msg.content}</p>
                                                )}
                                            </div>

                                            {/* Action Buttons for Assistant Messages */}
                                            {msg.role === 'assistant' && (
                                                <div className="flex gap-3 mt-2 ml-2">
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(msg.content);
                                                            // Simple visual feedback could be added here
                                                        }}
                                                        className="flex items-center gap-1.5 text-slate-400 hover:text-primary-600 transition-colors group"
                                                        title="Copy Message"
                                                    >
                                                        <div className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                                                        </div>
                                                        <span className="text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">Copy</span>
                                                    </button>

                                                    <button
                                                        onClick={() => {
                                                            // Add focus to input or prepopulate, for now just focus
                                                            const textarea = document.querySelector('textarea');
                                                            if (textarea) textarea.focus();
                                                        }}
                                                        className="flex items-center gap-1.5 text-slate-400 hover:text-primary-600 transition-colors group"
                                                        title="Reply"
                                                    >
                                                        <div className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-square-reply"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><path d="m9 10-3 3 3 3" /><path d="M6 13h11" /></svg>
                                                        </div>
                                                        <span className="text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">Reply</span>
                                                    </button>
                                                </div>
                                            )}
                                        </motion.div>
                                    ))}
                                    {loading && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="flex justify-start"
                                        >
                                            <div className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-2">
                                                <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
                                                <span className="text-sm font-medium italic animate-pulse text-slate-800 dark:text-white">
                                                    {statusText || "AI is thinking..."}
                                                </span>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Chat Input Area */}
                <div className="max-w-4xl mx-auto w-full px-3 md:px-8 pb-3 md:pb-8">
                    <div className="bg-white dark:bg-slate-900 rounded-[24px] md:rounded-[32px] p-4 md:p-6 shadow-xl border border-slate-100 dark:border-slate-800 transition-colors">
                        <div className="flex items-center justify-between mb-2 px-1 md:px-2">
                            <button className="flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-slate-500 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 md:px-3 md:py-1.5 rounded-full border border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                <Globe className="w-3 md:w-3.5 h-3 md:h-3.5" /> All Web <ChevronDown className="w-3 md:w-3.5 h-3 md:h-3.5" />
                            </button>
                        </div>

                        <textarea
                            className="w-full bg-transparent border-none focus:ring-0 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm md:text-lg resize-none px-1 md:px-2 min-h-[40px] md:min-h-[60px]"
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

                        <div className="flex items-center gap-3 md:gap-4 px-1 md:px-2 pt-3 md:pt-4 border-t border-slate-50">
                            <button className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs md:text-sm hover:text-primary-600 transition-colors">
                                <Plus className="w-4 md:w-5 h-4 md:h-5" /> <span className="hidden sm:inline">Add Attachment</span>
                            </button>
                            <button className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs md:text-sm hover:text-primary-600 transition-colors">
                                <ImageIcon className="w-4 md:w-5 h-4 md:h-5" /> <span className="hidden sm:inline">Use Image</span>
                            </button>

                            <div className="flex-1" />

                            <div className="flex items-center gap-2 md:gap-4">
                                <span className="hidden xs:inline text-slate-300 dark:text-slate-600 text-[10px] md:text-xs font-medium">{input.length}/1000</span>
                                <button
                                    onClick={() => handleSendMessage()}
                                    disabled={loading || !input.trim()}
                                    className="bg-primary-600 text-white p-2.5 md:p-3 rounded-xl md:rounded-2xl shadow-lg shadow-primary-500/30 hover:bg-primary-700 transition-all disabled:opacity-50 disabled:shadow-none"
                                >
                                    <Send className="w-4 md:w-5 h-4 md:h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Chat;
