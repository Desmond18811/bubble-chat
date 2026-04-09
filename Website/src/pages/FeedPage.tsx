import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import {
  fetchFeedPosts,
  createFeedPost,
  likeFeedPost,
  repostFeedPost,
  addFeedComment
} from "@/api";
import { formatDistanceToNow } from "date-fns";


/* ─── Icon helper ─────────────────────────────────────────────────────────── */
const Icon = ({ name, fill = false, className = "", style = {} }: any) => (
  <span
    className={`material-symbols-outlined ${className}`}
    style={{ fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`, lineHeight: 1, ...style }}
  >
    {name}
  </span>
);

/* ─── colour tokens ───────────────────────────────────────────────────────── */
const C = {
  bg: "#010f20",
  surface: "#071a2f",
  surfaceLow: "#031427",
  surfaceHigh: "#0c2037",
  surfaceTop: "#11273f",
  border: "rgba(59,73,92,0.15)",
  borderSoft: "rgba(59,73,92,0.1)",
  accent: "#ffe792",
  accentDim: "#efc900",
  secondary: "#a2c2fd",
  text: "#d8e6ff",
  muted: "#9eacc3",
  error: "#ff716c",
};

/* ─── TopBar ──────────────────────────────────────────────────────────────── */
function TopBar() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  return (
    <header style={{
      position: "fixed", top: 0, left: 85, right: 0, height: 80, zIndex: 40,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 32px",
      background: "rgba(1,15,32,0.85)", backdropFilter: "blur(20px)",
      boxShadow: "0 4px 32px rgba(0,0,0,0.5)", borderBottom: `1px solid ${C.border}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 24, color: C.accent, letterSpacing: "-0.04em", margin: 0 }}>
          BUBBLE
        </h1>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: C.surfaceTop, borderRadius: 999,
          padding: "8px 16px", border: `1px solid rgba(59,73,92,0.15)`, width: 384,
        }}>
          <Icon name="search" style={{ color: C.muted, fontSize: 20 }} />
          <input placeholder="Explore the Luminous..." style={{
            background: "transparent", border: "none", outline: "none",
            fontSize: 14, color: C.text, fontFamily: "'Manrope',sans-serif", width: "100%",
          }} />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <div style={{ display: "flex", gap: 16, color: C.secondary }}>
          {["notifications", "help", "settings"].map(name => (
            <button key={name} style={{ background: "none", border: "none", cursor: "pointer", color: C.secondary, transition: "color 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.color = C.accent}
              onMouseLeave={e => e.currentTarget.style.color = C.secondary}
            >
              <Icon name={name} style={{ fontSize: 22 }} />
            </button>
          ))}
        </div>
        <div style={{ width: 40, height: 40, borderRadius: "50%", padding: 2, border: `1px solid rgba(255,231,146,0.2)`, background: C.surfaceHigh, overflow: "hidden" }}>
          <img src={user.avatar || "/placeholder-user.jpg"} alt="Profile" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
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

  const handleSubmit = async () => {
    if (!value.trim() && !file) return;
    try {
      setLoading(true);
      const res = await createFeedPost(value, file || undefined);
      onPostCreated(res.post);
      setValue("");
      setFile(null);
    } catch (err) {
      console.error("Post creation failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: C.surfaceLow, padding: 24, borderRadius: 12, marginBottom: 48, border: `1px solid rgba(59,73,92,0.05)` }}>
      <div style={{ display: "flex", gap: 16 }}>
        <img
          src={JSON.parse(localStorage.getItem("user") || "{}").avatar || "/placeholder-user.jpg"}
          alt="Me"
          style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
        />
        <div style={{ flex: 1 }}>
          <textarea
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="Transmit a thought to the observatory..."
            style={{
              width: "100%", background: "transparent", border: "none", outline: "none",
              fontSize: 18, color: C.text, fontFamily: "'Manrope',sans-serif",
              resize: "none", height: 96,
            }}
          />
          {file && (
            <div style={{ position: "relative", marginBottom: 16, width: "fit-content" }}>
              <img src={URL.createObjectURL(file)} style={{ height: 120, borderRadius: 8, border: `1px solid ${C.border}` }} />
              <button onClick={() => setFile(null)} style={{ position: "absolute", top: -8, right: -8, background: C.error, color: "#fff", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}>
                <Icon name="close" style={{ fontSize: 16 }} />
              </button>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, paddingTop: 16, borderTop: `1px solid rgba(59,73,92,0.1)` }}>
            <div style={{ display: "flex", gap: 16, color: C.secondary }}>
              <label style={{ cursor: "pointer" }}>
                <Icon name="image" style={{ fontSize: 22 }} />
                <input type="file" hidden accept="image/*,video/*" onChange={e => setFile(e.target.files?.[0] || null)} />
              </label>
              <button disabled style={{ background: "none", border: "none", color: "rgba(162,194,253,0.3)" }}><Icon name="gif_box" style={{ fontSize: 22 }} /></button>
              <button disabled style={{ background: "none", border: "none", color: "rgba(162,194,253,0.3)" }}><Icon name="poll" style={{ fontSize: 22 }} /></button>
              <button disabled style={{ background: "none", border: "none", color: "rgba(162,194,253,0.3)" }}><Icon name="sentiment_satisfied" style={{ fontSize: 22 }} /></button>
            </div>
            <button
              onClick={handleSubmit}
              disabled={loading || (!value.trim() && !file)}
              style={{
                background: C.accent, color: "#655400", padding: "8px 32px", borderRadius: 999,
                fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14,
                letterSpacing: "0.05em", border: "none", cursor: "pointer",
                transition: "filter 0.2s, transform 0.1s", opacity: (loading || (!value.trim() && !file)) ? 0.5 : 1
              }}
              onMouseEnter={e => e.currentTarget.style.filter = "brightness(1.1)"}
              onMouseLeave={e => e.currentTarget.style.filter = "brightness(1)"}
            >
              {loading ? "TRANSMITTING..." : "POST"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Post ────────────────────────────────────────────────────────────────── */
function PostItem({ post }: { post: any }) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [liked, setLiked] = useState(post.likes.includes(user._id));
  const [likeCount, setLikeCount] = useState(post.likes.length);
  const [reposted, setReposted] = useState(post.reposts?.includes(user._id));
  const [repostCount, setRepostCount] = useState(post.reposts?.length || 0);
  const [hovered, setHovered] = useState(false);

  const handleLike = async () => {
    try {
      const res = await likeFeedPost(post._id);
      setLiked(res.liked);
      setLikeCount(res.likeCount);
    } catch (err) { console.error(err); }
  };

  const handleRepost = async () => {
    try {
      const res = await repostFeedPost(post._id);
      setReposted(res.reposted);
      setRepostCount(res.repostCount);
    } catch (err) { console.error(err); }
  };

  return (
    <article
      style={{
        background: hovered ? "rgba(7,26,47,0.5)" : "rgba(7,26,47,0.3)",
        padding: 24, borderRadius: 12, border: `1px solid rgba(59,73,92,0.05)`,
        transition: "background 0.2s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: "flex", gap: 16 }}>
        <img src={post.author.avatar || "/placeholder-user.jpg"} alt={post.author.full_name} style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
            <div>
              <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, color: C.text, marginRight: 8 }}>{post.author.full_name}</span>
              <span style={{ fontFamily: "'Space Grotesk',sans-serif", color: C.muted, fontSize: 13 }}>@{post.author.username} · {formatDistanceToNow(new Date(post.createdAt))} ago</span>
            </div>
            <button style={{ background: "none", border: "none", cursor: "pointer", color: C.muted }}>
              <Icon name="more_horiz" style={{ fontSize: 20 }} />
            </button>
          </div>

          <p style={{ color: C.text, fontFamily: "'Manrope',sans-serif", fontSize: 15, lineHeight: 1.65, marginBottom: 16, whiteSpace: "pre-wrap" }}>
            {post.content}
          </p>

          {post.mediaUrl && (
            <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid rgba(59,73,92,0.1)`, marginBottom: 16 }}>
              {post.mediaType === 'video' ? (
                <video src={post.mediaUrl} controls style={{ width: "100%", display: "block" }} />
              ) : (
                <img src={post.mediaUrl} alt="Post media" style={{ width: "100%", maxHeight: 500, objectFit: "cover", display: "block" }} />
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: 32, color: C.muted }}>
            <StatBtn icon="mode_comment" count={post.comments.length} hoverColor={C.accent} />
            <button
              onClick={handleRepost}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: reposted ? "#4ade80" : C.muted, transition: "color 0.2s" }}
            >
              <Icon name="cached" style={{ fontSize: 20 }} />
              <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14 }}>{repostCount}</span>
            </button>
            <button
              style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: liked ? C.error : C.muted, transition: "color 0.2s" }}
              onClick={handleLike}
            >
              <Icon name="favorite" fill={liked} style={{ fontSize: 20, color: liked ? C.error : C.muted }} />
              <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14 }}>{likeCount}</span>
            </button>
            <StatBtn icon="share" count={undefined} hoverColor={C.secondary} />
          </div>
        </div>
      </div>
    </article>
  );
}

function StatBtn({ icon, count, hoverColor }: any) {
  const [hov, setHov] = useState(false);
  return (
    <button
      style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: hov ? hoverColor : C.muted, transition: "color 0.2s" }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <Icon name={icon} style={{ fontSize: 20 }} />
      {count !== undefined && <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14 }}>{count}</span>}
    </button>
  );
}

/* ─── Right Sidebar ───────────────────────────────────────────────────────── */
function RightSidebar() {
  const [followed, setFollowed] = useState<any>({});
  return (
    <aside style={{ padding: "40px" }}>
      <div style={{ position: "sticky", top: 112, display: "flex", flexDirection: "column", gap: 32 }}>
        <div style={{ background: C.surfaceLow, borderRadius: 12, border: `1px solid rgba(59,73,92,0.1)`, overflow: "hidden" }}>
          <div style={{ padding: "16px 24px", borderBottom: `1px solid rgba(59,73,92,0.1)` }}>
            <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 18, color: C.accent, margin: 0 }}>Trending Constructs</h3>
          </div>
          {[
            { tag: "#Crystalline", count: 245 },
            { tag: "#DeepObservatory", count: 182 },
            { tag: "#SpaceGrotesk", count: 131 }
          ].map((t, i) => (
            <div key={i} style={{ padding: "16px 24px", borderBottom: `1px solid rgba(59,73,92,0.1)` }}>
              <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 12, color: C.muted }}>{t.tag}</span>
              <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 10, color: C.accent, textTransform: "uppercase", marginTop: 4 }}>{t.count} Transmissions</p>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

/* ─── Root ────────────────────────────────────────────────────────────────── */
export default function BubbleFeed() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    loadPosts();
  }, []);

  return (
    <>
      {/* Global styles are now handled in index.css */}

      <div style={{ background: C.bg, color: C.text, minHeight: "100vh", fontFamily: "'Manrope', sans-serif" }}>
        <Sidebar />
        <TopBar />

        <main className="feed-layout" style={{ 
          marginLeft: 85, 
          paddingTop: 80, 
          display: "flex", 
          minHeight: "100vh",
          background: C.bg 
        }}>
          <section style={{ 
            flex: 1,
            borderRight: `1px solid rgba(59,73,92,0.1)`, 
            padding: "40px 32px",
            minWidth: 0 // allow shrinking
          }}>
            <div style={{ maxWidth: 680, margin: "0 auto" }}>
              <Composer onPostCreated={(p) => setPosts([p, ...posts])} />
              <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                {loading ? (
                  <p style={{ textAlign: "center", color: C.muted }}>Loading transmissions...</p>
                ) : posts.length === 0 ? (
                  <p style={{ textAlign: "center", color: C.muted }}>No thoughts transmitted yet.</p>
                ) : (
                  posts.map(post => <PostItem key={post._id} post={post} />)
                )}
              </div>
            </div>
          </section>
          <div className="hidden lg:block w-[380px] shrink-0">
            <RightSidebar />
          </div>
        </main>
      </div>
    </>
  );
}