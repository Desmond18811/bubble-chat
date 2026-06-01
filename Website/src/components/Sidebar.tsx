import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import { AvatarInitials } from "@/components/AvatarInitials";
import { BubblespaceLogo } from "@/components/bubblespace-logo";
import { motion, AnimatePresence } from "framer-motion";
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
  { icon: "smart_toy", label: "Aida AI", path: "/ai" },
  { icon: "calendar_today", label: "Calendar", path: "/calendar" },
];

function MSIcon({ icon, filled = false, className, style }: { icon: string; filled?: boolean; className?: string; style?: React.CSSProperties }) {
  return (
    <span
      className={cn("material-symbols-outlined select-none", className)}
      style={{
        ...(filled
          ? { fontVariationSettings: "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24" }
          : { fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }),
        ...style
      }}
    >
      {icon}
    </span>
  );
}

const iconVariants: any = {
  hover: {
    scale: 1.25,
    rotate: [0, -10, 10, 0],
    transition: {
      rotate: {
        repeat: Infinity,
        duration: 0.5,
        ease: "easeInOut"
      },
      scale: {
        type: "spring",
        stiffness: 400,
        damping: 10
      }
    }
  },
  tap: { scale: 0.9 },
  active: {
    scale: 1.15,
    color: "hsl(var(--primary))",
    transition: { type: "spring", stiffness: 300, damping: 20 }
  }
};

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
    if (type?.includes("comment") || type?.includes("reply")) return { name: "mode_comment", color: "var(--primary)" };
    if (type?.includes("follow")) return { name: "person_add", color: "#4ade80" };
    if (type?.includes("message")) return { name: "chat", color: "var(--primary)" };
    if (type?.includes("meeting")) return { name: "video_call", color: "#a78bfa" };
    if (type?.includes("task") || type?.includes("action")) return { name: "task_alt", color: "#fb923c" };
    return { name: "notifications", color: "var(--primary)" };
  };

  const handleRead = async (id: string) => {
    try { await markNotificationRead(id); setItems(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n)); } catch { }
  };

  const handleMarkAll = async () => {
    try { await markAllNotificationsRead(); setItems(prev => prev.map(n => ({ ...n, isRead: true }))); } catch { }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      ref={ref}
      style={{
        position: "fixed",
        left: 90,
        bottom: 100,
        width: 360,
        maxHeight: 500,
        background: "white",
        border: "1px solid var(--border)",
        borderRadius: 18,
        boxShadow: "0 24px 80px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05)",
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        backdropFilter: "blur(24px)",
      }}
    >
      <div style={{ padding: "14px 18px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid hsl(var(--primary) / 0.15)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <MSIcon icon="notifications" filled className="text-base text-primary" />
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, color: "hsl(var(--primary))" }}>
            Notifications
          </span>
          {items.filter(n => !n.isRead).length > 0 && (
            <span style={{ background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 800, borderRadius: 999, padding: "1px 5px" }}>
              {items.filter(n => !n.isRead).length}
            </span>
          )}
        </div>
        {items.some(n => !n.isRead) && (
          <button onClick={handleMarkAll} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", fontSize: 10, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Mark all read
          </button>
        )}
      </div>
      <div style={{ overflowY: "auto", flex: 1 }}>
        {loading ? (
          <div style={{ padding: 28, textAlign: "center", color: "var(--muted-foreground)", fontSize: 12 }}>Loading…</div>
        ) : items.length === 0 ? (
          <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--muted-foreground)" }}>
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
                background: n.isRead ? "transparent" : "rgba(0,0,0,0.02)",
                borderBottom: "1px solid var(--border)",
                cursor: "pointer", transition: "background 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "hsl(var(--primary) / 0.06)")}
              onMouseLeave={e => (e.currentTarget.style.background = n.isRead ? "transparent" : "hsl(var(--primary) / 0.03)")}
            >
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "hsl(var(--primary) / 0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <MSIcon icon={ic.name} filled className="text-base" style={{ color: ic.color }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, color: n.isRead ? "var(--muted-foreground)" : "var(--foreground)", fontFamily: "'Manrope', sans-serif", margin: 0, lineHeight: 1.4 }}>
                  {n.body || n.title}
                </p>
                <span style={{ fontSize: 10, color: "var(--muted-foreground)", fontFamily: "'Space Grotesk', sans-serif" }}>
                  {n.createdAt ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }) : ""}
                </span>
              </div>
              {!n.isRead && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", marginTop: 4, flexShrink: 0 }} />}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
export default function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const { userData } = useUserProfile();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadChatsCount, setUnreadChatsCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    const handleToggle = () => setIsMobileOpen(prev => !prev);
    window.addEventListener('toggle-sidebar', handleToggle);
    return () => window.removeEventListener('toggle-sidebar', handleToggle);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

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
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-[45] bg-black/40 md:hidden backdrop-blur-sm transition-opacity"
        />
      )}

      <AnimatePresence>
        {notifOpen && <SidebarNotifPopup onClose={() => setNotifOpen(false)} />}
      </AnimatePresence>

      <aside
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        className={cn(
          "fixed top-0 h-full z-50 flex flex-col py-6",
          "backdrop-blur-2xl transition-all duration-300 ease-in-out",
          isExpanded ? "w-64" : "w-[85px]",
          "left-0 md:translate-x-0",
          "bg-white border-r border-border",
          !isMobileOpen ? "-translate-x-full md:translate-x-0" : "translate-x-0 shadow-2xl"
        )}
        style={{
          boxShadow: isMobileOpen || isExpanded ? "10px 0 40px rgba(0,0,0,0.05)" : "none",
        }}
      >
        <div className={cn("mb-6 flex items-center h-10 px-6 transition-all overflow-hidden shrink-0", isExpanded ? "justify-start" : "justify-center")}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <BubblespaceLogo className="w-8 h-8 flex-shrink-0" />
            <span
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "hsl(var(--primary))",
                fontFamily: "'Space Grotesk', sans-serif",
                whiteSpace: "nowrap",
                opacity: isExpanded ? 1 : 0,
                maxWidth: isExpanded ? "150px" : 0,
                transition: "all 0.3s ease",
                overflow: "hidden"
              }}
            >
              BUBBLE SPACE
            </span>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col flex-grow w-full mt-2 overflow-hidden scrollbar-none">
          {NAV_ICONS.map(({ icon, label, path }) => {
            const active = isActive(path);
            return (
              <Link
                key={label}
                to={path}
                title={isExpanded ? undefined : label}
                onClick={() => {
                  if (path === "/messages") window.dispatchEvent(new CustomEvent('reset_active_chat'));
                  setIsMobileOpen(false);
                }}
                className={cn("flex items-center h-12 mx-2 mb-1 rounded-xl shrink-0 group transition-all duration-200 overflow-hidden")}
                style={{
                  color: active
                    ? "hsl(var(--primary))"
                    : "hsl(var(--primary) / 0.4)",
                  background: active ? "hsl(var(--primary) / 0.1)" : "transparent",
                }}
              >
                <div className="flex flex-shrink-0 items-center justify-center w-14 relative">
                  <motion.div
                    variants={iconVariants}
                    whileHover="hover"
                    whileTap="tap"
                    animate={active ? "active" : ""}
                  >
                    <MSIcon icon={icon} filled={active} className="text-2xl" />
                  </motion.div>
                  {path === "/messages" && unreadChatsCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[14px] h-3.5 rounded-full text-[8px] font-bold flex items-center justify-center px-1"
                      style={{ background: "#ef4444", color: "#fff", border: "1.5px solid white" }}>
                      {unreadChatsCount > 99 ? "99+" : unreadChatsCount}
                    </span>
                  )}
                </div>
                <span className={cn("font-headline text-sm font-semibold tracking-tight whitespace-nowrap transition-all duration-300", isExpanded ? "opacity-100 max-w-[180px]" : "opacity-0 max-w-0 overflow-hidden")}>
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="mt-auto flex flex-col w-full shrink-0 pt-4" style={{ borderTop: "1px solid hsl(var(--primary) / 0.15)" }}>

          {/* Notifications Bell */}
          <button
            title={isExpanded ? undefined : "Notifications"}
            onClick={() => setNotifOpen(v => !v)}
            className={cn("flex items-center h-12 mx-2 mb-1 rounded-xl transition-all duration-200 overflow-hidden relative border-none cursor-pointer")}
            style={{
              background: notifOpen ? "hsl(var(--primary) / 0.1)" : "transparent",
              color: notifOpen ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.4)",
            }}
          >
            <div className="flex flex-shrink-0 items-center justify-center w-14 relative">
              <motion.div
                variants={iconVariants}
                whileHover="hover"
                whileTap="tap"
                animate={notifOpen ? "active" : ""}
              >
                <MSIcon icon="notifications" filled={notifOpen} className="text-2xl" />
              </motion.div>
              {unreadCount > 0 && (
                <span className="absolute top-0 right-2 min-w-[14px] h-3.5 rounded-full text-[8px] font-bold flex items-center justify-center px-1"
                  style={{ background: "#ef4444", color: "#fff", border: "1.5px solid white" }}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>
            <span className={cn("font-headline text-sm font-semibold tracking-tight whitespace-nowrap transition-all duration-300", isExpanded ? "opacity-100 max-w-[180px]" : "opacity-0 max-w-0 overflow-hidden")}>
              Notifications
            </span>
          </button>

          {/* Settings */}
          <Link
            to="/settings"
            title={isExpanded ? undefined : "Settings"}
            onClick={() => setIsMobileOpen(false)}
            className={cn("flex items-center h-12 mx-2 mb-1 rounded-xl transition-all duration-200 overflow-hidden")}
            style={{
              color: isActive("/settings") ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.4)",
              background: isActive("/settings") ? "hsl(var(--primary) / 0.1)" : "transparent",
            }}
          >
            <div className="flex flex-shrink-0 items-center justify-center w-14">
              <motion.div
                variants={iconVariants}
                whileHover="hover"
                whileTap="tap"
                animate={isActive("/settings") ? "active" : ""}
              >
                <MSIcon icon="settings" filled={isActive("/settings")} className="text-2xl" />
              </motion.div>
            </div>
            <span className={cn("font-headline text-sm font-semibold tracking-tight whitespace-nowrap transition-all duration-300", isExpanded ? "opacity-100 max-w-[180px]" : "opacity-0 max-w-0 overflow-hidden")}>
              Settings
            </span>
          </Link>

          {/* Profile */}
          <Link
            to="/logout"
            onClick={() => setIsMobileOpen(false)}
            title={isExpanded ? undefined : userData?.full_name || "Profile"}
            className="flex items-center h-14 mx-2 mt-1 rounded-xl transition-colors group overflow-hidden"
            style={{ color: "hsl(var(--primary))" }}
          >
            <span className="flex flex-shrink-0 items-center justify-center w-14">
              <div className="w-10 h-10 rounded-full overflow-hidden" style={{ border: "2px solid hsl(var(--primary) / 0.35)" }}>
                <AvatarInitials name={userData?.full_name || userData?.username || "GUEST"} url={userData?.avatar} className="text-base" />
              </div>
            </span>
            <div className={cn("flex flex-col whitespace-nowrap overflow-hidden transition-all duration-300", isExpanded ? "opacity-100 max-w-[180px]" : "opacity-0 max-w-0")}>
              <span className="font-headline text-sm font-bold truncate uppercase" style={{ color: "hsl(var(--primary))" }}>
                {userData?.full_name || userData?.username || "GUEST"}
              </span>
              <span className="text-[10px] truncate" style={{ color: "hsl(var(--primary) / 0.6)" }}>
                {userData?.uniqueTag || "Identity Profile"}
              </span>
            </div>
          </Link>
        </div>
      </aside>
    </>
  );
}
