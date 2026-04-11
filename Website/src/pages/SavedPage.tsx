import { useState, useEffect } from "react";
import { fetchSavedPosts, saveFeedPost } from "@/api";
import Sidebar from "@/components/Sidebar";

const FILTERS = ["All", "Images", "Links", "Articles", "Videos"];

function Icon({ name, filled = false, style, className }: any) {
    return (
        <span
            className={`material-symbols-outlined select-none ${className}`}
            style={{
                fontVariationSettings: filled ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 400",
                ...style
            }}
        >
            {name}
        </span>
    );
}

function TopBar() {
  return (
    <header className="fixed top-0 right-0 z-40 h-20 px-10 flex justify-between items-center bg-[var(--th-bg)]/80 backdrop-blur-xl border-b border-[var(--th-border)]"
      style={{ left: "85px" }}>
      <h1 className="text-xl font-bold tracking-widest text-[var(--th-accent)] uppercase" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        SAVED
      </h1>
      <div className="flex items-center gap-6">
        <div className="w-10 h-10 rounded-full bg-[var(--th-surface-high)] flex items-center justify-center cursor-pointer border border-[var(--th-border)] overflow-hidden">
           <Icon name="person" style={{ color: "var(--th-secondary)" }} />
        </div>
      </div>
    </header>
  );
}

