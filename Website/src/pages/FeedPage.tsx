import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import {
  fetchFeedPosts,
  getTrendingFeedPosts,
  getFollowingFeedPosts,
  createFeedPost,
  likeFeedPost,
  repostFeedPost,
  saveFeedPost,
  addFeedComment,
  getTrendingTags,
  getSuggestedUsers,
  followUser,
} from "@/api";
import { formatDistanceToNow } from "date-fns";
import { AvatarInitials } from "@/components/AvatarInitials";
import { useNavigate } from "react-router-dom";

/* ─── Icon ────────────────────────────────────────────────────────────────── */
const Icon = ({ name, fill = false, className = "", style = {} }: any) => (
  <span
    className={`material-symbols-outlined ${className}`}
    style={{
      fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' ${fill ? 500 : 400}, 'GRAD' 0, 'opsz' 24`,
      lineHeight: 1,
      ...style,
    }}
  >
    {name}
  </span>
);

/* ─── Colour tokens ──────────────────────────────────────────────────────── */
const C = {
  bg:         "var(--th-bg)",
  surface:    "var(--th-surface)",
  surfaceLow: "var(--th-surface-low)",
  surfaceHigh:"var(--th-surface-high)",
  surfaceTop: "var(--th-surface-top)",
  border:     "var(--th-border)",
  accent:     "var(--th-accent)",
  accentText: "var(--th-accent-text)",
  secondary:  "var(--th-secondary)",
  text:       "var(--th-text)",
  muted:      "var(--th-muted)",
  error:      "#ff716c",
  repost:     "#4ade80",
};

/* ─── TopBar ──────────────────────────────────────────────────────────────── */
function TopBar() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const navigate = useNavigate();
  return (
    <header
      style={{
        position: "fixed", top: 0, left: 85, right: 0, height: 72, zIndex: 40,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 32px",
        background: `color-mix(in srgb, var(--th-bg) 85%, transparent)`,
        backdropFilter: "blur(20px)",
        boxShadow: "0 4px 32px rgba(0,0,0,0.4)",
        borderBottom: `1px solid var(--th-border)`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <h1
          style={{
            fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700,
            fontSize: 20, color: "var(--th-accent)", letterSpacing: "0.08em",
            textTransform: "uppercase", margin: 0,
          }}
        >
          FEED
        </h1>
        <div
          style={{
            display: "flex", alignItems: "center", gap: 8,
            background: C.surfaceTop, borderRadius: 999,
            padding: "8px 16px", border: `1px solid var(--th-border)`, width: 320,
          }}
        >
          <Icon name="search" style={{ color: C.muted, fontSize: 18 }} />
          <input
            placeholder="Explore the feed..."
            style={{
              background: "transparent", border: "none", outline: "none",
              fontSize: 14, color: C.text, fontFamily: "'Manrope',sans-serif", width: "100%",
            }}
          />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <button
          onClick={() => navigate('/ai')}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 16px", borderRadius: 12, border: `1px solid color-mix(in srgb, var(--th-accent) 30%, transparent)`,
            background: "color-mix(in srgb, var(--th-accent) 10%, transparent)", color: "var(--th-accent)",
            fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", cursor: "pointer", transition: "all 0.2s"
          }}
          onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--th-accent) 20%, transparent)"}
          onMouseLeave={e => e.currentTarget.style.background = "color-mix(in srgb, var(--th-accent) 10%, transparent)"}
        >
          <Icon name="auto_awesome" style={{ fontSize: 16 }} />
          Summarize Feed
        </button>
        <div style={{ width: 38, height: 38, borderRadius: "50%", border: `2px solid color-mix(in srgb, var(--th-accent) 25%, transparent)`, overflow: "hidden" }}>
          <AvatarInitials name={user.full_name || user.username || "GUEST"} url={user.avatar} className="text-sm" />
        </div>
      </div>
    </header>
  );
}

