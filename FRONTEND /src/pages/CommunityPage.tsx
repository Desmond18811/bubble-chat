import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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

const CATEGORIES: Category[] = [
  "Trending", "Design", "Development", "Web3", "AI & ML", "Marketing", "Product",
];

const NETWORKS: Network[] = [
  {
    id: "1",
    title: "Design Hackers",
    members: "12.4k Members",
    description: "The ultimate playground for UI/UX designers pushing the boundaries of spatial interfaces.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuC3O8Fzti1e3oq6lZhMcnLu96w31clcYHL0WCWaMfZYTYtpa-EK-scRFhbvNYLzSLBnct_zEK6x0jpiJcirWJyx2Asj1q4dQ-2mpWcTjdr6Uf4WL6235Kqre48K6sKlX1-JsYs1HxMGj2Sj_SB7mJPYYXdzUP3ncn6Gr2esYJLPKObUJT2VijuZtPrAZdhi-AxRJbas39VyAzynaOmqH9OzaKaqc6HPopvJRHNdIQ3ZDafap7LeZicOLvA-Kxxr6W3TjYZQXiZl0rwG",
    badge: { label: "Hot", variant: "primary" },
  },
  {
    id: "2",
    title: "Web3 Builders",
    members: "8.9k Members",
    description: "Collaborate on the next generation of decentralized protocols and cross-chain dApps.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBbJx_E3bAadV2iocZFQxVLOJ1Yhb1CemDvC2hEulOD4SMjfw773L5WW7-zTPoNLlNHPEjo9umCRUgMG3M7DgCjmf97P6EiuJNygdDLYwUPn3Mbc0Li2Y_RnxG74G_qcPggxkes38Ai0wQkNmr5ZlHHLT9F1H9mN_w6Z5Xh-DnTJJrW1t-BN7graZY-klgdkQO1ATzVlJ2EKazsSPmLRLJPuWanZhO_WQ6IpZXwhMjC7grbUKL0aZO6RqCvGIJO-JVgamOafCXy_pmG",
  },
  {
    id: "3",
    title: "AI Ethics",
    members: "3.2k Members",
    description: "Discussing the social implications and safety frameworks for large language models.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDsCLhOf0G8NMG5TQDFlr3wcQfeHDEQi2qXMnFQikjP0pQXrruypcUUQD4zmDWuPEJ5TXlyrVH--1Z_Zh-e9_d3J2b8Qx3E2MYlaUBTTSJqyBUGIW7UKDlfgJ1BLzTtnDsGU18xBUl9y-KeUvW12cWId0cmEc2aRPv6AIBucGWPVqGEdCsBSAg6aFHqCk7wFMaGUbXLjJPpQFfvqyuHKpkrE6czMRusi2jHtXAweCq1s-znB2mlRXNrPLElO-JfZrIi-GpeOb0falgI",
  },
  {
    id: "4",
    title: "Minimalist Arch",
    members: "5.7k Members",
    description: "Architects and visualizers exploring the intersection of space, light, and geometry.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDrs69xRv9txkey22jg4CKDFRJCeJShx4rz4qGkPKUr1KdKMcQjCl4IrNF5W4y4bnHX01v1Ohp9metyWXOe2M7H6XPrZkuvF6wjh1N6fA2Vhq-fleXlZbBnR6SrYCMjD55V_0smgd02Axo1t7iEpdXLrdq-53ltf3J6Vp9yl7X78ghQm-RpVeg4D8sbqXWM-UKbVnKf6I8ITdvWdaJVuJpBHk_3MDQMDCCNxKJjnkbIuM0_BdzFkT811_uyaIBRkyt8KIQYanQOQ8wI",
  },
  {
    id: "5",
    title: "Synth Wave",
    members: "1.1k Members",
    description: "A specialized hub for analog synth enthusiasts and retro-futurist composers.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuD8vZpx8ioU1O5pgShkBylSOceJdQwXOmEB4swGcSTGJCzpa2jyP-ff1tmlQ_IKOZ83xaNDDlwt61SeM9bFNdjCKX-IZTQtvpCoDwj_HvlZpFscZEWz4unseDum0g4m2HCNntmgmmihjS3X7evqBqbeC-MfbUIXccoUo47f8RngcFHYJVRCjJFJpa9DB0UefJtF3zhNtOtaxYyHZ5BmQ0NiSfhpHD1a8PVBOhj6VhfWsKUOvJnTVf9P41XF4WZmnjU1KurOakAycZ2t",
    badge: { label: "New", variant: "secondary" },
  },
  {
    id: "6",
    title: "Founders Club",
    members: "2.4k Members",
    description: "Exclusive network for seed-stage founders to share resources and network.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAyoKw_1oMm3BoylPX9-TyfWksOD-83dB5OmFX04rOa0uiILUv4e7D9lhofBl-8wspGqMxuVJjvHIWXC-K_39PxUveeFerxL7usIJ86_SNalDIF8rwxE-V3JKhcCfHlANFJUN4OA7MrGwuQCxmtlGmXoEBssbXMzwi1Om8uD2jI4qDdfWeHzleRizl9-SJpCULm5k5ntz2ZgvtrsQgg7729oGOblOilCMRIgsIuDNprrsa1zQaZlL1utBmy1txZu_qB2dIq5sszMv-1",
  },
];

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

