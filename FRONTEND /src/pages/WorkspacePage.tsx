import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Sidebar from "@/components/Sidebar";

// ─── Types ────────────────────────────────────────────────────────────────────

type Workspace = { id: string; label: string; active?: boolean };
type QuickFilter = { id: string; icon: string; label: string };
type FileCard = {
  id: string;
  type: "image" | "pdf" | "video";
  typeLabel: string;
  typeIcon: string;
  name: string;
  size: string;
  date: string;
  previewSrc?: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const SG: React.CSSProperties = { fontFamily: "'Space Grotesk', sans-serif" };

const NAV_ICONS = [
  { icon: "chat" },
  { icon: "work", active: true },
  { icon: "video_chat" },
  { icon: "group" },
  { icon: "rss_feed" },
  { icon: "bookmark" },
  { icon: "calendar_today" },
  { icon: "payments" },
];

const WORKSPACES: Workspace[] = [
  { id: "branding", label: "Branding Core", active: true },
  { id: "campaign", label: "Campaign Assets" },
  { id: "client", label: "Client Feedback" },
];

const QUICK_FILTERS: QuickFilter[] = [
  { id: "visuals", icon: "image", label: "Visuals" },
  { id: "docs", icon: "description", label: "Documents" },
  { id: "recent", icon: "history", label: "Recent" },
];

const FILE_CARDS: FileCard[] = [
  {
    id: "hero",
    type: "image",
    typeLabel: "Asset",
    typeIcon: "image",
    name: "Hero_Header_v2.png",
    size: "4.2 MB",
    date: "Oct 12, 2023",
    previewSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCnoPd9C4g_0rNslf5kzam9N7nEI7VpHMC-Al1_W71UyHszw0r97xWlWlby8IsyHeUvZkFIw1cMhIT-y4eOsOpvMEKxmmAFnxOfz7bB4FJ2wEC9Buq-NSb2MMynSLZ6rCB2sNikdpHoWPdA7QXFuPAtJkLBE9M-WGOxvYghnT5BcMZyRsJUCoxOLeVei1hVzforQds8CLzM9sOQQEzQVFrtPPgb1yVPKaRS6NgQN_IP23xk0WqZBZQw9HSKwDkG6CIY5CchVTjBcQkO",
  },
  {
    id: "guide",
    type: "pdf",
    typeLabel: "Document",
    typeIcon: "description",
    name: "Style_Guide_Final.pdf",
    size: "12.8 MB",
    date: "Oct 10, 2023",
  },
  {
    id: "logo",
    type: "video",
    typeLabel: "Motion",
    typeIcon: "movie",
    name: "Logo_Reveal_Loop.mp4",
    size: "85.1 MB",
    date: "Sep 28, 2023",
    previewSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBE3YRgpz4HqX0snVsBnHDaTwUkkrp1o-gO_5Vdt982UFybS1j-mPOkQEjih-F6V8m6swqx--z0UDeVQ8oDFLRe7UWui_VPUChPQkulcLwglXF-NU2X03sk3zgTAdi2WG2z4M24it1KIM4GIvb3sTkKpCWr0B7dBje6i62Q5DPU3U356p6pyFI5MavjtzgMipIH8kEhNVNQCjVwFUDgRfBpctm2ZOrc4wMPk1tiYDb2bUksibykzX3t52neASOSFDeEruk66pRFzOBr",
  },
];

const COLLABORATOR_AVATARS = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDLb32emSU4fw0oloQQn-ckuLTLZzGHi4IMbiuNNnB235SMwUEJGuucLcZ-aG4rftyugTmZs02KL5UKPeMbIb4d9BEha9eTfwMgaW6GNv7z50HLGl65XH3rB_jg642LLl9FAO-U6_eRze508h9whPxmcfXye9JbFS4cxLdOyKQYDeojFR1_mt6w_Xsczii_f8BEw-WeFotdSwhDB6-i0U6n8yyFkQlQwuFONywjhCsVKxcuv0X_7b8rH8QQP71yMeVAA-URBr0Svhit",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuD0Ua9DZrK81LXRJ7RrRjhf1YVbJG2VSjfgI5sh5WiA10Au1wUU55PFAXcXrgOgkRDbMn_4b7bG9HyaPt5J7zUaIfo3yBsoFPiJtp5Pp52sQ1DcxSYEr5UuzmXsDOpUW3WtcZ3zF8RkwfrN6mtEvkzbndkZEaRBIusvy53UvEZZI43Iu8yU6HaA7SMVDg8rh1kJSy7uN8feioAskViIEivuqThhncZMwcBe2JB9aLkrJmwTXeU54XRsHQbnbw88XQ82ee598qS2GBSD",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function MSIcon({
  name,
  filled = false,
  className = "",
  style,
}: {
  name: string;
  filled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{
        fontVariationSettings: filled
          ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
          : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
        ...style,
      }}
    >
      {name}
    </span>
  );
}


