import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const BASE_URL = (import.meta.env.VITE_API_URL?.replace(/ i$/, '')?.trim());

// ─── Types ────────────────────────────────────────────────────────────────────

interface TranscriptEntry {
  speaker: string;
  text: string;
  timestamp?: number;
}

interface ActionItem {
  text?: string;
  task?: string;           // legacy field name
  assignedToName?: string;
  assignedTo?: string;
  status: string;
}

interface SharedFile {
  _id: string;
  fileId?: string;
  name: string;
  fileType: string;
  fileSize?: number;
  fileUrl?: string;
  linkUrl?: string;
  uploadedBy?: { full_name?: string; username?: string; avatar?: string };
  uploadedByName?: string;
  sharedAt: string;
  source: 'file_upload' | 'tab_share' | 'screen_share';
}

interface ScreenShareSession {
  _id: string;
  sharedByName?: string;
  shareType: 'screen' | 'window' | 'tab';
  label?: string;
  startedAt: string;
  endedAt?: string;
  duration?: number;
}

interface TranscriptLog {
  roomId: string;
  title: string;
  startedAt: string;
  endedAt?: string;
  duration?: number;
  host: { full_name?: string; username?: string; avatar?: string };
  attendees: { full_name?: string; username?: string; avatar?: string }[];
  transcript: TranscriptEntry[];
  summary: string | null;
  actionItems: ActionItem[];
  filesShared: SharedFile[];
  screenShares: ScreenShareSession[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function MSIcon({
  icon, filled = false, className = "", style,
}: {
  icon: string; filled?: boolean; className?: string; style?: React.CSSProperties;
}) {
  return (
    <span
      className={cn("material-symbols-outlined select-none", className)}
      style={{
        fontVariationSettings: filled
          ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
          : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
        ...style,
      }}
    >
      {icon}
    </span>
  );
}

function fmtBytes(b?: number): string {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

function fmtDuration(secs?: number): string {
  if (!secs) return "";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

function sourceIcon(source: SharedFile['source']): string {
  if (source === 'tab_share') return 'open_in_new';
  if (source === 'screen_share') return 'screen_share';
  return 'attach_file';
}

function fileTypeIcon(fileType: string): string {
  if (fileType === 'image') return 'image';
  if (fileType === 'video') return 'movie';
  if (fileType === 'pdf') return 'picture_as_pdf';
  if (fileType === 'link') return 'link';
  if (fileType === 'audio') return 'audio_file';
  return 'description';
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TranscriptDrawer({
  roomId, label, onClose,
}: {
  roomId: string; label: string; onClose: () => void;
}) {
  const [log, setLog] = useState<TranscriptLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"transcript" | "tasks" | "files" | "screens">("transcript");

  useEffect(() => {
    const fetchTranscript = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("access_token");

        // First try the rich /meetings endpoint (returns full model with filesShared,
        // screenShares, etc.), then fall back to the legacy /meet/logs transcript.
        let data: any = null;

        // Attempt 1: search meetings by roomId
        const meetRes = await fetch(
          `${BASE_URL}/meetings?page=1&limit=100`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (meetRes.ok) {
          const meetData = await meetRes.json();
          const match = (meetData.meetings || []).find(
            (m: any) => m.roomId === roomId
          );
          if (match) {
            // Normalize into TranscriptLog shape
            data = {
              roomId: match.roomId,
              title: match.title,
              startedAt: match.startedAt,
              endedAt: match.endedAt,
              duration: match.duration,
              host: match.host || {},
              attendees: match.attendees || [],
              transcript: (match.transcriptChunks || []).map((c: any) => ({
                speaker: c.speaker || 'Unknown',
                text: c.text,
                timestamp: c.timestamp,
              })),
              summary: match.summary,
              actionItems: (match.actionItems || []).map((a: any) => ({
                text: a.text,
                assignedToName: a.assignedToName,
                assignedTo: typeof a.assignedTo === 'object' ? a.assignedTo?.username : a.assignedTo,
                status: a.status,
              })),
              filesShared: match.filesShared || [],
              screenShares: match.screenShares || [],
            };
          }
        }

        // Attempt 2: fall back to legacy endpoint
        if (!data) {
          const legacyRes = await fetch(
            `${BASE_URL}/meet/logs/${encodeURIComponent(roomId)}/transcript`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (!legacyRes.ok) throw new Error("Transcript not available");
          const legacyData = await legacyRes.json();
          data = {
            ...legacyData.transcript,
            filesShared: legacyData.transcript?.filesShared || [],
            screenShares: [],
          };
        }

        setLog(data);
      } catch (e: any) {
        setError(e.message || "Failed to load transcript");
      } finally {
        setLoading(false);
      }
    };
    fetchTranscript();
  }, [roomId]);

  const handleDownload = () => {
    if (!log) return;
    const lines = [
      `Meeting: ${log.title}`,
      `Date: ${new Date(log.startedAt).toLocaleString()}`,
      `Duration: ${fmtDuration(log.duration)}`,
      `Host: ${log.host?.full_name || log.host?.username || 'Unknown'}`,
      `Attendees: ${log.attendees?.map(a => a.full_name || a.username).join(", ")}`,
      "",
      "=== SUMMARY ===",
      log.summary || "No summary available.",
      "",
      "=== TRANSCRIPT ===",
      ...log.transcript.map(t => `[${t.speaker}]: ${t.text}`),
      "",
      "=== ACTION ITEMS ===",
      ...log.actionItems.map(a => `- ${a.text || a.task}${a.assignedToName ? ` (→ ${a.assignedToName})` : ""}`),
      "",
      "=== FILES SHARED ===",
      ...log.filesShared.map(f =>
        f.linkUrl
          ? `- [Link] ${f.name}: ${f.linkUrl}`
          : `- ${f.name} (${f.fileType}, ${fmtBytes(f.fileSize)}) by ${f.uploadedBy?.full_name || f.uploadedByName || "Unknown"}`
      ),
      "",
      "=== SCREEN SHARES ===",
      ...log.screenShares.map(s =>
        `- ${s.shareType} by ${s.sharedByName || "Unknown"}: "${s.label || "Unnamed"}" — ${fmtDuration(s.duration)}`
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Transcript-${log.title || roomId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs = log
    ? [
      { id: "transcript" as const, label: "Transcript", icon: "subtitles", count: log.transcript.length },
      { id: "tasks" as const, label: "Tasks", icon: "task_alt", count: log.actionItems.length },
      {
        id: "files" as const,
        label: "Files & Links",
        icon: "folder_open",
        count: log.filesShared.length,
      },
      {
        id: "screens" as const,
        label: "Screen Shares",
        icon: "screen_share",
        count: log.screenShares.length,
      },
    ]
    : [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <div
        className="bg-[var(--th-surface)] border-l border-[var(--th-border)] w-full max-w-lg h-full shadow-2xl flex flex-col"
        style={{ fontFamily: "'Manrope', sans-serif" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--th-border)]" style={{ background: "var(--th-surface-low)" }}>
          <div>
            <h2 className="text-[var(--th-text)] font-bold text-lg flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <MSIcon icon="subtitles" className="text-[var(--th-accent)]" />
              Call Transcript
            </h2>
            <p className="text-xs text-[var(--th-muted)] mt-1 truncate max-w-xs">{label}</p>
          </div>
          <div className="flex items-center gap-2">
            {log && (
              <button onClick={handleDownload} className="w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--th-surface-top)] border border-[var(--th-border)] text-[var(--th-muted)] hover:text-[var(--th-accent)] hover:border-[var(--th-accent)]/30 transition-all" title="Download transcript">
                <MSIcon icon="download" style={{ fontSize: 18 }} />
              </button>
            )}
            <button onClick={onClose} className="text-[var(--th-muted)] hover:text-[var(--th-accent)] transition-colors p-1">
              <MSIcon icon="close" />
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "var(--th-accent)", borderTopColor: "transparent" }} />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <MSIcon icon="error_outline" style={{ color: "var(--th-muted)", fontSize: 48, opacity: 0.4 }} />
            <p className="text-sm text-[var(--th-muted)]">{error}</p>
            <p className="text-xs text-[var(--th-muted)] opacity-60">Transcripts are only available for meetings that used the live captions feature.</p>
          </div>
        )}

        {/* Content */}
        {!loading && log && (
          <>
            {/* Meeting meta */}
            <div className="px-6 py-4 border-b border-[var(--th-border)] bg-[var(--th-surface-low)]">
              <div className="flex items-center gap-4 text-xs text-[var(--th-muted)]">
                <span className="flex items-center gap-1"><MSIcon icon="schedule" style={{ fontSize: 14 }} />{new Date(log.startedAt).toLocaleString()}</span>
                {log.duration && <span className="flex items-center gap-1"><MSIcon icon="timer" style={{ fontSize: 14 }} />{fmtDuration(log.duration)}</span>}
                <span className="flex items-center gap-1"><MSIcon icon="group" style={{ fontSize: 14 }} />{1 + (log.attendees?.length || 0)} participants</span>
              </div>
              {log.summary && (
                <div className="mt-3 p-3 rounded-xl text-xs text-[var(--th-text)] leading-relaxed" style={{ background: "color-mix(in srgb, var(--th-accent) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--th-accent) 20%, transparent)" }}>
                  <span className="font-bold text-[var(--th-accent)] block mb-1 text-[10px] uppercase tracking-widest">AI Summary</span>
                  {log.summary}
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[var(--th-border)]" style={{ background: "var(--th-surface-low)" }}>
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 text-[10px] font-bold transition-all uppercase tracking-wide"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    color: activeTab === tab.id ? "var(--th-accent)" : "var(--th-muted)",
                    borderBottom: activeTab === tab.id ? "2px solid var(--th-accent)" : "2px solid transparent",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <MSIcon icon={tab.icon} style={{ fontSize: 14 }} />
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: activeTab === tab.id ? "color-mix(in srgb, var(--th-accent) 20%, transparent)" : "var(--th-surface-top)", color: activeTab === tab.id ? "var(--th-accent)" : "var(--th-muted)" }}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: "thin" }}>

              {/* ── Transcript tab ── */}
              {activeTab === "transcript" && (
                <div className="space-y-4">
                  {log.transcript.length === 0 ? (
                    <p className="text-sm text-[var(--th-muted)] text-center py-8">No transcript recorded for this call.</p>
                  ) : (
                    log.transcript.map((entry, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold" style={{ background: "color-mix(in srgb, var(--th-accent) 15%, transparent)", color: "var(--th-accent)" }}>
                          {(entry.speaker || "?")[0].toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-xs font-bold" style={{ color: "var(--th-accent)", fontFamily: "'Space Grotesk', sans-serif" }}>{entry.speaker || "Unknown"}</span>
                            {entry.timestamp && (
                              <span className="text-[10px]" style={{ color: "var(--th-muted)" }}>
                                {new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            )}
                          </div>
                          <p className="text-sm leading-relaxed" style={{ color: "var(--th-text)" }}>{entry.text}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ── Tasks tab ── */}
              {activeTab === "tasks" && (
                <div className="space-y-3">
                  {log.actionItems.length === 0 ? (
                    <p className="text-sm text-[var(--th-muted)] text-center py-8">No tasks were extracted from this meeting.</p>
                  ) : (
                    log.actionItems.map((item, i) => (
                      <div key={i} className="p-4 rounded-xl border" style={{ background: "var(--th-surface-low)", borderColor: "var(--th-border)" }}>
                        <div className="flex gap-3 items-start">
                          <MSIcon icon={item.status === "done" ? "check_circle" : "radio_button_unchecked"} filled={item.status === "done"} style={{ color: item.status === "done" ? "#4ade80" : "var(--th-muted)", fontSize: 18, marginTop: 2 }} />
                          <div className="flex-1">
                            <p className="text-sm font-medium" style={{ color: "var(--th-text)" }}>{item.text || item.task}</p>
                            {(item.assignedToName || item.assignedTo) && (
                              <p className="text-xs mt-1 flex items-center gap-1" style={{ color: "var(--th-accent)" }}>
                                <MSIcon icon="person" style={{ fontSize: 12 }} />
                                Assigned to {item.assignedToName || item.assignedTo}
                              </p>
                            )}
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase" style={{ background: item.status === "done" ? "rgba(74,222,128,0.1)" : "color-mix(in srgb, var(--th-accent) 10%, transparent)", color: item.status === "done" ? "#4ade80" : "var(--th-accent)" }}>
                            {item.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ── Files & Links tab ── */}
              {activeTab === "files" && (
                <div className="space-y-3">
                  {log.filesShared.length === 0 ? (
                    <p className="text-sm text-[var(--th-muted)] text-center py-8">No files or links were shared during this meeting.</p>
                  ) : (
                    log.filesShared.map(file => (
                      <div key={file._id} className="p-4 rounded-xl border" style={{ background: "var(--th-surface-low)", borderColor: "var(--th-border)" }}>
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "color-mix(in srgb, var(--th-accent) 10%, transparent)" }}>
                            <MSIcon icon={fileTypeIcon(file.fileType)} style={{ color: "var(--th-accent)", fontSize: 20 }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate" style={{ color: "var(--th-text)" }}>{file.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {/* Source badge */}
                              <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1" style={{ background: "color-mix(in srgb, var(--th-secondary) 10%, transparent)", color: "var(--th-secondary)" }}>
                                <MSIcon icon={sourceIcon(file.source)} style={{ fontSize: 10 }} />
                                {file.source === 'tab_share' ? 'Link' : file.source === 'screen_share' ? 'Screen' : 'File'}
                              </span>
                              <p className="text-xs" style={{ color: "var(--th-muted)" }}>
                                {fmtBytes(file.fileSize)}
                                {file.uploadedBy?.full_name || file.uploadedBy?.username || file.uploadedByName
                                  ? ` · by ${file.uploadedBy?.full_name || file.uploadedBy?.username || file.uploadedByName}`
                                  : ""}
                              </p>
                            </div>
                            {/* Link URL preview */}
                            {file.linkUrl && (
                              <p className="text-[10px] mt-1 font-mono truncate" style={{ color: "var(--th-accent)" }}>{file.linkUrl}</p>
                            )}
                          </div>
                          <div className="flex gap-2 shrink-0">
                            {file.linkUrl ? (
                              <a href={file.linkUrl} target="_blank" rel="noreferrer" className="w-8 h-8 flex items-center justify-center rounded-lg border transition-all hover:border-[var(--th-accent)]/40 hover:text-[var(--th-accent)]" style={{ borderColor: "var(--th-border)", color: "var(--th-muted)" }} title="Open link">
                                <MSIcon icon="open_in_new" style={{ fontSize: 16 }} />
                              </a>
                            ) : (
                              <>
                                {file.fileUrl && (
                                  <a href={`${BASE_URL}/workspace/file/${file.fileId}/proxy`} target="_blank" rel="noreferrer" className="w-8 h-8 flex items-center justify-center rounded-lg border transition-all hover:border-[var(--th-accent)]/40 hover:text-[var(--th-accent)]" style={{ borderColor: "var(--th-border)", color: "var(--th-muted)" }} title="Preview">
                                    <MSIcon icon="visibility" style={{ fontSize: 16 }} />
                                  </a>
                                )}
                                {file.fileId && (
                                  <a href={`${BASE_URL}/workspace/file/${file.fileId}/proxy?download=true`} target="_blank" rel="noreferrer" className="w-8 h-8 flex items-center justify-center rounded-lg border transition-all hover:border-[var(--th-accent)]/40 hover:text-[var(--th-accent)]" style={{ borderColor: "var(--th-border)", color: "var(--th-muted)" }} title="Download">
                                    <MSIcon icon="download" style={{ fontSize: 16 }} />
                                  </a>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        <p className="text-[10px] mt-2 opacity-50" style={{ color: "var(--th-muted)" }}>Shared {new Date(file.sharedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ── Screen Shares tab ── */}
              {activeTab === "screens" && (
                <div className="space-y-3">
                  {log.screenShares.length === 0 ? (
                    <p className="text-sm text-[var(--th-muted)] text-center py-8">No screen sharing sessions were recorded for this meeting.</p>
                  ) : (
                    log.screenShares.map(session => (
                      <div key={session._id} className="p-4 rounded-xl border flex items-start gap-3" style={{ background: "var(--th-surface-low)", borderColor: "var(--th-border)" }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "color-mix(in srgb, var(--th-secondary) 10%, transparent)" }}>
                          <MSIcon icon={session.shareType === 'tab' ? 'open_in_new' : session.shareType === 'window' ? 'open_in_full' : 'screen_share'} style={{ color: "var(--th-secondary)", fontSize: 20 }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-bold text-sm" style={{ color: "var(--th-text)" }}>{session.label || `${session.shareType} share`}</p>
                            <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full font-bold" style={{ background: "color-mix(in srgb, var(--th-secondary) 10%, transparent)", color: "var(--th-secondary)" }}>
                              {session.shareType}
                            </span>
                          </div>
                          <p className="text-xs" style={{ color: "var(--th-muted)" }}>
                            By {session.sharedByName || "Unknown"} · Started {new Date(session.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            {session.duration ? ` · ${fmtDuration(session.duration)}` : session.endedAt ? "" : " · Ongoing"}
                          </p>
                        </div>
                        {session.duration && (
                          <span className="text-xs px-2 py-1 rounded-lg font-bold shrink-0" style={{ background: "color-mix(in srgb, var(--th-accent) 10%, transparent)", color: "var(--th-accent)" }}>
                            {fmtDuration(session.duration)}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}