import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import { AvatarInitials } from "@/components/AvatarInitials";
import BubbleIcon from "@/components/BubbleIcon";
import { fetchNotifications, fetchUnreadCount, markAllNotificationsRead, markNotificationRead } from "@/api";
import { formatDistanceToNow } from "date-fns";
import { useUserProfile } from "@/hooks/useUserProfile";
import { onEvent, offEvent } from "@/lib/socket-client";

// ─── Static nav ──────────────────────────────────────────────────────────────
const NAV_ICONS = [
  { icon: "chat", label: "Chats", path: "/messages" },
  { icon: "work", label: "Work", path: "/workspace" },
  { icon: "video_chat", label: "Meet", path: "/meet" },
  { icon: "group", label: "Community", path: "/community" },
  // { icon: "rss_feed", label: "Feed", path: "/feed" },
  { icon: "smart_toy", label: "Aida AI", path: "/ai" },
  // { icon: "bookmark", label: "Saved", path: "/saved" },
  { icon: "calendar_today", label: "Calendar", path: "/calendar" },
  // { icon: "payments", label: "Payments", path: "/payments" },
];

function MSIcon({ icon, filled = false, className }: { icon: string; filled?: boolean; className?: string }) {
  return (
    <span
      className={cn("material-symbols-outlined select-none", className)}
      style={filled
        ? { fontVariationSettings: "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24" }
        : { fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
    >
      {icon}
    </span>
  );
}

// ─── Notification Popup (sidebar version) ────────────────────────────────────
function SidebarNotifPopup({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications(1, 20)
      .then((r) => setItems(r.notifications || []))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const id = setTimeout(() => document.addEventListener("mousedown", handler, true), 0);
    return () => { clearTimeout(id); document.removeEventListener("mousedown", handler, true); };
  }, [onClose]);

  const getIcon = (type: string) => {
    if (type?.includes("like")) return { name: "favorite", color: "#ef4444" };
    if (type?.includes("comment") || type?.includes("reply")) return { name: "mode_comment", color: "#a2c2fd" };
    if (type?.includes("follow")) return { name: "person_add", color: "#4ade80" };
    if (type?.includes("message")) return { name: "chat", color: "var(--th-accent)" };
    if (type?.includes("meeting")) return { name: "video_call", color: "#a78bfa" };
    if (type?.includes("task") || type?.includes("action")) return { name: "task_alt", color: "#fb923c" };
    return { name: "notifications", color: "var(--th-secondary)" };
  };

  const handleRead = async (id: string) => {
    try { await markNotificationRead(id); setItems(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n)); } catch { }
  };

  const handleMarkAll = async () => {
    try { await markAllNotificationsRead(); setItems(prev => prev.map(n => ({ ...n, isRead: true }))); } catch { }
  };

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        left: 90,
        bottom: 100,
        width: 360,
        maxHeight: 500,
        background: "color-mix(in srgb, var(--th-bg) 95%, transparent)",
        border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: 18,
        boxShadow: "0 24px 80px rgba(0,0,0,0.95), 0 0 0 1px rgba(255,255,255,0.04)",
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        backdropFilter: "blur(24px)",
      }}
    >
      <div style={{ padding: "14px 18px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <MSIcon icon="notifications" filled className="text-base" />
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, color: "var(--th-text)" }}>
            Notifications
          </span>
          {items.filter(n => !n.isRead).length > 0 && (
            <span style={{ background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 800, borderRadius: 999, padding: "1px 5px" }}>
              {items.filter(n => !n.isRead).length}
            </span>
          )}
        </div>
        {items.some(n => !n.isRead) && (
          <button onClick={handleMarkAll} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--th-accent)", fontSize: 10, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Mark all read
          </button>
        )}
      </div>
      <div style={{ overflowY: "auto", flex: 1 }}>
        {loading ? (
          <div style={{ padding: 28, textAlign: "center", color: "var(--th-muted)", fontSize: 12 }}>Loading…</div>
        ) : items.length === 0 ? (
          <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--th-muted)" }}>
            <MSIcon icon="notifications_none" className="text-4xl" />
            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, marginTop: 8 }}>All caught up!</p>
          </div>
        ) : items.map((n) => {
          const ic = getIcon(n.type);
          return (
            <div
              key={n._id}
              onClick={() => handleRead(n._id)}
              style={{
                display: "flex", gap: 10, alignItems: "flex-start",
                padding: "11px 16px",
                background: n.isRead ? "transparent" : "rgba(255,255,255,0.025)",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                cursor: "pointer", transition: "background 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
              onMouseLeave={e => (e.currentTarget.style.background = n.isRead ? "transparent" : "rgba(255,255,255,0.025)")}
            >
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <MSIcon icon={ic.name} filled className="text-base" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, color: n.isRead ? "var(--th-muted)" : "var(--th-text)", fontFamily: "'Manrope', sans-serif", margin: 0, lineHeight: 1.4 }}>
                  {n.body || n.title}
                </p>
                <span style={{ fontSize: 10, color: "var(--th-muted)", fontFamily: "'Space Grotesk', sans-serif" }}>
                  {n.createdAt ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }) : ""}
                </span>
              </div>
              {!n.isRead && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", marginTop: 4, flexShrink: 0 }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
export default function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();
  const { userData } = useUserProfile();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadChatsCount, setUnreadChatsCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);


  useEffect(() => {
    const tick = async () => {
      try {
        const notifData = await fetchUnreadCount();
        setUnreadCount(notifData.count || 0);
        try {
          const { fetchUnreadMessageCount } = await import("@/api");
          const msgData = await fetchUnreadMessageCount();
          setUnreadChatsCount(msgData.count || 0);
        } catch { /* ignored */ }
      } catch { /* silent */ }
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  // Real-time: bump chat badge when new message comes in while not on /messages
  useEffect(() => {
    const onNewMsg = () => {
      if (!location.pathname.startsWith("/messages")) {
        setUnreadChatsCount(prev => prev + 1);
      }
    };
    onEvent("new_message", onNewMsg);
    return () => offEvent("new_message", onNewMsg);
  }, [location.pathname]);

  // Reset badge when user navigates to /messages
  useEffect(() => {
    if (location.pathname.startsWith("/messages")) {
      setUnreadChatsCount(0);
    }
  }, [location.pathname]);

  const isActive = (path: string) => {
    const cur = location.pathname === "/" ? "/messages" : location.pathname;
    if (path === "/messages") return cur === "/messages" || cur === "/";
    return cur === path || cur.startsWith(path + "/");
  };

  return (
    <>
      {notifOpen && <SidebarNotifPopup onClose={() => setNotifOpen(false)} />}
      <aside
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        className={cn(
          "fixed left-0 top-0 h-full z-50 flex flex-col py-6",
          "backdrop-blur-2xl transition-all duration-300",
          isExpanded ? "w-64" : "w-[85px]"
        )}
        style={{
          background: "var(--th-bg)",
          borderRight: "1px solid var(--th-border)",
          boxShadow: "1px 0 40px rgba(0,0,0,0.8)",
        }}
      >
        <div className={cn("mb-6 flex items-center h-10 px-6 transition-all overflow-hidden shrink-0", isExpanded ? "justify-start" : "justify-center")} style={{ background: "color-mix(in srgb, var(--th-bg) 70%, transparent)" }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/icon.png" alt="Bubble space" style={{ width: "32px", height: "32px", objectFit: "contain", flexShrink: 0 }} />
            <span
              style={{
                fontSize: "16px",
                fontWeight: 700,
                color: "var(--th-accent)",
                fontFamily: "'Space Grotesk', sans-serif",
                whiteSpace: "nowrap",
                opacity: isExpanded ? 1 : 0,
                maxWidth: isExpanded ? "120px" : 0,
                transition: "all 0.3s ease",
                overflow: "hidden"
              }}
            >
              BUBBLE SPACE
            </span>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col flex-grow w-full mt-2 overflow-hidden">
          {NAV_ICONS.map(({ icon, label, path }) => {
            const active = isActive(path);
            return (
              <Link
                key={label}
                to={path}
                title={isExpanded ? undefined : label}
                className={cn("flex items-center h-12 mx-2 mb-1 rounded-xl shrink-0 border-l-[3px] transition-all duration-200 overflow-hidden")}
                style={{
                  color: active ? "var(--th-accent)" : "var(--th-muted)",
                  borderLeftColor: active ? "var(--th-accent)" : "transparent",
                  background: active ? "rgba(255,231,146,0.08)" : "transparent",
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.color = "var(--th-text)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.color = "var(--th-muted)"; e.currentTarget.style.background = "transparent"; } }}
              >
                <span className="flex flex-shrink-0 items-center justify-center w-14 relative">
                  <MSIcon icon={icon} filled={active} className="text-2xl" />
                  {path === "/messages" && unreadChatsCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[14px] h-3.5 rounded-full text-[8px] font-bold flex items-center justify-center px-1"
                      style={{ background: "#ef4444", color: "#fff", border: "1.5px solid #000" }}>
                      {unreadChatsCount > 99 ? "99+" : unreadChatsCount}
                    </span>
                  )}
                </span>
                <span className={cn("font-headline text-sm font-medium tracking-wide whitespace-nowrap transition-all duration-300", isExpanded ? "opacity-100 max-w-[180px]" : "opacity-0 max-w-0 overflow-hidden")}>
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="mt-auto flex flex-col w-full shrink-0 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>

          {/* Notifications Bell (button, not link) */}
          <button
            title={isExpanded ? undefined : "Notifications"}
            onClick={() => setNotifOpen(v => !v)}
            className={cn("flex items-center h-12 mx-2 mb-1 rounded-xl border-l-[3px] transition-all duration-200 overflow-hidden relative")}
            style={{
              background: notifOpen ? "rgba(255,231,146,0.08)" : "transparent",
              borderLeftColor: notifOpen ? "var(--th-accent)" : "transparent",
              color: notifOpen ? "var(--th-accent)" : "var(--th-muted)",
              border: "none",
              cursor: "pointer",
              borderLeft: `3px solid ${notifOpen ? "var(--th-accent)" : "transparent"}`,
            }}
            onMouseEnter={e => { if (!notifOpen) { e.currentTarget.style.color = "var(--th-text)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; } }}
            onMouseLeave={e => { if (!notifOpen) { e.currentTarget.style.color = "var(--th-muted)"; e.currentTarget.style.background = "transparent"; } }}
          >
            <span className="flex flex-shrink-0 items-center justify-center w-14 relative">
              <MSIcon icon="notifications" filled={notifOpen} className="text-2xl" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-2 min-w-[14px] h-3.5 rounded-full text-[8px] font-bold flex items-center justify-center px-1"
                  style={{ background: "#ef4444", color: "#fff", border: "1.5px solid #000" }}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </span>
            <span className={cn("font-headline text-sm font-medium tracking-wide whitespace-nowrap transition-all duration-300", isExpanded ? "opacity-100 max-w-[180px]" : "opacity-0 max-w-0 overflow-hidden")}>
              Notifications{unreadCount > 0 && ` (${unreadCount})`}
            </span>
          </button>

          {/* Settings */}
          <Link
            to="/settings"
            title={isExpanded ? undefined : "Settings"}
            className={cn("flex items-center h-12 mx-2 mb-1 rounded-xl border-l-[3px] transition-all duration-200 overflow-hidden")}
            style={{
              color: isActive("/settings") ? "var(--th-accent)" : "var(--th-muted)",
              borderLeftColor: isActive("/settings") ? "var(--th-accent)" : "transparent",
              background: isActive("/settings") ? "rgba(255,231,146,0.08)" : "transparent",
            }}
            onMouseEnter={e => { if (!isActive("/settings")) { e.currentTarget.style.color = "var(--th-text)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; } }}
            onMouseLeave={e => { if (!isActive("/settings")) { e.currentTarget.style.color = "var(--th-muted)"; e.currentTarget.style.background = "transparent"; } }}
          >
            <span className="flex flex-shrink-0 items-center justify-center w-14">
              <MSIcon icon="settings" filled={isActive("/settings")} className="text-2xl" />
            </span>
            <span className={cn("font-headline text-sm font-medium tracking-wide whitespace-nowrap transition-all duration-300", isExpanded ? "opacity-100 max-w-[180px]" : "opacity-0 max-w-0 overflow-hidden")}>
              Settings
            </span>
          </Link>

          {/* Profile */}
          <Link
            to="/logout"
            title={isExpanded ? undefined : userData?.full_name || "Profile"}
            className="flex items-center h-14 mx-2 mt-1 rounded-xl transition-colors group overflow-hidden"
            style={{ color: "var(--th-muted)" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <span className="flex flex-shrink-0 items-center justify-center w-14">
              <div className="w-9 h-9 rounded-full overflow-hidden" style={{ border: "1.5px solid rgba(255,255,255,0.12)" }}>
                <AvatarInitials name={userData?.full_name || userData?.username || "GUEST"} url={userData?.avatar} className="text-base" />
              </div>
            </span>
            <div className={cn("flex flex-col whitespace-nowrap overflow-hidden transition-all duration-300", isExpanded ? "opacity-100 max-w-[180px]" : "opacity-0 max-w-0")}>
              <span className="font-headline text-sm font-bold truncate uppercase" style={{ color: "var(--th-text)" }}>
                {userData?.full_name || userData?.username || "GUEST"}
              </span>
              <span className="text-[10px] truncate" style={{ color: "var(--th-muted)" }}>
                {userData?.uniqueTag || "Identity Profile"}
              </span>
            </div>
          </Link>
        </div>
      </aside>
    </>
  );
}