// ─── TopBar ───────────────────────────────────────────────────────────────────

function TopBar() {
  return (
    <header
      className="fixed top-0 right-0 z-40 h-20 px-10 flex justify-between items-center"
      style={{
        left: "85px",
        background: "rgba(1,15,32,0.40)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="flex items-center gap-6 flex-1">
        <div className="relative w-full max-w-md">
          <MSIcon
            name="search"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-sm"
            style={{ color: "#9eacc3", fontSize: "18px" }}
          />
          <Input
            placeholder="Search files, folders, nodes..."
            className="w-full border-none rounded-xl py-2.5 pl-12 pr-4 text-sm focus-visible:ring-2 focus-visible:ring-yellow-300/20"
            style={{ background: "#11273f", color: "#d8e6ff" }}
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <button
          className="transition-colors"
          style={{ color: "#a2c2fd" }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.color = "#ffe792")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.color = "#a2c2fd")
          }
        >
          <MSIcon name="notifications" />
        </button>
        <div
          className="h-8 w-px"
          style={{ background: "rgba(59,73,92,0.20)" }}
        />
        <div className="flex items-center gap-3">
          <span
            className="text-xs uppercase tracking-widest"
            style={{ ...SG, color: "#9eacc3" }}
          >
            Status
          </span>
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: "rgba(255,231,146,0.10)" }}
          >
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: "#ffe792" }}
            />
            <span
              className="text-[10px] uppercase font-bold tracking-tighter"
              style={{ ...SG, color: "#ffe792" }}
            >
              Live Sync
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

// ─── Left Sidebar (File Tree) ─────────────────────────────────────────────────

