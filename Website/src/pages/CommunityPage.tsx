import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Sidebar from "@/components/Sidebar";
import { 
  fetchNetworks, 
  fetchCommunityCategories, 
  joinNetwork, 
  createNetwork,
  fetchTrendingNetworks
} from "@/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = "Trending" | "Design" | "Development" | "Web3" | "AI & ML" | "Marketing" | "Product";

interface Network {
  id: string;
  title: string;
  members: string;
  description: string;
  image: string;
  badge?: { label: string; variant: "primary" | "secondary" };
}

interface TrendingCategory {
  id: string;
  label: string;
}

// ─── Static data ──────────────────────────────────────────────────────────────

const NAV_ICONS: { icon: string; label: string; active?: boolean; filled?: boolean }[] = [
  { icon: "chat", label: "Chat" },
  { icon: "work", label: "Work" },
  { icon: "video_chat", label: "Video" },
  { icon: "group", label: "Community", active: true, filled: true },
  { icon: "rss_feed", label: "Feed" },
  { icon: "bookmark", label: "Bookmarks" },
  { icon: "calendar_today", label: "Calendar" },
  { icon: "payments", label: "Payments" },
];

// Removing static data categories to use backend data

// Removing static network objects to use backend data

const FEATURED_AVATARS = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDiItrPOMFfKnTrw7MqVEdkVwBx-xOZ99QR3DUGLHj1VzGAp1xuz96WdoQ1W1cxPcaUwVWagb4neu_eQQTlDrLOGm-JxlfZbE0KJDG6VLH4b5hADxkqqkNbOCIUymlrP-SSuMjnNR8RdRu7NdIC6_xY0eKmrP9GMM4m0cMOw-ka8yQtHwtLXt1-TOWneVL0UqnJgjrj8ovhFqSdN_HQrnQWlZ3WSmN1ejPwVZ9aYndVhQEPoC2JUgj6k_uvlCxs4L3KStRpTBHCmR3z",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCLHJAsRNv6GsU5QhVUK1zTcomJESC-loZLcA0uT14eA6plQ8S51lEB0OaE54GY69bYVSwOuioJHMcuZ0uuUpigqVP0hoynzfvFQCuGGikbPiyuIMJO9Yjv57g_D5V-lKPfdn1vR5HGH42Zo3JDtUJJl7Nn0mx1MEU3DI4pZfFWWkrvpiZek3i65YK_p0ECglLP0oAguXJwyxqVSa0e97mZ5toDEuUW5sfHq-BcL3TBjSxR2WmusE5Vez1pVHa7h1UqmDJp-eGInwsS",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAzzygRvYtvN4Z2lj063Io8B9cpM4YP-0tESDuXhddOiHW_DnfhGIXze8J9eZmhvG8D3EmdlydafVfphrSo28nWRlR0c4t-Wn13L4ROcFm7s8JIoQhdYU9SSPq2SIZepEBgy3R1EsgvJH4n7e8qjovNZFm6dUPObwKglcRGPd7pBLu0Fz0lPyAEv03J3v7-zS43hH6ZCowFHw2CdVXWzLGxtkv8VnD2e4lYs8YO7dgvizwA9h_SgNX5G3dSfb1tVU_pQ3vAowb_rNre",
];

