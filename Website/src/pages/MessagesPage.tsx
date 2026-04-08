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
        setResults(res.data || res.users || []);
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
const StoryModal = ({
  onClose,
  onStoryUploaded,
}: {
  onClose: () => void;
  onStoryUploaded: (story: any) => void;
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!file) { toast.error("Select a file first"); return; }
    setUploading(true);
    try {
      const res = await api.uploadStory(file, caption || undefined);
      onStoryUploaded(res.story || res);
      toast.success("Story posted!");
      onClose();
    } catch {
      toast.error("Story upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(12px)",
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
          width: 420,
          background: "#031427",
          border: "1px solid rgba(59,73,92,0.3)",
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
        }}
      >
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
            New Signal
          </h2>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#9eacc3" }}
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        <div style={{ padding: 24 }}>
          {/* Drop zone */}
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              border: "2px dashed rgba(255,231,146,0.2)",
              borderRadius: 16,
              padding: 32,
              textAlign: "center",
              cursor: "pointer",
              marginBottom: 20,
              position: "relative",
              overflow: "hidden",
              minHeight: 180,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {preview ? (
              file?.type.startsWith("video/") ? (
                <video
                  src={preview}
                  style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 10 }}
                  controls
                />
              ) : (
                <img
                  src={preview}
                  style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 10, objectFit: "cover" }}
                />
              )
            ) : (
              <div>
                <Icon name="add_photo_alternate" size={40} style={{ color: "#ffe792", opacity: 0.6 }} />
                <p style={{ color: "#9eacc3", fontSize: 13, marginTop: 12 }}>
                  Click to select image or video
                </p>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" hidden accept="image/*,video/*,audio/*" onChange={handleFile} />

          <input
            placeholder="Add a caption... (optional)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            style={{
              width: "100%",
              background: "#071a2f",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 12,
              padding: "12px 16px",
              fontSize: 14,
              color: "#d8e6ff",
              outline: "none",
              boxSizing: "border-box",
              fontFamily: "'Manrope', sans-serif",
              marginBottom: 16,
            }}
          />

          <button
            onClick={submit}
            disabled={uploading || !file}
            style={{
              width: "100%",
              background: uploading || !file ? "rgba(255,231,146,0.3)" : "#ffe792",
              color: "#655400",
              border: "none",
              borderRadius: 12,
              padding: "14px 0",
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: 14,
              cursor: uploading || !file ? "not-allowed" : "pointer",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            {uploading ? "Transmitting..." : "Broadcast Signal"}
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
        setMessages(res.messages || []);
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
    const file = await voice.stop();
    if (!file) return;
    try {
      toast.info("Sending voice note...");
      const res = await api.sendMediaMessage(activeChat.id || activeChat._id, file);
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
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}
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
                          {msg.mediaUrl && msg.mediaType === "image" && (
                            <img src={msg.mediaUrl} style={{ maxWidth: "100%", borderRadius: 10, marginTop: msg.content ? 8 : 0 }} alt="" />
                          )}
                          {msg.mediaUrl && msg.mediaType === "video" && (
                            <video src={msg.mediaUrl} controls style={{ maxWidth: "100%", borderRadius: 10, marginTop: msg.content ? 8 : 0 }} />
                          )}
                          {msg.mediaUrl && (msg.mediaType === "voice" || msg.mediaType === "audio") && (
                            <audio src={msg.mediaUrl} controls style={{ width: "100%", marginTop: msg.content ? 8 : 0 }} />
                          )}
                          {msg.mediaUrl && !["image", "video", "voice", "audio"].includes(msg.mediaType) && (
                            <a
                              href={msg.mediaUrl}
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
                              }}
                            >
                              <Icon name="attach_file" size={16} />
                              Attachment
                            </a>
                          )}
                          <span
                            style={{
                              fontSize: 10,
                              color: isMine ? "rgba(26,10,0,0.5)" : "#68768b",
                              display: "block",
                              textAlign: "right",
                              marginTop: 4,
                            }}
                          >
                            {new Date(msg.sentAt || msg.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
                        <p style={{ fontSize: 12, color: "#9eacc3", marginTop: 10, lineHeight: 1.6 }}>
                          {other.bio}
                        </p>
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