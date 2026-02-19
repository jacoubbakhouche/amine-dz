import React from 'react';
import { motion } from 'framer-motion';
import {
    Activity,
    Clock,
    Calendar,
    ClipboardList,
    Pill,
    Plus,
    Users,
    Heart,
    ChevronRight,
    Search,
    Bell,
    LogOut
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../contexts/AuthContext';

// --- CARE LINK COMPONENTS ---

const MetricCard = ({ icon: Icon, title, value, unit, color, chartColor }: { icon: any, title: string, value: string, unit: string, color: string, chartColor: string }) => (
    <motion.div
        whileHover={{ y: -5 }}
        className="bg-white p-6 rounded-[32px] border border-slate-50 shadow-sm hover:shadow-xl transition-all"
    >
        <div className="flex items-center justify-between mb-6">
            <div className={`p-3 rounded-2xl bg-${color}-50`}>
                <Icon className={`w-6 h-6 text-${color}-500`} />
            </div>
            <div className="text-right">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{title}</p>
                <p className="text-2xl font-bold text-slate-800">{value}<span className="text-xs font-medium text-slate-400 ml-1">{unit}</span></p>
            </div>
        </div>
        {/* Simple Mock Chart (SVG) */}
        <div className="h-16 w-full opacity-60">
            <svg viewBox="0 0 100 30" className="w-full h-full">
                <motion.path
                    d="M 0 15 Q 10 5 20 15 Q 30 25 40 15 Q 50 5 60 15 Q 70 25 80 15 Q 90 5 100 15"
                    fill="none"
                    stroke={chartColor}
                    strokeWidth="2"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, repeat: Infinity }}
                />
            </svg>
        </div>
    </motion.div>
);

const ScheduleItem = ({ time, title, desc, icon: Icon, color, image }: { time: string, title: string, desc: string, icon?: any, color: string, image?: string }) => (
    <div className="flex gap-4 relative pb-8 last:pb-0">
        <div className="flex flex-col items-center">
            <div className="text-[10px] font-bold text-slate-400 w-12 text-center">{time}</div>
            <div className="flex-1 w-0.5 bg-slate-100 my-2" />
        </div>
        <div className="flex-1 bg-white p-5 rounded-2xl border border-slate-50 shadow-sm group hover:shadow-md transition-all">
            <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                    <h5 className="font-bold text-slate-800 text-sm group-hover:text-primary-600 transition-colors">{title}</h5>
                    <p className="text-[11px] text-slate-400 font-medium mt-1">{desc}</p>
                </div>
                {image ? (
                    <img src={image} className="w-8 h-8 rounded-full border border-slate-100" />
                ) : (
                    <div className={`p-2 rounded-xl bg-${color}-50`}>
                        {Icon && <Icon className={`w-4 h-4 text-${color}-500`} />}
                    </div>
                )}
            </div>
        </div>
    </div>
);

const ConsultationCard = ({ name, title, exp, image }: { name: string, title: string, exp: string, image: string }) => (
    <div className="bg-white p-4 rounded-3xl border border-slate-50 shadow-sm hover:shadow-md transition-all">
        <div className="flex flex-col items-center text-center">
            <img src={image} className="w-20 h-20 rounded-2xl object-cover mb-4 shadow-lg ring-4 ring-slate-50" />
            <h5 className="font-bold text-slate-800 text-sm leading-tight">{name}</h5>
            <p className="text-[10px] text-slate-400 font-bold mb-3">{title}</p>
            <div className="bg-slate-50 px-3 py-1 rounded-full text-[10px] font-bold text-slate-500 border border-slate-100 italic">
                Exp: {exp}
            </div>
        </div>
    </div>
);

