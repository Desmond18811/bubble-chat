import { useState, useEffect } from "react";

// --- Tailwind config is assumed to be set up with the custom tokens from the original.
// All custom color names are used as arbitrary values where needed (e.g. bg-[#010f20]).

const NAV_LINKS = ["Discover", "Live", "Editorial"];

const BENTO_ITEMS = [
    {
        col: "md:col-span-8",
        bg: "glass-panel",
        border: "border-outline-variant/10",
        content: (
            <div className="flex flex-col justify-between h-full">
                <div className="relative z-10">
                    <span className="text-[#ffe792] font-bold text-7xl opacity-5 absolute -top-8 -left-4 font-['Space_Grotesk']">
                        01
                    </span>
                    <h3 className="font-['Space_Grotesk'] font-bold text-3xl mb-4 text-[#ffe792]">
                        Dynamic Threading
                    </h3>
                    <p className="text-[#9eacc3] text-lg max-w-md leading-relaxed">
                        Conversations that evolve. Watch messages coalesce into
                        architectural knowledge bases in real-time.
                    </p>
                </div>
                <div className="mt-12 self-end w-full max-w-md h-40 bg-[#0c2037]/30 rounded-2xl border border-[#3b495c]/10 p-8 flex flex-col justify-center gap-4">
                    <div className="h-3 bg-[#ffe792]/20 rounded-full w-3/4" />
                    <div className="h-3 bg-[#ffe792]/10 rounded-full w-full" />
                    <div className="h-3 bg-[#ffe792]/5 rounded-full w-1/2" />
                </div>
            </div>
        ),
    },
    {
        col: "md:col-span-4",
        bg: "bg-[#24477a]/20",
        border: "border-[#a2c2fd]/20",
        content: (
            <div className="flex flex-col justify-end h-full">
                <span className="material-symbols-outlined text-[#ffe792] text-5xl mb-8">
                    bolt
                </span>
                <h3 className="font-['Space_Grotesk'] font-bold text-2xl mb-4 text-[#d8e6ff]">
                    Instant Latency
                </h3>
                <p className="text-[#9eacc3] leading-relaxed">
                    Global edge synchronization ensuring your transmission hits the
                    observatory at sub-millisecond speeds.
                </p>
            </div>
        ),
    },
    {
        col: "md:col-span-4",
        bg: "glass-panel bg-[#0c2037]/40",
        border: "border-[#3b495c]/10",
        content: (
            <>
                <span className="material-symbols-outlined text-[#ffe792] text-4xl mb-6">
                    visibility
                </span>
                <h3 className="font-['Space_Grotesk'] font-bold text-xl mb-3 text-[#d8e6ff]">
                    Optic Privacy
                </h3>
                <p className="text-[#9eacc3] text-sm leading-relaxed">
                    Encrypted at the focal point. Only your invited observers can view the
                    spectrum with high fidelity.
                </p>
            </>
        ),
    },
    {
        col: "md:col-span-8",
        bg: "bg-[#11273f]/40",
        border: "border-[#3b495c]/10",
        content: (
            <div className="flex items-center justify-between h-full">
                <div className="max-w-xs">
                    <h3 className="font-['Space_Grotesk'] font-bold text-2xl mb-3 text-[#ffe792]">
                        Deep Editorial
                    </h3>
                    <p className="text-[#9eacc3] text-sm leading-relaxed">
                        The platform adapts its typography and layout based on the density
                        of your transmissions.
                    </p>
                </div>
                <div className="hidden sm:block text-8xl font-bold text-[#11273f]/30 tracking-tighter select-none font-['Space_Grotesk']">
                    DATA
                </div>
            </div>
        ),
    },
];

const WORKSPACE_FEATURES = [
    {
        icon: "check_circle",
        title: "Persistence Engines",
        desc: "Your workspace stays alive even when you're offline, preserving every layer of synthesis.",
    },
    {
        icon: "spatial_audio_off",
        title: "Spatial Audio Nodes",
        desc: "Hear your team as if you were in the same physical room, powered by directional acoustic modeling.",
    },
];

