import { useState } from "react";
import { Button } from "@/components/ui/button";

// ─── Tailwind custom color tokens (map to design tokens from original) ───────
// These assume your tailwind.config extends with the original color palette.
// Add them to your tailwind.config.ts if not already present.

const NAV_ITEMS = [
    { icon: "chat", label: "Chats" },
    { icon: "work", label: "Work" },
    { icon: "video_call", label: "Meet" },
    { icon: "groups", label: "Community" },
    { icon: "rss_feed", label: "Feed" },
    { icon: "bookmark", label: "Saved" },
    { icon: "calendar_today", label: "Calendar" },
    { icon: "payments", label: "Payments" },
    { icon: "settings", label: "Settings" },
];

function MaterialIcon({
    name,
    filled = false,
    className = "",
}: {
    name: string;
    filled?: boolean;
    className?: string;
}) {
    return (
        <span
            className={`material-symbols-outlined ${className}`}
            style={
                filled
                    ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }
                    : { fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }
            }
        >
            {name}
        </span>
    );
}

function Sidebar({ onLogout }: { onLogout: () => void }) {
    return (
        <aside
            className="fixed left-0 top-0 h-full w-64 z-40 flex flex-col py-8 px-4 gap-2 border-none"
            style={{ background: "#010f20", fontFamily: "'Space Grotesk', sans-serif" }}
        >
            {/* Brand */}
            <div className="mb-8 flex items-center gap-3 px-4">
                <div className="relative w-8 h-8 shrink-0">
                    <div
                        className="absolute w-3 h-3 top-0 left-0"
                        style={{ backgroundColor: "#ffe792" }}
                    />
                    <div
                        className="absolute w-3 h-3 bottom-0 right-0 opacity-60"
                        style={{ backgroundColor: "#ffe792" }}
                    />
                </div>
                <span
                    className="font-black text-2xl tracking-tighter"
                    style={{ color: "#ffe792" }}
                >
                    BUBBLE
                </span>
            </div>

            {/* Nav */}
            <nav className="flex flex-col gap-1">
                {NAV_ITEMS.map((item) => (
                    <a
                        key={item.label}
                        href="#"
                        className="flex items-center gap-4 px-4 py-3 rounded-xl opacity-70 transition-all duration-200 uppercase text-[10px] tracking-widest"
                        style={{ color: "#a2c2fd" }}
                        onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.color = "#ffe792";
                            (e.currentTarget as HTMLElement).style.background =
                                "rgba(162,194,253,0.05)";
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.color = "#a2c2fd";
                            (e.currentTarget as HTMLElement).style.background = "transparent";
                        }}
                    >
                        <MaterialIcon name={item.icon} className="text-xl" />
                        <span>{item.label}</span>
                    </a>
                ))}

                {/* Logout nav item */}
                <button
                    onClick={onLogout}
                    className="flex items-center gap-4 px-4 py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest border-r-4 transition-all duration-200 cursor-pointer w-full text-left"
                    style={{
                        color: "#ffe792",
                        borderColor: "#ffe792",
                        background:
                            "linear-gradient(to right, rgba(255,231,146,0.10), transparent)",
                    }}
                >
                    <MaterialIcon name="logout" className="text-xl" />
                    <span>Logout</span>
                </button>
            </nav>

            {/* User profile */}
            <div
                className="mt-auto px-4 py-6 border-t"
                style={{ borderColor: "rgba(59,73,92,0.10)" }}
            >
                <div className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center border overflow-hidden shrink-0"
                        style={{
                            background: "#11273f",
                            borderColor: "rgba(59,73,92,0.20)",
                        }}
                    >
                        <img
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuA3NFRl04Xm6G06LSDUTsxmr14vyToF9L4aevEKp2kIeYiFsfGimLQIuakF79yKXZd_7U1D_E9JBWccpy-8704_RjseUzZjTxqLuMFUcoUDQTa7-AVOyHwLfXMSbUAtSYK2hpH1RBOguI7ci0aPVTWo_Njohnuv9L0njuqTbRlOPHQ0b709JiOV6zdKfGFHSzL67DSU8r2tbyJXBVUcUKhoj5EMQQ0FotFQScdTbLrx4V8H_sBaAE2sHk0kzH82rDA8AHAtIP4sOKXo"
                            alt="User Profile"
                            className="rounded-full w-full h-full object-cover"
                        />
                    </div>
                    <div className="flex flex-col">
                        <span
                            className="font-bold text-[11px] uppercase tracking-wide"
                            style={{ color: "#d8e6ff" }}
                        >
                            ALEX_DRAKE
                        </span>
                        <span
                            className="text-[9px] lowercase opacity-60"
                            style={{ color: "#9eacc3" }}
                        >
                            Obsidian Edition
                        </span>
                    </div>
                </div>
            </div>
        </aside>
    );
}

