import BubbleLayout from "@/components/BubbleLayout";
import { Pencil, ChevronRight, Key, Plus } from "lucide-react";
import avatarLyra from "@/assets/avatar-lyra.jpg";

const themes = [
  { name: "Obsidian Gold", colors: ["220 25% 8%", "45 90% 55%", "220 22% 14%"], active: true },
  { name: "Cyber Mint", colors: ["180 30% 10%", "160 60% 50%", "180 25% 15%"], active: false },
  { name: "Nebula Violet", colors: ["270 30% 12%", "280 60% 55%", "270 25% 18%"], active: false },
  { name: "Monolith Gray", colors: ["220 10% 15%", "220 10% 50%", "220 8% 20%"], active: false },
];

const integrations = [
  { name: "Figma", status: "Connected", icon: "🎨" },
  { name: "Slack", status: "Connected", icon: "💬" },
  { name: "Notion", status: "Disconnected", icon: "📝" },
];

const SettingsPage = () => {
  return (
    <BubbleLayout>
      <div className="flex-1 overflow-auto scrollbar-thin p-6 max-w-5xl mx-auto">
        <h1 className="font-display font-bold text-foreground text-4xl mb-2">Account Settings</h1>
        <p className="text-muted-foreground text-sm mb-8 max-w-2xl">
          Refine your digital existence within the Obsidian ecosystem. Personalize your interface, manage security protocols, and configure your profile identity.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Identity Profile */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-display font-bold text-foreground text-xl">Identity Profile</h2>
              <button className="bg-primary text-primary-foreground font-display font-semibold text-xs px-4 py-2 rounded-lg hover:opacity-90 transition-opacity tracking-wider">
                SAVE CHANGES
              </button>
            </div>
            <p className="text-muted-foreground text-[10px] tracking-widest mb-5">PUBLIC INFORMATION</p>

            <div className="flex items-start gap-5 mb-5">
              <div className="relative">
                <img src={avatarLyra} alt="Profile" className="w-24 h-24 rounded-xl object-cover" loading="lazy" />
                <button className="absolute -bottom-2 -right-2 w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <label className="text-muted-foreground text-[10px] tracking-widest block mb-1">DISPLAY NAME</label>
                  <input className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary transition-colors" defaultValue="Astrid Vance" />
                </div>
                <div>
                  <label className="text-muted-foreground text-[10px] tracking-widest block mb-1">UNIQUE ALIAS</label>
                  <input className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary transition-colors" defaultValue="@astrid_v" />
                </div>
              </div>
            </div>

            <div>
              <label className="text-muted-foreground text-[10px] tracking-widest block mb-1">EDITORIAL BIO</label>
              <textarea
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary transition-colors resize-none h-20"
                defaultValue="Digital architect specializing in atmospheric UI/UX design. Obsessed with deep navy palettes and celestial interfaces."
              />
            </div>
          </div>

          {/* Theme Customization */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <h2 className="font-display font-bold text-foreground text-xl mb-1">Theme Customization</h2>
            <p className="text-muted-foreground text-[10px] tracking-widest mb-5">ATMOSPHERE & VISUALS</p>

            <p className="text-muted-foreground text-[10px] tracking-widest mb-3">CORE ATMOSPHERE</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {themes.map((theme) => (
                <div
                  key={theme.name}
                  className={`p-3 rounded-xl border cursor-pointer transition-colors ${
                    theme.active ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <div className="flex gap-1.5 mb-2">
                    {theme.colors.map((c, i) => (
                      <div key={i} className="w-7 h-7 rounded-md border border-border" style={{ background: `hsl(${c})` }} />
                    ))}
                    {theme.active && <span className="ml-auto text-primary text-sm">✓</span>}
                  </div>
                  <p className="font-display font-semibold text-foreground text-xs">{theme.name}</p>
                </div>
              ))}
            </div>

            <p className="text-muted-foreground text-[10px] tracking-widest mb-3">GLASS PANEL REFRACTION</p>
            <div className="mb-6">
              <input type="range" className="w-full accent-primary" defaultValue={60} />
              <div className="flex justify-between text-muted-foreground text-[10px] mt-1">
                <span>MINIMAL BLUR</span><span>TOTAL OBSIDIAN</span>
              </div>
            </div>

            <p className="text-muted-foreground text-[10px] tracking-widest mb-3">FOCUS ACCENT OVERRIDE</p>
            <div className="flex gap-2">
              {["hsl(200, 70%, 55%)", "hsl(0, 65%, 55%)", "hsl(270, 55%, 55%)", "hsl(45, 90%, 55%)"].map((c, i) => (
                <div
                  key={i}
                  className={`w-10 h-10 rounded-full border-2 cursor-pointer ${i === 0 ? "border-foreground" : "border-transparent"}`}
                  style={{ background: c }}
                />
              ))}
              <button className="w-10 h-10 rounded-full border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="bg-card rounded-2xl border border-border p-6 mb-6">
          <h2 className="font-display font-bold text-foreground text-xl mb-1">Security Protocols</h2>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between p-4 bg-secondary rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-card flex items-center justify-center">
                  <Key className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-display font-semibold text-foreground text-sm">Two-Factor Authentication</p>
                  <p className="text-muted-foreground text-xs">Secure your account with biometric verification.</p>
                </div>
              </div>
              <div className="w-12 h-7 bg-bubble-green rounded-full relative cursor-pointer">
                <div className="absolute right-1 top-1 w-5 h-5 bg-foreground rounded-full" />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-secondary rounded-xl cursor-pointer hover:bg-muted transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-card flex items-center justify-center">
                  <Key className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-display font-semibold text-foreground text-sm">Passkey Synchronization</p>
                  <p className="text-muted-foreground text-xs">Manage encrypted access across your devices.</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Integrations */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-primary text-xl">Synchronized Ecosystem</h2>
            <button className="text-primary text-xs font-display font-semibold tracking-wider hover:opacity-80">View All Integrations</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {integrations.map((intg) => (
              <div key={intg.name} className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
                <span className="text-2xl">{intg.icon}</span>
                <div>
                  <p className="font-display font-semibold text-foreground text-sm">{intg.name}</p>
                  <p className={`text-xs ${intg.status === "Connected" ? "text-bubble-green" : "text-muted-foreground"}`}>{intg.status}</p>
                </div>
              </div>
            ))}
            <div className="bg-card rounded-xl border-2 border-dashed border-border p-4 flex items-center justify-center cursor-pointer hover:border-muted-foreground transition-colors">
              <span className="text-muted-foreground text-xs font-display font-semibold tracking-wider">LINK NEW STREAM</span>
            </div>
          </div>
        </div>
      </div>
    </BubbleLayout>
  );
};

export default SettingsPage;