function FileSidebar() {
  const [activeWs, setActiveWs] = useState("branding");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  return (
    <aside
      className="w-72 flex flex-col gap-8 overflow-y-auto p-8 shrink-0"
      style={{ background: "#031427" }}
    >
      {/* New Node */}
      <Button
        className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 border-0 transition-all hover:scale-[1.02] active:scale-95"
        style={{
          ...SG,
          background: "#ffe792",
          color: "#655400",
          height: "auto",
          boxShadow: "0 10px 30px rgba(255,231,146,0.10)",
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLElement).style.background = "#ffd709")
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLElement).style.background = "#ffe792")
        }
      >
        <MSIcon name="add_circle" className="text-sm" />
        NEW NODE
      </Button>

      {/* Navigation */}
      <nav className="space-y-6">
        {/* Workspaces */}
        <div>
          <h3
            className="text-[10px] uppercase tracking-[0.2em] mb-4"
            style={{ ...SG, color: "#9eacc3" }}
          >
            Workspaces
          </h3>
          <ul className="space-y-1">
            {WORKSPACES.map((ws) => (
              <li key={ws.id}>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveWs(ws.id);
                  }}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all"
                  style={
                    activeWs === ws.id
                      ? { background: "#11273f", color: "#ffe792", fontWeight: 500 }
                      : { color: "#9eacc3" }
                  }
                  onMouseEnter={(e) => {
                    if (activeWs !== ws.id) {
                      (e.currentTarget as HTMLElement).style.background =
                        "rgba(17,39,63,0.30)";
                      (e.currentTarget as HTMLElement).style.color = "#d8e6ff";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeWs !== ws.id) {
                      (e.currentTarget as HTMLElement).style.background =
                        "transparent";
                      (e.currentTarget as HTMLElement).style.color = "#9eacc3";
                    }
                  }}
                >
                  <MSIcon
                    name={activeWs === ws.id ? "folder_open" : "folder"}
                    className="text-lg"
                  />
                  {ws.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Quick Filters */}
        <div>
          <h3
            className="text-[10px] uppercase tracking-[0.2em] mb-4"
            style={{ ...SG, color: "#9eacc3" }}
          >
            Quick Filters
          </h3>
          <ul className="space-y-1">
            {QUICK_FILTERS.map((f) => (
              <li key={f.id}>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveFilter(activeFilter === f.id ? null : f.id);
                  }}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all"
                  style={
                    activeFilter === f.id
                      ? { background: "rgba(17,39,63,0.30)", color: "#ffe792" }
                      : { color: "#9eacc3" }
                  }
                  onMouseEnter={(e) => {
                    if (activeFilter !== f.id) {
                      (e.currentTarget as HTMLElement).style.background =
                        "rgba(17,39,63,0.30)";
                      (e.currentTarget as HTMLElement).style.color = "#d8e6ff";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeFilter !== f.id) {
                      (e.currentTarget as HTMLElement).style.background =
                        "transparent";
                      (e.currentTarget as HTMLElement).style.color = "#9eacc3";
                    }
                  }}
                >
                  <MSIcon name={f.icon} className="text-lg" />
                  {f.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Storage */}
      <div
        className="mt-auto p-4 rounded-xl"
        style={{
          background: "rgba(17,39,63,0.40)",
          backdropFilter: "blur(24px)",
        }}
      >
        <div className="flex justify-between items-center mb-2">
          <span
            className="text-[10px] uppercase"
            style={{ ...SG, color: "#9eacc3" }}
          >
            Storage
          </span>
          <span
            className="text-[10px] uppercase"
            style={{ ...SG, color: "#ffe792" }}
          >
            82%
          </span>
        </div>
        <div
          className="w-full h-1.5 rounded-full overflow-hidden"
          style={{ background: "#11273f" }}
        >
          <div
            className="h-full rounded-full"
            style={{ width: "82%", background: "#ffe792" }}
          />
        </div>
        <p
          className="text-[10px] mt-2"
          style={{ color: "rgba(158,172,195,0.60)" }}
        >
          16.4 GB of 20 GB used
        </p>
      </div>
    </aside>
  );
}

// ─── File Card ────────────────────────────────────────────────────────────────

function FileCard({ file }: { file: FileCard }) {
  return (
    <div
      className="col-span-12 md:col-span-4 rounded-xl overflow-hidden group cursor-pointer border transition-all"
      style={{ background: "#031427", borderColor: "transparent" }}
      onMouseEnter={(e) =>
      ((e.currentTarget as HTMLElement).style.borderColor =
        "rgba(59,73,92,0.30)")
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLElement).style.borderColor = "transparent")
      }
    >
      {/* Preview */}
      <div
        className="aspect-video relative overflow-hidden flex items-center justify-center"
        style={{ background: "#11273f" }}
      >
        {file.previewSrc ? (
          <>
            <img
              src={file.previewSrc}
              alt={file.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(to top, rgba(1,15,32,0.80), transparent)",
              }}
            />
          </>
        ) : (
          <MSIcon
            name="picture_as_pdf"
            className="text-5xl"
            style={{ color: "rgba(158,172,195,0.30)", fontSize: "48px" }}
          />
        )}
      </div>

      {/* Info */}
      <div className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <MSIcon
            name={file.typeIcon}
            className="text-sm"
            style={{ color: "#ffe792", fontSize: "16px" }}
          />
          <span
            className="text-[10px] uppercase"
            style={{ ...SG, color: "#9eacc3" }}
          >
            {file.typeLabel}
          </span>
        </div>
        <h3 className="font-bold text-lg" style={{ ...SG, color: "#d8e6ff" }}>
          {file.name}
        </h3>
        <div className="mt-4 flex justify-between items-center">
          <span
            className="text-[10px]"
            style={{ color: "rgba(158,172,195,0.60)", ...SG }}
          >
            {file.size}
          </span>
          <span
            className="text-[10px]"
            style={{ color: "rgba(158,172,195,0.60)", ...SG }}
          >
            {file.date}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Workspace Grid ──────────────────────────────────────────────────────