function DashboardBackground() {
    return (
        <main
            className="ml-64 min-h-screen p-12 blur-md pointer-events-none select-none overflow-hidden"
            style={{ background: "#010f20" }}
        >
            <header className="mb-20">
                <h1
                    className="text-6xl font-bold tracking-tighter mb-4"
                    style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#d8e6ff" }}
                >
                    Command Center
                </h1>
                <p
                    className="text-lg max-w-xl"
                    style={{ color: "#a2c2fd" }}
                >
                    Reviewing your current active streams and celestial synchronization states.
                </p>
            </header>

            <div className="grid grid-cols-12 gap-8">
                {/* Wide card */}
                <div
                    className="col-span-8 rounded-full h-96 p-8 relative overflow-hidden"
                    style={{ background: "#031427" }}
                >
                    <div
                        className="absolute inset-0 rounded-full"
                        style={{
                            background:
                                "linear-gradient(to bottom right, rgba(255,231,146,0.05), transparent)",
                        }}
                    />
                    <div className="relative z-10 flex flex-col justify-between h-full">
                        <div className="flex justify-between items-start">
                            <span
                                className="text-sm tracking-widest uppercase"
                                style={{
                                    fontFamily: "'Space Grotesk', sans-serif",
                                    color: "#ffe792",
                                }}
                            >
                                LIVE MONITOR
                            </span>
                            <MaterialIcon name="monitoring" className="" style={{ color: "#ffe792" }} />
                        </div>
                        <div className="space-y-4">
                            {["w-3/4", "w-1/2", "w-2/3"].map((w, i) => (
                                <div
                                    key={i}
                                    className={`h-2 ${w} rounded-full`}
                                    style={{ background: "#11273f" }}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Narrow cards */}
                <div className="col-span-4 space-y-8">
                    <div
                        className="p-8 rounded-xl h-44"
                        style={{ background: "#071a2f" }}
                    >
                        <span
                            className="text-[10px] tracking-widest opacity-60 uppercase"
                            style={{
                                fontFamily: "'Space Grotesk', sans-serif",
                                color: "#a2c2fd",
                            }}
                        >
                            System Health
                        </span>
                        <div
                            className="mt-4 text-3xl font-bold"
                            style={{
                                fontFamily: "'Space Grotesk', sans-serif",
                                color: "#d8e6ff",
                            }}
                        >
                            99.2%
                        </div>
                    </div>
                    <div
                        className="p-8 rounded-xl h-44 border"
                        style={{
                            background: "#0c2037",
                            borderColor: "rgba(255,231,146,0.10)",
                        }}
                    >
                        <span
                            className="text-[10px] tracking-widest uppercase"
                            style={{
                                fontFamily: "'Space Grotesk', sans-serif",
                                color: "#ffe792",
                            }}
                        >
                            Active Sessions
                        </span>
                        <div
                            className="mt-4 text-3xl font-bold"
                            style={{
                                fontFamily: "'Space Grotesk', sans-serif",
                                color: "#ffe792",
                            }}
                        >
                            12
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}

function LogoutModal({
    onConfirm,
    onCancel,
}: {
    onConfirm: () => void;
    onCancel: () => void;
}) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(1,15,32,0.60)", backdropFilter: "blur(20px)" }}
        >
            <div
                className="w-full max-w-lg p-12 rounded-3xl shadow-2xl relative overflow-hidden"
                style={{
                    backdropFilter: "blur(20px)",
                    background: "rgba(17,39,63,0.4)",
                    border: "1px solid rgba(59,73,92,0.15)",
                }}
            >
                {/* Decorative glows */}
                <div
                    className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl"
                    style={{ background: "rgba(255,231,146,0.10)" }}
                />
                <div
                    className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full blur-3xl"
                    style={{ background: "rgba(162,194,253,0.05)" }}
                />

                <div className="relative z-10 text-center">
                    {/* Icon */}
                    <div className="mb-8 flex justify-center">
                        <div
                            className="w-20 h-20 rounded-xl flex items-center justify-center border"
                            style={{
                                background: "#11273f",
                                borderColor: "rgba(255,231,146,0.20)",
                            }}
                        >
                            <MaterialIcon
                                name="power_settings_new"
                                filled
                                className="text-4xl"
                                style={{ color: "#ffe792" }}
                            />
                        </div>
                    </div>

                    {/* Heading */}
                    <h2
                        className="text-4xl font-bold tracking-tighter mb-4"
                        style={{
                            fontFamily: "'Space Grotesk', sans-serif",
                            color: "#d8e6ff",
                        }}
                    >
                        Disconnecting?
                    </h2>

                    {/* Body */}
                    <p
                        className="text-lg leading-relaxed mb-12"
                        style={{ color: "#9eacc3" }}
                    >
                        Your session will be securely terminated. All unsaved observatory
                        configurations will be stored in your local vault.
                    </p>

                    {/* Actions */}
                    <div className="flex flex-col gap-4">
                        <Button
                            onClick={onConfirm}
                            className="w-full py-5 px-8 font-bold rounded-xl tracking-tight text-lg transition-all duration-300 active:scale-95 border-0"
                            style={{
                                fontFamily: "'Space Grotesk', sans-serif",
                                background: "#ffe792",
                                color: "#655400",
                                boxShadow: "0 0 20px rgba(255,231,146,0.2)",
                                height: "auto",
                            }}
                            onMouseEnter={(e) => {
                                (e.currentTarget as HTMLElement).style.background = "#ffd709";
                            }}
                            onMouseLeave={(e) => {
                                (e.currentTarget as HTMLElement).style.background = "#ffe792";
                            }}
                        >
                            Log Out
                        </Button>

                        <Button
                            onClick={onCancel}
                            variant="ghost"
                            className="w-full py-5 px-8 font-medium rounded-xl tracking-tight text-lg transition-all duration-300 border-0"
                            style={{
                                fontFamily: "'Space Grotesk', sans-serif",
                                color: "#ffe792",
                                background: "transparent",
                                height: "auto",
                            }}
                            onMouseEnter={(e) => {
                                (e.currentTarget as HTMLElement).style.background =
                                    "rgba(255,231,146,0.05)";
                            }}
                            onMouseLeave={(e) => {
                                (e.currentTarget as HTMLElement).style.background = "transparent";
                            }}
                        >
                            Stay Connected
                        </Button>
                    </div>

                    {/* Footer badge */}
                    <div className="mt-12 flex items-center justify-center gap-2 opacity-40">
                        <div
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: "#ffe792" }}
                        />
                        <span
                            className="text-[10px] uppercase tracking-[0.2em]"
                            style={{
                                fontFamily: "'Space Grotesk', sans-serif",
                                color: "#9eacc3",
                            }}
                        >
                            Secure Vault Protocol 2.4
                        </span>
                        <div
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: "#ffe792" }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function BubbleApp() {
    const [showModal, setShowModal] = useState(true);

    return (
        <div
            className="min-h-screen"
            style={{ background: "#010f20", color: "#d8e6ff" }}
        >
            {/* Google Fonts */}
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Manrope:wght@300;400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap');
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
      `}</style>

            <Sidebar onLogout={() => setShowModal(true)} />
            <DashboardBackground />

            {showModal && (
                <LogoutModal
                    onConfirm={() => {
                        alert("Logged out!");
                        setShowModal(false);
                    }}
                    onCancel={() => setShowModal(false)}
                />
            )}
        </div>
    );
}