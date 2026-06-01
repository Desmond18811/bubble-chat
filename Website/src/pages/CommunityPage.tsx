import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import Sidebar from "@/components/Sidebar";
import { AvatarInitials } from "@/components/AvatarInitials";
import { MobileHeader } from "@/components/MobileHeader";
import {
  fetchNetworks,
  fetchCommunityCategories,
  joinNetwork,
  createNetwork,
  fetchTrendingNetworks
} from "@/api";

const BASE = (import.meta.env.VITE_API_URL?.replace(/ i$/, '')?.trim()) || 'http://localhost:3000/api/v1';
const token = () => localStorage.getItem('access_token') || '';

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
    <header className="hidden md:flex fixed top-0 right-0 left-[85px] z-40 justify-between items-center h-20 px-10 border-b transition-colors"
      style={{ background: "rgba(255, 255, 255, 0.4)", backdropFilter: "blur(24px)", borderColor: "#0c2037/20" }}>
      <div className="flex-1 max-w-2xl flex items-center gap-6">
        <h1
          style={{
            fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700,
            fontSize: 22, color: "var(--primary)", letterSpacing: "0.06em", margin: 0,
          }}
        >
          COMMUNITY HUB
        </h1>
        <div className="relative group flex-1">
          <MSIcon icon="search" className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors" style={{ color: "var(--muted-foreground)" }} />
          <Input
            type="text"
            placeholder="Search for channels or categories..."
            onChange={(e) => onSearch(e.target.value)}
            className="w-full border-none rounded-xl py-3 pl-12 pr-4 focus-visible:ring-2 h-auto transition-colors"
            style={{
              background: "var(--accent)",
              color: "var(--foreground)",
              outlineColor: "color-mix(in srgb, var(--primary) 20%, transparent)"
            }}
          />
        </div>
      </div>
      <div className="flex items-center gap-6 ml-8">
        <div style={{ width: 38, height: 38, borderRadius: "50%", border: `2px solid color-mix(in srgb, var(--primary) 25%, transparent)`, overflow: "hidden", background: "var(--secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="border rounded-2xl p-8 w-full max-w-md shadow-2xl transition-colors"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-bold text-xl transition-colors" style={{ fontFamily: "'Space Grotesk', sans-serif", color: "var(--foreground)" }}>
            Create Network
          </h2>
          <button onClick={onClose} className="transition-colors hover:scale-110" style={{ color: "var(--muted-foreground)" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--primary)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--muted-foreground)"}>
            <MSIcon icon="close" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest mb-1 block transition-colors" style={{ color: "var(--muted-foreground)" }}>Network Name</label>
            <Input
              className="rounded-xl transition-colors border"
              style={{ background: "var(--muted)", borderColor: "var(--border)", color: "var(--foreground)" }}
              placeholder="e.g. Design Explorers"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest mb-1 block transition-colors" style={{ color: "var(--muted-foreground)" }}>Categories (press Enter to add)</label>
            <div className="flex gap-2 mb-2 flex-wrap">
              {categories.map(cat => (
                <span key={cat} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full font-bold" style={{ background: "color-mix(in srgb, var(--primary) 15%, transparent)", color: "var(--primary)", border: "1px solid color-mix(in srgb, var(--primary) 30%, transparent)" }}>
                  {cat}
                  <button type="button" onClick={() => removeCategory(cat)} style={{ marginLeft: 2, lineHeight: 1, color: "var(--primary)" }}>×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                className="rounded-xl transition-colors border flex-1"
                style={{ background: "var(--muted)", borderColor: "var(--border)", color: "var(--foreground)" }}
                placeholder="e.g. AI & ML"
                value={catInput}
                onChange={e => setCatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCategory(); } }}
              />
              <button type="button" onClick={addCategory}
                className="px-3 rounded-xl font-bold text-xs uppercase"
                style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>Add</button>
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest mb-1 block transition-colors" style={{ color: "var(--muted-foreground)" }}>Description</label>
            <textarea
              className="w-full border rounded-xl p-3 text-sm outline-none h-24 resize-none transition-colors"
              style={{ background: "var(--muted)", borderColor: "var(--border)", color: "var(--foreground)" }}
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
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
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
    <div className="group rounded-2xl overflow-hidden shadow-2xl relative transition-all duration-300 border"
      style={{ background: "rgba(255, 255, 255, 0.4)", backdropFilter: "blur(24px)", borderColor: "rgba(var(--primary), 0.1)" }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(var(--primary), 0.3)"}
      onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(var(--primary), 0.1)"}>

      <div className="h-44 relative overflow-hidden transition-colors" style={{ background: "var(--muted)" }}>
        <img
          src={network.image || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80"}
          alt={network.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 transition-colors" style={{ background: "linear-gradient(to top, var(--card), transparent)" }} />
      </div>

      <div className="p-6">
        <h3
          className="text-xl font-bold mb-1 transition-colors line-clamp-1"
          style={{ fontFamily: "'Space Grotesk', sans-serif", color: "var(--foreground)" }}
        >
          {network.title}
        </h3>
        <div className="flex items-center gap-2 mb-3">
          <MSIcon icon="groups" className="text-sm transition-colors" style={{ color: "var(--muted-foreground)" }} />
          <span className="text-xs transition-colors" style={{ color: "var(--muted-foreground)" }}>{network.memberCount || 0} Members</span>
          <span className="transition-colors" style={{ color: "var(--border)" }}>·</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-widest transition-colors"
            style={{ background: "color-mix(in srgb, var(--primary) 15%, transparent)", color: "var(--primary)" }}>
            {network.categories && network.categories.length > 0 ? network.categories[0] : "Network"}
          </span>
        </div>
        <p className="text-sm mb-6 line-clamp-2 h-10 transition-colors" style={{ color: "var(--muted-foreground)" }}>{network.description}</p>
        <Button
          onClick={() => onJoin(network._id)}
          className="w-full py-3 h-auto rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = "0 0 15px color-mix(in srgb, var(--primary) 40%, transparent)"}
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
  const [myNetworks, setMyNetworks] = useState<any[]>([]);
  const [trending, setTrending] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState("Trending");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [myLoading, setMyLoading] = useState(false);

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
      setCategories(["Trending", ...(cats.categories || []).filter((c: string) => c !== "Trending")]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadMyNetworks = async () => {
    setMyLoading(true);
    try {
      const res = await fetch(`${BASE}/community/my`, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      setMyNetworks(data.networks || data.data || []);
    } catch (err) {
      console.error('Failed to load my networks:', err);
    } finally {
      setMyLoading(false);
    }
  };

  useEffect(() => {
    if (activeCategory === 'My Communities') {
      loadMyNetworks();
    } else {
      loadData();
    }
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
      style={{ fontFamily: "'Manrope', sans-serif", background: "var(--background)", color: "var(--foreground)" }}
    >
      <Sidebar />
      <MobileHeader title="COMMUNITY" />
      <TopBar onSearch={setSearchQuery} />

      {/* Ambient glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] blur-[120px] rounded-full pointer-events-none z-0 transition-colors opacity-40"
        style={{ background: "var(--primary)" }} />
      <div className="absolute bottom-[-10%] left-[10%] w-[30%] h-[40%] blur-[120px] rounded-full pointer-events-none z-0 transition-colors opacity-30"
        style={{ background: "var(--primary)" }} />

      <main
        className="mt-20 md:mt-20 p-4 md:p-10 h-[calc(100vh-80px)] md:h-[calc(100vh-80px)] overflow-y-auto custom-scrollbar no-scrollbar relative z-10"
        style={{ marginLeft: "var(--main-margin)" }}
      >
        <section className="mb-8">
          {/* Mobile search bar */}
          <div className="md:hidden mb-4">
            <div className="relative">
              <MSIcon icon="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--muted-foreground)", fontSize: 18 }} />
              <input
                type="text"
                placeholder="Search communities..."
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none border"
                style={{ background: "var(--accent)", color: "var(--foreground)", borderColor: "var(--border)" }}
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-5xl font-bold mb-2 tracking-tight transition-colors" style={{ fontFamily: "'Space Grotesk', sans-serif", color: "var(--primary)" }}>
                Community Hub
              </h1>
              <p className="max-w-xl text-sm md:text-lg transition-colors" style={{ color: "var(--muted-foreground)" }}>
                Discover and join exclusive networks of creators, builders, and visionaries.
              </p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Button
                onClick={() => setShowCreateModal(true)}
                className="px-4 md:px-6 py-2.5 h-auto rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all hover:scale-105"
                style={{ background: "var(--primary)", color: "var(--primary-foreground)", boxShadow: "0 0 20px color-mix(in srgb, var(--primary) 20%, transparent)" }}
              >
                + Network
              </Button>
            </div>
          </div>
        </section>

        <CreateNetworkModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadData}
        />

        <section className="mb-6 flex gap-2 overflow-x-auto pb-3 custom-scrollbar no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
          {/* Fixed: My Communities tab always first */}
          <button
            onClick={() => setActiveCategory('My Communities')}
            className={cn("px-6 py-2.5 rounded-xl font-bold uppercase tracking-wider text-[10px] whitespace-nowrap transition-all border shadow-sm")}
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              background: activeCategory === 'My Communities' ? "var(--primary)" : "rgba(255, 255, 255, 0.3)",
              backdropFilter: "blur(12px)",
              color: activeCategory === 'My Communities' ? "var(--primary-foreground)" : "var(--primary)",
              borderColor: activeCategory === 'My Communities' ? "transparent" : "rgba(var(--primary), 0.1)"
            }}
            onMouseEnter={e => { if (activeCategory !== 'My Communities') e.currentTarget.style.color = 'var(--primary)'; }}
            onMouseLeave={e => { if (activeCategory !== 'My Communities') e.currentTarget.style.color = "var(--muted-foreground)"; }}
          >
            🏠 My Communities
          </button>

          {/* Dynamic API categories (Trending, etc.) */}
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-6 py-2.5 rounded-xl font-bold uppercase tracking-wider text-[10px] whitespace-nowrap transition-all border shadow-sm"
              )}
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                background: activeCategory === cat ? "var(--primary)" : "rgba(255, 255, 255, 0.3)",
                backdropFilter: "blur(12px)",
                color: activeCategory === cat ? "var(--primary-foreground)" : "var(--primary)",
                borderColor: activeCategory === cat ? "transparent" : "rgba(var(--primary), 0.1)"
              }}
              onMouseEnter={e => { if (activeCategory !== cat) e.currentTarget.style.color = "var(--primary)"; }}
              onMouseLeave={e => { if (activeCategory !== cat) e.currentTarget.style.color = "var(--muted-foreground)"; }}
            >
              {cat}
            </button>
          ))}
        </section>

        {activeCategory === 'My Communities' ? (
          myLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map(i => (<div key={i} className="h-80 animate-pulse rounded-xl" style={{ background: "var(--accent)" }} />))}
            </div>
          ) : myNetworks.length === 0 ? (
            <div className="py-24 text-center flex flex-col items-center gap-4">
              <div style={{ fontSize: 48 }}>🏘️</div>
              <p className="text-lg" style={{ color: "var(--muted-foreground)" }}>You haven't joined any networks yet.</p>
              <button onClick={() => setActiveCategory('Trending')} className="px-6 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest" style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>Discover Networks</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {myNetworks.map((network) => (<NetworkCard key={network._id} network={network} onJoin={handleJoin} />))}
            </div>
          )
        ) : loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-80 animate-pulse rounded-xl transition-colors" style={{ background: "var(--accent)" }} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {networks.map((network) => (
              <NetworkCard key={network._id} network={network} onJoin={handleJoin} />
            ))}
            {networks.length === 0 && (
              <div className="col-span-full py-20 text-center">
                <p className="text-lg transition-colors" style={{ color: "var(--muted-foreground)" }}>No networks found in this cosmic sector.</p>
              </div>
            )}
          </div>
        )}


      </main>
    </div>
  );
}