/* ─── Composer Modal ─────────────────────────────────────────────────────── */
function ComposerModal({ onPostCreated, onClose }: { onPostCreated: (post: any) => void; onClose: () => void }) {
  const [value, setValue] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const handleSubmit = async () => {
    if (!value.trim() && !file) return;
    try {
      setLoading(true);
      const res = await createFeedPost(value, file || undefined);
      onPostCreated(res.post);
      onClose();
    } catch (err) {
      console.error("Post creation failed:", err);
    } finally { setLoading(false); }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.surfaceLow, borderRadius: 20, padding: "28px",
          border: `1px solid var(--th-border)`, width: "90%", maxWidth: 560,
          boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 18, color: C.accent, margin: 0 }}>
            Create Post
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted }}>
            <Icon name="close" style={{ fontSize: 20 }} />
          </button>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          <div style={{ width: 44, height: 44, flexShrink: 0, borderRadius: "50%", overflow: "hidden" }}>
            <AvatarInitials name={user.full_name || user.username || "GUEST"} url={user.avatar} className="text-lg" />
          </div>
          <div style={{ flex: 1 }}>
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="What's on your mind?"
              autoFocus
              style={{
                width: "100%", background: "transparent", border: "none", outline: "none",
                fontSize: 16, color: C.text, fontFamily: "'Manrope',sans-serif",
                resize: "none", minHeight: 100,
              }}
            />
            {file && (
              <div style={{ position: "relative", marginBottom: 12, width: "fit-content" }}>
                <img src={URL.createObjectURL(file)} style={{ height: 110, borderRadius: 10, border: `1px solid var(--th-border)` }} alt="preview" />
                <button
                  onClick={() => setFile(null)}
                  style={{ position: "absolute", top: -8, right: -8, background: C.error, color: "#fff", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}
                >
                  <Icon name="close" style={{ fontSize: 14 }} />
                </button>
              </div>
            )}
            <div
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginTop: 12, paddingTop: 12,
                borderTop: `1px solid color-mix(in srgb, var(--th-border) 60%, transparent)`,
              }}
            >
              <div style={{ display: "flex", gap: 12, color: C.secondary }}>
                <label style={{ cursor: "pointer", display: "flex" }}>
                  <Icon name="image" style={{ fontSize: 22 }} />
                  <input type="file" hidden accept="image/*,video/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                </label>
                <button disabled style={{ background: "none", border: "none", color: "rgba(162,194,253,0.3)" }}><Icon name="gif_box" style={{ fontSize: 22 }} /></button>
                <button disabled style={{ background: "none", border: "none", color: "rgba(162,194,253,0.3)" }}><Icon name="poll" style={{ fontSize: 22 }} /></button>
                <button disabled style={{ background: "none", border: "none", color: "rgba(162,194,253,0.3)" }}><Icon name="tag" style={{ fontSize: 22 }} /></button>
              </div>
              <button
                onClick={handleSubmit}
                disabled={loading || (!value.trim() && !file)}
                style={{
                  background: C.accent, color: C.accentText, padding: "8px 28px",
                  borderRadius: 999, fontFamily: "'Space Grotesk',sans-serif",
                  fontWeight: 700, fontSize: 13, letterSpacing: "0.06em",
                  border: "none", cursor: "pointer",
                  opacity: (loading || (!value.trim() && !file)) ? 0.5 : 1,
                }}
              >
                {loading ? "POSTING..." : "POST"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Stat Button ─────────────────────────────────────────────────────────── */
function StatBtn({ icon, count, hoverColor, active = false, activeColor, onClick, filled }: any) {
  const [hov, setHov] = useState(false);
  const col = active ? (activeColor || hoverColor) : hov ? hoverColor : C.muted;
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 5,
        background: "none", border: "none", cursor: onClick ? "pointer" : "default",
        color: col, transition: "color 0.2s", padding: "4px 0",
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <Icon name={icon} fill={filled || active} style={{ fontSize: 19 }} />
      {count !== undefined && (
        <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 13 }}>{count}</span>
      )}
    </button>
  );
}

