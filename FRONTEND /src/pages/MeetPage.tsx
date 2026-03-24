import BubbleLayout from "@/components/BubbleLayout";
import { Mic, Video, MonitorUp, SmilePlus, PhoneOff, Volume2 } from "lucide-react";
import avatarWoman1 from "@/assets/avatar-woman1.jpg";
import avatarWoman2 from "@/assets/avatar-woman2.jpg";
import avatarLyra from "@/assets/avatar-lyra.jpg";

const participants = [
  { name: "Sarah Jenkins", avatar: avatarWoman1, muted: false },
  { name: "Marcus Thorne", avatar: avatarLyra, muted: false },
  { name: "You", avatar: avatarWoman2, muted: false },
  { name: "Elena K.", avatar: null, initials: "EK", muted: true },
];

const MeetPage = () => {
  return (
    <BubbleLayout>
      <div className="flex flex-col h-[calc(100vh-3.5rem)]">
        {/* Meeting Header */}
        <div className="flex items-center gap-4 px-6 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
            <span className="font-display font-bold text-foreground text-sm tracking-wider">INTERNAL SYNC: PROJECT NEBULA</span>
          </div>
          <span className="text-muted-foreground font-display text-sm">00:42:15</span>
          <div className="ml-auto flex items-center gap-3 text-muted-foreground">
            <button className="hover:text-foreground transition-colors"><Volume2 className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Main Video */}
          <div className="flex-1 p-4 flex flex-col">
            <div className="flex-1 bg-card rounded-2xl border border-border relative overflow-hidden flex items-center justify-center">
              <div className="text-center">
                <div className="w-32 h-32 rounded-full bg-secondary border-2 border-border mx-auto mb-4 flex items-center justify-center">
                  <span className="font-display font-bold text-foreground text-3xl">AC</span>
                </div>
                <p className="text-foreground font-display text-lg">Alexander Chen</p>
                <p className="text-muted-foreground text-xs mt-1">Presenting screen</p>
              </div>
              {/* Signal indicator */}
              <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-secondary/80 flex items-center justify-center">
                <Volume2 className="w-4 h-4 text-bubble-green" />
              </div>
              {/* Speaker label */}
              <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                <span className="text-primary text-sm">🎙</span>
                <span className="text-foreground text-sm font-display font-semibold">Alexander Chen</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4 mt-4">
              {[
                { icon: Mic, label: "MUTE" },
                { icon: Video, label: "CAMERA" },
                { icon: MonitorUp, label: "SHARE" },
                { icon: SmilePlus, label: "REACT" },
              ].map((ctrl) => (
                <button key={ctrl.label} className="flex flex-col items-center gap-1.5 w-16">
                  <div className="w-12 h-12 rounded-full bg-secondary border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors">
                    <ctrl.icon className="w-5 h-5" />
                  </div>
                  <span className="text-muted-foreground text-[10px] tracking-wider">{ctrl.label}</span>
                </button>
              ))}
              <button className="flex flex-col items-center gap-1.5 w-16">
                <div className="w-12 h-12 rounded-full bg-destructive flex items-center justify-center text-destructive-foreground hover:bg-destructive/80 transition-colors">
                  <PhoneOff className="w-5 h-5" />
                </div>
                <span className="text-destructive text-[10px] tracking-wider">LEAVE</span>
              </button>
            </div>
          </div>

          {/* Participants Panel */}
          <div className="w-64 p-4 flex flex-col gap-3 overflow-auto scrollbar-thin">
            {participants.map((p, i) => (
              <div key={i} className="relative rounded-xl overflow-hidden border border-border aspect-[4/3]">
                {p.avatar ? (
                  <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full bg-card flex flex-col items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-1">
                      <span className="font-display font-bold text-muted-foreground text-sm">{p.initials}</span>
                    </div>
                    <span className="text-muted-foreground text-xs">{p.name}</span>
                  </div>
                )}
                {p.avatar && (
                  <div className="absolute bottom-2 left-2 bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded text-xs text-foreground font-display">
                    {p.name}
                  </div>
                )}
                {p.muted && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-background/80 flex items-center justify-center">
                    <Mic className="w-3 h-3 text-destructive" />
                  </div>
                )}
              </div>
            ))}
            {/* +12 others */}
            <div className="rounded-xl border-2 border-dashed border-border aspect-[4/3] flex items-center justify-center">
              <span className="text-muted-foreground text-sm">+12 others</span>
            </div>
          </div>
        </div>
      </div>
    </BubbleLayout>
  );
};

export default MeetPage;
