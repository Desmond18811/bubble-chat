import BubbleLayout from "@/components/BubbleLayout";
import { Plus, LayoutGrid, List, SlidersHorizontal, Folder, FolderOpen, Image as ImageIcon, FileText, Film, Clock, MoreHorizontal } from "lucide-react";
import spacePost from "@/assets/space-post.jpg";

const workspaces = [
  { name: "Branding Core", active: true },
  { name: "Campaign Assets", active: false },
  { name: "Client Feedback", active: false },
];

const quickFilters = [
  { icon: ImageIcon, label: "Visuals" },
  { icon: FileText, label: "Documents" },
  { icon: Clock, label: "Recent" },
];

const folders = [
  { name: "Visual Identity 2024", desc: "Contains all vector assets, color palettes, and typography guidelines for the BUBBLE ecosystem.", files: 142, time: "2H AGO", primary: true },
  { name: "Social Media Kit", desc: "Standardized templates for IG, X, and LinkedIn campaigns.", files: 28, time: "", primary: false },
];

const files = [
  { type: "ASSET", icon: ImageIcon, name: "Hero_Header_v2.png", size: "4.2 MB", date: "Oct 12, 2023", hasPreview: true },
  { type: "DOCUMENT", icon: FileText, name: "Style_Guide_Final.pdf", size: "12.8 MB", date: "Oct 10, 2023", hasPreview: false },
  { type: "MOTION", icon: Film, name: "Logo_Reveal_Loop.mp4", size: "85.1 MB", date: "Sep 28, 2023", hasPreview: true },
];

const WorkspacePage = () => {
  return (
    <BubbleLayout>
      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Left Panel */}
        <div className="w-72 border-r border-border p-4 flex flex-col">
          <button className="w-full bg-primary text-primary-foreground font-display font-semibold text-sm py-3 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity mb-6">
            <Plus className="w-4 h-4" /> NEW NODE
          </button>

          <div className="mb-6">
            <h4 className="text-muted-foreground text-[10px] tracking-widest mb-2">WORKSPACES</h4>
            {workspaces.map((ws) => (
              <div key={ws.name} className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${ws.active ? "bg-secondary text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                {ws.active ? <FolderOpen className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
                <span className="text-sm">{ws.name}</span>
              </div>
            ))}
          </div>

          <div>
            <h4 className="text-muted-foreground text-[10px] tracking-widest mb-2">QUICK FILTERS</h4>
            {quickFilters.map((f) => (
              <div key={f.label} className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                <f.icon className="w-4 h-4" />
                <span className="text-sm">{f.label}</span>
              </div>
            ))}
          </div>

          <div className="mt-auto">
            <div className="mb-1 flex items-center justify-between text-muted-foreground text-xs">
              <span>STORAGE</span><span>82%</span>
            </div>
            <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: "82%" }} />
            </div>
            <p className="text-muted-foreground text-[10px] mt-1">16.4 GB of 20 GB used</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-6 scrollbar-thin">
          {/* Breadcrumb */}
          <div className="text-muted-foreground text-[10px] tracking-widest mb-1">WORKSPACES › BRANDING CORE</div>
          <div className="flex items-center justify-between mb-6">
            <h1 className="font-display font-bold text-foreground text-3xl">Branding Core</h1>
            <div className="flex items-center gap-3">
              <button className="text-muted-foreground hover:text-foreground transition-colors"><LayoutGrid className="w-5 h-5" /></button>
              <button className="text-muted-foreground hover:text-foreground transition-colors"><List className="w-5 h-5" /></button>
              <button className="flex items-center gap-2 bg-secondary text-foreground text-sm px-3 py-1.5 rounded-lg hover:bg-muted transition-colors">
                <SlidersHorizontal className="w-4 h-4" /> LATEST FIRST
              </button>
            </div>
          </div>

          {/* Folder Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {folders.map((folder) => (
              <div key={folder.name} className="bg-card rounded-xl p-5 border border-border hover:border-primary/30 transition-colors cursor-pointer group">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Folder className={`w-5 h-5 ${folder.primary ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex items-center gap-2">
                    {folder.primary && <span className="text-[10px] tracking-wider bg-primary/20 text-primary px-2 py-0.5 rounded font-semibold">PRIMARY</span>}
                    <button className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"><MoreHorizontal className="w-4 h-4" /></button>
                  </div>
                </div>
                <h3 className="font-display font-semibold text-foreground text-lg mb-1">{folder.name}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-3">{folder.desc}</p>
                <div className="flex items-center gap-3 text-muted-foreground text-[10px] tracking-wider">
                  <span>📁 {folder.files} FILES</span>
                  {folder.time && <span>🕐 {folder.time}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* File Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {files.map((file) => (
              <div key={file.name} className="bg-card rounded-xl overflow-hidden border border-border hover:border-primary/30 transition-colors cursor-pointer">
                <div className="h-36 bg-secondary flex items-center justify-center overflow-hidden">
                  {file.hasPreview ? (
                    <img src={spacePost} alt={file.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="text-muted-foreground text-2xl font-display font-bold">PDF</div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <file.icon className="w-3 h-3 text-primary" />
                    <span className="text-primary text-[10px] tracking-wider font-semibold">{file.type}</span>
                  </div>
                  <h4 className="font-display font-semibold text-foreground text-sm">{file.name}</h4>
                  <div className="flex items-center justify-between mt-1 text-muted-foreground text-[10px]">
                    <span>{file.size}</span><span>{file.date}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="bg-card rounded-xl p-4 flex items-center justify-between border border-border">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-secondary border-2 border-card" />
                ))}
              </div>
              <span className="text-muted-foreground text-xs bg-secondary px-2 py-0.5 rounded-full">+3</span>
              <span className="text-foreground text-sm">Project is currently shared with <strong className="font-display">Global Design Team</strong></span>
            </div>
            <button className="text-primary text-xs font-display font-semibold tracking-wider hover:opacity-80">MANAGE ACCESS</button>
          </div>
        </div>
      </div>
    </BubbleLayout>
  );
};

export default WorkspacePage;