/* ─── Comment Panel ───────────────────────────────────────────────────────── */
function CommentPanel({ postId, comments: initComments }: { postId: string; comments: any[] }) {
  const [comments, setComments] = useState(initComments);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const submit = async () => {
    if (!text.trim()) return;
    try {
      setLoading(true);
      const res = await addFeedComment(postId, text);
      setComments(res.comments);
      setText("");
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid color-mix(in srgb, var(--th-border) 40%, transparent)` }}>
      {comments.slice(0, 3).map((c: any, i: number) => (
        <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "flex-start" }}>
          <div style={{ width: 28, height: 28, flexShrink: 0, borderRadius: "50%", overflow: "hidden" }}>
             <AvatarInitials name={c.user?.full_name || c.user?.username || "G"} url={c.user?.avatar} className="text-xs" />
          </div>
          <div>
            <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 12, color: C.text }}>{c.user?.username || "user"} </span>
            <span style={{ fontSize: 13, color: C.muted, fontFamily: "'Manrope',sans-serif" }}>{c.text}</span>
          </div>
        </div>
      ))}
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <div style={{ width: 28, height: 28, flexShrink: 0, borderRadius: "50%", overflow: "hidden" }}>
           <AvatarInitials name={user.full_name || user.username || "G"} url={user.avatar} className="text-xs" />
        </div>
        <input
          value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Add a reply..."
          style={{
            flex: 1, background: C.surfaceTop, border: "none", outline: "none",
            borderRadius: 999, padding: "6px 14px", fontSize: 13,
            color: C.text, fontFamily: "'Manrope',sans-serif",
          }}
        />
        <button
          onClick={submit} disabled={loading || !text.trim()}
          style={{ background: C.accent, color: C.accentText, border: "none", borderRadius: 999, padding: "0 16px", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "'Space Grotesk',sans-serif", opacity: loading || !text.trim() ? 0.4 : 1 }}
        >
          REPLY
        </button>
      </div>
    </div>
  );
}

/* ─── Post Menu ───────────────────────────────────────────────────────────── */
function PostMenu({ post, onClose }: { post: any; onClose: () => void }) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isFollowing = false; // TODO: wire real follow state
  const handleSave = async () => { try { await saveFeedPost(post._id); } catch(e) {} onClose(); };
  const handleCopy = () => { navigator.clipboard.writeText(`${window.location.origin}/post/${post._id}`); onClose(); };

  const items = [
    { label: "Not Interested", icon: "sentiment_dissatisfied", action: onClose },
    { label: "Restrict", icon: "do_not_disturb_on", action: onClose },
    { label: "Block", icon: "block", action: onClose, danger: true },
    ...(post.author?._id !== user._id
      ? [{ label: isFollowing ? "Unfollow" : "Follow", icon: isFollowing ? "person_remove" : "person_add", action: onClose }]
      : []),
    { label: "Report", icon: "flag", action: onClose, danger: true },
    { label: "Copy Link", icon: "link", action: handleCopy },
    { label: "Save Post", icon: "bookmark", action: handleSave },
  ];

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 99 }} />
      {/* Menu */}
      <div style={{
        position: "absolute", top: 28, right: 0,
        background: C.surfaceHigh, borderRadius: 14,
        border: `1px solid var(--th-border)`, padding: "6px 0",
        width: 190, zIndex: 100, boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
      }}>
        {items.map((item) => (
          <button
            key={item.label}
            onClick={item.action}
            style={{
              width: "100%", textAlign: "left", padding: "9px 16px",
              background: "none", border: "none",
              color: (item as any).danger ? C.error : C.text,
              cursor: "pointer", fontFamily: "'Manrope',sans-serif", fontSize: 13,
              display: "flex", alignItems: "center", gap: 10,
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = `color-mix(in srgb, var(--th-accent) 7%, transparent)`}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          >
            <Icon name={item.icon} style={{ fontSize: 16, color: (item as any).danger ? C.error : C.muted }} />
            {item.label}
          </button>
        ))}
      </div>
    </>
  );
}

/* ─── Post ────────────────────────────────────────────────────────────────── */
function PostItem({ post }: { post: any }) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [liked, setLiked] = useState(post.likes?.includes(user._id));
  const [likeCount, setLikeCount] = useState(post.likes?.length || 0);
  const [reposted, setReposted] = useState(post.reposts?.includes(user._id));
  const [repostCount, setRepostCount] = useState(post.reposts?.length || 0);
  const [showComments, setShowComments] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleLike = async () => {
    try {
      const res = await likeFeedPost(post._id);
      setLiked(res.liked); setLikeCount(res.likeCount);
    } catch (err) { console.error(err); }
  };

  const handleRepost = async () => {
    try {
      const res = await repostFeedPost(post._id);
      setReposted(res.reposted); setRepostCount(res.repostCount);
    } catch (err) { console.error(err); }
  };

  return (
    <article
      style={{
        background: hovered ? `color-mix(in srgb, var(--th-surface) 70%, transparent)` : `color-mix(in srgb, var(--th-surface) 40%, transparent)`,
        padding: 24, borderRadius: 16,
        border: `1px solid color-mix(in srgb, var(--th-border) 60%, transparent)`,
        transition: "background 0.2s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: "flex", gap: 14 }}>
        <div style={{ width: 44, height: 44, flexShrink: 0, borderRadius: "50%", overflow: "hidden" }}>
          <AvatarInitials name={post.author?.full_name || post.author?.username || "U"} url={post.author?.avatar} className="text-lg" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <div>
              <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15, color: C.text }}>{post.author?.full_name}</span>
              <span style={{ fontFamily: "'Space Grotesk',sans-serif", color: C.muted, fontSize: 12, marginLeft: 8 }}>
                @{post.author?.username} · {formatDistanceToNow(new Date(post.createdAt))} ago
              </span>
            </div>
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4, borderRadius: 6, transition: "background 0.15s" }}
                onMouseEnter={(e) => e.currentTarget.style.background = `color-mix(in srgb, var(--th-accent) 10%, transparent)`}
                onMouseLeave={(e) => e.currentTarget.style.background = "none"}
              >
                <Icon name="more_horiz" style={{ fontSize: 20 }} />
              </button>
              {showMenu && <PostMenu post={post} onClose={() => setShowMenu(false)} />}
            </div>
          </div>

          {/* Content */}
          <p style={{ color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 15, lineHeight: 1.7, marginBottom: 14, whiteSpace: "pre-wrap" }}>
            {post.content}
          </p>

          {/* Media */}
          {post.mediaUrl && (
            <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid var(--th-border)`, marginBottom: 16 }}>
              {post.mediaType === "video" ? (
                <video src={post.mediaUrl} controls style={{ width: "100%", display: "block" }} />
              ) : (
                <img src={post.mediaUrl} alt="Post media" style={{ width: "100%", maxHeight: 480, objectFit: "cover", display: "block" }} />
              )}
            </div>
          )}

          {/* Actions — only Comments, Reposts, Like */}
          <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
            <StatBtn
              icon="mode_comment" count={post.comments?.length}
              hoverColor={C.accent} onClick={() => setShowComments((v) => !v)}
              active={showComments} activeColor={C.accent}
            />
            <StatBtn
              icon="cached" count={repostCount}
              hoverColor={C.repost} onClick={handleRepost}
              active={reposted} activeColor={C.repost}
            />
            <StatBtn
              icon="favorite" count={likeCount}
              hoverColor={C.error} onClick={handleLike}
              active={liked} activeColor={C.error} filled={liked}
            />
          </div>

          {/* Comments panel */}
          {showComments && (
            <CommentPanel postId={post._id} comments={post.comments || []} />
          )}
        </div>
      </div>
    </article>
  );
}