function WorkspaceGrid() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  return (
    <section
      className="flex-1 overflow-y-auto p-10"
      style={{ background: "#010f20" }}
    >
      {/* Page Header */}
      <header className="flex justify-between items-end mb-12">
        <div>
          <nav
            className="flex items-center gap-2 text-[10px] uppercase tracking-widest mb-2"
            style={{ ...SG, color: "#9eacc3" }}
          >
            <span>Workspaces</span>
            <MSIcon
              name="chevron_right"
              className="text-xs"
              style={{ fontSize: "14px" }}
            />
            <span style={{ color: "#ffe792" }}>Branding Core</span>
          </nav>
          <h1
            className="text-5xl font-bold tracking-tight"
            style={{ ...SG, color: "#d8e6ff" }}
          >
            Branding Core
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {(["grid_view", "view_list"] as const).map((icon) => (
            <button
              key={icon}
              onClick={() => setViewMode(icon === "grid_view" ? "grid" : "list")}
              className="p-2 rounded-lg transition-all"
              style={{
                color:
                  (icon === "grid_view" && viewMode === "grid") ||
                    (icon === "view_list" && viewMode === "list")
                    ? "#ffe792"
                    : "#9eacc3",
                background:
                  (icon === "grid_view" && viewMode === "grid") ||
                    (icon === "view_list" && viewMode === "list")
                    ? "rgba(255,231,146,0.08)"
                    : "transparent",
              }}
            >
              <MSIcon name={icon} />
            </button>
          ))}
          <div
            className="h-6 w-px mx-2"
            style={{ background: "rgba(59,73,92,0.20)" }}
          />
          <button
            className="px-4 py-2 rounded-lg text-xs uppercase font-semibold flex items-center gap-2 border transition-colors"
            style={{
              ...SG,
              background: "#0c2037",
              color: "#d8e6ff",
              borderColor: "rgba(59,73,92,0.10)",
            }}
          >
            <MSIcon name="sort" className="text-sm" style={{ fontSize: "16px" }} />
            Latest First
          </button>
        </div>
      </header>

      {/* Bento Grid */}
      <div className="grid grid-cols-12 gap-8">
        {/* Large Featured Folder */}
        <div
          className="col-span-12 md:col-span-7 p-8 rounded-2xl group cursor-pointer border transition-all"
          style={{
            background: "rgba(17,39,63,0.40)",
            backdropFilter: "blur(24px)",
            borderColor: "rgba(59,73,92,0.05)",
          }}
          onMouseEnter={(e) =>
          ((e.currentTarget as HTMLElement).style.borderColor =
            "rgba(255,231,146,0.20)")
          }
          onMouseLeave={(e) =>
          ((e.currentTarget as HTMLElement).style.borderColor =
            "rgba(59,73,92,0.05)")
          }
        >
          <div className="flex flex-col h-full justify-between">
            <div className="flex justify-between items-start">
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,231,146,0.10)" }}
              >
                <MSIcon
                  name="folder"
                  filled
                  className="text-4xl"
                  style={{ color: "#ffe792", fontSize: "36px" }}
                />
              </div>
              <span
                className="text-[10px] uppercase tracking-widest px-3 py-1 rounded-full"
                style={{
                  ...SG,
                  background: "rgba(255,231,146,0.20)",
                  color: "#ffe792",
                }}
              >
                Primary
              </span>
            </div>
            <div className="mt-12">
              <h2
                className="text-3xl font-bold mb-2"
                style={{ ...SG, color: "#d8e6ff" }}
              >
                Visual Identity 2024
              </h2>
              <p className="text-sm max-w-sm" style={{ color: "#9eacc3" }}>
                Contains all vector assets, color palettes, and typography
                guidelines for the BUBBLE ecosystem.
              </p>
            </div>
            <div
              className="mt-8 flex items-center gap-4 text-[10px] uppercase"
              style={{ ...SG, color: "#9eacc3" }}
            >
              <span className="flex items-center gap-1">
                <MSIcon name="article" style={{ fontSize: "14px" }} />
                142 Files
              </span>
              <span className="flex items-center gap-1">
                <MSIcon name="schedule" style={{ fontSize: "14px" }} />
                2h ago
              </span>
            </div>
          </div>
        </div>

        {/* Secondary Folder */}
        <div
          className="col-span-12 md:col-span-5 p-8 rounded-2xl group cursor-pointer transition-all"
          style={{ background: "#031427" }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.background = "#071a2f")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.background = "#031427")
          }
        >
          <div className="flex flex-col h-full justify-between">
            <div className="flex justify-between items-start">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(162,194,253,0.10)" }}
              >
                <MSIcon
                  name="folder"
                  filled
                  className="text-2xl"
                  style={{ color: "#a2c2fd", fontSize: "24px" }}
                />
              </div>
              <button
                className="transition-colors"
                style={{ color: "#9eacc3" }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.color = "#ffe792")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.color = "#9eacc3")
                }
              >
                <MSIcon name="more_horiz" />
              </button>
            </div>
            <div className="mt-12">
              <h2
                className="text-2xl font-bold mb-2"
                style={{ ...SG, color: "#d8e6ff" }}
              >
                Social Media Kit
              </h2>
              <p className="text-xs" style={{ color: "#9eacc3" }}>
                Standardized templates for IG, X, and LinkedIn campaigns.
              </p>
            </div>
            <div
              className="mt-8 flex items-center gap-4 text-[10px] uppercase"
              style={{ ...SG, color: "#9eacc3" }}
            >
              <span className="flex items-center gap-1">
                <MSIcon name="article" style={{ fontSize: "14px" }} />
                28 Files
              </span>
            </div>
          </div>
        </div>

        {/* File Cards */}
        {FILE_CARDS.map((file) => (
          <FileCard key={file.id} file={file} />
        ))}

        {/* Collaborators Banner */}
        <div
          className="col-span-12 border rounded-2xl p-6 flex items-center justify-between"
          style={{
            background: "rgba(17,39,63,0.30)",
            borderColor: "rgba(255,231,146,0.10)",
          }}
        >
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              {COLLABORATOR_AVATARS.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`Collaborator ${i + 1}`}
                  className="w-8 h-8 rounded-full border-2 object-cover"
                  style={{ borderColor: "#010f20" }}
                />
              ))}
              <div
                className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-bold"
                style={{
                  borderColor: "#010f20",
                  background: "#a2c2fd",
                  color: "#173c6f",
                }}
              >
                +3
              </div>
            </div>
            <p className="text-sm" style={{ color: "#9eacc3" }}>
              Project is currently shared with{" "}
              <span style={{ color: "#ffe792" }}>Global Design Team</span>
            </p>
          </div>
          <button
            className="text-xs uppercase font-bold tracking-widest hover:underline transition-colors"
            style={{ ...SG, color: "#ffe792" }}
          >
            Manage Access
          </button>
        </div>
      </div>
    </section>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function WorkspacesPage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "#010f20", color: "#d8e6ff" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Manrope:wght@300;400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap');
        body { font-family: 'Manrope', sans-serif; }
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #010f20; }
        ::-webkit-scrollbar-thumb { background: #3b495c; border-radius: 10px; }
      `}</style>

      <Sidebar />
      <TopBar />

      <main
        className="flex overflow-hidden"
        style={{ marginLeft: "85px", paddingTop: "80px", height: "100vh" }}
      >
        <FileSidebar />
        <WorkspaceGrid />
      </main>
    </div>
  );
}