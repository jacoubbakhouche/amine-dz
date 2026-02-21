import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Database,
    Shield,
    Zap,
    MessageSquare,
    ChevronRight,
    Lock,
    Server,
    CheckCircle2,
    ArrowRight,
    Plus,
    Send,
    Bot,
    User,
    Sparkles,
    FileText,
    Globe
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { DottedSurface } from '../components/ui/dotted-surface';
import ThemeToggle from '../components/ThemeToggle';

// --- Animated typing effect for the demo ---
const useTypingEffect = (text: string, speed = 30, startDelay = 1000) => {
    const [displayed, setDisplayed] = useState('');
    const [started, setStarted] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setStarted(true), startDelay);
        return () => clearTimeout(timer);
    }, [startDelay]);

    useEffect(() => {
        if (!started) return;
        if (displayed.length < text.length) {
            const t = setTimeout(() => setDisplayed(text.slice(0, displayed.length + 1)), speed);
            return () => clearTimeout(t);
        }
    }, [displayed, text, speed, started]);

    return displayed;
};

// --- Feature Card ---
const FeatureCard = ({ icon: Icon, title, description, color, delay }: {
    icon: any; title: string; description: string; color: string; delay: number;
}) => (
    <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay }}
        whileHover={{ y: -8, scale: 1.02 }}
        className="relative group"
    >
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-500">
            <div className={`w-14 h-14 rounded-2xl bg-${color}-50 dark:bg-${color}-900/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <Icon className={`w-7 h-7 text-${color}-500 dark:text-${color}-400`} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 font-heading">{title}</h3>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-sm">{description}</p>
        </div>
    </motion.div>
);

// --- Trust Item ---
const TrustItem = ({ icon: Icon, title, description }: { icon: any; title: string; description: string }) => (
    <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        className="flex gap-5 items-start"
    >
        <div className="w-12 h-12 rounded-2xl bg-primary-500/10 dark:bg-primary-500/20 flex items-center justify-center flex-shrink-0">
            <Icon className="w-6 h-6 text-primary-500 dark:text-primary-400" />
        </div>
        <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-1">{title}</h4>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{description}</p>
        </div>
    </motion.div>
);

// ============================================
// LANDING PAGE
// ============================================
const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const demoAnswer = useTypingEffect(
        `✅ Basé sur la base de données propriétaire :\n\n📋 Produit : ELUGEL GEL BUCCAL (CNK: 4118384)\n💊 Posologie recommandée : Appliquer 2 à 3 fois par jour\n📌 Durée du traitement : Cure de 15 jours maximum\n🔬 Principe actif : Chlorhexidine digluconate 0,2%\n\n⚠️ Score de confiance : 99% (Source: Base interne vérifiée)\n\n📖 Justification :\n- Rule ID : DATA PRIORITY\n- Source : Champ "conseil_usage" du produit ELUGEL GEL BUCCAL`,
        20,
        2500
    );

    return (
        <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-colors overflow-x-hidden">
            <DottedSurface className="opacity-70" />

            {/* ═══════════════════════════════════════════ */}
            {/* NAVIGATION BAR                              */}
            {/* ═══════════════════════════════════════════ */}
            <motion.nav
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="fixed top-0 left-0 right-0 z-50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-100/50 dark:border-slate-800/50 transition-colors"
            >
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => navigate('/')}>
                        <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30 group-hover:scale-110 transition-transform">
                            <Plus className="text-white w-6 h-6 stroke-[3]" />
                        </div>
                        <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white font-heading">Pharmasssit</span>
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-500 dark:text-slate-400">
                        <a href="#fonctionnalites" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Fonctionnalités</a>
                        <a href="#demo" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Démonstration</a>
                        <a href="#confiance" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Sécurité</a>
                    </div>
                    <div className="flex items-center gap-3">
                        {user ? (
                            <div className="flex items-center gap-4">
                                <ThemeToggle />
                                <button
                                    onClick={() => navigate('/chat')}
                                    className="bg-primary-600 text-white text-sm font-bold px-6 py-2.5 rounded-xl hover:bg-primary-700 shadow-lg shadow-primary-500/25 transition-all hover:shadow-xl hover:shadow-primary-500/30 flex items-center gap-2"
                                >
                                    Accéder à l'Assistant
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => navigate('/login')}
                                    className="text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-white transition-colors px-4 py-2"
                                >
                                    Se connecter
                                </button>
                                <button
                                    onClick={() => navigate('/register')}
                                    className="bg-primary-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-primary-700 shadow-lg shadow-primary-500/25 transition-all hover:shadow-xl hover:shadow-primary-500/30"
                                >
                                    Essai gratuit
                                </button>
                                <div className="ml-2">
                                    <ThemeToggle />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </motion.nav>

            {/* ═══════════════════════════════════════════ */}
            {/* HERO SECTION                                */}
            {/* ═══════════════════════════════════════════ */}
            <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">

                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        {/* Left: Text content */}
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8 }}
                        >
                            <div className="inline-flex items-center gap-2 bg-primary-50 dark:bg-primary-900/10 border border-primary-100 dark:border-primary-800 rounded-full px-4 py-1.5 mb-8">
                                <Sparkles className="w-4 h-4 text-primary-500 dark:text-primary-400" />
                                <span className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider">Intelligence Clinique B2B</span>
                            </div>

                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white leading-[1.1] mb-6 font-heading">
                                L'Assistance Décisionnelle{' '}
                                <span className="text-gradient">Intelligente</span>{' '}
                                pour Experts de Santé.
                            </h1>

                            <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 leading-relaxed mb-10 max-w-lg">
                                Accédez à des données médicales structurées et déterministes. Une solution SaaS sécurisée pour{' '}
                                <strong className="text-slate-700 dark:text-slate-200">pharmaciens</strong>,{' '}
                                <strong className="text-slate-700 dark:text-slate-200">dentistes</strong> et{' '}
                                <strong className="text-slate-700 dark:text-slate-200">vétérinaires</strong>.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <button
                                    onClick={() => navigate(user ? '/chat' : '/register')}
                                    className="group bg-primary-600 text-white font-bold px-8 py-4 rounded-2xl hover:bg-primary-700 shadow-xl shadow-primary-500/25 transition-all hover:shadow-2xl hover:shadow-primary-500/30 flex items-center justify-center gap-3"
                                >
                                    {user ? "Accéder à l'Assistant" : "Demander une version d'essai"}
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                                <a
                                    href="#demo"
                                    className="group bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-bold px-8 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-primary-300 dark:hover:border-primary-700 hover:text-primary-600 dark:hover:text-primary-400 transition-all flex items-center justify-center gap-3 shadow-sm"
                                >
                                    Voir la démo
                                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </a>
                            </div>

                            {/* Stats */}
                            <div className="flex gap-10 mt-12 pt-8 border-t border-slate-100">
                                {[
                                    { value: '99%', label: 'Précision' },
                                    { value: '500+', label: 'Produits indexés' },
                                    { value: '0ms', label: 'Hallucination' },
                                ].map((stat, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.5 + i * 0.15 }}
                                    >
                                        <p className="text-2xl font-black text-slate-900 dark:text-white">{stat.value}</p>
                                        <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-1">{stat.label}</p>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Right: Hero image */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 1, delay: 0.3 }}
                            className="relative flex justify-center"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-primary-200/30 to-primary-100/10 rounded-[3rem] blur-3xl" />
                            <img
                                src="/assets/images/hero_medical_ai.png"
                                alt="Intelligence Artificielle Médicale"
                                className="relative z-10 w-full max-w-lg drop-shadow-2xl rounded-3xl"
                            />
                            {/* Floating badges */}
                            <motion.div
                                animate={{ y: [0, -10, 0] }}
                                transition={{ duration: 3, repeat: Infinity }}
                                className="absolute top-8 right-4 bg-white dark:bg-slate-900 shadow-xl rounded-2xl px-4 py-3 flex items-center gap-2 z-20"
                            >
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Données Vérifiées</span>
                            </motion.div>
                            <motion.div
                                animate={{ y: [0, 8, 0] }}
                                transition={{ duration: 3.5, repeat: Infinity }}
                                className="absolute bottom-12 left-0 bg-white dark:bg-slate-900 shadow-xl rounded-2xl px-4 py-3 flex items-center gap-2 z-20"
                            >
                                <Shield className="w-5 h-5 text-primary-500" />
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Conforme RGPD</span>
                            </motion.div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════ */}
            {/* AI DEMO SECTION                             */}
            {/* ═══════════════════════════════════════════ */}
            <section id="demo" className="py-20 md:py-32 bg-gradient-to-b from-white to-slate-50 dark:from-slate-950 dark:to-slate-900 transition-colors">
                <div className="max-w-7xl mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <div className="inline-flex items-center gap-2 bg-primary-50 dark:bg-primary-900/10 border border-primary-100 dark:border-primary-800 rounded-full px-4 py-1.5 mb-6">
                            <MessageSquare className="w-4 h-4 text-primary-500" />
                            <span className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider">Démonstration Live</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white font-heading mb-4">
                            Moteur de Recherche Clinique <span className="text-gradient">Intelligent</span>
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
                            Logique déterministe — pas d'IA générative pure. Chaque réponse est tracée et justifiée par nos bases de données propriétaires.
                        </p>
                    </motion.div>

                    {/* Chat Demo */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="max-w-3xl mx-auto"
                    >
                        <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl shadow-slate-200/60 dark:shadow-slate-950/60 border border-slate-100 dark:border-slate-800 overflow-hidden">
                            {/* Chat header */}
                            <div className="bg-slate-900 dark:bg-black px-6 py-4 flex items-center gap-3">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-400" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                                    <div className="w-3 h-3 rounded-full bg-green-400" />
                                </div>
                                <span className="text-white/60 dark:text-white/40 text-xs font-medium ml-2">Pharmasssit CDSS — Consultation</span>
                            </div>

                            {/* Chat body */}
                            <div className="p-6 space-y-5 min-h-[400px]">
                                {/* User message */}
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    className="flex justify-end"
                                >
                                    <div className="bg-primary-600 text-white rounded-2xl rounded-tr-sm px-5 py-3 max-w-md shadow-lg">
                                        <div className="flex items-center gap-2 mb-1">
                                            <User className="w-3.5 h-3.5 opacity-60" />
                                            <span className="text-[10px] font-bold opacity-60 uppercase">Pharmacien</span>
                                        </div>
                                        <p className="text-sm">Combien de temps doit durer une cure d'ELUGEL GEL BUCCAL ?</p>
                                    </div>
                                </motion.div>

                                {/* AI response */}
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.5 }}
                                    className="flex justify-start"
                                >
                                    <div className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-tl-sm px-5 py-4 max-w-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Bot className="w-4 h-4 text-primary-500" />
                                            <span className="text-[10px] font-bold text-primary-600 uppercase">CDSS Assistant</span>
                                        </div>
                                        <pre className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
                                            {demoAnswer}
                                            <span className="animate-pulse text-primary-500">|</span>
                                        </pre>
                                    </div>
                                </motion.div>
                            </div>

                            {/* Chat input mock */}
                            <div className="border-t border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center gap-3">
                                <div className="flex-1 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm text-slate-400 dark:text-slate-500 border border-slate-100 dark:border-slate-700">
                                    Posez votre question clinique...
                                </div>
                                <div className="bg-primary-600 p-3 rounded-xl shadow-lg shadow-primary-500/25">
                                    <Send className="w-5 h-5 text-white" />
                                </div>
                            </div>
                        </div>

                        {/* Tag underneath */}
                        <div className="flex justify-center mt-6">
                            <div className="inline-flex items-center gap-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-full px-4 py-2">
                                <Sparkles className="w-4 h-4 text-amber-500" />
                                <span className="text-xs font-bold text-amber-700 dark:text-amber-400">Logique déترminisت — Zéro hallucination — Données tracées</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════ */}
            {/* FEATURES SECTION                            */}
            {/* ═══════════════════════════════════════════ */}
            <section id="fonctionnalites" className="py-20 md:py-32">
                <div className="max-w-7xl mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white font-heading mb-4">
                            Fonctionnalités <span className="text-gradient">Clés</span>
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
                            Une plateforme conçue pour les professionnels de santé exigeants.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <FeatureCard
                            icon={Database}
                            title="Données Fiables"
                            description="Intégration de bases JSON propriétaires et vérifiées. Chaque produit, protocole et posologie est indexé avec des identifiants CNK et NCI traçables."
                            color="primary"
                            delay={0}
                        />
                        <FeatureCard
                            icon={Shield}
                            title="Sécurité Maximale"
                            description="Architecture prête pour la conformité RGPD et protection des données sensibles. Clés API sécurisées côté serveur, authentification multi-niveaux."
                            color="green"
                            delay={0.15}
                        />
                        <FeatureCard
                            icon={Zap}
                            title="Recherche Haute Performance"
                            description="Système de scoring interne pour des résultats triés par pertinence. Réponses en millisecondes avec une précision de 99%."
                            color="amber"
                            delay={0.3}
                        />
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════ */}
            {/* TRUST / CONFIDENCE SECTION                  */}
            {/* ═══════════════════════════════════════════ */}
            <section id="confiance" className="py-20 md:py-32 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 transition-colors">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        {/* Left: Image / gradient card */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className="relative"
                        >
                            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] p-10 text-white shadow-2xl shadow-slate-900/30">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md">
                                        <Lock className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-2xl font-black font-heading">Confidentialité & Professionnalisme</h3>
                                </div>
                                <div className="space-y-6">
                                    <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                                        <div className="flex items-center gap-3 mb-3">
                                            <FileText className="w-5 h-5 text-primary-300" />
                                            <span className="font-bold text-sm">Contrats & NDA</span>
                                        </div>
                                        <p className="text-white/60 text-sm leading-relaxed">
                                            Engagement total sur la confidentialité et protection de votre propriété intellectuelle.
                                        </p>
                                    </div>
                                    <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                                        <div className="flex items-center gap-3 mb-3">
                                            <Server className="w-5 h-5 text-primary-300" />
                                            <span className="font-bold text-sm">Architecture Scalable</span>
                                        </div>
                                        <p className="text-white/60 text-sm leading-relaxed">
                                            Déploiement cloud sécurisé avec une structure API REST robuste (PostgreSQL + Edge Functions).
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Right: Trust items */}
                        <div className="space-y-8">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                            >
                                <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white font-heading mb-4">
                                    Pourquoi Choisir <span className="text-gradient">Pharmasssit</span> ?
                                </h2>
                                <p className="text-slate-500 dark:text-slate-400 mb-8">
                                    Une solution pensée par des professionnels, pour des professionnels.
                                </p>
                            </motion.div>

                            <TrustItem
                                icon={CheckCircle2}
                                title="Précision Chirurgicale"
                                description="Logique déterministe — chaque réponse est traçable jusqu'à sa source de données. Aucune hallucination possible."
                            />
                            <TrustItem
                                icon={Database}
                                title="Bases de Données Propriétaires"
                                description="Vos données cliniques restent les vôtres. Intégration JSON personnalisée pour chaque client."
                            />
                            <TrustItem
                                icon={Globe}
                                title="Conformité Européenne"
                                description="Conforme aux normes de santé de l'UE et au Règlement Général sur la Protection des Données (RGPD)."
                            />
                            <TrustItem
                                icon={Zap}
                                title="Déploiement Rapide"
                                description="Solution SaaS cloud-native. Aucune installation locale requise. Opérationnel en 24 heures."
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════ */}
            {/* CTA SECTION                                 */}
            {/* ═══════════════════════════════════════════ */}
            <section className="py-20 md:py-28">
                <div className="max-w-4xl mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="bg-gradient-to-r from-primary-600 to-primary-500 rounded-[2rem] p-12 md:p-16 text-white text-center shadow-2xl shadow-primary-500/30 relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                        <div className="relative z-10">
                            <h2 className="text-3xl md:text-4xl font-black font-heading mb-4">
                                Prêt à Transformer Votre Pratique ?
                            </h2>
                            <p className="text-primary-100 max-w-xl mx-auto mb-8 text-lg">
                                Rejoignez les professionnels de santé belges qui font confiance à Pharmasssit pour des décisions cliniques éclairées.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <button
                                    onClick={() => navigate(user ? '/chat' : '/register')}
                                    className="group bg-white text-primary-600 font-bold px-8 py-4 rounded-2xl hover:bg-primary-50 transition-all shadow-xl flex items-center justify-center gap-3"
                                >
                                    {user ? "Accéder à l'Assistant" : "Demander une version d'essai"}
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                                {!user && (
                                    <button
                                        onClick={() => navigate('/login')}
                                        className="bg-white/10 text-white font-bold px-8 py-4 rounded-2xl hover:bg-white/20 transition-all border border-white/20 backdrop-blur-md"
                                    >
                                        Se connecter
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════ */}
            {/* FOOTER                                      */}
            {/* ═══════════════════════════════════════════ */}
            <footer className="bg-slate-900 text-white py-16">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
                        {/* Brand */}
                        <div>
                            <div className="flex items-center gap-2.5 mb-4">
                                <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
                                    <Plus className="text-white w-6 h-6 stroke-[3]" />
                                </div>
                                <span className="text-xl font-black font-heading">Pharmasssit</span>
                            </div>
                            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
                                L'Assistance Décisionnelle Intelligente pour pharmaciens, dentistes et vétérinaires en Belgique.
                            </p>
                        </div>

                        {/* Links */}
                        <div>
                            <h4 className="font-bold text-sm uppercase tracking-wider text-slate-400 mb-4">Liens Rapides</h4>
                            <ul className="space-y-3 text-sm">
                                <li><a href="#fonctionnalites" className="text-slate-400 hover:text-white transition-colors">Fonctionnalités</a></li>
                                <li><a href="#demo" className="text-slate-400 hover:text-white transition-colors">Démonstration</a></li>
                                <li><a href="#confiance" className="text-slate-400 hover:text-white transition-colors">Sécurité & Confiance</a></li>
                                <li><span onClick={() => navigate('/login')} className="text-slate-400 hover:text-white transition-colors cursor-pointer">Connexion</span></li>
                            </ul>
                        </div>

                        {/* Compliance */}
                        <div>
                            <h4 className="font-bold text-sm uppercase tracking-wider text-slate-400 mb-4">Conformité</h4>
                            <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                                <div className="flex items-center gap-3 mb-3">
                                    <Shield className="w-6 h-6 text-green-400" />
                                    <span className="font-bold text-sm">Normes UE & RGPD</span>
                                </div>
                                <p className="text-slate-400 text-xs leading-relaxed">
                                    Conforme aux normes de santé de l'Union Européenne et au Règlement Général sur la Protection des Données.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Bottom bar */}
                    <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-slate-500 text-xs">
                            © {new Date().getFullYear()} Pharmasssit. Tous droits réservés.
                        </p>
                        <p className="text-slate-500 text-xs">
                            Bruxelles, Belgique · Solution SaaS Cloud-Native
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
