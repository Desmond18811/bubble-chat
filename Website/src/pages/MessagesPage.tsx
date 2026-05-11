import { useState, useEffect, useRef, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import * as api from "@/api";
import {
  fetchChats,
  searchUsers as apiSearchUsers,
  fetchMessages,
  sendMessage,
  markMessagesAsRead,
  fetchUserProfile,
  updateMessage,
  deleteMessageForMe,
  deleteMessageForEveryone,
  reactToMessage,
  createGroupChat,
  toggleMessagePin,
  addContact,
  fetchConversationContext,
} from "@/api";

// New API functions for message requests
const BASE = (import.meta.env.VITE_API_URL?.replace(/ i$/, '')?.trim()) || 'http://localhost:3000/api/v1';
const token = () => localStorage.getItem('access_token') || '';

async function checkCanMessage(userId: string) {
  const res = await fetch(`${BASE}/messages/can-message/${userId}`, { headers: { Authorization: `Bearer ${token()}` } });
  return res.json();
}
async function sendRequest(userId: string) {
  const res = await fetch(`${BASE}/messages/request/${userId}`, { method: 'POST', headers: { Authorization: `Bearer ${token()}` } });
  return res.json();
}
import {
  initiateSocket,
  getSocket,
  emitSendMessage,
  emitTypingStart,
  emitTypingStop,
  emitJoinRoom,
  emitLeaveRoom,
  emitRecordingStart,
  emitRecordingStop,
  onEvent,
  offEvent,
} from "@/lib/socket-client";
import { toast } from "sonner";
import ReactEmojiPicker, { Theme } from "emoji-picker-react";
import { generateKeyPair, exportPrivateKey, exportPublicKey } from "@/lib/crypto";
import { useNavigate } from "react-router-dom";

import { getSecureMediaUrl } from "@/lib/utils";

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
const Avatar = ({ src, name, size = 40, online }: any) => {
  const safeSrc = getSecureMediaUrl(src) || src;
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      {safeSrc ? (
        <img
          src={safeSrc}
          alt={name}
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            objectFit: "cover",
            border: "2px solid var(--th-accent)",
            opacity: 0.9,
          }}
        />
      ) : (
        <div
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--th-bg), var(--th-surface))",
            border: "2px solid var(--th-accent-text)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: size * 0.38,
            fontWeight: 700,
            color: "var(--th-accent)",
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
            border: "2px solid var(--th-bg)",
            background: online ? "#4ade80" : "var(--th-muted)",
          }}
        />
      )}
    </div>
  );
};

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
    <div style={{ display: "flex", alignItems: "center", gap: 12, background: "transparent", padding: "4px 0", minWidth: 220, maxWidth: 320 }}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <button onClick={toggle} style={{ width: 36, height: 36, borderRadius: "50%", background: isMine ? "#ffe792" : "rgba(255,255,255,0.1)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
        <Icon name={playing ? "pause" : "play_arrow"} size={20} style={{ color: isMine ? "#1a0a00" : "#d8e6ff" }} />
      </button>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        {/* Waveform track */}
        <div style={{ width: "100%", height: 24, display: "flex", alignItems: "center", gap: 3, cursor: "pointer" }} onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const p = (e.clientX - rect.left) / rect.width;
          if (audioRef.current) audioRef.current.currentTime = p * (audioRef.current.duration || duration || 1);
        }}>
          {Array.from({ length: 30 }).map((_, i) => {
            const isActive = (i / 30) * 100 <= progress;
            const h = Math.max(6, Math.abs(Math.sin(i * 0.65)) * 18 + 4);
            return (
              <div key={i} style={{ flex: 1, height: h, background: isActive ? (isMine ? "#ffe792" : "#a2c2fd") : "rgba(158,172,195,0.3)", borderRadius: 2, transition: "background 0.1s" }} />
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: isMine ? "rgba(238,238,238,0.7)" : "#9eacc3", fontFamily: "'Space Grotesk',sans-serif", fontVariantNumeric: "tabular-nums" }}>
          <span>{fmt(audioRef.current?.currentTime || 0)}</span>
          <span>{fmt(duration || audioRef.current?.duration || 0)}</span>
        </div>
      </div>
    </div>
  );
};

const ImageLightbox = ({ src, onClose }: { src: string; onClose: () => void }) => (
  <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", backdropFilter: "blur(12px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
    <button onClick={onClose} style={{ position: "absolute", top: 24, right: 24, background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer" }}><Icon name="close" size={24} /></button>
    <img src={src} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 12, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }} />
  </div>
);

/* ── Stickers Data ─────────────────────────────────────────────────── */
const STICKER_PACKS = [
  {
    name: "Classic",
    stickers: [
      "https://cdn-icons-png.flaticon.com/512/3241/3241461.png",
      "https://cdn-icons-png.flaticon.com/512/3241/3241457.png",
      "https://cdn-icons-png.flaticon.com/512/3241/3241444.png",
      "https://cdn-icons-png.flaticon.com/512/3241/3241434.png",
    ]
  },
  {
    name: "Astra",
    stickers: [
      "https://cdn-icons-png.flaticon.com/512/3665/3665910.png",
      "https://cdn-icons-png.flaticon.com/512/3665/3665913.png",
      "https://cdn-icons-png.flaticon.com/512/3665/3665917.png",
      "https://cdn-icons-png.flaticon.com/512/3665/3665920.png",
    ]
  }
];

const StickerPicker = ({ onSelect, onClose }: { onSelect: (url: string) => void; onClose: () => void }) => (
  <div style={{
    position: "absolute", bottom: "100%", right: 50, marginBottom: 16, zIndex: 999,
    background: "#031427", border: "1px solid rgba(255,231,146,0.2)", borderRadius: 16,
    width: 300, height: 350, overflow: "hidden", display: "flex", flexDirection: "column",
    boxShadow: "0 24px 60px rgba(0,0,0,0.8)", backdropFilter: "blur(20px)"
  }}>
    <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#ffe792", letterSpacing: "0.05em" }}>STICKERS</span>
      <button onClick={onClose} style={{ background: "none", border: "none", color: "#68768b", cursor: "pointer" }}><Icon name="close" size={18} /></button>
    </div>
    <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
      {STICKER_PACKS.flatMap(p => p.stickers).map((url, idx) => (
        <img
          key={idx} src={url}
          onClick={() => { onSelect(url); onClose(); }}
          style={{ width: "100%", height: "auto", cursor: "pointer", transition: "transform 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
        />
      ))}
    </div>
  </div>
);

/* ─── EmojiPicker with outside-click-only close ──────────────────────────── */
const EmojiPicker = ({
  onSelect,
  onClose,
  direction = "up",
}: {
  onSelect: (e: string) => void;
  onClose: () => void;
  direction?: "up" | "down";
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  /* Close only on clicks that land outside this picker */
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Use capture so we catch it before anything else; slight delay so the
    // button that opened the picker doesn't immediately close it.
    const id = setTimeout(() => {
      document.addEventListener("pointerdown", handlePointerDown, true);
    }, 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [onClose]);

  const positionStyles: React.CSSProperties =
    direction === "up"
      ? { bottom: "100%", marginBottom: 16 }
      : { top: "100%", marginTop: 16 };

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        left: 0,
        zIndex: 999,
        boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.1)",
        ...positionStyles,
      }}
    >
      <ReactEmojiPicker
        theme={Theme.DARK}
        searchDisabled
        skinTonesDisabled
        width={320}
        height={400}
        onEmojiClick={(emojiData) => {
          onSelect(emojiData.emoji);
          onClose();
        }}
      />
    </div>
  );
};