function SideNav() {
  return (
    <aside className="fixed left-0 top-0 h-full w-[85px] z-50 bg-[#010f20]/80 backdrop-blur-xl flex flex-col items-center py-8 gap-y-6 shadow-2xl shadow-black/50">
      {/* Logo */}
      <div className="mb-4">
        <div className="text-2xl font-bold text-[#ffe792] bg-[#010f20] p-2 rounded-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          BB
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex flex-col items-center w-full gap-y-2">
        {NAV_ICONS.map(({ icon, label, active, filled }) => (
          <a
            key={label}
            href="#"
            title={label}
            className={cn(
              "w-full flex justify-center py-3 border-l-4 transition-all duration-200",
              active
                ? "text-[#ffe792] border-[#ffe792] bg-[#ffe792]/10"
                : "text-[#a2c2fd] border-transparent hover:text-[#ffe792] hover:bg-[#ffe792]/5"
            )}
          >
            <MSIcon icon={icon} filled={filled} />
          </a>
        ))}
      </nav>

      {/* Bottom */}
      <div className="mt-auto flex flex-col items-center w-full gap-y-4">
        <a href="#" className="text-[#a2c2fd] hover:text-[#ffe792] transition-colors flex justify-center w-full py-2">
          <MSIcon icon="settings" />
        </a>
        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#ffe792]/20">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCcYf7ghmT8uWOjbWz83IkRbXO0C4oM9oNcFS4S67QYANFPEYBrNC5vqOz6D31DefcInaG28_xPWLhnaqOepvVq2DvjFo2FnDXOPHKxrSA1Tz83frSaXD4kPx8BW99tTyJoLU0RQPkRTxUkxYCIEYRbf2GENkpfeNVD9XNOgbBvIqV_NXKKCas_E3B4vijSRuJIlscm4w__dJXnf2oUZn3sZRWi89G-mzvjVxs0VvJIqquuVdE6SgVekbdMKUVTJum5B6NxXLRfNqPP"
            alt="Profile"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </aside>
  );
}

function TopBar() {
  return (
    <header className="fixed top-0 right-0 left-[85px] z-40 bg-[#010f20]/40 backdrop-blur-md flex justify-between items-center h-20 px-10">
      <div className="flex-1 max-w-2xl">
        <div className="relative group">
          <MSIcon icon="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9eacc3]" />
          <Input
            type="text"
            placeholder="Search for channels..."
            className="w-full bg-[#11273f] border-none rounded-xl py-3 pl-12 pr-4 text-[#d8e6ff] placeholder:text-[#9eacc3] focus-visible:ring-2 focus-visible:ring-[#ffe792]/20 h-auto"
          />
        </div>
      </div>
      <div className="flex items-center gap-6 ml-8">
        <button className="text-[#a2c2fd] hover:text-[#ffe792] transition-colors">
          <MSIcon icon="notifications" />
        </button>
        <div className="flex items-center gap-3">
          <span className="font-bold text-[#ffe792] tracking-wider uppercase text-xs" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            BUBBLE
          </span>
          <div className="w-8 h-8 rounded-lg bg-[#0c2037] flex items-center justify-center">
            <MSIcon icon="search" className="text-[#ffe792] text-sm" />
          </div>
        </div>
      </div>
    </header>
  );
}

