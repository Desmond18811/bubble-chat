import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import Sidebar from "@/components/Sidebar";
import { AvatarInitials } from "@/components/AvatarInitials";
import {
  fetchNetworks,
  fetchCommunityCategories,
  joinNetwork,
  createNetwork,
  fetchTrendingNetworks
} from "@/api";

function MSIcon({
  icon,
  filled = false,
  className,
  style,
}: {
  icon: string;
  filled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={cn("material-symbols-outlined select-none", className)}
      style={{
        ...style,
        ...(filled
          ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }
          : { fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" })
      }}
    >
      {icon}
    </span>
  );
}

function TopBar({ onSearch }: { onSearch: (q: string) => void }) {
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const BASE = (import.meta.env.VITE_API_URL?.replace(/ i$/, '')?.trim()) || "http://localhost:3000/api/v1";
    fetch(`${BASE}/profile/me`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
    })
      .then(r => r.json())
      .then(j => { if (j.data) setUserData(j.data); })
      .catch(() => { });
  }, []);
  return (
    <header className="fixed top-0 right-0 left-[85px] z-40 flex justify-between items-center h-20 px-10 border-b transition-colors"
      style={{ background: "color-mix(in srgb, var(--th-bg) 60%, transparent)", backdropFilter: "blur(12px)", borderColor: "var(--th-border)" }}>
      <div className="flex-1 max-w-2xl flex items-center gap-6">
        <h1
          style={{
            fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700,
            fontSize: 22, color: "#ffe792", letterSpacing: "0.06em", margin: 0,
          }}
        >
          COMMUNITY HUB
        </h1>
        <div className="relative group flex-1">
          <MSIcon icon="search" className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors" style={{ color: "var(--th-muted)" }} />
          <Input
            type="text"
            placeholder="Search for channels or categories..."
            onChange={(e) => onSearch(e.target.value)}
            className="w-full border-none rounded-xl py-3 pl-12 pr-4 focus-visible:ring-2 h-auto transition-colors"
            style={{
              background: "var(--th-surface-top)",
              color: "var(--th-text)",
              outlineColor: "color-mix(in srgb, var(--th-accent) 20%, transparent)"
            }}
          />
        </div>
      </div>
      <div className="flex items-center gap-6 ml-8">
        <div style={{ width: 38, height: 38, borderRadius: "50%", border: `2px solid color-mix(in srgb, var(--th-accent) 25%, transparent)`, overflow: "hidden", background: "var(--th-surface-high)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <AvatarInitials name={userData?.full_name || userData?.username || "U"} url={userData?.avatar} className="text-sm" />
        </div>
      </div>
    </header>
  );
}

function CreateNetworkModal({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categories, setCategories_] = useState<string[]>([]);
  const [catInput, setCatInput] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const addCategory = () => {
    const trimmed = catInput.trim();
    if (trimmed && !categories.includes(trimmed)) {
      setCategories_(prev => [...prev, trimmed]);
    }
    setCatInput("");
  };

  const removeCategory = (cat: string) => setCategories_(prev => prev.filter(c => c !== cat));

  const handleSubmit = async () => {
    if (!name || categories.length === 0) return;
    try {
      setLoading(true);
      await createNetwork({
        title: name,
        description,
        categories,
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
      <div className="border rounded-2xl p-8 w-full max-w-md shadow-2xl transition-colors"
        style={{ background: "var(--th-surface)", borderColor: "var(--th-border)" }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-bold text-xl transition-colors" style={{ fontFamily: "'Space Grotesk', sans-serif", color: "var(--th-text)" }}>
            Create Network
          </h2>
          <button onClick={onClose} className="transition-colors hover:scale-110" style={{ color: "var(--th-muted)" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--th-accent)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--th-muted)"}>
            <MSIcon icon="close" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest mb-1 block transition-colors" style={{ color: "var(--th-muted)" }}>Network Name</label>
            <Input
              className="rounded-xl transition-colors border"
              style={{ background: "var(--th-surface-low)", borderColor: "var(--th-border)", color: "var(--th-text)" }}
              placeholder="e.g. Design Explorers"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest mb-1 block transition-colors" style={{ color: "var(--th-muted)" }}>Categories (press Enter to add)</label>
            <div className="flex gap-2 mb-2 flex-wrap">
              {categories.map(cat => (
                <span key={cat} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full font-bold" style={{ background: "color-mix(in srgb, var(--th-accent) 15%, transparent)", color: "var(--th-accent)", border: "1px solid color-mix(in srgb, var(--th-accent) 30%, transparent)" }}>
                  {cat}
                  <button type="button" onClick={() => removeCategory(cat)} style={{ marginLeft: 2, lineHeight: 1, color: "var(--th-accent)" }}>×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                className="rounded-xl transition-colors border flex-1"
                style={{ background: "var(--th-surface-low)", borderColor: "var(--th-border)", color: "var(--th-text)" }}
                placeholder="e.g. AI & ML"
                value={catInput}
                onChange={e => setCatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCategory(); } }}
              />
              <button type="button" onClick={addCategory}
                className="px-3 rounded-xl font-bold text-xs uppercase"
                style={{ background: "var(--th-accent)", color: "var(--th-accent-text)" }}>Add</button>
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest mb-1 block transition-colors" style={{ color: "var(--th-muted)" }}>Description</label>
            <textarea
              className="w-full border rounded-xl p-3 text-sm outline-none h-24 resize-none transition-colors"
              style={{ background: "var(--th-surface-low)", borderColor: "var(--th-border)", color: "var(--th-text)" }}
              placeholder="What is this network about?"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={loading || !name || categories.length === 0}
          className="w-full mt-8 font-bold uppercase py-6 rounded-xl transition-all"
          style={{ background: "var(--th-accent)", color: "var(--th-accent-text)" }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.9"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
        >
          {loading ? "CREATING..." : "ESTABLISH NETWORK"}
        </Button>
      </div>
    </div>
  );
}

function NetworkCard({ network, onJoin }: { network: any, onJoin: (id: string) => void }) {
  return (
    <div className="group rounded-xl overflow-hidden shadow-2xl relative backdrop-blur-xl border transition-all"
      style={{ background: "color-mix(in srgb, var(--th-surface-top) 40%, transparent)", borderColor: "var(--th-border)" }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "color-mix(in srgb, var(--th-accent) 30%, transparent)"}
      onMouseLeave={e => e.currentTarget.style.borderColor = "var(--th-border)"}>

      <div className="h-44 relative overflow-hidden transition-colors" style={{ background: "var(--th-surface-high)" }}>
        <img
          src={network.image || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80"}
          alt={network.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 transition-colors" style={{ background: "linear-gradient(to top, var(--th-surface), transparent)" }} />
      </div>

      <div className="p-6">
        <h3
          className="text-xl font-bold mb-1 transition-colors line-clamp-1"
          style={{ fontFamily: "'Space Grotesk', sans-serif", color: "var(--th-text)" }}
        >
          {network.title}
        </h3>
        <div className="flex items-center gap-2 mb-3">
          <MSIcon icon="groups" className="text-sm transition-colors" style={{ color: "var(--th-muted)" }} />
          <span className="text-xs transition-colors" style={{ color: "var(--th-muted)" }}>{network.memberCount || 0} Members</span>
          <span className="transition-colors" style={{ color: "var(--th-border)" }}>·</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-widest transition-colors"
            style={{ background: "color-mix(in srgb, var(--th-accent) 15%, transparent)", color: "var(--th-accent)" }}>
            {network.categories && network.categories.length > 0 ? network.categories[0] : "Network"}
          </span>
        </div>
        <p className="text-sm mb-6 line-clamp-2 h-10 transition-colors" style={{ color: "var(--th-muted)" }}>{network.description}</p>
        <Button
          onClick={() => onJoin(network._id)}
          className="w-full py-3 h-auto rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all"
          style={{ background: "var(--th-accent)", color: "var(--th-accent-text)" }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = "0 0 15px color-mix(in srgb, var(--th-accent) 40%, transparent)"}
          onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
        >
          Join Network
        </Button>
      </div>
    </div>
  );
}

// Featured Section removed as per redesign.

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
    <div
      className="overflow-hidden min-h-screen transition-colors duration-300 relative"
      style={{ fontFamily: "'Manrope', sans-serif", background: "var(--th-bg)", color: "var(--th-text)" }}
    >
      <Sidebar />
      <TopBar onSearch={setSearchQuery} />

      {/* Ambient glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] blur-[120px] rounded-full pointer-events-none z-0 transition-colors"
        style={{ background: "var(--th-glow)" }} />
      <div className="absolute bottom-[-10%] left-[10%] w-[30%] h-[40%] blur-[120px] rounded-full pointer-events-none z-0 transition-colors"
        style={{ background: "color-mix(in srgb, var(--th-secondary) 15%, transparent)" }} />

      <main className="ml-[85px] mt-20 p-10 h-[calc(100vh-80px)] overflow-y-auto custom-scrollbar no-scrollbar relative z-10">
        <section className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-5xl font-bold mb-2 tracking-tight transition-colors" style={{ fontFamily: "'Space Grotesk', sans-serif", color: "var(--th-text)" }}>
                Community Hub
              </h1>
              <p className="max-w-xl text-lg transition-colors" style={{ color: "var(--th-muted)" }}>
                Discover and join exclusive networks of creators, builders, and visionaries.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-2.5 h-auto rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all hover:scale-105"
                style={{ background: "var(--th-accent)", color: "var(--th-accent-text)", boxShadow: "0 0 20px color-mix(in srgb, var(--th-accent) 20%, transparent)" }}
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
                "px-6 py-2.5 rounded-xl font-bold uppercase tracking-wider text-[10px] whitespace-nowrap transition-all border"
              )}
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                background: activeCategory === cat ? "#ffe792" : "var(--th-surface)",
                color: activeCategory === cat ? "#655400" : "var(--th-muted)",
                borderColor: activeCategory === cat ? "transparent" : "var(--th-border)"
              }}
              onMouseEnter={e => { if (activeCategory !== cat) e.currentTarget.style.color = "#ffe792"; }}
              onMouseLeave={e => { if (activeCategory !== cat) e.currentTarget.style.color = "var(--th-muted)"; }}
            >
              {cat}
            </button>
          ))}
        </section>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-80 animate-pulse rounded-xl transition-colors" style={{ background: "var(--th-surface-top)" }} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {networks.map((network) => (
              <NetworkCard key={network._id} network={network} onJoin={handleJoin} />
            ))}
            {networks.length === 0 && (
              <div className="col-span-full py-20 text-center">
                <p className="text-lg transition-colors" style={{ color: "var(--th-muted)" }}>No networks found in this cosmic sector.</p>
              </div>
            )}
          </div>
        )}


      </main>
    </div>
  );
}