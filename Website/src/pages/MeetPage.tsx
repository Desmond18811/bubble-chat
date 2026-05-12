import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams, Routes, Route } from "react-router-dom";
import { cn } from "@/lib/utils";
import Sidebar from "@/components/Sidebar";
import {
  fetchCallLogs,
  saveCallLog,
  clearCallLogs,
  deleteCallLog,
  uploadWorkspaceFile,
  fetchMeetings,
  createMeeting as apiCreateMeeting,
  addMeetingTranscriptChunk,
  endMeeting as apiEndMeeting,
  logMeetingFile,
  startMeetingScreenShare,
  endMeetingScreenShare,
  getAuthHeaders
} from "@/api";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";
import { TranscriptDrawer } from "@/components/TranscriptDrawer";
import { toast } from "sonner";

// ─── Env ──────────────────────────────────────────────────────────────────────
const BASE_URL = (import.meta.env.VITE_API_URL?.replace(/ i$/, '')?.trim()) || "http://localhost:3000/api/v1";
const ZEGO_APP_ID = Number(import.meta.env.VITE_ZEGO_APP_ID || 0);
const ZEGO_SERVER_SECRET = import.meta.env.VITE_ZEGO_SERVER_SECRET || "";

// ─── Utils ────────────────────────────────────────────────────────────────────

function generateRoomId() {
  const uuid = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  return `bubble-${uuid}-${Date.now()}`;
}

function getCurrentUser() {
  try {
    const raw = localStorage.getItem("user");
    if (raw) {
      const u = JSON.parse(raw);
      return { id: u._id || u.id || `user-${Date.now()}`, name: u.username || u.name || "You" };
    }
  } catch (_) { }
  return { id: `user-${Date.now()}`, name: "You" };
}

