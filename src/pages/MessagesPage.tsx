import BubbleLayout from "@/components/BubbleLayout";
import { Search, Plus, Video, Phone, MoreVertical, Smile, Send } from "lucide-react";
import { Bell, Heart, Share, Download, FileText, Image as ImageIcon, Film } from "lucide-react";
import avatarLyra from "@/assets/avatar-lyra.jpg";
import avatarWoman1 from "@/assets/avatar-woman1.jpg";

const conversations = [
  { name: "Lyra Belacqua", time: "12:45", message: "The coordinates for the nebula are...", avatar: avatarLyra, online: true, active: true },
  { name: "Cassian Thorne", time: "2h ago", message: "Did you receive the encrypted logs?", avatar: null, online: false, active: false },
  { name: "Fleet Operations", time: "5h ago", message: "Systems check completed. All green.", avatar: null, online: false, active: false },
  { name: "Elowen Stark", time: "Yesterday", message: "The bubble shield is holding steady.", avatar: null, online: false, active: false },
];

const messages = [
  { id: 1, sender: "lyra", text: "Hey! I've just updated the orbital trajectory for the BUBBLE observatory. We should have clear line-of-sight for the next 48 hours.", time: "12:30 PM" },
  { id: 2, sender: "me", text: "Excellent work, Lyra. Did you account for the solar wind fluctuations in the sector?", time: "12:35 PM" },
  { id: 3, sender: "lyra", text: "The coordinates for the nebula are updated. Check this chart.", time: "12:45 PM", hasChart: true },
];

const sharedArtifacts = [
  { icon: FileText, name: "nebula-map-v2...", size: "4.2 MB", time: "2H AGO" },
  { icon: ImageIcon, name: "observation_log...", size: "12 MB", time: "YESTERDAY" },
  { icon: Film, name: "sector_7_pan.m...", size: "158 MB", time: "3D AGO" },
];

