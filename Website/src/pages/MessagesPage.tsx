import { useState, useEffect, useRef, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import * as api from "@/api";
import {
  initiateSocket,
  getSocket,
  emitSendMessage,
  emitTypingStart,
  emitTypingStop,
  onEvent,
  offEvent,
} from "@/lib/socket-client";
import { toast } from "sonner";

/* ─── Module-level secure media URL proxy helper ──────────────────────────── */
const _BASE_API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
const getSecureMediaUrl = (url?: string | null, proxyType: 'message' | 'story' = 'message'): string | null => {
  if (!url) return null;
  if (url.includes('filebase.com')) {
    const route = proxyType === 'story' ? 'story' : 'message';
    return `${_BASE_API}/${route}/media/proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
};

/* ─── Icon helper ─────────────────────────────────────────────────────────── */
const Icon = ({ name, fill = false, size = 24, style = {} }: any) => (
  <span
    className="material-symbols-outlined"
    style={{
      fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' ${size}`,
      fontSize: size,
      lineHeight: 1,
      ...style,
    }}
  >
    {name}
  </span>
);

/* ─── Avatar fallback ─────────────────────────────────────────────────────── */
const Avatar = ({ src, name, size = 40, online }: any) => (
  <div style={{ position: "relative", flexShrink: 0 }}>
    {src ? (
      <img
        src={src}
        alt={name}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          border: "2px solid rgba(255,215,9,0.3)",
        }}
      />
    ) : (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #001d3d, #0a0a2e)",
          border: "2px solid rgba(255,231,146,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.38,
          fontWeight: 700,
          color: "#ffe792",
          fontFamily: "'Space Grotesk', sans-serif",
        }}
      >
        {(name || "?")[0].toUpperCase()}
      </div>
    )}
    {online !== undefined && (
      <div
        style={{
          position: "absolute",
          bottom: 1,
          right: 1,
          width: size * 0.27,
          height: size * 0.27,
          borderRadius: "50%",
          border: "2px solid #031427",
          background: online ? "#4ade80" : "#475569",
        }}
      />
    )}
  </div>
);

/* ─── Media Components ──────────────────────────────────────────────────────── */
const CustomAudioPlayer = ({ src, duration, isMine }: { src: string; duration?: number; isMine?: boolean }) => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => {
      setProgress((audio.currentTime / (audio.duration || duration || 1)) * 100);
    };
    const onEnded = () => { setPlaying(false); setProgress(0); };
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, [duration]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
    }
  };

  const fmt = (secs: number) => {
    if (!secs || isNaN(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, background: isMine ? "rgba(10,31,61,0.4)" : "rgba(255,255,255,0.05)", padding:"12px 16px", borderRadius:20, minWidth:220 }}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <button onClick={toggle} style={{ width:36, height:36, borderRadius:"50%", background: isMine ? "#ffe792" : "rgba(255,255,255,0.1)", border:"none", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 }}>
        <Icon name={playing ? "pause" : "play_arrow"} size={20} style={{ color: isMine ? "#1a0a00" : "#d8e6ff" }} />
      </button>
      <div style={{ flex:1, display:"flex", flexDirection:"column", gap:6 }}>
        {/* Waveform track */}
        <div style={{ width:"100%", height:24, display:"flex", alignItems:"center", gap:3, cursor:"pointer" }} onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const p = (e.clientX - rect.left) / rect.width;
          if (audioRef.current) audioRef.current.currentTime = p * (audioRef.current.duration || duration || 1);
        }}>
          {Array.from({ length: 24 }).map((_, i) => {
            const isActive = (i / 24) * 100 <= progress;
            return (
              <div key={i} style={{ flex:1, height: Math.max(4, Math.random() * 24), background: isActive ? (isMine ? "#ffe792" : "#a2c2fd") : "rgba(158,172,195,0.3)", borderRadius:2, transition:"background 0.1s" }} />
            );
          })}
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color: isMine ? "rgba(238,238,238,0.7)" : "#9eacc3", fontFamily:"'Space Grotesk',sans-serif", fontVariantNumeric:"tabular-nums" }}>
          <span>{fmt(audioRef.current?.currentTime || 0)}</span>
          <span>{fmt(duration || audioRef.current?.duration || 0)}</span>
        </div>
      </div>
    </div>
  );
};