function buildInviteLink(roomId: string, type: "voice" | "video") {
  return `${window.location.origin}/meet/room/${encodeURIComponent(roomId)}?type=${type}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecentCall {
  id: string;
  roomId: string;
  type: "voice" | "video";
  label: string;
  ts: number;
  duration?: number;
  missed?: boolean;
  hasAI?: boolean;
  summary?: string;
  actionItems?: any[];
}

interface ScheduledCall {
  id: string;
  roomId: string;
  type: "voice" | "video";
  label: string;
  scheduledAt: number;
  link: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MSIcon({ icon, filled = false, className }: { icon: string; filled?: boolean; className?: string }) {
  return (
    <span
      className={cn("material-symbols-outlined select-none", className)}
      style={{
        fontVariationSettings: filled
          ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
          : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
      }}
    >
      {icon}
    </span>
  );
}

// ─── Action Items Drawer ──────────────────────────────────────────────────────

function ActionItemsDrawer({ meeting, onClose }: { meeting: any; onClose: () => void }) {
  if (!meeting) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm p-0">
      <div className="bg-[var(--th-surface)] border-l border-[var(--th-border)] w-full max-w-md h-full shadow-2xl flex flex-col slide-in-right">
        <div className="flex items-center justify-between p-6 border-b border-[var(--th-border)] bg-[var(--th-surface-low)]">
          <h2 className="text-[var(--th-text)] font-bold text-lg flex items-center gap-2">
            <MSIcon icon="auto_awesome" className="text-[var(--th-accent)]" />
            AI Summary & Action Items
          </h2>
          <button onClick={onClose} className="text-[var(--th-muted)] hover:text-[var(--th-accent)] transition-colors">
            <MSIcon icon="close" />
          </button>
        </div>
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="mb-6">
            <h3 className="text-xs font-bold text-[var(--th-muted)] uppercase tracking-wider mb-2">Meeting Details</h3>
            <p className="text-sm text-[var(--th-text)] font-medium">{meeting.title || meeting.label}</p>
            <p className="text-xs text-[var(--th-muted)] mt-1">{new Date(meeting.startedAt || meeting.timestamp || meeting.ts).toLocaleString()}</p>
          </div>
          <div className="mb-6">
            <h3 className="text-xs font-bold text-[var(--th-accent)] uppercase tracking-wider mb-2 flex items-center gap-2">
              <MSIcon icon="summarize" className="text-sm" /> Executive Summary
            </h3>
            <div className="p-4 bg-[var(--th-surface-low)] border border-[var(--th-border)] rounded-xl text-sm text-[var(--th-text)] leading-relaxed">
              {meeting.summary ? meeting.summary : "No summary has been generated for this meeting yet. Aida AI parses the transcript to generate summaries after the meeting ends."}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-bold text-[var(--th-secondary)] uppercase tracking-wider mb-2 flex items-center gap-2">
              <MSIcon icon="task_alt" className="text-sm" /> Action Items
            </h3>
            {meeting.actionItems && meeting.actionItems.length > 0 ? (
              <ul className="space-y-3">
                {meeting.actionItems.map((item: any, i: number) => (
                  <li key={i} className="flex gap-3 bg-[var(--th-surface-low)] border border-[var(--th-border)] p-3 rounded-xl items-start">
                    <MSIcon icon="check_circle" className="text-[var(--th-secondary)] mt-0.5" />
                    <div>
                      <p className="text-sm text-[var(--th-text)]">{item.task || item.text}</p>
                      {item.assignedTo && (
                        <p className="text-xs text-[var(--th-muted)] mt-1 tracking-tight">
                          Assigned to: <span className="text-[var(--th-accent)]">@{item.assignedTo}</span>
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--th-muted)] italic">No explicit tasks were extracted from the transcript.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Schedule Modal ───────────────────────────────────────────────────────────

function ScheduleModal({ onClose, onSchedule }: { onClose: () => void; onSchedule: (s: ScheduledCall) => void }) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState<"voice" | "video">("video");
  const [dateTime, setDateTime] = useState("");
  const [copied, setCopied] = useState(false);
  const [generated, setGenerated] = useState<ScheduledCall | null>(null);

  const handleGenerate = () => {
    if (!dateTime) return;
    const roomId = generateRoomId();
    const link = buildInviteLink(roomId, type);
    const s: ScheduledCall = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36),
      roomId, type,
      label: label || `Scheduled ${type === "video" ? "Video" : "Voice"} Call`,
      scheduledAt: new Date(dateTime).getTime(),
      link,
    };
    setGenerated(s);
    onSchedule(s);
  };

  const handleCopy = () => {
    if (!generated) return;
    navigator.clipboard.writeText(generated.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[var(--th-surface-low)] border border-[var(--th-border)] rounded-2xl p-6 w-full max-w-md shadow-2xl glass">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[var(--th-text)] font-bold text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Schedule a Call</h2>
          <button onClick={onClose} className="text-[var(--th-muted)] hover:text-[var(--th-accent)] transition-colors"><MSIcon icon="close" /></button>
        </div>
        {!generated ? (
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-[var(--th-muted)] mb-1 block">Title (optional)</label>
              <input className="w-full bg-[var(--th-surface-low)] border border-[var(--th-border)] rounded-xl px-4 py-2.5 text-[var(--th-text)] text-sm outline-none focus:border-[var(--th-accent)]/50 placeholder:text-[var(--th-muted)]/50" placeholder="Team sync, Project review…" value={label} onChange={e => setLabel(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-[var(--th-muted)] mb-1 block">Date & Time</label>
              <input type="datetime-local" className="w-full bg-[var(--th-surface-low)] border border-[var(--th-border)] rounded-xl px-4 py-2.5 text-[var(--th-text)] text-sm outline-none focus:border-[var(--th-accent)]/50 [color-scheme:dark]" value={dateTime} onChange={e => setDateTime(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-[var(--th-muted)] mb-2 block">Call Type</label>
              <div className="flex gap-3">
                {(["voice", "video"] as const).map(t => (
                  <button key={t} onClick={() => setType(t)} className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-all", type === t ? "bg-[var(--th-accent)]/10 border-[var(--th-accent)]/50 text-[var(--th-accent)]" : "bg-[var(--th-surface-low)] border-[var(--th-border)] text-[var(--th-muted)] hover:border-[var(--th-accent)]/20")}>
                    <MSIcon icon={t === "voice" ? "mic" : "videocam"} filled={type === t} className="text-lg" />
                    {t === "voice" ? "Voice" : "Video"}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handleGenerate} disabled={!dateTime} className="mt-2 w-full py-3 rounded-xl bg-gradient-to-r from-[var(--th-accent)] to-[var(--th-secondary)] text-[var(--th-accent-text)] font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">Generate Link</button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 bg-[var(--th-surface-low)] rounded-xl p-4 border border-[var(--th-border)]">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", generated.type === "video" ? "bg-[var(--th-secondary)]/10" : "bg-[var(--th-accent)]/10")}>
                <MSIcon icon={generated.type === "video" ? "videocam" : "mic"} filled className={cn("text-xl", generated.type === "video" ? "text-[var(--th-secondary)]" : "text-[var(--th-accent)]")} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[var(--th-text)] font-semibold text-sm truncate">{generated.label}</p>
                <p className="text-[var(--th-muted)] text-xs mt-0.5">{new Date(generated.scheduledAt).toLocaleString()}</p>
              </div>
            </div>
            <div className="bg-[var(--th-surface-low)] rounded-xl p-3 border border-[var(--th-border)]">
              <p className="text-[var(--th-muted)] text-xs mb-1">Private invite link</p>
              <p className="text-[var(--th-secondary)] text-xs font-mono break-all line-clamp-2">{generated.link}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={handleCopy} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--th-accent)]/10 border border-[var(--th-accent)]/30 text-[var(--th-accent)] text-sm font-medium hover:bg-[var(--th-accent)]/20 transition-all">
                <MSIcon icon={copied ? "check" : "content_copy"} className="text-lg" />
                {copied ? "Copied!" : "Copy Link"}
              </button>
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-[var(--th-surface-low)] border border-[var(--th-border)] text-[var(--th-muted)] text-sm font-medium hover:text-[var(--th-text)] transition-colors">Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Join Modal ───────────────────────────────────────────────────────────────

function JoinModal({ onClose, onJoin }: { onClose: () => void; onJoin: (roomId: string, type: "voice" | "video") => void }) {
  const [input, setInput] = useState("");
  const [type, setType] = useState<"voice" | "video">("video");

  const handleJoin = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    try {
      const url = new URL(trimmed);
      const segments = url.pathname.split("/");
      const roomId = decodeURIComponent(segments[segments.length - 1]);
      const t = (url.searchParams.get("type") as "voice" | "video") || type;
      onJoin(roomId, t);
    } catch {
      onJoin(trimmed, type);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[var(--th-surface-low)] border border-[var(--th-border)] rounded-2xl p-6 w-full max-w-md shadow-2xl glass">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[var(--th-text)] font-bold text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Join a Call</h2>
          <button onClick={onClose} className="text-[var(--th-muted)] hover:text-[var(--th-accent)] transition-colors"><MSIcon icon="close" /></button>
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-[var(--th-muted)] mb-1 block">Room ID or Invite Link</label>
            <input className="w-full bg-[var(--th-surface-low)] border border-[var(--th-border)] rounded-xl px-4 py-2.5 text-[var(--th-text)] text-sm outline-none focus:border-[var(--th-accent)]/50 placeholder:text-[var(--th-muted)]/50" placeholder="Paste invite link or enter room ID…" value={input} onChange={e => setInput(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-[var(--th-muted)] mb-2 block">Call Type</label>
            <div className="flex gap-3">
              {(["voice", "video"] as const).map(t => (
                <button key={t} onClick={() => setType(t)} className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-all", type === t ? "bg-[var(--th-accent)]/10 border-[var(--th-accent)]/50 text-[var(--th-accent)]" : "bg-[var(--th-surface-low)] border-[var(--th-border)] text-[var(--th-muted)] hover:border-[var(--th-accent)]/20")}>
                  <MSIcon icon={t === "voice" ? "mic" : "videocam"} filled={type === t} className="text-lg" />
                  {t === "voice" ? "Voice" : "Video"}
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleJoin} disabled={!input.trim()} className="mt-2 w-full py-3 rounded-xl bg-gradient-to-r from-[var(--th-secondary)] to-[var(--th-accent)] text-[var(--th-accent-text)] font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">Join Now</button>
        </div>
      </div>
    </div>
  );
}

// ─── Meet Lobby ───────────────────────────────────────────────────────────────

function MeetLobby() {
  const navigate = useNavigate();
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledCall[]>([]);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [transcriptRoom, setTranscriptRoom] = useState<{ roomId: string; label: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeMeeting, setActiveMeeting] = useState<RecentCall | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const [logsData, meetingsData] = await Promise.all([
        fetchCallLogs().catch(() => ({ logs: [] })),
        fetchMeetings(1, 40).catch(() => ({ meetings: [] })),
      ]);

      const logItems = (logsData.logs || []).map((l: any) => ({
        id: l._id, roomId: l.roomId, type: l.type, label: l.label,
        ts: new Date(l.timestamp).getTime(), duration: l.duration, missed: l.missed,
      }));

      const meetingItems = (meetingsData.meetings || []).map((m: any) => ({
        id: m._id, roomId: m.roomId, type: m.type, label: m.title || "Meeting",
        ts: new Date(m.startedAt || m.createdAt).getTime(),
        duration: m.endedAt ? Math.floor((new Date(m.endedAt).getTime() - new Date(m.startedAt).getTime()) / 1000) : 0,
        hasAI: true, summary: m.summary, actionItems: m.actionItems,
      }));

      const map = new Map<string, RecentCall>();
      logItems.forEach((item: RecentCall) => map.set(item.roomId, item));
      meetingItems.forEach((item: RecentCall) => {
        if (map.has(item.roomId)) {
          const existing: any = map.get(item.roomId);
          map.set(item.roomId, { ...existing, ...item, id: existing.id });
        } else {
          map.set(item.roomId, item);
        }
      });

      setRecentCalls(Array.from(map.values()).sort((a, b) => b.ts - a.ts));
    } catch (err) {
      console.error("Failed to fetch call logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
    try {
      const s = JSON.parse(localStorage.getItem("bubble_scheduled_calls") || "[]");
      setScheduled(s);
    } catch (_) { }
  }, []);

  const handleClearLogs = async () => {
    if (!confirm("Clear all recent calls?")) return;
    try {
      await clearCallLogs();
      setRecentCalls([]);
      toast.success("Call logs cleared");
    } catch { toast.error("Failed to clear logs"); }
  };

  const handleDeleteLog = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteCallLog(id);
      setRecentCalls(prev => prev.filter(c => c.id !== id));
      toast.success("Call log deleted");
    } catch { toast.error("Failed to delete log"); }
    setOpenMenuId(null);
  };

  const startCall = useCallback((type: "voice" | "video") => {
    const roomId = generateRoomId();
    navigate(`/meet/room/${encodeURIComponent(roomId)}?type=${type}`);
  }, [navigate]);

  const joinRoom = useCallback((roomId: string, type: "voice" | "video") => {
    navigate(`/meet/room/${encodeURIComponent(roomId)}?type=${type}`);
  }, [navigate]);

  const handleSchedule = (s: ScheduledCall) => {
    const updated = [s, ...scheduled];
    setScheduled(updated);
    localStorage.setItem("bubble_scheduled_calls", JSON.stringify(updated));
  };

  const copyLink = (link: string, id: string) => {
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const deleteScheduled = (id: string) => {
    const updated = scheduled.filter(s => s.id !== id);
    setScheduled(updated);
    localStorage.setItem("bubble_scheduled_calls", JSON.stringify(updated));
  };

  const now = Date.now();
  const upcomingScheduled = scheduled.filter(s => s.scheduledAt >= now - 60 * 60 * 1000);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar pb-8" onClick={() => setOpenMenuId(null)}>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-[var(--th-accent)]/10 flex items-center justify-center">
            <MSIcon icon="video_chat" filled className="text-[var(--th-accent)] text-xl" />
          </div>
          <h1 className="text-2xl font-bold tracking-widest text-[var(--th-accent)] uppercase" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>MEETS</h1>
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-[var(--th-accent)]/10 text-[var(--th-accent)] border border-[var(--th-accent)]/20">Private &amp; Encrypted</span>
        </div>
        <p className="text-[var(--th-muted)] text-sm ml-12">Start a secure voice or video call with anyone.</p>
      </div>

      {/* Primary call cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="relative overflow-hidden rounded-2xl border border-[var(--th-accent)]/15 bg-gradient-to-br from-[var(--th-surface)] to-[var(--th-surface-low)] p-6 group cursor-pointer glass" onClick={() => startCall("voice")}>
          <div className="absolute inset-0 bg-[var(--th-accent)]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-[var(--th-accent)]/5 blur-xl" />
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-[var(--th-accent)]/10 border border-[var(--th-accent)]/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <MSIcon icon="mic" filled className="text-[var(--th-accent)] text-2xl" />
            </div>
            <h3 className="text-[var(--th-text)] font-bold text-lg mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Voice Call</h3>
            <p className="text-[var(--th-muted)] text-sm mb-4">Crystal-clear audio, no video required</p>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs text-[var(--th-accent)] bg-[var(--th-accent)]/10 px-3 py-1 rounded-full border border-[var(--th-accent)]/20"><MSIcon icon="lock" className="text-sm" />E2E Encrypted</span>
              <span className="inline-flex items-center gap-1.5 text-xs text-[var(--th-muted)] bg-[var(--th-surface-low)] px-3 py-1 rounded-full border border-[var(--th-border)]"><MSIcon icon="group" className="text-sm" />Up to 1000</span>
            </div>
          </div>
          <div className="absolute top-5 right-5 w-9 h-9 rounded-xl bg-[var(--th-accent)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
            <MSIcon icon="arrow_forward" className="text-[var(--th-bg)] text-lg" />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-[var(--th-secondary)]/15 bg-gradient-to-br from-[var(--th-surface)] to-[var(--th-surface-low)] p-6 group cursor-pointer glass" onClick={() => startCall("video")}>
          <div className="absolute inset-0 bg-[var(--th-secondary)]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-[var(--th-secondary)]/5 blur-xl" />
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-[var(--th-secondary)]/10 border border-[var(--th-secondary)]/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <MSIcon icon="videocam" filled className="text-[var(--th-secondary)] text-2xl" />
            </div>
            <h3 className="text-[var(--th-text)] font-bold text-lg mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Video Call</h3>
            <p className="text-[var(--th-muted)] text-sm mb-4">Face-to-face with HD video, reactions &amp; screen share</p>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs text-[var(--th-secondary)] bg-[var(--th-secondary)]/10 px-3 py-1 rounded-full border border-[var(--th-secondary)]/20"><MSIcon icon="lock" className="text-sm" />E2E Encrypted</span>
              <span className="inline-flex items-center gap-1.5 text-xs text-[var(--th-muted)] bg-[var(--th-surface-low)] px-3 py-1 rounded-full border border-[var(--th-border)]"><MSIcon icon="hd" className="text-sm" />HD Video</span>
            </div>
          </div>
          <div className="absolute top-5 right-5 w-9 h-9 rounded-xl bg-[var(--th-secondary)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
            <MSIcon icon="arrow_forward" className="text-[var(--th-bg)] text-lg" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        <button onClick={() => setShowSchedule(true)} className="flex flex-col items-start gap-2 p-4 rounded-xl bg-[var(--th-surface)] border border-[var(--th-border)] hover:border-[var(--th-accent)]/30 hover:bg-[var(--th-surface-high)] transition-all group">
          <div className="w-9 h-9 rounded-xl bg-[var(--th-accent)]/10 flex items-center justify-center group-hover:scale-110 transition-transform"><MSIcon icon="calendar_add_on" className="text-[var(--th-accent)] text-lg" /></div>
          <div><p className="text-[var(--th-text)] text-sm font-semibold">Schedule</p><p className="text-[var(--th-muted)] text-xs">Plan ahead</p></div>
        </button>
        <button onClick={() => setShowJoin(true)} className="flex flex-col items-start gap-2 p-4 rounded-xl bg-[var(--th-surface)] border border-[var(--th-border)] hover:border-[var(--th-secondary)]/30 hover:bg-[var(--th-surface-high)] transition-all group">
          <div className="w-9 h-9 rounded-xl bg-[var(--th-secondary)]/10 flex items-center justify-center group-hover:scale-110 transition-transform"><MSIcon icon="login" className="text-[var(--th-secondary)] text-lg" /></div>
          <div><p className="text-[var(--th-text)] text-sm font-semibold">Join a call</p><p className="text-[var(--th-muted)] text-xs">Via link or ID</p></div>
        </button>
        <button onClick={() => startCall("video")} className="flex flex-col items-start gap-2 p-4 rounded-xl bg-[var(--th-surface)] border border-[var(--th-border)] hover:border-[var(--th-accent)]/30 hover:bg-[var(--th-surface-high)] transition-all group">
          <div className="w-9 h-9 rounded-xl bg-[var(--th-accent)]/10 flex items-center justify-center group-hover:scale-110 transition-transform"><MSIcon icon="group_add" className="text-[var(--th-accent)] text-lg" /></div>
          <div><p className="text-[var(--th-text)] text-sm font-semibold">Group call</p><p className="text-[var(--th-muted)] text-xs">Share link to invite</p></div>
        </button>
      </div>

      {/* Scheduled Calls */}
      {upcomingScheduled.length > 0 && (
        <div className="mb-8">
          <h2 className="text-[var(--th-muted)] text-xs font-semibold uppercase tracking-wider mb-3">Upcoming Scheduled</h2>
          <div className="flex flex-col gap-2">
            {upcomingScheduled.map(s => (
              <div key={s.id} className="flex items-center gap-3 bg-[var(--th-surface)] border border-[var(--th-border)] rounded-xl px-4 py-3">
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", s.type === "video" ? "bg-[var(--th-secondary)]/10" : "bg-[var(--th-accent)]/10")}>
                  <MSIcon icon={s.type === "video" ? "videocam" : "mic"} filled className={cn("text-lg", s.type === "video" ? "text-[var(--th-secondary)]" : "text-[var(--th-accent)]")} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--th-text)] font-medium text-sm truncate">{s.label}</p>
                  <p className="text-[var(--th-muted)] text-xs">{new Date(s.scheduledAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => copyLink(s.link, s.id)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--th-accent)]/10 text-[var(--th-muted)] hover:text-[var(--th-accent)] transition-colors" title="Copy invite link">
                    <MSIcon icon={copiedId === s.id ? "check" : "content_copy"} className="text-base" />
                  </button>
                  <button onClick={() => joinRoom(s.roomId, s.type)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--th-secondary)]/10 text-[var(--th-muted)] hover:text-[var(--th-secondary)] transition-colors" title="Join now">
                    <MSIcon icon="call" filled className="text-base" />
                  </button>
                  <button onClick={() => deleteScheduled(s.id)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/10 text-[var(--th-muted)] hover:text-red-400 transition-colors" title="Delete">
                    <MSIcon icon="delete" className="text-base" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Calls */}
      {recentCalls.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[var(--th-muted)] text-xs font-semibold uppercase tracking-wider">Recent Calls</h2>
            <button onClick={handleClearLogs} className="text-[var(--th-muted)] hover:text-red-400 text-[10px] font-bold uppercase transition-colors">Clear All</button>
          </div>
          <div className="flex flex-col gap-1">
            {recentCalls.map(c => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--th-surface)] transition-colors group cursor-pointer" onClick={() => joinRoom(c.roomId, c.type)}>
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", c.missed ? "bg-red-500/10" : c.type === "video" ? "bg-[var(--th-secondary)]/10" : "bg-[var(--th-accent)]/10")}>
                  <MSIcon icon={c.type === "video" ? "videocam" : "mic"} filled className={cn("text-lg", c.missed ? "text-red-400" : c.type === "video" ? "text-[var(--th-secondary)]" : "text-[var(--th-accent)]")} />
                </div>
                <div className="flex-1 min-w-0" onClick={e => { e.stopPropagation(); c.hasAI ? setActiveMeeting(c) : joinRoom(c.roomId, c.type); }}>
                  <div className="flex items-center gap-2">
                    <p className="text-[var(--th-text)] text-sm font-medium truncate">{c.label}</p>
                    {c.hasAI && <MSIcon icon="auto_awesome" className="text-[12px] text-[var(--th-accent)]" />}
                    {c.hasAI && c.actionItems && c.actionItems.length > 0 && (
                      <span className="text-[9px] bg-[var(--th-secondary)]/10 text-[var(--th-secondary)] px-1.5 py-0.5 rounded-full font-bold">{c.actionItems.length} TASKS</span>
                    )}
                  </div>
                  <p className="text-[var(--th-muted)] text-xs">{new Date(c.ts).toLocaleString()} · {c.hasAI ? "Tap to view AI Summary" : "Tap to rejoin room"}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); joinRoom(c.roomId, c.type); }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--th-surface-high)] text-[var(--th-muted)] hover:text-[var(--th-accent)] transition-colors opacity-0 group-hover:opacity-100" title="Join Room">
                  <MSIcon icon="call" className="text-base" />
                </button>
                <div className="relative">
                  <button onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === c.id ? null : c.id); }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--th-surface-high)] text-[var(--th-muted)] hover:text-[var(--th-accent)] transition-colors opacity-0 group-hover:opacity-100" title="Options">
                    <MSIcon icon="more_vert" className="text-base" />
                  </button>
                  {openMenuId === c.id && (
                    <div className="absolute right-0 top-full mt-2 w-40 bg-[var(--th-surface-high)] border border-[var(--th-border)] rounded-xl shadow-xl z-50 py-1 overflow-hidden">
                      <button onClick={e => { e.stopPropagation(); setOpenMenuId(null); setTranscriptRoom({ roomId: c.roomId, label: c.label }); }} className="w-full text-left px-4 py-2 text-sm text-[var(--th-text)] hover:bg-[var(--th-surface-top)] transition-colors flex items-center gap-2">
                        <MSIcon icon="auto_awesome" className="text-base" /> View Transcript
                      </button>
                      <button onClick={e => handleDeleteLog(c.id, e)} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2">
                        <MSIcon icon="delete" className="text-base" /> Delete Log
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showSchedule && <ScheduleModal onClose={() => setShowSchedule(false)} onSchedule={handleSchedule} />}
      {showJoin && <JoinModal onClose={() => setShowJoin(false)} onJoin={(roomId, type) => { setShowJoin(false); joinRoom(roomId, type); }} />}
      {activeMeeting && <ActionItemsDrawer meeting={activeMeeting} onClose={() => setActiveMeeting(null)} />}
      {transcriptRoom && <TranscriptDrawer roomId={transcriptRoom.roomId} label={transcriptRoom.label} onClose={() => setTranscriptRoom(null)} />}
    </div>
  );
}

// ─── Meet Room (Active Call) ──────────────────────────────────────────────────

function MeetRoom() {
  const { roomId: encodedRoomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const zpRef = useRef<InstanceType<typeof ZegoUIKitPrebuilt> | null>(null);

  const roomId = encodedRoomId ? decodeURIComponent(encodedRoomId) : "";
  const callType = (searchParams.get("type") as "voice" | "video") || "video";
  const isVoice = callType === "voice";

  const [inviteLink] = useState(() => buildInviteLink(roomId, callType));
  const [copied, setCopied] = useState(false);
  const [callStarted] = useState(Date.now());
  const [initError, setInitError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  // ── Meeting record tracking ──────────────────────────────────────────────
  // meetingDbId is the MongoDB _id returned after createMeeting() at call start.
  // All transcript chunks, file logs, and screen share events use this ID.
  const meetingDbIdRef = useRef<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Screen share state ───────────────────────────────────────────────────
  // Tracks the active screen-share session ID returned by the backend so we
  // can call endMeetingScreenShare when the share stops.
  const screenShareSessionRef = useRef<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  // Tab Share Modal
  const [showTabShareModal, setShowTabShareModal] = useState(false);
  const [tabShareUrl, setTabShareUrl] = useState("");
  const [tabShareName, setTabShareName] = useState("");

  // In-room Chat
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ sender: string; text: string; ts: number }[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const user = (() => { try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; } })();
  const myName = user?.full_name || user?.username || "Me";

  const sendChatMessage = () => {
    const text = chatInput.trim();
    if (!text) return;
    setChatMessages(prev => [...prev, { sender: myName, text, ts: Date.now() }]);
    setChatInput("");
    setTimeout(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, 50);
  };

  const [transcriptRoom, setTranscriptRoom] = useState<{ roomId: string; label: string } | null>(null);

  // ── Live transcript state ────────────────────────────────────────────────
  const [liveTranscript, setLiveTranscript] = useState<{ speaker: string; text: string; id: string }[]>([]);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [showLiveTranscript, setShowLiveTranscript] = useState(false);
  const [showTranscriptMenu, setShowTranscriptMenu] = useState(false);
  const recognitionRef = useRef<any>(null);

  const handleDownloadTranscript = () => {
    const text = liveTranscript.map(t => `[${t.speaker}] ${t.text}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Transcript-${roomId}.txt`;
    a.click();
    setShowTranscriptMenu(false);
  };

  const handleClearTranscript = () => { setLiveTranscript([]); setShowTranscriptMenu(false); };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── File share ───────────────────────────────────────────────────────────
  const handleFileShare = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);

      // 1. Upload to workspace
      const wsResult = await uploadWorkspaceFile(file, {
        source: "meeting",
        sourceReference: roomId,
        workspace: "Meetings",
        description: `Shared during meeting: ${roomId}`,
      });

      // 2. Log the file against the meeting record so it appears in the
      //    transcript drawer's Files tab
      if (meetingDbIdRef.current) {
        await logMeetingFile(meetingDbIdRef.current, {
          fileId: wsResult?.file?._id || wsResult?._id,
          name: file.name,
          fileType: file.type.split('/')[0] || 'file',
          fileSize: file.size,
          fileUrl: wsResult?.file?.fileUrl || wsResult?.fileUrl,
          source: 'file_upload',
        });
      }

      toast.success("File shared to workspace");
    } catch (err: any) {
      toast.error("Failed to share file: " + err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Tab share ────────────────────────────────────────────────────────────
  const handleTabShare = () => { setTabShareUrl(""); setTabShareName(""); setShowTabShareModal(true); };

  const submitTabShare = async () => {
    if (!tabShareUrl.trim()) return toast.error("Enter a valid URL");
    try {
      setIsUploading(true);
      setShowTabShareModal(false);

      // 1. Save link to workspace
      await uploadWorkspaceFile(null, {
        linkUrl: tabShareUrl.trim(),
        name: tabShareName.trim() || tabShareUrl.trim(),
        source: "meeting",
        sourceReference: roomId,
        workspace: "Meetings",
        description: `Link shared during meeting: ${roomId}`,
      });

      // 2. Log as tab_share to meeting record
      if (meetingDbIdRef.current) {
        await logMeetingFile(meetingDbIdRef.current, {
          name: tabShareName.trim() || tabShareUrl.trim(),
          fileType: 'link',
          linkUrl: tabShareUrl.trim(),
          source: 'tab_share',
        });
      }

      toast.success("Tab link saved to workspace!");
    } catch (err: any) {
      toast.error("Failed to share link: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // ── Screen share via browser getDisplayMedia ─────────────────────────────
  // This complements Zego's own screen share button — it lets us record
  // the share session in our backend and provides a backup share route for
  // voice-only calls where Zego may not offer a screen share button.
  const handleStartScreenShare = async () => {
    if (isSharing) return;
    try {
      // Ask the browser for screen / window / tab access
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: { cursor: "always" },
        audio: false,
      });

      const track = stream.getVideoTracks()[0];
      const label = track.label || "Screen";

      // Determine share type from track label heuristics
      let shareType: 'screen' | 'window' | 'tab' = 'screen';
      if (label.toLowerCase().includes('window')) shareType = 'window';
      else if (label.toLowerCase().includes('tab') || label.toLowerCase().includes('chrome')) shareType = 'tab';

      setIsSharing(true);
      toast.success(`Sharing ${shareType}: ${label}`);

      // Record start in backend
      if (meetingDbIdRef.current) {
        const result = await startMeetingScreenShare(meetingDbIdRef.current, {
          shareType,
          label,
        });
        screenShareSessionRef.current = result?.session?._id || null;
      }

      // When the user stops sharing (browser native stop button or track ends)
      track.onended = async () => {
        setIsSharing(false);
        toast("Screen share ended");

        if (meetingDbIdRef.current && screenShareSessionRef.current) {
          await endMeetingScreenShare(
            meetingDbIdRef.current,
            screenShareSessionRef.current
          ).catch(console.error);
          screenShareSessionRef.current = null;
        }

        // Stop all tracks
        stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
      };
    } catch (err: any) {
      if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
        toast.error("Screen share failed: " + err.message);
      }
    }
  };

  // ── Leave ────────────────────────────────────────────────────────────────
  const handleLeave = useCallback(async () => {
    if (zpRef.current) {
      try { zpRef.current.destroy(); } catch (_) { }
      zpRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) { }
      recognitionRef.current.onend = null;
    }

    // End any active screen share session
    if (meetingDbIdRef.current && screenShareSessionRef.current) {
      await endMeetingScreenShare(
        meetingDbIdRef.current,
        screenShareSessionRef.current
      ).catch(console.error);
    }

    try {
      await saveCallLog({
        roomId,
        type: callType,
        label: `${isVoice ? "Voice" : "Video"} Call`,
        duration: Math.floor((Date.now() - callStarted) / 1000),
      });

      // End meeting — AI extraction runs in background on server
      if (meetingDbIdRef.current) {
        await apiEndMeeting(meetingDbIdRef.current);
      }
    } catch (_) { }

    navigate("/meet");
  }, [navigate, roomId, callType, isVoice, callStarted]);

  // ── Speech recognition (live transcript background task) ─────────────────
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          const text = event.results[i][0].transcript.trim();
          if (!text) continue;

          const chunk = {
            speaker: getCurrentUser().name,
            text,
            timestamp: Date.now(),
          };

          // Update local live transcript UI
          setLiveTranscript(prev => [
            ...prev,
            { ...chunk, id: Math.random().toString() },
          ]);

          // Fire-and-forget to backend — uses meetingDbId from the ref
          if (meetingDbIdRef.current) {
            addMeetingTranscriptChunk(meetingDbIdRef.current, chunk).catch(
              console.error
            );
          }
        }
      }
    };

    // Auto-restart on silence so the transcript keeps accumulating
    recognition.onend = () => {
      if (zpRef.current) {
        try { recognition.start(); } catch (_) { }
      }
    };

    // Note: We no longer auto-start here. 
    // We will call recognition.start() inside Zego's onJoinRoom.
    recognitionRef.current = recognition;

    const handleGlobalClick = () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setTranscriptError(null);
        } catch (_) { }
      }
    };
    document.addEventListener("click", handleGlobalClick, { capture: true });

    return () => {
      document.removeEventListener("click", handleGlobalClick, { capture: true });
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) { }
        recognitionRef.current.onend = null;
      }
    };
  }, [roomId]);

  // ── Zego init + meeting record creation ──────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || !roomId) return;

    if (!ZEGO_APP_ID || !ZEGO_SERVER_SECRET) {
      setInitError("Zego Cloud credentials are missing. Please configure VITE_ZEGO_APP_ID and VITE_ZEGO_SERVER_SECRET.");
      setIsInitializing(false);
      return;
    }

    const initZego = async () => {
      try {
        setIsInitializing(true);
        setInitError(null);

        // Create the meeting record in our backend first so we have a DB id
        // to attach transcript chunks and file shares to from the start.
        const currentUser = getCurrentUser();
        const storedUser = (() => { try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; } })();
        const userAvatar = storedUser?.avatar || '';
        try {
          const result = await apiCreateMeeting({
            roomId,
            title: `${isVoice ? "Voice" : "Video"} Call`,
            type: isVoice ? "voice" : "video",
          });
          meetingDbIdRef.current = result?.meeting?._id || null;
        } catch (err) {
          // Non-fatal: transcript will still work in memory
          console.warn("Could not create meeting record:", err);
        }

        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
          ZEGO_APP_ID,
          ZEGO_SERVER_SECRET,
          roomId,
          currentUser.id,
          currentUser.name
        );

        const zp = ZegoUIKitPrebuilt.create(kitToken);
        zpRef.current = zp;

        zp.joinRoom({
          container: containerRef.current,
          scenario: {
            mode: isVoice
              ? ZegoUIKitPrebuilt.OneONoneCall // Optimized for 2-user voice
              : ZegoUIKitPrebuilt.VideoConference,
          },
          showPreJoinView: true,
          turnOnMicrophoneWhenJoining: true,
          turnOnCameraWhenJoining: !isVoice,
          showMyCameraToggleButton: true,
          showMyMicrophoneToggleButton: true,
          showAudioVideoSettingsButton: true,
          showScreenSharingButton: !isVoice,
          showUserList: true,
          maxUsers: 1000,
          layout: "Sidebar",
          onJoinRoom: () => {
            console.log("Joined room, starting transcript...");
            if (recognitionRef.current) {
              try {
                recognitionRef.current.start();
                setTranscriptError(null);
              } catch (e: any) {
                console.warn("Failed to start recognition on join", e);
                setTranscriptError(e.message || "Auto-start blocked. Click to enable.");
              }
            }
          },
          onLeaveRoom: () => {
            if (recognitionRef.current) {
              try { recognitionRef.current.stop(); } catch (_) { }
            }
            handleLeave();
          },
          ...(userAvatar ? { userAvatar } : {}),
        });

        setIsInitializing(false);
      } catch (err: any) {
        console.error("Zego Initialization Error:", err);
        const errMsg = err?.message || String(err) || "";
        if (errMsg.includes("20021")) {
          setInitError(
            "Service Plan Expired (Error 20021). Our communication backend (ZegoCloud) free tier has run out. " +
            "Please restore video/voice capabilities by upgrading the billing plan."
          );
        } else {
          setInitError(`Connection Failure: ${errMsg || "Unknown initialization error"}. Check your network and try again.`);
        }
        setIsInitializing(false);
      }
    };

    initZego();

    return () => {
      if (zpRef.current) {
        try { zpRef.current.destroy(); } catch (_) { }
        zpRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, isVoice]);

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-3">
      {/* Room info bar */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={handleLeave} className="w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--th-surface-top)] border border-[var(--th-border)] text-[var(--th-muted)] hover:text-[var(--th-accent)] hover:border-[var(--th-accent)]/30 transition-all glass">
            <MSIcon icon="arrow_back" className="text-lg" />
          </button>
          <div className="flex items-center gap-2 bg-[var(--th-surface-top)] border border-[var(--th-border)] rounded-xl px-4 py-2 glass">
            <span className={cn("w-2 h-2 rounded-full animate-pulse", isVoice ? "bg-[var(--th-accent)]" : "bg-[var(--th-secondary)]")} />
            <span className="text-[var(--th-text)] text-sm font-medium" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{isVoice ? "Voice Room" : "Video Room"}</span>
            <span className="text-[var(--th-border)] mx-1">·</span>
            <span className="text-[var(--th-muted)] text-xs font-mono truncate max-w-[120px]">{roomId.slice(0, 20)}…</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--th-accent)] bg-[var(--th-accent)]/10 px-3 py-1.5 rounded-xl border border-[var(--th-accent)]/20">
            <MSIcon icon="lock" className="text-sm" /> Private room
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Hidden file input */}
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileShare} />

          {/* Share File */}
          <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--th-surface-top)] border border-[var(--th-border)] text-[var(--th-muted)] hover:text-[var(--th-accent)] hover:border-[var(--th-accent)]/30 transition-all text-sm glass">
            <MSIcon icon={isUploading ? "progress_activity" : "upload_file"} className={cn("text-lg", isUploading && "animate-spin")} />
            {isUploading ? "Uploading..." : "Share File"}
          </button>

          {/* Share Tab */}
          <button onClick={handleTabShare} disabled={isUploading} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--th-surface-top)] border border-[var(--th-border)] text-[var(--th-muted)] hover:text-[var(--th-accent)] hover:border-[var(--th-accent)]/30 transition-all text-sm glass">
            <MSIcon icon="public" className="text-lg" />
            Share Tab
          </button>

          {/* Share Screen — native browser API with backend session tracking */}
          <button
            onClick={handleStartScreenShare}
            disabled={isSharing}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all glass border",
              isSharing
                ? "bg-[var(--th-secondary)]/10 text-[var(--th-secondary)] border-[var(--th-secondary)]/30"
                : "bg-[var(--th-surface-top)] text-[var(--th-muted)] border-[var(--th-border)] hover:text-[var(--th-secondary)] hover:border-[var(--th-secondary)]/30"
            )}
          >
            <MSIcon icon={isSharing ? "stop_screen_share" : "screen_share"} className="text-lg" />
            <span className="hidden sm:inline">{isSharing ? "Sharing…" : "Share Screen"}</span>
          </button>

          {/* Live Captions */}
          <button onClick={() => setShowLiveTranscript(!showLiveTranscript)} className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all glass border", showLiveTranscript ? "bg-[var(--th-accent)]/10 text-[var(--th-accent)] border-[var(--th-accent)]/30" : "bg-[var(--th-surface-top)] text-[var(--th-muted)] border-[var(--th-border)] hover:text-[var(--th-accent)] hover:border-[var(--th-accent)]/30")}>
            <MSIcon icon="subtitles" className="text-lg" />
            <span className="hidden sm:inline">{showLiveTranscript ? "Hide Captions" : "Live Captions"}</span>
          </button>

          {/* Invite link */}
          <button onClick={handleCopyLink} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--th-surface-top)] border border-[var(--th-border)] text-[var(--th-muted)] hover:text-[var(--th-accent)] hover:border-[var(--th-accent)]/30 transition-all text-sm glass">
            <MSIcon icon={copied ? "check" : "link"} className="text-lg" />
            <span className="hidden sm:inline">{copied ? "Copied!" : "Invite Link"}</span>
          </button>

          {/* Chat toggle */}
          <button onClick={() => setShowChat(c => !c)} className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all glass border", showChat ? "bg-[var(--th-accent)]/10 text-[var(--th-accent)] border-[var(--th-accent)]/30" : "bg-[var(--th-surface-top)] text-[var(--th-muted)] border-[var(--th-border)] hover:text-[var(--th-accent)] hover:border-[var(--th-accent)]/30")}>
            <MSIcon icon="chat" className="text-lg" />
            <span className="hidden sm:inline">Chat</span>
            {chatMessages.length > 0 && !showChat && (
              <span className="w-4 h-4 rounded-full bg-[var(--th-accent)] text-[var(--th-accent-text)] text-[9px] font-bold flex items-center justify-center">{chatMessages.length}</span>
            )}
          </button>
        </div>
      </div>

      {/* Zego container */}
      <div className="flex-1 relative rounded-2xl overflow-hidden bg-[var(--th-background)] border border-[var(--th-border)]">
        <div ref={containerRef} className={cn("w-full h-full", (initError || isInitializing) ? "opacity-0" : "opacity-100")} />

        {isInitializing && !initError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 border-4 border-[var(--th-accent)]/20 border-t-[var(--th-accent)] rounded-full animate-spin mb-4" />
            <p className="text-[var(--th-text)] font-medium">Initializing secure connection…</p>
            <p className="text-[var(--th-muted)] text-sm mt-1">Preparing your {isVoice ? "voice" : "video"} room</p>
          </div>
        )}

        {initError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-[var(--th-background)]/90 backdrop-blur-xl z-[100]">
            <div className="w-20 h-20 rounded-3xl bg-red-400/10 border border-red-400/20 flex items-center justify-center mb-6 shadow-2xl shadow-red-500/5">
              <MSIcon icon="error_outline" className="text-red-400 text-4xl" />
            </div>
            <h3 className="text-2xl font-bold text-[var(--th-text)] mb-3 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Room Initialization Failed</h3>
            <p className="text-[var(--th-muted)] text-sm max-w-sm mb-8 leading-relaxed">
              {initError.includes("20021")
                ? "The ZegoCloud service plan has reached its limits. Professional video and voice services are currently paused for this organization."
                : initError}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/meet")}
                className="px-6 py-2.5 rounded-xl border border-[var(--th-border)] text-[var(--th-muted)] text-sm font-bold hover:border-[var(--th-accent)]/30 hover:text-[var(--th-text)] transition-all"
              >
                Back to Lobby
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2.5 rounded-xl bg-red-400 text-black text-sm font-bold hover:brightness-110 transition-all shadow-lg shadow-red-500/20"
              >
                Retry System
              </button>
            </div>
            <p className="mt-8 text-[10px] text-[var(--th-muted)] uppercase tracking-[0.2em] font-medium opacity-50">Error Code: ZG-20021-EXP</p>
          </div>
        )}

        {/* Live captions overlay */}
        {showLiveTranscript && (
          <div className="absolute left-6 bottom-24 w-80 max-h-72 bg-black/60 backdrop-blur-xl rounded-2xl border border-white/10 p-5 overflow-y-auto flex flex-col gap-3 z-50 shadow-2xl">
            <div className="sticky top-0 bg-black/40 backdrop-blur-md -mx-5 -mt-5 p-4 border-b border-white/10 mb-2 flex items-center justify-between z-10 relative">
              <h4 className="text-[10px] font-bold text-white/70 uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /> Live Transcript
              </h4>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button onClick={() => setShowTranscriptMenu(!showTranscriptMenu)} className="text-white/40 hover:text-white transition-colors">
                    <MSIcon icon="more_vert" className="text-[16px]" />
                  </button>
                  {showTranscriptMenu && (
                    <div className="absolute top-10 right-0 bg-black/90 backdrop-blur-md border border-white/10 rounded-xl p-1 shadow-xl flex flex-col w-32">
                      <button onClick={handleDownloadTranscript} className="text-left px-3 py-2 text-[11px] text-white/80 hover:bg-white/10 hover:text-white rounded-lg transition-colors">Download</button>
                      <button onClick={handleClearTranscript} className="text-left px-3 py-2 text-[11px] text-red-400 hover:bg-white/10 hover:text-red-300 rounded-lg transition-colors">Clear</button>
                    </div>
                  )}
                </div>
                <button onClick={() => setShowLiveTranscript(false)} className="text-white/40 hover:text-white transition-colors">
                  <MSIcon icon="close" className="text-[16px]" />
                </button>
              </div>
            </div>
            {liveTranscript.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2 opacity-50">
                <MSIcon icon="mic" className="text-white text-2xl animate-pulse" />
                <p className="text-xs text-white/70 italic">Listening for speech...</p>
                {transcriptError ? (
                  <div className="flex flex-col items-center gap-2 mt-2">
                    <p className="text-[10px] text-red-300 text-center px-4">{transcriptError}</p>
                    <button onClick={() => {
                      if (recognitionRef.current) {
                        try { recognitionRef.current.start(); setTranscriptError(null); } catch (e: any) { setTranscriptError(e.message || "Failed again"); }
                      }
                    }} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-md text-[10px] text-white">Retry Live Captions</button>
                  </div>
                ) : (
                  <p className="text-[10px] text-white/40 text-center px-4">Speak clearly into your microphone</p>
                )}
              </div>
            ) : (
              liveTranscript.slice(-20).map(t => (
                <div key={t.id} className="text-[13px] leading-relaxed">
                  <span className="font-bold text-[var(--th-accent)] mr-2 flex items-center gap-1 w-max">
                    <MSIcon icon="person" className="text-[10px]" />{t.speaker}
                  </span>
                  <span className="text-white/90">{t.text}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Chat Panel */}
      {showChat && (
        <div className="flex flex-col rounded-2xl border border-[var(--th-border)] bg-[var(--th-surface)] overflow-hidden" style={{ height: 360 }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--th-border)] bg-[var(--th-surface-low)]">
            <div className="flex items-center gap-2">
              <MSIcon icon="chat" className="text-base text-[var(--th-accent)]" />
              <span className="text-sm font-bold text-[var(--th-text)]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Room Chat</span>
            </div>
            <button onClick={() => setShowChat(false)} className="text-[var(--th-muted)] hover:text-red-400 transition-colors"><MSIcon icon="close" className="text-base" /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 custom-scrollbar">
            {chatMessages.length === 0 ? (
              <p className="text-center text-[var(--th-muted)] text-xs mt-8">No messages yet. Say hello! 👋</p>
            ) : chatMessages.map((m, i) => (
              <div key={i} className={cn("flex gap-2", m.sender === myName ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[75%] px-3 py-2 rounded-2xl text-sm", m.sender === myName ? "bg-[var(--th-accent)] text-[var(--th-accent-text)] rounded-br-sm" : "bg-[var(--th-surface-top)] text-[var(--th-text)] rounded-bl-sm")}>
                  {m.sender !== myName && <p className="text-[10px] font-bold mb-0.5 opacity-70">{m.sender}</p>}
                  <p>{m.text}</p>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="flex gap-2 px-4 py-3 border-t border-[var(--th-border)] bg-[var(--th-surface-low)]">
            <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChatMessage()} placeholder="Type a message..." className="flex-1 rounded-xl px-4 py-2 text-sm bg-[var(--th-surface-top)] border border-[var(--th-border)] text-[var(--th-text)] placeholder:text-[var(--th-muted)] focus:outline-none focus:border-[var(--th-accent)]/40" />
            <button onClick={sendChatMessage} disabled={!chatInput.trim()} className="w-10 h-10 rounded-xl bg-[var(--th-accent)] text-[var(--th-accent-text)] flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-40">
              <MSIcon icon="send" className="text-base" />
            </button>
          </div>
        </div>
      )}

      {/* Tab Share Modal */}
      {showTabShareModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md" onClick={() => setShowTabShareModal(false)}>
          <div className="w-full max-w-md rounded-2xl border border-[var(--th-border)] bg-[var(--th-surface)] shadow-2xl p-6 flex flex-col gap-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--th-accent)]/10 border border-[var(--th-accent)]/20 flex items-center justify-center">
                  <MSIcon icon="public" className="text-lg text-[var(--th-accent)]" />
                </div>
                <div>
                  <h2 className="text-[var(--th-text)] font-bold text-base" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Share a Tab / Link</h2>
                  <p className="text-[var(--th-muted)] text-xs">Saves the link to the Meetings workspace</p>
                </div>
              </div>
              <button onClick={() => setShowTabShareModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--th-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all">
                <MSIcon icon="close" className="text-base" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-[var(--th-muted)] mb-1.5 block" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Website URL *</label>
                <input autoFocus type="url" value={tabShareUrl} onChange={e => setTabShareUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitTabShare()} placeholder="https://example.com" className="w-full rounded-xl px-4 py-2.5 text-sm bg-[var(--th-surface-top)] border border-[var(--th-border)] text-[var(--th-text)] placeholder:text-[var(--th-muted)] focus:outline-none focus:border-[var(--th-accent)]/50" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-[var(--th-muted)] mb-1.5 block" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Label (optional)</label>
                <input value={tabShareName} onChange={e => setTabShareName(e.target.value)} placeholder="e.g. Design Brief, Dashboard..." className="w-full rounded-xl px-4 py-2.5 text-sm bg-[var(--th-surface-top)] border border-[var(--th-border)] text-[var(--th-text)] placeholder:text-[var(--th-muted)] focus:outline-none focus:border-[var(--th-accent)]/50" />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowTabShareModal(false)} className="flex-1 py-2.5 rounded-xl border border-[var(--th-border)] text-[var(--th-muted)] text-sm hover:border-[var(--th-accent)]/30 transition-colors">Cancel</button>
              <button onClick={submitTabShare} disabled={!tabShareUrl.trim() || isUploading} className="flex-1 py-2.5 rounded-xl bg-[var(--th-accent)] text-[var(--th-accent-text)] font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2">
                {isUploading ? <><MSIcon icon="progress_activity" className="text-base animate-spin" /> Saving...</> : <><MSIcon icon="public" className="text-base" /> Share Tab</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Root Page ─────────────────────────────────────────────────────────────────

export default function BubbleMeet() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Manrope:wght@300;400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap');
        .material-symbols-outlined { font-family: 'Material Symbols Outlined'; font-weight: normal; font-style: normal; display: inline-block; line-height: 1; text-transform: none; letter-spacing: normal; word-wrap: normal; white-space: nowrap; direction: ltr; -webkit-font-smoothing: antialiased; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(158,172,195,0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(158,172,195,0.4); }
        [class*="zego"] { font-family: 'Manrope', sans-serif !important; }
      `}</style>
      <div className="bg-[var(--th-bg)] text-[var(--th-text)] overflow-hidden h-screen flex" style={{ fontFamily: "'Manrope', sans-serif" }}>
        <Sidebar />
        <main className="ml-[85px] flex-1 flex flex-col h-full relative p-6 gap-4 overflow-hidden">
          <div className="absolute -top-[20%] -right-[10%] w-[500px] h-[500px] bg-[#ffe792]/5 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute -bottom-[20%] -left-[10%] w-[500px] h-[500px] bg-[#a2c2fd]/5 blur-[120px] rounded-full pointer-events-none" />
          <div className="relative flex-1 flex flex-col min-h-0">
            <Routes>
              <Route index element={<MeetLobby />} />
              <Route path="room/:roomId" element={<MeetRoom />} />
            </Routes>
          </div>
        </main>
      </div>
    </>
  );
}