const MessagesPage = () => {
  return (
    <BubbleLayout>
      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Conversations List */}
        <div className="w-80 border-r border-border flex flex-col">
          <div className="p-4">
            <h2 className="font-display font-bold text-foreground text-2xl italic mb-3">Messages</h2>
            <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input placeholder="Search transmissions..." className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full" />
            </div>
          </div>

          {/* Stories */}
          <div className="flex gap-4 px-4 pb-3">
            {["YOUR STORY", "NOVA", "ORION"].map((name, i) => (
              <div key={name} className="flex flex-col items-center gap-1">
                <div className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center ${i === 0 ? "border-dashed border-muted-foreground" : "border-primary"}`}>
                  {i === 0 ? <Plus className="w-5 h-5 text-muted-foreground" /> : <div className="w-10 h-10 rounded-lg bg-secondary" />}
                </div>
                <span className="text-[10px] text-muted-foreground tracking-wider">{name}</span>
              </div>
            ))}
          </div>

          {/* Chat list */}
          <div className="flex-1 overflow-auto scrollbar-thin">
            {conversations.map((conv, i) => (
              <div key={i} className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${conv.active ? "bg-secondary" : "hover:bg-secondary/50"}`}>
                <div className="relative flex-shrink-0">
                  {conv.avatar ? (
                    <img src={conv.avatar} alt={conv.name} className="w-11 h-11 rounded-full object-cover" loading="lazy" width={44} height={44} />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-secondary border border-border" />
                  )}
                  {conv.online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-bubble-green rounded-full border-2 border-background" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-display font-semibold text-foreground text-sm">{conv.name}</span>
                    <span className="text-muted-foreground text-[10px]">{conv.time}</span>
                  </div>
                  <p className={`text-xs truncate ${conv.active ? "text-primary" : "text-muted-foreground"}`}>{conv.message}</p>
                </div>
                {conv.active && <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />}
              </div>
            ))}
          </div>
        </div>

        {/* Chat View */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <img src={avatarLyra} alt="Lyra" className="w-10 h-10 rounded-full object-cover" loading="lazy" width={40} height={40} />
              <div>
                <h3 className="font-display font-semibold text-foreground text-sm">Lyra Belacqua</h3>
                <span className="text-bubble-green text-[10px] tracking-wider font-semibold">TRANSMITTING LIVE</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <button className="hover:text-foreground transition-colors"><Video className="w-5 h-5" /></button>
              <button className="hover:text-foreground transition-colors"><Phone className="w-5 h-5" /></button>
              <button className="hover:text-foreground transition-colors"><MoreVertical className="w-5 h-5" /></button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-auto p-6 scrollbar-thin">
            <div className="text-center mb-6">
              <span className="text-muted-foreground text-[10px] tracking-widest bg-secondary px-3 py-1 rounded-full">TODAY, CYCLE 402</span>
            </div>
            {messages.map((msg) => (
              <div key={msg.id} className={`flex mb-4 ${msg.sender === "me" ? "justify-end" : "justify-start"}`}>
                {msg.sender !== "me" && (
                  <img src={avatarLyra} alt="Lyra" className="w-8 h-8 rounded-full object-cover mr-3 mt-1 flex-shrink-0" loading="lazy" width={32} height={32} />
                )}
                <div className={`max-w-md ${msg.sender === "me" ? "" : ""}`}>
                  <div className={`rounded-2xl px-4 py-3 text-sm ${msg.sender === "me" ? "bg-primary/20 text-primary" : "bg-card text-foreground"}`}>
                    {msg.text}
                  </div>
                  {msg.hasChart && (
                    <div className="mt-2 bg-card rounded-xl p-4 h-40 flex items-end gap-1">
                      {[30, 45, 35, 55, 40, 65, 50, 75, 60, 80, 70, 90].map((h, i) => (
                        <div key={i} className="flex-1 bg-primary/30 rounded-t" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  )}
                  <p className={`text-[10px] text-muted-foreground mt-1 ${msg.sender === "me" ? "text-right" : ""}`}>
                    {msg.time} {msg.sender === "me" && "✓✓"}
                  </p>
                </div>
                {msg.sender === "me" && (
                  <img src={avatarWoman1} alt="Me" className="w-8 h-8 rounded-full object-cover ml-3 mt-1 flex-shrink-0" loading="lazy" width={32} height={32} />
                )}
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="px-6 py-4 border-t border-border">
            <div className="flex items-center gap-3 bg-secondary rounded-xl px-4 py-3">
              <button className="text-muted-foreground hover:text-foreground transition-colors"><Plus className="w-5 h-5" /></button>
              <input placeholder="Type a message into the void..." className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none" />
              <button className="text-muted-foreground hover:text-foreground transition-colors"><Smile className="w-5 h-5" /></button>
              <button className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground hover:opacity-90 transition-opacity"><Send className="w-4 h-4" /></button>
            </div>
          </div>
        </div>

        {/* Profile Panel */}
        <div className="w-72 border-l border-border p-4 overflow-auto scrollbar-thin hidden xl:block">
          <div className="flex flex-col items-center text-center">
            <img src={avatarLyra} alt="Lyra" className="w-24 h-24 rounded-full object-cover mb-3" loading="lazy" width={96} height={96} />
            <h3 className="font-display font-bold text-foreground text-lg">Lyra Belacqua</h3>
            <p className="text-muted-foreground text-xs">Lead Astrophysicist @ BubbleLab</p>
            <div className="flex items-center gap-4 mt-3 text-muted-foreground">
              <button className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:text-foreground transition-colors"><Bell className="w-4 h-4" /></button>
              <button className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:text-foreground transition-colors"><Heart className="w-4 h-4" /></button>
              <button className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:text-foreground transition-colors"><Share className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="mt-6">
            <h4 className="text-muted-foreground text-[10px] tracking-widest mb-2">BIO</h4>
            <p className="text-foreground text-sm leading-relaxed">Scanning the unknown from the Luminous Observatory. Passionate about deep-space anomalies and coffee.</p>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-muted-foreground text-[10px] tracking-widest">SHARED ARTIFACTS</h4>
              <button className="text-primary text-[10px] tracking-wider font-semibold">VIEW ALL</button>
            </div>
            {sharedArtifacts.map((a, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <a.icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-sm font-semibold truncate">{a.name}</p>
                  <p className="text-muted-foreground text-[10px]">{a.size} · {a.time}</p>
                </div>
                <button className="text-muted-foreground hover:text-foreground transition-colors"><Download className="w-4 h-4" /></button>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <h4 className="text-muted-foreground text-[10px] tracking-widest mb-2">SYSTEM LINKS</h4>
            <div className="flex flex-wrap gap-2">
              {["bubble-net.io", "starmap.internal", "obsidian.vault"].map((link) => (
                <span key={link} className="text-foreground text-xs bg-secondary px-3 py-1.5 rounded-lg">{link}</span>
              ))}
            </div>
          </div>

          <button className="w-full mt-6 border border-destructive text-destructive font-display font-semibold text-sm py-2.5 rounded-lg hover:bg-destructive hover:text-destructive-foreground transition-colors tracking-wider">
            BLOCK FREQUENCY
          </button>
        </div>
      </div>
    </BubbleLayout>
  );
};

export default MessagesPage;
