import { useState, useEffect, useCallback } from "react";
import BubbleLayout from "@/components/BubbleLayout";
import { AvatarInitials } from "@/components/AvatarInitials";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearAllNotifications,
} from "@/api";

const TYPE_ICONS: Record<string, string> = {
  new_message: "chat",
  new_group_message: "group",
  task_assigned: "task_alt",
  task_due_soon: "alarm",
  meeting_started: "videocam",
  meeting_ended: "meeting_room",
  meeting_action_item: "checklist",
  meeting_invite: "video_call",
  payment_received: "payments",
  payment_due: "credit_card_off",
  invoice_sent: "receipt_long",
  file_shared: "folder_shared",
  community_post: "groups",
  feed_mention: "alternate_email",
  feed_like: "favorite",
  feed_comment: "comment",
  contact_added: "person_add",
  system: "info",
};

const TYPE_COLORS: Record<string, string> = {
  new_message: "#6366f1",
  new_group_message: "#8b5cf6",
  task_assigned: "#f59e0b",
  task_due_soon: "#ef4444",
  meeting_started: "#10b981",
  meeting_ended: "#6366f1",
  meeting_action_item: "#f59e0b",
  payment_received: "#10b981",
  payment_due: "#ef4444",
  invoice_sent: "#3b82f6",
  file_shared: "#6366f1",
  community_post: "#8b5cf6",
  feed_mention: "#ec4899",
  feed_like: "#ef4444",
  feed_comment: "#6366f1",
  contact_added: "#10b981",
  system: "#6b7280",
};

function timeAgo(dateStr: string) {
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function groupByDay(notifications: any[]) {
  const groups: Record<string, any[]> = {};
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  for (const n of notifications) {
    const d = new Date(n.createdAt).toDateString();
    const label = d === today ? "Today" : d === yesterday ? "Yesterday" : new Date(n.createdAt).toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric" });
    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  }
  return groups;
}

function MSIcon({ icon, className = "", style }: { icon: string; className?: string; style?: React.CSSProperties }) {
  return <span className={`material-symbols-outlined select-none ${className}`} style={style}>{icon}</span>;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [userData, setUserData] = useState<any>(null);

  // Fetch logged-in user for the avatar
  useEffect(() => {
    const BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";
    fetch(`${BASE}/profile/me`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
    })
      .then(r => r.json())
      .then(j => { if (j.data) setUserData(j.data); })
      .catch(() => { });
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchNotifications(1, 100);
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRead = async (id: string) => {
    await markNotificationRead(id);
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleDelete = async (id: string) => {
    await deleteNotification(id);
    setNotifications(prev => prev.filter(n => n._id !== id));
  };

  const handleClearAll = async () => {
    await clearAllNotifications();
    setNotifications([]);
    setUnreadCount(0);
  };

  const displayed = filter === "unread" ? notifications.filter(n => !n.read) : notifications;
  const grouped = groupByDay(displayed);

  return (
    <BubbleLayout>
      <div className="flex-1 flex flex-col h-full" style={{ background: "var(--th-bg)" }}>
        {/* Header */}
        <div
          className="flex items-center justify-between px-8 py-5 border-b shrink-0"
          style={{ borderColor: "var(--th-border)", background: "var(--th-surface)" }}
        >
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--th-text)" }}>
              Notifications
            </h1>
            {unreadCount > 0 && (
              <p className="text-sm mt-0.5" style={{ color: "var(--th-muted)" }}>
                {unreadCount} unread
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Filter pills */}
            {(["all", "unread"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-all"
                style={{
                  background: filter === f ? "var(--th-accent)" : "var(--th-border)",
                  color: filter === f ? "#fff" : "var(--th-secondary)",
                }}
              >
                {f}
              </button>
            ))}
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all hover:opacity-80"
                style={{ background: "color-mix(in srgb, var(--th-accent) 15%, transparent)", color: "var(--th-accent)" }}
              >
                <MSIcon icon="done_all" className="text-base" />
                Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all hover:opacity-80"
                style={{ background: "color-mix(in srgb, #ef4444 10%, transparent)", color: "#ef4444" }}
              >
                <MSIcon icon="delete_sweep" className="text-base" />
                Clear all
              </button>
            )}
            <div className="w-10 h-10 rounded-xl overflow-hidden border ml-2 shrink-0" style={{ borderColor: 'var(--th-border)' }}>
              <AvatarInitials name={userData?.full_name || userData?.username || "U"} url={userData?.avatar} className="text-sm" />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-8 py-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--th-accent)", borderTopColor: "transparent" }} />
            </div>
          ) : displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: "var(--th-surface)" }}>
                <MSIcon icon="notifications_none" className="text-4xl" style={{ color: "var(--th-muted)" } as any} />
              </div>
              <p className="text-lg font-medium" style={{ color: "var(--th-muted)" }}>
                {filter === "unread" ? "All caught up!" : "No notifications yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-8 max-w-2xl mx-auto">
              {Object.entries(grouped).map(([day, items]) => (
                <div key={day}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--th-muted)" }}>
                    {day}
                  </p>
                  <div className="space-y-1">
                    {items.map(n => {
                      const color = TYPE_COLORS[n.type] || "#6366f1";
                      const icon = TYPE_ICONS[n.type] || "notifications";
                      return (
                        <div
                          key={n._id}
                          onClick={() => !n.read && handleRead(n._id)}
                          className="flex items-start gap-4 p-4 rounded-2xl cursor-pointer transition-all group"
                          style={{
                            background: n.read
                              ? "transparent"
                              : "color-mix(in srgb, var(--th-accent) 5%, transparent)",
                            border: `1px solid ${n.read ? "var(--th-border)" : "color-mix(in srgb, var(--th-accent) 20%, transparent)"}`,
                          }}
                        >
                          {/* Icon */}
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                            style={{ background: `${color}22` }}
                          >
                            <MSIcon icon={icon} className="text-xl" style={{ color } as any} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold leading-snug" style={{ color: "var(--th-text)" }}>
                              {n.title}
                            </p>
                            <p className="text-sm mt-0.5 leading-relaxed" style={{ color: "var(--th-muted)" }}>
                              {n.body}
                            </p>
                          </div>

                          {/* Meta */}
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <span className="text-xs whitespace-nowrap" style={{ color: "var(--th-muted)" }}>
                              {timeAgo(n.createdAt)}
                            </span>
                            {!n.read && (
                              <div className="w-2 h-2 rounded-full" style={{ background: "var(--th-accent)" }} />
                            )}
                          </div>

                          {/* Delete on hover */}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(n._id); }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-red-500/10"
                            title="Remove"
                          >
                            <MSIcon icon="close" className="text-base text-red-400" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </BubbleLayout>
  );
}
