import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import Sidebar from "@/components/Sidebar";
import {
  fetchNetworkById,
  fetchNetworkPosts,
  reactToNetworkPost,
  forwardNetworkPost,
  createNetworkPost
} from "@/api";
import { formatDistanceToNow } from "date-fns";

/* ─── Icon helper ─────────────────────────────────────────────────────────── */
const Icon = ({ name, fill = false, className = "", style = {} }: any) => (
  <span
    className={cn("material-symbols-outlined select-none", className)}
    style={{ fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`, lineHeight: 1, ...style }}
  >
    {name}
  </span>
);

/* ─── Breadcrumb ───────────────────────────────────────────────────────────── */
function Breadcrumb({ network }: { network: any }) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-2 mb-6 text-xs font-bold uppercase tracking-widest">
      <button
        onClick={() => navigate("/community")}
        className="text-[#9eacc3] hover:text-[#ffe792] transition-colors"
      >
        COMMUNITIES
      </button>
      <Icon name="chevron_right" className="text-[#3b495c] text-sm" />
      <span className="text-[#ffe792]">{network?.title || "LOADING..."}</span>
    </div>
  );
}

/* ─── Post Item ────────────────────────────────────────────────────────────── */
function BroadcastPost({ post, networkId, onUpdate }: { post: any, networkId: string, onUpdate: () => void }) {
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
    <div className="bg-[#11273f]/30 backdrop-blur-xl border border-[#3b495c]/10 rounded-2xl p-6 mb-4 group hover:border-[#ffe792]/20 transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#031427] flex items-center justify-center border border-[#3b495c]/20">
            <Icon name="campaign" style={{ color: "#ffe792" }} />
          </div>
          <div>
            <p className="text-[#d8e6ff] font-bold text-sm tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {post.author?.full_name || post.author?.username || "Update Transmission"}
            </p>
            <p className="text-[10px] text-[#9eacc3] uppercase tracking-tighter">
              {formatDistanceToNow(new Date(post.createdAt))} ago
            </p>
          </div>
        </div>
      </div>

      <p className="text-[#d8e6ff] text-base leading-relaxed mb-6 whitespace-pre-wrap">
        {post.content}
      </p>

      {post.mediaUrl && (
        <div className="rounded-xl overflow-hidden border border-[#3b495c]/10 mb-6 bg-[#010f20]">
          {post.mediaType === 'video' ? (
            <video src={post.mediaUrl} controls className="w-full" />
          ) : (
            <img src={post.mediaUrl} className="w-full object-contain max-h-[400px]" alt="Update media" />
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-[#3b495c]/10">
        <div className="flex gap-2">
          {['🔥', '🚀', '⭐', '❤️'].map(emoji => {
            const reactionCount = post.reactions?.filter((r: any) => r.emoji === emoji).length || 0;
            return (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all text-xs",
                  reactionCount > 0 ? "bg-[#ffe792]/10 border-[#ffe792]/30 text-[#ffe792]" : "bg-[#0c2037] border-transparent text-[#9eacc3] hover:border-[#ffe792]/20"
                )}
              >
                <span>{emoji}</span>
                {reactionCount > 0 && <span className="font-bold">{reactionCount}</span>}
              </button>
            );
          })}
        </div>
        <button
          onClick={handleForward}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0c2037] text-[#9eacc3] hover:text-[#ffe792] hover:bg-[#ffe792]/10 transition-all text-xs border border-transparent hover:border-[#ffe792]/30"
        >
          <Icon name="forward" className="text-sm" />
          {copied ? "COPIED" : "FORWARD"}
        </button>
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
    <div className="mb-8 p-6 bg-[#031427]/60 border border-[#ffe792]/10 rounded-2xl">
      <textarea
        className="w-full bg-transparent border-none outline-none text-[#d8e6ff] placeholder:text-[#3b495c] resize-none h-24 mb-4"
        placeholder="Transmit a new update to your network members..."
        value={content}
        onChange={e => setContent(e.target.value)}
      />
      <div className="flex justify-end">
        <button
          onClick={handlePost}
          disabled={loading || !content.trim()}
          className="px-8 py-2.5 bg-[#ffe792] text-[#655400] rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-[#ffd709] transition-all disabled:opacity-50"
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
  const user = JSON.parse(localStorage.getItem("user") || "{}");

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

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Manrope:wght@300;400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(59,73,92,0.4); border-radius: 4px; }
      `}</style>

      <div className="bg-[#010f20] text-[#d8e6ff] min-h-screen flex font-['Manrope']">
        <Sidebar />

        <main className="ml-[85px] flex-1 flex flex-col h-screen relative overflow-hidden">
          {/* Subtle Ambient Background */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#ffe792]/5 blur-[120px] rounded-full pointer-events-none -mr-40 -mt-40" />

          {/* Header */}
          <header className="h-24 shrink-0 px-10 flex items-center justify-between border-b border-[#3b495c]/10 bg-[#010f20]/60 backdrop-blur-xl relative z-10">
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 rounded-2xl overflow-hidden border border-[#3b495c]/20">
                <img src={network?.image || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe"} className="w-full h-full object-cover" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {network?.title || "Loading..."}
                </h1>
                <p className="text-xs text-[#9eacc3] uppercase tracking-widest font-bold">
                  {network?.memberCount || 0} Members Transmitting
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button className="w-10 h-10 rounded-xl bg-[#0c2037] flex items-center justify-center text-[#9eacc3] hover:text-[#ffe792] transition-all border border-[#3b495c]/20">
                <Icon name="search" />
              </button>
              <button className="w-10 h-10 rounded-xl bg-[#0c2037] flex items-center justify-center text-[#9eacc3] hover:text-[#ffe792] transition-all border border-[#3b495c]/20">
                <Icon name="more_vert" />
              </button>
            </div>
          </header>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto px-10 py-8 custom-scrollbar relative z-10">
            <div className="max-w-3xl mx-auto">
              <Breadcrumb network={network} />

              {isCreator && <BroadcastComposer networkId={id!} onPostCreated={loadData} />}

              {loading ? (
                <div className="flex flex-col gap-4">
                  {[1, 2, 3].map(i => <div key={i} className="h-40 bg-[#11273f]/20 animate-pulse rounded-2xl" />)}
                </div>
              ) : (
                <div className="flex flex-col">
                  {posts.map(post => (
                    <BroadcastPost key={post._id} post={post} networkId={id!} onUpdate={loadData} />
                  ))}
                  {posts.length === 0 && (
                    <div className="py-20 text-center">
                      <div className="w-16 h-16 bg-[#11273f]/40 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#3b495c]/20">
                        <Icon name="auto_quiet" style={{ color: "#9eacc3", fontSize: 28 }} />
                      </div>
                      <p className="text-[#9eacc3] text-lg mb-2">
                        {isCreator ? "No updates broadcast yet." : "No updates transmitted from the creator yet."}
                      </p>
                      {isCreator && (
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