const Dashboard: React.FC = () => {
    const { user, profile, signOut } = useAuth();
    const navigate = useNavigate();

    const displayName = profile?.full_name || user?.user_metadata?.full_name || 'Doctor';
    const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || '/assets/images/doctor_me.png';

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    return (
        <div className="flex h-screen bg-[#F8FAFC] text-slate-900 font-sans overflow-hidden">
            <Sidebar />

            <main className="flex-1 flex flex-col overflow-y-auto custom-scrollbar no-scrollbar pb-24 md:pb-0">
                {/* CARE LINK HEADER */}
                <header className="px-8 py-6 flex items-center justify-between sticky top-0 bg-[#F8FAFC]/80 backdrop-blur-md z-40">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30">
                            <Plus className="text-white w-6 h-6 stroke-[3]" />
                        </div>
                        <span className="text-xl font-black tracking-tight text-slate-900 font-heading">Pharmasssit</span>
                    </div>

                    <div className="flex items-center gap-6 bg-white px-6 py-2.5 rounded-full border border-slate-100 shadow-sm">
                        <nav className="flex items-center gap-6 text-xs font-bold text-slate-400">
                            <span className="text-slate-900 bg-slate-900 text-white px-4 py-1.5 rounded-full">Dashboard</span>
                            <span className="hover:text-primary-600 cursor-pointer transition-colors">Appointments</span>
                            <span className="hover:text-primary-600 cursor-pointer transition-colors">Schedule</span>
                            <span className="hover:text-primary-600 cursor-pointer transition-colors flex items-center gap-1">
                                <ClipboardList className="w-3.5 h-3.5" /> Labs Results
                            </span>
                        </nav>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="p-2.5 rounded-xl bg-white border border-slate-100 shadow-sm text-slate-400 hover:text-primary-600 transition-all">
                            <Bell className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                            <img
                                src={avatarUrl}
                                className="w-9 h-9 rounded-full border-2 border-white shadow-md cursor-pointer"
                                onClick={() => navigate('/profile')}
                            />
                            <div className="hidden xl:block">
                                <p className="text-xs font-bold text-slate-900 leading-tight truncate w-32">{displayName}</p>
                                <p className="text-[10px] font-medium text-slate-400">25 years · Admin</p>
                            </div>
                        </div>
                        <button onClick={handleLogout} className="p-2.5 rounded-xl text-rose-500 hover:bg-rose-50 transition-all">
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </header>

                <div className="p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr_320px] gap-8">
                        {/* LEFT COLUMN: GREETING + SCHEDULE */}
                        <div className="space-y-10">
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <h1 className="text-4xl md:text-5xl font-bold font-heading text-slate-900 leading-[1.1]">
                                    Hi {displayName?.split(' ')[0] || 'Doctor'}! How are you feeling today?
                                </h1>
                            </motion.div>

                            <div className="bg-white/50 p-6 rounded-[32px] border border-slate-50">
                                <div className="flex items-center justify-between mb-8">
                                    <h4 className="text-lg font-bold text-slate-800">Care Schedule</h4>
                                    <button className="text-[10px] font-bold text-slate-400 border border-slate-100 rounded-full px-4 py-1.5 flex items-center gap-2 hover:bg-white transiton-all">
                                        September 2025 <ChevronRight className="w-3 h-3" />
                                    </button>
                                </div>

                                <div className="space-y-1">
                                    <ScheduleItem
                                        time="12:00"
                                        title="Blood Pressure Check"
                                        desc="Measure BP at rest. If >140/90 mmHg, take Lisinopril 10 mg."
                                        icon={Heart}
                                        color="red"
                                    />
                                    <ScheduleItem
                                        time="16:00"
                                        title="Dr. John Smith Consultation"
                                        desc="Video Call | Prepare last 3 BP readings"
                                        image="/assets/images/doctor_avatar_male.png"
                                        color="primary"
                                    />
                                    <ScheduleItem
                                        time="18:00"
                                        title="Symptom Log"
                                        desc="Pain in the right hypochondrium."
                                        icon={Activity}
                                        color="orange"
                                    />
                                    <ScheduleItem
                                        time="20:00"
                                        title="Dinner"
                                        desc="Healthy meal"
                                        color="green"
                                    />
                                </div>
                                <button className="w-full mt-6 py-3 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-bold hover:bg-slate-50 transition-all">
                                    View All
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-lg font-bold text-slate-800">Online Consultation</h4>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <ConsultationCard
                                        name="Dorian Harker"
                                        title="MD, Cardiologist"
                                        exp="25 yrs"
                                        image="/assets/images/doctor_avatar_male_2.png"
                                    />
                                    <ConsultationCard
                                        name="Elena Vovk"
                                        title="Medical Expert"
                                        exp="5 yrs"
                                        image="/assets/images/doctor_avatar_female.png"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* CENTER: ANATOMICAL CENTERPIECE */}
                        <div className="flex items-center justify-center relative min-h-[500px]">
                            {/* Decorative Background Elements */}
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.03)_0%,transparent_70%)]" />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary-100/20 blur-[120px] rounded-full" />

                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 1 }}
                                className="relative z-10 w-full flex justify-center"
                            >
                                <img
                                    src="/assets/images/centerpiece_doctor.png"
                                    alt="Doctor Centerpiece"
                                    className="max-h-[700px] w-auto drop-shadow-2xl mix-blend-multiply opacity-100"
                                    onError={(e) => {
                                        // Fallback if the image doesn't exist
                                        e.currentTarget.src = "/assets/images/centerpiece_doctor.png";
                                    }}
                                />
                                {/* Overlay Hotspots or Info points can be added here */}
                                <div className="absolute top-[40%] right-[35%]">
                                    <motion.div
                                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        className="w-4 h-4 bg-primary-500 rounded-full shadow-[0_0_20px_rgba(59,130,246,0.6)]"
                                    />
                                </div>
                            </motion.div>
                        </div>

                        {/* RIGHT COLUMN: METRIC CARDS */}
                        <div className="space-y-6">
                            <MetricCard
                                icon={Heart}
                                title="Heart rate"
                                value="80-90"
                                unit="bpm"
                                color="red"
                                chartColor="#ef4444"
                            />

                            <MetricCard
                                icon={Activity}
                                title="Brain activity"
                                value="90-150"
                                unit="Hz"
                                color="primary"
                                chartColor="#3b82f6"
                            />

                            <div className="bg-white p-6 rounded-[32px] border border-slate-50 shadow-sm relative overflow-hidden group">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="p-3 rounded-2xl bg-primary-50">
                                        <div className="bg-primary-500 rounded-full w-5 h-5 flex items-center justify-center">
                                            <div className="bg-white w-2.5 h-2.5 rounded-full" />
                                        </div>
                                    </div>
                                    <span className="bg-primary-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase">Normal</span>
                                </div>
                                <h5 className="font-bold text-slate-900 mb-4">Chest X-Ray</h5>
                                <div className="space-y-4">
                                    {[
                                        { label: 'Ribs', val: 0.8 },
                                        { label: 'Spine', val: 0.65 },
                                        { label: 'Diaphragm', val: 0.9 },
                                        { label: 'Organs', val: 0.75 }
                                    ].map((item, i) => (
                                        <div key={i} className="space-y-1.5">
                                            <div className="flex justify-between text-[10px] font-bold text-slate-400 tracking-wider">
                                                <span>{item.label}</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-50 rounded-full">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${item.val * 100}%` }}
                                                    transition={{ duration: 1, delay: i * 0.2 }}
                                                    className="h-full bg-primary-500 rounded-full"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-slate-900 p-6 rounded-[32px] text-white shadow-2xl shadow-slate-900/40">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md">
                                            <Pill className="text-white w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[2px]">Your Medications</p>
                                            <p className="text-lg font-black italic">Today: 8</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white/5 rounded-2xl p-4 border border-white/10 mb-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <p className="text-[10px] font-bold text-slate-400">Take at 8:00 AM</p>
                                        <button className="bg-primary-500 text-[10px] font-bold px-3 py-1 rounded-full hover:bg-primary-600 transition-all">
                                            Take now
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="bg-slate-800 p-2 rounded-xl">
                                            <ClipboardList className="w-8 h-8 opacity-50" />
                                        </div>
                                        <div>
                                            <h6 className="font-bold text-sm">Plavix .75mg</h6>
                                            <p className="text-[10px] text-slate-400">75 mg, 14 tablets</p>
                                        </div>
                                    </div>
                                </div>

                                <button className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all">
                                    Done
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

export default Dashboard;
