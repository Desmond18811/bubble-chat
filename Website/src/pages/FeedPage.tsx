import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import {
  fetchFeedPosts,
  createFeedPost,
  likeFeedPost,
  repostFeedPost,
  saveFeedPost,
  addFeedComment,
} from "@/api";
import { formatDistanceToNow } from "date-fns";
import { AvatarInitials } from "@/components/AvatarInitials";

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

/* ─── Colour tokens (CSS-var aware) ─────────────────────────────────────── */
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
            fontSize: 22, color: "var(--th-accent)", letterSpacing: "-0.04em", margin: 0,
          }}
        >
          BUBBLE
        </h1>
        <div
          style={{
            display: "flex", alignItems: "center", gap: 8,
            background: C.surfaceTop, borderRadius: 999,
            padding: "8px 16px", border: `1px solid var(--th-border)`, width: 340,
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
        {["notifications", "settings"].map((name) => (
          <button
            key={name}
            style={{ background: "none", border: "none", cursor: "pointer", color: C.secondary, transition: "color 0.2s" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = C.accent)}
            onMouseLeave={(e) => (e.currentTarget.style.color = C.secondary)}
          >
            <Icon name={name} style={{ fontSize: 22 }} />
          </button>
        ))}
        <div style={{ width: 38, height: 38, borderRadius: "50%", border: `2px solid color-mix(in srgb, var(--th-accent) 25%, transparent)`, overflow: "hidden" }}>
          <AvatarInitials name={user.full_name || user.username || "GUEST"} url={user.avatar} className="text-sm" />
        </div>
      </div>
    </header>
  );
}