export default function SavedPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState("All");

  const loadSaved = async () => {
    try {
      setLoading(true);
      const res = await fetchSavedPosts();
      setPosts(res.posts || []);
      if (res.posts?.length > 0 && !activeId) {
          setActiveId(res.posts[0]._id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSaved(); }, []);

  const handleUnsave = async (postId: string) => {
      try {
          await saveFeedPost(postId);
          setPosts(prev => prev.filter(p => p._id !== postId));
          if (activeId === postId) {
              setActiveId(null);
          }
      } catch (err) {
          console.error("Failed to unsave", err);
      }
  };

  const activePost = posts.find(p => p._id === activeId) || null;

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ background: "var(--th-bg)", color: "var(--th-text)", fontFamily: "'Manrope', sans-serif" }}>
      <Sidebar />
      <TopBar />

      <main className="flex overflow-hidden relative" style={{ marginLeft: 85, paddingTop: 80, height: "100vh" }}>
        
        {/* Glows */}
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] blur-[120px] rounded-full pointer-events-none z-0 transition-colors"
          style={{ background: "var(--th-glow)" }} />
        <div className="absolute bottom-[-10%] left-[10%] w-[30%] h-[40%] blur-[120px] rounded-full pointer-events-none z-0 transition-colors"
          style={{ background: "color-mix(in srgb, var(--th-secondary) 15%, transparent)" }} />

        {/* Saved List Sidebar */}
        <aside className="flex flex-col flex-shrink-0 transition-colors relative z-10" style={{
          width: 380, height: "100%",
          background: "color-mix(in srgb, var(--th-surface-low) 60%, transparent)", backdropFilter: "blur(20px)",
          borderRight: `1px solid var(--th-border)`
        }}>
          {/* Header */}
          <div className="p-8 pb-4">
            <div className="flex items-center justify-between mb-6">
              <h1 className="font-bold text-2xl transition-colors" style={{ fontFamily: "'Space Grotesk',sans-serif", color: "var(--th-text)" }}>Saved</h1>
              <button className="p-2 rounded-lg transition-colors border-none cursor-pointer"
                style={{ color: "var(--th-accent)", background: "transparent" }}
                onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--th-accent) 10%, transparent)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <Icon name="filter_list" style={{ fontSize: 20 }} />
              </button>
            </div>

            {/* Filter pills */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {FILTERS.map(f => (
                <button key={f} onClick={() => setActiveFilter(f)} className="px-4 py-1.5 rounded-full border-none cursor-pointer text-[11px] uppercase tracking-widest flex-shrink-0 transition-all font-bold"
                style={{
                  fontFamily: "'Space Grotesk',sans-serif",
                  background: activeFilter === f ? "var(--th-accent)" : "var(--th-surface-top)",
                  color: activeFilter === f ? "var(--th-accent-text)" : "var(--th-muted)"
                }}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Item list */}
          <div className="flex-1 overflow-y-auto px-4 pb-8 flex flex-col gap-2 custom-scrollbar">
            {loading ? (
                <p className="text-center mt-10 transition-colors" style={{ color: "var(--th-muted)" }}>Loading saved items...</p>
            ) : posts.length === 0 ? (
                <div className="text-center mt-10 transition-colors" style={{ color: "var(--th-muted)" }}>
                    <Icon name="bookmark_border" style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }} />
                    <p style={{ fontFamily: "'Space Grotesk',sans-serif" }}>No saved items.</p>
                </div>
            ) : (
                posts.map(item => {
                const isActive = item._id === activeId;
                return (
                    <div key={item._id} onClick={() => setActiveId(item._id)} className="p-4 rounded-xl cursor-pointer transition-all"
                    style={{
                      background: isActive ? "var(--th-surface-high)" : "transparent",
                      borderLeft: isActive ? `4px solid var(--th-accent)` : "4px solid transparent",
                      boxShadow: isActive ? "0 0 15px var(--th-glow)" : "none",
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "var(--th-surface-low)"; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                    >
                    <div className="flex gap-4 items-center">
                        <div className="h-14 w-14 flex-shrink-0 rounded-lg overflow-hidden transition-colors" style={{ background: "var(--th-surface)" }}>
                            {item.media && item.media.length > 0 && item.media[0].type.startsWith('image') ? (
                                <img src={item.media[0].url} alt="media" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Icon name="article" style={{ color: "var(--th-muted)", opacity: 0.5 }} />
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold truncate transition-colors" style={{ fontFamily: "'Space Grotesk', sans-serif", color: "var(--th-text)" }}>
                                {item.author?.full_name || "Unknown Author"}
                            </h4>
                            <p className="text-xs truncate mt-1 transition-colors" style={{ color: "var(--th-muted)" }}>
                                {item.content}
                            </p>
                        </div>
                    </div>
                </div>
                );
                })
            )}
          </div>
        </aside>

        {/* Detail View */}
        <section className="flex-1 h-full overflow-y-auto bg-transparent relative z-10 custom-scrollbar">
            {loading ? null : !activePost ? (
                <div className="w-full h-full flex items-center justify-center transition-colors" style={{ color: "var(--th-muted)", fontFamily: "'Space Grotesk', sans-serif" }}>
                    Select an item to view details
                </div>
            ) : (
                <article className="max-w-4xl mx-auto p-12">
                    {/* Header */}
                    <header className="flex justify-between items-start mb-8">
                        <div className="flex items-center gap-4">
                            <img 
                                src={activePost.author?.avatar || "https://via.placeholder.com/50"} 
                                alt="author" 
                                className="w-12 h-12 rounded-full object-cover transition-colors"
                                style={{ border: "1px solid var(--th-border)" }}
                            />
                            <div>
                                <h2 className="font-bold text-lg m-0 transition-colors" style={{ color: "var(--th-text)" }}>{activePost.author?.full_name}</h2>
                                <span className="text-xs transition-colors" style={{ color: "var(--th-muted)" }}>
                                    @{activePost.author?.username || "user"} • {new Date(activePost.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                            <button className="h-10 px-4 rounded-lg flex items-center gap-2 border-none cursor-pointer font-bold transition-all text-xs uppercase"
                                style={{ background: "var(--th-surface)", color: "var(--th-text)" }}
                                onMouseEnter={e => e.currentTarget.style.background = "var(--th-surface-top)"}
                                onMouseLeave={e => e.currentTarget.style.background = "var(--th-surface)"}
                                onClick={() => handleUnsave(activePost._id)}>
                                <Icon name="bookmark_remove" filled style={{ fontSize: 16, color: "var(--th-accent)" }} />
                                Unsave
                            </button>
                            <button className="w-10 h-10 rounded-lg flex items-center justify-center border-none cursor-pointer transition-colors"
                                style={{ background: "var(--th-surface)", color: "var(--th-text)" }}
                                onMouseEnter={e => e.currentTarget.style.background = "var(--th-surface-top)"}
                                onMouseLeave={e => e.currentTarget.style.background = "var(--th-surface)"}>
                                <Icon name="share" style={{ fontSize: 18 }} />
                            </button>
                        </div>
                    </header>

                    {/* Content */}
                    <div className="text-sm leading-relaxed mb-8 transition-colors" style={{ color: "var(--th-text)" }}>
                        {activePost.content}
                    </div>

                    {/* Media Grid */}
                    {activePost.media && activePost.media.length > 0 && (
                        <div className="grid gap-4 mt-6" style={{ gridTemplateColumns: activePost.media.length === 1 ? "1fr" : "repeat(2, 1fr)"}}>
                            {activePost.media.map((m: any, idx: number) => (
                                <div key={idx} className="rounded-xl overflow-hidden border transition-colors" style={{ borderColor: "var(--th-border)", background: "var(--th-surface)" }}>
                                    {m.type.startsWith('video') ? (
                                        <video src={m.url} controls className="w-full max-h-96 object-cover" />
                                    ) : m.type.startsWith('audio') ? (
                                        <div className="p-6">
                                            <audio src={m.url} controls className="w-full" />
                                        </div>
                                    ) : (
                                        <img src={m.url} alt="post media" className="w-full max-h-96 object-contain" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                </article>
            )}
        </section>

      </main>
    </div>
  );
}