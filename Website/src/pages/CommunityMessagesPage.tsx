import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import Sidebar from "@/components/Sidebar";
import { AvatarInitials } from "@/components/AvatarInitials";
import { MobileHeader } from "@/components/MobileHeader";
import {
  fetchNetworkById,
  fetchNetworkPosts,
  reactToNetworkPost,
  forwardNetworkPost,
  createNetworkPost,
  deleteNetworkPost
} from "@/api";
import { formatDistanceToNow } from "date-fns";

import { Icon } from "@/components/Icon";

/* ─── Breadcrumb ───────────────────────────────────────────────────────────── */
function Breadcrumb({ network }: { network: any }) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-2 mb-6 text-xs font-bold uppercase tracking-widest">
      <button
        onClick={() => navigate("/community")}
        className="text-muted-foreground hover:text-primary transition-colors"
      >
        COMMUNITIES
      </button>
      <Icon name="chevron_right" className="text-border text-sm" />
      <span className="text-primary">{network?.title || "LOADING..."}</span>
    </div>
  );
}

/* ─── Post Item ────────────────────────────────────────────────────────────── */
function BroadcastPost({ post, networkId, isCreator, onUpdate }: { post: any, networkId: string, isCreator: boolean, onUpdate: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleReact = async (emoji: string) => {
    try {
      await reactToNetworkPost(networkId, post._id, emoji);
      onUpdate();
    } catch (err) { console.error(err); }
  };

  const handleForward = async () => {
    try {
      // In a real app, this might open a modal to select target.
      // For now, we'll just simulate a forward or copy link.
      await forwardNetworkPost(networkId, post._id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onUpdate();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="bg-card backdrop-blur-xl border border-border rounded-2xl p-6 mb-4 group hover:border-primary/20 transition-all shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <Icon name="campaign" style={{ color: "var(--primary)" }} />
          </div>
          <div>
            <p className="text-[var(--primary)] font-bold text-sm tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {post.author?.full_name || post.author?.username || "Update Transmission"}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-tighter">
              {formatDistanceToNow(new Date(post.createdAt))} ago
            </p>
          </div>
        </div>
      </div>

      <p className="text-foreground text-base leading-relaxed mb-6 whitespace-pre-wrap">
        {post.content}
      </p>

      {post.mediaUrl && (
        <div className="rounded-xl overflow-hidden border border-border mb-6 bg-muted">
          {post.mediaType === 'video' ? (
            <video src={post.mediaUrl} controls className="w-full" />
          ) : (
            <img src={post.mediaUrl} className="w-full object-contain max-h-[400px]" alt="Update media" />
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex gap-2">
          {['🔥', '🚀', '⭐', '❤️'].map(emoji => {
            const reactionCount = post.reactions?.filter((r: any) => r.emoji === emoji).length || 0;
            return (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all text-xs",
                  reactionCount > 0 ? "bg-primary/10 border-primary/30 text-primary" : "bg-secondary border-transparent text-muted-foreground hover:border-primary/20"
                )}
              >
                <span>{emoji}</span>
                {reactionCount > 0 && <span className="font-bold">{reactionCount}</span>}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          {isCreator && (
            <button
              onClick={async () => {
                if (!confirm('Delete this post?')) return;
                try { await deleteNetworkPost(networkId, post._id); onUpdate(); } catch { }
              }}
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all text-xs border border-transparent hover:border-red-400/30"
            >
              <Icon name="delete" className="text-sm" />
              DELETE
            </button>
          )}
          <button
            onClick={handleForward}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all text-xs border border-transparent hover:border-primary/30"
          >
            <Icon name="forward" className="text-sm" />
            {copied ? "COPIED" : "FORWARD"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Composer (Only for Creator) ────────────────────────────────────────── */
function BroadcastComposer({ networkId, onPostCreated }: { networkId: string, onPostCreated: () => void }) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePost = async () => {
    if (!content.trim()) return;
    try {
      setLoading(true);
      await createNetworkPost(networkId, { content });
      setContent("");
      onPostCreated();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  return (
    <div className="mb-8 p-6 bg-card border border-border rounded-2xl shadow-sm">
      <textarea
        className="w-full bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50 resize-none h-24 mb-4"
        placeholder="Transmit a new update to your network members..."
        value={content}
        onChange={e => setContent(e.target.value)}
      />
      <div className="flex justify-end">
        <button
          onClick={handlePost}
          disabled={loading || !content.trim()}
          className="px-8 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold uppercase tracking-widest text-xs hover:opacity-90 transition-all disabled:opacity-50"
        >
          {loading ? "TRANSMITTING..." : "BROADCAST UPDATE"}
        </button>
      </div>
    </div>
  );
}

/* ─── Root ────────────────────────────────────────────────────────────────── */
export default function CommunityMessagesPage() {
  const { id } = useParams<{ id: string }>();
  const [network, setNetwork] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    const BASE = (import.meta.env.VITE_API_URL?.replace(/ i$/, '')?.trim()) || "http://localhost:3000/api/v1";
    fetch(`${BASE}/profile/me`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
    })
      .then(r => r.json())
      .then(j => { if (j.data) setUserData(j.data); })
      .catch(() => { });
  }, []);

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [netRes, postsRes] = await Promise.all([
        fetchNetworkById(id),
        fetchNetworkPosts(id)
      ]);
      setNetwork(netRes.network);
      setPosts(postsRes.posts || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const userId = user?.id || user?._id;
  const creatorId = network?.creator?._id || network?.creator?.id || network?.creator;
  const isCreator = String(creatorId) === String(userId);
  const canPost = network?.onlyCreatorCanPost ? isCreator : true;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Manrope:wght@300;400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(59,73,92,0.4); border-radius: 4px; }
      `}</style>

      <div className="bg-background text-foreground min-h-screen flex font-['Manrope']">
        <Sidebar />
        <MobileHeader title="COMMUNITY" />

        <main className="flex-1 flex flex-col h-screen relative overflow-hidden pt-16 md:pt-0" style={{ marginLeft: "var(--main-margin)" }}>
          {/* Subtle Ambient Background */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none -mr-40 -mt-40" />

          {/* Header */}
          <header className="shrink-0 px-4 md:px-10 py-4 md:h-24 flex items-center justify-between border-b border-border bg-background/60 backdrop-blur-xl relative z-10">
            <div className="flex items-center gap-3 md:gap-6">
              <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl overflow-hidden border border-[#3b495c]/20 shrink-0">
                <img src={network?.image || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe"} className="w-full h-full object-cover" />
              </div>
              <div>
                <h1 className="text-lg md:text-2xl font-bold tracking-tight text-[var(--primary)]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {network?.title || "Loading..."}
                </h1>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
                  {network?.memberCount || 0} Members Transmitting
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary transition-all border border-border">
                <Icon name="search" />
              </button>
              <button className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary transition-all border border-border">
                <Icon name="more_vert" />
              </button>
              <div className="w-10 h-10 rounded-xl overflow-hidden border ml-2" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                <AvatarInitials name={userData?.full_name || userData?.username || "U"} url={userData?.avatar} className="text-sm" />
              </div>
            </div>
          </header>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto px-4 md:px-10 py-6 md:py-8 custom-scrollbar relative z-10">
            <div className="max-w-3xl mx-auto">
              <Breadcrumb network={network} />

              {canPost && <BroadcastComposer networkId={id!} onPostCreated={loadData} />}

              {loading ? (
                <div className="flex flex-col gap-4">
                  {[1, 2, 3].map(i => <div key={i} className="h-40 bg-[#11273f]/20 animate-pulse rounded-2xl" />)}
                </div>
              ) : (
                <div className="flex flex-col">
                  {posts.map(post => (
                    <BroadcastPost key={post._id} post={post} networkId={id!} isCreator={isCreator} onUpdate={loadData} />
                  ))}
                  {posts.length === 0 && (
                    <div className="py-20 text-center">
                      <div className="w-16 h-16 bg-secondary/40 rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
                        <Icon name="auto_quiet" style={{ color: "var(--muted-foreground)", fontSize: 28 }} />
                      </div>
                      <p className="text-muted-foreground text-lg mb-2">
                        {canPost ? "No updates broadcast yet." : "No updates transmitted from the creator yet."}
                      </p>
                      {canPost && (
                        <p className="text-[#9eacc3] text-sm">Use the composer above to send your first broadcast.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