/* ─── Composer ────────────────────────────────────────────────────────────── */
function Composer({ onPostCreated }: { onPostCreated: (post: any) => void }) {
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
      setValue(""); setFile(null);
    } catch (err) {
      console.error("Post creation failed:", err);
    } finally { setLoading(false); }
  };

  return (
    <div
      style={{
        background: C.surfaceLow, padding: "20px 24px",
        borderRadius: 16, marginBottom: 32,
        border: `1px solid var(--th-border)`,
      }}
    >
      <div style={{ display: "flex", gap: 14 }}>
        <div style={{ width: 44, height: 44, flexShrink: 0, borderRadius: "50%", overflow: "hidden" }}>
          <AvatarInitials name={user.full_name || user.username || "GUEST"} url={user.avatar} className="text-lg" />
        </div>
        <div style={{ flex: 1 }}>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Transmit a thought to the observatory..."
            style={{
              width: "100%", background: "transparent", border: "none", outline: "none",
              fontSize: 17, color: C.text, fontFamily: "'Manrope',sans-serif",
              resize: "none", minHeight: 80,
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
                border: "none", cursor: "pointer", transition: "filter 0.2s",
                opacity: (loading || (!value.trim() && !file)) ? 0.5 : 1,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.1)")}
              onMouseLeave={(e) => (e.currentTarget.style.filter = "brightness(1)")}
            >
              {loading ? "POSTING..." : "POST"}
            </button>
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

/* ─── Post ────────────────────────────────────────────────────────────────── */
function PostItem({ post }: { post: any }) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [liked, setLiked] = useState(post.likes?.includes(user._id));
  const [likeCount, setLikeCount] = useState(post.likes?.length || 0);
  const [reposted, setReposted] = useState(post.reposts?.includes(user._id));
  const [repostCount, setRepostCount] = useState(post.reposts?.length || 0);
  const [saved, setSaved] = useState(post.saves?.includes(user._id));
  const [saveCount, setSaveCount] = useState(post.saves?.length || 0);
  const [showComments, setShowComments] = useState(false);
  const [hovered, setHovered] = useState(false);

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

  const handleSave = async () => {
    try {
      const res = await saveFeedPost(post._id);
      setSaved(res.saved); setSaveCount(res.saveCount);
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
            <button style={{ background: "none", border: "none", cursor: "pointer", color: C.muted }}>
              <Icon name="more_horiz" style={{ fontSize: 20 }} />
            </button>
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

          {/* Actions */}
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
            <StatBtn
              icon="share" hoverColor={C.secondary}
            />
            {/* Spacer */}
            <div style={{ flex: 1 }} />
            <button
              onClick={handleSave}
              title={saved ? "Unsave" : "Save"}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                background: "none", border: "none", cursor: "pointer",
                color: saved ? C.accent : C.muted,
                transition: "color 0.2s, transform 0.15s",
                transform: saved ? "scale(1.05)" : "scale(1)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = C.accent; e.currentTarget.style.transform = "scale(1.1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = saved ? C.accent : C.muted; e.currentTarget.style.transform = "scale(1)"; }}
            >
              <Icon name="bookmark" fill={saved} style={{ fontSize: 20 }} />
              {saveCount > 0 && (
                <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 12 }}>{saveCount}</span>
              )}
            </button>
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
  const trending = [
    { tag: "#Crystalline", count: "245 transmissions" },
    { tag: "#DeepObservatory", count: "182 transmissions" },
    { tag: "#SpaceGrotesk", count: "131 transmissions" },
    { tag: "#Web3Collectives", count: "98 transmissions" },
  ];
  const suggestions = [
    { name: "Nova Vance", handle: "@nova_v", avatar: "/placeholder-user.jpg" },
    { name: "Orion Blake", handle: "@orion_bk", avatar: "/placeholder-user.jpg" },
  ];

  return (
    <aside style={{ padding: "32px 28px" }}>
      <div style={{ position: "sticky", top: 104, display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Trending */}
        <div style={{ background: C.surfaceLow, borderRadius: 16, border: `1px solid var(--th-border)`, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid var(--th-border)` }}>
            <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 16, color: C.accent, margin: 0 }}>
              Trending
            </h3>
          </div>
          {trending.map((t, i) => (
            <div key={i} style={{ padding: "12px 20px", borderBottom: i < trending.length - 1 ? `1px solid color-mix(in srgb, var(--th-border) 50%, transparent)` : "none", cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = C.surfaceTop)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: C.text, margin: 0 }}>{t.tag}</p>
              <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 11, color: C.muted, margin: "2px 0 0" }}>{t.count}</p>
            </div>
          ))}
        </div>

        {/* Suggested */}
        <div style={{ background: C.surfaceLow, borderRadius: 16, border: `1px solid var(--th-border)`, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid var(--th-border)` }}>
            <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 16, color: C.accent, margin: 0 }}>
              Who to Follow
            </h3>
          </div>
          {suggestions.map((s, i) => (
            <div key={i} style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: i < suggestions.length - 1 ? `1px solid color-mix(in srgb, var(--th-border) 50%, transparent)` : "none" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", overflow: "hidden" }}>
                  <AvatarInitials name={s.name || "U"} url={s.avatar !== "/placeholder-user.jpg" ? s.avatar : undefined} className="text-sm" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: C.text, margin: 0 }}>{s.name}</p>
                <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 11, color: C.muted, margin: 0 }}>{s.handle}</p>
              </div>
              <button style={{ padding: "5px 14px", border: `1px solid var(--th-accent)`, borderRadius: 999, background: "transparent", color: C.accent, fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 11, cursor: "pointer", transition: "background 0.2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = `color-mix(in srgb, var(--th-accent) 15%, transparent)`; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                FOLLOW
              </button>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

/* ─── Feed Tabs ───────────────────────────────────────────────────────────── */
const TABS = ["For You", "Following", "Latest"];

/* ─── Root ────────────────────────────────────────────────────────────────── */
export default function BubbleFeed() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("For You");

  const loadPosts = async () => {
    try {
      setLoading(true);
      const data = await fetchFeedPosts(1, 40);
      setPosts(data.posts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPosts(); }, []);

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
          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: `1px solid var(--th-border)`, position: "sticky", top: 72, background: `color-mix(in srgb, var(--th-bg) 90%, transparent)`, backdropFilter: "blur(12px)", zIndex: 30 }}>
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1, padding: "14px 0", background: "none", border: "none", cursor: "pointer",
                  fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13,
                  color: activeTab === tab ? C.accent : C.muted,
                  borderBottom: activeTab === tab ? `2px solid var(--th-accent)` : "2px solid transparent",
                  transition: "color 0.2s, border-color 0.2s",
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Posts */}
          <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 24px" }}>
            <Composer onPostCreated={(p) => setPosts([p, ...posts])} />
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
    </div>
  );
}