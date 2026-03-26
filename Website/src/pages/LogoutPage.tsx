import { useState } from "react";
import { Button } from "@/components/ui/button";
import Sidebar from "@/components/Sidebar";

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
            className="ml-[96px] min-h-screen p-12 blur-md pointer-events-none select-none overflow-hidden transition-all duration-300"
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

            <Sidebar />
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