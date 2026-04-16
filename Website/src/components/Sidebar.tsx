import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import { AvatarInitials } from "@/components/AvatarInitials";
import BubbleIcon from "@/components/BubbleIcon";
import { fetchUnreadCount } from "@/api";

// ─── Static data ──────────────────────────────────────────────────────────────
const NAV_ICONS = [
  { icon: "chat",          label: "Chats",     path: "/messages"  },
  { icon: "work",          label: "Work",      path: "/workspace" },
  { icon: "video_chat",    label: "Meet",      path: "/meet"      },
  { icon: "group",         label: "Community", path: "/community" },
  { icon: "rss_feed",      label: "Feed",      path: "/feed"      },
  { icon: "smart_toy",     label: "Aida AI",   path: "/ai"        },
  { icon: "bookmark",      label: "Saved",     path: "/saved"     },
  { icon: "calendar_today",label: "Calendar",  path: "/calendar"  },
  { icon: "payments",      label: "Payments",  path: "/payments"  },
];


function MSIcon({
  icon,
  filled = false,
  className,
}: {
  icon: string;
  filled?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn("material-symbols-outlined select-none", className)}
      style={
        filled
          ? { fontVariationSettings: "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24" }
          : { fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }
      }
    >
      {icon}
    </span>
  );
}