const FOOTER_PLATFORM = ["Discover", "Live Transmissions", "Editorial", "Mobile App"];
const FOOTER_COMPANY = ["Our Vision", "Careers", "Contact", "Press"];
const FOOTER_SOCIAL = ["share", "language"];

export default function BubbleObservatory() {
    const [email, setEmail] = useState("");
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 40);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <div
            className="bg-[#010f20] text-[#d8e6ff] font-['Manrope'] selection:bg-[#ffe792] selection:text-[#655400] min-h-screen"
            style={{ fontFamily: "'Manrope', sans-serif" }}
        >
            {/* Google Fonts */}
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700;900&family=Manrope:wght@300;400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
        .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
        .glass-panel { background: rgba(17,39,63,0.4); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); }
        .text-glow { text-shadow: 0 0 20px rgba(255,231,146,0.3); }
        .bg-void { background: radial-gradient(circle at 50% 50%, #0c2037 0%, #010f20 100%); }
        .active-item-indicator { box-shadow: 0 0 15px rgba(255,231,146,0.2); }
        @keyframes fadeInUp { from { opacity:0; transform:translateY(32px); } to { opacity:1; transform:translateY(0); } }
        .animate-fadeInUp { animation: fadeInUp 0.8s ease both; }
        .delay-1 { animation-delay: 0.1s; }
        .delay-2 { animation-delay: 0.22s; }
        .delay-3 { animation-delay: 0.38s; }
        .delay-4 { animation-delay: 0.52s; }
        .delay-5 { animation-delay: 0.66s; }
      `}</style>

            {/* NAV */}
            <nav
                className={`fixed top-0 w-full z-50 h-20 px-10 flex justify-between items-center border-b border-[#3b495c]/10 transition-all duration-300 ${scrolled
                    ? "bg-[#010f20]/95 backdrop-blur-xl"
                    : "bg-[#010f20]/80 backdrop-blur-xl"
                    }`}
            >
                <div className="flex items-center gap-12">
                    <div className="text-2xl font-bold text-[#ffe792] bg-[#010f20] p-2 rounded-lg font-['Space_Grotesk']">
                        <img src="/icon.png" alt="Logo" className="w-10 h-10" />
                    </div>
                    <div className="hidden md:flex items-center gap-10 font-['Space_Grotesk'] text-[11px] uppercase tracking-[0.2em]">
                        {NAV_LINKS.map((link, i) => (
                            <a
                                key={link}
                                href="#"
                                className={`transition-colors duration-300 ${i === 0
                                    ? "text-[#ffe792]"
                                    : "text-[#9eacc3] hover:text-[#ffe792]"
                                    }`}
                            >
                                {link}
                            </a>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-8">
                    <button className="text-[#9eacc3] hover:text-[#ffe792] transition-all duration-300">
                        <span className="material-symbols-outlined">notifications</span>
                    </button>
                    <div className="h-8 w-px bg-[#3b495c]/20" />
                    <div className="w-10 h-10 rounded-full border border-[#3b495c]/30 overflow-hidden">
                        <img
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDgE2Iu_amBA6sk1xuR_kFeJN9X3uI257peN31sPmDBd0jFsQNFnefDOGEKKhJ3atxOMiaGM-g8ScxsdqcUsLv0ZXhvl-hyziVnYEgTjo70yyYbOMvyB7ukSg7SFWW6y5ODyYizi6zlA_KW8smmvZ1bYwYSUNCdoyllYro7m4n3juTGCegxyTD-TltbdZlEVU4W7dUQmL4EHpMQDT3uHOhKufKsN0wCbtY9PriGRfKgJsqT2v-Cb9CJBCR_Dk89pZOjwKU6U4JZx21v"
                            alt="User profile"
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>
            </nav>

            {/* HERO */}
            <main className="relative pt-20 overflow-hidden bg-void min-h-screen">
                <div className="container mx-auto px-10 pt-32 pb-40 relative z-10">
                    <div className="flex flex-col items-center text-center">
                        <div className="animate-fadeInUp inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#ffe792]/10 border border-[#ffe792]/20 mb-10">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#ffe792] shadow-[0_0_8px_#ffe792]" />
                            <span className="text-[#ffe792] font-['Space_Grotesk'] font-bold text-[10px] uppercase tracking-[0.2em]">
                                Observatory Live
                            </span>
                        </div>
                        <h1 className="animate-fadeInUp delay-1 font-['Space_Grotesk'] font-bold text-6xl md:text-8xl lg:text-9xl tracking-tight mb-10 leading-[0.95]">
                            <span className="text-[#d8e6ff]">THE ETHEREAL</span>
                            <br />
                            <span className="text-[#ffe792] text-glow">OBSERVATORY</span>
                        </h1>
                        <p className="animate-fadeInUp delay-2 max-w-2xl text-[#9eacc3] text-lg md:text-xl font-light leading-relaxed mb-14">
                            Traverse a liquid editorial interface designed for deep focus.
                            Experience high-frequency intelligence through layers of optic
                            clarity.
                        </p>
                        <div className="animate-fadeInUp delay-3 flex flex-col sm:flex-row gap-6">
                            <button className="bg-[#ffe792] text-[#655400] px-12 py-5 rounded-xl font-['Space_Grotesk'] font-bold text-lg hover:scale-105 active:scale-95 transition-transform shadow-2xl shadow-[#ffe792]/20">
                                Join the Observatory
                            </button>
                            <button className="glass-panel text-[#ffe792] border border-[#ffe792]/20 px-12 py-5 rounded-xl font-['Space_Grotesk'] font-bold text-lg hover:bg-[#ffe792]/5 transition-all">
                                Explore Transmissions
                            </button>
                        </div>
                    </div>
                </div>

                {/* Floating UI Elements */}
                <div className="relative w-full max-w-7xl mx-auto px-10 h-[400px] md:h-[600px] mt-12 mb-32">
                    {/* Transmissions card */}
                    <div className="absolute top-0 left-0 md:left-12 w-72 md:w-96 glass-panel rounded-3xl p-6 shadow-2xl border border-white/5 -rotate-[4deg] z-20 animate-fadeInUp delay-4">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="font-['Space_Grotesk'] font-bold text-xl text-[#ffe792]">
                                Transmissions
                            </h3>
                            <span className="material-symbols-outlined text-[#9eacc3]">
                                edit_square
                            </span>
                        </div>
                        <div className="space-y-6">
                            {[
                                {
                                    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuBUXQ4s67PsBWXJ7OUejnN7N8yiTdw9UAASP207Cc9RlpmT5mFNZelvg209vhdriQXnGl92I7bIWjw0eZbG00YD_ZcDPptS-VK4AY32qJiiqLgVC2HejnPhHd-XEgt7PAuL678Vx0fHAuH1wL07o7T2ihjdpCOWPtfAv85xRa_b2YFgoqyF5imvyy3C3ZIXKjjmbcFsHzp5a8Gjxseu77ogYJBOu-r-HvnZsZdVLP5JrqMSi_vu4H3uwlwlwp6HYP3RWfAVj5XgiPTb",
                                    name: "Echo-01",
                                    time: "2m ago",
                                    msg: "The prism logic is rendering now...",
                                    dim: false,
                                },
                                {
                                    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuC3Sburno8peBLb25qG9VgMgJ-ZwcatkFsSzh9_RPUcNTv86pYfiVutOLEAMmwu6zXtFgW_enCn0fdMvKXpNRRLoMdbzt1AHyHLF-l3QiNhF4QakBtytpJAhgAK1LvM3I9yPjYFG_4HnhwgbVK4FQmORvzFkN2dXSIWBd3uwNUHoobTwoeS9wb8wPKOdHOWZUEdeDEb7t-SFVuRQhOBC6VQGhYwWQ3n4RqAoJDJ53Ls6exHIe61CwOyl7PPOw7gMOxKo6cRh0jc7uVX",
                                    name: "NeuralLink",
                                    time: "15m ago",
                                    msg: "Update the editorial grid.",
                                    dim: true,
                                },
                            ].map((item) => (
                                <div
                                    key={item.name}
                                    className={`flex items-center gap-4 ${item.dim ? "opacity-40" : ""}`}
                                >
                                    <div className="w-12 h-12 rounded-lg bg-[#0c2037] overflow-hidden border border-[#3b495c]/20 flex-shrink-0">
                                        <img
                                            src={item.src}
                                            alt="Avatar"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-sm font-bold text-[#d8e6ff]">
                                                {item.name}
                                            </span>
                                            <span className="text-[10px] text-[#9eacc3] uppercase font-['Space_Grotesk']">
                                                {item.time}
                                            </span>
                                        </div>
                                        <p className="text-xs text-[#9eacc3] truncate">{item.msg}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Meet mockup */}
                    <div className="absolute top-20 right-0 md:right-12 w-80 md:w-[480px] glass-panel rounded-[2rem] overflow-hidden shadow-2xl border border-[#ffe792]/10 rotate-[2deg] z-30 animate-fadeInUp delay-5">
                        <div className="aspect-video bg-[#010f20] relative">
                            <img
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDAJkz7nTHQJXbHdF3S02N8xlqMPX22cSM-wjHxQiQitfePhkrUdT5XURTExq_mPYcxr5DxJS0yTazcR74Y24i92Sgvyw3nX7ltjTmIjjWUnVFNCY0LlIeYhYAkyHCA_pHZjiTalww0gOgI3K7oeBOj-qyvsbhnzMtgLLWIB_B7Lwxjh26syDYYp7H5GqD4G4Iz1ZTffDX7UxfhYQiVCo6qHlBrzWJRrmf_YGSoJkDzeRggv0tKlOZulzFZFN7bOB1SX8AatV19IXs4"
                                alt="UI View"
                                className="w-full h-full object-cover opacity-40"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="flex gap-5">
                                    <button className="w-14 h-14 rounded-full bg-[#9f0519] flex items-center justify-center text-[#d8e6ff] shadow-lg shadow-red-900/20 hover:scale-110 transition-transform">
                                        <span className="material-symbols-outlined">call_end</span>
                                    </button>
                                    <button className="w-14 h-14 rounded-full bg-[#162d48] flex items-center justify-center text-[#ffe792] border border-[#ffe792]/20 hover:scale-110 transition-transform">
                                        <span
                                            className="material-symbols-outlined"
                                            style={{ fontVariationSettings: "'FILL' 1" }}
                                        >
                                            mic
                                        </span>
                                    </button>
                                </div>
                            </div>
                            <div className="absolute bottom-4 left-4">
                                <div className="px-3 py-1 rounded-full bg-[#010f20]/60 backdrop-blur-md text-[9px] font-bold border border-[#ffe792]/30 uppercase tracking-[0.2em] text-[#ffe792]">
                                    Recording
                                </div>
                            </div>
                        </div>
                        <div className="p-8 flex items-center justify-between bg-[#0c2037]/60">
                            <div>
                                <h4 className="font-['Space_Grotesk'] font-bold text-lg text-[#d8e6ff]">
                                    Obsidian Sync
                                </h4>
                                <p className="text-[11px] text-[#9eacc3] uppercase font-['Space_Grotesk'] tracking-widest">
                                    4 Active Participants
                                </p>
                            </div>
                            <div className="flex -space-x-3">
                                {[
                                    "https://lh3.googleusercontent.com/aida-public/AB6AXuDaIqhVHtAgvV9nNx8tlHFDmCWcWsDsZ5rZTWUojwoTd3Qu-seflSPL9Djet_KJI9DLF_b1V2ChkMnkcixOJqy9X4ZSlUbOwJMXr9l_jzM0ObfaA2QrHZLlIwzMBkXvb7e7LzMmn63Qp2h1Bd7mZVnSRHBmjXETJvME834KhJkNUFDuyaHKawGdsQCiiQyHdaoiZ8SApR4-vA2-kNl1kZK_wlmvQMFVTjQDK-0YGgPPcwuNBwDhUw90DYnaw4FAgg1_NEqmrFEPW0E7",
                                    "https://lh3.googleusercontent.com/aida-public/AB6AXuCvPmJwKKXu9lX_fLC_4PVJ0YYve77EhZwhalypHFZCNNIhxsKhe4tIwCaM87ovvbUIoVAzQniFdsVRyCD0WEVPUAILbZMze2JWFv_YxNsC8CGei5wgPxTCd5Q7ycWcS7xzClt4qKy3VnB0qnZeUrN6c9-8YKd7UcOUWv0W8dStoyqV17nhBcMPR3pwkUjUp4qYcNzhYODU7Bt7Sqmm3FRDAfsbXJMn3L6LqOJnr3lzvR4nEoyObjQbmaijFnVqza9tojfFzg0DQRbF",
                                ].map((src, i) => (
                                    <div
                                        key={i}
                                        className="w-9 h-9 rounded-full border-2 border-[#0c2037] bg-[#071a2f] overflow-hidden"
                                    >
                                        <img
                                            src={src}
                                            alt="User"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ))}
                                <div className="w-9 h-9 rounded-full border-2 border-[#0c2037] bg-[#ffe792] flex items-center justify-center text-[#655400] text-[10px] font-bold">
                                    +2
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* BENTO: Real-time Transmissions */}
            <section className="py-32 bg-[#000000] relative border-t border-[#3b495c]/10">
                <div className="container mx-auto px-10">
                    <div className="mb-20">
                        <h2 className="font-['Space_Grotesk'] font-bold text-4xl md:text-5xl tracking-tight text-[#d8e6ff] mb-4 uppercase">
                            Real-time Transmissions
                        </h2>
                        <div className="h-1 w-20 bg-[#ffe792] shadow-[0_0_10px_#ffe792]" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                        {BENTO_ITEMS.map((item, i) => (
                            <div
                                key={i}
                                className={`${item.col} ${item.bg} p-12 rounded-[2rem] border ${item.border} min-h-[400px] flex flex-col`}
                            >
                                {item.content}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* COLLABORATIVE WORKSPACES */}
            <section className="py-32 bg-[#010f20] overflow-hidden">
                <div className="container mx-auto px-10">
                    <div className="flex flex-col lg:flex-row items-center gap-24">
                        {/* Image panel */}
                        <div className="flex-1 order-2 lg:order-1">
                            <div className="relative">
                                <div className="absolute -inset-24 bg-[#ffe792]/5 blur-[120px] rounded-full" />
                                <div className="relative glass-panel bg-[#071a2f] border border-[#3b495c]/20 rounded-[3rem] p-5 aspect-square max-w-lg mx-auto overflow-hidden shadow-2xl">
                                    <div className="w-full h-full bg-[#010f20] rounded-[2.5rem] overflow-hidden relative">
                                        <img
                                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBTjSJ_fhUO6x45uAldi_kbITUC1w9-9S7c0H1uJzjwea7vxPj9heXZaFDqkDcdQlQvTmzllEFXFFM4iiNHj6BUn8HwH2Pa5tPhkV9xvufJFCr-IxE_5_0ir-xUD9T2zO6zZyIojzj9QQcvd5tOOI8r8t2l8Z5Dzbf97Hs44fDxmvB_HGzlXVYKTDe6tQME6i71zO7p7Xz5m_pgbba2kIN6KVqER5DqzbqRQ4dfBKsBahZcuA_pp4-2f3GSbN_4Yjg4uU7uTsoFo5Ya"
                                            alt="Workspace View"
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#010f20] via-transparent to-transparent opacity-60" />
                                    </div>
                                    {/* Status overlay card */}
                                    <div className="absolute top-16 -right-12 glass-panel bg-[#162d48]/80 p-6 rounded-2xl shadow-2xl border border-[#ffe792]/20 w-56">
                                        <p className="text-[10px] font-['Space_Grotesk'] font-bold uppercase text-[#ffe792] tracking-[0.2em] mb-2">
                                            Status
                                        </p>
                                        <p className="text-sm font-bold text-[#d8e6ff]">
                                            Syncing Luminous Orbit...
                                        </p>
                                        <div className="mt-4 w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                                            <div className="w-2/3 h-full bg-[#ffe792] rounded-full shadow-[0_0_8px_#ffe792]" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Text panel */}
                        <div className="flex-1 order-1 lg:order-2">
                            <h2 className="font-['Space_Grotesk'] font-bold text-5xl md:text-7xl tracking-tight text-[#d8e6ff] mb-10 uppercase leading-[0.9]">
                                Collaborative
                                <br />
                                <span className="text-[#ffe792] text-glow">Workspaces</span>
                            </h2>
                            <p className="text-[#9eacc3] text-lg mb-14 leading-relaxed max-w-xl">
                                The Observatory is more than a view. It's a shared spatial
                                environment where teams synthesize complex ideas through
                                interactive glass modules and persistent canvas states.
                            </p>
                            <ul className="space-y-8">
                                {WORKSPACE_FEATURES.map((feat) => (
                                    <li key={feat.title} className="flex items-start gap-5">
                                        <span className="w-10 h-10 rounded-xl bg-[#ffe792]/10 border border-[#ffe792]/20 flex items-center justify-center flex-shrink-0">
                                            <span className="material-symbols-outlined text-[#ffe792] text-lg">
                                                {feat.icon}
                                            </span>
                                        </span>
                                        <div>
                                            <h4 className="font-bold text-[#d8e6ff] text-lg">
                                                {feat.title}
                                            </h4>
                                            <p className="text-sm text-[#9eacc3] leading-relaxed">
                                                {feat.desc}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-16">
                                <button className="flex items-center gap-4 text-[#ffe792] font-['Space_Grotesk'] font-bold text-xl group">
                                    Learn about Synthesis
                                    <span className="material-symbols-outlined group-hover:translate-x-3 transition-transform">
                                        arrow_forward
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-32">
                <div className="container mx-auto px-10">
                    <div className="glass-panel bg-gradient-to-br from-[#0c2037]/80 to-[#071a2f]/40 rounded-[4rem] p-16 md:p-32 text-center border border-[#3b495c]/20 relative overflow-hidden">
                        <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#ffe792]/10 blur-[150px] rounded-full" />
                        <div className="relative z-10">
                            <h2 className="font-['Space_Grotesk'] font-bold text-5xl md:text-8xl text-[#d8e6ff] tracking-tight mb-10 uppercase leading-[0.9]">
                                Ready to join
                                <br />
                                the void?
                            </h2>
                            <p className="text-[#9eacc3] text-xl max-w-2xl mx-auto mb-16 leading-relaxed">
                                Limited observatory access is now opening for early
                                synthesizers. Secure your frequency today.
                            </p>
                            <button className="bg-[#ffe792] text-[#655400] px-16 py-7 rounded-2xl font-['Space_Grotesk'] font-bold text-2xl hover:scale-105 active:scale-95 transition-transform shadow-2xl shadow-[#ffe792]/30">
                                GET STARTED
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="bg-[#000000] pt-32 pb-16 border-t border-[#3b495c]/10">
                <div className="container mx-auto px-10">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-16 mb-24">
                        <div className="col-span-2">
                            <div className="text-3xl font-bold text-[#ffe792] bg-[#010f20] p-2 rounded-lg font-['Space_Grotesk'] inline-block mb-8">
                                <img src="/icon.png" alt="Logo" className="w-10 h-10" />
                            </div>
                            <p className="text-[#9eacc3] text-sm max-w-xs mb-10 leading-relaxed">
                                The Ethereal Observatory. A new horizon for digital synthesis
                                and high-frequency communication.
                            </p>
                            <div className="flex gap-5">
                                {FOOTER_SOCIAL.map((icon) => (
                                    <button
                                        key={icon}
                                        className="w-12 h-12 rounded-xl border border-[#3b495c]/20 bg-[#071a2f] flex items-center justify-center text-[#9eacc3] hover:text-[#ffe792] hover:border-[#ffe792]/40 transition-all"
                                    >
                                        <span className="material-symbols-outlined text-lg">
                                            {icon}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h5 className="font-['Space_Grotesk'] font-bold text-[#d8e6ff] mb-8 uppercase tracking-widest text-sm">
                                Platform
                            </h5>
                            <ul className="space-y-5 text-sm text-[#9eacc3]">
                                {FOOTER_PLATFORM.map((item) => (
                                    <li key={item}>
                                        <a
                                            href="#"
                                            className="hover:text-[#ffe792] transition-colors"
                                        >
                                            {item}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <h5 className="font-['Space_Grotesk'] font-bold text-[#d8e6ff] mb-8 uppercase tracking-widest text-sm">
                                Company
                            </h5>
                            <ul className="space-y-5 text-sm text-[#9eacc3]">
                                {FOOTER_COMPANY.map((item) => (
                                    <li key={item}>
                                        <a
                                            href="#"
                                            className="hover:text-[#ffe792] transition-colors"
                                        >
                                            {item}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="col-span-2">
                            <h5 className="font-['Space_Grotesk'] font-bold text-[#d8e6ff] mb-8 uppercase tracking-widest text-sm">
                                Stay Tuned
                            </h5>
                            <div className="flex gap-3">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Observatory Frequency"
                                    className="flex-1 bg-[#071a2f] border border-[#3b495c]/20 rounded-xl px-5 py-3 text-sm focus:ring-1 focus:ring-[#ffe792]/40 focus:border-[#ffe792]/40 outline-none text-[#d8e6ff] placeholder:text-[#9eacc3]/40"
                                />
                                <button className="bg-[#ffe792] text-[#655400] px-8 rounded-xl font-bold text-sm hover:scale-105 transition-transform">
                                    Join
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-center pt-16 border-t border-[#3b495c]/10 text-[10px] text-[#9eacc3] uppercase tracking-[0.3em] font-bold">
                        <p>© 2024 BUBBLE FOUNDATION. ALL FREQUENCIES RESERVED.</p>
                        <div className="flex gap-10 mt-8 md:mt-0">
                            <a href="#" className="hover:text-[#ffe792] transition-colors">
                                Privacy Protocol
                            </a>
                            <a href="#" className="hover:text-[#ffe792] transition-colors">
                                Terms of Service
                            </a>
                        </div>
                    </div>
                </div>
            </footer>

            {/* MOBILE BOTTOM NAV */}
            <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 bg-[#010f20]/90 backdrop-blur-xl flex justify-around items-center pt-4 pb-10 px-6 border-t border-[#3b495c]/20 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                {[
                    { icon: "home", label: "Home", active: true },
                    { icon: "search", label: "Search", active: false },
                    { icon: "add", label: "", center: true },
                    { icon: "favorite", label: "Alerts", active: false },
                    { icon: "person", label: "Profile", active: false },
                ].map((item, i) =>
                    item.center ? (
                        <div key={i} className="flex flex-col items-center">
                            <div className="w-12 h-12 bg-[#ffe792] rounded-full flex items-center justify-center text-[#655400] shadow-lg shadow-[#ffe792]/20 -mt-8 border-4 border-[#010f20]">
                                <span className="material-symbols-outlined">{item.icon}</span>
                            </div>
                        </div>
                    ) : (
                        <div
                            key={i}
                            className={`flex flex-col items-center font-['Space_Grotesk'] text-[10px] uppercase tracking-widest gap-1 ${item.active ? "text-[#ffe792]" : "text-[#9eacc3]"
                                }`}
                        >
                            <span className="material-symbols-outlined">{item.icon}</span>
                            <span>{item.label}</span>
                        </div>
                    )
                )}
            </nav>
        </div>
    );
}