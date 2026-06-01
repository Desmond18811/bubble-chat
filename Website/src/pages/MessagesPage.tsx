import { useState, useEffect, useRef, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import * as api from "@/api";

// New API functions for message requests
const BASE = (import.meta.env.VITE_API_URL?.replace(/ i$/, '')?.trim()) || 'http://localhost:3000/api/v1';
const token = () => localStorage.getItem('access_token') || '';

async function checkCanMessage(userId: string) {
  const res = await fetch(`${BASE}/message/can-message/${userId}`, { headers: { Authorization: `Bearer ${token()}` } });
  if (!res.ok) return { canMessage: true };
  return res.json();
}
async function sendRequest(userId: string) {
  const res = await fetch(`${BASE}/message/request/${userId}`, { method: 'POST', headers: { Authorization: `Bearer ${token()}` } });
  return res.json();
}
import {
  initiateSocket, getSocket, emitSendMessage, emitTypingStart, emitTypingStop,
  emitJoinRoom, emitLeaveRoom, emitRecordingStart, emitRecordingStop,
  onEvent, offEvent,
} from "@/lib/socket-client";
import { toast } from "sonner";
import ReactEmojiPicker, { Theme } from "emoji-picker-react";
import { encryptForRecipient, decryptFromSender } from "@/lib/crypto-utils";
import { useNavigate } from "react-router-dom";
import { getSecureMediaUrl, cn } from "@/lib/utils";
import { MobileHeader } from "@/components/MobileHeader";
import { Icon } from "@/components/Icon";

/* ─── Avatar ─────────────────────────────────────────────────────────────── */
const Avatar = ({ src, name, size = 40, online }: any) => {
  const safeSrc = getSecureMediaUrl(src) || src;
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      {safeSrc ? (
        <img src={safeSrc} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--primary)", opacity: 0.9 }} />
      ) : (
        <div style={{ width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg, var(--background), var(--card))", border: "2px solid var(--primary-foreground)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, fontWeight: 700, color: "var(--primary)", fontFamily: "'Space Grotesk', sans-serif" }}>
          {(name || "?")[0].toUpperCase()}
        </div>
      )}
      {online !== undefined && (
        <div style={{ position: "absolute", bottom: 1, right: 1, width: size * 0.27, height: size * 0.27, borderRadius: "50%", border: "2px solid var(--background)", background: online ? "#22c55e" : "var(--muted-foreground)" }} />
      )}
    </div>
  );
};

/* ─── Custom Audio Player ─────────────────────────────────────────────────── */
const CustomAudioPlayer = ({ src, duration, isMine }: { src: string; duration?: number; isMine?: boolean }) => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 1.0;
    const onTimeUpdate = () => setProgress((audio.currentTime / (audio.duration || duration || 1)) * 100);
    const onEnded = () => { setPlaying(false); setProgress(0); };
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    return () => { audio.removeEventListener("timeupdate", onTimeUpdate); audio.removeEventListener("ended", onEnded); };
  }, [duration]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false)); }
  };

  const fmt = (secs: number) => { if (!secs || isNaN(secs)) return "0:00"; const m = Math.floor(secs / 60); const s = Math.floor(secs % 60); return `${m}:${s < 10 ? "0" : ""}${s}`; };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, background: "transparent", padding: "4px 0", minWidth: 200, maxWidth: 300 }}>
      <audio ref={audioRef} src={src} preload="metadata" crossOrigin="anonymous" />
      <button onClick={toggle} style={{ width: 36, height: 36, borderRadius: "50%", background: isMine ? "var(--primary)" : "var(--secondary)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
        <Icon name={playing ? "pause" : "play_arrow"} size={20} style={{ color: isMine ? "var(--primary-foreground)" : "var(--foreground)" }} />
      </button>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ width: "100%", height: 24, display: "flex", alignItems: "center", gap: 3, cursor: "pointer" }} onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const p = (e.clientX - rect.left) / rect.width;
          if (audioRef.current) audioRef.current.currentTime = p * (audioRef.current.duration || duration || 1);
        }}>
          {Array.from({ length: 28 }).map((_, i) => {
            const isActive = (i / 28) * 100 <= progress;
            const h = Math.max(4, Math.abs(Math.sin(i * 0.65)) * 16 + 4);
            return <div key={i} style={{ flex: 1, height: h, background: isActive ? (isMine ? "var(--primary)" : "var(--primary)") : "var(--muted)", borderRadius: 2, transition: "background 0.1s" }} />;
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: isMine ? "rgba(238,238,238,0.7)" : "#9eacc3", fontVariantNumeric: "tabular-nums" }}>
          <span>{fmt(audioRef.current?.currentTime || 0)}</span>
          <span>{fmt(duration || audioRef.current?.duration || 0)}</span>
        </div>
      </div>
    </div>
  );
};

const ImageLightbox = ({ src, onClose }: { src: string; onClose: () => void }) => (
  <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", backdropFilter: "blur(12px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
    <button onClick={onClose} style={{ position: "absolute", top: 20, right: 20, background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer" }}><Icon name="close" size={24} /></button>
    <img src={src} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 12, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }} />
  </div>
);

/* ── Stickers ─────────────────────────────────────────────────────────────── */
const STICKER_PACKS = [
  { name: "Classic", stickers: ["https://cdn-icons-png.flaticon.com/512/3241/3241461.png", "https://cdn-icons-png.flaticon.com/512/3241/3241457.png", "https://cdn-icons-png.flaticon.com/512/3241/3241444.png", "https://cdn-icons-png.flaticon.com/512/3241/3241434.png"] },
  { name: "Astra", stickers: ["https://cdn-icons-png.flaticon.com/512/3665/3665910.png", "https://cdn-icons-png.flaticon.com/512/3665/3665913.png", "https://cdn-icons-png.flaticon.com/512/3665/3665917.png", "https://cdn-icons-png.flaticon.com/512/3665/3665920.png"] }
];

const StickerPicker = ({ onSelect, onClose }: { onSelect: (url: string) => void; onClose: () => void }) => (
  <div style={{ position: "absolute", bottom: "100%", right: 50, marginBottom: 16, zIndex: 999, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, width: 280, height: 320, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,0,0,0.1)" }}>
    <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)" }}>STICKERS</span>
      <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer" }}><Icon name="close" size={18} /></button>
    </div>
    <div style={{ flex: 1, overflowY: "auto", padding: 10, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
      {STICKER_PACKS.flatMap(p => p.stickers).map((url, idx) => (
        <img key={idx} src={url} onClick={() => { onSelect(url); onClose(); }} style={{ width: "100%", height: "auto", cursor: "pointer", transition: "transform 0.2s" }} onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"} />
      ))}
    </div>
  </div>
);

/* ─── EmojiPicker ─────────────────────────────────────────────────────────── */
const EmojiPicker = ({ onSelect, onClose, direction = "up" }: { onSelect: (e: string) => void; onClose: () => void; direction?: "up" | "down" }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(e.target as Node)) onClose(); };
    const id = setTimeout(() => document.addEventListener("pointerdown", handlePointerDown, true), 0);
    return () => { clearTimeout(id); document.removeEventListener("pointerdown", handlePointerDown, true); };
  }, [onClose]);
  const positionStyles: React.CSSProperties = direction === "up" ? { bottom: "100%", marginBottom: 16 } : { top: "100%", marginTop: 16 };
  return (
    <div ref={containerRef} style={{ position: "absolute", left: 0, zIndex: 999, boxShadow: "0 20px 60px rgba(0,0,0,0.1)", borderRadius: 16, overflow: "hidden", border: "1px solid var(--border)", ...positionStyles }}>
      <ReactEmojiPicker theme={Theme.LIGHT} searchDisabled skinTonesDisabled width={300} height={380} onEmojiClick={(emojiData) => { onSelect(emojiData.emoji); onClose(); }} />
    </div>
  );
};

