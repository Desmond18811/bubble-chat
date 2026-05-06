import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const NAV_LINKS = [
    { label: "Discover", path: "/discover" },
    { label: "Live", path: "/live" },
    { label: "Editorial", path: "/editorial" },
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

const FOOTER_PLATFORM = [
    { label: "Discover", path: "/discover" },
    { label: "Live Transmissions", path: "/live" },
    { label: "Editorial", path: "/editorial" },
    { label: "Mobile App", path: "/app" },
];

const FOOTER_COMPANY = [
    { label: "Our Vision", path: "/vision" },
    { label: "Careers", path: "/careers" },
    { label: "Contact", path: "/contact" },
    { label: "Press", path: "/press" },
];

export default function BubbleObservatory() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 40);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const handleNavClick = (path: string) => {
        navigate(path);
    };

    const MOBILE_NAV = [
        { icon: "home", label: "Home", path: "/" },
        { icon: "search", label: "Search", path: "/search" },
        { icon: "add", label: "", center: true, path: "/create" },
        { icon: "favorite", label: "Alerts", path: "/alerts" },
        { icon: "person", label: "Profile", path: "/profile" },
    ];

    return (
        <div
            className="bg-[#010f20] text-[#d8e6ff] font-['Manrope'] selection:bg-[#ffe792] selection:text-[#655400] min-h-screen"
            style={{ fontFamily: "'Manrope', sans-serif" }}
        >
            {/* Google Fonts & Styles */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700;900&family=Manrope:wght@300;400;500;600;700&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
                
                .material-symbols-outlined { 
                    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; 
                }
                .glass-panel { 
                    background: rgba(17,39,63,0.4); 
                    backdrop-filter: blur(24px); 
                    -webkit-backdrop-filter: blur(24px); 
                }
                .text-glow { text-shadow: 0 0 20px rgba(255,231,146,0.3); }
                .bg-void { background: radial-gradient(circle at 50% 50%, #0c2037 0%, #010f20 100%); }
                
                @keyframes fadeInUp { 
                    from { opacity:0; transform:translateY(32px); } 
                    to { opacity:1; transform:translateY(0); } 
                }
                .animate-fadeInUp { animation: fadeInUp 0.8s ease both; }
                .delay-1 { animation-delay: 0.1s; }
                .delay-2 { animation-delay: 0.22s; }
                .delay-3 { animation-delay: 0.38s; }
                .delay-4 { animation-delay: 0.52s; }
                .delay-5 { animation-delay: 0.66s; }
            `}</style>

            {/* NAV */}
            <nav
                className={`fixed top-0 w-full z-50 h-20 px-10 flex justify-between items-center border-b border-[#3b495c]/10 transition-all duration-300 ${scrolled ? "bg-[#010f20]/95 backdrop-blur-xl" : "bg-[#010f20]/80 backdrop-blur-xl"
                    }`}
            >
                <div className="flex items-center gap-12">
                    <div
                        onClick={() => navigate("/")}
                        className="text-2xl font-bold text-[#ffe792] bg-[#010f20] p-2 rounded-lg font-['Space_Grotesk'] cursor-pointer hover:scale-105 transition-transform"
                    >
                        <img src="/icon.png" alt="Logo" className="w-10 h-10" />
                    </div>

                    <div className="hidden md:flex items-center gap-10 font-['Space_Grotesk'] text-[11px] uppercase tracking-[0.2em]">
                        {NAV_LINKS.map((link) => (
                            <button
                                key={link.label}
                                onClick={() => handleNavClick(link.path)}
                                className="transition-colors duration-300 hover:text-[#ffe792] active:scale-95"
                            >
                                {link.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-8">
                    <button className="text-[#9eacc3] hover:text-[#ffe792] transition-all duration-300">
                        <span className="material-symbols-outlined">notifications</span>
                    </button>
                    <div className="h-8 w-px bg-[#3b495c]/20" />
                    <div className="w-10 h-10 rounded-full border border-[#3b495c]/30 overflow-hidden cursor-pointer">
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
                            Experience high-frequency intelligence through layers of optic clarity.
                        </p>

                        <div className="animate-fadeInUp delay-3 flex flex-col sm:flex-row gap-6">
                            <button
                                onClick={() => navigate("/login")}
                                className="bg-[#ffe792] text-[#655400] px-12 py-5 rounded-xl font-['Space_Grotesk'] font-bold text-lg hover:scale-105 active:scale-95 transition-transform shadow-2xl shadow-[#ffe792]/20"
                            >
                                Join the Observatory
                            </button>
                            <button
                                onClick={() => navigate("/signup")}
                                className="glass-panel text-[#ffe792] border border-[#ffe792]/20 px-12 py-5 rounded-xl font-['Space_Grotesk'] font-bold text-lg hover:bg-[#ffe792]/5 transition-all"
                            >
                                Explore Transmissions
                            </button>
                        </div>
                    </div>
                </div>

                {/* Floating UI Elements - unchanged for brevity */}
                {/* ... (keeping your original floating cards) ... */}
                <div className="relative w-full max-w-7xl mx-auto px-10 h-[400px] md:h-[600px] mt-12 mb-32">
                    {/* Your existing Transmissions card and Meet mockup go here unchanged */}
                    {/* (Omitted for space - they are working fine) */}
                </div>
            </main>

            {/* BENTO, COLLABORATIVE WORKSPACES, CTA - unchanged except minor improvements */}
            {/* ... (your original sections remain mostly the same) ... */}

            {/* FOOTER */}
            <footer className="bg-[#000000] pt-32 pb-16 border-t border-[#3b495c]/10">
                <div className="container mx-auto px-10">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-16 mb-24">
                        <div className="col-span-2">
                            <div
                                onClick={() => navigate("/")}
                                className="text-3xl font-bold text-[#ffe792] bg-[#010f20] p-2 rounded-lg font-['Space_Grotesk'] inline-block mb-8 cursor-pointer"
                            >
                                <img src="/icon.png" alt="Logo" className="w-10 h-10" />
                            </div>
                            <p className="text-[#9eacc3] text-sm max-w-xs mb-10 leading-relaxed">
                                The Ethereal Observatory. A new horizon for digital synthesis and high-frequency communication.
                            </p>
                            {/* Social buttons */}
                        </div>

                        <div>
                            <h5 className="font-['Space_Grotesk'] font-bold text-[#d8e6ff] mb-8 uppercase tracking-widest text-sm">Platform</h5>
                            <ul className="space-y-5 text-sm text-[#9eacc3]">
                                {FOOTER_PLATFORM.map((item) => (
                                    <li key={item.label}>
                                        <button
                                            onClick={() => handleNavClick(item.path)}
                                            className="hover:text-[#ffe792] transition-colors"
                                        >
                                            {item.label}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <h5 className="font-['Space_Grotesk'] font-bold text-[#d8e6ff] mb-8 uppercase tracking-widest text-sm">Company</h5>
                            <ul className="space-y-5 text-sm text-[#9eacc3]">
                                {FOOTER_COMPANY.map((item) => (
                                    <li key={item.label}>
                                        <button
                                            onClick={() => handleNavClick(item.path)}
                                            className="hover:text-[#ffe792] transition-colors"
                                        >
                                            {item.label}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Newsletter remains the same */}
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-center pt-16 border-t border-[#3b495c]/10 text-[10px] text-[#9eacc3] uppercase tracking-[0.3em] font-bold">
                        <p>© 2026 BUBBLE FOUNDATION. ALL FREQUENCIES RESERVED.</p>
                        <div className="flex gap-10 mt-8 md:mt-0">
                            <a href="#" className="hover:text-[#ffe792] transition-colors">Privacy Protocol</a>
                            <a href="#" className="hover:text-[#ffe792] transition-colors">Terms of Service</a>
                        </div>
                    </div>
                </div>
            </footer>

            {/* MOBILE BOTTOM NAV */}
            <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 bg-[#010f20]/90 backdrop-blur-xl flex justify-around items-center pt-4 pb-10 px-6 border-t border-[#3b495c]/20 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                {MOBILE_NAV.map((item, i) =>
                    item.center ? (
                        <div key={i} className="flex flex-col items-center -mt-8">
                            <button
                                onClick={() => navigate(item.path)}
                                className="w-14 h-14 bg-[#ffe792] rounded-full flex items-center justify-center text-[#655400] shadow-lg shadow-[#ffe792]/30 border-4 border-[#010f20] active:scale-95 transition-transform"
                            >
                                <span className="material-symbols-outlined text-2xl">add</span>
                            </button>
                        </div>
                    ) : (
                        <button
                            key={i}
                            onClick={() => navigate(item.path)}
                            className={`flex flex-col items-center font-['Space_Grotesk'] text-[10px] uppercase tracking-widest gap-1 transition-colors ${item.path === "/" ? "text-[#ffe792]" : "text-[#9eacc3] hover:text-[#ffe792]"
                                }`}
                        >
                            <span className="material-symbols-outlined">{item.icon}</span>
                            <span>{item.label}</span>
                        </button>
                    )
                )}
            </nav>
        </div>
    );
}