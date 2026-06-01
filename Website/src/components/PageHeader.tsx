import { useState, useEffect, useRef } from "react";

import { AvatarInitials } from "@/components/AvatarInitials";
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from "@/api";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useUserProfile } from "@/hooks/useUserProfile";

/* ─── Icon helper ──────────────────────────────────────────────────────────── */
function Icon({ name, filled = false, size = 22, style = {}, className = "" }: any) {
    return (
        <span
            className={`material-symbols-outlined ${className}`}
            style={{
                fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${filled ? 500 : 400}, 'GRAD' 0, 'opsz' ${size}`,
                fontSize: size,
                lineHeight: 1,
                color: "var(--muted-foreground)",
                ...style,
            }}
        >
            {name}
        </span>
    );
}

/* ─── Notification Popup ───────────────────────────────────────────────────── */
function NotifPopup({ onClose }: { onClose: () => void }) {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchNotifications(1, 20)
            .then((r) => setItems(r.notifications || []))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        const id = setTimeout(() => document.addEventListener("mousedown", handler, true), 0);
        return () => { clearTimeout(id); document.removeEventListener("mousedown", handler, true); };
    }, [onClose]);

    const handleMarkAll = async () => {
        try { await markAllNotificationsRead(); setItems(prev => prev.map(n => ({ ...n, isRead: true }))); } catch { }
    };

    const handleRead = async (id: string) => {
        try { await markNotificationRead(id); setItems(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n)); } catch { }
    };

    const getIcon = (type: string) => {
        if (type?.includes("like")) return { name: "favorite", color: "#ef4444" };
        if (type?.includes("comment") || type?.includes("reply")) return { name: "mode_comment", color: "#a2c2fd" };
        if (type?.includes("follow")) return { name: "person_add", color: "#4ade80" };
        if (type?.includes("message")) return { name: "chat", color: "var(--primary)" };
        if (type?.includes("meeting")) return { name: "video_call", color: "#a78bfa" };
        if (type?.includes("task") || type?.includes("action")) return { name: "task_alt", color: "#fb923c" };
        if (type?.includes("payment")) return { name: "payments", color: "#facc15" };
        return { name: "notifications", color: "var(--secondary)" };
    };

    return (
        <div
            ref={ref}
            style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                width: 380,
                maxHeight: 520,
                background: "color-mix(in srgb, var(--background) 95%, transparent)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 20,
                boxShadow: "0 32px 80px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.04)",
                zIndex: 999,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                backdropFilter: "blur(24px)",
            }}
        >
            {/* Header */}
            <div style={{ padding: "16px 20px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Icon name="notifications" filled size={18} style={{ color: "var(--primary)" }} />
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 14, color: "var(--foreground)", letterSpacing: "0.02em" }}>
                        Notifications
                    </span>
                    {items.filter(n => !n.isRead).length > 0 && (
                        <span style={{ background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 800, borderRadius: 999, padding: "1px 6px", fontFamily: "'Space Grotesk', sans-serif" }}>
                            {items.filter(n => !n.isRead).length}
                        </span>
                    )}
                </div>
                {items.some(n => !n.isRead) && (
                    <button
                        onClick={handleMarkAll}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", fontSize: 11, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}
                    >
                        Mark all read
                    </button>
                )}
            </div>

            {/* List */}
            <div style={{ overflowY: "auto", flex: 1 }}>
                {loading ? (
                    <div style={{ padding: 32, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>Loading…</div>
                ) : items.length === 0 ? (
                    <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted-foreground)" }}>
                        <Icon name="notifications_none" size={40} style={{ display: "block", margin: "0 auto 10px", opacity: 0.4 }} />
                        <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13 }}>All caught up!</p>
                    </div>
                ) : (
                    items.map((n) => {
                        const ic = getIcon(n.type);
                        return (
                            <div
                                key={n._id}
                                onClick={() => handleRead(n._id)}
                                style={{
                                    display: "flex", gap: 12, alignItems: "flex-start",
                                    padding: "13px 18px",
                                    background: n.isRead ? "transparent" : "rgba(255,255,255,0.025)",
                                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                                    cursor: "pointer", transition: "background 0.15s",
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                                onMouseLeave={e => (e.currentTarget.style.background = n.isRead ? "transparent" : "rgba(255,255,255,0.025)")}
                            >
                                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <Icon name={ic.name} filled size={17} style={{ color: ic.color }} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: 13, color: n.isRead ? "var(--muted-foreground)" : "var(--foreground)", fontFamily: "'Manrope', sans-serif", margin: 0, lineHeight: 1.45 }}>
                                        {n.body || n.title}
                                    </p>
                                    <span style={{ fontSize: 11, color: "var(--muted-foreground)", fontFamily: "'Space Grotesk', sans-serif" }}>
                                        {n.createdAt ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }) : ""}
                                    </span>
                                </div>
                                {!n.isRead && (
                                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#ef4444", marginTop: 5, flexShrink: 0 }} />
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

/* ─── PageHeader ───────────────────────────────────────────────────────────── */
interface PageHeaderProps {
    title: string;
    subtitle?: string;
    icon?: string;
    children?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, icon, children }: PageHeaderProps) {
    const navigate = useNavigate();
    const { userData } = useUserProfile();
    const [unread, setUnread] = useState(0);
    const [notifOpen, setNotifOpen] = useState(false);

    useEffect(() => {
        const BASE = (import.meta.env.VITE_API_URL?.replace(/ i$/, '')?.trim()) || "http://localhost:3000/api/v1";
        // Load unread count only
        fetch(`${BASE}/notifications/unread-count`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
        })
            .then(r => r.json())
            .then(j => setUnread(j.count || 0))
            .catch(() => { });
    }, []);

    return (
        <header
            style={{
                position: "fixed",
                top: 0,
                left: 85,
                right: 0,
                height: 70,
                zIndex: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 28px",
                background: "color-mix(in srgb, var(--background) 80%, transparent)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                borderBottom: "1px solid var(--border)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
            }}
        >
            {/* Left — Title */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {icon && (
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "color-mix(in srgb, var(--primary) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon name={icon} size={18} style={{ color: "var(--primary)" }} />
                    </div>
                )}
                <div>
                    <h1
                        style={{
                            fontFamily: "'Space Grotesk', sans-serif",
                            fontWeight: 700,
                            fontSize: 18,
                            color: "var(--primary)",
                            margin: 0,
                            letterSpacing: "0.03em",
                            textTransform: "uppercase",
                        }}
                    >
                        {title}
                    </h1>
                    {subtitle && (
                        <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 11, color: "var(--muted-foreground)", margin: 0, marginTop: 1 }}>{subtitle}</p>
                    )}
                </div>
            </div>

            {/* Center */}
            {children && <div style={{ flex: 1, display: "flex", justifyContent: "center", padding: "0 24px" }}>{children}</div>}

            {/* Right — Bell + Avatar */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {/* Notification Bell */}
                <div style={{ position: "relative" }}>
                    <button
                        onClick={() => setNotifOpen(v => !v)}
                        style={{
                            width: 38, height: 38, borderRadius: 10,
                            background: notifOpen ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer", transition: "all 0.2s", position: "relative",
                            color: notifOpen ? "var(--primary)" : "var(--secondary)",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "var(--primary)"; }}
                        onMouseLeave={e => { if (!notifOpen) { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "var(--secondary)"; } }}
                    >
                        <Icon name="notifications" filled={notifOpen} size={19} />
                        {unread > 0 && (
                            <span style={{
                                position: "absolute", top: -4, right: -4,
                                background: "#ef4444", color: "#fff",
                                fontSize: 9, fontWeight: 800, borderRadius: 999,
                                padding: "1px 5px", minWidth: 16, textAlign: "center",
                                fontFamily: "'Space Grotesk', sans-serif",
                                border: "2px solid #000",
                            }}>
                                {unread > 99 ? "99+" : unread}
                            </span>
                        )}
                    </button>
                    {notifOpen && <NotifPopup onClose={() => setNotifOpen(false)} />}
                </div>

                {/* Avatar */}
                <button
                    onClick={() => navigate("/settings")}
                    style={{
                        width: 38, height: 38, borderRadius: 10, overflow: "hidden",
                        border: "1px solid rgba(255,255,255,0.1)",
                        cursor: "pointer", padding: 0, transition: "border-color 0.2s",
                        background: "transparent",
                    }}
                    title={userData?.full_name || "Profile"}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "var(--primary)"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"}
                >
                    <AvatarInitials name={userData?.full_name || userData?.username || "U"} url={userData?.avatar} className="text-sm" />
                </button>
            </div>
        </header>
    );
}
