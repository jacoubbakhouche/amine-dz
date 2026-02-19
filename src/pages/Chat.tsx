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
    Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLocation } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../contexts/AuthContext';


const PromptCard = ({ title, desc, icon: Icon, onClick }: { title: string, desc: string, icon: any, onClick: () => void }) => (
    <motion.button
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        onClick={onClick}
        className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all text-left group h-full"
    >
        <h4 className="font-bold text-slate-800 mb-2 leading-tight">{title}</h4>
        <p className="text-[10px] text-slate-400 mb-4">{desc}</p>
        <div className="text-slate-300 group-hover:text-primary-500 transition-colors">
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
    const { user } = useAuth();
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('new') === 'true') {
            setMessages([]);
            setCurrentConversationId(null);
            setInput('');
        }
    }, [location]);

    useEffect(() => {
        // Find existing conversation or create new one on mount
        const initChat = async () => {
            if (!user) return;

            // Check if we should load a specific conversation (from URL or last one)
            // For now, we'll just start fresh or find the most recent
            const { data: convs } = await supabase
                .from('conversations')
                .select('id')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1);

            if (convs && convs.length > 0) {
                setCurrentConversationId(convs[0].id);
                // Load messages
                const { data: msgs } = await supabase
                    .from('chat_messages')
                    .select('role, content')
                    .eq('conversation_id', convs[0].id)
                    .order('created_at', { ascending: true });

                if (msgs) {
                    setMessages(msgs as any);
                }
            }
        };

        initChat();
    }, [user]);

    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollTop = chatEndRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async (text: string = input) => {
        if (!text.trim() || loading) return;

        if (!user) {
            alert("Please sign in to save your consultations.");
            return;
        }

        let currId = currentConversationId;

        // Create conversation if it doesn't exist
        if (!currId) {
            const { data: newConv, error: convError } = await supabase
                .from('conversations')
                .insert({ user_id: user.id, title: text.slice(0, 40) + '...' })
                .select()
                .single();

            if (convError) {
                console.error("Error creating conversation:", convError);
                return;
            }
            currId = newConv.id;
            setCurrentConversationId(currId);
        }

        const newMessages = [...messages, { role: 'user' as const, content: text }];
        setMessages(newMessages);
        setInput('');
        setLoading(true);

        try {
            // Call Edge Function — AI + CDSS + message saving all happen server-side
            const { data, error } = await supabase.functions.invoke('chat-consultation', {
                body: {
                    question: text,
                    history: messages.map(m => ({ role: m.role, content: m.content })),
                    conversationId: currId
                }
            });

            if (error) throw error;

            const aiResponse = data?.content || "No response generated.";
            setMessages(prev => [...prev, { role: 'assistant', content: aiResponse, isNew: true }]);
        } catch (error) {
            console.error("Chat Error:", error);
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error. Please try again." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen bg-[#F8F9FC] text-slate-900 font-sans overflow-hidden">
            <Sidebar />

            <main className="flex-1 flex flex-col relative pb-20 md:pb-0">
                <div ref={chatEndRef} className="flex-1 overflow-y-auto custom-scrollbar no-scrollbar px-4 md:px-8 py-6 md:py-12">
                    <div className="max-w-4xl mx-auto w-full">
                        <AnimatePresence>
                            {messages.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="flex flex-col items-center justify-center min-h-[50vh] md:min-h-[60vh] py-8"
                                >
                                    <h1 className="text-3xl md:text-5xl font-bold font-heading mb-4 text-center leading-tight">
                                        Clinical Support <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-indigo-500">Engine</span><br />
                                        <span className="text-slate-800">Deterministic Insights</span>
                                    </h1>
                                    <p className="text-slate-400 text-xs md:text-sm mb-8 md:mb-12 text-center max-w-md">Query the official dental guidelines and product databases with zero hallucination.</p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 w-full mb-8 md:mb-12">
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

                                    <button className="flex items-center gap-2 text-slate-400 text-xs md:text-sm hover:text-slate-600 transition-colors">
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
                                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div className={`max-w-[90%] md:max-w-[80%] p-4 md:p-6 rounded-2xl md:rounded-3xl ${msg.role === 'user'
                                                ? 'bg-primary-600 text-white shadow-lg'
                                                : 'bg-white text-slate-800 border border-slate-100 shadow-sm'
                                                }`}>
                                                {msg.role === 'assistant' && msg.isNew ? (
                                                    <TypingText text={msg.content} />
                                                ) : (
                                                    <p className="whitespace-pre-wrap text-xs md:text-sm leading-relaxed">{msg.content}</p>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}
                                    {loading && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="flex justify-start"
                                        >
                                            <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm flex items-center gap-2">
                                                <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
                                                <span className="text-xs md:text-sm text-slate-500 font-medium">AI is thinking...</span>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Chat Input Area */}
                <div className="max-w-4xl mx-auto w-full px-4 md:px-8 pb-4 md:pb-8">
                    <div className="bg-white rounded-[24px] md:rounded-[32px] p-4 md:p-6 shadow-xl border border-slate-100">
                        <div className="flex items-center justify-between mb-2 px-1 md:px-2">
                            <button className="flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-slate-500 bg-slate-50 px-2.5 py-1 md:px-3 md:py-1.5 rounded-full border border-slate-100 hover:bg-slate-100 transition-colors">
                                <Globe className="w-3 md:w-3.5 h-3 md:h-3.5" /> All Web <ChevronDown className="w-3 md:w-3.5 h-3 md:h-3.5" />
                            </button>
                        </div>

                        <textarea
                            className="w-full bg-transparent border-none focus:ring-0 text-slate-700 placeholder:text-slate-400 text-sm md:text-lg resize-none px-1 md:px-2 min-h-[40px] md:min-h-[60px]"
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
                            <button className="flex items-center gap-1.5 text-slate-500 text-xs md:text-sm hover:text-primary-600 transition-colors">
                                <Plus className="w-4 md:w-5 h-4 md:h-5" /> <span className="hidden sm:inline">Add Attachment</span>
                            </button>
                            <button className="flex items-center gap-1.5 text-slate-500 text-xs md:text-sm hover:text-primary-600 transition-colors">
                                <ImageIcon className="w-4 md:w-5 h-4 md:h-5" /> <span className="hidden sm:inline">Use Image</span>
                            </button>

                            <div className="flex-1" />

                            <div className="flex items-center gap-2 md:gap-4">
                                <span className="hidden xs:inline text-slate-300 text-[10px] md:text-xs font-medium">{input.length}/1000</span>
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
                <BottomNav />
            </main>
        </div>
    );
};

export default Chat;
