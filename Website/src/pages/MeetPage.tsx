import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import Sidebar from "@/components/Sidebar";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Participant {
  id: string;
  name: string;
  image?: string;
  initials?: string;
  isMuted?: boolean;
  isVideoOff?: boolean;
  isSelf?: boolean;
  isActiveSpeaker?: boolean;
  isMore?: boolean;
  moreCount?: number;
}

interface ControlButton {
  icon: string;
  label: string;
  filled?: boolean;
  variant?: "default" | "danger";
}

// ─── Static data ──────────────────────────────────────────────────────────────

const PARTICIPANTS: Participant[] = [
  {
    id: "more",
    isMore: true,
    moreCount: 12,
    name: "",
  },
];

const CONTROLS: ControlButton[] = [
  { icon: "mic", label: "Mute" },
  { icon: "videocam", label: "Camera" },
  { icon: "present_to_all", label: "Share" },
  { icon: "add_reaction", label: "React" },
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
      style={{
        fontVariationSettings: filled
          ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
          : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
      }}
    >
      {icon}
    </span>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MeetHeader() {
  return (
    <header className="flex items-center justify-between z-10 w-full mb-6">
      <div className="flex items-center gap-4">
        <div className="bg-[#071a2f] px-4 py-2 rounded-xl flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-[#ff716c] animate-pulse" />
          <span
            className="font-medium text-[#d8e6ff] tracking-tight uppercase text-xs"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Internal Sync: Project Nebula
          </span>
        </div>
        <span className="text-[#9eacc3] text-sm">Live Call</span>
      </div>
      <div className="flex items-center gap-2">
        {(["group", "chat_bubble"] as const).map((icon) => (
          <button
            key={icon}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#071a2f] text-[#d8e6ff] hover:bg-[#0c2037] transition-colors"
          >
            <MSIcon icon={icon} />
          </button>
        ))}
      </div>
    </header>
  );
}

function ParticipantCard({ participant }: { participant: Participant }) {
  if (participant.isMore) {
    return (
      <div className="relative aspect-video rounded-xl border border-dashed border-[#3b495c] flex items-center justify-center bg-[#031427] group cursor-pointer hover:bg-[#071a2f] transition-colors">
        <span
          className="text-xs text-[#9eacc3] group-hover:text-[#ffe792] transition-colors"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          +{participant.moreCount} others
        </span>
      </div>
    );
  }
  return null;
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function BubbleMeet() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const appID = 123456789; // REPLACE WITH REAL APP ID from ENV
    const serverSecret = "REPLACE_WITH_REAL_SECRET"; // REPLACE WITH REAL SECRET 
    const roomID = "bubble-room-1";
    const userID = Math.floor(Math.random() * 10000).toString();
    const userName = "User_" + userID;

    // Generate Kit Token
    const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
      appID,
      serverSecret,
      roomID,
      userID,
      userName
    );

    // Create instance
    const zp = ZegoUIKitPrebuilt.create(kitToken);

    // Join room
    zp.joinRoom({
      container: containerRef.current,
      scenario: {
        mode: ZegoUIKitPrebuilt.VideoConference, // Configured for high capacity
      },
      showPreJoinView: false,
      turnOnMicrophoneWhenJoining: true,
      turnOnCameraWhenJoining: true,
      showMyCameraToggleButton: true,
      showMyMicrophoneToggleButton: true,
      showAudioVideoSettingsButton: true,
      showScreenSharingButton: true,
      showUserList: true,
      maxUsers: 1000,
      layout: "Sidebar",
      showLayoutButton: true,
      showNonVideoUser: true,
      showTextChat: true,
      // Reactions and comments can be custom or Zego native chat
    });

    return () => {
      zp.destroy();
    };
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Manrope:wght@300;400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
        .material-symbols-outlined {
          font-family: 'Material Symbols Outlined';
          font-weight: normal; font-style: normal;
          display: inline-block; line-height: 1;
          text-transform: none; letter-spacing: normal;
          word-wrap: normal; white-space: nowrap; direction: ltr;
          -webkit-font-smoothing: antialiased;
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(158,172,195,0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(158,172,195,0.4); }
        .zego-container > div {
           background: transparent !important;
        }
      `}</style>

      <div
        className="bg-[#010f20] text-[#d8e6ff] overflow-hidden h-screen flex"
        style={{ fontFamily: "'Manrope', sans-serif" }}
      >
        <Sidebar />

        <main className="ml-24 flex-1 flex flex-col h-full relative p-6 gap-6 overflow-hidden">
          <MeetHeader />

          {/* Video grid container for Zego */}
          <div 
            ref={containerRef} 
            className="flex-1 rounded-3xl overflow-hidden bg-[#031427] zego-container"
            style={{ minHeight: 0 }}
          />

          {/* Ambient glows */}
          <div className="absolute -top-[20%] -right-[10%] w-[500px] h-[500px] bg-[#ffe792]/5 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute -bottom-[20%] -left-[10%] w-[500px] h-[500px] bg-[#a2c2fd]/5 blur-[120px] rounded-full pointer-events-none" />
        </main>
      </div>
    </>
  );
}