export default function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();
  const [userData, setUserData]     = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadChatsCount, setUnreadChatsCount] = useState(0);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/v1/profile/me", {
          headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
        });
        const json = await res.json();
        if (json.data) setUserData(json.data);
      } catch (err) {}
    };
    fetchUser();
  }, []);

  // Poll notification count every 30s
  useEffect(() => {
    const tick = async () => {
      try {
        const notifData = await fetchUnreadCount();
        setUnreadCount(notifData.count || 0);

        try {
          const { fetchUnreadMessageCount } = await import('@/api');
          const msgData = await fetchUnreadMessageCount();
          setUnreadChatsCount(msgData.count || 0);
        } catch { /* ignored */ }
      } catch { /* silent */ }
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);


  // Match current route — use startsWith so nested paths (e.g. /meet/room) still activate /meet
  const isActive = (path: string) => {
    const cur = location.pathname === "/" ? "/feed" : location.pathname;
    if (path === "/feed") return cur === "/feed" || cur === "/";
    return cur === path || cur.startsWith(path + "/");
  };

  return (
    <aside
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      className={cn(
        "fixed left-0 top-0 h-full z-50 flex flex-col py-6",
        "bg-[var(--th-bg)]/95 backdrop-blur-2xl",
        "border-r border-[var(--th-border)] shadow-2xl transition-all duration-300",
        isExpanded ? "w-64" : "w-[85px]"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "mb-6 flex items-center h-10 px-6 transition-all overflow-hidden shrink-0",
          isExpanded ? "justify-start" : "justify-center"
        )}
      >
        <BubbleIcon 
          style={{ width: isExpanded ? '120px' : '32px', height: '32px', transition: 'width 0.3s' }} 
          primaryColor="var(--th-accent)" 
          secondaryColor="var(--th-secondary)"
        />
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
              className={cn(
                "flex items-center h-12 mx-2 mb-1 rounded-xl shrink-0",
                "border-l-[3px] transition-all duration-200 group overflow-hidden"
              )}
              style={{
                color:           active ? "var(--th-accent)"  : "var(--th-secondary)",
                borderLeftColor: active ? "var(--th-accent)"  : "transparent",
                background:      active ? "color-mix(in srgb, var(--th-accent) 10%, transparent)" : "transparent",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.color = "var(--th-accent)";
                  e.currentTarget.style.background = "color-mix(in srgb, var(--th-accent) 5%, transparent)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.color = "var(--th-secondary)";
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              {/* Icon zone — fixed 56px wide so items never shift */}
              <span className="flex flex-shrink-0 items-center justify-center w-14 relative">
                <MSIcon icon={icon} filled={active} className="text-2xl" />
                {path === '/messages' && unreadChatsCount > 0 && (
                  <span
                    className="absolute top-1 right-1 min-w-[14px] h-3.5 rounded-full text-[8px] font-bold flex items-center justify-center px-1"
                    style={{ background: "#ef4444", color: "#fff" }}
                  >
                    {unreadChatsCount > 99 ? "99+" : unreadChatsCount}
                  </span>
                )}
              </span>

              {/* Label — slides in / out */}
              <span
                className={cn(
                  "font-headline text-sm font-medium tracking-wide whitespace-nowrap transition-all duration-300",
                  isExpanded ? "opacity-100 max-w-[180px]" : "opacity-0 max-w-0 overflow-hidden"
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div
        className="mt-auto flex flex-col w-full shrink-0 pt-4"
        style={{ borderTop: "1px solid var(--th-border)" }}
      >
        {/* Notifications bell */}
        <Link
          to="/notifications"
          title={isExpanded ? undefined : "Notifications"}
          className={cn(
            "flex items-center h-12 mx-2 mb-1 rounded-xl border-l-[3px] transition-all duration-200 group overflow-hidden relative"
          )}
          style={{
            color:           isActive("/notifications") ? "var(--th-accent)"  : "var(--th-secondary)",
            borderLeftColor: isActive("/notifications") ? "var(--th-accent)"  : "transparent",
            background:      isActive("/notifications") ? "color-mix(in srgb, var(--th-accent) 10%, transparent)" : "transparent",
          }}
          onMouseEnter={(e) => {
            if (!isActive("/notifications")) {
              e.currentTarget.style.color = "var(--th-accent)";
              e.currentTarget.style.background = "color-mix(in srgb, var(--th-accent) 5%, transparent)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isActive("/notifications")) {
              e.currentTarget.style.color = "var(--th-secondary)";
              e.currentTarget.style.background = "transparent";
            }
          }}
        >
          <span className="flex flex-shrink-0 items-center justify-center w-14 relative">
            <MSIcon icon="notifications" filled={isActive("/notifications")} className="text-2xl" />
            {unreadCount > 0 && (
              <span
                className="absolute top-0 right-2 min-w-[16px] h-4 rounded-full text-[9px] font-bold flex items-center justify-center px-1"
                style={{ background: "#ef4444", color: "#fff" }}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </span>
          <span
            className={cn(
              "font-headline text-sm font-medium tracking-wide whitespace-nowrap transition-all duration-300",
              isExpanded ? "opacity-100 max-w-[180px]" : "opacity-0 max-w-0 overflow-hidden"
            )}
          >
            Notifications{unreadCount > 0 && ` (${unreadCount})`}
          </span>
        </Link>

        {/* Settings */}
        <Link
          to="/settings"
          title={isExpanded ? undefined : "Settings"}
          className={cn(
            "flex items-center h-12 mx-2 mb-1 rounded-xl border-l-[3px] transition-all duration-200 group overflow-hidden"
          )}

          style={{
            color:           isActive("/settings") ? "var(--th-accent)"  : "var(--th-secondary)",
            borderLeftColor: isActive("/settings") ? "var(--th-accent)"  : "transparent",
            background:      isActive("/settings") ? "color-mix(in srgb, var(--th-accent) 10%, transparent)" : "transparent",
          }}
          onMouseEnter={(e) => {
            if (!isActive("/settings")) {
              e.currentTarget.style.color = "var(--th-accent)";
              e.currentTarget.style.background = "color-mix(in srgb, var(--th-accent) 5%, transparent)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isActive("/settings")) {
              e.currentTarget.style.color = "var(--th-secondary)";
              e.currentTarget.style.background = "transparent";
            }
          }}
        >
          <span className="flex flex-shrink-0 items-center justify-center w-14">
            <MSIcon icon="settings" filled={isActive("/settings")} className="text-2xl" />
          </span>
          <span
            className={cn(
              "font-headline text-sm font-medium tracking-wide whitespace-nowrap transition-all duration-300",
              isExpanded ? "opacity-100 max-w-[180px]" : "opacity-0 max-w-0 overflow-hidden"
            )}
          >
            Settings
          </span>
        </Link>

        {/* Profile / Logout */}
        <Link
          to="/logout"
          title={isExpanded ? undefined : "Profile"}
          className="flex items-center h-14 mx-2 mt-1 rounded-xl hover:bg-white/5 transition-colors group overflow-hidden"
        >
          <span className="flex flex-shrink-0 items-center justify-center w-14">
            <div
              className="w-9 h-9 rounded-full border-2 overflow-hidden group-hover:border-[var(--th-accent)]/50 transition-colors"
              style={{ borderColor: "var(--th-border)" }}
            >
              <AvatarInitials 
                name={userData?.full_name || userData?.username || "GUEST"}
                url={userData?.avatar}
                className="text-base"
              />
            </div>
          </span>
          <div
            className={cn(
              "flex flex-col whitespace-nowrap overflow-hidden transition-all duration-300",
              isExpanded ? "opacity-100 max-w-[180px]" : "opacity-0 max-w-0"
            )}
          >
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
  );
}