const TRENDING_CATEGORIES: TrendingCategory[] = [
  { id: "1", label: "Digital Art" },
  { id: "2", label: "Virtual Reality" },
  { id: "3", label: "Sustainable Tech" },
  { id: "4", label: "Open Source" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function MSIcon({
  icon,
  filled = false,
  className,
}: {
  icon: string;
  filled?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn("material-symbols-outlined select-none", className)}
      style={
        filled
          ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }
          : { fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }
      }
    >
      {icon}
    </span>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────



function TopBar({ onSearch }: { onSearch: (q: string) => void }) {
  return (
    <header className="fixed top-0 right-0 left-[85px] z-40 bg-[#010f20]/40 backdrop-blur-md flex justify-between items-center h-20 px-10 border-b border-[#3b495c]/10">
      <div className="flex-1 max-w-2xl">
        <div className="relative group">
          <MSIcon icon="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9eacc3]" />
          <Input
            type="text"
            placeholder="Search for channels or categories..."
            onChange={(e) => onSearch(e.target.value)}
            className="w-full bg-[#11273f] border-none rounded-xl py-3 pl-12 pr-4 text-[#d8e6ff] placeholder:text-[#9eacc3] focus-visible:ring-2 focus-visible:ring-[#ffe792]/20 h-auto"
          />
        </div>
      </div>
      <div className="flex items-center gap-6 ml-8">
        <button className="text-[#a2c2fd] hover:text-[#ffe792] transition-colors">
          <MSIcon icon="notifications" />
        </button>
      </div>
    </header>
  );
}

function CreateNetworkModal({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!name || !category) return;
    try {
      setLoading(true);
      await createNetwork({ 
        title: name, 
        description, 
        categories: [category] 
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#071a2f] border border-[#1a3650] rounded-2xl p-8 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[#d8e6ff] font-bold text-xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Create Network
          </h2>
          <button onClick={onClose} className="text-[#9eacc3] hover:text-[#ffe792]">
            <MSIcon icon="close" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="text-[10px] text-[#9eacc3] uppercase font-bold tracking-widest mb-1 block">Network Name</label>
            <Input 
              className="bg-[#031427] border-[#1a3650] text-[#d8e6ff] rounded-xl"
              placeholder="e.g. Design Explorers"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] text-[#9eacc3] uppercase font-bold tracking-widest mb-1 block">Category</label>
            <Input 
              className="bg-[#031427] border-[#1a3650] text-[#d8e6ff] rounded-xl"
              placeholder="e.g. AI & ML"
              value={category}
              onChange={e => setCategory(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] text-[#9eacc3] uppercase font-bold tracking-widest mb-1 block">Description</label>
            <textarea 
              className="w-full bg-[#031427] border border-[#1a3650] text-[#d8e6ff] rounded-xl p-3 text-sm outline-none focus:border-[#ffe792]/50 h-24 resize-none"
              placeholder="What is this network about?"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
        </div>

        <Button 
          onClick={handleSubmit}
          disabled={loading || !name || !category}
          className="w-full mt-8 bg-[#ffe792] text-[#010f20] hover:bg-[#ffd709] font-bold uppercase py-6 rounded-xl"
        >
          {loading ? "CREATING..." : "ESTABLISH NETWORK"}
        </Button>
      </div>
    </div>
  );
}

function NetworkCard({ network, onJoin }: { network: any, onJoin: (id: string) => void }) {
  return (
    <div className="group rounded-xl overflow-hidden shadow-2xl relative bg-[#11273f]/40 backdrop-blur-xl border border-[#3b495c]/10 hover:border-[#ffe792]/20 transition-all">
      <div className="h-44 relative overflow-hidden">
        <img
          src={network.image || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80"}
          alt={network.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#010f20] to-transparent" />
      </div>

      <div className="p-6">
        <h3
          className="text-xl font-bold mb-1 group-hover:text-[#ffe792] transition-colors line-clamp-1"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {network.title}
        </h3>
        <div className="flex items-center gap-2 mb-3">
          <MSIcon icon="groups" className="text-[#9eacc3] text-sm" />
          <span className="text-xs text-[#9eacc3]">{network.memberCount || 0} Members</span>
          <span className="text-[#3b495c]">·</span>
          <span className="text-[10px] text-[#ffe792] bg-[#ffe792]/10 px-2 py-0.5 rounded-full uppercase font-bold tracking-widest">{network.category}</span>
        </div>
        <p className="text-[#9eacc3] text-sm mb-6 line-clamp-2 h-10">{network.description}</p>
        <Button 
          onClick={() => onJoin(network._id)}
          className="w-full py-3 h-auto bg-[#ffe792] text-[#655400] rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-[#ffd709] transition-all"
        >
          Join Network
        </Button>
      </div>
    </div>
  );
}

function FeaturedSection({ trending }: { trending: any[] }) {
  return (
    <section className="mt-16 grid grid-cols-1 lg:grid-cols-12 gap-8 mb-20">
      <div className="lg:col-span-8 bg-gradient-to-br from-[#11273f]/60 to-[#071a2f]/60 backdrop-blur-xl p-10 rounded-2xl relative overflow-hidden flex flex-col justify-center border border-[#3b495c]/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#ffe792]/5 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none" />
        <h2 className="text-3xl font-bold mb-4 relative z-10" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Explore the Nebula
        </h2>
        <p className="text-[#9eacc3] text-lg mb-8 max-w-lg relative z-10">
          The most active hubs for generative arts and creative coding are waiting for your arrival. Be part of the evolution.
        </p>
        <div className="flex items-center gap-6 relative z-10">
          <Button className="px-8 py-3 h-auto bg-[#d8e6ff] text-[#010f20] rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-[#ffe792] transition-colors">
            Discover Trending
          </Button>
        </div>
      </div>

      <div className="lg:col-span-4 bg-[#11273f]/40 backdrop-blur-xl p-8 rounded-2xl border border-[#3b495c]/10 flex flex-col">
        <h3 className="text-xl font-bold mb-6" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Trending Networks
        </h3>
        <div className="space-y-3 flex-1">
          {(trending && trending.length > 0 ? trending : []).slice(0, 4).map((net) => (
            <button
              key={net._id}
              className="w-full flex items-center justify-between p-4 bg-[#031427]/50 rounded-xl group cursor-pointer hover:bg-[#11273f] transition-all border border-transparent hover:border-[#ffe792]/20"
            >
              <div className="flex flex-col items-start text-left">
                 <span className="text-[#d8e6ff] font-bold text-sm">{net.title}</span>
                 <span className="text-[10px] text-[#9eacc3] uppercase tracking-tighter">
                   {net.categories?.[0] || 'Uncategorized'}
                 </span>
              </div>
              <MSIcon icon="arrow_forward" className="text-[#ffe792] group-hover:translate-x-1 transition-transform" />
            </button>
          ))}
          {(!trending || trending.length === 0) && (
            <p className="text-[#3b495c] text-xs italic">No trending transmissions detected.</p>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function BubbleCommunity() {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [networks, setNetworks] = useState<any[]>([]);
  const [trending, setTrending] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState("Trending");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const isTrending = activeCategory === "Trending";
      const [nets, cats, trendRes] = await Promise.all([
        fetchNetworks({ 
          category: !isTrending ? activeCategory : undefined, 
          search: searchQuery 
        }),
        fetchCommunityCategories(),
        fetchTrendingNetworks()
      ]);
      setNetworks(nets.networks || []);
      setTrending(trendRes.networks || []);
      setCategories(["Trending", ...(cats.categories || [])]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeCategory, searchQuery]);

  const handleJoin = async (id: string) => {
    try {
      await joinNetwork(id);
      navigate(`/community/${id}/messages`);
    } catch (err) {
      console.error("Failed to join network:", err);
    }
  };

  return (
    <>
      {/* Global styles now handled in index.css */}

      <div
        className="bg-[#010f20] text-[#d8e6ff] overflow-hidden min-h-screen"
        style={{ fontFamily: "'Manrope', sans-serif" }}
      >
        <Sidebar />
        <TopBar onSearch={setSearchQuery} />

        <main className="ml-[85px] mt-20 p-10 h-[calc(100vh-80px)] overflow-y-auto custom-scrollbar no-scrollbar">
          <section className="mb-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h1 className="text-5xl font-bold text-[#d8e6ff] mb-2 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Community Hub
                </h1>
                <p className="text-[#9eacc3] max-w-xl text-lg">
                  Discover and join exclusive networks of creators, builders, and visionaries.
                </p>
              </div>
              <div className="flex gap-3">
                <Button 
                  onClick={() => setShowCreateModal(true)}
                  className="px-6 py-2.5 h-auto rounded-xl bg-[#ffe792] text-[#655400] hover:bg-[#ffd709] font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-[#ffe792]/10"
                >
                  Create Network
                </Button>
              </div>
            </div>
          </section>

          <CreateNetworkModal 
            isOpen={showCreateModal} 
            onClose={() => setShowCreateModal(false)}
            onSuccess={loadData}
          />

          <section className="mb-10 flex gap-3 overflow-x-auto pb-4 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-6 py-2.5 rounded-xl font-bold uppercase tracking-wider text-[10px] whitespace-nowrap transition-all",
                  activeCategory === cat
                    ? "bg-[#ffe792] text-[#655400] shadow-lg shadow-[#ffe792]/10"
                    : "bg-[#0c2037] text-[#9eacc3] hover:text-[#ffe792] border border-[#3b495c]/20"
                )}
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {cat}
              </button>
            ))}
          </section>

          {loading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               {[1,2,3].map(i => (
                 <div key={i} className="h-80 bg-[#11273f]/20 animate-pulse rounded-xl" />
               ))}
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {networks.map((network) => (
                <NetworkCard key={network._id} network={network} onJoin={handleJoin} />
              ))}
              {networks.length === 0 && (
                <div className="col-span-full py-20 text-center">
                  <p className="text-[#9eacc3] text-lg">No networks found in this cosmic sector.</p>
                </div>
              )}
            </div>
          )}

          <FeaturedSection trending={trending} />
        </main>
      </div>
    </>
  );
}