/* ─── User Search Modal ───────────────────────────────────────────────────── */
const NewChatModal = ({
  onClose,
  onStartChat,
  currentUserId,
  recentChats = []
}: {
  onClose: () => void;
  onStartChat: (conv: any) => void;
  currentUserId: string;
  recentChats?: any[];
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);

  // Extract recent contacts from conversation list
  const recentContacts = recentChats.map(c => {
    const other = c.users?.find((u: any) => (u.id || u._id) !== currentUserId);
    return other ? { ...other, chatId: c.id || c._id } : null;
  }).filter(Boolean);

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
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 440, background: "var(--th-surface-low)", border: "1px solid var(--th-border)", borderRadius: 24, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 40px 100px rgba(0,0,0,0.6)" }} className="glass">
        {/* Header */}
        <div style={{ padding: "24px 28px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--th-accent)", margin: 0 }}>
            New Transmission
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--th-muted)",
              padding: 4,
            }}
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: "0 24px 16px" }}>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <Icon
              name="search"
              size={18}
              style={{
                position: "absolute",
                left: 14,
                color: "var(--th-muted)",
              }}
            />
            <input
              autoFocus
              placeholder="Search explorers..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: "100%",
                background: "var(--th-surface-top)",
                border: "1px solid var(--th-border)",
                borderRadius: 14,
                padding: "12px 44px 12px 42px",
                fontSize: 14,
                color: "var(--th-text)",
                outline: "none",
                boxSizing: "border-box",
                fontFamily: "'Manrope', sans-serif",
                transition: "border-color 0.2s",
              }}
            />
          </div>
        </div>

        {/* Results / Recents */}
        <div style={{ maxHeight: 400, overflowY: "auto", padding: "0 12px 24px" }} className="scrollbar-thin">
          {!query && recentContacts.length > 0 && (
            <div style={{ padding: "0 12px 12px" }}>
              <div style={{ fontSize: 10, color: "var(--th-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, fontWeight: 700 }}>
                Recent Recruits
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {recentContacts.slice(0, 5).map((u: any) => (
                  <div
                    key={u.id || u._id}
                    onClick={() => startChat(u)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 12px",
                      borderRadius: 12,
                      cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <Avatar src={u.avatar} name={u.full_name} size={36} online={u.isOnline} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: "var(--th-text)", fontSize: 13, fontFamily: "'Space Grotesk', sans-serif" }}>
                        {u.full_name || u.username}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--th-muted)" }}>{u.uniqueTag || "@explorer"}</div>
                    </div>
                    <Icon name="history" size={16} style={{ color: "var(--th-muted)", opacity: 0.5 }} />
                  </div>
                ))}
              </div>
              <div style={{ height: 1, background: "var(--th-border)", margin: "16px 12px 16px" }} />
              <div style={{ fontSize: 10, color: "var(--th-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, fontWeight: 700 }}>
                Organization Network
              </div>
            </div>
          )}

          {loading && (
            <div style={{ textAlign: "center", padding: 24, color: "var(--th-muted)", fontSize: 13 }}>
              Scanning transmissions...
            </div>
          )}
          {!loading && query && results.length === 0 && (
            <div style={{ textAlign: "center", padding: 24, color: "var(--th-muted)", fontSize: 13 }}>
              No explorers found for "{query}"
            </div>
          )}
          {!loading && !query && recentContacts.length === 0 && results.length === 0 && (
            <div style={{ textAlign: "center", padding: 24, color: "var(--th-muted)", fontSize: 13 }}>
              No colleagues found in your organization
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
                    color: "var(--th-text)",
                    fontSize: 14,
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                >
                  {u.full_name || u.username || "Unknown"}
                  {u.verified_badge && (
                    <Icon name="verified" size={14} fill style={{ color: "var(--th-accent)", marginLeft: 4, verticalAlign: "middle" }} />
                  )}
                </div>
                <div style={{ fontSize: 12, color: "var(--th-muted)", marginTop: 2 }}>
                  {u.uniqueTag || u.email || u.username}
                </div>
              </div>
              {starting === (u.id || u._id) ? (
                <div style={{ fontSize: 12, color: "var(--th-accent)" }}>Opening...</div>
              ) : (
                <Icon name="chevron_right" size={20} style={{ color: "var(--th-muted)" }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const NewGroupModal = ({ onClose, onStartGroup, currentUserId }: { onClose: () => void; onStartGroup: (conv: any) => void; currentUserId: string; }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [groupName, setGroupName] = useState("");
  const [creating, setCreating] = useState(false);

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

  const toggleUser = (u: any) => {
    const userId = u.id || u._id;
    if (selectedUsers.some(x => (x.id || x._id) === userId)) {
      setSelectedUsers(prev => prev.filter(x => (x.id || x._id) !== userId));
    } else {
      setSelectedUsers(prev => [...prev, u]);
    }
  };

  const createGroup = async () => {
    if (!groupName.trim()) return toast.error("Group name required");
    if (selectedUsers.length < 1) return toast.error("Select at least 1 user");
    setCreating(true);
    try {
      const usersIds = selectedUsers.map(u => u.id || u._id);
      const res = await api.createGroupChat(groupName, usersIds);
      onStartGroup((res as any).conversation || (res as any).group || res);
      onClose();
    } catch {
      toast.error("Failed to create group");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 480, background: "var(--th-surface-low)", border: "1px solid var(--th-border)", borderRadius: 24, overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "80vh", boxShadow: "0 40px 100px rgba(0,0,0,0.6)" }} className="glass">
        {/* Header */}
        <div style={{ padding: "24px 28px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: "var(--th-accent)", margin: 0 }}>New Group</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--th-muted)", padding: 4 }}><Icon name="close" size={20} /></button>
        </div>

        {/* Selected Users / Group Name */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--th-border)" }}>
          <input
            placeholder="Enter Group Name..."
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            style={{ width: "100%", background: "var(--th-surface-top)", border: "1px solid var(--th-border)", borderRadius: 12, padding: "12px", fontSize: 14, color: "var(--th-text)", outline: "none", boxSizing: "border-box", fontFamily: "'Manrope', sans-serif", marginBottom: 12 }}
          />
          {selectedUsers.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {selectedUsers.map(u => (
                <div key={u.id || u._id} style={{ display: "flex", alignItems: "center", gap: 6, background: "color-mix(in srgb, var(--th-accent) 15%, transparent)", color: "var(--th-accent)", padding: "4px 8px", borderRadius: 16, fontSize: 12 }}>
                  {u.username || u.full_name?.split(' ')[0]}
                  <Icon name="close" size={14} style={{ cursor: "pointer" }} onClick={() => toggleUser(u)} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Search */}
        <div style={{ padding: "16px 24px" }}>
          <input
            placeholder="Search explorers to add..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: "100%", background: "var(--th-surface-top)", border: "1px solid var(--th-border)", borderRadius: 12, padding: "12px", fontSize: 14, color: "var(--th-text)", outline: "none", boxSizing: "border-box", fontFamily: "'Manrope', sans-serif" }}
          />
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 12px 16px" }}>
          {results.map((u) => {
            const isSel = selectedUsers.some(x => (x.id || x._id) === (u.id || u._id));
            return (
              <div
                key={u.id || u._id}
                onClick={() => toggleUser(u)}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 12px", borderRadius: 12, cursor: "pointer", background: isSel ? "color-mix(in srgb, var(--th-accent) 8%, transparent)" : "transparent" }}
                onMouseEnter={(e) => !isSel && (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                onMouseLeave={(e) => !isSel && (e.currentTarget.style.background = "transparent")}
              >
                <Avatar src={u.avatar} name={u.full_name} size={44} online={u.isOnline} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: "var(--th-text)", fontSize: 14, fontFamily: "'Space Grotesk', sans-serif" }}>{u.full_name || u.username}</div>
                  <div style={{ fontSize: 12, color: "var(--th-muted)", marginTop: 2 }}>{u.email || u.uniqueTag}</div>
                </div>
                {isSel ? (
                  <Icon name="check_circle" size={20} fill style={{ color: "var(--th-accent)" }} />
                ) : (
                  <Icon name="radio_button_unchecked" size={20} style={{ color: "var(--th-muted)" }} />
                )}
              </div>
            );
          })}
        </div>

        <div style={{ padding: 16, borderTop: "1px solid var(--th-border)" }}>
          <button onClick={createGroup} disabled={creating} style={{ width: "100%", background: "var(--th-accent)", color: "var(--th-accent-text)", border: "none", borderRadius: 12, padding: 14, fontWeight: 700, cursor: creating ? "default" : "pointer", opacity: creating ? 0.7 : 1 }}>
            {creating ? "Transmitting..." : "Initialize Group Signals"}
          </button>
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
  const [tab, setTab] = useState<"media" | "audio" | "text">("media");
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
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(16px)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 480, background: "#031427", border: "1px solid rgba(59,73,92,0.3)", borderRadius: 24, overflow: "hidden", boxShadow: "0 40px 100px rgba(0,0,0,0.8)", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 700, color: "#ffe792", margin: 0 }}>New Signal</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9eacc3" }}><Icon name="close" size={20} /></button>
        </div>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, padding: "16px 24px 0", flexShrink: 0, borderBottom: "1px solid rgba(59,73,92,0.2)" }}>
          {([["media", "photo_camera", "Media"], ["audio", "mic", "Audio"], ["text", "text_fields", "Text"]] as const).map(([t, icon, label]) => (
            <button key={t} onClick={() => setTab(t as any)} style={{ flex: 1, background: "none", border: "none", borderBottom: tab === t ? "2px solid #ffe792" : "2px solid transparent", padding: "10px 0", cursor: "pointer", color: tab === t ? "#ffe792" : "#68768b", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", transition: "all 0.2s" }}>
              <Icon name={icon} size={16} />{label}
            </button>
          ))}
        </div>

        <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>
          {/* Media tab */}
          {tab === "media" && (
            <>
              <div onClick={() => fileRef.current?.click()} style={{ border: "2px dashed rgba(255,231,146,0.2)", borderRadius: 16, minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", marginBottom: 16, overflow: "hidden", position: "relative" }}>
                {preview ? (
                  file?.type.startsWith("video/") ? <video src={preview} style={{ maxWidth: "100%", maxHeight: 220, borderRadius: 10 }} controls /> :
                    <img src={preview} style={{ maxWidth: "100%", maxHeight: 220, borderRadius: 10, objectFit: "cover" }} />
                ) : (
                  <div style={{ textAlign: "center" }}>
                    <Icon name="add_photo_alternate" size={44} style={{ color: "#ffe792", opacity: 0.6 }} />
                    <p style={{ color: "#9eacc3", fontSize: 13, marginTop: 10 }}>Click to select image or video</p>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" hidden accept="image/*,video/*" onChange={handleFile} />
              <input placeholder="Add a caption… (optional)" value={caption} onChange={(e) => setCaption(e.target.value)} style={{ width: "100%", background: "#071a2f", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "12px 16px", fontSize: 14, color: "#d8e6ff", outline: "none", boxSizing: "border-box", fontFamily: "'Manrope',sans-serif" }} />
            </>
          )}

          {/* Audio tab */}
          {tab === "audio" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
              <div style={{ width: "100%", background: "rgba(255,231,146,0.04)", border: "1px solid rgba(255,231,146,0.1)", borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                <div style={{ width: 72, height: 72, borderRadius: "50%", background: voice.recording ? "rgba(239,68,68,0.15)" : "rgba(255,231,146,0.1)", border: voice.recording ? "2px solid rgba(239,68,68,0.5)" : "2px solid rgba(255,231,146,0.3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s" }} onClick={voice.recording ? undefined : voice.start}>
                  <Icon name={voice.recording ? "stop" : "mic"} size={32} style={{ color: voice.recording ? "#ef4444" : "#ffe792" }} />
                </div>
                {voice.recording ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", animation: "pulse 1s infinite" }} />
                    <span style={{ color: "#d8e6ff", fontSize: 16, fontVariantNumeric: "tabular-nums", fontFamily: "'Space Grotesk',sans-serif" }}>{fmtTime(voice.duration)}</span>
                    <button onClick={voice.cancel} style={{ background: "none", border: "none", cursor: "pointer", color: "#68768b", fontSize: 12 }}>Cancel</button>
                  </div>
                ) : file ? (
                  <div style={{ textAlign: "center" }}>
                    <Icon name="check_circle" size={24} style={{ color: "#4ade80" }} />
                    <p style={{ color: "#9eacc3", fontSize: 12, marginTop: 4 }}>Ready to broadcast</p>
                  </div>
                ) : (
                  <p style={{ color: "#68768b", fontSize: 13 }}>Tap mic to record, or upload an audio file</p>
                )}
                {voice.recording && (
                  <button onClick={async () => { const f = await voice.stop(); if (f) setFile(f); }} style={{ background: "#ffe792", border: "none", borderRadius: 40, padding: "8px 20px", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: "#1a0a00", cursor: "pointer" }}>Stop & Save</button>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#68768b", fontSize: 12 }}>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />or upload a file<div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
              </div>
              <button onClick={() => audioFileRef.current?.click()} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "10px 20px", color: "#9eacc3", cursor: "pointer", fontSize: 13, fontFamily: "'Manrope',sans-serif" }}>
                <Icon name="upload_file" size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />Choose audio file
              </button>
              <input ref={audioFileRef} type="file" hidden accept="audio/*" onChange={handleFile} />
            </div>
          )}

          {/* Text tab */}
          {tab === "text" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Live preview */}
              <div style={{ width: "100%", height: 200, borderRadius: 16, background: bgGradient, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, boxSizing: "border-box" }}>
                <p style={{ color: textColor, fontSize: 18, fontWeight: 700, textAlign: "center", fontFamily: "'Space Grotesk',sans-serif", wordBreak: "break-word", margin: 0, lineHeight: 1.4 }}>{textContent || "Your story text appears here..."}</p>
              </div>
              <textarea placeholder="What's on your mind?" value={textContent} onChange={(e) => setTextContent(e.target.value)} rows={3} style={{ background: "#071a2f", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "12px 16px", fontSize: 14, color: "#d8e6ff", outline: "none", resize: "none", fontFamily: "'Manrope',sans-serif", boxSizing: "border-box", width: "100%" }} />
              <div>
                <p style={{ fontSize: 11, color: "#68768b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Background</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {STORY_GRADIENTS.map((g) => (
                    <div key={g} onClick={() => setBgGradient(g)} style={{ width: 32, height: 32, borderRadius: 8, background: g, cursor: "pointer", border: bgGradient === g ? "2px solid #ffe792" : "2px solid transparent", transition: "border 0.2s" }} />
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {["#ffffff", "#ffe792", "#a2c2fd", "#4ade80", "#f87171"].map((c) => (
                  <div key={c} onClick={() => setTextColor(c)} style={{ width: 28, height: 28, borderRadius: "50%", background: c, cursor: "pointer", border: textColor === c ? "3px solid #ffe792" : "3px solid transparent", boxSizing: "border-box" }} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: "0 24px 24px", flexShrink: 0 }}>
          <button onClick={submit} disabled={uploading || !canPost} style={{ width: "100%", background: uploading || !canPost ? "rgba(255,231,146,0.25)" : "linear-gradient(135deg,#ffe792,#ffc300)", color: "#655400", border: "none", borderRadius: 14, padding: "14px 0", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14, cursor: uploading || !canPost ? "not-allowed" : "pointer", letterSpacing: "0.08em", textTransform: "uppercase", transition: "opacity 0.2s" }}>
            {uploading ? "Transmitting..." : "📡 Broadcast Signal"}
          </button>
        </div>
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
  const navigate = useNavigate();

  const [chats, setChats] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [typing, setTyping] = useState(false);
  const [transmittingRegistry, setTransmittingRegistry] = useState<Record<string, { typing: boolean, recording: boolean }>>({});

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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mediaToUpload, setMediaToUpload] = useState<{ file: File; preview: string; type: 'image' | 'video'; isHD?: boolean } | null>(null);
  const [mediaCaption, setMediaCaption] = useState("");
  const [replyingToMsg, setReplyingToMsg] = useState<any>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeChatRef = useRef<any>(null);

  const voice = useVoiceRecorder();

  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);

  /* ── ESC key: close overlays layer-by-layer, only close chat when all clear ── */
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;

      // Close overlays one at a time, outermost first.
      // Each setter returns the previous value; if it was truthy we consumed the ESC.
      let consumed = false;

      setReactionPickerMsgId((v) => { if (v) { consumed = true; return null; } return v; });
      if (consumed) return;

      setShowEmoji((v) => { if (v) { consumed = true; return false; } return v; });
      if (consumed) return;

      setLightboxImg((v) => { if (v) { consumed = true; return null; } return v; });
      if (consumed) return;

      setDeleteModal((v) => { if (v) { consumed = true; return null; } return v; });
      if (consumed) return;

      setReplyingToMsg((v: any) => { if (v) { consumed = true; return null; } return v; });
      if (consumed) return;

      setMediaToUpload((v: any) => { if (v) { consumed = true; return null; } return v; });
      if (consumed) return;

      setViewingStory((v) => { if (v) { consumed = true; return null; } return v; });
      if (consumed) return;

      setActionMenuMsgId((v) => { if (v) { consumed = true; return null; } return v; });
      if (consumed) return;

      setMessageInfoModal((v) => { if (v) { consumed = true; return null; } return v; });
      if (consumed) return;

      setShowNewChat((v) => { if (v) { consumed = true; return false; } return v; });
      if (consumed) return;

      setShowNewGroup((v) => { if (v) { consumed = true; return false; } return v; });
      if (consumed) return;

      setShowStory((v) => { if (v) { consumed = true; return false; } return v; });
      if (consumed) return;

      // Nothing was open — close the active chat thread
      setActiveChat(null);
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  useEffect(() => {
    const initE2E = async () => {
      try {
        if (!localStorage.getItem("e2ee_private")) {
          const keys = await generateKeyPair();
          const priv = await exportPrivateKey(keys.privateKey);
          const pub = await exportPublicKey(keys.publicKey);
          localStorage.setItem("e2ee_private", priv);
          localStorage.setItem("e2ee_public", pub);
          console.log("[E2EE] Initialized new WebCrypto KeyPair");
        } else {
          console.log("[E2EE] Loaded existing WebCrypto KeyPair");
        }
      } catch (e) {
        console.error("[E2EE] Failed to init encryption keys", e);
      }
    };
    initE2E();

    const token = localStorage.getItem("access_token");
    if (!token) return;

    initiateSocket(token);
    const socket = getSocket();
    if (!socket) return;

    const onNewMessage = (msg: any) => {
      const chat = activeChatRef.current;
      const msgChatId = msg.chat?.id || msg.chat?._id || msg.chatId;
      const activeChatId = chat?.id || chat?._id;
      if (chat && msgChatId && msgChatId === activeChatId) {
        setMessages((prev) => {
          if (prev.some((m) => (m.id || m._id) === (msg.id || msg._id))) return prev;
          return [...prev, msg];
        });
      }
      setChats((prev) =>
        prev.map((c) =>
          (c.id || c._id) === msgChatId
            ? { ...c, latestMessage: { content: msg.content || (msg.mediaUrl ? '📎 Media' : ''), sentAt: msg.sentAt || new Date().toISOString() } }
            : c
        )
      );
    };

    const onReceive = (payload: any) => {
      const chat = activeChatRef.current;
      const msgChatId = payload.chatId || payload.chat?.id || payload.chat?._id;
      if (chat && msgChatId === (chat.id || chat._id)) {
        setMessages((prev) => {
          if (prev.some((m) => (m.id || m._id) === (payload.id || payload._id))) return prev;
          return [...prev, payload];
        });
      }
      setChats((prev) =>
        prev.map((c) =>
          (c.id || c._id) === msgChatId
            ? { ...c, latestMessage: { content: payload.message || payload.content || '', sentAt: new Date().toISOString() } }
            : c
        )
      );
    };

    const onMsgDeleted = ({ messageId }: any) => {
      setMessages((prev) => prev.filter((m) => (m._id || m.id) !== messageId));
    };

    const onMsgUpdated = ({ messageId, content }: any) => {
      setMessages((prev) => prev.map((m) =>
        (m._id || m.id) === messageId ? { ...m, content } : m
      ));
    };

    const onMsgReaction = ({ messageId, reactions }: any) => {
      // Replace reactions array entirely with server-confirmed data
      // (reactions contain populated user objects from backend)
      setMessages((prev) => prev.map((m) =>
        (m._id || m.id) === messageId ? { ...m, reactions: reactions || [] } : m
      ));
    };

    const onTypingStart = ({ fromUserId, chatId }: any) => {
      if (fromUserId !== myId && chatId) {
        setTransmittingRegistry(prev => ({ ...prev, [chatId]: { ...prev[chatId], typing: true } }));
      }
    };
    const onTypingStop = ({ fromUserId, chatId }: any) => {
      if (fromUserId !== myId && chatId) {
        setTransmittingRegistry(prev => ({ ...prev, [chatId]: { ...prev[chatId], typing: false } }));
      }
    };
    const onRecordingStart = ({ fromUserId, chatId }: any) => {
      if (fromUserId !== myId && chatId) {
        setTransmittingRegistry(prev => ({ ...prev, [chatId]: { ...prev[chatId], recording: true } }));
      }
    };
    const onRecordingStop = ({ fromUserId, chatId }: any) => {
      if (fromUserId !== myId && chatId) {
        setTransmittingRegistry(prev => ({ ...prev, [chatId]: { ...prev[chatId], recording: false } }));
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

    onEvent("new_message", onNewMessage);
    onEvent("receive_message", onReceive);
    onEvent("message_deleted", onMsgDeleted);
    onEvent("message_updated", onMsgUpdated);
    onEvent("message_reaction", onMsgReaction);
    onEvent("typing_start", onTypingStart);
    onEvent("typing_stop", onTypingStop);
    onEvent("recording_start", onRecordingStart);
    onEvent("recording_stop", onRecordingStop);
    onEvent("user_status_change", onStatus);

    return () => {
      offEvent("new_message", onNewMessage);
      offEvent("receive_message", onReceive);
      offEvent("message_deleted", onMsgDeleted);
      offEvent("message_updated", onMsgUpdated);
      offEvent("message_reaction", onMsgReaction);
      offEvent("typing_start", onTypingStart);
      offEvent("typing_stop", onTypingStop);
      offEvent("recording_start", onRecordingStart);
      offEvent("recording_stop", onRecordingStop);
      offEvent("user_status_change", onStatus);
    };
  }, [myId]);

  const prevChatIdRef = useRef<string | null>(null);
  useEffect(() => {
    const chatId = activeChat?.id || activeChat?._id || null;
    if (prevChatIdRef.current && prevChatIdRef.current !== chatId) {
      emitLeaveRoom(prevChatIdRef.current);
    }
    if (chatId) {
      emitJoinRoom(chatId);
    }
    prevChatIdRef.current = chatId;
  }, [activeChat]);

  useEffect(() => {
    (async () => {
      try {
        const [chatRes, storyRes, aidaRes] = await Promise.all([
          api.fetchAllUserChats(),
          api.fetchStories(),
          api.fetchAidaConversationObj().catch(() => null)
        ]);
        const fetchedChats = chatRes.conversations || [];
        if (aidaRes && aidaRes.conversation) {
          const aidaExists = fetchedChats.some((c: any) => c._id === aidaRes.conversation._id || c.id === aidaRes.conversation._id);
          if (!aidaExists) fetchedChats.unshift(aidaRes.conversation);
        }
        setChats(fetchedChats);
        setStories(storyRes.stories || []);
      } catch (e) {
        console.error("Initial load failed:", e);
      }
    })();
  }, []);

  useEffect(() => {
    if (!activeChat) return;
    (async () => {
      try {
        setSessionSummary(null);
        setMessages([]); // Clear previous messages to prevent UI bleeding
        const res = await api.fetchMessages(activeChat.id || activeChat._id);
        const msgs = res.messages || [];
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const aidaTimeoutRef = useRef<any>(null);
  useEffect(() => {
    if (activeChat && !activeChat.isGroupChat && !activeChat.isAidaBot) {
      if (aidaTimeoutRef.current) clearTimeout(aidaTimeoutRef.current);
      aidaTimeoutRef.current = setTimeout(() => {
        const chatId = activeChat.id || activeChat._id;
        fetchConversationContext(chatId).then((res: any) => {
          setAidaContext(prev => ({
            summary: res.summary || prev?.summary || null,
            suggestions: res.suggestions || prev?.suggestions || [],
            loading: false,
            open: prev?.open !== undefined ? prev.open : true
          }));
        }).catch(() => { });
      }, 1500); // Debounce to prevent flashing on rapid messaging
    }
  }, [messages.length, activeChat?.id, activeChat?._id]);

  const handleSend = async () => {
    if (!inputText.trim() || !activeChat) return;
    const text = inputText;
    setInputText("");
    const parentMsgId = replyingToMsg ? replyingToMsg.id || replyingToMsg._id : undefined;
    setReplyingToMsg(null);
    try {
      if (messageRequestStatus?.reason === "no_request") {
        const other = getOtherUser(activeChat, myId);
        if (other) {
          try {
            setRequestSending(true);
            const { sendMessageRequest: sendReqApi } = await import("@/api");
            await sendReqApi(other.id || other._id);
            toast.success("Message request sent!");
            setMessageRequestStatus({ reason: "request_pending", requestDirection: "sent", requestStatus: "pending" });
          } catch (err: any) {
            toast.error("Failed to send request.");
          } finally {
            setRequestSending(false);
          }
        }
        return; // Don't try to send the actual text message yet
      }

      if (activeChat.isAidaBot) {
        // Optimistic UI update for user message
        const targetChatId = activeChat.id || activeChat._id;
        const tempId = `temp-${Date.now()}`;
        setMessages(prev => [...prev, { _id: tempId, content: text, sender: { _id: myId }, chat: targetChatId, createdAt: new Date().toISOString() }]);

        try {
          const res = await api.chatMessageAida(text, targetChatId);
          // Backend returns: userMessage, botMessage
          setMessages(prev => {
            let updated = prev.filter(m => m._id !== tempId); // Remove optimistic
            if (res.userMessage) updated.push(res.userMessage);
            if (res.botMessage) updated.push({ ...res.botMessage, actions: res.actions });
            return updated;
          });
          return;
        } catch (e) {
          toast.error("Failed to connect to Aida.");
          setMessages(prev => prev.filter(m => m._id !== tempId));
          return;
        }
      }

      const res = await api.sendTextMessage(activeChat.id || activeChat._id, text, { parent_message: parentMsgId });
      const msg = res.data || res;
      setMessages((prev) => {
        if (prev.some((m) => (m.id || m._id) === (msg.id || msg._id))) return prev;
        return [...prev, msg];
      });
    } catch {
      toast.error("Failed to send");
    }
  };

  const handleTyping = (text: string) => {
    setInputText(text);
    if (!activeChat) return;
    const chatId = activeChat?.id || activeChat?._id;
    const other = getOtherUser(activeChat, myId)
      || activeChat.users?.find((u: any) => (u.id || u._id) !== myId)
      || null;
    const otherId = other ? (other.id || other._id) : '';
    if (!typing) {
      setTyping(true);
      emitTypingStart(otherId, chatId);
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      setTyping(false);
      emitTypingStop(otherId, chatId);
    }, 1500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChat) return;
    e.target.value = "";
    const type = file.type.startsWith("video/") ? "video" : "image";
    setMediaToUpload({ file, preview: URL.createObjectURL(file), type });
    setMediaCaption("");
  };

  const confirmMediaUpload = async () => {
    if (!mediaToUpload || !activeChat) return;
    const parentMsgId = replyingToMsg ? replyingToMsg.id || replyingToMsg._id : undefined;
    try {
      toast.info("Uploading media...");
      const res = await api.sendMediaMessage(activeChat.id || activeChat._id, mediaToUpload.file, {
        content: mediaCaption,
        parent_message: parentMsgId
      });
      const msg = res.data || res;
      setMessages((prev) => {
        if (prev.some((m) => (m.id || m._id) === (msg.id || msg._id))) return prev;
        return [...prev, msg];
      });
      setMediaToUpload(null);
      setMediaCaption("");
      setReplyingToMsg(null);
    } catch {
      toast.error("Upload failed");
    }
  };

  const handleVoiceSend = async () => {
    if (!activeChat) return;
    const chatId = activeChat.id || activeChat._id;
    const finalDuration = voice.duration;
    emitRecordingStop(chatId);
    const file = await voice.stop();
    if (!file) return;
    try {
      toast.info("Sending voice note...");
      const res = await api.sendMediaMessage(chatId, file, { media_duration: finalDuration });
      const msg = res.data || res;
      setMessages((prev) => {
        if (prev.some((m) => (m.id || m._id) === (msg.id || msg._id))) return prev;
        return [...prev, msg];
      });
    } catch {
      toast.error("Voice send failed");
    }
  };

  const handleVoiceStart = async () => {
    if (!activeChat) return;
    await voice.start();
    const chatId = activeChat.id || activeChat._id;
    emitRecordingStart(chatId);
  };

  const handleNewChat = (conv: any) => {
    setChats((prev) => {
      const exists = prev.find((c) => (c.id || c._id) === (conv.id || conv._id));
      return exists ? prev : [conv, ...prev];
    });
    setActiveChat(conv);
    if (forwardingMsg) {
      const text = forwardingMsg.content ? `"${forwardingMsg.content}"` : "Media";
      const link = forwardingMsg.mediaUrl ? `\nAttachment: ${forwardingMsg.mediaUrl}` : "";
      api.sendTextMessage(conv.id || conv._id, `[Forwarded Message]\n${text}${link}`, { is_forwarded: true });
      toast.success("Message forwarded");
      setForwardingMsg(null);
    }
  };

  const handleStoryUploaded = (story: any) => {
    setStories((prev) => [story, ...prev]);
  };

  const handleDeleteMessage = async (msgId: string, scope: 'for_me' | 'for_everyone') => {
    setDeleteModal(null);
    try {
      if (scope === 'for_everyone') {
        await api.deleteMessageForEveryone(msgId);
      } else {
        await api.deleteMessageForMe(msgId);
        setMessages((prev) => prev.filter((m) => (m._id || m.id) !== msgId));
      }
      toast.success(scope === 'for_everyone' ? "Deleted for everyone" : "Deleted for you");
    } catch (err: any) {
      if (err.message?.includes('2 minutes')) {
        toast.error("Can only delete for everyone within 2 minutes of sending");
      } else {
        toast.error("Could not delete message");
      }
    }
  };

  const handleUpdateMessage = async (msgId: string, content: string, sentAt: string) => {
    const diff = Date.now() - new Date(sentAt).getTime();
    if (diff > 4 * 60 * 1000) {
      toast.error("Transmissions can only be modified within 4 minutes of emission");
      setEditingMsgId(null);
      return;
    }
    try {
      await api.updateMessage(msgId, content);
      setMessages(prev => prev.map(m => (m._id || m.id) === msgId ? { ...m, content } : m));
      setEditingMsgId(null);
      toast.success("Transmission modification complete");
    } catch {
      toast.error("Failed to update message");
    }
  };

  const handleReactMessage = async (msgId: string, emoji: string) => {
    try {
      // Optimistic update — toggling locally for instant feedback
      setMessages(prev => prev.map(m => {
        if ((m._id || m.id) !== msgId) return m;
        const reactions = [...(m.reactions || [])];
        const existingIdx = reactions.findIndex(r => {
          const rUserId = r.user?.id || r.user?._id || (typeof r.user === 'string' ? r.user : null);
          return rUserId === myId && r.emoji === emoji;
        });
        if (existingIdx > -1) {
          reactions.splice(existingIdx, 1);
        } else {
          reactions.push({ user: { id: myId, _id: myId }, emoji, timestamp: new Date() });
        }
        return { ...m, reactions };
      }));
      // Persist to backend — server will emit `message_reaction` socket event
      // which will replace the optimistic data with server-confirmed populated objects
      await api.reactToMessage(msgId, emoji);
    } catch {
      toast.error("Failed to react");
    }
  };

  const handleStoryReply = async (storyId: string, authorId: string, replyText: string) => {
    try {
      const res = await api.accessOrCreateChat(authorId);
      const chat = res.data;
      if (chat && (chat._id || chat.id)) {
        await api.sendTextMessage(chat._id || chat.id, `Story Reply: ${replyText}`, { parent_message: storyId });
        toast.success("Replied to story!");
      } else {
        toast.error("Could not find chat for story reply");
      }
    } catch {
      toast.error("Failed to reply to story");
    }
  };

  const handleBlockUser = async (userId: string) => {
    try {
      await api.blockUser(userId);
      toast.success("Identity updated in block registry");
    } catch {
      toast.error("Failed to update identity status");
    }
  };

  const handleReportUser = async (userId: string) => {
    const reason = window.prompt("Reason for reporting this transmission?");
    if (!reason) return;
    try {
      await api.reportUser(userId, reason);
      toast.success("Report submitted for manual investigation");
    } catch {
      toast.error("Failed to submit report");
    }
  };

  const handleMuteChat = async (chatId: string) => {
    try {
      await api.muteChat(chatId);
      toast.success("Notification preferences updated");
    } catch {
      toast.error("Failed to update transmission status");
    }
  };

  const handleClearChat = async (chatId: string) => {
    if (!window.confirm("Are you sure? This will remove all local transmission artifacts.")) return;
    try {
      await api.clearChat(chatId);
      setMessages([]);
      toast.success("Transmission history cleared locally");
    } catch {
    }
  };

  const renderMessageText = (text: string) => {
    const wsRegex = /http[s]?:\/\/[^\s]+\/workspace\/shared\/([a-zA-Z0-9_\-]+)/g;
    if (!wsRegex.test(text)) return text;

    wsRegex.lastIndex = 0;
    const parts = [];
    let lastIdx = 0;
    let match;
    while ((match = wsRegex.exec(text)) !== null) {
      if (match.index > lastIdx) parts.push(text.slice(lastIdx, match.index));
      const folderId = match[1];

      parts.push(
        <div key={match.index} onClick={() => navigate(`/workspace/shared/${folderId}`)} style={{ marginTop: 8, marginBottom: 8, background: "rgba(11,36,64,0.6)", border: "1px solid rgba(162,194,253,0.3)", borderRadius: 12, padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, transition: "background 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "rgba(162,194,253,0.1)"} onMouseLeave={(e) => e.currentTarget.style.background = "rgba(11,36,64,0.6)"}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(162,194,253,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="folder_shared" size={20} style={{ color: "#a2c2fd" }} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#d8e6ff" }}>Shared Workspace</h4>
            <p style={{ margin: 0, fontSize: 11, color: "#9eacc3", marginTop: 2 }}>Click to open public folder</p>
          </div>
        </div>
      );
      lastIdx = match.index + match[0].length;
    }
    if (lastIdx < text.length) parts.push(text.slice(lastIdx));
    return parts;
  };

  const handlePinChat = async (chatId: string) => {
    try {
      const res = await api.toggleChatPin(chatId);
      toast.success(res.isPinned ? "Transmission pinned to top" : "Transmission unpinned");
      setChats(prev => prev.map(c =>
        (c.id || c._id) === chatId ? { ...c, pinnedBy: res.isPinned ? [...(c.pinnedBy || []), myId] : (c.pinnedBy || []).filter((id: string) => id !== myId) } : c
      ));
    } catch {
      toast.error("Failed to update pin status");
    }
  };

  const handlePinMessage = async (msgId: string) => {
    try {
      const res = await api.toggleMessagePin(msgId);
      toast.success(res.is_pinned ? "Transmission pinned" : "Transmission unpinned");
      setMessages(prev => prev.map(m =>
        (m._id || m.id) === msgId ? { ...m, is_pinned: res.is_pinned } : m
      ));
    } catch {
      toast.error("Failed to update pin status");
    }
  };

  const toggleMessageSelection = (msgId: string) => {
    setSelectedMessages(prev => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      if (next.size === 0) setIsSelectionMode(false);
      return next;
    });
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      await api.deleteChat(chatId);
      setChats(prev => prev.filter(c => (c.id || c._id) !== chatId));
      if ((activeChat?.id || activeChat?._id) === chatId) setActiveChat(null);
      toast.success('Chat removed from your view');
    } catch {
      toast.error('Failed to delete chat');
    }
    setChatContextMenu(null);
  };

  const handleSelectChat = async (chat: any) => {
    setActiveChat(chat);
    setChatSearch("");
    setMessageRequestStatus(null);
    setAidaContext(null);

    // If it's a DM, check messaging permission + load Aida context
    if (!chat.isGroupChat && !chat.isAidaBot) {
      const other = getOtherUser(chat, myId);
      const chatId = chat.id || chat._id;
      if (other && (other.id || other._id)) {
        // Check can-message
        try {
          const status = await checkCanMessage(other.id || other._id);
          if (!status.canMessage) {
            setMessageRequestStatus(status);
          }
        } catch (err) {
          console.error("Failed to check message permission", err);
        }
        // Load Aida conversation context (non-blocking)
        setAidaContext({ summary: null, suggestions: [], loading: true, open: true });
        fetchConversationContext(chatId)
          .then((res: any) => {
            setAidaContext({
              summary: res.summary || null,
              suggestions: res.suggestions || [],
              loading: false,
              open: true,
            });
          })
          .catch(() => setAidaContext(null));
      }
    }
  };

  const loadSessionSummary = async () => {
    if (!activeChat) return;
    setSummaryLoading(true);
    try {
      const targetChatId = activeChat.id || activeChat._id;
      const res = await api.fetchAidaConversationSummary(targetChatId);
      setSessionSummary(res.summary);
      toast.success("Summary generated");
    } catch (e) {
      toast.error("Failed to summarize session");
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleMessageInfo = (msg: any) => {
    setMessageInfoModal(msg);
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

        /* ── Hover action bar ── */
        .msg-action-bar {
          display: flex;
          flex-direction: row;
          flex-wrap: nowrap;
          align-items: center;
          gap: 2px;
          background: rgba(3, 20, 39, 0.98);
          border: 1px solid rgba(255, 231, 146, 0.25);
          padding: 6px 8px;
          border-radius: 16px;
          box-shadow: 0 12px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,231,146,0.05);
          backdrop-filter: blur(16px);
          z-index: 100;
          animation: fadeUp 0.12s ease;
          white-space: nowrap;
          min-width: max-content;
        }
        .msg-action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 10px;
          border: none;
          background: transparent;
          cursor: pointer;
          color: #9eacc3;
          transition: background 0.15s, color 0.15s, transform 0.1s;
          flex-shrink: 0;
        }
        .msg-action-btn:hover {
          background: rgba(255,255,255,0.07);
          color: #d8e6ff;
          transform: scale(1.1);
        }
        .msg-action-btn.danger:hover {
          background: rgba(239,68,68,0.12);
          color: #ef4444;
        }
        .msg-action-btn.active {
          color: #ffe792;
        }
        .msg-action-divider {
          width: 1px;
          height: 20px;
          background: rgba(255,255,255,0.08);
          margin: 0 2px;
          flex-shrink: 0;
        }
      `}</style>

      {/* ── Modals ── */}
      {mediaToUpload && (
        <div style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", top: 20, right: 20, display: "flex", gap: 16 }}>
            <button onClick={() => setMediaToUpload(null)} style={{ background: "none", border: "none", color: "#9eacc3", cursor: "pointer", padding: 8, display: "flex" }}>
              <Icon name="close" size={28} />
            </button>
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px", maxWidth: "100%", overflow: "hidden" }}>
            {mediaToUpload.type === "video" ? (
              <video src={mediaToUpload.preview} controls style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 16, boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }} />
            ) : (
              <img src={mediaToUpload.preview} style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 16, objectFit: "contain", boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }} />
            )}
          </div>
          <div style={{ width: "100%", maxWidth: 640, padding: "0 20px 40px", position: "relative" }}>
            {mediaToUpload.type === "image" && (
              <div style={{ position: "absolute", bottom: "100%", left: 24, marginBottom: 16 }}>
                <button
                  onClick={() => setMediaToUpload(prev => prev ? ({ ...prev, isHD: !prev.isHD }) : null)}
                  style={{
                    background: mediaToUpload.isHD ? "rgba(74,222,128,0.2)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${mediaToUpload.isHD ? "#4ade80" : "rgba(255,255,255,0.1)"}`,
                    borderRadius: 20, padding: "6px 14px", display: "flex", alignItems: "center", gap: 8,
                    color: mediaToUpload.isHD ? "#4ade80" : "#9eacc3", fontSize: 11, cursor: "pointer", fontWeight: 600,
                    transition: "all 0.2s"
                  }}
                >
                  <Icon name={mediaToUpload.isHD ? "high_quality" : "sd"} size={16} />
                  {mediaToUpload.isHD ? "HD QUALITY ON" : "SEND IN HD?"}
                </button>
              </div>
            )}
            <input
              autoFocus
              placeholder="Add a caption..."
              value={mediaCaption}
              onChange={(e) => setMediaCaption(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") confirmMediaUpload(); }}
              style={{
                width: "100%",
                background: "#0b2440",
                border: "1px solid rgba(255,231,146,0.3)",
                borderRadius: 24,
                padding: "16px 60px 16px 24px",
                color: "#d8e6ff",
                fontSize: 15,
                outline: "none",
                boxShadow: "0 12px 32px rgba(0,0,0,0.4)"
              }}
            />
            <button
              onClick={confirmMediaUpload}
              style={{
                position: "absolute",
                right: 28,
                top: 8,
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #ffe792, #ffc300)",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 4px 16px rgba(255,215,9,0.3)"
              }}
            >
              <Icon name="send" size={18} style={{ color: "#1a0a00", marginLeft: 2 }} />
            </button>
          </div>
        </div>
      )}
      {showNewChat && (
        <NewChatModal
          currentUserId={myId}
          onClose={() => { setShowNewChat(false); setForwardingMsg(null); }}
          onStartChat={handleNewChat}
          recentChats={chats}
        />
      )}
      {/* ── Message Info Modal ── */}
      {messageInfoModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setMessageInfoModal(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 380, background: "#031427", border: "1px solid rgba(59,73,92,0.3)", borderRadius: 20, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 40px 100px rgba(0,0,0,0.8)" }}>
            <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid rgba(59,73,92,0.2)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: "#ffe792", margin: 0 }}>Transmission Info</h2>
              <button onClick={() => setMessageInfoModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9eacc3", padding: 4 }}><Icon name="close" size={20} /></button>
            </div>
            <div style={{ padding: "24px", color: "#d8e6ff", fontSize: 14, fontFamily: "'Manrope', sans-serif" }}>
              <div style={{ marginBottom: 16 }}>
                <strong style={{ color: "rgba(255,231,146,0.8)" }}>Status: </strong>
                <span>{messageInfoModal.readBy?.length > 0 ? "Read 👁️" : "Delivered ✓"}</span>
              </div>
              <div style={{ marginBottom: 16 }}>
                <strong style={{ color: "rgba(255,231,146,0.8)" }}>Timestamp: </strong>
                <span>{new Date(messageInfoModal.sentAt || messageInfoModal.createdAt).toLocaleString()}</span>
              </div>
              {messageInfoModal.readBy?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <strong style={{ color: "rgba(255,231,146,0.8)" }}>Seen by:</strong>
                  <ul style={{ marginTop: 8, paddingLeft: 20, color: "#9eacc3" }}>
                    {messageInfoModal.readBy.map((r: any, idx: number) => (
                      <li key={idx}>{r.full_name || r.username}</li>
                    ))}
                  </ul>
                </div>
              )}
              {messageInfoModal.reactions?.length > 0 && (
                <div>
                  <strong style={{ color: "rgba(255,231,146,0.8)" }}>Reactions:</strong>
                  <ul style={{ marginTop: 8, paddingLeft: 20, color: "#9eacc3" }}>
                    {messageInfoModal.reactions.map((r: any, idx: number) => (
                      <li key={idx}>
                        {r.emoji} by {r.user?.full_name || r.user?.username || "Unknown"}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Settings/Summary Modals ── */}
      {sessionSummary && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setSessionSummary(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 440, background: "#031427", border: "1px solid rgba(255,231,146,0.3)", borderRadius: 20, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 40px 100px rgba(0,0,0,0.8)" }}>
            <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid rgba(255,231,146,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Icon name="auto_awesome" style={{ color: "#ffe792" }} />
                <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: "#ffe792", margin: 0 }}>Session Summary</h2>
              </div>
              <button onClick={() => setSessionSummary(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9eacc3", padding: 4 }}><Icon name="close" size={20} /></button>
            </div>
            <div style={{ padding: "28px 24px", color: "#d8e6ff", fontSize: 15, fontFamily: "'Manrope', sans-serif", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {sessionSummary}
            </div>
          </div>
        </div>
      )}

      {showNewGroup && (
        <NewGroupModal
          currentUserId={myId}
          onClose={() => setShowNewGroup(false)}
          onStartGroup={handleNewChat}
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
          onReply={handleStoryReply}
        />
      )}
      {deleteModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--th-surface-low)", border: "1px solid var(--th-border)", borderRadius: 16, padding: "24px 32px", width: 320, display: "flex", flexDirection: "column", gap: 16, boxShadow: "0 40px 100px rgba(0,0,0,0.8)" }} className="glass">
            <h3 style={{ margin: 0, color: "var(--th-text)", fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, textAlign: "center" }}>Delete Message?</h3>
            <p style={{ margin: 0, color: "var(--th-muted)", fontSize: 13, textAlign: "center", lineHeight: 1.4 }}>Are you sure you want to delete this transmission?</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
              {deleteModal.isMine && (Date.now() - new Date(deleteModal.sentAt).getTime() < 120000) && (
                <button
                  onClick={() => handleDeleteMessage(deleteModal.msgId, 'for_everyone')}
                  style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "12px", color: "#ef4444", fontWeight: 600, cursor: "pointer" }}
                >
                  Delete for everyone
                </button>
              )}
              <button
                onClick={() => handleDeleteMessage(deleteModal.msgId, 'for_me')}
                style={{ background: "color-mix(in srgb, var(--th-accent) 5%, transparent)", border: "1px solid var(--th-border)", borderRadius: 8, padding: "12px", color: "var(--th-text)", fontWeight: 600, cursor: "pointer" }}
              >
                Delete for me
              </button>
              <button
                onClick={() => setDeleteModal(null)}
                style={{ background: "transparent", border: "none", color: "var(--th-muted)", padding: "8px", fontWeight: 500, cursor: "pointer", marginTop: 4 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
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
        {/* ─── Right-click Context Menu (Chat List) ─── */}
        {chatContextMenu && (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 9000 }}
            onClick={() => setChatContextMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setChatContextMenu(null); }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'fixed',
                left: chatContextMenu.x,
                top: chatContextMenu.y,
                background: '#031427',
                border: '1px solid rgba(59,73,92,0.4)',
                borderRadius: 12,
                boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
                overflow: 'hidden',
                minWidth: 200,
                zIndex: 9001,
                animation: 'fadeUp 0.12s ease',
              }}
            >
              {[
                { label: 'Pin Chat', icon: 'push_pin', action: () => { handlePinChat(chatContextMenu.chat.id || chatContextMenu.chat._id); setChatContextMenu(null); } },
                { label: 'Clear Messages', icon: 'cleaning_services', action: () => { api.clearChat(chatContextMenu.chat.id || chatContextMenu.chat._id).then(() => { toast.success('Chat cleared'); setChatContextMenu(null); }).catch(() => toast.error('Failed')); } },
                { label: 'Delete Chat', icon: 'delete', danger: true, action: () => handleDeleteChat(chatContextMenu.chat.id || chatContextMenu.chat._id) },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  style={{
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    cursor: 'pointer',
                    color: (item as any).danger ? '#ef4444' : '#d8e6ff',
                    fontSize: 13,
                    fontFamily: "'Manrope', sans-serif",
                    textAlign: 'left',
                    borderBottom: '1px solid rgba(59,73,92,0.1)',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = (item as any).danger ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                  <Icon name={item.icon} size={16} style={{ color: (item as any).danger ? '#ef4444' : '#9eacc3' }} />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

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
              borderRight: "1px solid var(--th-border)",
              background: "var(--th-surface-low)",
              flexShrink: 0,
            }}
          >
            <div style={{ padding: "28px 24px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <h1 className="text-xl font-bold tracking-widest text-[var(--th-accent)] uppercase" style={{ margin: 0, fontFamily: "'Space Grotesk',sans-serif" }}>
                  MESSAGES
                </h1>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button title="New Chat" onClick={() => setShowNewChat(true)} style={{ background: "color-mix(in srgb, var(--th-accent) 15%, transparent)", border: "1px solid color-mix(in srgb, var(--th-accent) 20%, transparent)", borderRadius: 10, padding: 8, cursor: "pointer", color: "var(--th-accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name="chat" size={20} />
                  </button>
                  <button title="New Group" onClick={() => setShowNewGroup(true)} style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 10, padding: 8, cursor: "pointer", color: "#4ade80", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name="group_add" size={20} />
                  </button>
                  <button title="Post Story" onClick={() => setShowStory(true)} style={{ background: "rgba(162,194,253,0.1)", border: "1px solid rgba(162,194,253,0.2)", borderRadius: 10, padding: 8, cursor: "pointer", color: "#a2c2fd", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name="add_photo_alternate" size={20} />
                  </button>
                </div>
              </div>

              <div style={{ position: "relative", marginBottom: 20 }}>
                <Icon name="search" size={18} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--th-muted)" }} />
                <input
                  placeholder="Search transmissions..."
                  value={sidebarSearch}
                  onChange={(e) => setSidebarSearch(e.target.value)}
                  style={{ width: "100%", background: "var(--th-surface-top)", border: "1px solid var(--th-border)", borderRadius: 12, padding: "11px 16px 11px 42px", fontSize: 13, color: "var(--th-text)", outline: "none", boxSizing: "border-box" }}
                />
              </div>

              {/* Stories */}
              <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 6 }}>
                <div onClick={() => setShowStory(true)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0, cursor: "pointer" }}>
                  <div style={{ width: 52, height: 52, borderRadius: "50%", border: "2px dashed color-mix(in srgb, var(--th-accent) 40%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", background: "color-mix(in srgb, var(--th-accent) 5%, transparent)" }}>
                    <Icon name="add" size={20} style={{ color: "var(--th-accent)" }} />
                  </div>
                  <span style={{ fontSize: 10, color: "var(--th-muted)", textTransform: "uppercase" }}>Add</span>
                </div>
                {stories.map((s: any, i) => (
                  <div key={s._id || i} onClick={() => setViewingStory({ stories, index: i })} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0, cursor: "pointer" }}>
                    <div style={{ width: 52, height: 52, borderRadius: "50%", padding: 2, background: "linear-gradient(135deg, var(--th-accent), var(--th-secondary))", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Avatar src={s.author?.avatar} name={s.author?.full_name} size={48} />
                    </div>
                    <span style={{ fontSize: 10, color: "var(--th-muted)", maxWidth: 52, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.author?.full_name?.split(" ")[0] || "User"}
                    </span>
                  </div>
                ))}
              </div>
            </div>


            {/* Conversation list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0 12px 12px" }}>
              {chats.length === 0 && (
                <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--th-muted)" }}>
                  <Icon name="chat_bubble_outline" size={40} style={{ opacity: 0.3, display: "block", margin: "0 auto 12px" }} />
                  <p style={{ fontSize: 14 }}>No conversations yet.</p>
                  <p style={{ fontSize: 12, marginTop: 6, opacity: 0.7 }}>Tap + to start one.</p>
                </div>
              )}
              {chats
                .filter((c: any) => {
                  if (!sidebarSearch) return true;
                  const name = getChatDisplayName(c, myId).toLowerCase();
                  return name.includes(sidebarSearch.toLowerCase());
                })
                .sort((a: any, b: any) => {
                  const aPin = a.pinnedBy?.includes(myId) ? 1 : 0;
                  const bPin = b.pinnedBy?.includes(myId) ? 1 : 0;
                  if (aPin !== bPin) return bPin - aPin;
                  const aTime = new Date(a.latestMessage?.sentAt || 0).getTime();
                  const bTime = new Date(b.latestMessage?.sentAt || 0).getTime();
                  return bTime - aTime;
                })
                .map((c: any) => {
                  const name = getChatDisplayName(c, myId);
                  const avatar = getChatAvatar(c, myId);
                  const other = getOtherUser(c, myId);
                  const isActive = (activeChat?.id || activeChat?._id) === (c.id || c._id);
                  const isPinned = c.pinnedBy?.includes(myId);

                  return (
                    <div
                      key={c.id || c._id}
                      onClick={() => handleSelectChat(c)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setChatContextMenu({ x: e.clientX, y: e.clientY, chat: c });
                      }}
                      style={{
                        display: "flex", gap: 14, alignItems: "center", padding: "14px 12px",
                        borderRadius: 14, cursor: "pointer", marginBottom: 2,
                        background: isActive ? "color-mix(in srgb, var(--th-accent) 7%, transparent)" : "transparent",
                        borderLeft: isActive ? "2px solid color-mix(in srgb, var(--th-accent) 50%, transparent)" : "2px solid transparent",
                        transition: "all 0.15s", position: "relative"
                      }}
                      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                    >
                      <Avatar src={avatar} name={name} size={46} online={other?.isOnline} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 3 }}>
                          <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1, paddingRight: 8 }}>
                            <span style={{ fontWeight: 600, color: isActive ? "var(--th-accent)" : "var(--th-text)", fontSize: 14, fontFamily: "'Space Grotesk', sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {name}
                            </span>
                            {!c.isGroupChat && other?.organization && (
                              <span style={{ fontSize: 10, color: "var(--th-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>
                                {other.org_role ? `${other.org_role} at ${other.organization}` : other.organization}
                              </span>
                            )}
                          </div>
                          {c.latestMessage?.sentAt ? (
                            <span style={{ fontSize: 11, color: "#68768b", flexShrink: 0, marginTop: 2 }}>
                              {new Date(c.latestMessage.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          ) : (isPinned && <Icon name="push_pin" size={12} style={{ color: "#ffe792", flexShrink: 0, marginTop: 2 }} />)}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <p style={{ fontSize: 12, color: (transmittingRegistry[c.id || c._id]?.typing || transmittingRegistry[c.id || c._id]?.recording) ? "var(--th-accent)" : "var(--th-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0, flex: 1 }}>
                            {transmittingRegistry[c.id || c._id]?.recording ? "🎤 recording audio..." : transmittingRegistry[c.id || c._id]?.typing ? "⚡ transmitting..." : (c.latestMessage?.content || (c.latestMessage?.message_type === "voice" ? "🎤 Voice note" : null) || (c.latestMessage?.mediaUrl ? "📎 Attachment" : "No messages yet"))}
                          </p>
                          {isPinned && c.latestMessage?.sentAt && <Icon name="push_pin" size={12} style={{ color: "var(--th-accent)", marginLeft: 4 }} />}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>

          {/* ═══ CENTER — Message Thread ══════════════════════════════ */}
          <section style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--th-bg)", minWidth: 0 }}>
            {!activeChat ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, color: "var(--th-muted)", padding: 40 }}>
                <Icon name="chat_bubble_outline" size={64} style={{ opacity: 0.15 }} />
                <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 600, color: "var(--th-text)", opacity: 0.4 }}>
                  Select a transmission
                </h2>
                <p style={{ fontSize: 14, opacity: 0.5 }}>Choose from the list or start a new chat</p>
                <button
                  onClick={() => setShowNewChat(true)}
                  style={{ marginTop: 8, background: "var(--th-accent)", color: "var(--th-accent-text)", border: "none", borderRadius: 40, padding: "12px 24px", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase" }}
                >
                  + New Transmission
                </button>
              </div>
            ) : (
              <>
                {/* Header conditionally rendered */}
                {isSelectionMode || selectedMessages.size > 0 ? (
                  <header style={{ height: 76, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", background: "rgba(255,231,146,0.1)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,231,146,0.2)", flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <button onClick={() => { setSelectedMessages(new Set()); setIsSelectionMode(false); }} style={{ background: "none", border: "none", color: "var(--th-accent)", cursor: "pointer", display: "flex", alignItems: "center" }}>
                        <Icon name="close" size={24} />
                      </button>
                      <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: "var(--th-accent)", margin: 0 }}>
                        {selectedMessages.size} selected
                      </h2>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <button
                        onClick={() => {
                          const allIds = messages.map((m: any) => m._id || m.id).filter(Boolean);
                          setSelectedMessages(new Set(allIds));
                        }}
                        style={{ background: "rgba(255,231,146,0.1)", border: "none", borderRadius: 10, padding: "8px 12px", cursor: "pointer", color: "var(--th-accent)", fontWeight: 600, fontSize: 13, fontFamily: "'Manrope', sans-serif" }}
                      >
                        Select All
                      </button>
                      <button
                        title="Forward"
                        onClick={() => {
                          if (selectedMessages.size > 0) {
                            const msg = messages.find((m: any) => selectedMessages.has(m._id || m.id));
                            if (msg) setForwardingMsg(msg);
                            if (selectedMessages.size > 1) toast.info("Multi-forward coming soon!");
                          }
                        }}
                        style={{ background: "rgba(255,231,146,0.1)", border: "none", borderRadius: 10, padding: "8px 10px", cursor: "pointer", color: "var(--th-accent)" }}
                      >
                        <Icon name="forward" size={20} />
                      </button>
                      <button
                        title="Delete"
                        onClick={async () => {
                          if (selectedMessages.size === 0) return;
                          const confirmDelete = window.confirm(`Delete ${selectedMessages.size} selected message(s)?`);
                          if (!confirmDelete) return;
                          try {
                            await Promise.all(
                              Array.from(selectedMessages).map(id => api.deleteMessageForMe(id))
                            );
                            toast.success(`Deleted ${selectedMessages.size} messages`);
                            setMessages((prev: any[]) => prev.filter((m: any) => !selectedMessages.has(m._id || m.id)));
                            setSelectedMessages(new Set());
                            setIsSelectionMode(false);
                          } catch {
                            toast.error("Failed to delete some messages");
                          }
                        }}
                        style={{ background: "rgba(239,68,68,0.2)", border: "none", borderRadius: 10, padding: "8px 10px", cursor: "pointer", color: "#ef4444" }}
                      >
                        <Icon name="delete" size={20} />
                      </button>
                    </div>
                  </header>
                ) : (
                  <header style={{ height: 76, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", background: "var(--th-surface)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--th-border)", flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <Avatar src={getChatAvatar(activeChat, myId)} name={getChatDisplayName(activeChat, myId)} size={42} online={getOtherUser(activeChat, myId)?.isOnline} />
                      <div>
                        <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: "var(--th-text)", margin: 0 }}>
                          {getChatDisplayName(activeChat, myId)}
                        </h2>
                        <span style={{ fontSize: 11, color: "var(--th-accent)", letterSpacing: "0.08em", display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span>
                            {transmittingRegistry[activeChat?.id || activeChat?._id]?.recording ? "recording audio..." : transmittingRegistry[activeChat?.id || activeChat?._id]?.typing ? "transmitting..." : getOtherUser(activeChat, myId)?.isOnline ? "Online" : (getOtherUser(activeChat, myId) as any)?.lastSeen ? `Last seen ${new Date((getOtherUser(activeChat, myId) as any).lastSeen).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Offline"}
                          </span>
                          {!activeChat?.isGroupChat && (getOtherUser(activeChat, myId) as any)?.org_role && (
                            <>
                              <span style={{ opacity: 0.5 }}>•</span>
                              <span style={{ color: "var(--th-muted)", textTransform: 'none', letterSpacing: 'normal' }}>
                                {(getOtherUser(activeChat, myId) as any).org_role} at {(getOtherUser(activeChat, myId) as any).organization}
                              </span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ position: "relative" }}>
                        <input
                          placeholder="Search transmissions..."
                          value={chatSearch}
                          onChange={(e) => setChatSearch(e.target.value)}
                          style={{ background: "var(--th-surface-low)", border: "1px solid var(--th-border)", borderRadius: 20, padding: "6px 14px 6px 36px", fontSize: 12, color: "var(--th-text)", outline: "none", width: 180, transition: "width 0.3s" }}
                          onFocus={(e) => e.currentTarget.style.width = "240px"}
                          onBlur={(e) => e.currentTarget.style.width = "180px"}
                        />
                        <Icon name="search" size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--th-muted)" }} />
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        {[{ name: "call" }, { name: "videocam" }, { name: "info" }].map((btn) => (
                          <button key={btn.name} style={{ background: "rgba(255,255,255,0.04)", border: "none", borderRadius: 10, padding: "8px 10px", cursor: "pointer", color: "var(--th-muted)" }}>
                            <Icon name={btn.name} size={20} />
                          </button>
                        ))}
                        <button title="Summarize conversation" onClick={loadSessionSummary} disabled={summaryLoading} style={{ background: "rgba(255,231,146,0.1)", border: "1px solid rgba(255,231,146,0.2)", borderRadius: 10, padding: "8px 10px", cursor: summaryLoading ? "not-allowed" : "pointer", color: "#ffe792", opacity: summaryLoading ? 0.5 : 1, transition: "background 0.2s" }} onMouseEnter={e => !summaryLoading && (e.currentTarget.style.background = "rgba(255,231,146,0.2)")} onMouseLeave={e => !summaryLoading && (e.currentTarget.style.background = "rgba(255,231,146,0.1)")}>
                          <Icon name={summaryLoading ? "hourglass_empty" : "auto_awesome"} size={20} />
                        </button>
                      </div>
                    </div>
                  </header>
                )}

                {/* Messages */}
                <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", display: "flex", flexDirection: "column" }}>
                  {messages.length === 0 && (
                    <div style={{ textAlign: "center", color: "#9eacc3", opacity: 0.5, marginTop: 40, fontSize: 13 }}>
                      No messages yet. Say hello! 👋
                    </div>
                  )}
                  {messages
                    .filter(msg => {
                      if (!chatSearch) return true;
                      const content = (msg.content || "").toLowerCase();
                      const fileName = (msg.mediaUrl || "").toLowerCase();
                      const query = chatSearch.toLowerCase();
                      return content.includes(query) || fileName.includes(query);
                    })
                    .map((msg: any, i) => {
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
                        <div
                          key={msgId || i}
                          onMouseEnter={() => setHoveredMsg(msgId)}
                          onMouseLeave={() => setHoveredMsg(null)}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: isMine ? "flex-end" : "flex-start",
                            marginBottom: 8,
                            position: "relative",
                            background: isSelected ? "rgba(255,231,146,0.05)" : "transparent",
                            transition: "background 0.2s",
                            padding: isSelected ? "8px" : "4px 8px",
                            borderRadius: 12,
                          }}
                        >
                          {/* Pin indicator */}
                          {isPinned && (
                            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4, alignSelf: isMine ? "flex-end" : "flex-start", marginRight: isMine ? 12 : 0, marginLeft: !isMine ? 12 : 0 }}>
                              <Icon name="push_pin" size={10} style={{ color: "#ffe792" }} />
                              <span style={{ fontSize: 9, color: "rgba(255,231,146,0.6)", fontWeight: 700, letterSpacing: "0.05em" }}>PINNED TRANSMISSION</span>
                            </div>
                          )}

                          <div style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start", width: "100%", position: "relative" }}>
                            {!isMine && (
                              <Avatar src={msg.sender?.avatar} name={msg.sender?.full_name} size={32} style={{ marginRight: 10, alignSelf: "flex-end" }} />
                            )}

                            <div
                              style={{
                                maxWidth: "70%",
                                background: isMine ? "linear-gradient(135deg, var(--th-accent), var(--th-accent))" : "var(--th-surface-low)",
                                padding: "12px 16px",
                                borderRadius: isMine ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
                                border: isMine ? "none" : "1px solid var(--th-border)",
                                position: "relative",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                              }}
                            >
                              {/* ── 3-dots trigger (FIXED) ── */}
                              {(hoveredMsg === msgId && !isSelected && actionMenuMsgId !== msgId) && (
                                <button
                                  className="msg-action-trigger"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActionMenuMsgId(msgId);
                                  }}
                                  style={{
                                    position: "absolute",
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    ...(isMine ? { left: -36 } : { right: -36 }),
                                    background: "var(--th-surface-high)",
                                    border: "1px solid var(--th-border)",
                                    borderRadius: "50%",
                                    width: 32,
                                    height: 32,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "var(--th-accent)",
                                    cursor: "pointer",
                                    zIndex: 10,
                                    boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
                                  }}
                                >
                                  <Icon name="more_horiz" size={18} />
                                </button>
                              )}

                              {/* ── Hover actions bar (FIXED) ── */}
                              {(actionMenuMsgId === msgId || isSelected) && (
                                <>
                                  {actionMenuMsgId === msgId && !isSelected && (
                                    <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={(e) => { e.stopPropagation(); setActionMenuMsgId(null); }} />
                                  )}
                                  <div
                                    className="msg-action-bar"
                                    style={{
                                      position: "absolute",
                                      top: "calc(100% + 8px)",
                                      ...(isMine ? { right: 0 } : { left: 0 }),
                                      zIndex: 50,
                                    }}
                                  >
                                    {/* React */}
                                    <button
                                      className="msg-action-btn"
                                      title="React"
                                      onClick={() => setReactionPickerMsgId(msgId)}
                                    >
                                      <Icon name="add_reaction" size={18} />
                                    </button>

                                    {/* Reply */}
                                    <button
                                      className="msg-action-btn"
                                      title="Reply"
                                      onClick={() => setReplyingToMsg(msg)}
                                    >
                                      <Icon name="reply" size={18} />
                                    </button>

                                    {/* Forward */}
                                    <button
                                      className="msg-action-btn"
                                      title="Forward"
                                      onClick={() => setForwardingMsg(msg)}
                                    >
                                      <Icon name="forward" size={18} />
                                    </button>

                                    {/* Copy */}
                                    <button
                                      className="msg-action-btn"
                                      title="Copy Text"
                                      onClick={() => {
                                        if (msg.content) {
                                          navigator.clipboard.writeText(msg.content);
                                          toast.success("Text copied");
                                        } else {
                                          toast.error("No text to copy");
                                        }
                                        setActionMenuMsgId(null);
                                      }}
                                    >
                                      <Icon name="content_copy" size={18} />
                                    </button>

                                    {/* Pin */}

                                    <button
                                      className={`msg-action-btn${isPinned ? " active" : ""}`}
                                      title={isPinned ? "Unpin" : "Pin"}
                                      onClick={() => handlePinMessage(msgId)}
                                    >
                                      <Icon name="push_pin" size={18} />
                                    </button>

                                    {/* Select */}
                                    <button
                                      className={`msg-action-btn${isSelected ? " active" : ""}`}
                                      title="Select"
                                      onClick={() => toggleMessageSelection(msgId)}
                                    >
                                      <Icon name={isSelected ? "check_circle" : "check_box_outline_blank"} size={18} />
                                    </button>

                                    {/* Info */}
                                    <button
                                      className="msg-action-btn"
                                      title="Message info"
                                      onClick={() => handleMessageInfo(msg)}
                                    >
                                      <Icon name="info" size={18} />
                                    </button>

                                    {/* Edit */}
                                    {isMine && !isVideo && !isVoice && !isFile && (
                                      <button
                                        className="msg-action-btn"
                                        title="Edit Transmission"
                                        onClick={() => {
                                          setEditingMsgId(msgId);
                                          setEditContent(msg.content || "");
                                          setActionMenuMsgId(null);
                                        }}
                                      >
                                        <Icon name="edit" size={18} />
                                      </button>
                                    )}

                                    <div className="msg-action-divider" />

                                    {/* Delete */}
                                    <button
                                      className="msg-action-btn danger"
                                      title="Delete"
                                      onClick={() => setDeleteModal({ msgId, isMine, sentAt: msg.sentAt || msg.createdAt })}
                                    >
                                      <Icon name="delete" size={18} />
                                    </button>
                                  </div>
                                </>
                              )}

                              {/* Reaction picker popover */}
                              {reactionPickerMsgId === msgId && (
                                <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }} onClick={(e) => { e.stopPropagation(); setReactionPickerMsgId(null); }} />
                                  <div style={{ position: "relative", zIndex: 10000, boxShadow: "0 20px 60px rgba(0,0,0,0.8)", borderRadius: 16 }} onClick={(e) => e.stopPropagation()}>
                                    <EmojiPicker
                                      direction="up"
                                      onSelect={(emoji) => {
                                        handleReactMessage(msgId, emoji);
                                        setReactionPickerMsgId(null);
                                      }}
                                      onClose={() => setReactionPickerMsgId(null)}
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Reply preview */}
                              {msg.parent_message && (
                                <div style={{ background: isMine ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.05)", borderLeft: `3px solid ${isMine ? "rgba(0,0,0,0.3)" : "#ffe792"}`, padding: "6px 10px", borderRadius: "8px 8px 8px 2px", marginBottom: 10, fontSize: 12, display: "flex", flexDirection: "column", gap: 2, cursor: "pointer" }}>
                                  <span style={{ fontWeight: 800, color: isMine ? "rgba(0,0,0,0.7)" : "#ffe792", fontSize: 11 }}>{msg.parent_message.sender?.full_name || "Unknown Transporter"}</span>
                                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220, color: isMine ? "rgba(0,0,0,0.6)" : "#9eacc3" }}>
                                    {msg.parent_message.content || (msg.parent_message.mediaUrl ? "📎 Attachment" : "Transmission...")}
                                  </span>
                                </div>
                              )}

                              {/* Group sender name */}
                              {activeChat.isGroupChat && !isMine && (
                                <div style={{ fontSize: 11, fontWeight: 800, color: "#ffe792", marginBottom: 4, letterSpacing: "0.02em" }}>
                                  {msg.sender?.full_name || "Unknown"}
                                </div>
                              )}

                              {/* Image */}
                              {isImage && (
                                <div style={{ position: "relative", marginBottom: msg.content ? 8 : 0 }}>
                                  <img src={resolvedUrl!} onClick={() => setLightboxImg(resolvedUrl!)} style={{ maxWidth: "100%", borderRadius: 12, display: "block", cursor: "pointer" }} alt="Transmission asset" />
                                  {msg.media_metadata?.quality === 'hd' && (
                                    <div style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)", padding: "2px 6px", borderRadius: 4, display: "flex", alignItems: "center", gap: 4 }}>
                                      <Icon name="high_quality" size={12} style={{ color: "#4ade80" }} />
                                      <span style={{ fontSize: 9, fontWeight: 900, color: "#4ade80" }}>HD</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Video */}
                              {isVideo && (
                                <video src={resolvedUrl!} controls style={{ maxWidth: "100%", borderRadius: 12, marginBottom: msg.content ? 8 : 0 }} />
                              )}

                              {/* Voice */}
                              {isVoice && (
                                <CustomAudioPlayer src={resolvedUrl!} duration={msg.media_metadata?.duration} isMine={isMine} />
                              )}

                              {/* File */}
                              {isFile && (
                                <a href={resolvedUrl!} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "rgba(255,255,255,0.05)", borderRadius: 12, textDecoration: "none", marginBottom: msg.content ? 8 : 0, border: "1px solid rgba(255,255,255,0.1)" }}>
                                  <div style={{ width: 36, height: 36, background: "#ffe792", borderRadius: 10, display: "flex", alignItems: "center", justifyItems: "center", color: "#031427" }}>
                                    <Icon name="description" size={20} style={{ margin: "auto" }} />
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ margin: 0, fontSize: 13, color: isMine ? "#1a0a00" : "#d8e6ff", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      {msg.mediaUrl?.split('/').pop() || "File Asset"}
                                    </p>
                                    <p style={{ margin: 0, fontSize: 10, color: isMine ? "rgba(0,0,0,0.5)" : "#68768b" }}>
                                      {msg.fileSize ? `${(msg.fileSize / 1024 / 1024).toFixed(2)} MB` : "Download Artifact"}
                                    </p>
                                  </div>
                                </a>
                              )}

                              {/* Text */}
                              {editingMsgId === msgId ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 200 }}>
                                  <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    autoFocus
                                    style={{
                                      width: "100%",
                                      background: "rgba(0,0,0,0.1)",
                                      border: "1px solid var(--th-border)",
                                      borderRadius: 8,
                                      padding: 8,
                                      color: isMine ? "inherit" : "var(--th-text)",
                                      fontSize: 14,
                                      outline: "none",
                                      minHeight: 60,
                                      resize: "none"
                                    }}
                                  />
                                  <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                                    <button onClick={() => setEditingMsgId(null)} style={{ background: "none", border: "none", color: isMine ? "rgba(0,0,0,0.5)" : "var(--th-muted)", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>CANCEL</button>
                                    <button
                                      onClick={() => handleUpdateMessage(msgId, editContent, msg.sentAt || msg.createdAt)}
                                      style={{ background: isMine ? "rgba(0,0,0,0.1)" : "var(--th-accent)", border: "none", color: isMine ? "inherit" : "var(--th-accent-text)", borderRadius: 4, padding: "2px 8px", fontSize: 11, cursor: "pointer", fontWeight: 700 }}
                                    >
                                      SAVE
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                msg.content && (
                                  <div style={{ fontSize: 14, color: isMine ? "#2a1e00" : "var(--th-text)", lineHeight: 1.55, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                                    {renderMessageText(msg.content)}
                                  </div>
                                )
                              )}

                              {/* Timestamp + receipts */}
                              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 4, marginTop: 4, opacity: 0.8 }}>
                                <span style={{ fontSize: 10, color: isMine ? "rgba(0,0,0,0.5)" : "#68768b", fontWeight: 600 }}>
                                  {new Date(msg.sentAt || msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {isMine && (
                                  <Icon name="done_all" size={14} style={{ color: msg.readBy?.length > 1 || (msg.readBy?.length > 0 && !activeChat.isGroupChat) ? "#4ade80" : "rgba(255,255,255,0.25)" }} />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Reactions display */}
                          {msg.reactions?.length > 0 && (
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6, alignSelf: isMine ? "flex-end" : "flex-start", marginLeft: isMine ? 0 : 42 }}>
                              {Array.from(new Set(msg.reactions.map((r: any) => r.emoji))).map((emoji: any) => {
                                const count = msg.reactions.filter((r: any) => r.emoji === emoji).length;
                                const hasReacted = msg.reactions.some((r: any) => (r.user?.id || r.user?._id || r.user) === myId && r.emoji === emoji);
                                return (
                                  <div
                                    key={emoji}
                                    onClick={() => handleReactMessage(msgId, emoji)}
                                    style={{ background: hasReacted ? "rgba(255,231,146,0.15)" : "rgba(11,36,64,0.6)", border: `1px solid ${hasReacted ? "#ffe792" : "rgba(255,255,255,0.05)"}`, borderRadius: 10, padding: "2px 8px", display: "flex", alignItems: "center", gap: 4, cursor: "pointer", transition: "all 0.2s" }}
                                  >
                                    <span style={{ fontSize: 13 }}>{emoji}</span>
                                    {count > 1 && <span style={{ fontSize: 10, fontWeight: 800, color: hasReacted ? "#ffe792" : "#9eacc3" }}>{count}</span>}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}

                  {/* Typing indicator */}
                  {transmittingRegistry[activeChat?.id || activeChat?._id]?.typing && (
                    <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 8, marginTop: 4 }}>
                      <Avatar src={getChatAvatar(activeChat, myId)} size={32} style={{ marginRight: 10, alignSelf: "flex-end" }} />
                      <div style={{ background: "rgba(11,36,64,0.8)", padding: "12px 16px", borderRadius: "18px 18px 18px 4px", border: "1px solid rgba(59,73,92,0.2)", display: "flex", gap: 6, alignItems: "center" }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ffe792", animation: "pulse 1s infinite", animationDelay: "0ms" }} />
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ffe792", animation: "pulse 1s infinite", animationDelay: "200ms" }} />
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ffe792", animation: "pulse 1s infinite", animationDelay: "400ms" }} />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Request Locker */}
                {messageRequestStatus && !activeChat?.isGroupChat && (
                  <div style={{ padding: "0 28px 24px", display: "flex", justifyContent: "center" }}>
                    <div style={{ background: "color-mix(in srgb, var(--th-surface-low) 80%, transparent)", border: "1px solid var(--th-border)", borderRadius: 16, padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, width: "100%", maxWidth: 600, textAlign: "center", backdropFilter: "blur(10px)" }}>
                      <Icon name={messageRequestStatus.reason === "request_pending" && messageRequestStatus.requestDirection === "received" ? "mark_email_unread" : messageRequestStatus.reason === "request_pending" ? "hourglass_empty" : "lock"} size={32} style={{ color: messageRequestStatus.requestDirection === "received" ? "#ffe792" : "var(--th-accent)" }} />
                      <div style={{ color: "var(--th-text)", fontSize: 14, fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600 }}>
                        {messageRequestStatus.reason === "request_pending" && messageRequestStatus.requestDirection === "received" ? "Message Request Received" : "Message Request Required"}
                      </div>
                      <div style={{ color: "var(--th-muted)", fontSize: 12 }}>
                        {messageRequestStatus.reason === "request_pending"
                          ? messageRequestStatus.requestDirection === "sent"
                            ? "You have already sent a request. Waiting for them to accept."
                            : `${getChatDisplayName(activeChat, myId)} wants to message you. Accept to start chatting.`
                          : "This user is outside your organization. You must send a message request and they must accept it before you can start chatting."}
                      </div>
                      {/* Inbound request — show Accept / Decline inline */}
                      {messageRequestStatus.reason === "request_pending" && messageRequestStatus.requestDirection === "received" && (
                        <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                          <button
                            disabled={requestSending}
                            onClick={async () => {
                              setRequestSending(true);
                              try {
                                const { respondToMessageRequest } = await import("@/api");
                                await respondToMessageRequest(messageRequestStatus.entityId || messageRequestStatus.requestId, "accept");
                                toast.success("Message request accepted! You can now chat.");
                                setMessageRequestStatus(null);
                              } catch (err: any) {
                                toast.error(err.message || "Failed to accept request.");
                              } finally {
                                setRequestSending(false);
                              }
                            }}
                            style={{ padding: "10px 24px", background: "var(--th-accent)", color: "var(--th-accent-text)", borderRadius: 12, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", cursor: requestSending ? 'not-allowed' : 'pointer', opacity: requestSending ? 0.7 : 1, border: "none" }}
                          >
                            {requestSending ? "Processing..." : "✓ Accept"}
                          </button>
                          <button
                            disabled={requestSending}
                            onClick={async () => {
                              setRequestSending(true);
                              try {
                                const { respondToMessageRequest } = await import("@/api");
                                await respondToMessageRequest(messageRequestStatus.entityId || messageRequestStatus.requestId, "decline");
                                toast.success("Message request declined.");
                                setMessageRequestStatus(null);
                                setActiveChat(null);
                              } catch (err: any) {
                                toast.error(err.message || "Failed to decline request.");
                              } finally {
                                setRequestSending(false);
                              }
                            }}
                            style={{ padding: "10px 24px", background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", cursor: requestSending ? 'not-allowed' : 'pointer', opacity: requestSending ? 0.7 : 1 }}
                          >
                            ✕ Decline
                          </button>
                        </div>
                      )}
                      {/* Outbound no-request — show Send Request button */}
                      {messageRequestStatus.reason === "no_request" && (
                        <button
                          disabled={requestSending}
                          onClick={async () => {
                            const other = getOtherUser(activeChat, myId);
                            if (!other) return;
                            setRequestSending(true);
                            try {
                              await sendRequest(other.id || other._id);
                              toast.success("Message request sent!");
                              setMessageRequestStatus({ reason: "request_pending", requestDirection: "sent", requestStatus: "pending" });
                            } catch (err: any) {
                              toast.error("Failed to send request.");
                            } finally {
                              setRequestSending(false);
                            }
                          }}
                          style={{ padding: "10px 24px", background: "var(--th-accent)", color: "var(--th-accent-text)", borderRadius: 12, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", cursor: requestSending ? 'not-allowed' : 'pointer', opacity: requestSending ? 0.7 : 1, border: "none", marginTop: 4 }}
                        >
                          {requestSending ? "Sending..." : "Send Request"}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Input bar */}
                {(!messageRequestStatus) && (
                  <footer style={{ padding: "0 20px 20px", flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                    {/* ── Aida Smart Suggestions Panel ── */}
                    {aidaContext && !activeChat?.isGroupChat && !activeChat?.isAidaBot && (
                      <div style={{ marginLeft: 8, marginRight: 8, borderRadius: 14, overflow: "visible", transition: "all 0.3s" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 10px", marginBottom: 6, opacity: 0.8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }} title={aidaContext.summary || "Aida Context"}>
                            <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#ffe792" }}>auto_awesome</span>
                            <span style={{ fontSize: 10, fontWeight: 700, color: "#ffe792", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'Space Grotesk',sans-serif", cursor: "help" }}>Aida Suggestions</span>
                            {aidaContext.loading && <span style={{ fontSize: 10, color: "rgba(255,231,146,0.5)" }}>Analyzing…</span>}
                          </div>
                        </div>
                        {aidaContext.open && (
                          <div style={{ padding: "0 10px", display: "flex", flexDirection: "column", gap: 8 }}>
                            {aidaContext.loading && (
                              <div style={{ display: "flex", gap: 6, alignItems: "center", padding: "4px 0" }}>
                                {[0, 150, 300].map(d => <div key={d} style={{ width: 6, height: 6, borderRadius: "50%", background: "#ffe792", animation: "pulse 1s infinite", animationDelay: `${d}ms` }} />)}
                              </div>
                            )}
                            {!aidaContext.loading && aidaContext.suggestions.length > 0 && (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {aidaContext.suggestions.map((s, i) => (
                                  <button
                                    key={i}
                                    onClick={() => setInputText(s)}
                                    style={{
                                      background: "rgba(255,231,146,0.08)",
                                      border: "1px solid rgba(255,231,146,0.2)",
                                      borderRadius: 20,
                                      padding: "5px 12px",
                                      fontSize: 12,
                                      color: "#ffe792",
                                      cursor: "pointer",
                                      fontFamily: "'Manrope',sans-serif",
                                      transition: "background 0.15s",
                                      textAlign: "left",
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,231,146,0.16)")}
                                    onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,231,146,0.08)")}
                                  >
                                    {s}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {replyingToMsg && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(11,36,64,0.6)", border: "1px solid rgba(59,73,92,0.3)", borderRadius: 12, padding: "8px 12px", backdropFilter: "blur(4px)", marginLeft: 16, marginRight: 16 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2, overflow: "hidden" }}>
                          <span style={{ fontSize: 11, color: "#ffe792", fontWeight: 700 }}>Replying to {replyingToMsg.sender?.full_name || "Someone"}</span>
                          <span style={{ fontSize: 13, color: "#d8e6ff", opacity: 0.8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 300 }}>
                            {replyingToMsg.content || "Media Attachment"}
                          </span>
                        </div>
                        <button onClick={() => setReplyingToMsg(null)} style={{ background: "none", border: "none", color: "#9eacc3", cursor: "pointer", padding: 4 }}>
                          <Icon name="close" size={16} />
                        </button>
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(11,36,64,0.6)", border: "1px solid rgba(59,73,92,0.2)", borderRadius: 20, padding: "8px 8px 8px 16px", backdropFilter: "blur(12px)" }}>
                      {/* Emoji */}
                      <div style={{ position: "relative" }}>
                        <button
                          onClick={() => setShowEmoji((v) => !v)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: showEmoji ? "#ffe792" : "#9eacc3", padding: 6, borderRadius: 8, flexShrink: 0, transition: "color 0.15s" }}
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

                      {/* Sticker */}
                      <div style={{ position: "relative" }}>
                        <button
                          onClick={() => setShowSticker((v) => !v)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: showSticker ? "#ffe792" : "#9eacc3", padding: 6, borderRadius: 8, flexShrink: 0, transition: "color 0.15s" }}
                          title="Sticker"
                        >
                          <Icon name="sticky_note_2" size={20} />
                        </button>
                        {showSticker && (
                          <div style={{ position: "absolute", bottom: "100%", left: 0, marginBottom: 12 }}>
                            <StickerPicker
                              onSelect={async (url) => {
                                setShowSticker(false);
                                setInputText("");
                                const conv = activeChat;
                                if (!conv) return;
                                const tempObj = {
                                  _id: Date.now().toString(),
                                  id: Date.now().toString(),
                                  message_type: 'image',
                                  mediaType: 'image',
                                  mediaUrl: url,
                                  media_url: url,
                                  content: "",
                                  fromUserId: myId,
                                  sender: { id: myId },
                                  createdAt: new Date().toISOString(),
                                  sentAt: new Date().toISOString(),
                                };
                                setMessages(prev => [...prev, tempObj]);
                                try {
                                  await api.sendTextMessage(conv.id || conv._id, "", {
                                    message_type: "image",
                                    mediaUrl: url
                                  });
                                } catch (err) { toast.error("Failed to send sticker"); }
                              }}
                              onClose={() => setShowSticker(false)}
                            />
                          </div>
                        )}
                      </div>

                      {/* Attach */}
                      <button onClick={() => fileInputRef.current?.click()} style={{ background: "none", border: "none", cursor: "pointer", color: "#9eacc3", padding: 6, borderRadius: 8, transition: "color 0.15s", flexShrink: 0 }} title="Attach file or image">
                        <Icon name="attach_file" size={20} />
                      </button>
                      <input ref={fileInputRef} type="file" hidden accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt" onChange={handleFileUpload} />

                      {/* Text input or recording indicator */}
                      {voice.recording ? (
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", animation: "pulse 1s infinite" }} />
                          <span style={{ fontSize: 14, color: "#d8e6ff", fontVariantNumeric: "tabular-nums" }}>{fmtTime(voice.duration)}</span>
                          <span style={{ fontSize: 12, color: "#9eacc3" }}>Recording...</span>
                        </div>
                      ) : (
                        <input
                          value={inputText}
                          onChange={(e) => handleTyping(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                          placeholder="Type a transmission..."
                          style={{ flex: 1, background: "transparent", border: "none", color: "#d8e6ff", outline: "none", fontSize: 14, fontFamily: "'Manrope', sans-serif" }}
                        />
                      )}

                      {/* Voice button */}
                      {!inputText.trim() && (
                        <button
                          onMouseDown={voice.start}
                          onClick={voice.recording ? handleVoiceSend : undefined}
                          title={voice.recording ? "Stop & send" : "Hold for voice note"}
                          style={{ background: voice.recording ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.05)", border: voice.recording ? "1px solid rgba(239,68,68,0.4)" : "none", borderRadius: 12, padding: "8px 10px", cursor: "pointer", color: voice.recording ? "#ef4444" : "#9eacc3", flexShrink: 0, transition: "all 0.15s" }}
                        >
                          <Icon name={voice.recording ? "stop" : "mic"} size={20} />
                        </button>
                      )}

                      {/* Cancel voice */}
                      {voice.recording && (
                        <button onClick={voice.cancel} style={{ background: "none", border: "none", cursor: "pointer", color: "#9eacc3", padding: 6, flexShrink: 0 }}>
                          <Icon name="delete" size={20} />
                        </button>
                      )}

                      {/* Send */}
                      {(inputText.trim() || voice.recording) && (
                        <button
                          onClick={voice.recording ? handleVoiceSend : handleSend}
                          style={{ background: "linear-gradient(135deg, #ffe792, #ffc300)", border: "none", borderRadius: 14, padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 0 16px rgba(255,215,9,0.3)" }}
                        >
                          <Icon name="send" size={18} style={{ color: "#1a0a00" }} />
                        </button>
                      )}
                    </div>
                  </footer>
                )}
              </>
            )}
          </section>

          {/* ═══ RIGHT PANEL — Profile ════════════════════════════════ */}
          {activeChat && (
            <section style={{ width: 300, background: "var(--th-surface-low)", borderLeft: "1px solid var(--th-border)", display: "flex", flexDirection: "column", padding: "32px 24px", overflowY: "auto", flexShrink: 0 }}>
              {(() => {
                const other = getOtherUser(activeChat, myId);
                const artifacts = messages.filter((m) => m.mediaUrl && (m.mediaType === "image" || m.mediaType === "video" || m.message_type === "image" || m.message_type === "video"));
                const resources = messages.filter((m) => m.mediaUrl && (m.mediaType === "voice" || m.mediaType === "audio" || m.mediaType === "file" || m.message_type === "voice" || m.message_type === "file"));

                const actionBtnStyle = {
                  display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.02)", border: "none",
                  padding: "12px 14px", borderRadius: 12, color: "var(--th-muted)", fontSize: 13, fontWeight: 500,
                  cursor: "pointer", textAlign: "left" as const, transition: "background 0.2s",
                };

                return (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 28 }}>
                      <Avatar src={other?.avatar} name={getChatDisplayName(activeChat, myId)} size={84} online={other?.isOnline} />
                      <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700, color: "var(--th-text)", marginTop: 16, marginBottom: 4 }}>
                        {getChatDisplayName(activeChat, myId)}
                      </h2>
                      {uploadProgress > 0 && <span style={{ fontSize: 10, color: "var(--th-accent)", fontWeight: 700 }}>{uploadProgress}%</span>}
                      {other?.uniqueTag && <span style={{ fontSize: 12, color: "var(--th-accent)", fontFamily: "monospace" }}>{other.uniqueTag}</span>}

                      {/* ── Professional Info Card ── */}
                      {(other?.org_role || other?.organization) && (
                        <div style={{ marginTop: 14, width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid var(--th-border)", borderRadius: 12, padding: "12px 14px", textAlign: "left" }}>
                          {other?.org_role && (
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                              <Icon name="badge" size={14} style={{ color: "var(--th-accent)", flexShrink: 0 }} />
                              <div style={{ display: "flex", flexDirection: "column" }}>
                                <span style={{ fontSize: 10, color: "var(--th-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Professional Role</span>
                                <span style={{ fontSize: 13, color: "var(--th-text)", fontWeight: 700 }}>{other.org_role}</span>
                              </div>
                            </div>
                          )}
                          {other?.organization && (
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <Icon name="business" size={14} style={{ color: "var(--th-muted)", flexShrink: 0 }} />
                              <div style={{ display: "flex", flexDirection: "column" }}>
                                <span style={{ fontSize: 10, color: "var(--th-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Organization</span>
                                <span style={{ fontSize: 12, color: "var(--th-muted)", fontWeight: 500 }}>{other.organization}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {other?.bio && (
                        <div style={{ marginTop: 14, padding: "0 2px", width: "100%", textAlign: "left" }}>
                          <h3 style={{ fontSize: 9, color: "var(--th-muted)", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 6, fontFamily: "'Space Grotesk',sans-serif" }}>Bio</h3>
                          <p style={{ fontSize: 12, color: "var(--th-muted)", lineHeight: 1.6, margin: 0 }}>{other.bio}</p>
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 28 }}>
                      {[{ icon: "call", label: "Call" }, { icon: "videocam", label: "Video" }, { icon: "search", label: "Search" }].map((a) => (
                        <div key={a.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                          <button style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.04)", border: "1px solid var(--th-border)", cursor: "pointer", color: "var(--th-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Icon name={a.icon} size={18} />
                          </button>
                          <span style={{ fontSize: 10, color: "var(--th-muted)", textTransform: "uppercase" }}>{a.label}</span>
                        </div>
                      ))}
                    </div>

                    {other?.status_message && (
                      <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: "12px 14px", marginBottom: 10 }}>
                        <div style={{ fontSize: 10, color: "var(--th-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Status</div>
                        <div style={{ fontSize: 13, color: "var(--th-text)" }}>{other.status_message}</div>
                      </div>
                    )}
                    {other?.isOnline !== undefined && (
                      <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: other.isOnline ? "#4ade80" : "var(--th-muted)" }} />
                        <span style={{ fontSize: 13, color: "var(--th-text)" }}>{other.isOnline ? "Active now" : "Offline"}</span>
                      </div>
                    )}

                    {/* Shared Artifacts */}
                    <div style={{ marginTop: 28 }}>
                      <div style={{ fontSize: 10, color: "var(--th-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
                        Shared Artifacts ({artifacts.length})
                      </div>
                      {artifacts.length > 0 ? (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                          {artifacts.slice(0, 9).map((m, i) => (
                            <a key={m.id || m._id || i} href={getSecureMediaUrl(m.mediaUrl) || ""} target="_blank" rel="noreferrer" style={{ aspectRatio: "1/1", borderRadius: 8, overflow: "hidden", background: "rgba(255,255,255,0.05)", display: "block" }}>
                              {m.mediaType === "image" || m.message_type === "image" ? (
                                <img src={getSecureMediaUrl(m.mediaUrl) || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="Shared image artifact" />
                              ) : (
                                <video src={getSecureMediaUrl(m.mediaUrl) || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              )}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: 13, color: "color-mix(in srgb, var(--th-text) 30%, transparent)", fontStyle: "italic", padding: "8px 0" }}>0 Shared artifacts</div>
                      )}
                    </div>

                    {/* Shared Resources */}
                    <div style={{ marginTop: 28 }}>
                      <div style={{ fontSize: 10, color: "var(--th-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
                        Shared Resources ({resources.length})
                      </div>
                      {resources.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {resources.map((m, i) => (
                            <a key={m.id || m._id || i} href={getSecureMediaUrl(m.mediaUrl) || ""} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.03)", padding: "10px 14px", borderRadius: 12, textDecoration: "none" }}>
                              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "color-mix(in srgb, var(--th-accent) 15%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--th-accent)", flexShrink: 0 }}>
                                <Icon name={(m.mediaType === "voice" || m.mediaType === "audio" || m.message_type === "voice") ? "mic" : "insert_drive_file"} size={18} />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, color: "var(--th-text)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {(m.mediaType === "voice" || m.mediaType === "audio" || m.message_type === "voice") ? "Voice Note" : "Document File"}
                                </div>
                                <div style={{ fontSize: 11, color: "var(--th-muted)", marginTop: 2 }}>
                                  {new Date(m.sentAt || m.createdAt || Date.now()).toLocaleDateString()}
                                </div>
                              </div>
                            </a>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: 13, color: "color-mix(in srgb, var(--th-text) 30%, transparent)", fontStyle: "italic", padding: "8px 0" }}>0 Shared resources</div>
                      )}
                    </div>

                    {/* Admin Actions */}
                    <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 8 }}>
                      <button onClick={() => handleMuteChat(activeChat?.id || activeChat?._id)} style={actionBtnStyle}><Icon name="notifications_off" size={18} />Mute Notifications</button>
                      <button onClick={() => handleClearChat(activeChat?.id || activeChat?._id)} style={actionBtnStyle}><Icon name="delete_sweep" size={18} />Clear Chat</button>
                      <button onClick={() => handleBlockUser(other?.id || other?._id)} style={{ ...actionBtnStyle, color: "#ef4444", background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.1)" }}><Icon name="block" size={18} />Block Identity</button>
                      <button onClick={() => handleReportUser(other?.id || other?._id)} style={{ ...actionBtnStyle, color: "#ef4444", background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.1)" }}><Icon name="report" size={18} />Report Transmission</button>
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