function NetworkCard({ network }: { network: Network }) {
  return (
    <div className="group rounded-xl overflow-hidden shadow-2xl relative bg-[#11273f]/40 backdrop-blur-xl">
      {/* Cover image */}
      <div className="h-48 relative overflow-hidden">
        <img
          src={network.image}
          alt={network.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#010f20] to-transparent" />
        {network.badge && (
          <div
            className={cn(
              "absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter",
              network.badge.variant === "primary"
                ? "bg-[#ffe792]/90 text-[#655400]"
                : "bg-[#24477a] text-[#bad1ff]"
            )}
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {network.badge.label}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-6">
        <h3
          className="text-2xl font-bold mb-2 group-hover:text-[#ffe792] transition-colors"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {network.title}
        </h3>
        <div className="flex items-center gap-2 mb-4">
          <MSIcon icon="groups" className="text-[#9eacc3] text-sm" />
          <span className="text-sm text-[#9eacc3]">{network.members}</span>
        </div>
        <p className="text-[#9eacc3] text-sm mb-6 leading-relaxed">{network.description}</p>
        <Button className="w-full py-3 h-auto bg-[#ffe792] text-[#655400] rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-[#ffd709] transition-all shadow-lg shadow-[#ffe792]/5">
          Join Network
        </Button>
      </div>
    </div>
  );
}

function FeaturedSection() {
  return (
    <section className="mt-16 grid grid-cols-1 lg:grid-cols-12 gap-8 mb-20">
      {/* Network of the Month */}
      <div className="lg:col-span-8 bg-[#11273f]/40 backdrop-blur-xl p-10 rounded-xl relative overflow-hidden flex flex-col justify-center">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#ffe792]/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <h2 className="text-3xl font-bold mb-4 relative z-10" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Network of the Month
        </h2>
        <p className="text-[#9eacc3] text-lg mb-8 max-w-lg relative z-10">
          "The Nebula Collective" has grown by over 400% this month. Join the world's largest gathering of generative artists.
        </p>
        <div className="flex items-center gap-6 relative z-10">
          <div className="flex -space-x-3">
            {FEATURED_AVATARS.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`Member ${i + 1}`}
                className="w-10 h-10 rounded-full border-2 border-[#010f20] object-cover"
              />
            ))}
            <div className="w-10 h-10 rounded-full border-2 border-[#010f20] bg-[#071a2f] flex items-center justify-center text-[10px] font-bold text-[#d8e6ff]">
              +2k
            </div>
          </div>
          <Button className="px-8 py-3 h-auto bg-[#d8e6ff] text-[#010f20] rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-[#ffe792] transition-colors">
            Explore Nebula
          </Button>
        </div>
      </div>

      {/* Trending Categories */}
      <div className="lg:col-span-4 bg-[#11273f]/40 backdrop-blur-xl p-8 rounded-xl flex flex-col">
        <h3 className="text-xl font-bold mb-6" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Trending Categories
        </h3>
        <div className="space-y-4 flex-1">
          {TRENDING_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className="w-full flex items-center justify-between p-4 bg-[#031427] rounded-xl group cursor-pointer hover:bg-[#11273f] transition-all"
            >
              <span className="text-[#d8e6ff]">{cat.label}</span>
              <MSIcon icon="chevron_right" className="text-[#ffe792] group-hover:translate-x-1 transition-transform" />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function CommunityHub() {
  const [activeCategory, setActiveCategory] = useState<Category>("Trending");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Manrope:wght@300;400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
        .material-symbols-outlined {
          font-family: 'Material Symbols Outlined';
          font-weight: normal;
          font-style: normal;
          display: inline-block;
          line-height: 1;
          text-transform: none;
          letter-spacing: normal;
          word-wrap: normal;
          white-space: nowrap;
          direction: ltr;
          -webkit-font-smoothing: antialiased;
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div
        className="bg-[#010f20] text-[#d8e6ff] overflow-hidden min-h-screen"
        style={{ fontFamily: "'Manrope', sans-serif" }}
      >
        <SideNav />
        <TopBar />

        <main className="ml-[85px] mt-20 p-10 h-[calc(100vh-80px)] overflow-y-auto">
          {/* Hero */}
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
                  variant="outline"
                  className="px-6 py-2.5 h-auto rounded-xl bg-[#0c2037] text-[#d8e6ff] border border-[#3b495c]/20 hover:bg-[#11273f] font-bold uppercase text-xs tracking-widest"
                >
                  Your Circles
                </Button>
                <Button className="px-6 py-2.5 h-auto rounded-xl bg-[#ffe792] text-[#655400] hover:bg-[#ffd709] font-bold uppercase text-xs tracking-widest shadow-lg shadow-[#ffe792]/10">
                  Create Network
                </Button>
              </div>
            </div>
          </section>

          {/* Category pills */}
          <section className="mb-10 flex gap-3 overflow-x-auto pb-4 no-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-5 py-2 rounded-full font-bold uppercase tracking-wider text-xs whitespace-nowrap transition-colors",
                  activeCategory === cat
                    ? "bg-[#ffe792] text-[#655400]"
                    : "bg-[#031427] text-[#9eacc3] hover:text-[#ffe792]"
                )}
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {cat}
              </button>
            ))}
          </section>

          {/* Network cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {NETWORKS.map((network) => (
              <NetworkCard key={network.id} network={network} />
            ))}
          </div>

          <FeaturedSection />
        </main>
      </div>
    </>
  );
}