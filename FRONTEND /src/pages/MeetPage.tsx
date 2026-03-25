import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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

const NAV_ITEMS: { icon: string; label: string; active?: boolean }[] = [
  { icon: "chat", label: "Chats" },
  { icon: "work", label: "Work" },
  { icon: "video_chat", label: "Meet", active: true },
  { icon: "groups", label: "Community" },
  { icon: "rss_feed", label: "Feed" },
];

const PARTICIPANTS: Participant[] = [
  {
    id: "sarah",
    name: "Sarah Jenkins",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuC1_JYUoG2HKZzx49FlvhEx1VyhufMT2KUtGuPrAEo5x2dFD0Mj1D_f9bCODH2FP5BhMFLNgSDNsrxfJZ42gyBfME05jNkNBiJ77aMyPCf7cRFFBw52zwJfHNHlJcWSxKrKecnloks3_nRgGhwxQ3TfDyc7nrwSSAriUYPUgu9DekLQlTwICUM1e9EJM5cQlw4nYR12PQHMJ_EEVtWWJWVCXmOrXVy9j5-ok3nGukUKUNb8e2GJUlcNGaAPheJlyP_t8ElgccYwoCs4",
    isMuted: true,
  },
  {
    id: "marcus",
    name: "Marcus Thorne",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCB8IfhhXlZNGp8b92x4cqG7Kff4FUZkAgHarSfAL3bfi4rPiCfCdRf8C0B27TTjKiKuKmmAH7RfzjbInDsDht5rdcgCp2rylJQlpI4wbNQnsMcesUZp4Sw4cMM1EkOLAMd1ba1XwD463o2dd3QS3o5q_TLktv_SMA0O-hYs6H9mactum2R1D1UN18KDX3JD4RCdCEy9_KTXgPcs1T9DieEB8K3SE8i_He3W6KiJdrVFdkagu_ei1UIK7xN9FpNej-tE__NSDJITzge",
    isActiveSpeaker: true,
  },
  {
    id: "me",
    name: "You",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCRObp-LX7o3CkYQtAci0pv11oDAWNVlV1kfy3YQX3ds44GIwYt3ylKWXKalibW_8v9y18pqCxIdArof4pcab5yC06mUFMmipUJJ6z0kjrEv-FRctiuvtJZa8l3bzgtvK24VzkxO87rCjgXrTOJxQp7f_aD1pvqceus3Xt196d1vfXDj8eT-1xdjnC80U5Z7uO5xS-m-q4xfqSpsLRdaMh7vosCBAi75blVnoI5RZaWkWUoBFkR3lu9iY84iBqL3_ePCvnazI5hGfPs",
    isSelf: true,
  },
  {
    id: "elena",
    name: "Elena K.",
    initials: "EK",
    isVideoOff: true,
  },
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

function SideNav() {
  return (
    <nav className="fixed left-0 top-0 h-screen w-24 flex flex-col items-center py-8 z-50 bg-[#010f20]/40 backdrop-blur-2xl border-r border-[#3b495c]/15 shadow-[20px_0_50px_rgba(0,0,0,0.3)]">
      {/* Logo mark */}
      <div className="mb-8 text-[#ffe792]">
        <div className="w-12 h-12 flex flex-wrap gap-1">
          {[1, 0.4, 0.6, 1].map((opacity, i) => (
            <div
              key={i}
              className="w-5 h-5 rounded-sm"
              style={{ backgroundColor: `rgba(255, 231, 146, ${opacity})` }}
            />
          ))}
        </div>
      </div>

      {/* Nav links */}
      <div className="flex flex-col items-center space-y-8 w-full">
        {NAV_ITEMS.map(({ icon, label, active }) => (
          <button
            key={label}
            className={cn(
              "flex flex-col items-center group cursor-pointer transition-all duration-500 relative",
              active ? "text-[#ffe792]" : "text-[#a2c2fd]/60 hover:text-[#ffe792]"
            )}
          >
            {active && (
              <div className="absolute -right-6 h-8 w-1 bg-[#ffe792] rounded-l-full shadow-[0_0_15px_#ffe792]" />
            )}
            <MSIcon icon={icon} className="text-2xl" />
            <span
              className="text-[10px] uppercase tracking-widest mt-1"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* Bottom */}
      <div className="mt-auto flex flex-col items-center space-y-6 w-full">
        <button className="text-[#a2c2fd]/60 hover:text-[#ffe792] transition-colors duration-500">
          <MSIcon icon="settings" className="text-2xl" />
        </button>
        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#ffe792]/20">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCltLYuRV34KK0O1u-paS2wu-UTztavVtm7uDjvdCIgT0n_rcq9fe1-OVubP2vlSdJXswO6QgrisjXs3QWEJ1zFiq1LhiFnBb6Piq49c5dqvnz-Exg0mrT2u3C9rRIe5-CJpMAHhLkZT79XV4wEDN7QAzHA2YqTbDA3IxiimZZc3rQ4MXwF-KAfFjdmB1lRsYDxTH_6QQEuzuPNIT_a8H4JISpukfBeDVuIKrGceDZy2EwFzVT-o0LIXA0EvW6TwTQeoPcleMM1cgET"
            alt="Profile"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </nav>
  );
}

function MeetHeader() {
  return (
    <header className="flex items-center justify-between z-10">
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
        <span className="text-[#9eacc3] text-sm">00:42:15</span>
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

function PrimarySpeaker() {
  return (
    <div
      className="flex-[3] relative rounded-3xl overflow-hidden bg-[#031427]"
      style={{ boxShadow: "inset 0 0 0 2px #ffe792" }}
    >
      <img
        src="https://lh3.googleusercontent.com/aida-public/AB6AXuAxzykCVljOsQglSbYxH6j7zxCDY8Uk8S5RXtVSNEe84rHLu66BFfJN88PRfO4c5_djpU9UshXmSbXpJWgT5HnFm7qmGIuk-K-jKG9SoY-erNDHxhAoNlB0oxyzOYt7jdJqY8_ZBGLggCiGyNp1QuhC_nhXcARNrHXhYp7s7_0Dpz8FXy-gaQj8A5Bt4N8yi9OcY26D_dZXT42FFTReqaLHai8iNCfcBnNqahXAiOGoYK5Y6gSauQsjrp8yd6SXeioHh1qngK2dJiFd"
        alt="Main Speaker"
        className="w-full h-full object-cover"
      />
      {/* Name badge */}
      <div className="absolute bottom-6 left-6 flex items-center gap-3">
        <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2">
          <MSIcon icon="mic" filled className="text-[#ffe792] text-sm" />
          <span
            className="font-bold text-sm tracking-tight text-white"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Alexander Chen
          </span>
        </div>
      </div>
      {/* Signal */}
      <div className="absolute top-6 right-6">
        <div className="w-8 h-8 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center">
          <MSIcon icon="signal_cellular_alt" className="text-[#ffe792] text-lg" />
        </div>
      </div>
    </div>
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

  if (participant.isVideoOff && participant.initials) {
    return (
      <div
        className="relative aspect-video rounded-xl overflow-hidden bg-[#11273f] flex items-center justify-center"
      >
        <div className="text-center">
          <div className="w-10 h-10 rounded-full bg-[#a2c2fd]/20 flex items-center justify-center mx-auto mb-2">
            <span
              className="text-[#a2c2fd] font-bold"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {participant.initials}
            </span>
          </div>
          <span
            className="text-[10px] text-[#9eacc3]"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {participant.name}
          </span>
        </div>
        <div className="absolute top-2 right-2">
          <MSIcon icon="videocam_off" className="text-[#9eacc3] text-sm" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative aspect-video rounded-xl overflow-hidden bg-[#071a2f]"
      style={
        participant.isActiveSpeaker ? { boxShadow: "inset 0 0 0 2px #ffe792" } : undefined
      }
    >
      <img
        src={participant.image}
        alt={participant.name}
        className={cn(
          "w-full h-full object-cover",
          participant.isSelf && "grayscale-[0.5]"
        )}
      />
      <div className="absolute bottom-2 left-2 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        {participant.name}
      </div>
      <div className="absolute top-2 right-2">
        {participant.isMuted && (
          <MSIcon icon="mic_off" className="text-[#ff716c] text-sm" />
        )}
        {participant.isActiveSpeaker && (
          <div className="w-1 h-1 rounded-full bg-[#ffe792] animate-ping" />
        )}
      </div>
    </div>
  );
}

function ControlBar() {
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  const toggles: Record<string, [boolean, () => void]> = {
    Mute: [micOn, () => setMicOn((v) => !v)],
    Camera: [camOn, () => setCamOn((v) => !v)],
  };

  return (
    <footer className="mt-auto mb-4 flex justify-center z-10">
      <div
        className="px-8 py-4 rounded-full flex items-center gap-6 shadow-2xl border border-white/5"
        style={{ background: "rgba(1, 15, 32, 0.4)", backdropFilter: "blur(20px)" }}
      >
        {CONTROLS.map(({ icon, label }) => {
          const toggle = toggles[label];
          const isActive = toggle ? toggle[0] : true;
          return (
            <button
              key={label}
              onClick={toggle ? toggle[1] : undefined}
              className="group flex flex-col items-center gap-1 transition-transform active:scale-90"
            >
              <div
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                  isActive
                    ? "bg-[#11273f] text-[#d8e6ff] group-hover:bg-[#ffe792] group-hover:text-[#655400]"
                    : "bg-[#ffe792]/20 text-[#ffe792]"
                )}
              >
                <MSIcon icon={isActive ? icon : icon + "_off"} />
              </div>
              <span
                className="text-[9px] uppercase tracking-widest text-[#9eacc3]"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {label}
              </span>
            </button>
          );
        })}

        {/* Divider */}
        <div className="w-px h-8 bg-[#3b495c]/30 mx-2" />

        {/* End call */}
        <button className="group flex flex-col items-center gap-1 transition-transform active:scale-90">
          <div className="w-16 h-12 rounded-full bg-[#ff716c] flex items-center justify-center text-white hover:bg-[#9f0519] transition-all shadow-[0_0_20px_rgba(255,113,108,0.3)]">
            <MSIcon icon="call_end" filled />
          </div>
          <span
            className="text-[9px] uppercase tracking-widest text-[#d7383b]"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Leave
          </span>
        </button>
      </div>
    </footer>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function BubbleMeet() {
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
      `}</style>

      <div
        className="bg-[#010f20] text-[#d8e6ff] overflow-hidden h-screen flex"
        style={{ fontFamily: "'Manrope', sans-serif" }}
      >
        <SideNav />

        <main className="ml-24 flex-1 flex flex-col h-full relative p-6 gap-6">
          <MeetHeader />

          {/* Video grid */}
          <div className="flex-1 flex gap-6 min-h-0">
            <PrimarySpeaker />

            {/* Participant sidebar */}
            <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
              {PARTICIPANTS.map((p) => (
                <ParticipantCard key={p.id} participant={p} />
              ))}
            </div>
          </div>

          <ControlBar />

          {/* Ambient glows */}
          <div className="absolute -top-[20%] -right-[10%] w-[500px] h-[500px] bg-[#ffe792]/5 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute -bottom-[20%] -left-[10%] w-[500px] h-[500px] bg-[#a2c2fd]/5 blur-[120px] rounded-full pointer-events-none" />
        </main>
      </div>
    </>
  );
}