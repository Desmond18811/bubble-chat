import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams, Routes, Route } from "react-router-dom";
import { cn } from "@/lib/utils";
import Sidebar from "@/components/Sidebar";
import { fetchCallLogs, saveCallLog, clearCallLogs } from "@/api";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";

// ─── Env ──────────────────────────────────────────────────────────────────────

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

// ─── Schedule Modal ───────────────────────────────────────────────────────────

function ScheduleModal({
  onClose,
  onSchedule,
}: {
  onClose: () => void;
  onSchedule: (s: ScheduledCall) => void;
}) {
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
      roomId,
      type,
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
      <div className="bg-[#071a2f] border border-[#1a3650] rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[#d8e6ff] font-bold text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Schedule a Call
          </h2>
          <button onClick={onClose} className="text-[#9eacc3] hover:text-[#ffe792] transition-colors">
            <MSIcon icon="close" />
          </button>
        </div>

        {!generated ? (
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-[#9eacc3] mb-1 block">Title (optional)</label>
              <input
                className="w-full bg-[#031427] border border-[#1a3650] rounded-xl px-4 py-2.5 text-[#d8e6ff] text-sm outline-none focus:border-[#ffe792]/50 placeholder:text-[#3b495c]"
                placeholder="Team sync, Project review…"
                value={label}
                onChange={e => setLabel(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-[#9eacc3] mb-1 block">Date & Time</label>
              <input
                type="datetime-local"
                className="w-full bg-[#031427] border border-[#1a3650] rounded-xl px-4 py-2.5 text-[#d8e6ff] text-sm outline-none focus:border-[#ffe792]/50 [color-scheme:dark]"
                value={dateTime}
                onChange={e => setDateTime(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-[#9eacc3] mb-2 block">Call Type</label>
              <div className="flex gap-3">
                {(["voice", "video"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-all",
                      type === t
                        ? "bg-[#ffe792]/10 border-[#ffe792]/50 text-[#ffe792]"
                        : "bg-[#031427] border-[#1a3650] text-[#9eacc3] hover:border-[#ffe792]/20"
                    )}
                  >
                    <MSIcon icon={t === "voice" ? "mic" : "videocam"} filled={type === t} className="text-lg" />
                    {t === "voice" ? "Voice" : "Video"}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleGenerate}
              disabled={!dateTime}
              className="mt-2 w-full py-3 rounded-xl bg-gradient-to-r from-[#ffe792] to-[#ffc837] text-[#010f20] font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Generate Link
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 bg-[#031427] rounded-xl p-4 border border-[#1a3650]">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                generated.type === "video" ? "bg-[#a2c2fd]/10" : "bg-[#ffe792]/10"
              )}>
                <MSIcon icon={generated.type === "video" ? "videocam" : "mic"} filled className={cn(
                  "text-xl", generated.type === "video" ? "text-[#a2c2fd]" : "text-[#ffe792]"
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[#d8e6ff] font-semibold text-sm truncate">{generated.label}</p>
                <p className="text-[#9eacc3] text-xs mt-0.5">
                  {new Date(generated.scheduledAt).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="bg-[#031427] rounded-xl p-3 border border-[#1a3650]">
              <p className="text-[#9eacc3] text-xs mb-1">Private invite link</p>
              <p className="text-[#a2c2fd] text-xs font-mono break-all line-clamp-2">{generated.link}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#ffe792]/10 border border-[#ffe792]/30 text-[#ffe792] text-sm font-medium hover:bg-[#ffe792]/20 transition-all"
              >
                <MSIcon icon={copied ? "check" : "content_copy"} className="text-lg" />
                {copied ? "Copied!" : "Copy Link"}
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-[#031427] border border-[#1a3650] text-[#9eacc3] text-sm font-medium hover:text-[#d8e6ff] transition-colors"
              >
                Done
              </button>
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
    // accept full URL or raw room ID
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
      <div className="bg-[#071a2f] border border-[#1a3650] rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[#d8e6ff] font-bold text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Join a Call
          </h2>
          <button onClick={onClose} className="text-[#9eacc3] hover:text-[#ffe792] transition-colors">
            <MSIcon icon="close" />
          </button>
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-[#9eacc3] mb-1 block">Room ID or Invite Link</label>
            <input
              className="w-full bg-[#031427] border border-[#1a3650] rounded-xl px-4 py-2.5 text-[#d8e6ff] text-sm outline-none focus:border-[#ffe792]/50 placeholder:text-[#3b495c]"
              placeholder="Paste invite link or enter room ID…"
              value={input}
              onChange={e => setInput(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-[#9eacc3] mb-2 block">Call Type</label>
            <div className="flex gap-3">
              {(["voice", "video"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-all",
                    type === t
                      ? "bg-[#ffe792]/10 border-[#ffe792]/50 text-[#ffe792]"
                      : "bg-[#031427] border-[#1a3650] text-[#9eacc3] hover:border-[#ffe792]/20"
                  )}
                >
                  <MSIcon icon={t === "voice" ? "mic" : "videocam"} filled={type === t} className="text-lg" />
                  {t === "voice" ? "Voice" : "Video"}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleJoin}
            disabled={!input.trim()}
            className="mt-2 w-full py-3 rounded-xl bg-gradient-to-r from-[#a2c2fd] to-[#6b9ef5] text-[#010f20] font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Join Now
          </button>
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

  const [loading, setLoading] = useState(false);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await fetchCallLogs();
      // Map backend log keys to frontend RecentCall interface if needed
      const logs = (data.logs || []).map((l: any) => ({
        id: l._id,
        roomId: l.roomId,
        type: l.type,
        label: l.label,
        ts: new Date(l.timestamp).getTime(),
        duration: l.duration,
        missed: l.missed,
      }));
      setRecentCalls(logs);
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
    if (!window.confirm("Are you sure you want to clear all call logs?")) return;
    try {
      await clearCallLogs();
      setRecentCalls([]);
    } catch (err) {
      console.error("Failed to clear logs:", err);
    }
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
    <div className="flex-1 overflow-y-auto custom-scrollbar pb-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-[#ffe792]/10 flex items-center justify-center">
            <MSIcon icon="video_chat" filled className="text-[#ffe792] text-xl" />
          </div>
          <h1 className="text-2xl font-bold text-[#d8e6ff]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Meet
          </h1>
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-[#ffe792]/10 text-[#ffe792] border border-[#ffe792]/20">
            Private &amp; Encrypted
          </span>
        </div>
        <p className="text-[#9eacc3] text-sm ml-12">Start a secure voice or video call with anyone.</p>
      </div>

      {/* Primary call cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {/* Voice Call card */}
        <div className="relative overflow-hidden rounded-2xl border border-[#ffe792]/15 bg-gradient-to-br from-[#071a2f] to-[#031427] p-6 group cursor-pointer"
          onClick={() => startCall("voice")}
        >
          <div className="absolute inset-0 bg-[#ffe792]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-[#ffe792]/5 blur-xl" />

          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-[#ffe792]/10 border border-[#ffe792]/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <MSIcon icon="mic" filled className="text-[#ffe792] text-2xl" />
            </div>
            <h3 className="text-[#d8e6ff] font-bold text-lg mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Voice Call
            </h3>
            <p className="text-[#9eacc3] text-sm mb-4">Crystal-clear audio, no video required</p>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs text-[#ffe792] bg-[#ffe792]/10 px-3 py-1 rounded-full border border-[#ffe792]/20">
                <MSIcon icon="lock" className="text-sm" />
                E2E Encrypted
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-[#9eacc3] bg-[#031427] px-3 py-1 rounded-full border border-[#1a3650]">
                <MSIcon icon="group" className="text-sm" />
                Up to 1000
              </span>
            </div>
          </div>

          <div className="absolute top-5 right-5 w-9 h-9 rounded-xl bg-[#ffe792] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
            <MSIcon icon="arrow_forward" className="text-[#010f20] text-lg" />
          </div>
        </div>

        {/* Video Call card */}
        <div className="relative overflow-hidden rounded-2xl border border-[#a2c2fd]/15 bg-gradient-to-br from-[#071a2f] to-[#031427] p-6 group cursor-pointer"
          onClick={() => startCall("video")}
        >
          <div className="absolute inset-0 bg-[#a2c2fd]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-[#a2c2fd]/5 blur-xl" />

          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-[#a2c2fd]/10 border border-[#a2c2fd]/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <MSIcon icon="videocam" filled className="text-[#a2c2fd] text-2xl" />
            </div>
            <h3 className="text-[#d8e6ff] font-bold text-lg mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Video Call
            </h3>
            <p className="text-[#9eacc3] text-sm mb-4">Face-to-face with HD video, reactions &amp; screen share</p>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs text-[#a2c2fd] bg-[#a2c2fd]/10 px-3 py-1 rounded-full border border-[#a2c2fd]/20">
                <MSIcon icon="lock" className="text-sm" />
                E2E Encrypted
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-[#9eacc3] bg-[#031427] px-3 py-1 rounded-full border border-[#1a3650]">
                <MSIcon icon="hd" className="text-sm" />
                HD Video
              </span>
            </div>
          </div>

          <div className="absolute top-5 right-5 w-9 h-9 rounded-xl bg-[#a2c2fd] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
            <MSIcon icon="arrow_forward" className="text-[#010f20] text-lg" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        <button
          onClick={() => setShowSchedule(true)}
          className="flex flex-col items-start gap-2 p-4 rounded-xl bg-[#071a2f] border border-[#1a3650] hover:border-[#ffe792]/30 hover:bg-[#0c2037] transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-[#ffe792]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <MSIcon icon="calendar_add_on" className="text-[#ffe792] text-lg" />
          </div>
          <div>
            <p className="text-[#d8e6ff] text-sm font-semibold">Schedule</p>
            <p className="text-[#9eacc3] text-xs">Plan ahead</p>
          </div>
        </button>

        <button
          onClick={() => setShowJoin(true)}
          className="flex flex-col items-start gap-2 p-4 rounded-xl bg-[#071a2f] border border-[#1a3650] hover:border-[#a2c2fd]/30 hover:bg-[#0c2037] transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-[#a2c2fd]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <MSIcon icon="login" className="text-[#a2c2fd] text-lg" />
          </div>
          <div>
            <p className="text-[#d8e6ff] text-sm font-semibold">Join a call</p>
            <p className="text-[#9eacc3] text-xs">Via link or ID</p>
          </div>
        </button>

        <button
          onClick={() => startCall("video")}
          className="flex flex-col items-start gap-2 p-4 rounded-xl bg-[#071a2f] border border-[#1a3650] hover:border-[#9b8bff]/30 hover:bg-[#0c2037] transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-[#9b8bff]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <MSIcon icon="group_add" className="text-[#9b8bff] text-lg" />
          </div>
          <div>
            <p className="text-[#d8e6ff] text-sm font-semibold">Group call</p>
            <p className="text-[#9eacc3] text-xs">Share link to invite</p>
          </div>
        </button>
      </div>

      {/* Scheduled Calls */}
      {upcomingScheduled.length > 0 && (
        <div className="mb-8">
          <h2 className="text-[#9eacc3] text-xs font-semibold uppercase tracking-wider mb-3">
            Upcoming Scheduled
          </h2>
          <div className="flex flex-col gap-2">
            {upcomingScheduled.map(s => (
              <div key={s.id} className="flex items-center gap-3 bg-[#071a2f] border border-[#1a3650] rounded-xl px-4 py-3">
                <div className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                  s.type === "video" ? "bg-[#a2c2fd]/10" : "bg-[#ffe792]/10"
                )}>
                  <MSIcon icon={s.type === "video" ? "videocam" : "mic"} filled className={cn(
                    "text-lg", s.type === "video" ? "text-[#a2c2fd]" : "text-[#ffe792]"
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[#d8e6ff] font-medium text-sm truncate">{s.label}</p>
                  <p className="text-[#9eacc3] text-xs">{new Date(s.scheduledAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => copyLink(s.link, s.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#ffe792]/10 text-[#9eacc3] hover:text-[#ffe792] transition-colors"
                    title="Copy invite link"
                  >
                    <MSIcon icon={copiedId === s.id ? "check" : "content_copy"} className="text-base" />
                  </button>
                  <button
                    onClick={() => joinRoom(s.roomId, s.type)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#a2c2fd]/10 text-[#9eacc3] hover:text-[#a2c2fd] transition-colors"
                    title="Join now"
                  >
                    <MSIcon icon="call" filled className="text-base" />
                  </button>
                  <button
                    onClick={() => deleteScheduled(s.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/10 text-[#9eacc3] hover:text-red-400 transition-colors"
                    title="Delete"
                  >
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
            <h2 className="text-[#9eacc3] text-xs font-semibold uppercase tracking-wider">
              Recent Calls
            </h2>
            <button
              onClick={handleClearLogs}
              className="text-[#9eacc3] hover:text-red-400 text-[10px] font-bold uppercase transition-colors"
            >
              Clear All
            </button>
          </div>
          <div className="flex flex-col gap-1">
            {recentCalls.map(c => (
              <div
                key={c.id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#071a2f] transition-colors group cursor-pointer"
                onClick={() => joinRoom(c.roomId, c.type)}
              >
                <div className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                  c.missed ? "bg-red-500/10" : c.type === "video" ? "bg-[#a2c2fd]/10" : "bg-[#ffe792]/10"
                )}>
                  <MSIcon icon={c.type === "video" ? "videocam" : "mic"} filled className={cn(
                    "text-lg",
                    c.missed ? "text-red-400" : c.type === "video" ? "text-[#a2c2fd]" : "text-[#ffe792]"
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[#d8e6ff] text-sm font-medium truncate">{c.label}</p>
                  <p className="text-[#9eacc3] text-xs">{new Date(c.ts).toLocaleString()}</p>
                </div>
                <MSIcon icon="call" className="text-[#9eacc3] opacity-0 group-hover:opacity-100 transition-opacity text-lg" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {showSchedule && (
        <ScheduleModal
          onClose={() => setShowSchedule(false)}
          onSchedule={(s) => { handleSchedule(s); }}
        />
      )}
      {showJoin && (
        <JoinModal
          onClose={() => setShowJoin(false)}
          onJoin={(roomId, type) => { setShowJoin(false); joinRoom(roomId, type); }}
        />
      )}
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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = useCallback(async () => {
    if (zpRef.current) {
      try { zpRef.current.destroy(); } catch (_) { }
      zpRef.current = null;
    }
    // Save to recent calls
    try {
      await saveCallLog({
        roomId,
        type: callType,
        label: `${isVoice ? "Voice" : "Video"} Call`,
        duration: Math.floor((Date.now() - callStarted) / 1000),
      });
    } catch (_) { }
    navigate("/meet");
  }, [navigate, roomId, callType, isVoice, callStarted]);

  useEffect(() => {
    if (!containerRef.current || !roomId) return;

    if (!ZEGO_APP_ID || !ZEGO_SERVER_SECRET) {
      setInitError("Zego Cloud credentials are missing. Please configure VITE_ZEGO_APP_ID and VITE_ZEGO_SERVER_SECRET in your environment.");
      setIsInitializing(false);
      return;
    }

    const initZego = async () => {
      try {
        setIsInitializing(true);
        setInitError(null);

        const user = getCurrentUser();
        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
          ZEGO_APP_ID,
          ZEGO_SERVER_SECRET,
          roomId,
          user.id,
          user.name
        );

        const zp = ZegoUIKitPrebuilt.create(kitToken);
        zpRef.current = zp;

        zp.joinRoom({
          container: containerRef.current,
          scenario: {
            mode: isVoice
              ? ZegoUIKitPrebuilt.GroupCall
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
          showLayoutButton: !isVoice,
          showNonVideoUser: true,
          showTextChat: true,
          onLeaveRoom: handleLeave,
        });

        setIsInitializing(false);
      } catch (err: any) {
        console.error("Zego Initialization Error:", err);
        setInitError(err.message || "Failed to initialize the call room. Please try again.");
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
          <button
            onClick={handleLeave}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#071a2f] border border-[#1a3650] text-[#9eacc3] hover:text-[#ffe792] hover:border-[#ffe792]/30 transition-all"
          >
            <MSIcon icon="arrow_back" className="text-lg" />
          </button>
          <div className="flex items-center gap-2 bg-[#071a2f] border border-[#1a3650] rounded-xl px-4 py-2">
            <span className={cn(
              "w-2 h-2 rounded-full animate-pulse",
              isVoice ? "bg-[#ffe792]" : "bg-[#a2c2fd]"
            )} />
            <span className="text-[#d8e6ff] text-sm font-medium" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {isVoice ? "Voice Room" : "Video Room"}
            </span>
            <span className="text-[#3b495c] mx-1">·</span>
            <span className="text-[#9eacc3] text-xs font-mono truncate max-w-[120px]">
              {roomId.slice(0, 20)}…
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-[#ffe792] bg-[#ffe792]/10 px-3 py-1.5 rounded-xl border border-[#ffe792]/20">
            <MSIcon icon="lock" className="text-sm" />
            Private room
          </div>
        </div>

        <button
          onClick={handleCopyLink}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#071a2f] border border-[#1a3650] text-[#9eacc3] hover:text-[#ffe792] hover:border-[#ffe792]/30 transition-all text-sm"
        >
          <MSIcon icon={copied ? "check" : "link"} className="text-lg" />
          {copied ? "Copied!" : "Copy invite link"}
        </button>
      </div>

      {/* Zego container / State Overlay */}
      <div className="flex-1 relative rounded-2xl overflow-hidden bg-[#031427] border border-[#1a3650]">
        <div
          ref={containerRef}
          className={cn(
            "w-full h-full",
            (initError || isInitializing) ? "opacity-0" : "opacity-100"
          )}
        />

        {isInitializing && !initError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 border-4 border-[#ffe792]/20 border-t-[#ffe792] rounded-full animate-spin mb-4" />
            <p className="text-[#d8e6ff] font-medium">Initializing secure connection…</p>
            <p className="text-[#9eacc3] text-sm mt-1">Preparing your {isVoice ? "voice" : "video"} room</p>
          </div>
        )}

        {initError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-[#071a2f]/80 backdrop-blur-md">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
              <MSIcon icon="error_outline" className="text-red-400 text-3xl" />
            </div>
            <h3 className="text-xl font-bold text-[#d8e6ff] mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Unable to Join Room
            </h3>
            <p className="text-[#9eacc3] text-sm max-w-md mb-6 whitespace-pre-wrap">
              {initError}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold hover:bg-red-500/20 transition-all"
            >
              Retry Connection
            </button>
          </div>
        )}
      </div>
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
        .material-symbols-outlined {
          font-family: 'Material Symbols Outlined';
          font-weight: normal; font-style: normal;
          display: inline-block; line-height: 1;
          text-transform: none; letter-spacing: normal;
          word-wrap: normal; white-space: nowrap; direction: ltr;
          -webkit-font-smoothing: antialiased;
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(158,172,195,0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(158,172,195,0.4); }

        /* Override Zego default background */
        [class*="zego"] { font-family: 'Manrope', sans-serif !important; }
      `}</style>

      <div
        className="bg-[#010f20] text-[#d8e6ff] overflow-hidden h-screen flex"
        style={{ fontFamily: "'Manrope', sans-serif" }}
      >
        <Sidebar />

        <main className="ml-[85px] flex-1 flex flex-col h-full relative p-6 gap-4 overflow-hidden">
          {/* Ambient glows */}
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