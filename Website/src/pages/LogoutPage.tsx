import { useState } from "react";
import { Button } from "@/components/ui/button";
import Sidebar from "@/components/Sidebar";
import { useNavigate } from "react-router-dom";
import { logoutUser } from "@/api";
import { toast } from "sonner";
import { disconnectSocket } from "@/lib/socket-client";

function MaterialIcon({
    name,
    filled = false,
    className = "",
    style,
}: {
    name: string;
    filled?: boolean;
    className?: string;
    style?: React.CSSProperties;
}) {
    return (
        <span
            className={`material-symbols-outlined ${className}`}
            style={{
                fontVariationSettings: filled
                    ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
                    : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
                ...style,
            }}
        >
            {name}
        </span>
    );
}




function DashboardBackground() {
    return (
        <main
            className="ml-[var(--main-margin)] min-h-screen p-12 blur-md pointer-events-none select-none overflow-hidden transition-all duration-300"
            style={{ background: "var(--background)" }}
        >
            <header className="mb-20">
                <h1
                    className="text-6xl font-bold tracking-tighter mb-4"
                    style={{ fontFamily: "'Space Grotesk', sans-serif", color: "var(--primary)" }}
                >
                    Command Center
                </h1>
                <p
                    className="text-lg max-w-xl"
                    style={{ color: "var(--muted-foreground)" }}
                >
                    Reviewing your current active streams and synchronization states.
                </p>
            </header>

            <div className="grid grid-cols-12 gap-8">
                {/* Wide card */}
                <div
                    className="col-span-8 rounded-2xl h-96 p-8 relative overflow-hidden border"
                    style={{ background: "var(--card)", borderColor: "var(--border)" }}
                >
                    <div
                        className="absolute inset-0"
                        style={{
                            background:
                                "linear-gradient(to bottom right, var(--primary), transparent)",
                            opacity: 0.05
                        }}
                    />
                    <div className="relative z-10 flex flex-col justify-between h-full">
                        <div className="flex justify-between items-start">
                            <span
                                className="text-sm tracking-widest uppercase"
                                style={{
                                    fontFamily: "'Space Grotesk', sans-serif",
                                    color: "var(--primary)",
                                }}
                            >
                                LIVE MONITOR
                            </span>
                            <MaterialIcon name="monitoring" style={{ color: "var(--primary)" }} />
                        </div>
                        <div className="space-y-4">
                            {["w-3/4", "w-1/2", "w-2/3"].map((w, i) => (
                                <div
                                    key={i}
                                    className={`h-2 ${w} rounded-full`}
                                    style={{ background: "var(--muted)" }}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Narrow cards */}
                <div className="col-span-4 space-y-8">
                    <div
                        className="p-8 rounded-xl h-44 border"
                        style={{ background: "var(--card)", borderColor: "var(--border)" }}
                    >
                        <span
                            className="text-[10px] tracking-widest opacity-60 uppercase"
                            style={{
                                fontFamily: "'Space Grotesk', sans-serif",
                                color: "var(--muted-foreground)",
                            }}
                        >
                            System Health
                        </span>
                        <div
                            className="mt-4 text-3xl font-bold"
                            style={{
                                fontFamily: "'Space Grotesk', sans-serif",
                                color: "var(--foreground)",
                            }}
                        >
                            99.2%
                        </div>
                    </div>
                    <div
                        className="p-8 rounded-xl h-44 border"
                        style={{
                            background: "var(--card)",
                            borderColor: "var(--border)",
                        }}
                    >
                        <span
                            className="text-[10px] tracking-widest uppercase"
                            style={{
                                fontFamily: "'Space Grotesk', sans-serif",
                                color: "var(--primary)",
                            }}
                        >
                            Active Sessions
                        </span>
                        <div
                            className="mt-4 text-3xl font-bold"
                            style={{
                                fontFamily: "'Space Grotesk', sans-serif",
                                color: "var(--primary)",
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
        >
            <div
                className="w-full max-w-lg p-12 rounded-3xl shadow-2xl relative overflow-hidden border"
                style={{
                    background: "var(--card)",
                    borderColor: "var(--border)",
                }}
            >
                {/* Decorative glows */}
                <div
                    className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl opacity-20"
                    style={{ background: "var(--primary)" }}
                />
                <div
                    className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full blur-3xl opacity-10"
                    style={{ background: "var(--primary)" }}
                />

                <div className="relative z-10 text-center">
                    {/* Icon */}
                    <div className="mb-8 flex justify-center">
                        <div
                            className="w-20 h-20 rounded-xl flex items-center justify-center border"
                            style={{
                                background: "var(--primary)/5",
                                borderColor: "var(--primary)/20",
                            }}
                        >
                            <MaterialIcon
                                name="power_settings_new"
                                filled
                                className="text-4xl text-primary"
                            />
                        </div>
                    </div>

                    {/* Heading */}
                    <h2
                        className="text-4xl font-bold tracking-tighter mb-4"
                        style={{
                            fontFamily: "'Space Grotesk', sans-serif",
                            color: "var(--primary)",
                        }}
                    >
                        Disconnecting?
                    </h2>

                    {/* Body */}
                    <p
                        className="text-lg leading-relaxed mb-12"
                        style={{ color: "var(--muted-foreground)" }}
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
                                background: "var(--primary)",
                                color: "var(--primary-foreground)",
                                height: "auto",
                            }}
                        >
                            Log Out
                        </Button>

                        <button
                            onClick={onCancel}
                            className="w-full py-5 px-8 font-medium rounded-xl tracking-tight text-lg transition-all duration-300 border border-border bg-transparent hover:bg-muted text-muted-foreground"
                            style={{
                                fontFamily: "'Space Grotesk', sans-serif",
                                height: "auto",
                            }}
                        >
                            Stay Connected
                        </button>
                    </div>

                    {/* Footer badge */}
                    <div className="mt-12 flex items-center justify-center gap-2 opacity-40">
                        <div
                            className="w-1.5 h-1.5 rounded-full bg-primary"
                        />
                        <span
                            className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground"
                            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                            Secure Vault Protocol 2.4
                        </span>
                        <div
                            className="w-1.5 h-1.5 rounded-full bg-primary"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function BubbleApp() {
    const [showModal, setShowModal] = useState(true);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogout = async () => {
        setLoading(true);
        try {
            await logoutUser();
        } catch (err) {
            console.error(err);
        } finally {
            localStorage.clear();
            disconnectSocket();
            toast.info("Session terminated securely.");
            setShowModal(false);
            navigate("/login");
        }
    };

    return (
        <div
            className="min-h-screen"
            style={{ background: "var(--background)", color: "var(--foreground)" }}
        >
            {/* Google Fonts */}
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Manrope:wght@300;400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap');
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
      `}</style>

            <Sidebar />
            <DashboardBackground />

            {showModal && (
                <LogoutModal
                    onConfirm={handleLogout}
                    onCancel={() => {
                        setShowModal(false);
                        navigate("/messages"); // Navigate back
                    }}
                />
            )}
        </div>
    );
}