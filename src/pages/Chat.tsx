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
import Groq from "groq-sdk";
import { supabase } from '../lib/supabase';
import { findRelevance, getSystemPrompt } from '../lib/cdss';

const groq = new Groq({
    apiKey: import.meta.env.VITE_GROQ_API_KEY,
    dangerouslyAllowBrowser: true
});

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

const Chat: React.FC = () => {
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Find existing conversation or create new one on mount
        const initChat = async () => {
            const { data: { user } } = await supabase.auth.getUser();
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
                setConversationId(convs[0].id);
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
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async (text: string = input) => {
        if (!text.trim() || isLoading) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert("Please sign in to save your consultations.");
            return;
        }

        let currentConvId = conversationId;

        // Create conversation if it doesn't exist
        if (!currentConvId) {
            const { data: newConv, error: convError } = await supabase
                .from('conversations')
                .insert({ user_id: user.id, title: text.slice(0, 40) + '...' })
                .select()
                .single();

            if (convError) {
                console.error("Error creating conversation:", convError);
                return;
            }
            currentConvId = newConv.id;
            setConversationId(currentConvId);
        }

        // Save User Message
        await supabase.from('chat_messages').insert({
            conversation_id: currentConvId,
            role: 'user',
            content: text
        });

        const newMessages = [...messages, { role: 'user' as const, content: text }];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        // CDSS Logic: Find relevance in JSON (Asynchronous Supabase query)
        const context = await findRelevance(text);
        const systemPrompt = getSystemPrompt(context);

        try {
            const chatCompletion = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: systemPrompt },
                    ...newMessages.map(m => ({
                        role: m.role,
                        content: m.content,
                    }))
                ],
                model: "llama-3.3-70b-versatile",
            });

            const aiResponse = chatCompletion.choices[0]?.message?.content || "No response from AI.";

            // Save Assistant Message
            await supabase.from('chat_messages').insert({
                conversation_id: currentConvId,
                role: 'assistant',
                content: aiResponse
            });

            setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
        } catch (error) {
            console.error("Groq API Error:", error);
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error. Please check the console." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-screen bg-[#F8F9FC] text-slate-900 font-sans overflow-hidden">
            <Sidebar />

            <main className="flex-1 flex flex-col relative">
                <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar no-scrollbar px-8 py-12">
                    <div className="max-w-4xl mx-auto w-full">
                        <AnimatePresence>
                            {messages.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="flex flex-col items-center justify-center min-h-[60vh]"
                                >
                                    <h1 className="text-4xl md:text-5xl font-bold font-heading mb-4 text-center">
                                        Clinical Support <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-indigo-500">Engine</span><br />
                                        <span className="text-slate-800">Deterministic Medical Insights</span>
                                    </h1>
                                    <p className="text-slate-400 text-sm mb-12">Query the official dental guidelines and product databases with zero hallucination.</p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full mb-12">
                                        <PromptCard
                                            title="Regimen for Abscess (Child)"
                                            desc="Verify R3 extension rules"
                                            icon={RefreshCw}
                                            onClick={() => handleSendMessage("What is the antibiotic regimen for a dental abscess in a child with red flags?")}
                                        />
                                        <PromptCard
                                            title="Metformin mechanism"
                                            desc="Product database search"
                                            icon={RefreshCw}
                                            onClick={() => handleSendMessage("Explain the mechanism of Metformin based on the official database.")}
                                        />
                                        <PromptCard
                                            title="Gingivitis Prevention"
                                            desc="Hygiène bucco-dentaire"
                                            icon={RefreshCw}
                                            onClick={() => handleSendMessage("How to prevent gingivitis using INTERDENTAL brushes?")}
                                        />
                                        <PromptCard
                                            title="Endocarditis Prophylaxis"
                                            desc="High risk ESC rules"
                                            icon={RefreshCw}
                                            onClick={() => handleSendMessage("What is the ESC prophylaxis regimen for high-risk endocarditis patients?")}
                                        />
                                    </div>

                                    <button className="flex items-center gap-2 text-slate-400 text-sm hover:text-slate-600 transition-colors">
                                        <RefreshCw className="w-4 h-4" /> Refresh Prompts
                                    </button>
                                </motion.div>
                            ) : (
                                <div className="space-y-8 pb-12">
                                    {messages.map((msg, idx) => (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div className={`max-w-[80%] p-6 rounded-3xl ${msg.role === 'user'
                                                ? 'bg-primary-600 text-white shadow-lg'
                                                : 'bg-white text-slate-800 border border-slate-100 shadow-sm'
                                                }`}>
                                                <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                                            </div>
                                        </motion.div>
                                    ))}
                                    {isLoading && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="flex justify-start"
                                        >
                                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-2">
                                                <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
                                                <span className="text-sm text-slate-500 font-medium">AI is thinking...</span>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Chat Input Area */}
                <div className="max-w-4xl mx-auto w-full px-8 pb-8">
                    <div className="bg-white rounded-[32px] p-6 shadow-xl border border-slate-100">
                        <div className="flex items-center justify-between mb-2 px-2">
                            <button className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 hover:bg-slate-100 transition-colors">
                                <Globe className="w-3.5 h-3.5" /> All Web <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <textarea
                            className="w-full bg-transparent border-none focus:ring-0 text-slate-700 placeholder:text-slate-400 text-lg resize-none px-2 min-h-[60px]"
                            placeholder="Ask whatever you want...."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                        />

                        <div className="flex items-center gap-4 px-2 pt-4 border-t border-slate-50">
                            <button className="flex items-center gap-1.5 text-slate-500 text-sm hover:text-primary-600 transition-colors">
                                <Plus className="w-5 h-5" /> Add Attachment
                            </button>
                            <button className="flex items-center gap-1.5 text-slate-500 text-sm hover:text-primary-600 transition-colors">
                                <ImageIcon className="w-5 h-5" /> Use Image
                            </button>

                            <div className="flex-1" />

                            <div className="flex items-center gap-4">
                                <span className="text-slate-300 text-xs font-medium">{input.length}/1000</span>
                                <button
                                    onClick={() => handleSendMessage()}
                                    disabled={isLoading || !input.trim()}
                                    className="bg-primary-600 text-white p-3 rounded-2xl shadow-lg shadow-primary-500/30 hover:bg-primary-700 transition-all disabled:opacity-50 disabled:shadow-none"
                                >
                                    <Send className="w-5 h-5" />
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
