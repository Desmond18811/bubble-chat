import BubbleLayout from "@/components/BubbleLayout";
import { SlidersHorizontal, ArrowLeft, Type, Share, Bookmark, Trash2, Plus } from "lucide-react";
import spacePost from "@/assets/space-post.jpg";
import avatarLyra from "@/assets/avatar-lyra.jpg";

const filters = ["ARTICLES", "VIDEOS", "LINKS"];

const savedItems = [
  { category: "WEB3 · UI/UX", title: "The Future of Glassmorphism UI in Web3 Collectives", active: true },
  { category: "ARCHITECTURE · 12M READ", title: "Decentralized Spatial Computing Protocols", active: false },
  { category: "EDITORIAL · 5M READ", title: "Typography as User Interface: A Manifesto", active: false },
  { category: "NETWORK · 22M READ", title: "Bubble Protocol: Scaling Beyond Local Nodes", active: false },
  { category: "DESIGN · 8M READ", title: "The Psychology of Haptic Feedback in VR", active: false },
];

const SavedPage = () => {
  return (
    <BubbleLayout>
      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Saved List */}
        <div className="w-96 border-r border-border flex flex-col p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-foreground text-2xl">Saved</h2>
            <button className="text-muted-foreground hover:text-foreground transition-colors">
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-2 mb-4">
            {filters.map((f, i) => (
              <button
                key={f}
                className={`text-[10px] tracking-wider font-display font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                  i === 0
                    ? "border-primary text-primary bg-primary/10"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto scrollbar-thin">
            {savedItems.map((item, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer mb-1 transition-colors ${
                  item.active ? "bg-secondary" : "hover:bg-secondary/50"
                }`}
              >
                <div className="w-16 h-16 rounded-lg bg-card border border-border flex-shrink-0 overflow-hidden">
                  <img src={spacePost} alt="" className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-primary text-[10px] tracking-wider font-semibold mb-0.5">{item.category}</p>
                  <p className="text-foreground text-sm font-display font-semibold leading-tight">{item.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Article View */}
        <div className="flex-1 overflow-auto scrollbar-thin p-6">
          <div className="flex items-center justify-between mb-4">
            <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" /> BACK TO LIST
            </button>
            <div className="flex items-center gap-3 text-muted-foreground">
              <button className="hover:text-foreground transition-colors"><Type className="w-5 h-5" /></button>
              <button className="hover:text-foreground transition-colors"><Share className="w-5 h-5" /></button>
              <button className="hover:text-primary transition-colors"><Bookmark className="w-5 h-5" /></button>
              <button className="hover:text-destructive transition-colors"><Trash2 className="w-5 h-5" /></button>
            </div>
          </div>

          {/* Hero Image */}
          <div className="w-full h-72 rounded-2xl overflow-hidden mb-6">
            <img src={spacePost} alt="Article hero" className="w-full h-full object-cover" loading="lazy" />
          </div>

          <div className="flex items-center gap-3 mb-4">
            <span className="text-primary text-[10px] tracking-wider font-semibold border border-primary/40 px-2 py-0.5 rounded">EDITORIAL FOCUS</span>
            <span className="text-muted-foreground text-xs">PUBLISHED OCT 24, 2023</span>
          </div>

          <h1 className="font-display font-bold text-foreground text-4xl leading-tight mb-6">
            The Future of Glassmorphism UI in Web3 Collectives
          </h1>

          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-border">
            <img src={avatarLyra} alt="Author" className="w-10 h-10 rounded-full object-cover" loading="lazy" />
            <div>
              <p className="font-display font-semibold text-foreground text-sm">Julian Vane</p>
              <p className="text-muted-foreground text-xs">Design Lead @ BUBBLE Labs</p>
            </div>
          </div>

          <div className="max-w-2xl">
            <p className="text-foreground leading-relaxed text-sm">
              <span className="font-display font-bold text-3xl float-left mr-2 mt-1 text-primary">A</span>
              s we navigate the shifting landscapes of the decentralized web, our visual language must evolve to reflect the transparency and layered complexity of the systems we build. Glassmorphism — with its frosted surfaces, luminous borders, and depth-creating overlays — has emerged as the aesthetic lingua franca of Web3 interfaces.
            </p>
            <p className="text-foreground leading-relaxed text-sm mt-4">
              The convergence of spatial computing and decentralized protocols demands interfaces that communicate trust through visual clarity. Each layer of glass becomes a metaphor for the transparent ledgers that underpin our digital interactions.
            </p>
          </div>

          {/* FAB */}
          <button className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center text-2xl font-light hover:scale-105 transition-transform">
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>
    </BubbleLayout>
  );
};

export default SavedPage;