/* ─── Right Sidebar ───────────────────────────────────────────────────────── */
function RightSidebar() {
  const navigate = useNavigate();
  const [trending, setTrending] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  useEffect(() => {
    const loadSidebars = async () => {
      try {
        const [tagsRes, suggRes] = await Promise.all([
          getTrendingTags().catch(() => ({ data: [] })),
          getSuggestedUsers().catch(() => ({ suggestions: [] }))
        ]);
        setTrending(tagsRes.data || []);
        setSuggestions(suggRes.suggestions || []);
      } catch { } // ignore
    };
    loadSidebars();
  }, []);

  const handleFollow = async (id: string, index: number) => {
    try {
      await followUser(id);
      setSuggestions(prev => prev.filter((_, i) => i !== index));
    } catch {}
  };

  return (
    <aside style={{ padding: "32px 28px" }}>
      <div style={{ position: "sticky", top: 104, display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Aida Luminous CTA — yellow accent */}
        <div style={{
          background: "linear-gradient(135deg, rgba(255,231,146,0.12), rgba(255,231,146,0.04))",
          border: "1px solid rgba(255,231,146,0.25)",
          borderRadius: 16, padding: "18px 20px",
          display: "flex", flexDirection: "column", gap: 10
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#ffe792", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: 16, color: "#655400" }}>A</span>
            </div>
            <div>
              <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14, color: "#ffe792", margin: 0 }}>Aida Luminous</p>
              <p style={{ fontSize: 11, color: "rgba(255,231,146,0.6)", margin: 0 }}>Your AI companion</p>
            </div>
          </div>
          <p style={{ fontSize: 12, color: "rgba(255,231,146,0.7)", fontFamily: "'Manrope',sans-serif", margin: 0, lineHeight: 1.5 }}>
            Ask me anything about your feed, connections, or community insights.
          </p>
          <button style={{
            background: "#ffe792", color: "#655400", border: "none",
            borderRadius: 999, padding: "7px 16px", fontFamily: "'Space Grotesk',sans-serif",
            fontWeight: 700, fontSize: 11, letterSpacing: "0.06em", cursor: "pointer",
            alignSelf: "flex-start",
          }} onClick={() => navigate('/ai')}>
            ASK AIDA
          </button>
        </div>

        {/* Trending */}
        <div style={{ background: C.surfaceLow, borderRadius: 16, border: `1px solid var(--th-border)`, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid var(--th-border)` }}>
            <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 16, color: C.accent, margin: 0 }}>
              Trending
            </h3>
          </div>
          {trending.length > 0 ? trending.slice(0, 4).map((t, i) => (
            <div key={i} style={{ padding: "12px 20px", borderBottom: i < trending.length - 1 ? `1px solid color-mix(in srgb, var(--th-border) 50%, transparent)` : "none", cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = C.surfaceTop)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: C.text, margin: 0 }}>{t.tag}</p>
              <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 11, color: C.muted, margin: "2px 0 0" }}>{t.count} posts</p>
            </div>
          )) : (
            <div style={{ padding: "12px 20px", color: C.muted, fontSize: 13 }}>No trending tags yet.</div>
          )}
        </div>

        {/* Suggested */}
        <div style={{ background: C.surfaceLow, borderRadius: 16, border: `1px solid var(--th-border)`, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid var(--th-border)` }}>
            <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 16, color: C.accent, margin: 0 }}>
              Who to Follow
            </h3>
          </div>
          {suggestions.length > 0 ? suggestions.slice(0, 3).map((s, i) => (
            <div key={s._id || i} style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: i < suggestions.length - 1 ? `1px solid color-mix(in srgb, var(--th-border) 50%, transparent)` : "none" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", overflow: "hidden" }}>
                  <AvatarInitials name={s.full_name || s.username || "U"} url={s.avatar} className="text-sm" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: C.text, margin: 0 }}>{s.full_name || s.username}</p>
                <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 11, color: C.muted, margin: 0 }}>{s.uniqueTag || `@${s.username}`}</p>
              </div>
              <button 
                onClick={() => handleFollow(s._id, i)}
                style={{ padding: "5px 14px", border: `1px solid var(--th-accent)`, borderRadius: 999, background: "transparent", color: C.accent, fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 11, cursor: "pointer", transition: "background 0.2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = `color-mix(in srgb, var(--th-accent) 15%, transparent)`; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                FOLLOW
              </button>
            </div>
          )) : (
            <div style={{ padding: "12px 20px", color: C.muted, fontSize: 13 }}>No suggestions right now.</div>
          )}
        </div>
      </div>
    </aside>
  );
}