const ImageLightbox = ({ src, onClose }: { src: string; onClose: () => void }) => (
  <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.9)", backdropFilter:"blur(12px)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:40 }}>
    <button onClick={onClose} style={{ position:"absolute", top:24, right:24, background:"rgba(255,255,255,0.1)", border:"none", borderRadius:"50%", width:44, height:44, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", cursor:"pointer" }}><Icon name="close" size={24} /></button>
    <img src={src} onClick={(e)=>e.stopPropagation()} style={{ maxWidth:"100%", maxHeight:"100%", objectFit:"contain", borderRadius:12, boxShadow:"0 20px 60px rgba(0,0,0,0.5)" }} />
  </div>
);

const EMOJI_CATEGORIES = {
  "Smileys": ["😀","😂","🤣","😊","🥰","😍","😎","🤔","🙄","😴","🤮","🤯","🥳"],
  "Gestures": ["👍","👎","👌","✌️","🤞","🤙","🙌","👏","🤝","🙏","💪","🖕"],
  "Hearts": ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","💕","💖"],
  "Nature": ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷"],
  "Food": ["🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🍈","🍒","🍑","🥭"],
  "Activity": ["⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🥏","🎱","🪀","🏓","🏸"],
};

const EmojiPicker = ({ onSelect, onClose }: { onSelect: (e: string) => void; onClose: () => void }) => {
  const [cat, setCat] = useState<keyof typeof EMOJI_CATEGORIES>("Smileys");
  return (
    <div style={{ position:"absolute", bottom:"100%", left:0, marginBottom:16, width:320, background:"#031427", border:"1px solid rgba(59,73,92,0.3)", borderRadius:16, boxShadow:"0 20px 40px rgba(0,0,0,0.6)", display:"flex", flexDirection:"column", overflow:"hidden", zIndex:99 }}>
      <div style={{ display:"flex", overflowX:"auto", padding:8, gap:4, borderBottom:"1px solid rgba(59,73,92,0.2)" }}>
        {Object.keys(EMOJI_CATEGORIES).map((c) => (
          <button key={c} onClick={(e) => { e.preventDefault(); setCat(c as any); }} style={{ background: cat===c ? "rgba(255,231,146,0.1)" : "transparent", border:"none", padding:"6px 10px", borderRadius:20, color: cat===c ? "#ffe792" : "#9eacc3", fontSize:11, fontFamily:"'Space Grotesk',sans-serif", fontWeight:600, cursor:"pointer", flexShrink:0 }}>{c}</button>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(6, 1fr)", gap:8, padding:16, maxHeight:200, overflowY:"auto" }}>
        {EMOJI_CATEGORIES[cat].map((e) => (
          <button key={e} onClick={(ev) => { ev.preventDefault(); onSelect(e); onClose(); }} style={{ background:"none", border:"none", fontSize:24, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", padding:4, borderRadius:8, transition:"background 0.2s" }} onMouseEnter={(ev) => ev.currentTarget.style.background="rgba(255,255,255,0.05)"} onMouseLeave={(ev) => ev.currentTarget.style.background="transparent"}>{e}</button>
        ))}
      </div>
    </div>
  );
};

/* ─── User Search Modal ───────────────────────────────────────────────────── */
const NewChatModal = ({
  onClose,
  onStartChat,
  currentUserId,
}: {
  onClose: () => void;
  onStartChat: (conv: any) => void;
  currentUserId: string;
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.searchUsers(query);
        setResults((res as any).data || res.users || []);
      } catch {
        toast.error("Search failed");
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const startChat = async (user: any) => {
    setStarting(user.id || user._id);
    try {
      const res = await api.accessOrCreateChat(user.id || user._id);
      onStartChat(res.conversation);
      onClose();
    } catch {
      toast.error("Could not open chat");
    } finally {
      setStarting(null);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(8px)",
        zIndex: 999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 480,
          background: "#031427",
          border: "1px solid rgba(59,73,92,0.3)",
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px 24px 16px",
            borderBottom: "1px solid rgba(59,73,92,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 18,
              fontWeight: 700,
              color: "#ffe792",
              margin: 0,
            }}
          >
            New Transmission
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#9eacc3",
              padding: 4,
            }}
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: "16px 24px" }}>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <Icon
              name="search"
              size={18}
              style={{
                position: "absolute",
                left: 14,
                color: "#9eacc3",
              }}
            />
            <input
              autoFocus
              placeholder="Search by phone number, unique ID, or character code..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: "100%",
                background: "#071a2f",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 12,
                padding: "12px 44px 12px 42px",
                fontSize: 14,
                color: "#d8e6ff",
                outline: "none",
                boxSizing: "border-box",
                fontFamily: "'Manrope', sans-serif",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(255,231,146,0.5)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.06)")}
            />
            <button
              title="Scan character code"
              style={{
                position: "absolute",
                right: 8,
                background: "rgba(255,231,146,0.1)",
                border: "none",
                borderRadius: 8,
                padding: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#ffe792",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,231,146,0.2)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,231,146,0.1)")}
              onClick={() => toast.info("Scanning feature coming soon")}
            >
              <Icon name="qr_code_scanner" size={20} />
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            {["All", "Phone Number", "Unique ID"].map((filter) => (
              <button
                key={filter}
                style={{
                  background: filter === "All" ? "rgba(255,231,146,0.15)" : "transparent",
                  border: filter === "All" ? "1px solid rgba(255,231,146,0.3)" : "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 20,
                  padding: "4px 12px",
                  fontSize: 11,
                  color: filter === "All" ? "#ffe792" : "#9eacc3",
                  cursor: "pointer",
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 340, overflowY: "auto", padding: "0 12px 16px" }}>
          {loading && (
            <div style={{ textAlign: "center", padding: 24, color: "#9eacc3", fontSize: 13 }}>
              Scanning transmissions...
            </div>
          )}
          {!loading && query && results.length === 0 && (
            <div style={{ textAlign: "center", padding: 24, color: "#9eacc3", fontSize: 13 }}>
              No users found for "{query}"
            </div>
          )}
          {!loading && !query && results.length === 0 && (
            <div style={{ textAlign: "center", padding: 24, color: "#9eacc3", fontSize: 13 }}>
              No explorers available on the network
            </div>
          )}
          {results.map((u) => (
            <div
              key={u.id || u._id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "12px 12px",
                borderRadius: 12,
                cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,231,146,0.05)")
              }
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              onClick={() => startChat(u)}
            >
              <Avatar src={u.avatar} name={u.full_name} size={44} online={u.isOnline} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 600,
                    color: "#d8e6ff",
                    fontSize: 14,
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                >
                  {u.full_name || u.username || "Unknown"}
                  {u.verified_badge && (
                    <Icon name="verified" size={14} fill style={{ color: "#ffe792", marginLeft: 4, verticalAlign: "middle" }} />
                  )}
                </div>
                <div style={{ fontSize: 12, color: "#9eacc3", marginTop: 2 }}>
                  {u.uniqueTag || u.email || u.username}
                </div>
              </div>
              {starting === (u.id || u._id) ? (
                <div style={{ fontSize: 12, color: "#ffe792" }}>Opening...</div>
              ) : (
                <Icon name="chevron_right" size={20} style={{ color: "#9eacc3" }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ─── Story Upload Modal ─────────────────────────────────────────────────── */
const STORY_GRADIENTS = [
  "linear-gradient(135deg,#0f0c29,#302b63,#24243e)",
  "linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)",
  "linear-gradient(135deg,#093028,#237a57)",
  "linear-gradient(135deg,#c94b4b,#4b134f)",
  "linear-gradient(135deg,#f7971e,#ffd200)",
  "linear-gradient(135deg,#4facfe,#00f2fe)",
  "linear-gradient(135deg,#43e97b,#38f9d7)",
  "linear-gradient(135deg,#a18cd1,#fbc2eb)",
];

const StoryModal = ({
  onClose,
  onStoryUploaded,
}: {
  onClose: () => void;
  onStoryUploaded: (story: any) => void;
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const audioFileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"media"|"audio"|"text">("media");
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [textContent, setTextContent] = useState("");
  const [bgGradient, setBgGradient] = useState(STORY_GRADIENTS[0]);
  const [textColor, setTextColor] = useState("#ffffff");
  const [uploading, setUploading] = useState(false);
  const voice = useVoiceRecorder();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setFile(f); setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    setUploading(true);
    try {
      let res: any;
      if (tab === "text") {
        if (!textContent.trim()) { toast.error("Add some text first"); setUploading(false); return; }
        res = await api.uploadStory(undefined, textContent, { bg_gradient: bgGradient, text_color: textColor });
      } else {
        if (!file) { toast.error("Select a file first"); setUploading(false); return; }
        res = await api.uploadStory(file, caption || undefined);
      }
      onStoryUploaded(res.story || res);
      toast.success("Signal broadcast! 🚀");
      onClose();
    } catch { toast.error("Story upload failed"); }
    finally { setUploading(false); }
  };

  const canPost = tab === "text" ? textContent.trim().length > 0 : !!file;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", backdropFilter:"blur(16px)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width:480, background:"#031427", border:"1px solid rgba(59,73,92,0.3)", borderRadius:24, overflow:"hidden", boxShadow:"0 40px 100px rgba(0,0,0,0.8)", display:"flex", flexDirection:"column", maxHeight:"90vh" }}>
        {/* Header */}
        <div style={{ padding:"20px 24px 0", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <h2 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:18, fontWeight:700, color:"#ffe792", margin:0 }}>New Signal</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#9eacc3" }}><Icon name="close" size={20} /></button>
        </div>
        {/* Tabs */}
        <div style={{ display:"flex", gap:0, padding:"16px 24px 0", flexShrink:0, borderBottom:"1px solid rgba(59,73,92,0.2)" }}>
          {([["media","photo_camera","Media"],["audio","mic","Audio"],["text","text_fields","Text"]] as const).map(([t,icon,label]) => (
            <button key={t} onClick={() => setTab(t as any)} style={{ flex:1, background:"none", border:"none", borderBottom: tab===t ? "2px solid #ffe792" : "2px solid transparent", padding:"10px 0", cursor:"pointer", color: tab===t ? "#ffe792" : "#68768b", display:"flex", alignItems:"center", justifyContent:"center", gap:6, fontSize:12, fontFamily:"'Space Grotesk',sans-serif", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em", transition:"all 0.2s" }}>
              <Icon name={icon} size={16} />{label}
            </button>
          ))}
        </div>

        <div style={{ padding:24, overflowY:"auto", flex:1 }}>
          {/* Media tab */}
          {tab === "media" && (
            <>
              <div onClick={() => fileRef.current?.click()} style={{ border:"2px dashed rgba(255,231,146,0.2)", borderRadius:16, minHeight:200, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", marginBottom:16, overflow:"hidden", position:"relative" }}>
                {preview ? (
                  file?.type.startsWith("video/") ? <video src={preview} style={{ maxWidth:"100%", maxHeight:220, borderRadius:10 }} controls /> :
                  <img src={preview} style={{ maxWidth:"100%", maxHeight:220, borderRadius:10, objectFit:"cover" }} />
                ) : (
                  <div style={{ textAlign:"center" }}>
                    <Icon name="add_photo_alternate" size={44} style={{ color:"#ffe792", opacity:0.6 }} />
                    <p style={{ color:"#9eacc3", fontSize:13, marginTop:10 }}>Click to select image or video</p>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" hidden accept="image/*,video/*" onChange={handleFile} />
              <input placeholder="Add a caption… (optional)" value={caption} onChange={(e) => setCaption(e.target.value)} style={{ width:"100%", background:"#071a2f", border:"1px solid rgba(255,255,255,0.06)", borderRadius:12, padding:"12px 16px", fontSize:14, color:"#d8e6ff", outline:"none", boxSizing:"border-box", fontFamily:"'Manrope',sans-serif" }} />
            </>
          )}

          {/* Audio tab */}
          {tab === "audio" && (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:20 }}>
              <div style={{ width:"100%", background:"rgba(255,231,146,0.04)", border:"1px solid rgba(255,231,146,0.1)", borderRadius:16, padding:24, display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
                <div style={{ width:72, height:72, borderRadius:"50%", background: voice.recording ? "rgba(239,68,68,0.15)" : "rgba(255,231,146,0.1)", border: voice.recording ? "2px solid rgba(239,68,68,0.5)" : "2px solid rgba(255,231,146,0.3)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", transition:"all 0.2s" }} onClick={voice.recording ? undefined : voice.start}>
                  <Icon name={voice.recording ? "stop" : "mic"} size={32} style={{ color: voice.recording ? "#ef4444" : "#ffe792" }} />
                </div>
                {voice.recording ? (
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:"#ef4444", animation:"pulse 1s infinite" }} />
                    <span style={{ color:"#d8e6ff", fontSize:16, fontVariantNumeric:"tabular-nums", fontFamily:"'Space Grotesk',sans-serif" }}>{fmtTime(voice.duration)}</span>
                    <button onClick={voice.cancel} style={{ background:"none", border:"none", cursor:"pointer", color:"#68768b", fontSize:12 }}>Cancel</button>
                  </div>
                ) : file ? (
                  <div style={{ textAlign:"center" }}>
                    <Icon name="check_circle" size={24} style={{ color:"#4ade80" }} />
                    <p style={{ color:"#9eacc3", fontSize:12, marginTop:4 }}>Ready to broadcast</p>
                  </div>
                ) : (
                  <p style={{ color:"#68768b", fontSize:13 }}>Tap mic to record, or upload an audio file</p>
                )}
                {voice.recording && (
                  <button onClick={async () => { const f = await voice.stop(); if(f) setFile(f); }} style={{ background:"#ffe792", border:"none", borderRadius:40, padding:"8px 20px", fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:13, color:"#1a0a00", cursor:"pointer" }}>Stop & Save</button>
                )}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8, color:"#68768b", fontSize:12 }}>
                <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.06)" }} />or upload a file<div style={{ flex:1, height:1, background:"rgba(255,255,255,0.06)" }} />
              </div>
              <button onClick={() => audioFileRef.current?.click()} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, padding:"10px 20px", color:"#9eacc3", cursor:"pointer", fontSize:13, fontFamily:"'Manrope',sans-serif" }}>
                <Icon name="upload_file" size={16} style={{ verticalAlign:"middle", marginRight:6 }} />Choose audio file
              </button>
              <input ref={audioFileRef} type="file" hidden accept="audio/*" onChange={handleFile} />
            </div>
          )}

          {/* Text tab */}
          {tab === "text" && (
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              {/* Live preview */}
              <div style={{ width:"100%", height:200, borderRadius:16, background:bgGradient, display:"flex", alignItems:"center", justifyContent:"center", padding:20, boxSizing:"border-box" }}>
                <p style={{ color:textColor, fontSize:18, fontWeight:700, textAlign:"center", fontFamily:"'Space Grotesk',sans-serif", wordBreak:"break-word", margin:0, lineHeight:1.4 }}>{textContent || "Your story text appears here..."}</p>
              </div>
              <textarea placeholder="What's on your mind?" value={textContent} onChange={(e) => setTextContent(e.target.value)} rows={3} style={{ background:"#071a2f", border:"1px solid rgba(255,255,255,0.06)", borderRadius:12, padding:"12px 16px", fontSize:14, color:"#d8e6ff", outline:"none", resize:"none", fontFamily:"'Manrope',sans-serif", boxSizing:"border-box", width:"100%" }} />
              <div>
                <p style={{ fontSize:11, color:"#68768b", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>Background</p>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {STORY_GRADIENTS.map((g) => (
                    <div key={g} onClick={() => setBgGradient(g)} style={{ width:32, height:32, borderRadius:8, background:g, cursor:"pointer", border: bgGradient===g ? "2px solid #ffe792" : "2px solid transparent", transition:"border 0.2s" }} />
                  ))}
                </div>
              </div>
              <div style={{ display:"flex", gap:10 }}>
                {["#ffffff","#ffe792","#a2c2fd","#4ade80","#f87171"].map((c) => (
                  <div key={c} onClick={() => setTextColor(c)} style={{ width:28, height:28, borderRadius:"50%", background:c, cursor:"pointer", border: textColor===c ? "3px solid #ffe792" : "3px solid transparent", boxSizing:"border-box" }} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding:"0 24px 24px", flexShrink:0 }}>
          <button onClick={submit} disabled={uploading || !canPost} style={{ width:"100%", background: uploading || !canPost ? "rgba(255,231,146,0.25)" : "linear-gradient(135deg,#ffe792,#ffc300)", color:"#655400", border:"none", borderRadius:14, padding:"14px 0", fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:14, cursor: uploading || !canPost ? "not-allowed" : "pointer", letterSpacing:"0.08em", textTransform:"uppercase", transition:"opacity 0.2s" }}>
            {uploading ? "Transmitting..." : "📡 Broadcast Signal"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── FAB Menu ────────────────────────────────────────────────────────────── */
const FABMenu = ({
  onNewChat,
  onNewStory,
}: {
  onNewChat: () => void;
  onNewStory: () => void;
}) => {
  const [open, setOpen] = useState(false);

  const opts = [
    { icon: "chat", label: "New Chat", action: onNewChat, color: "#ffe792" },
    { icon: "add_photo_alternate", label: "Post Story", action: onNewStory, color: "#a2c2fd" },
  ];

  return (
    <div style={{ position: "relative" }}>
      {/* Option pills */}
      {open && (
        <div
          style={{
            position: "absolute",
            bottom: 56,
            right: 0,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            alignItems: "flex-end",
          }}
        >
          {opts.map((o) => (
            <button
              key={o.label}
              onClick={() => { setOpen(false); o.action(); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "#0b2440",
                border: "1px solid rgba(255,231,146,0.15)",
                borderRadius: 40,
                padding: "10px 16px 10px 12px",
                cursor: "pointer",
                color: o.color,
                fontSize: 13,
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 600,
                whiteSpace: "nowrap",
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                animation: "fadeUp 0.15s ease",
              }}
            >
              <Icon name={o.icon} size={18} style={{ color: o.color }} />
              {o.label}
            </button>
          ))}
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: open
            ? "rgba(255,231,146,0.15)"
            : "linear-gradient(135deg, #ffe792, #ffc300)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: open ? "none" : "0 0 24px rgba(255,215,9,0.4)",
          transition: "all 0.2s ease",
          transform: open ? "rotate(45deg)" : "rotate(0deg)",
        }}
      >
        <Icon name="add" size={22} style={{ color: open ? "#ffe792" : "#1a0a00" }} />
      </button>
    </div>
  );
};

/* ─── Story Viewer Modal ─────────────────────────────────────────────────── */
const StoryViewerModal = ({
  stories,
  initialIndex,
  onClose,
}: {
  stories: any[];
  initialIndex: number;
  onClose: () => void;
}) => {
  const [idx, setIdx] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const onCloseRef = useRef(onClose);
  const storiesLenRef = useRef(stories.length);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => { storiesLenRef.current = stories.length; }, [stories.length]);

  useEffect(() => {
    setProgress(0);
    const DURATION = 5000, TICK = 50;
    const totalTicks = DURATION / TICK;
    let tick = 0;
    const timer = setInterval(() => {
      tick++;
      const pct = Math.min((tick / totalTicks) * 100, 100);
      setProgress(pct);
      if (tick >= totalTicks) {
        clearInterval(timer);
        setIdx((i) => {
          if (i < storiesLenRef.current - 1) return i + 1;
          onCloseRef.current();
          return i;
        });
      }
    }, TICK);
    return () => clearInterval(timer);
  }, [idx]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setIdx((i) => Math.min(i + 1, storiesLenRef.current - 1));
      else if (e.key === 'ArrowLeft') setIdx((i) => Math.max(i - 1, 0));
      else if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!stories[idx]) return null;
  const story = stories[idx];
  const mediaUrl = getSecureMediaUrl(story.mediaUrl, 'story');

  const goNext = () => setIdx((i) => {
    if (i < storiesLenRef.current - 1) return i + 1;
    onCloseRef.current();
    return i;
  });
  const goPrev = () => setIdx((i) => Math.max(i - 1, 0));

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none' }}>
      {/* Progress bar segments */}
      <div style={{ position: 'absolute', top: 12, left: 12, right: 12, display: 'flex', gap: 4, zIndex: 20 }}>
        {stories.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              background: 'rgba(255,255,255,0.9)',
              width: i < idx ? '100%' : i === idx ? `${progress}%` : '0%',
              transition: i === idx ? `width ${50}ms linear` : 'none',
            }} />
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{ position: 'absolute', top: 28, left: 16, right: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', padding: 2, background: 'linear-gradient(135deg, #ffe792, #a2c2fd)', flexShrink: 0 }}>
            <Avatar src={story.author?.avatar} name={story.author?.full_name} size={34} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: "'Space Grotesk', sans-serif", textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}>
              {story.author?.full_name || 'User'}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>
              {story.remainingSeconds != null
                ? `${Math.floor(story.remainingSeconds / 3600)}h left`
                : story.createdAt ? new Date(story.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Space Grotesk',sans-serif" }}>{idx + 1} / {stories.length}</span>
          <button onClick={onCloseRef.current} style={{ background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
            <Icon name="close" size={20} />
          </button>
        </div>
      </div>

      {/* Tap zones (left = prev, right = next) */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: '40%', height: '100%', zIndex: 10, cursor: 'pointer' }} onClick={goPrev} />
      <div style={{ position: 'absolute', right: 0, top: 0, width: '40%', height: '100%', zIndex: 10, cursor: 'pointer' }} onClick={goNext} />

      {/* Story content */}
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {story.mediaType === 'image' && mediaUrl && (
          <img
            src={mediaUrl}
            style={{ maxWidth: '100%', maxHeight: '100vh', objectFit: 'contain' }}
            alt="Story"
            onError={(e) => { (e.target as HTMLImageElement).alt = '⚠ Media unavailable'; }}
          />
        )}
        {story.mediaType === 'video' && mediaUrl && (
          <video src={mediaUrl} autoPlay loop playsInline style={{ maxWidth: '100%', maxHeight: '100vh', objectFit: 'contain' }} />
        )}
        {story.mediaType === 'audio' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, padding: 40, width: '100%' }}>
            <div style={{ width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,231,146,0.08)', border: '2px solid rgba(255,231,146,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse 2s infinite' }}>
              <Icon name="mic" size={36} style={{ color: '#ffe792' }} />
            </div>
            {/* Animated waveform */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {Array.from({ length: 30 }).map((_, i) => (
                <div key={i} style={{
                  width: 3,
                  height: Math.max(8, Math.abs(Math.sin(i * 0.65)) * 36 + 10),
                  borderRadius: 2,
                  background: '#ffe792',
                  opacity: 0.75,
                  animation: `audioWave ${0.45 + (i % 6) * 0.1}s ease-in-out infinite alternate`,
                  animationDelay: `${i * 0.035}s`,
                }} />
              ))}
            </div>
            {mediaUrl && <CustomAudioPlayer src={mediaUrl} isMine={false} />}
          </div>
        )}
        {story.mediaType === 'text' && (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: story.bg_gradient || 'linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)', padding: 40, boxSizing: 'border-box' }}>
            <p style={{ color: story.text_color || '#fff', fontSize: 'clamp(22px,4.5vw,40px)', fontWeight: 700, textAlign: 'center', fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.35, maxWidth: 560, margin: 0, textShadow: '0 2px 16px rgba(0,0,0,0.35)', wordBreak: 'break-word' }}>
              {story.textContent}
            </p>
          </div>
        )}
      </div>

      {/* Caption for media stories */}
      {story.textContent && story.mediaType !== 'text' && (
        <div style={{ position: 'absolute', bottom: 88, left: 24, right: 24, background: 'rgba(0,0,0,0.65)', borderRadius: 14, padding: '12px 16px', backdropFilter: 'blur(10px)', zIndex: 15 }}>
          <p style={{ color: '#fff', fontSize: 14, margin: 0, lineHeight: 1.5 }}>{story.textContent}</p>
        </div>
      )}

      {/* Quick reaction bar */}
      <div style={{ position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8, zIndex: 20, background: 'rgba(0,0,0,0.4)', borderRadius: 40, padding: '8px 16px', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)' }}>
        {['❤️', '😂', '😮', '😢', '👏', '🔥'].map((e) => (
          <button
            key={e}
            onClick={(ev) => { ev.stopPropagation(); toast.success(`You reacted ${e}`); }}
            style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', padding: '2px 4px', borderRadius: 8, transition: 'transform 0.12s' }}
            onMouseEnter={(ev) => { ev.currentTarget.style.transform = 'scale(1.3)'; }}
            onMouseLeave={(ev) => { ev.currentTarget.style.transform = 'scale(1)'; }}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
};

/* ─── Voice Recorder Hook ─────────────────────────────────────────────────── */
const useVoiceRecorder = () => {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch {
      toast.error("Microphone access denied");
    }
  };

  const stop = (): Promise<File | null> =>
    new Promise((resolve) => {
      if (!mediaRef.current) { resolve(null); return; }
      mediaRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
        resolve(file);
      };
      mediaRef.current.stop();
      mediaRef.current.stream.getTracks().forEach((t) => t.stop());
      setRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    });

  const cancel = () => {
    if (mediaRef.current?.state === "recording") {
      mediaRef.current.stop();
      mediaRef.current.stream.getTracks().forEach((t) => t.stop());
    }
    setRecording(false);
    setDuration(0);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  return { recording, duration, start, stop, cancel };
};

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

const getChatDisplayName = (chat: any, myId: string) => {
  if (chat.isGroupChat) return chat.chatName || "Group";
  const other = chat.users?.find((u: any) => (u.id || u._id) !== myId);
  return other?.full_name || other?.username || chat.chatName || "Unknown";
};

const getChatAvatar = (chat: any, myId: string) => {
  if (chat.isGroupChat) return null;
  const other = chat.users?.find((u: any) => (u.id || u._id) !== myId);
  return other?.avatar || null;
};

const getOtherUser = (chat: any, myId: string) => {
  return chat?.users?.find((u: any) => (u.id || u._id) !== myId) || null;
};

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
export default function BubbleMessages() {
  const meRaw = localStorage.getItem("user");
  const me = meRaw ? JSON.parse(meRaw) : null;
  const myId = me?.id || me?._id || "";

  const [chats, setChats] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [typing, setTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const [showNewChat, setShowNewChat] = useState(false);
  const [showStory, setShowStory] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [viewingStory, setViewingStory] = useState<{ stories: any[]; index: number } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeChatRef = useRef<any>(null);

  const voice = useVoiceRecorder();

  /* ── Keep a ref for socket handler purity ─────────────────────────── */
  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);

  /* ── Socket setup ─────────────────────────────────────────────────── */
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    initiateSocket(token);
    const socket = getSocket();
    if (!socket) return;

    const onReceive = (payload: any) => {
      const chat = activeChatRef.current;
      if (chat && payload.chatId === (chat.id || chat._id)) {
        setMessages((prev) => [...prev, payload]);
      }
      // Update latest message preview in list
      setChats((prev) =>
        prev.map((c) =>
          (c.id || c._id) === payload.chatId
            ? { ...c, latestMessage: { content: payload.message, sentAt: new Date().toISOString() } }
            : c
        )
      );
    };

    const onTypingStart = ({ fromUserId }: any) => {
      if (activeChatRef.current) {
        const other = getOtherUser(activeChatRef.current, myId);
        if ((other?.id || other?._id) === fromUserId) setIsTyping(true);
      }
    };
    const onTypingStop = ({ fromUserId }: any) => {
      if (activeChatRef.current) {
        const other = getOtherUser(activeChatRef.current, myId);
        if ((other?.id || other?._id) === fromUserId) setIsTyping(false);
      }
    };
    const onStatus = ({ userId, isOnline }: any) => {
      setChats((prev) =>
        prev.map((c) => ({
          ...c,
          users: c.users?.map((u: any) =>
            (u.id || u._id) === userId ? { ...u, isOnline } : u
          ),
        }))
      );
    };

    onEvent("receive_message", onReceive);
    onEvent("typing_start", onTypingStart);
    onEvent("typing_stop", onTypingStop);
    onEvent("user_status_change", onStatus);

    return () => {
      offEvent("receive_message", onReceive);
      offEvent("typing_start", onTypingStart);
      offEvent("typing_stop", onTypingStop);
      offEvent("user_status_change", onStatus);
    };
  }, [myId]);

  /* ── Load chats + stories ─────────────────────────────────────────── */
  useEffect(() => {
    (async () => {
      try {
        const [chatRes, storyRes] = await Promise.all([
          api.fetchAllUserChats(),
          api.fetchStories(),
        ]);
        setChats(chatRes.conversations || []);
        setStories(storyRes.stories || []);
      } catch (e) {
        console.error("Initial load failed:", e);
      }
    })();
  }, []);

  /* ── Load messages when chat changes ─────────────────────────────── */
  useEffect(() => {
    if (!activeChat) return;
    (async () => {
      try {
        const res = await api.fetchMessages(activeChat.id || activeChat._id);
        const msgs = res.messages || [];
        // Debug: log first media message so we can verify field names
        const mediaMsgs = msgs.filter((m: any) => m.mediaUrl || m.media_url);
        if (mediaMsgs.length > 0) {
          console.log('[Bubble] Media messages sample:', JSON.stringify(mediaMsgs[0], null, 2));
        }
        setMessages(msgs);
      } catch {
        toast.error("Could not load messages");
      }
    })();
  }, [activeChat]);

  /* ── Scroll to bottom ─────────────────────────────────────────────── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Send text message ────────────────────────────────────────────── */
  const handleSend = async () => {
    if (!inputText.trim() || !activeChat) return;
    const text = inputText;
    setInputText("");
    try {
      const res = await api.sendTextMessage(activeChat.id || activeChat._id, text);
      const msg = res.data || res;
      setMessages((prev) => [...prev, msg]);

      // Also fire socket so recipient gets it live
      const other = getOtherUser(activeChat, myId);
      if (other) {
        emitSendMessage({
          toUserId: other.id || other._id,
          message: text,
          fromUserId: myId,
          chatId: activeChat.id || activeChat._id,
        } as any);
      }
    } catch {
      toast.error("Failed to send");
    }
  };

  /* ── Typing indicator ─────────────────────────────────────────────── */
  const handleTyping = (text: string) => {
    setInputText(text);
    const other = getOtherUser(activeChat, myId);
    if (!other) return;
    const otherId = other.id || other._id;
    if (!typing) {
      setTyping(true);
      emitTypingStart(otherId);
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      setTyping(false);
      emitTypingStop(otherId);
    }, 1500);
  };

  /* ── File/media message ───────────────────────────────────────────── */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChat) return;
    e.target.value = "";
    try {
      toast.info("Uploading...");
      const res = await api.sendMediaMessage(activeChat.id || activeChat._id, file);
      const msg = res.data || res;
      setMessages((prev) => [...prev, msg]);
    } catch {
      toast.error("Upload failed");
    }
  };

  /* ── Voice note ───────────────────────────────────────────────────── */
  const handleVoiceSend = async () => {
    if (!activeChat) return;
    const finalDuration = voice.duration;
    const file = await voice.stop();
    if (!file) return;
    try {
      toast.info("Sending voice note...");
      const res = await api.sendMediaMessage(activeChat.id || activeChat._id, file, { media_duration: finalDuration });
      const msg = res.data || res;
      setMessages((prev) => [...prev, msg]);
    } catch {
      toast.error("Voice send failed");
    }
  };

  const handleNewChat = (conv: any) => {
    setChats((prev) => {
      const exists = prev.find((c) => (c.id || c._id) === (conv.id || conv._id));
      return exists ? prev : [conv, ...prev];
    });
    setActiveChat(conv);
  };

  const handleStoryUploaded = (story: any) => {
    setStories((prev) => [story, ...prev]);
  };

  /* ── Render ───────────────────────────────────────────────────────── */
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Manrope:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        rel="stylesheet"
      />
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #010f20; }
        .material-symbols-outlined { user-select: none; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(162,194,253,0.12); border-radius: 10px; }
        input::placeholder, textarea::placeholder { color: rgba(158,172,195,0.4); }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 1; }
        }
        @keyframes audioWave {
          from { transform: scaleY(0.15); }
          to   { transform: scaleY(1); }
        }
      `}</style>

      {/* Modals */}
      {showNewChat && (
        <NewChatModal
          currentUserId={myId}
          onClose={() => setShowNewChat(false)}
          onStartChat={handleNewChat}
        />
      )}
      {showStory && (
        <StoryModal
          onClose={() => setShowStory(false)}
          onStoryUploaded={handleStoryUploaded}
        />
      )}
      {lightboxImg && <ImageLightbox src={lightboxImg} onClose={() => setLightboxImg(null)} />}
      {viewingStory && (
        <StoryViewerModal
          stories={viewingStory.stories}
          initialIndex={viewingStory.index}
          onClose={() => setViewingStory(null)}
        />
      )}

      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          background: "#010f20",
          color: "#d8e6ff",
          fontFamily: "'Manrope', sans-serif",
          overflow: "hidden",
        }}
      >
        <Sidebar />

        <main
          style={{
            marginLeft: 96,
            flex: 1,
            display: "flex",
            height: "100vh",
            overflow: "hidden",
          }}
        >
          {/* ═══ LEFT PANEL — Chat List ═══════════════════════════════ */}
          <section
            style={{
              width: 360,
              display: "flex",
              flexDirection: "column",
              borderRight: "1px solid rgba(59,73,92,0.15)",
              background: "#031427",
              flexShrink: 0,
            }}
          >
            {/* Header */}
            <div style={{ padding: "28px 24px 16px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 20,
                }}
              >
                <h1
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 26,
                    fontWeight: 700,
                    color: "#ffe792",
                    letterSpacing: "-0.02em",
                    margin: 0,
                  }}
                >
                  Transmissions
                </h1>
                <FABMenu
                  onNewChat={() => setShowNewChat(true)}
                  onNewStory={() => setShowStory(true)}
                />
              </div>

              {/* Search */}
              <div style={{ position: "relative", marginBottom: 20 }}>
                <Icon
                  name="search"
                  size={18}
                  style={{
                    position: "absolute",
                    left: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#9eacc3",
                  }}
                />
                <input
                  placeholder="Search transmissions..."
                  style={{
                    width: "100%",
                    background: "#0b2440",
                    border: "1px solid rgba(255,255,255,0.04)",
                    borderRadius: 12,
                    padding: "11px 16px 11px 42px",
                    fontSize: 13,
                    color: "#d8e6ff",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Stories */}
              <div
                style={{
                  display: "flex",
                  gap: 14,
                  overflowX: "auto",
                  paddingBottom: 6,
                }}
              >
                {/* My story bubble */}
                <div
                  onClick={() => setShowStory(true)}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0, cursor: "pointer" }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: "50%",
                      border: "2px dashed rgba(255,231,146,0.4)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(255,231,146,0.05)",
                    }}
                  >
                    <Icon name="add" size={20} style={{ color: "#ffe792" }} />
                  </div>
                  <span style={{ fontSize: 10, color: "#9eacc3", textTransform: "uppercase" }}>Add</span>
                </div>

                {stories.map((s: any, i) => (
                  <div
                    key={s._id || i}
                    onClick={() => setViewingStory({ stories, index: i })}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0, cursor: "pointer" }}
                  >
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: "50%",
                        padding: 2,
                        background: "linear-gradient(135deg, #ffe792, #a2c2fd)",
                      }}
                    >
                      <Avatar src={s.author?.avatar} name={s.author?.full_name} size={44} />
                    </div>
                    <span style={{ fontSize: 10, color: "#9eacc3", maxWidth: 52, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.author?.full_name?.split(" ")[0] || "User"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Conversation list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0 12px 12px" }}>
              {chats.length === 0 && (
                <div style={{ textAlign: "center", padding: "48px 24px", color: "#9eacc3" }}>
                  <Icon name="chat_bubble_outline" size={40} style={{ opacity: 0.3, display: "block", margin: "0 auto 12px" }} />
                  <p style={{ fontSize: 14 }}>No conversations yet.</p>
                  <p style={{ fontSize: 12, marginTop: 6, opacity: 0.7 }}>
                    Tap + to start one.
                  </p>
                </div>
              )}
              {chats.map((c: any) => {
                const name = getChatDisplayName(c, myId);
                const avatar = getChatAvatar(c, myId);
                const other = getOtherUser(c, myId);
                const isActive = (activeChat?.id || activeChat?._id) === (c.id || c._id);
                return (
                  <div
                    key={c.id || c._id}
                    onClick={() => setActiveChat(c)}
                    style={{
                      display: "flex",
                      gap: 14,
                      alignItems: "center",
                      padding: "14px 12px",
                      borderRadius: 14,
                      cursor: "pointer",
                      marginBottom: 2,
                      background: isActive
                        ? "rgba(255,231,146,0.07)"
                        : "transparent",
                      borderLeft: isActive
                        ? "2px solid rgba(255,231,146,0.5)"
                        : "2px solid transparent",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <Avatar src={avatar} name={name} size={46} online={other?.isOnline} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <span
                          style={{
                            fontWeight: 600,
                            color: isActive ? "#ffe792" : "#d8e6ff",
                            fontSize: 14,
                            fontFamily: "'Space Grotesk', sans-serif",
                          }}
                        >
                          {name}
                        </span>
                        {c.latestMessage?.sentAt && (
                          <span style={{ fontSize: 11, color: "#68768b" }}>
                            {new Date(c.latestMessage.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </div>
                      <p
                        style={{
                          fontSize: 12,
                          color: "#9eacc3",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {c.latestMessage?.content ||
                          (c.latestMessage?.message_type === "voice" ? "🎤 Voice note" : null) ||
                          (c.latestMessage?.mediaUrl ? "📎 Attachment" : "No messages yet")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ═══ CENTER — Message Thread ══════════════════════════════ */}
          <section
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              background: "#010f20",
              minWidth: 0,
            }}
          >
            {!activeChat ? (
              /* Empty state */
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 16,
                  color: "#9eacc3",
                  padding: 40,
                }}
              >
                <Icon name="chat_bubble_outline" size={64} style={{ opacity: 0.15 }} />
                <h2
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 22,
                    fontWeight: 600,
                    color: "#d8e6ff",
                    opacity: 0.4,
                  }}
                >
                  Select a transmission
                </h2>
                <p style={{ fontSize: 14, opacity: 0.5 }}>
                  Choose from the list or start a new chat
                </p>
                <button
                  onClick={() => setShowNewChat(true)}
                  style={{
                    marginTop: 8,
                    background: "#ffe792",
                    color: "#655400",
                    border: "none",
                    borderRadius: 40,
                    padding: "12px 24px",
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  + New Transmission
                </button>
              </div>
            ) : (
              <>
                {/* Header */}
                <header
                  style={{
                    height: 76,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 28px",
                    background: "rgba(3,20,39,0.85)",
                    backdropFilter: "blur(20px)",
                    borderBottom: "1px solid rgba(59,73,92,0.15)",
                    flexShrink: 0,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <Avatar
                      src={getChatAvatar(activeChat, myId)}
                      name={getChatDisplayName(activeChat, myId)}
                      size={42}
                      online={getOtherUser(activeChat, myId)?.isOnline}
                    />
                    <div>
                      <h2
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          fontFamily: "'Space Grotesk', sans-serif",
                          color: "#d8e6ff",
                          margin: 0,
                        }}
                      >
                        {getChatDisplayName(activeChat, myId)}
                      </h2>
                      <span style={{ fontSize: 11, color: "#ffe792", letterSpacing: "0.08em" }}>
                        {isTyping
                          ? "transmitting..."
                          : getOtherUser(activeChat, myId)?.isOnline
                            ? "Online"
                            : (getOtherUser(activeChat, myId) as any)?.lastSeen
                              ? `Last seen ${new Date((getOtherUser(activeChat, myId) as any).lastSeen).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                              : "Offline"}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[{ name: "call" }, { name: "videocam" }, { name: "info" }].map((btn) => (
                      <button
                        key={btn.name}
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "none",
                          borderRadius: 10,
                          padding: "8px 10px",
                          cursor: "pointer",
                          color: "#9eacc3",
                        }}
                      >
                        <Icon name={btn.name} size={20} />
                      </button>
                    ))}
                  </div>
                </header>

                {/* Messages */}
                <div
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "24px 28px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  {messages.length === 0 && (
                    <div style={{ textAlign: "center", color: "#9eacc3", opacity: 0.5, marginTop: 40, fontSize: 13 }}>
                      No messages yet. Say hello! 👋
                    </div>
                  )}
                  {messages.map((msg: any, i) => {
                    const senderId = msg.sender?.id || msg.sender?._id || msg.fromUserId;
                    const isMine = senderId === myId;

                    // Normalize media fields — handle every possible shape the backend/socket may send
                    const rawUrl = msg.mediaUrl || msg.media_url || null;
                    const resolvedUrl: string | null = getSecureMediaUrl(rawUrl);
                    
                    const resolvedType: string =
                      msg.mediaType ||
                      msg.message_type ||
                      msg.type ||
                      "text";

                    const isImage = resolvedUrl && (resolvedType === "image" || msg.mimeType?.startsWith("image/"));
                    const isVideo = resolvedUrl && (resolvedType === "video" || msg.mimeType?.startsWith("video/"));
                    const isVoice = resolvedUrl && (resolvedType === "voice" || resolvedType === "audio" || msg.mimeType?.startsWith("audio/"));
                    const isFile  = resolvedUrl && !isImage && !isVideo && !isVoice;

                    return (
                      <div
                        key={msg._id || msg.id || i}
                        style={{
                          display: "flex",
                          justifyContent: isMine ? "flex-end" : "flex-start",
                          marginBottom: 8,
                        }}
                      >
                        {!isMine && (
                          <Avatar
                            src={msg.sender?.avatar}
                            name={msg.sender?.full_name}
                            size={32}
                            style={{ marginRight: 10, alignSelf: "flex-end" }}
                          />
                        )}
                        <div
                          style={{
                            maxWidth: "65%",
                            background: isMine
                              ? "linear-gradient(135deg, #ffd709, #ffe792)"
                              : "rgba(11,36,64,0.8)",
                            padding: "10px 16px",
                            borderRadius: isMine
                              ? "18px 18px 4px 18px"
                              : "18px 18px 18px 4px",
                            border: isMine ? "none" : "1px solid rgba(59,73,92,0.2)",
                          }}
                        >
                          {/* Text content */}
                          {msg.content && (
                            <p
                              style={{
                                fontSize: 14,
                                color: isMine ? "#1a0a00" : "#d8e6ff",
                                lineHeight: 1.5,
                                margin: 0,
                              }}
                            >
                              {msg.content}
                            </p>
                          )}

                          {/* Image */}
                          {isImage && (
                            <img
                              src={resolvedUrl!}
                              style={{
                                maxWidth: "100%",
                                borderRadius: 10,
                                marginTop: msg.content ? 8 : 0,
                                display: "block",
                                cursor: "pointer",
                              }}
                              alt="Shared image"
                              onClick={() => setLightboxImg(resolvedUrl!)}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                                console.warn("[Bubble] Image failed to load:", resolvedUrl);
                              }}
                            />
                          )}

                          {/* Video */}
                          {isVideo && (
                            <video
                              src={resolvedUrl!}
                              controls
                              style={{
                                maxWidth: "100%",
                                borderRadius: 10,
                                marginTop: msg.content ? 8 : 0,
                                display: "block",
                              }}
                            />
                          )}

                          {/* Voice note / Audio */}
                          {isVoice && (
                            <div style={{ marginTop: msg.content ? 8 : 0 }}>
                              <CustomAudioPlayer 
                                src={resolvedUrl!} 
                                duration={msg.media_metadata?.duration} 
                                isMine={isMine} 
                              />
                            </div>
                          )}

                          {/* Generic file attachment */}
                          {isFile && (
                            <a
                              href={resolvedUrl!}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                color: isMine ? "#1a0a00" : "#ffe792",
                                fontSize: 13,
                                marginTop: msg.content ? 8 : 0,
                                textDecoration: "none",
                                background: isMine ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.06)",
                                borderRadius: 8,
                                padding: "6px 10px",
                              }}
                            >
                              <Icon name="attach_file" size={16} />
                              Download attachment
                            </a>
                          )}

                          {/* Timestamp + read receipt */}
                          <span
                            style={{
                              fontSize: 10,
                              color: isMine ? "rgba(26,10,0,0.5)" : "#68768b",
                              display: "flex",
                              justifyContent: "flex-end",
                              alignItems: "center",
                              gap: 4,
                              marginTop: 4,
                            }}
                          >
                            {new Date(msg.sentAt || msg.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            {isMine && (
                              <Icon
                                name={msg.isRead ? "done_all" : "done"}
                                size={14}
                                style={{ color: msg.isRead ? "#0496ff" : "rgba(26,10,0,0.5)" }}
                              />
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input bar */}
                <footer style={{ padding: "0 20px 20px", flexShrink: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      background: "rgba(11,36,64,0.6)",
                      border: "1px solid rgba(59,73,92,0.2)",
                      borderRadius: 20,
                      padding: "8px 8px 8px 16px",
                      backdropFilter: "blur(12px)",
                    }}
                  >
                    {/* Emoji Picker */}
                    <div style={{ position: "relative" }}>
                      <button
                        onClick={() => setShowEmoji((v) => !v)}
                        style={{
                          background: "none", border: "none", cursor: "pointer", 
                          color: showEmoji ? "#ffe792" : "#9eacc3",
                          padding: 6, borderRadius: 8, flexShrink: 0, transition: "color 0.15s"
                        }}
                        title="Emoji"
                      >
                        <Icon name="sentiment_satisfied" size={20} />
                      </button>
                      {showEmoji && (
                        <EmojiPicker
                          onSelect={(emoji) => setInputText((prev) => prev + emoji)}
                          onClose={() => setShowEmoji(false)}
                        />
                      )}
                    </div>

                    {/* Attachment */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#9eacc3",
                        padding: 6,
                        borderRadius: 8,
                        transition: "color 0.15s",
                        flexShrink: 0,
                      }}
                      title="Attach file or image"
                    >
                      <Icon name="attach_file" size={20} />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      hidden
                      accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                      onChange={handleFileUpload}
                    />

                    {/* Text input or voice UI */}
                    {voice.recording ? (
                      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12 }}>
                        <div
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            background: "#ef4444",
                            animation: "pulse 1s infinite",
                          }}
                        />
                        <span style={{ fontSize: 14, color: "#d8e6ff", fontVariantNumeric: "tabular-nums" }}>
                          {fmtTime(voice.duration)}
                        </span>
                        <span style={{ fontSize: 12, color: "#9eacc3" }}>Recording...</span>
                      </div>
                    ) : (
                      <input
                        value={inputText}
                        onChange={(e) => handleTyping(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                        placeholder="Type a transmission..."
                        style={{
                          flex: 1,
                          background: "transparent",
                          border: "none",
                          color: "#d8e6ff",
                          outline: "none",
                          fontSize: 14,
                          fontFamily: "'Manrope', sans-serif",
                        }}
                      />
                    )}

                    {/* Voice note button */}
                    {!inputText.trim() && (
                      <button
                        onMouseDown={voice.start}
                        onClick={voice.recording ? handleVoiceSend : undefined}
                        title={voice.recording ? "Stop & send" : "Hold for voice note"}
                        style={{
                          background: voice.recording
                            ? "rgba(239,68,68,0.2)"
                            : "rgba(255,255,255,0.05)",
                          border: voice.recording
                            ? "1px solid rgba(239,68,68,0.4)"
                            : "none",
                          borderRadius: 12,
                          padding: "8px 10px",
                          cursor: "pointer",
                          color: voice.recording ? "#ef4444" : "#9eacc3",
                          flexShrink: 0,
                          transition: "all 0.15s",
                        }}
                      >
                        <Icon name={voice.recording ? "stop" : "mic"} size={20} />
                      </button>
                    )}

                    {/* Cancel voice */}
                    {voice.recording && (
                      <button
                        onClick={voice.cancel}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#9eacc3",
                          padding: 6,
                          flexShrink: 0,
                        }}
                      >
                        <Icon name="delete" size={20} />
                      </button>
                    )}

                    {/* Send */}
                    {(inputText.trim() || voice.recording) && (
                      <button
                        onClick={voice.recording ? handleVoiceSend : handleSend}
                        style={{
                          background: "linear-gradient(135deg, #ffe792, #ffc300)",
                          border: "none",
                          borderRadius: 14,
                          padding: "10px 14px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          boxShadow: "0 0 16px rgba(255,215,9,0.3)",
                        }}
                      >
                        <Icon name="send" size={18} style={{ color: "#1a0a00" }} />
                      </button>
                    )}
                  </div>
                </footer>
              </>
            )}
          </section>

          {/* ═══ RIGHT PANEL — Profile ════════════════════════════════ */}
          {activeChat && (
            <section
              style={{
                width: 300,
                background: "#031427",
                borderLeft: "1px solid rgba(59,73,92,0.15)",
                display: "flex",
                flexDirection: "column",
                padding: "32px 24px",
                overflowY: "auto",
                flexShrink: 0,
              }}
            >
              {(() => {
                const other = getOtherUser(activeChat, myId);
                const artifacts = messages.filter((m) => m.mediaUrl && (m.mediaType === "image" || m.mediaType === "video" || m.message_type === "image" || m.message_type === "video"));
                const resources = messages.filter((m) => m.mediaUrl && (m.mediaType === "voice" || m.mediaType === "audio" || m.mediaType === "file" || m.message_type === "voice" || m.message_type === "file"));

                const actionBtnStyle = {
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: "rgba(255,255,255,0.02)",
                  border: "none",
                  padding: "12px 14px",
                  borderRadius: 12,
                  color: "#9eacc3",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  textAlign: "left" as const,
                  transition: "background 0.2s",
                };

                return (
                  <>
                    <div style={{ textAlign: "center", marginBottom: 28 }}>
                      <Avatar
                        src={other?.avatar}
                        name={getChatDisplayName(activeChat, myId)}
                        size={84}
                        online={other?.isOnline}
                      />
                      <h2
                        style={{
                          fontFamily: "'Space Grotesk', sans-serif",
                          fontSize: 16,
                          fontWeight: 700,
                          color: "#d8e6ff",
                          marginTop: 16,
                          marginBottom: 4,
                        }}
                      >
                        {getChatDisplayName(activeChat, myId)}
                      </h2>
                      {other?.uniqueTag && (
                        <span style={{ fontSize: 12, color: "#ffe792", fontFamily: "monospace" }}>
                          {other.uniqueTag}
                        </span>
                      )}
                      {other?.bio && (
                        <div style={{ marginTop: 20, padding: "0 10px" }}>
                          <h3 style={{ fontSize: 10, color: "#68768b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Bio</h3>
                          <p style={{ fontSize: 13, color: "#9eacc3", lineHeight: 1.6, margin: 0 }}>
                            {other.bio}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Quick actions */}
                    <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 28 }}>
                      {[
                        { icon: "call", label: "Call" },
                        { icon: "videocam", label: "Video" },
                        { icon: "search", label: "Search" },
                      ].map((a) => (
                        <div
                          key={a.label}
                          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
                        >
                          <button
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: "50%",
                              background: "rgba(255,255,255,0.04)",
                              border: "1px solid rgba(255,255,255,0.06)",
                              cursor: "pointer",
                              color: "#9eacc3",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Icon name={a.icon} size={18} />
                          </button>
                          <span style={{ fontSize: 10, color: "#68768b", textTransform: "uppercase" }}>
                            {a.label}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Info rows */}
                    {other?.status_message && (
                      <div
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          borderRadius: 12,
                          padding: "12px 14px",
                          marginBottom: 10,
                        }}
                      >
                        <div style={{ fontSize: 10, color: "#68768b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
                          Status
                        </div>
                        <div style={{ fontSize: 13, color: "#d8e6ff" }}>{other.status_message}</div>
                      </div>
                    )}
                    {other?.isOnline !== undefined && (
                      <div
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          borderRadius: 12,
                          padding: "12px 14px",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: other.isOnline ? "#4ade80" : "#475569",
                          }}
                        />
                        <span style={{ fontSize: 13, color: "#d8e6ff" }}>
                          {other.isOnline ? "Active now" : "Offline"}
                        </span>
                      </div>
                    )}

                    {/* Shared Artifacts */}
                    <div style={{ marginTop: 28 }}>
                      <div style={{ fontSize: 10, color: "#68768b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
                        Shared Artifacts ({artifacts.length})
                      </div>
                      {artifacts.length > 0 ? (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                          {artifacts.slice(0, 9).map((m, i) => (
                            <a
                              key={m.id || m._id || i}
                              href={getSecureMediaUrl(m.mediaUrl) || ""}
                              target="_blank"
                              rel="noreferrer"
                              style={{ aspectRatio: "1/1", borderRadius: 8, overflow: "hidden", background: "rgba(255,255,255,0.05)", display: "block" }}
                            >
                              {m.mediaType === "image" || m.message_type === "image" ? (
                                <img src={getSecureMediaUrl(m.mediaUrl) || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="Shared image artifact" />
                              ) : (
                                <video src={getSecureMediaUrl(m.mediaUrl) || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              )}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: 13, color: "rgba(216,230,255,0.3)", fontStyle: "italic", padding: "8px 0" }}>
                          0 Shared artifacts
                        </div>
                      )}
                    </div>

                    {/* Shared Resources */}
                    <div style={{ marginTop: 28 }}>
                      <div style={{ fontSize: 10, color: "#68768b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
                        Shared Resources ({resources.length})
                      </div>
                      {resources.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {resources.map((m, i) => (
                            <a
                              key={m.id || m._id || i}
                              href={getSecureMediaUrl(m.mediaUrl) || ""}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: "flex", alignItems: "center", gap: 12,
                                background: "rgba(255,255,255,0.03)",
                                padding: "10px 14px",
                                borderRadius: 12,
                                textDecoration: "none"
                              }}
                            >
                              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,231,146,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffe792", flexShrink: 0 }}>
                                <Icon name={(m.mediaType === "voice" || m.mediaType === "audio" || m.message_type === "voice") ? "mic" : "insert_drive_file"} size={18} />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, color: "#d8e6ff", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {(m.mediaType === "voice" || m.mediaType === "audio" || m.message_type === "voice") ? "Voice Note" : "Document File"}
                                </div>
                                <div style={{ fontSize: 11, color: "#68768b", marginTop: 2 }}>
                                  {new Date(m.sentAt || m.createdAt || Date.now()).toLocaleDateString()}
                                </div>
                              </div>
                            </a>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: 13, color: "rgba(216,230,255,0.3)", fontStyle: "italic", padding: "8px 0" }}>
                          0 Shared resources
                        </div>
                      )}
                    </div>

                    {/* Admin Actions */}
                    <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 8 }}>
                      <button style={actionBtnStyle}>
                        <Icon name="notifications_off" size={18} />
                        Mute Notifications
                      </button>
                      <button style={actionBtnStyle}>
                        <Icon name="delete_sweep" size={18} />
                        Clear Chat
                      </button>
                      <button style={{ ...actionBtnStyle, color: "#ef4444", background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.1)" }}>
                        <Icon name="block" size={18} />
                        Block User
                      </button>
                      <button style={{ ...actionBtnStyle, color: "#ef4444", background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.1)" }}>
                        <Icon name="report" size={18} />
                        Report
                      </button>
                    </div>
                  </>
                );
              })()}
            </section>
          )}
        </main>
      </div>
    </>
  );
}