/* ─── New Chat Modal ──────────────────────────────────────────────────────── */
const NewChatModal = ({ onClose, onStartChat, currentUserId, recentChats = [] }: { onClose: () => void; onStartChat: (conv: any) => void; currentUserId: string; recentChats?: any[] }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);

  const recentContacts = recentChats.map(c => {
    const other = c.users?.find((u: any) => (u.id || u._id) !== currentUserId);
    return other ? { ...other, chatId: c.id || c._id } : null;
  }).filter(Boolean);

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      try { const res = await api.searchUsers(query); setResults((res as any).data || res.users || []); }
      catch { toast.error("Search failed"); }
      finally { setLoading(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const startChat = async (user: any) => {
    setStarting(user.id || user._id);
    try { const res = await api.accessOrCreateChat(user.id || user._id); onStartChat(res.conversation); onClose(); }
    catch { toast.error("Could not open chat"); }
    finally { setStarting(null); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 16px" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 24, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 40px 100px rgba(0,0,0,0.1)", maxHeight: "85vh" }} className="glass">
        <div style={{ padding: "20px 24px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: "var(--primary)", margin: 0 }}>New Transmission</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 4 }}><Icon name="close" size={20} /></button>
        </div>
        <div style={{ padding: "0 20px 14px", flexShrink: 0 }}>
          <div style={{ position: "relative" }}>
            <Icon name="search" size={18} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
            <input autoFocus placeholder="Search explorers..." value={query} onChange={(e) => setQuery(e.target.value)}
              style={{ width: "100%", background: "var(--accent)", border: "1px solid var(--border)", borderRadius: 14, padding: "11px 14px 11px 40px", fontSize: 14, color: "var(--foreground)", outline: "none", boxSizing: "border-box", fontFamily: "'Manrope', sans-serif" }} />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 20px" }} className="scrollbar-thin">
          {!query && recentContacts.length > 0 && (
            <div style={{ padding: "0 8px 8px" }}>
              <div style={{ fontSize: 10, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8, fontWeight: 700, paddingLeft: 4 }}>Recent</div>
              {recentContacts.slice(0, 5).map((u: any) => (
                <div key={u.id || u._id} onClick={() => startChat(u)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 8px", borderRadius: 12, cursor: "pointer" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <Avatar src={u.avatar} name={u.full_name} size={36} online={u.isOnline} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: "var(--foreground)", fontSize: 13 }}>{u.full_name || u.username}</div>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{u.uniqueTag || "@explorer"}</div>
                  </div>
                </div>
              ))}
              <div style={{ height: 1, background: "var(--border)", margin: "12px 4px" }} />
            </div>
          )}
          {loading && <div style={{ textAlign: "center", padding: 20, color: "var(--muted-foreground)", fontSize: 13 }}>Scanning...</div>}
          {!loading && query && results.length === 0 && <div style={{ textAlign: "center", padding: 20, color: "var(--muted-foreground)", fontSize: 13 }}>No explorers found</div>}
          {results.map((u) => (
            <div key={u.id || u._id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 8px", borderRadius: 12, cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--primary)/5")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")} onClick={() => startChat(u)}>
              <Avatar src={u.avatar} name={u.full_name} size={42} online={u.isOnline} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: "var(--foreground)", fontSize: 14, fontFamily: "'Space Grotesk', sans-serif" }}>{u.full_name || u.username || "Unknown"}
                  {u.verified_badge && <Icon name="verified" size={14} fill style={{ color: "var(--primary)", marginLeft: 4, verticalAlign: "middle" }} />}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 1 }}>{u.uniqueTag || u.email || u.username}</div>
              </div>
              {starting === (u.id || u._id) ? <div style={{ fontSize: 12, color: "var(--primary)" }}>Opening...</div> : <Icon name="chevron_right" size={20} style={{ color: "var(--muted-foreground)" }} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ─── New Group Modal ─────────────────────────────────────────────────────── */
const NewGroupModal = ({ onClose, onStartGroup, currentUserId }: { onClose: () => void; onStartGroup: (conv: any) => void; currentUserId: string }) => {
  const [query, setQuery] = useState(""); const [results, setResults] = useState<any[]>([]); const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]); const [groupName, setGroupName] = useState(""); const [creating, setCreating] = useState(false);
  useEffect(() => {
    const t = setTimeout(async () => { setLoading(true); try { const res = await api.searchUsers(query); setResults((res as any).data || res.users || []); } catch { toast.error("Search failed"); } finally { setLoading(false); } }, 350);
    return () => clearTimeout(t);
  }, [query]);
  const toggleUser = (u: any) => { const uid = u.id || u._id; if (selectedUsers.some(x => (x.id || x._id) === uid)) setSelectedUsers(prev => prev.filter(x => (x.id || x._id) !== uid)); else setSelectedUsers(prev => [...prev, u]); };
  const createGroup = async () => {
    if (!groupName.trim()) return toast.error("Group name required");
    if (selectedUsers.length < 1) return toast.error("Select at least 1 user");
    setCreating(true);
    try { const res = await api.createGroupChat(groupName, selectedUsers.map(u => u.id || u._id)); onStartGroup((res as any).conversation || (res as any).group || res); onClose(); }
    catch { toast.error("Failed to create group"); }
    finally { setCreating(false); }
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 16px" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 24, overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "85vh", boxShadow: "0 40px 100px rgba(0,0,0,0.1)" }} className="glass">
        <div style={{ padding: "20px 24px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: "var(--primary)", margin: 0 }}>New Group</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 4 }}><Icon name="close" size={20} /></button>
        </div>
        <div style={{ padding: "0 20px 14px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <input placeholder="Group Name..." value={groupName} onChange={(e) => setGroupName(e.target.value)} style={{ width: "100%", background: "var(--accent)", border: "1px solid var(--border)", borderRadius: 12, padding: "11px 14px", fontSize: 14, color: "var(--foreground)", outline: "none", boxSizing: "border-box", marginBottom: 10 }} />
          {selectedUsers.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{selectedUsers.map(u => <div key={u.id || u._id} style={{ display: "flex", alignItems: "center", gap: 4, background: "color-mix(in srgb, var(--primary) 15%, transparent)", color: "var(--primary)", padding: "3px 8px", borderRadius: 14, fontSize: 11 }}>{u.username || u.full_name?.split(' ')[0]}<Icon name="close" size={14} style={{ cursor: "pointer" }} onClick={() => toggleUser(u)} /></div>)}</div>}
        </div>
        <div style={{ padding: "12px 20px", flexShrink: 0 }}>
          <input placeholder="Search to add..." value={query} onChange={(e) => setQuery(e.target.value)} style={{ width: "100%", background: "var(--accent)", border: "1px solid var(--border)", borderRadius: 12, padding: "11px 14px", fontSize: 14, color: "var(--foreground)", outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 8px" }}>
          {results.map((u) => {
            const isSel = selectedUsers.some(x => (x.id || x._id) === (u.id || u._id)); return (
              <div key={u.id || u._id} onClick={() => toggleUser(u)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 8px", borderRadius: 12, cursor: "pointer", background: isSel ? "var(--primary)/8" : "transparent" }}
                onMouseEnter={(e) => !isSel && (e.currentTarget.style.background = "var(--primary)/5")} onMouseLeave={(e) => !isSel && (e.currentTarget.style.background = "transparent")}>
                <Avatar src={u.avatar} name={u.full_name} size={42} online={u.isOnline} />
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600, color: "var(--foreground)", fontSize: 14 }}>{u.full_name || u.username}</div><div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{u.email || u.uniqueTag}</div></div>
                {isSel ? <Icon name="check_circle" size={20} fill style={{ color: "var(--primary)" }} /> : <Icon name="radio_button_unchecked" size={20} style={{ color: "var(--muted-foreground)" }} />}
              </div>
            );
          })}
        </div>
        <div style={{ padding: 16, borderTop: "1px solid var(--border)", flexShrink: 0 }}>
          <button onClick={createGroup} disabled={creating} style={{ width: "100%", background: "var(--primary)", color: "var(--primary-foreground)", border: "none", borderRadius: 12, padding: 14, fontWeight: 700, cursor: creating ? "default" : "pointer", opacity: creating ? 0.7 : 1 }}>
            {creating ? "Creating..." : "Create Group"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Story Upload Modal ──────────────────────────────────────────────────── */
const STORY_GRADIENTS = [
  "linear-gradient(135deg,#0f0c29,#302b63,#24243e)", "linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)",
  "linear-gradient(135deg,#093028,#237a57)", "linear-gradient(135deg,#c94b4b,#4b134f)",
  "linear-gradient(135deg,#f7971e,#ffd200)", "linear-gradient(135deg,#4facfe,#00f2fe)",
  "linear-gradient(135deg,#43e97b,#38f9d7)", "linear-gradient(135deg,#a18cd1,#fbc2eb)",
];

const StoryModal = ({ onClose, onStoryUploaded }: { onClose: () => void; onStoryUploaded: (story: any) => void }) => {
  const fileRef = useRef<HTMLInputElement>(null); const audioFileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"media" | "audio" | "text">("media"); const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null); const [caption, setCaption] = useState(""); const [textContent, setTextContent] = useState("");
  const [bgGradient, setBgGradient] = useState(STORY_GRADIENTS[0]); const [textColor, setTextColor] = useState("#ffffff"); const [uploading, setUploading] = useState(false);
  const voice = useVoiceRecorder();
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (!f) return; setFile(f); setPreview(URL.createObjectURL(f)); };
  const submit = async () => {
    setUploading(true);
    try {
      let res: any;
      if (tab === "text") { if (!textContent.trim()) { toast.error("Add some text"); setUploading(false); return; } res = await api.uploadStory(undefined, textContent, { bg_gradient: bgGradient, text_color: textColor }); }
      else { if (!file) { toast.error("Select a file"); setUploading(false); return; } res = await api.uploadStory(file, caption || undefined); }
      onStoryUploaded(res.story || res); toast.success("Story broadcast! 🚀"); onClose();
    } catch { toast.error("Story upload failed"); }
    finally { setUploading(false); }
  };
  const canPost = tab === "text" ? textContent.trim().length > 0 : !!file;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(16px)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 16px" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 24, overflow: "hidden", boxShadow: "0 40px 100px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
        <div style={{ padding: "18px 22px 0", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 17, fontWeight: 700, color: "var(--primary)", margin: 0 }}>New Signal</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9eacc3" }}><Icon name="close" size={20} /></button>
        </div>
        <div style={{ display: "flex", gap: 0, padding: "14px 22px 0", flexShrink: 0, borderBottom: "1px solid var(--border)" }}>
          {([["media", "photo_camera", "Media"], ["audio", "mic", "Audio"], ["text", "text_fields", "Text"]] as const).map(([t, icon, label]) => (
            <button key={t} onClick={() => setTab(t as any)} style={{ flex: 1, background: "none", border: "none", borderBottom: tab === t ? "2px solid var(--primary)" : "2px solid transparent", padding: "9px 0", cursor: "pointer", color: tab === t ? "var(--primary)" : "var(--muted-foreground)", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              <Icon name={icon} size={15} />{label}
            </button>
          ))}
        </div>
        <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>
          {tab === "media" && <>
            <div onClick={() => fileRef.current?.click()} style={{ border: "2px dashed var(--primary)/20", borderRadius: 14, minHeight: 180, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", marginBottom: 14, overflow: "hidden" }}>
              {preview ? (file?.type.startsWith("video/") ? <video src={preview} style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 10 }} controls /> : <img src={preview} style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 10, objectFit: "cover" }} />) : <div style={{ textAlign: "center" }}><Icon name="add_photo_alternate" size={40} style={{ color: "var(--primary)", opacity: 0.5 }} /><p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 8 }}>Tap to select</p></div>}
            </div>
            <input ref={fileRef} type="file" hidden accept="image/*,video/*" onChange={handleFile} />
            <input placeholder="Caption (optional)" value={caption} onChange={(e) => setCaption(e.target.value)} style={{ width: "100%", background: "var(--accent)", border: "1px solid var(--border)", borderRadius: 12, padding: "11px 14px", fontSize: 14, color: "var(--foreground)", outline: "none", boxSizing: "border-box" }} />
          </>}
          {tab === "text" && <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ width: "100%", height: 180, borderRadius: 14, background: bgGradient, display: "flex", alignItems: "center", justifyContent: "center", padding: 18, boxSizing: "border-box" }}>
              <p style={{ color: textColor, fontSize: 17, fontWeight: 700, textAlign: "center", wordBreak: "break-word", margin: 0 }}>{textContent || "Your story text..."}</p>
            </div>
            <textarea placeholder="What's on your mind?" value={textContent} onChange={(e) => setTextContent(e.target.value)} rows={3} style={{ background: "var(--accent)", border: "1px solid var(--border)", borderRadius: 12, padding: "11px 14px", fontSize: 14, color: "var(--foreground)", outline: "none", resize: "none", width: "100%", boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{STORY_GRADIENTS.map((g) => <div key={g} onClick={() => setBgGradient(g)} style={{ width: 30, height: 30, borderRadius: 7, background: g, cursor: "pointer", border: bgGradient === g ? "2px solid var(--primary)" : "2px solid transparent" }} />)}</div>
            <div style={{ display: "flex", gap: 8 }}>{["#ffffff", "#ffe792", "#a2c2fd", "#4ade80", "#f87171"].map((c) => <div key={c} onClick={() => setTextColor(c)} style={{ width: 26, height: 26, borderRadius: "50%", background: c, cursor: "pointer", border: textColor === c ? "3px solid #ffe792" : "3px solid transparent", boxSizing: "border-box" }} />)}</div>
          </div>}
        </div>
        <div style={{ padding: "0 20px 20px", flexShrink: 0 }}>
          <button onClick={submit} disabled={uploading || !canPost} style={{ width: "100%", background: uploading || !canPost ? "var(--primary)/30" : "var(--primary)", color: "var(--primary-foreground)", border: "none", borderRadius: 13, padding: "13px 0", fontWeight: 700, fontSize: 14, cursor: uploading || !canPost ? "not-allowed" : "pointer" }}>
            {uploading ? "Transmitting..." : "📡 Broadcast"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Voice Recorder Hook ─────────────────────────────────────────────────── */
const useVoiceRecorder = () => {
  const [recording, setRecording] = useState(false); const [duration, setDuration] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null); const chunksRef = useRef<Blob[]>([]); const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream); chunksRef.current = []; mr.ondataavailable = (e) => chunksRef.current.push(e.data); mr.start(); mediaRef.current = mr; setRecording(true); setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch { toast.error("Microphone access denied"); }
  };
  const stop = (): Promise<File | null> => new Promise((resolve) => {
    if (!mediaRef.current) { resolve(null); return; }
    mediaRef.current.onstop = () => { const blob = new Blob(chunksRef.current, { type: "audio/webm" }); resolve(new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" })); };
    mediaRef.current.stop(); mediaRef.current.stream.getTracks().forEach((t) => t.stop()); setRecording(false); if (timerRef.current) clearInterval(timerRef.current);
  });
  const cancel = () => {
    if (mediaRef.current?.state === "recording") { mediaRef.current.stop(); mediaRef.current.stream.getTracks().forEach((t) => t.stop()); }
    setRecording(false); setDuration(0); if (timerRef.current) clearInterval(timerRef.current);
  };
  return { recording, duration, start, stop, cancel };
};

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const getChatDisplayName = (chat: any, myId: string) => { if (chat.isGroupChat) return chat.chatName || "Group"; const other = chat.users?.find((u: any) => (u.id || u._id) !== myId); return other?.full_name || other?.username || chat.chatName || "Unknown"; };
const getChatAvatar = (chat: any, myId: string) => { if (chat.isGroupChat) return null; const other = chat.users?.find((u: any) => (u.id || u._id) !== myId); return other?.avatar || null; };
const getOtherUser = (chat: any, myId: string) => chat?.users?.find((u: any) => (u.id || u._id) !== myId) || null;

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════════ */
export default function BubbleMessages() {
  const meRaw = localStorage.getItem("user");
  const me = meRaw ? JSON.parse(meRaw) : null;
  const myId = me?.id || me?._id || "";
  const navigate = useNavigate();

  // ── 4-pane mobile navigation ──────────────────────────────────────────────
  // Panes: 'contacts' → 'list' → 'chat' → 'info'
  // On desktop (md+): list + chat are always visible; info slides from right
  type Pane = 'contacts' | 'list' | 'chat' | 'info';
  const [activePane, setActivePane] = useState<Pane>('list');

  const goToPane = (pane: Pane) => setActivePane(pane);

  const handleBack = () => {
    if (activePane === 'info') setActivePane('chat');
    else if (activePane === 'chat') { setActivePane('list'); }
    else if (activePane === 'list') setActivePane('contacts');
  };

  const [chats, setChats] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [typing, setTyping] = useState(false);
  const [transmittingRegistry, setTransmittingRegistry] = useState<Record<string, { typing: boolean; recording: boolean }>>({});
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showStory, setShowStory] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showSticker, setShowSticker] = useState(false);
  const [hoveredMsg, setHoveredMsg] = useState<string | null>(null);
  const [forwardingMsg, setForwardingMsg] = useState<any>(null);
  const [viewingStory, setViewingStory] = useState<{ stories: any[]; index: number } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ msgId: string; isMine: boolean; sentAt: string } | null>(null);
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState<string | null>(null);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [chatSearch, setChatSearch] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<string | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [actionMenuMsgId, setActionMenuMsgId] = useState<string | null>(null);
  const [messageInfoModal, setMessageInfoModal] = useState<any | null>(null);
  const [chatContextMenu, setChatContextMenu] = useState<{ x: number; y: number; chat: any } | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [messageRequestStatus, setMessageRequestStatus] = useState<any>(null);
  const [requestSending, setRequestSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [aidaContext, setAidaContext] = useState<{ summary: string | null; suggestions: string[]; loading: boolean; open: boolean } | null>(null);
  const [mediaToUpload, setMediaToUpload] = useState<{ file: File; preview: string; type: 'image' | 'video'; isHD?: boolean } | null>(null);
  const [mediaCaption, setMediaCaption] = useState("");
  const [replyingToMsg, setReplyingToMsg] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeChatRef = useRef<any>(null);
  const voice = useVoiceRecorder();

  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);

  // When activeChat changes on mobile, go to chat pane
  useEffect(() => {
    if (activeChat) {
      // On mobile, navigate to chat pane; on desktop keep current layout
      const isMobile = window.innerWidth < 768;
      if (isMobile) setActivePane('chat');
    }
  }, [activeChat]);

  /* ── ESC ── */
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      let consumed = false;
      setReactionPickerMsgId((v) => { if (v) { consumed = true; return null; } return v; }); if (consumed) return;
      setShowEmoji((v) => { if (v) { consumed = true; return false; } return v; }); if (consumed) return;
      setLightboxImg((v) => { if (v) { consumed = true; return null; } return v; }); if (consumed) return;
      setDeleteModal((v) => { if (v) { consumed = true; return null; } return v; }); if (consumed) return;
      setReplyingToMsg((v: any) => { if (v) { consumed = true; return null; } return v; }); if (consumed) return;
      setMediaToUpload((v: any) => { if (v) { consumed = true; return null; } return v; }); if (consumed) return;
      setActionMenuMsgId((v) => { if (v) { consumed = true; return null; } return v; }); if (consumed) return;
      setMessageInfoModal((v) => { if (v) { consumed = true; return null; } return v; }); if (consumed) return;
      setShowNewChat((v) => { if (v) { consumed = true; return false; } return v; }); if (consumed) return;
      setShowNewGroup((v) => { if (v) { consumed = true; return false; } return v; }); if (consumed) return;
      setShowStory((v) => { if (v) { consumed = true; return false; } return v; }); if (consumed) return;
      if (activePane === 'info') { setActivePane('chat'); return; }
      setActiveChat(null);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [activePane]);

  /* ── Socket setup ── */
  useEffect(() => {
    const tokenVal = localStorage.getItem("access_token");
    if (!tokenVal) return;
    initiateSocket(tokenVal);
    const socket = getSocket();
    if (!socket) return;

    const onNewMessage = (msg: any) => {
      if (Notification.permission === 'granted' && localStorage.getItem('desktop_notifications') === 'true') {
        const senderName = msg.sender?.full_name || msg.sender?.username || 'Someone';
        new Notification(`New message from ${senderName}`, { body: msg.content || 'You received a new message' });
      }
      const chat = activeChatRef.current;
      const msgChatId = msg.chat?.id || msg.chat?._id || msg.chatId;
      const activeChatId = chat?.id || chat?._id;
      if (chat && msgChatId && msgChatId === activeChatId) {
        (async () => {
          let content = msg.content;
          if (msg.is_encrypted && msg.sender?.publicKey) content = await decryptFromSender(msg.content, msg.sender.publicKey);
          const decryptedMsg = { ...msg, content };
          setMessages((prev) => { if (prev.some((m) => (m.id || m._id) === (decryptedMsg.id || decryptedMsg._id))) return prev; return [...prev, decryptedMsg]; });
        })();
      }
      setChats((prev) => prev.map((c) => (c.id || c._id) === msgChatId ? { ...c, latestMessage: { content: msg.content || (msg.mediaUrl ? '📎 Media' : ''), sentAt: msg.sentAt || new Date().toISOString() } } : c));
    };

    const onMsgDeleted = ({ messageId }: any) => setMessages((prev) => prev.filter((m) => (m._id || m.id) !== messageId));
    const onMsgUpdated = ({ messageId, content }: any) => setMessages((prev) => prev.map((m) => (m._id || m.id) === messageId ? { ...m, content } : m));
    const onMsgReaction = ({ messageId, reactions }: any) => setMessages((prev) => prev.map((m) => (m._id || m.id) === messageId ? { ...m, reactions: reactions || [] } : m));
    const onTypingStart = ({ fromUserId, chatId }: any) => { if (fromUserId !== myId && chatId) setTransmittingRegistry(prev => ({ ...prev, [chatId]: { ...prev[chatId], typing: true } })); };
    const onTypingStop = ({ fromUserId, chatId }: any) => { if (fromUserId !== myId && chatId) setTransmittingRegistry(prev => ({ ...prev, [chatId]: { ...prev[chatId], typing: false } })); };
    const onRecordingStart = ({ fromUserId, chatId }: any) => { if (fromUserId !== myId && chatId) setTransmittingRegistry(prev => ({ ...prev, [chatId]: { ...prev[chatId], recording: true } })); };
    const onRecordingStop = ({ fromUserId, chatId }: any) => { if (fromUserId !== myId && chatId) setTransmittingRegistry(prev => ({ ...prev, [chatId]: { ...prev[chatId], recording: false } })); };
    const onStatus = ({ userId, isOnline }: any) => setChats((prev) => prev.map((c) => ({ ...c, users: c.users?.map((u: any) => (u.id || u._id) === userId ? { ...u, isOnline } : u) })));
    const onReadReceipt = (data: any) => {
      const msgChatId = data.chatId || data.chat?.id || data.chat?._id;
      if (activeChatRef.current && (activeChatRef.current.id || activeChatRef.current._id) === msgChatId) {
        setMessages((prev) => prev.map((m) => {
          if ((m.sender?.id || m.sender?._id || m.sender) !== data.readerId) {
            const alreadyRead = m.readBy?.some((r: any) => (r.id || r._id || r) === data.readerId);
            if (!alreadyRead) return { ...m, readBy: [...(m.readBy || []), { id: data.readerId }] };
          }
          return m;
        }));
      }
    };

    onEvent("new_message", onNewMessage); onEvent("message_deleted", onMsgDeleted); onEvent("message_updated", onMsgUpdated);
    onEvent("message_reaction", onMsgReaction); onEvent("typing_start", onTypingStart); onEvent("typing_stop", onTypingStop);
    onEvent("recording_start", onRecordingStart); onEvent("recording_stop", onRecordingStop); onEvent("user_status_change", onStatus);
    onEvent("read_receipt", onReadReceipt); onEvent("message_read_receipt", onReadReceipt);

    return () => {
      offEvent("new_message", onNewMessage); offEvent("message_deleted", onMsgDeleted); offEvent("message_updated", onMsgUpdated);
      offEvent("message_reaction", onMsgReaction); offEvent("typing_start", onTypingStart); offEvent("typing_stop", onTypingStop);
      offEvent("recording_start", onRecordingStart); offEvent("recording_stop", onRecordingStop); offEvent("user_status_change", onStatus);
      offEvent("read_receipt", onReadReceipt); offEvent("message_read_receipt", onReadReceipt);
    };
  }, [myId]);

  const prevChatIdRef = useRef<string | null>(null);
  useEffect(() => {
    const chatId = activeChat?.id || activeChat?._id || null;
    if (prevChatIdRef.current && prevChatIdRef.current !== chatId) emitLeaveRoom(prevChatIdRef.current);
    if (chatId) emitJoinRoom(chatId);
    prevChatIdRef.current = chatId;
  }, [activeChat]);

  /* ── Initial load ── */
  useEffect(() => {
    (async () => {
      try {
        const [chatRes, storyRes, contactRes, aidaRes] = await Promise.all([
          api.fetchAllUserChats(), api.fetchStories(), api.searchUsers(""),
          api.fetchAidaConversationObj().catch(() => null)
        ]);
        const fetchedChats = chatRes.conversations || [];
        if (aidaRes?.conversation) { const exists = fetchedChats.some((c: any) => c._id === aidaRes.conversation._id || c.id === aidaRes.conversation._id); if (!exists) fetchedChats.unshift(aidaRes.conversation); }
        setChats(fetchedChats); setStories(storyRes.stories || []); setContacts((contactRes as any).data || contactRes.users || []);
      } catch (e) { console.error("Initial load failed:", e); }
    })();
  }, []);

  useEffect(() => { const handleReset = () => setActiveChat(null); window.addEventListener('reset_active_chat', handleReset); return () => window.removeEventListener('reset_active_chat', handleReset); }, []);

  /* ── Load messages ── */
  useEffect(() => {
    if (!activeChat) return;
    (async () => {
      try {
        setSessionSummary(null); setMessages([]);
        const res = await api.fetchMessages(activeChat.id || activeChat._id);
        const msgs = res.messages || [];
        const decryptedMsgs = await Promise.all(msgs.map(async (m: any) => {
          if (m.is_encrypted && m.sender?.publicKey) return { ...m, content: await decryptFromSender(m.content, m.sender.publicKey) };
          return m;
        }));
        setMessages(decryptedMsgs);
      } catch { toast.error("Could not load messages"); }
    })();
  }, [activeChat]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  /* ── Aida context ── */
  const aidaTimeoutRef = useRef<any>(null);
  useEffect(() => {
    if (activeChat && !activeChat.isGroupChat && !activeChat.isAidaBot) {
      if (aidaTimeoutRef.current) clearTimeout(aidaTimeoutRef.current);
      aidaTimeoutRef.current = setTimeout(() => {
        api.fetchConversationContext(activeChat.id || activeChat._id).then((res: any) => {
          setAidaContext(prev => ({ summary: res.summary || prev?.summary || null, suggestions: res.suggestions || prev?.suggestions || [], loading: false, open: prev?.open !== undefined ? prev.open : true }));
        }).catch(() => { });
      }, 1500);
    }
  }, [messages.length, activeChat?.id, activeChat?._id]);

  /* ── Send ── */
  const handleSend = async () => {
    if (!inputText.trim() || !activeChat) return;
    const text = inputText; setInputText("");
    const parentMsgId = replyingToMsg ? replyingToMsg.id || replyingToMsg._id : undefined;
    setReplyingToMsg(null);
    try {
      if (messageRequestStatus?.reason === "no_request") {
        const other = getOtherUser(activeChat, myId);
        if (other) { try { setRequestSending(true); const { sendMessageRequest: sendReqApi } = await import("@/api"); await sendReqApi(other.id || other._id); toast.success("Message request sent!"); setMessageRequestStatus({ reason: "request_pending", requestDirection: "sent", requestStatus: "pending" }); } catch { toast.error("Failed to send request."); } finally { setRequestSending(false); } }
        return;
      }
      if (activeChat.isAidaBot) {
        const targetChatId = activeChat.id || activeChat._id; const tempId = `temp-${Date.now()}`;
        setMessages(prev => [...prev, { _id: tempId, content: text, sender: { _id: myId }, chat: targetChatId, createdAt: new Date().toISOString() }]);
        try { const res = await api.chatMessageAida(text, targetChatId); setMessages(prev => { let updated = prev.filter(m => m._id !== tempId); if (res.userMessage) updated.push(res.userMessage); if (res.botMessage) updated.push({ ...res.botMessage, actions: res.actions }); return updated; }); return; }
        catch { toast.error("Failed to connect to Aida."); setMessages(prev => prev.filter(m => m._id !== tempId)); return; }
      }
      const otherUser = getOtherUser(activeChat, myId); let encryptedContent = text; let is_encrypted = false;
      if (otherUser?.publicKey) { try { encryptedContent = await encryptForRecipient(text, otherUser.publicKey); is_encrypted = true; } catch (e) { console.warn("[E2EE] Encryption failed", e); } }
      const res = await api.sendTextMessage(activeChat.id || activeChat._id, encryptedContent, { parent_message: parentMsgId, is_encrypted });
      const msg = res.data || res;
      setMessages((prev) => { if (prev.some((m) => (m.id || m._id) === (msg.id || msg._id))) return prev; return [...prev, msg]; });
    } catch { toast.error("Failed to send"); }
  };

  const handleTyping = (text: string) => {
    setInputText(text);
    if (!activeChat) return;
    const chatId = activeChat?.id || activeChat?._id;
    const other = getOtherUser(activeChat, myId);
    const otherId = other ? (other.id || other._id) : '';
    if (!typing) { setTyping(true); emitTypingStart(otherId, chatId); }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => { setTyping(false); emitTypingStop(otherId, chatId); }, 1500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || !activeChat) return; e.target.value = "";
    const type = file.type.startsWith("video/") ? "video" : "image";
    setMediaToUpload({ file, preview: URL.createObjectURL(file), type }); setMediaCaption("");
  };

  const confirmMediaUpload = async () => {
    if (!mediaToUpload || !activeChat) return;
    const parentMsgId = replyingToMsg ? replyingToMsg.id || replyingToMsg._id : undefined;
    try {
      toast.info("Uploading...");
      const res = await api.sendMediaMessage(activeChat.id || activeChat._id, mediaToUpload.file, { content: mediaCaption, parent_message: parentMsgId });
      const msg = res.data || res;
      setMessages((prev) => { if (prev.some((m) => (m.id || m._id) === (msg.id || msg._id))) return prev; return [...prev, msg]; });
      setMediaToUpload(null); setMediaCaption(""); setReplyingToMsg(null);
    } catch { toast.error("Upload failed"); }
  };

  const handleVoiceSend = async () => {
    if (!activeChat) return;
    const chatId = activeChat.id || activeChat._id; const finalDuration = voice.duration;
    emitRecordingStop(chatId);
    const file = await voice.stop(); if (!file) return;
    try { toast.info("Sending voice note..."); const res = await api.sendMediaMessage(chatId, file, { media_duration: finalDuration }); const msg = res.data || res; setMessages((prev) => { if (prev.some((m) => (m.id || m._id) === (msg.id || msg._id))) return prev; return [...prev, msg]; }); }
    catch { toast.error("Voice send failed"); }
  };

  const handleVoiceStart = async () => { if (!activeChat) return; await voice.start(); emitRecordingStart(activeChat.id || activeChat._id); };

  const handleNewChat = (conv: any) => {
    setChats((prev) => { const exists = prev.find((c) => (c.id || c._id) === (conv.id || conv._id)); return exists ? prev : [conv, ...prev]; });
    setActiveChat(conv);
    if (forwardingMsg) { api.sendTextMessage(conv.id || conv._id, `[Forwarded]\n${forwardingMsg.content || ""}`, { is_forwarded: true }); toast.success("Forwarded"); setForwardingMsg(null); }
  };

  const handleDeleteMessage = async (msgId: string, scope: 'for_me' | 'for_everyone') => {
    setDeleteModal(null);
    try {
      if (scope === 'for_everyone') await api.deleteMessageForEveryone(msgId);
      else { await api.deleteMessageForMe(msgId); setMessages((prev) => prev.filter((m) => (m._id || m.id) !== msgId)); }
      toast.success(scope === 'for_everyone' ? "Deleted for everyone" : "Deleted for you");
    } catch (err: any) { toast.error(err.message?.includes('2 minutes') ? "Can only delete for everyone within 2 minutes" : "Could not delete"); }
  };

  const handleUpdateMessage = async (msgId: string, content: string, sentAt: string) => {
    if (Date.now() - new Date(sentAt).getTime() > 4 * 60 * 1000) { toast.error("Can only edit within 4 minutes"); setEditingMsgId(null); return; }
    try { await api.updateMessage(msgId, content); setMessages(prev => prev.map(m => (m._id || m.id) === msgId ? { ...m, content } : m)); setEditingMsgId(null); toast.success("Updated"); }
    catch { toast.error("Failed to update"); }
  };

  const handleReactMessage = async (msgId: string, emoji: string) => {
    try {
      setMessages(prev => prev.map(m => {
        if ((m._id || m.id) !== msgId) return m;
        const reactions = [...(m.reactions || [])];
        const existingIdx = reactions.findIndex(r => { const rUserId = r.user?.id || r.user?._id || (typeof r.user === 'string' ? r.user : null); return rUserId === myId && r.emoji === emoji; });
        if (existingIdx > -1) reactions.splice(existingIdx, 1); else reactions.push({ user: { id: myId, _id: myId }, emoji, timestamp: new Date() });
        return { ...m, reactions };
      }));
      await api.reactToMessage(msgId, emoji);
    } catch { toast.error("Failed to react"); }
  };

  const handleBlockUser = async (userId: string) => { try { await api.blockUser(userId); toast.success("User blocked"); } catch { toast.error("Failed to block"); } };
  const handleReportUser = async (userId: string) => { const reason = window.prompt("Reason?"); if (!reason) return; try { await api.reportUser(userId, reason); toast.success("Reported"); } catch { toast.error("Failed to report"); } };
  const handleMuteChat = async (chatId: string) => { try { await api.muteChat(chatId); toast.success("Muted"); } catch { toast.error("Failed to mute"); } };
  const handleClearChat = async (chatId: string) => { if (!window.confirm("Clear all messages?")) return; try { await api.clearChat(chatId); setMessages([]); toast.success("Cleared"); } catch { } };

  const handleStartCall = (type: 'voice' | 'video') => {
    if (!activeChat) return;
    let roomId = "";
    if (activeChat.isGroupChat) { roomId = activeChat._id || activeChat.id; }
    else { const other = getOtherUser(activeChat, myId); if (!other) { toast.error("No participant"); return; } const ids = [myId, other.id || other._id].sort(); roomId = `direct-${ids[0]}-${ids[1]}`; }
    navigate(`/meet/room/${roomId}?type=${type}`);
  };

  const handlePinChat = async (chatId: string) => {
    try { const res = await api.toggleChatPin(chatId); toast.success(res.isPinned ? "Pinned" : "Unpinned"); setChats(prev => prev.map(c => (c.id || c._id) === chatId ? { ...c, pinnedBy: res.isPinned ? [...(c.pinnedBy || []), myId] : (c.pinnedBy || []).filter((id: string) => id !== myId) } : c)); }
    catch { toast.error("Failed"); }
  };

  const handlePinMessage = async (msgId: string) => {
    try { const res = await api.toggleMessagePin(msgId); toast.success(res.is_pinned ? "Pinned" : "Unpinned"); setMessages(prev => prev.map(m => (m._id || m.id) === msgId ? { ...m, is_pinned: res.is_pinned } : m)); }
    catch { toast.error("Failed"); }
  };

  const toggleMessageSelection = (msgId: string) => {
    setSelectedMessages(prev => { const next = new Set(prev); if (next.has(msgId)) next.delete(msgId); else next.add(msgId); if (next.size === 0) setIsSelectionMode(false); return next; });
  };

  const handleDeleteChat = async (chatId: string) => {
    try { await api.deleteChat(chatId); setChats(prev => prev.filter(c => (c.id || c._id) !== chatId)); if ((activeChat?.id || activeChat?._id) === chatId) setActiveChat(null); toast.success('Chat deleted'); }
    catch { toast.error('Failed'); }
    setChatContextMenu(null);
  };

  const handleSelectChat = async (chat: any) => {
    setActiveChat(chat); setChatSearch(""); setMessageRequestStatus(null); setAidaContext(null);
    const chatIdToRead = chat.id || chat._id;
    setChats(prev => prev.map(c => (c.id || c._id) === chatIdToRead ? { ...c, unreadCount: 0 } : c));
    try { await import("@/api").then(({ markMessagesRead }) => markMessagesRead(chatIdToRead)); } catch { }
    if (!chat.isGroupChat && !chat.isAidaBot) {
      const other = getOtherUser(chat, myId);
      if (other && (other.id || other._id)) {
        try { const status = await checkCanMessage(other.id || other._id); if (!status.canMessage) setMessageRequestStatus(status); } catch { }
        setAidaContext({ summary: null, suggestions: [], loading: true, open: true });
        api.fetchConversationContext(chatIdToRead).then((res: any) => setAidaContext({ summary: res.summary || null, suggestions: res.suggestions || [], loading: false, open: true })).catch(() => setAidaContext(null));
      }
    }
  };

  const loadSessionSummary = async () => {
    if (!activeChat) return;
    setSummaryLoading(true);
    try { const res = await api.fetchAidaConversationSummary(activeChat.id || activeChat._id); setSessionSummary(res.summary); toast.success("Summary ready"); }
    catch { toast.error("Failed to summarize"); }
    finally { setSummaryLoading(false); }
  };

  const renderMessageText = (text: string) => {
    const wsRegex = /http[s]?:\/\/[^\s]+\/workspace\/shared\/([a-zA-Z0-9_\-]+)/g;
    if (!wsRegex.test(text)) return text;
    wsRegex.lastIndex = 0; const parts: any[] = []; let lastIdx = 0; let match;
    while ((match = wsRegex.exec(text)) !== null) {
      if (match.index > lastIdx) parts.push(text.slice(lastIdx, match.index));
      const folderId = match[1];
      parts.push(<div key={match.index} onClick={() => navigate(`/workspace/shared/${folderId}`)} style={{ marginTop: 8, marginBottom: 8, background: "rgba(11,36,64,0.6)", border: "1px solid rgba(162,194,253,0.3)", borderRadius: 12, padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}><div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(162,194,253,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="folder_shared" size={18} style={{ color: "#a2c2fd" }} /></div><div><h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#d8e6ff" }}>Shared Workspace</h4><p style={{ margin: 0, fontSize: 11, color: "#9eacc3" }}>Click to open</p></div></div>);
      lastIdx = match.index + match[0].length;
    }
    if (lastIdx < text.length) parts.push(text.slice(lastIdx));
    return parts;
  };

  /* ══════════════════════════
     PANEL VISIBILITY HELPERS
  ══════════════════════════ */
  // On mobile: only ONE pane visible at a time
  // On desktop (md+): contacts hidden, list always shown, chat+info shown when active
  const panelStyle = (pane: Pane): React.CSSProperties => {
    // Desktop: always show list; show chat/info when chat is active; hide contacts
    const base: React.CSSProperties = { display: "flex", flexDirection: "column", transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.3s" };
    return base;
  };

  /* ── RENDER ─────────────────────────────────────────────────────────── */
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Manrope:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: var(--background); }
        .material-symbols-outlined { user-select: none; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
        input::placeholder, textarea::placeholder { color: var(--muted-foreground); opacity: 0.5; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }

        /* Mobile pane transitions */
        .msg-panes-wrapper {
          display: flex;
          width: 100%;
          height: 100%;
          overflow: hidden;
          position: relative;
        }

        /* On mobile: slide between panes */
        @media (max-width: 767px) {
          .pane { position: absolute; inset: 0; width: 100%; height: 100%; transition: transform 0.32s cubic-bezier(0.4,0,0.2,1); background: var(--background); }
          .pane-contacts  { transform: translateX(var(--contacts-tx, -100%)); }
          .pane-list      { transform: translateX(var(--list-tx, 0%)); }
          .pane-chat      { transform: translateX(var(--chat-tx, 100%)); }
          .pane-info      { transform: translateX(var(--info-tx, 100%)); }
        }

        /* On desktop: sidebar layout */
        @media (min-width: 768px) {
          .pane { position: relative; height: 100%; flex-shrink: 0; }
          .pane-contacts  { display: none !important; }
          .pane-list      { width: 340px; border-right: 1px solid var(--border); background: var(--muted); }
          .pane-chat      { flex: 1; min-width: 0; background: var(--background); }
          .pane-info      { width: 288px; border-left: 1px solid var(--border); background: var(--muted); overflow-y: auto; }
        }

        .msg-action-bar {
          display: flex; flex-direction: row; flex-wrap: nowrap; align-items: center; gap: 2px;
          background: var(--card); border: 1px solid var(--border); padding: 5px 7px;
          border-radius: 14px; box-shadow: 0 12px 40px rgba(0,0,0,0.08); backdrop-filter: blur(16px);
          z-index: 100; animation: fadeUp 0.12s ease; white-space: nowrap; min-width: max-content;
        }
        .msg-action-btn {
          display: flex; align-items: center; justify-content: center; width: 34px; height: 34px;
          border-radius: 9px; border: none; background: transparent; cursor: pointer; color: var(--muted-foreground);
          transition: background 0.15s, color 0.15s; flex-shrink: 0;
        }
        .msg-action-btn:hover { background: var(--secondary); color: var(--foreground); }
        .msg-action-btn.danger:hover { background: rgba(239,68,68,0.12); color: #ef4444; }
        .msg-action-btn.active { color: var(--primary); }
        .msg-action-btn.active:hover { background: color-mix(in srgb, var(--primary) 10%, transparent); }
        .msg-action-divider { width: 1px; height: 18px; background: rgba(12, 32, 55, 0.4); margin: 0 2px; flex-shrink: 0; }
        .glass {
          background: rgba(255, 255, 255, 0.4);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(var(--primary), 0.1);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.05);
        }
      `}</style>

      {/* ── Modals & Overlays ── */}
      {mediaToUpload && (
        <div style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.88)", backdropFilter: "blur(4px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", top: 16, right: 16 }}>
            <button onClick={() => setMediaToUpload(null)} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", width: 44, height: 44, color: "#9eacc3", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="close" size={24} /></button>
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 20px 0", maxWidth: "100%", overflow: "hidden" }}>
            {mediaToUpload.type === "video" ? <video src={mediaToUpload.preview} controls style={{ maxWidth: "100%", maxHeight: "60vh", borderRadius: 16 }} /> : <img src={mediaToUpload.preview} style={{ maxWidth: "100%", maxHeight: "60vh", borderRadius: 16, objectFit: "contain" }} />}
          </div>
          <div style={{ width: "100%", maxWidth: 600, padding: "16px 20px 36px", position: "relative" }}>
            <input autoFocus placeholder="Add a caption..." value={mediaCaption} onChange={(e) => setMediaCaption(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") confirmMediaUpload(); }}
              style={{ width: "100%", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 24, padding: "14px 56px 14px 20px", color: "var(--foreground)", fontSize: 15, outline: "none" }} />
            <button onClick={confirmMediaUpload} style={{ position: "absolute", right: 28, top: 24, width: 40, height: 40, borderRadius: "50%", background: "var(--primary)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Icon name="send" size={18} style={{ color: "var(--primary-foreground)", marginLeft: 2 }} />
            </button>
          </div>
        </div>
      )}

      {showNewChat && <NewChatModal currentUserId={myId} onClose={() => { setShowNewChat(false); setForwardingMsg(null); }} onStartChat={handleNewChat} recentChats={chats} />}
      {showNewGroup && <NewGroupModal currentUserId={myId} onClose={() => setShowNewGroup(false)} onStartGroup={handleNewChat} />}
      {showStory && <StoryModal onClose={() => setShowStory(false)} onStoryUploaded={(s) => setStories(prev => [s, ...prev])} />}
      {lightboxImg && <ImageLightbox src={lightboxImg} onClose={() => setLightboxImg(null)} />}

      {messageInfoModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 16px" }} onClick={() => setMessageInfoModal(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 380, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 20, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 20px 80px rgba(0,0,0,0.1)" }}>
            <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 17, fontWeight: 700, color: "var(--primary)", margin: 0 }}>Message Info</h2>
              <button onClick={() => setMessageInfoModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}><Icon name="close" size={20} /></button>
            </div>
            <div style={{ padding: 22, color: "var(--foreground)", fontSize: 14, fontFamily: "'Manrope', sans-serif" }}>
              <div style={{ marginBottom: 14 }}><strong style={{ color: "var(--primary)" }}>Status: </strong><span>{messageInfoModal.readBy?.length > 0 ? "Read 👁️" : "Delivered ✓"}</span></div>
              <div style={{ marginBottom: 14 }}><strong style={{ color: "var(--primary)" }}>Time: </strong><span>{new Date(messageInfoModal.sentAt || messageInfoModal.createdAt).toLocaleString()}</span></div>
              {messageInfoModal.reactions?.length > 0 && <div><strong style={{ color: "var(--primary)" }}>Reactions:</strong><ul style={{ marginTop: 6, paddingLeft: 18, color: "var(--muted-foreground)" }}>{messageInfoModal.reactions.map((r: any, i: number) => <li key={i}>{r.emoji} by {r.user?.full_name || r.user?.username || "Unknown"}</li>)}</ul></div>}
            </div>
          </div>
        </div>
      )}

      {sessionSummary && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 16px" }} onClick={() => setSessionSummary(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 20, overflow: "hidden", boxShadow: "0 20px 80px rgba(0,0,0,0.1)" }}>
            <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Icon name="auto_awesome" style={{ color: "var(--primary)" }} /><h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 17, fontWeight: 700, color: "var(--primary)", margin: 0 }}>Summary</h2></div>
              <button onClick={() => setSessionSummary(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}><Icon name="close" size={20} /></button>
            </div>
            <div style={{ padding: "24px 22px", color: "var(--foreground)", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{sessionSummary}</div>
          </div>
        </div>
      )}

      {deleteModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 16px" }}>
          <div style={{ background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 18, padding: "24px 28px", width: "100%", maxWidth: 320, display: "flex", flexDirection: "column", gap: 14 }} className="glass">
            <h3 style={{ margin: 0, color: "var(--foreground)", fontFamily: "'Space Grotesk',sans-serif", fontSize: 17, textAlign: "center" }}>Delete Message?</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
              {deleteModal.isMine && (Date.now() - new Date(deleteModal.sentAt).getTime() < 120000) && (
                <button onClick={() => handleDeleteMessage(deleteModal.msgId, 'for_everyone')} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "12px", color: "#ef4444", fontWeight: 600, cursor: "pointer" }}>Delete for everyone</button>
              )}
              <button onClick={() => handleDeleteMessage(deleteModal.msgId, 'for_me')} style={{ background: "color-mix(in srgb, var(--primary) 5%, transparent)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px", color: "var(--foreground)", fontWeight: 600, cursor: "pointer" }}>Delete for me</button>
              <button onClick={() => setDeleteModal(null)} style={{ background: "transparent", border: "none", color: "var(--muted-foreground)", padding: "8px", cursor: "pointer", marginTop: 4 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Right-click context menu */}
      {chatContextMenu && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9000 }} onClick={() => setChatContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setChatContextMenu(null); }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: "fixed", left: chatContextMenu.x, top: chatContextMenu.y, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "0 20px 60px rgba(0,0,0,0.1)", overflow: "hidden", minWidth: 190, zIndex: 9001, animation: "fadeUp 0.12s ease" }}>
            {[
              { label: 'Pin Chat', icon: 'push_pin', action: () => { handlePinChat(chatContextMenu.chat.id || chatContextMenu.chat._id); setChatContextMenu(null); } },
              { label: 'Clear Messages', icon: 'cleaning_services', action: () => { api.clearChat(chatContextMenu.chat.id || chatContextMenu.chat._id).then(() => { toast.success('Cleared'); setChatContextMenu(null); }).catch(() => toast.error('Failed')); } },
              { label: 'Delete Chat', icon: 'delete', danger: true, action: () => handleDeleteChat(chatContextMenu.chat.id || chatContextMenu.chat._id) },
            ].map((item) => (
              <button key={item.label} onClick={item.action} style={{ width: "100%", background: "none", border: "none", padding: "11px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", color: (item as any).danger ? "#ef4444" : "var(--foreground)", fontSize: 13, textAlign: "left", borderBottom: "1px solid var(--border)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = (item as any).danger ? "rgba(239,68,68,0.05)" : "var(--secondary)")} onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
                <Icon name={item.icon} size={15} style={{ color: (item as any).danger ? "#ef4444" : "var(--muted-foreground)" }} />{item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ══ MAIN LAYOUT ══════════════════════════════════════════════ */}
      <div style={{ display: "flex", minHeight: "100dvh", background: "var(--background)", color: "var(--foreground)", fontFamily: "'Manrope', sans-serif", overflow: "hidden" }}>
        <Sidebar />

        {/* Mobile top header — standardized with other pages */}
        <div
          className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center gap-4 px-8 h-20 border-b border-[var(--border)]"
          style={{ background: "color-mix(in srgb, var(--background) 80%, transparent)", backdropFilter: "blur(12px)" }}
        >
          {/* Hamburger Menu (only on main list/contacts) or Back Button (if inside a chat or info) */}
          {(activePane === 'chat' || activePane === 'info' || (activePane === 'contacts' && activeChat)) ? (
            <button onClick={handleBack} style={{ background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="arrow_back" size={24} />
            </button>
          ) : (
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('toggle-sidebar'))}
              style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <Icon name="menu" size={24} />
            </button>
          )}

          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            {activePane === 'contacts' && <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 16, color: "var(--primary)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Explorers</span>}
            {activePane === 'list' && <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 16, color: "var(--primary)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Messages</span>}
            {activePane === 'chat' && activeChat && (
              <div
                onClick={() => setActivePane('info')}
                style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, minWidth: 0, cursor: "pointer" }}
              >
                <Avatar src={getChatAvatar(activeChat, myId)} name={getChatDisplayName(activeChat, myId)} size={36} online={getOtherUser(activeChat, myId)?.isOnline} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{getChatDisplayName(activeChat, myId)}</div>
                  <div style={{ fontSize: 10, color: "var(--primary)", textTransform: "uppercase", fontWeight: 600 }}>{getOtherUser(activeChat, myId)?.isOnline ? "Online" : "Offline"}</div>
                </div>
              </div>
            )}
            {activePane === 'info' && activeChat && <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 16, color: "var(--primary)", textTransform: "uppercase" }}>Details</span>}
          </div>

          {activePane === 'list' && (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowNewChat(true)} style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)", border: "none", borderRadius: 10, width: 40, height: 40, cursor: "pointer", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="chat" size={20} /></button>
              <button onClick={() => setActivePane('contacts')} style={{ background: "var(--secondary)", border: "none", borderRadius: 10, width: 40, height: 40, cursor: "pointer", color: "var(--muted-foreground)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="contacts" size={20} /></button>
            </div>
          )}

          {activePane === 'chat' && activeChat && (
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => handleStartCall('voice')} style={{ width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)" }}><Icon name="call" size={22} /></button>
              <button onClick={() => handleStartCall('video')} style={{ width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)" }}><Icon name="videocam" size={22} /></button>
            </div>
          )}
        </div>

        {/* ── Panes container ── */}
        <main style={{ marginLeft: "var(--main-margin)", flex: 1, display: "flex", height: "100dvh", overflow: "hidden", position: "relative" }}>
          <div className="msg-panes-wrapper" style={{
            // Mobile: set CSS vars to control which pane is visible
            //@ts-ignore
            "--contacts-tx": activePane === 'contacts' ? '0%' : activePane === 'list' || activePane === 'chat' || activePane === 'info' ? '-100%' : '-100%',
            "--list-tx": activePane === 'list' ? '0%' : activePane === 'contacts' ? '100%' : '-100%',
            "--chat-tx": activePane === 'chat' ? '0%' : activePane === 'info' ? '-100%' : '100%',
            "--info-tx": activePane === 'info' ? '0%' : '100%',
          } as any}>

            {/* ══ PANE 0: Contacts ════════════════════════════════════ */}
            <div className="pane pane-contacts" style={{ overflowY: "auto" }}>
              <div style={{ padding: "72px 20px 16px" }}>
                <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 700, color: "var(--primary)", letterSpacing: "0.08em", marginBottom: 16 }}>EXPLORERS</h1>
                <div style={{ position: "relative", marginBottom: 20 }}>
                  <Icon name="search" size={18} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
                  <input placeholder="Search identities..." onChange={async (e) => { const q = e.target.value; const res = await api.searchUsers(q); setContacts((res as any).data || res.users || []); }}
                    style={{ width: "100%", background: "var(--accent)", border: "1px solid var(--border)", borderRadius: 16, padding: "14px 14px 14px 44px", fontSize: 14, color: "var(--foreground)", outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
              <div style={{ padding: "0 16px 32px" }}>
                {contacts.map((u: any) => (
                  <div key={u.id || u._id} onClick={async () => { try { const res = await api.accessOrCreateChat(u.id || u._id); await handleSelectChat(res.conversation || res.data); setActivePane('chat'); } catch { toast.error("Failed"); } }}
                    style={{ display: "flex", gap: 16, alignItems: "center", padding: "16px 12px", borderRadius: 16, cursor: "pointer", marginBottom: 4 }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                    <Avatar src={u.avatar} name={u.full_name} size={48} online={u.isOnline} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: "var(--foreground)", fontSize: 15, fontFamily: "'Space Grotesk', sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.full_name || u.username}</div>
                      <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.org_role ? `${u.org_role} @ ${u.organization || 'Explorer Hub'}` : (u.organization || 'Identity Verified')}</p>
                    </div>
                    <Icon name="chevron_right" size={20} style={{ color: "var(--muted-foreground)", flexShrink: 0, opacity: 0.5 }} />
                  </div>
                ))}
              </div>
            </div>

            {/* ══ PANE 1: Chat List ════════════════════════════════════ */}
            <div className="pane pane-list" style={{ overflowY: "hidden", display: "flex", flexDirection: "column" }}>
              {/* Desktop header — hidden on mobile (mobile uses top bar above) */}
              <div className="hidden md:block" style={{ padding: "24px 20px 14px", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 700, color: "var(--primary)", letterSpacing: "0.08em", margin: 0 }}>TRANSMISSIONS</h1>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button title="New Chat" onClick={() => setShowNewChat(true)} style={{ background: "color-mix(in srgb, var(--primary) 15%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)", borderRadius: 9, padding: 7, cursor: "pointer", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="chat" size={18} /></button>
                    <button title="New Group" onClick={() => setShowNewGroup(true)} style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 9, padding: 7, cursor: "pointer", color: "#4ade80", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="group_add" size={18} /></button>
                    <button title="Post Story" onClick={() => setShowStory(true)} style={{ background: "rgba(162,194,253,0.1)", border: "1px solid rgba(162,194,253,0.2)", borderRadius: 9, padding: 7, cursor: "pointer", color: "#a2c2fd", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="add_photo_alternate" size={18} /></button>
                  </div>
                </div>
                <div style={{ position: "relative" }}>
                  <Icon name="search" size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
                  <input placeholder="Search transmissions..." value={sidebarSearch} onChange={(e) => setSidebarSearch(e.target.value)}
                    style={{ width: "100%", background: "var(--accent)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 14px 10px 38px", fontSize: 13, color: "var(--foreground)", outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>

              {/* Mobile list header spacer + search */}
              <div className="md:hidden" style={{ padding: "72px 16px 12px", flexShrink: 0 }}>
                <div style={{ position: "relative" }}>
                  <Icon name="search" size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
                  <input placeholder="Search..." value={sidebarSearch} onChange={(e) => setSidebarSearch(e.target.value)}
                    style={{ width: "100%", background: "var(--accent)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 14px 10px 38px", fontSize: 13, color: "var(--foreground)", outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>

              {/* Stories strip */}
              <div style={{ padding: "0 16px 12px", flexShrink: 0 }}>
                <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
                  <div onClick={() => setShowStory(true)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, flexShrink: 0, cursor: "pointer" }}>
                    <div style={{ width: 50, height: 50, borderRadius: "50%", border: "2px dashed color-mix(in srgb, var(--primary) 40%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", background: "color-mix(in srgb, var(--primary) 5%, transparent)" }}>
                      <Icon name="add" size={20} style={{ color: "var(--primary)" }} />
                    </div>
                    <span style={{ fontSize: 9, color: "var(--muted-foreground)", textTransform: "uppercase" }}>Add</span>
                  </div>
                  {stories.map((s: any, i) => (
                    <div key={s._id || i} onClick={() => setViewingStory({ stories, index: i })} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, flexShrink: 0, cursor: "pointer" }}>
                      <div style={{ width: 50, height: 50, borderRadius: "50%", padding: 2, background: "linear-gradient(135deg, var(--primary), var(--secondary))", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Avatar src={s.author?.avatar} name={s.author?.full_name} size={46} />
                      </div>
                      <span style={{ fontSize: 9, color: "var(--muted-foreground)", maxWidth: 50, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.author?.full_name?.split(" ")[0] || "User"}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat list */}
              <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 12px" }} className="scrollbar-thin">
                {chats.length === 0 && (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted-foreground)" }}>
                    <Icon name="chat_bubble_outline" size={36} style={{ opacity: 0.3, display: "block", margin: "0 auto 10px" }} />
                    <p style={{ fontSize: 13 }}>No conversations yet.</p>
                  </div>
                )}
                {chats.filter((c: any) => !sidebarSearch || getChatDisplayName(c, myId).toLowerCase().includes(sidebarSearch.toLowerCase()))
                  .sort((a: any, b: any) => {
                    const aPin = a.pinnedBy?.includes(myId) ? 1 : 0; const bPin = b.pinnedBy?.includes(myId) ? 1 : 0;
                    if (aPin !== bPin) return bPin - aPin;
                    return new Date(b.latestMessage?.sentAt || 0).getTime() - new Date(a.latestMessage?.sentAt || 0).getTime();
                  })
                  .map((c: any) => {
                    const name = getChatDisplayName(c, myId); const avatar = getChatAvatar(c, myId); const other = getOtherUser(c, myId);
                    const isActive = (activeChat?.id || activeChat?._id) === (c.id || c._id); const isPinned = c.pinnedBy?.includes(myId);
                    const transmitting = transmittingRegistry[c.id || c._id];
                    return (
                      <div key={c.id || c._id}
                        onClick={() => { handleSelectChat(c); setActivePane('chat'); }}
                        onContextMenu={(e) => { e.preventDefault(); setChatContextMenu({ x: e.clientX, y: e.clientY, chat: c }); }}
                        style={{
                          display: "flex", gap: 14, alignItems: "center", padding: "16px 14px", borderRadius: 18, cursor: "pointer", marginBottom: 4,
                          background: isActive ? "rgba(var(--primary), 0.08)" : "transparent",
                          backdropFilter: isActive ? "blur(12px)" : "none",
                          borderLeft: isActive ? "3px solid hsl(var(--primary))" : "3px solid transparent",
                          boxShadow: isActive ? "0 4px 20px rgba(0,0,0,0.04)" : "none",
                          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
                        }}
                        onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = "rgba(var(--primary), 0.03)"; e.currentTarget.style.backdropFilter = "blur(4px)"; } }}
                        onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.backdropFilter = "none"; } }}>
                        <div style={{ cursor: "pointer", flexShrink: 0 }}>
                          <Avatar src={avatar} name={name} size={50} online={other?.isOnline} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                            <span style={{ fontWeight: 700, color: isActive ? "var(--primary)" : "var(--foreground)", fontSize: 15, fontFamily: "'Space Grotesk', sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, paddingRight: 6 }}>{name}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                              {c.unreadCount > 0 && <span style={{ background: "var(--primary)", color: "var(--primary-foreground)", fontSize: 9, padding: "2px 6px", borderRadius: 10, fontWeight: "bold" }}>{c.unreadCount}</span>}
                              {c.latestMessage?.sentAt && <span style={{ fontSize: 10, color: "#68768b" }}>{new Date(c.latestMessage.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
                              {isPinned && !c.latestMessage?.sentAt && <Icon name="push_pin" size={11} style={{ color: "var(--primary)" }} />}
                            </div>
                          </div>
                          <p style={{ fontSize: 12, color: (transmitting?.typing || transmitting?.recording) ? "var(--primary)" : "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
                            {transmitting?.recording ? "🎤 recording..." : transmitting?.typing ? "⚡ typing..." : (c.latestMessage?.content || (c.latestMessage?.mediaUrl ? "📎 Attachment" : "No messages yet"))}
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* ══ PANE 2: Chat Thread ════════════════════════════════ */}
            <div className="pane pane-chat" style={{ display: "flex", flexDirection: "column", background: "var(--background)" }}>
              {!activeChat ? (
                /* Empty state — desktop only; on mobile this pane isn't shown without a chat */
                <div className="hidden md:flex" style={{ flex: 1, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, color: "var(--muted-foreground)" }}>
                  <Icon name="chat_bubble_outline" size={56} style={{ opacity: 0.12 }} />
                  <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 600, color: "var(--foreground)", opacity: 0.35 }}>Select a transmission</h2>
                  <p style={{ fontSize: 13, color: "var(--muted-foreground)", opacity: 0.45 }}>Choose from the list or start a new chat</p>
                  <button onClick={() => setShowNewChat(true)} style={{ marginTop: 6, background: "var(--primary)", color: "var(--primary-foreground)", border: "none", borderRadius: 40, padding: "11px 22px", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+ New Transmission</button>
                </div>
              ) : (
                <>
                  {/* Desktop Chat Header */}
                  <header className="hidden md:flex" style={{ height: 72, alignItems: "center", justifyContent: "space-between", padding: "0 24px", background: "var(--card)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
                    {isSelectionMode || selectedMessages.size > 0 ? (
                      <>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <button onClick={() => { setSelectedMessages(new Set()); setIsSelectionMode(false); }} style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer" }}><Icon name="close" size={22} /></button>
                          <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--primary)", margin: 0 }}>{selectedMessages.size} selected</h2>
                        </div>
                        <div style={{ display: "flex", gap: 10 }}>
                          <button onClick={() => setSelectedMessages(new Set(messages.map((m: any) => m._id || m.id).filter(Boolean)))} style={{ background: "rgba(255,231,146,0.1)", border: "none", borderRadius: 9, padding: "7px 12px", cursor: "pointer", color: "var(--primary)", fontWeight: 600, fontSize: 12 }}>Select All</button>
                          <button onClick={async () => { if (!window.confirm(`Delete ${selectedMessages.size} message(s)?`)) return; await Promise.all(Array.from(selectedMessages).map(id => api.deleteMessageForMe(id))); setMessages(prev => prev.filter(m => !selectedMessages.has(m._id || m.id))); setSelectedMessages(new Set()); setIsSelectionMode(false); }} style={{ background: "rgba(239,68,68,0.2)", border: "none", borderRadius: 9, padding: "7px 10px", cursor: "pointer", color: "#ef4444" }}><Icon name="delete" size={18} /></button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => setActivePane('info')}>
                          <Avatar src={getChatAvatar(activeChat, myId)} name={getChatDisplayName(activeChat, myId)} size={40} online={getOtherUser(activeChat, myId)?.isOnline} />
                          <div>
                            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>{getChatDisplayName(activeChat, myId)}</h2>
                            <span style={{ fontSize: 10, color: "var(--primary)", textTransform: "uppercase" }}>
                              {transmittingRegistry[activeChat?.id || activeChat?._id]?.recording ? "recording..." : transmittingRegistry[activeChat?.id || activeChat?._id]?.typing ? "typing..." : getOtherUser(activeChat, myId)?.isOnline ? "Online" : "Offline"}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ position: "relative" }}>
                            <input placeholder="Search..." value={chatSearch} onChange={(e) => setChatSearch(e.target.value)}
                              style={{ background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 20, padding: "7px 12px 7px 32px", fontSize: 12, color: "var(--foreground)", outline: "none", width: 130 }} />
                            <Icon name="search" size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
                          </div>
                          <button onClick={() => handleStartCall('voice')} style={{ background: "var(--secondary)", border: "none", borderRadius: 10, padding: 8, cursor: "pointer", color: "var(--muted-foreground)", display: "flex" }}><Icon name="call" size={19} /></button>
                          <button onClick={() => handleStartCall('video')} style={{ background: "var(--secondary)", border: "none", borderRadius: 10, padding: 8, cursor: "pointer", color: "var(--muted-foreground)", display: "flex" }}><Icon name="videocam" size={19} /></button>
                          <button onClick={loadSessionSummary} disabled={summaryLoading} style={{ background: "var(--primary)/10", border: "1px solid var(--primary)/20", borderRadius: 10, padding: 8, cursor: "pointer", color: "var(--primary)", display: "flex", opacity: summaryLoading ? 0.5 : 1 }}><Icon name={summaryLoading ? "hourglass_empty" : "auto_awesome"} size={19} /></button>
                        </div>
                      </>
                    )}
                  </header>

                  {/* Messages area */}
                  <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px" }} className="scrollbar-thin">
                    {/* Mobile spacer for fixed top bar */}
                    <div className="md:hidden" style={{ height: 14 }} />

                    {messages.length === 0 && <div style={{ textAlign: "center", color: "var(--muted-foreground)", opacity: 0.5, padding: "48px 0", fontSize: 13 }}>No messages yet. Say hello! 👋</div>}

                    {messages.filter(msg => {
                      if (!chatSearch) return true;
                      return (msg.content || "").toLowerCase().includes(chatSearch.toLowerCase()) || (msg.mediaUrl || "").toLowerCase().includes(chatSearch.toLowerCase());
                    }).map((msg: any, i) => {
                      const senderId = msg.sender?.id || msg.sender?._id || msg.fromUserId;
                      const isMine = senderId === myId;
                      const isPinned = msg.is_pinned;
                      const isSelected = selectedMessages.has(msg._id || msg.id);
                      const msgId = msg._id || msg.id;
                      const rawUrl = msg.mediaUrl || msg.media_url || null;
                      const resolvedUrl: string | null = getSecureMediaUrl(rawUrl);
                      const resolvedType: string = msg.mediaType || msg.message_type || msg.type || "text";
                      const isVoice = resolvedUrl && (resolvedType === "voice" || resolvedType === "audio" || msg.mimeType?.startsWith("audio/") || rawUrl?.match(/\.(mp3|wav|ogg|m4a|weba)/i));
                      const isVideo = resolvedUrl && !isVoice && (resolvedType === "video" || msg.mimeType?.startsWith("video/") || rawUrl?.match(/\.(mp4|webm|mov|mkv)/i));
                      const isImage = resolvedUrl && !isVideo && !isVoice && (resolvedType === "image" || msg.mimeType?.startsWith("image/") || rawUrl?.match(/\.(jpeg|jpg|gif|png|webp|svg)/i));
                      const isFile = resolvedUrl && !isImage && !isVideo && !isVoice;

                      return (
                        <div key={msgId || i} style={{ display: "flex", flexDirection: "column" }}>
                          <div
                            onMouseEnter={() => setHoveredMsg(msgId)} onMouseLeave={() => setHoveredMsg(null)}
                            style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start", marginBottom: 6, position: "relative", background: isSelected ? "rgba(255,231,146,0.05)" : "transparent", padding: isSelected ? "8px" : "4px 8px", borderRadius: 12 }}>
                            {isPinned && <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4, alignSelf: isMine ? "flex-end" : "flex-start" }}><Icon name="push_pin" size={10} style={{ color: "var(--primary)" }} /><span style={{ fontSize: 9, color: "var(--primary)", fontWeight: 700, opacity: 0.6 }}>PINNED</span></div>}
                            <div style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start", width: "100%", position: "relative" }}>
                              {!isMine && <div style={{ marginRight: 8, alignSelf: "flex-end", flexShrink: 0 }}><Avatar src={msg.sender?.avatar} name={msg.sender?.full_name} size={30} /></div>}
                              <div style={{
                                maxWidth: "75%",
                                background: isMine ? "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)))" : "rgba(255, 255, 255, 0.6)",
                                padding: "12px 16px",
                                borderRadius: isMine ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
                                border: isMine ? "none" : "1px solid rgba(var(--primary), 0.1)",
                                position: "relative",
                                boxShadow: isMine ? "0 4px 15px rgba(var(--primary), 0.2)" : "0 4px 15px rgba(0,0,0,0.03)",
                                backdropFilter: isMine ? "none" : "blur(16px)"
                              }}>
                                {/* 3-dots trigger */}
                                {hoveredMsg === msgId && !isSelected && actionMenuMsgId !== msgId && (
                                  <button onClick={(e) => { e.stopPropagation(); setActionMenuMsgId(msgId); }} style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", ...(isMine ? { left: -34 } : { right: -34 }), background: "var(--secondary)", border: "1px solid var(--border)", borderRadius: "50%", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)", cursor: "pointer", zIndex: 10 }}>
                                    <Icon name="more_horiz" size={16} />
                                  </button>
                                )}
                                {/* Action bar */}
                                {(actionMenuMsgId === msgId || isSelected) && (
                                  <>
                                    {actionMenuMsgId === msgId && !isSelected && <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={(e) => { e.stopPropagation(); setActionMenuMsgId(null); }} />}
                                    <div className="msg-action-bar" style={{ position: "absolute", top: "calc(100% + 7px)", ...(isMine ? { right: 0 } : { left: 0 }), zIndex: 50 }}>
                                      <button className="msg-action-btn" title="React" onClick={() => setReactionPickerMsgId(msgId)}><Icon name="add_reaction" size={17} /></button>
                                      <button className="msg-action-btn" title="Reply" onClick={() => setReplyingToMsg(msg)}><Icon name="reply" size={17} /></button>
                                      <button className="msg-action-btn" title="Forward" onClick={() => setForwardingMsg(msg)}><Icon name="forward" size={17} /></button>
                                      <button className="msg-action-btn" title="Copy" onClick={() => { if (msg.content) { navigator.clipboard.writeText(msg.content); toast.success("Copied"); } setActionMenuMsgId(null); }}><Icon name="content_copy" size={17} /></button>
                                      <button className={`msg-action-btn${isPinned ? " active" : ""}`} title="Pin" onClick={async () => { await handlePinMessage(msgId); setActionMenuMsgId(null); }}><Icon name="push_pin" size={17} /></button>
                                      <button className={`msg-action-btn${isSelected ? " active" : ""}`} title="Select" onClick={() => toggleMessageSelection(msgId)}><Icon name={isSelected ? "check_circle" : "check_box_outline_blank"} size={17} /></button>
                                      <button className="msg-action-btn" title="Info" onClick={() => setMessageInfoModal(msg)}><Icon name="info" size={17} /></button>
                                      {isMine && !isVideo && !isVoice && !isFile && <button className="msg-action-btn" title="Edit" onClick={() => { setEditingMsgId(msgId); setEditContent(msg.content || ""); setActionMenuMsgId(null); }}><Icon name="edit" size={17} /></button>}
                                      <div className="msg-action-divider" style={{ background: "rgba(12, 32, 55, 0.4)" }} />
                                      <button className="msg-action-btn danger" title="Delete" onClick={() => setDeleteModal({ msgId, isMine, sentAt: msg.sentAt || msg.createdAt })}><Icon name="delete" size={17} /></button>
                                    </div>
                                  </>
                                )}
                                {/* Reaction picker */}
                                {reactionPickerMsgId === msgId && (
                                  <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }} onClick={(e) => { e.stopPropagation(); setReactionPickerMsgId(null); }} />
                                    <div style={{ position: "relative", zIndex: 10000 }} onClick={(e) => e.stopPropagation()}>
                                      <EmojiPicker direction="up" onSelect={(emoji) => { handleReactMessage(msgId, emoji); setReactionPickerMsgId(null); }} onClose={() => setReactionPickerMsgId(null)} />
                                    </div>
                                  </div>
                                )}
                                {/* Reply preview */}
                                {msg.parent_message && (
                                  <div style={{ background: isMine ? "rgba(255,255,255,0.15)" : "var(--secondary)", borderLeft: `3px solid ${isMine ? "rgba(255,255,255,0.4)" : "var(--primary)"}`, padding: "5px 9px", borderRadius: "7px 7px 7px 2px", marginBottom: 8, fontSize: 11 }}>
                                    <span style={{ fontWeight: 800, color: isMine ? "var(--primary-foreground)" : "var(--primary)", display: "block", marginBottom: 2 }}>{msg.parent_message.sender?.full_name || "Unknown"}</span>
                                    <span style={{ color: isMine ? "var(--primary-foreground)" : "var(--muted-foreground)", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden", opacity: 0.8 }}>{msg.parent_message.content || (msg.parent_message.mediaUrl ? "📎 Attachment" : "...")}</span>
                                  </div>
                                )}
                                {/* Group sender */}
                                {activeChat.isGroupChat && !isMine && <div style={{ fontSize: 11, fontWeight: 800, color: "var(--primary)", marginBottom: 3 }}>{msg.sender?.full_name || "Unknown"}</div>}
                                {/* Image */}
                                {isImage && <img src={resolvedUrl!} onClick={() => setLightboxImg(resolvedUrl!)} style={{ maxWidth: "100%", borderRadius: 10, display: "block", cursor: "pointer", marginBottom: msg.content ? 6 : 0 }} alt="Media" />}
                                {/* Video */}
                                {isVideo && <video src={resolvedUrl!} controls style={{ maxWidth: "100%", borderRadius: 10, marginBottom: msg.content ? 6 : 0 }} />}
                                {/* Voice */}
                                {isVoice && <CustomAudioPlayer src={resolvedUrl!} duration={msg.media_metadata?.duration} isMine={isMine} />}
                                {/* File */}
                                {isFile && (
                                  <a href={resolvedUrl!} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", background: isMine ? "rgba(255,255,255,0.1)" : "var(--secondary)", borderRadius: 10, textDecoration: "none", marginBottom: msg.content ? 6 : 0, border: "1px solid var(--border)" }}>
                                    <div style={{ width: 34, height: 34, background: "var(--primary)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary-foreground)", flexShrink: 0 }}><Icon name="description" size={18} /></div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <p style={{ margin: 0, fontSize: 12, color: isMine ? "var(--primary-foreground)" : "var(--foreground)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{msg.mediaUrl?.split('/').pop() || "File"}</p>
                                      <p style={{ margin: 0, fontSize: 10, color: isMine ? "rgba(255,255,255,0.6)" : "var(--muted-foreground)" }}>Download</p>
                                    </div>
                                  </a>
                                )}
                                {/* Text / Edit */}
                                {editingMsgId === msgId ? (
                                  <div style={{ display: "flex", flexDirection: "column", gap: 7, minWidth: 180 }}>
                                    <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} autoFocus style={{ width: "100%", background: "rgba(0,0,0,0.1)", border: "1px solid var(--border)", borderRadius: 7, padding: 7, color: isMine ? "inherit" : "var(--foreground)", fontSize: 14, outline: "none", minHeight: 55, resize: "none" }} />
                                    <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                                      <button onClick={() => setEditingMsgId(null)} style={{ background: "none", border: "none", color: "var(--muted-foreground)", fontSize: 10, cursor: "pointer", fontWeight: 700 }}>CANCEL</button>
                                      <button onClick={() => handleUpdateMessage(msgId, editContent, msg.sentAt || msg.createdAt)} style={{ background: isMine ? "rgba(0,0,0,0.1)" : "var(--primary)", border: "none", color: isMine ? "inherit" : "var(--primary-foreground)", borderRadius: 4, padding: "2px 8px", fontSize: 10, cursor: "pointer", fontWeight: 700 }}>SAVE</button>
                                    </div>
                                  </div>
                                ) : msg.content && (
                                  <div style={{ fontSize: 14, color: isMine ? "var(--primary-foreground)" : "var(--foreground)", lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{renderMessageText(msg.content)}</div>
                                )}
                                {/* Timestamp */}
                                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 3, marginTop: 3, opacity: 0.75 }}>
                                  <span style={{ fontSize: 9, color: isMine ? "var(--primary-foreground)/70" : "var(--muted-foreground)", fontWeight: 600 }}>{new Date(msg.sentAt || msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  {isMine && <Icon name={msg.readBy?.some((r: any) => (r.id || r._id || r).toString() !== myId.toString()) ? "done_all" : "check"} size={12} style={{ color: msg.readBy?.some((r: any) => (r.id || r._id || r).toString() !== myId.toString()) ? "#3b82f6" : "var(--primary-foreground)/50" }} />}
                                </div>
                              </div>
                            </div>
                            {/* Reactions display */}
                            {msg.reactions?.length > 0 && (
                              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 5, alignSelf: isMine ? "flex-end" : "flex-start", marginLeft: isMine ? 0 : 38 }}>
                                {Array.from(new Set(msg.reactions.map((r: any) => r.emoji))).map((emoji: any) => {
                                  const count = msg.reactions.filter((r: any) => r.emoji === emoji).length;
                                  const hasReacted = msg.reactions.some((r: any) => (r.user?.id || r.user?._id || r.user) === myId && r.emoji === emoji);
                                  return (
                                    <div key={emoji} onClick={() => handleReactMessage(msgId, emoji)} style={{ background: hasReacted ? "var(--secondary)" : "var(--muted)", border: `1px solid ${hasReacted ? "var(--primary)" : "var(--border)"}`, borderRadius: 9, padding: "2px 7px", display: "flex", alignItems: "center", gap: 3, cursor: "pointer" }}>
                                      <span style={{ fontSize: 12 }}>{emoji}</span>
                                      {count > 1 && <span style={{ fontSize: 9, fontWeight: 800, color: hasReacted ? "var(--primary)" : "var(--muted-foreground)" }}>{count}</span>}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Typing indicator */}
                    {transmittingRegistry[activeChat?.id || activeChat?._id]?.typing && (
                      <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 6, marginTop: 2, paddingLeft: 8 }}>
                        <div style={{ background: "var(--muted)", padding: "10px 14px", borderRadius: "16px 16px 16px 4px", border: "1px solid var(--border)", display: "flex", gap: 5, alignItems: "center" }}>
                          {[0, 200, 400].map(d => <div key={d} style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--primary)", animation: "pulse 1s infinite", animationDelay: `${d}ms` }} />)}
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message request banner */}
                  {messageRequestStatus && !activeChat?.isGroupChat && (
                    <div style={{ padding: "0 16px 16px", flexShrink: 0 }}>
                      <div style={{ background: "color-mix(in srgb, var(--muted) 80%, transparent)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center", backdropFilter: "blur(10px)" }}>
                        <Icon name={messageRequestStatus.reason === "request_pending" && messageRequestStatus.requestDirection === "received" ? "mark_email_unread" : messageRequestStatus.reason === "request_pending" ? "hourglass_empty" : "lock"} size={28} style={{ color: "var(--primary)" }} />
                        <div style={{ color: "var(--foreground)", fontSize: 13, fontWeight: 600 }}>{messageRequestStatus.reason === "request_pending" && messageRequestStatus.requestDirection === "received" ? "Message Request Received" : "Message Request Required"}</div>
                        <div style={{ color: "var(--muted-foreground)", fontSize: 11 }}>{messageRequestStatus.reason === "request_pending" ? (messageRequestStatus.requestDirection === "sent" ? "Request sent. Waiting for acceptance." : `${getChatDisplayName(activeChat, myId)} wants to message you.`) : "Send a request to start chatting."}</div>
                        {messageRequestStatus.reason === "request_pending" && messageRequestStatus.requestDirection === "received" && (
                          <div style={{ display: "flex", gap: 10, marginTop: 2 }}>
                            <button disabled={requestSending} onClick={async () => { setRequestSending(true); try { const { respondToMessageRequest } = await import("@/api"); await respondToMessageRequest(messageRequestStatus.entityId || messageRequestStatus.requestId, "accept"); toast.success("Accepted!"); setMessageRequestStatus(null); } catch (e: any) { toast.error(e.message || "Failed"); } finally { setRequestSending(false); } }} style={{ padding: "9px 20px", background: "var(--primary)", color: "var(--primary-foreground)", borderRadius: 10, fontSize: 11, fontWeight: 700, cursor: "pointer", border: "none", opacity: requestSending ? 0.7 : 1 }}>{requestSending ? "..." : "✓ Accept"}</button>
                            <button disabled={requestSending} onClick={async () => { setRequestSending(true); try { const { respondToMessageRequest } = await import("@/api"); await respondToMessageRequest(messageRequestStatus.entityId || messageRequestStatus.requestId, "decline"); toast.success("Declined"); setMessageRequestStatus(null); setActiveChat(null); } catch (e: any) { toast.error(e.message || "Failed"); } finally { setRequestSending(false); } }} style={{ padding: "9px 20px", background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, fontSize: 11, fontWeight: 700, cursor: "pointer", opacity: requestSending ? 0.7 : 1 }}>✕ Decline</button>
                          </div>
                        )}
                        {messageRequestStatus.reason === "no_request" && (
                          <button disabled={requestSending} onClick={async () => { const other = getOtherUser(activeChat, myId); if (!other) return; setRequestSending(true); try { await sendRequest(other.id || other._id); toast.success("Request sent!"); setMessageRequestStatus({ reason: "request_pending", requestDirection: "sent", requestStatus: "pending" }); } catch { toast.error("Failed"); } finally { setRequestSending(false); } }} style={{ padding: "9px 20px", background: "var(--primary)", color: "var(--primary-foreground)", borderRadius: 10, fontSize: 11, fontWeight: 700, cursor: "pointer", border: "none", marginTop: 4, opacity: requestSending ? 0.7 : 1 }}>
                            {requestSending ? "Sending..." : "Send Request"}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Input bar */}
                  {!messageRequestStatus && (
                    <footer style={{ padding: "0 12px 16px", flexShrink: 0 }}>
                      {/* Mobile: extra bottom safe area */}
                      {/* Aida suggestions */}
                      {aidaContext && !activeChat?.isGroupChat && !activeChat?.isAidaBot && aidaContext.suggestions.length > 0 && (
                        <div style={{ marginBottom: 8, padding: "0 4px" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                            {aidaContext.suggestions.map((s, i) => (
                              <button key={i} onClick={() => setInputText(s)} style={{ background: "rgba(var(--primary), 0.05)", border: "1px solid rgba(var(--primary), 0.1)", borderRadius: 18, padding: "7px 14px", fontSize: 11, color: "var(--primary)", cursor: "pointer", fontFamily: "'Manrope',sans-serif", backdropFilter: "blur(8px)", transition: "all 0.2s" }}
                                onMouseEnter={e => (e.currentTarget.style.background = "rgba(var(--primary), 0.15)")} onMouseLeave={e => (e.currentTarget.style.background = "rgba(var(--primary), 0.05)")}>{s}</button>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Reply banner */}
                      {replyingToMsg && (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 12px", marginBottom: 8 }}>
                          <div style={{ overflow: "hidden" }}>
                            <span style={{ fontSize: 10, color: "var(--primary)", fontWeight: 700, display: "block" }}>Replying to {replyingToMsg.sender?.full_name || "Someone"}</span>
                            <span style={{ fontSize: 12, color: "var(--foreground)", opacity: 0.7, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260 }}>{replyingToMsg.content || "Media"}</span>
                          </div>
                          <button onClick={() => setReplyingToMsg(null)} style={{ background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer", padding: 4, flexShrink: 0 }}><Icon name="close" size={16} /></button>
                        </div>
                      )}
                      {/* Input row */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 22, padding: "6px 6px 6px 14px", backdropFilter: "blur(12px)" }}>
                        {/* Emoji */}
                        <div style={{ position: "relative" }}>
                          <button onClick={() => setShowEmoji(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", color: showEmoji ? "var(--primary)" : "var(--muted-foreground)", padding: 5, borderRadius: 7, minWidth: 34, minHeight: 34, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="sentiment_satisfied" size={20} /></button>
                          {showEmoji && <EmojiPicker onSelect={(emoji) => setInputText(prev => prev + emoji)} onClose={() => setShowEmoji(false)} />}
                        </div>
                        {/* Attach */}
                        <button onClick={() => fileInputRef.current?.click()} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 5, borderRadius: 7, minWidth: 34, minHeight: 34, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="attach_file" size={20} /></button>
                        <input ref={fileInputRef} type="file" hidden accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt" onChange={handleFileUpload} />
                        {/* Input or recording */}
                        {voice.recording ? (
                          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", animation: "pulse 1s infinite" }} />
                            <span style={{ fontSize: 14, color: "var(--foreground)", fontVariantNumeric: "tabular-nums" }}>{fmtTime(voice.duration)}</span>
                            <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Recording...</span>
                          </div>
                        ) : (
                          <input value={inputText} onChange={(e) => handleTyping(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                            placeholder="Type a message..." style={{ flex: 1, background: "transparent", border: "none", color: "var(--foreground)", outline: "none", fontSize: 14, fontFamily: "'Manrope', sans-serif", minHeight: 32 }} />
                        )}
                        {/* Voice btn */}
                        {!inputText.trim() && (
                          <button onMouseDown={handleVoiceStart} onClick={voice.recording ? handleVoiceSend : undefined} style={{ background: voice.recording ? "rgba(239,68,68,0.2)" : "var(--secondary)", border: voice.recording ? "1px solid rgba(239,68,68,0.4)" : "none", borderRadius: 11, padding: "7px 9px", cursor: "pointer", color: voice.recording ? "#ef4444" : "var(--muted-foreground)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", minWidth: 36, minHeight: 36 }}>
                            <Icon name={voice.recording ? "stop" : "mic"} size={20} />
                          </button>
                        )}
                        {voice.recording && <button onClick={voice.cancel} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 5, flexShrink: 0, display: "flex" }}><Icon name="delete" size={20} /></button>}
                        {(inputText.trim() || voice.recording) && (
                          <button onClick={voice.recording ? handleVoiceSend : handleSend} style={{ background: "var(--primary)", border: "none", borderRadius: 14, padding: "9px 13px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 0 14px rgba(79,70,229,0.25)", minWidth: 40, minHeight: 40 }}>
                            <Icon name="send" size={18} style={{ color: "var(--primary-foreground)" }} />
                          </button>
                        )}
                      </div>
                    </footer>
                  )}
                </>
              )}
            </div>

            {/* ══ PANE 3: Contact Info ════════════════════════════════ */}
            {activeChat && (
              <div className="pane pane-info" style={{ overflowY: "auto" }}>
                {(() => {
                  const other = getOtherUser(activeChat, myId);
                  const artifacts = messages.filter(m => m.mediaUrl && (m.mediaType === "image" || m.mediaType === "video" || m.message_type === "image" || m.message_type === "video"));
                  const resources = messages.filter(m => m.mediaUrl && (m.mediaType === "voice" || m.mediaType === "audio" || m.mediaType === "file" || m.message_type === "voice" || m.message_type === "file"));
                  const actionBtnStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.02)", border: "none", padding: "12px 13px", borderRadius: 12, color: "var(--muted-foreground)", fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "left", transition: "background 0.2s", width: "100%" };
                  return (
                    <div style={{ padding: "24px 20px" }}>
                      {/* Mobile: top spacer */}
                      <div className="md:hidden" style={{ height: 14 }} />
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 24 }}>
                        <Avatar src={other?.avatar} name={getChatDisplayName(activeChat, myId)} size={80} online={other?.isOnline} />
                        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700, color: "var(--foreground)", marginTop: 14, marginBottom: 4 }}>{getChatDisplayName(activeChat, myId)}</h2>
                        {other?.uniqueTag && <span style={{ fontSize: 11, color: "var(--primary)", fontFamily: "monospace" }}>{other.uniqueTag}</span>}
                        {(other?.org_role || other?.organization) && (
                          <div style={{ marginTop: 12, width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: 12, padding: "11px 13px", textAlign: "left" }}>
                            {other?.org_role && <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}><Icon name="badge" size={14} style={{ color: "var(--primary)" }} /><div><span style={{ fontSize: 9, color: "var(--muted-foreground)", textTransform: "uppercase", display: "block" }}>Role</span><span style={{ fontSize: 13, color: "var(--foreground)", fontWeight: 700 }}>{other.org_role}</span></div></div>}
                            {other?.organization && <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Icon name="business" size={14} style={{ color: "var(--muted-foreground)" }} /><div><span style={{ fontSize: 9, color: "var(--muted-foreground)", textTransform: "uppercase", display: "block" }}>Organization</span><span style={{ fontSize: 12, color: "var(--muted-foreground)", fontWeight: 500 }}>{other.organization}</span></div></div>}
                          </div>
                        )}
                        {other?.bio && <p style={{ marginTop: 12, fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.6, textAlign: "left", width: "100%" }}>{other.bio}</p>}
                      </div>
                      {/* Action shortcuts */}
                      <div style={{ display: "flex", justifyContent: "center", gap: 14, marginBottom: 22 }}>
                        {[{ icon: "call", label: "Call", action: () => handleStartCall('voice') }, { icon: "videocam", label: "Video", action: () => handleStartCall('video') }, { icon: "auto_awesome", label: "Summary", action: loadSessionSummary }].map(a => (
                          <div key={a.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                            <button onClick={a.action} style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--secondary)", border: "1px solid var(--border)", cursor: "pointer", color: "var(--muted-foreground)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={a.icon} size={18} /></button>
                            <span style={{ fontSize: 9, color: "var(--muted-foreground)", textTransform: "uppercase" }}>{a.label}</span>
                          </div>
                        ))}
                      </div>
                      {/* Shared media */}
                      {artifacts.length > 0 && (
                        <div style={{ marginBottom: 22 }}>
                          <div style={{ fontSize: 9, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, fontWeight: 700 }}>Media ({artifacts.length})</div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                            {artifacts.slice(0, 9).map((m, i) => (
                              <div key={m.id || m._id || i} onClick={() => setLightboxImg(getSecureMediaUrl(m.mediaUrl) || "")} style={{ aspectRatio: "1/1", borderRadius: 8, overflow: "hidden", background: "rgba(255,255,255,0.05)", cursor: "pointer" }}>
                                {(m.mediaType === "image" || m.message_type === "image") ? <img src={getSecureMediaUrl(m.mediaUrl) || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : <video src={getSecureMediaUrl(m.mediaUrl) || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Actions */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                        <button onClick={() => handleMuteChat(activeChat?.id || activeChat?._id)} style={actionBtnStyle} onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")} onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}><Icon name="notifications_off" size={17} />Mute Notifications</button>
                        <button onClick={() => handleClearChat(activeChat?.id || activeChat?._id)} style={actionBtnStyle} onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")} onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}><Icon name="delete_sweep" size={17} />Clear Chat</button>
                        <button onClick={() => handleBlockUser(other?.id || other?._id)} style={{ ...actionBtnStyle, color: "#ef4444", background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.1)" }}><Icon name="block" size={17} />Block User</button>
                        <button onClick={() => handleReportUser(other?.id || other?._id)} style={{ ...actionBtnStyle, color: "#ef4444", background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.1)" }}><Icon name="report" size={17} />Report</button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}