/* ─── Custom Dropdown ─────────────────────────────────────────────────────── */
const TABS = ["For You", "Following", "Latest"];

function FeedDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          background: C.surfaceTop, border: `1px solid var(--th-border)`,
          borderRadius: 12, padding: "9px 18px", cursor: "pointer",
          color: C.accent, fontFamily: "'Space Grotesk',sans-serif",
          fontWeight: 700, fontSize: 14, transition: "border-color 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = `color-mix(in srgb, var(--th-accent) 40%, transparent)`)}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = `var(--th-border)`)}
      >
        {value}
        <Icon name={open ? "expand_less" : "expand_more"} style={{ fontSize: 18, color: C.muted }} />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", left: "50%",
          transform: "translateX(-50%)",
          background: C.surfaceHigh, borderRadius: 14,
          border: `1px solid var(--th-border)`, padding: "6px 0",
          minWidth: 160, zIndex: 50,
          boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
        }}>
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => { onChange(tab); setOpen(false); }}
              style={{
                width: "100%", textAlign: "left", padding: "10px 18px",
                background: "none", border: "none",
                color: tab === value ? C.accent : C.text,
                fontFamily: "'Manrope',sans-serif", fontSize: 14,
                cursor: "pointer", fontWeight: tab === value ? 700 : 400,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = `color-mix(in srgb, var(--th-accent) 8%, transparent)`)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {tab}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Root ────────────────────────────────────────────────────────────────── */
export default function BubbleFeed() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("For You");
  const [showComposer, setShowComposer] = useState(false);

  const loadPosts = async () => {
    try {
      setLoading(true);
      let data: any;
      if (activeTab === "For You") {
        data = await getTrendingFeedPosts(1, 40);
      } else if (activeTab === "Following") {
        data = await getFollowingFeedPosts(1, 40);
      } else {
        data = await fetchFeedPosts(1, 40);
      }
      setPosts(data.posts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPosts(); }, [activeTab]);

  return (
    <div style={{ background: "var(--th-bg)", color: "var(--th-text)", minHeight: "100vh", fontFamily: "'Manrope', sans-serif", position: "relative", overflow: "hidden" }}>
      <Sidebar />
      <TopBar />

      {/* Glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] blur-[120px] rounded-full pointer-events-none z-0 transition-colors"
        style={{ background: "var(--th-glow)" }} />
      <div className="absolute top-[40%] left-[-10%] w-[30%] h-[40%] blur-[120px] rounded-full pointer-events-none z-0 transition-colors"
        style={{ background: "color-mix(in srgb, var(--th-secondary) 15%, transparent)" }} />

      <main style={{ marginLeft: 85, paddingTop: 72, display: "flex", minHeight: "100vh", background: "transparent", position: "relative", zIndex: 10 }}>
        {/* Feed column */}
        <section style={{ flex: 1, borderRight: `1px solid var(--th-border)`, minWidth: 0 }}>
          {/* Centered Dropdown bar — no title */}
          <div style={{
            padding: "16px 24px", borderBottom: `1px solid var(--th-border)`,
            position: "sticky", top: 72,
            background: `color-mix(in srgb, var(--th-bg) 90%, transparent)`,
            backdropFilter: "blur(12px)", zIndex: 30,
            display: "flex", justifyContent: "center", alignItems: "center",
          }}>
            <FeedDropdown value={activeTab} onChange={setActiveTab} />
          </div>

          {/* Posts */}
          <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 24px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {loading ? (
                Array(4).fill(0).map((_, i) => (
                  <div key={i} style={{ height: 120, borderRadius: 16, background: C.surfaceLow, marginBottom: 8, animation: "pulse 1.5s ease-in-out infinite" }} />
                ))
              ) : posts.length === 0 ? (
                <div style={{ textAlign: "center", padding: "64px 0", color: C.muted }}>
                  <Icon name="rss_feed" style={{ fontSize: 48, display: "block", margin: "0 auto 16px" }} />
                  <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600 }}>No transmissions yet</p>
                  <p style={{ fontSize: 13, marginTop: 4 }}>Be the first to post something.</p>
                </div>
              ) : (
                posts.map((post) => (
                  <div key={post._id} style={{ paddingBottom: 8 }}>
                    <PostItem post={post} />
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Right panel */}
        <div className="hidden lg:block" style={{ width: 360, flexShrink: 0 }}>
          <RightSidebar />
        </div>
      </main>

      {/* Floating + button (bottom right) */}
      <button
        onClick={() => setShowComposer(true)}
        title="Create Post"
        style={{
          position: "fixed", bottom: 36, right: 36, zIndex: 90,
          width: 56, height: 56, borderRadius: "50%",
          background: C.accent, color: C.accentText,
          border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 8px 32px color-mix(in srgb, var(--th-accent) 35%, transparent)`,
          transition: "transform 0.2s, box-shadow 0.2s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; e.currentTarget.style.boxShadow = `0 12px 40px color-mix(in srgb, var(--th-accent) 50%, transparent)`; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = `0 8px 32px color-mix(in srgb, var(--th-accent) 35%, transparent)`; }}
      >
        <Icon name="add" style={{ fontSize: 28 }} />
      </button>

      {/* Composer modal */}
      {showComposer && (
        <ComposerModal
          onPostCreated={(p) => { setPosts([p, ...posts]); setShowComposer(false); }}
          onClose={() => setShowComposer(false)}
        />
      )}
    </div>
  );
}