import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewMode = "Day" | "Week" | "Month";

interface CalendarEvent {
  id: string;
  title: string;
  subtitle?: string;
  startHour: number; // fractional hour, e.g. 11.0 = 11:00
  durationHours: number;
  variant: "primary" | "secondary" | "surface";
  avatars?: string[];
  dayIndex: number; // 0 = Mon
}

interface UpcomingItem {
  id: string;
  time: string;
  title: string;
  subtitle: string;
  color: "primary" | "secondary";
}

// ─── Static data ──────────────────────────────────────────────────────────────

const NAV_ICONS = [
  { icon: "chat", label: "Chat" },
  { icon: "work", label: "Work" },
  { icon: "video_chat", label: "Video" },
  { icon: "group", label: "Team" },
  { icon: "rss_feed", label: "Feed" },
  { icon: "bookmark", label: "Bookmarks" },
  { icon: "calendar_today", label: "Calendar", active: true, filled: true },
  { icon: "payments", label: "Payments" },
] as const;

const DAYS = [
  { label: "Mon", date: 12 },
  { label: "Tue", date: 13 },
  { label: "Wed", date: 14, isToday: true },
  { label: "Thu", date: 15 },
  { label: "Fri", date: 16 },
  { label: "Sat", date: 17, isWeekend: true },
  { label: "Sun", date: 18, isWeekend: true },
];

const TIME_SLOTS = [9, 10, 11, 12, 13];

const EVENTS: CalendarEvent[] = [
  {
    id: "1",
    title: "Weekly Sync",
    subtitle: "Room A",
    startHour: 9,
    durationHours: 1.33,
    variant: "surface",
    dayIndex: 0,
  },
  {
    id: "2",
    title: "Design Sync",
    startHour: 10.83,
    durationHours: 0.83,
    variant: "primary",
    dayIndex: 2,
    avatars: [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCkKaVIjZcudvMsVoE6Y7WI4Alhq87tLd4R8Zln5WQJzcBx_trA2AJG2ZRzcKSkuoYV2YfDBwgTTFB05UFC29Y7VvvFyRxnG3lNXTiC7uNmjZRDw4bXVEBNykvMo0bQvLzm3e1wR9ri1NlK02qo-NkGmAOrtTkgQjxMOiE8j_gaxnIDZjrKast7cmrXEBYOJt6YSGhY4Q46KTSJ2O94yYHKBsO6tksXT7UUa4AyR1t1YR2REidXGsMJgcOxUo6gL1IDfcpXZ72vsVYk",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAzI90gk7FRgcVcPROQGhZw3iH5CDzXzZ8JsaSar8bxA1GNZFBv40YS1cLq2msp8s8GZWy-2tHGriA_fZsWIS6mQ1G3okvM7bTwqlxFWstYLSiKbBCgNccM-oM-SBkXQz6zt7jafGBJFJjZjA7UEpczI_fswaLkJzcndeNOzENVRR2TNXVLyXQ4b7r1ttt03CniG244lWugynkxrrM9k6LzBGDSGQrMyxXduxqezNAOxs_hXdo7oyCEHu-eWhbdNb9xy8aDZD1PIXfH",
    ],
  },
  {
    id: "3",
    title: "Client Brief",
    startHour: 9.33,
    durationHours: 0.67,
    variant: "surface",
    dayIndex: 3,
  },
  {
    id: "4",
    title: "Bubble Audit",
    startHour: 11,
    durationHours: 1.33,
    variant: "secondary",
    dayIndex: 3,
  },
];

const UPCOMING: UpcomingItem[] = [
  {
    id: "1",
    time: "11:00 – 12:30",
    title: "Design Sync",
    subtitle: "Global Product Team",
    color: "primary",
  },
  {
    id: "2",
    time: "14:00 – 15:00",
    title: "Weekly Review",
    subtitle: "Engineering Sync",
    color: "secondary",
  },
];

const MINI_CAL_DATES = [
  ["28*", "29*", "30*", "1", "2", "3", "4"],
  ["5", "6", "7", "8", "9", "10", "11"],
  ["12", "13", "14", "15", "16", "17", "18"],
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert fractional hour to pixel offset (96px per hour) */
const hourToPx = (h: number) => (h - 9) * 96;

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function SideNav() {
  return (
    <aside className="fixed left-0 top-0 h-full w-[85px] z-50 bg-[#010f20]/80 backdrop-blur-xl flex flex-col items-center py-8 gap-y-6 shadow-2xl shadow-black/50">
      {/* Logo */}
      <div className="text-2xl font-bold text-[#ffe792] bg-[#010f20] p-2 rounded-lg font-headline">
        BB
      </div>

      {/* Main nav */}
      <nav className="flex flex-col w-full gap-y-2 flex-grow">
        {NAV_ICONS.map(({ icon, label, active, filled }) => (
          <a
            key={label}
            href="#"
            title={label}
            className={cn(
              "w-full flex justify-center py-3 border-l-4 transition-all",
              active
                ? "text-[#ffe792] border-[#ffe792] bg-[#ffe792]/10 scale-95 duration-200"
                : "text-[#a2c2fd] border-transparent hover:bg-[#ffe792]/5 hover:text-[#ffe792]"
            )}
          >
            <MSIcon icon={icon} filled={filled} />
          </a>
        ))}
      </nav>

      {/* Bottom */}
      <div className="flex flex-col w-full gap-y-2">
        {(["settings", "account_circle"] as const).map((icon) => (
          <a
            key={icon}
            href="#"
            className="w-full flex justify-center py-3 text-[#a2c2fd] border-l-4 border-transparent hover:bg-[#ffe792]/5 hover:text-[#ffe792] transition-all"
          >
            <MSIcon icon={icon} />
          </a>
        ))}
      </div>
    </aside>
  );
}

function TopBar() {
  return (
    <header className="flex justify-between items-center h-20 px-10 fixed top-0 right-0 left-[85px] z-40 bg-[#010f20]/40 backdrop-blur-md">
      <div className="flex items-center bg-[#11273f] px-4 py-2 rounded-xl focus-within:ring-2 focus-within:ring-[#ffe792]/20 transition-all">
        <MSIcon icon="search" className="text-[#68768b] text-sm mr-2" />
        <Input
          type="text"
          placeholder="Search events..."
          className="bg-transparent border-none focus-visible:ring-0 text-sm text-[#9eacc3] w-64 placeholder:text-[#68768b] h-auto p-0"
        />
      </div>

      <div className="flex items-center gap-6">
        <button className="p-2 text-[#a2c2fd] hover:text-[#ffe792] transition-colors">
          <MSIcon icon="notifications" />
        </button>
        <div className="h-10 w-10 rounded-full bg-[#0c2037] overflow-hidden border border-[#3b495c]/20">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuChttp6jw4LsU4XItatDjPf-fNScHqUtTYGlrEd93i56yQ-Rm5a3fg0W710gHSpqqtIJWUkrDl8bNYrx2dEeFrwyLuJurQ9jkP9Ty_UmzGjz17El4GSdYqxw-TsdUB9KUvQ2PffvL8t1DjomGClY_pqx1QQ7yv5j9oi5obURo26eA2tLbAc9G9V4O0Eg6arDKRVEDoX1bSLTwuEQxaLOpvaYQLXSHuKhN2n8-AkJqDEW84gJlsmAYYJZ31tnvxdsL3LmcKjpCY1fq9O"
            alt="User Profile"
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    </header>
  );
}

function EventBlock({ event }: { event: CalendarEvent }) {
  const top = hourToPx(event.startHour);
  const height = event.durationHours * 96;

  const styles: Record<CalendarEvent["variant"], string> = {
    primary:
      "bg-[#ffe792]/20 border-l-4 border-[#ffe792] text-[#ffe792]",
    secondary:
      "bg-[#a2c2fd]/10 border-l-4 border-[#a2c2fd] text-[#a2c2fd]",
    surface:
      "bg-[#071a2f] border border-[#3b495c]/20 text-[#d8e6ff]",
  };

  return (
    <div
      className={cn(
        "absolute left-1 right-1 rounded-xl p-3 flex flex-col justify-center overflow-hidden",
        styles[event.variant]
      )}
      style={{ top, height }}
    >
      <p className="font-bold text-[11px] leading-tight truncate">{event.title}</p>
      {event.subtitle && (
        <p className="text-[10px] mt-0.5 opacity-70 truncate">{event.subtitle}</p>
      )}
      {event.avatars && event.avatars.length > 0 && (
        <div className="flex -space-x-1 mt-1.5">
          {event.avatars.map((src, i) => (
            <div
              key={i}
              className="h-4 w-4 rounded-full border border-[#010f20] bg-slate-500 overflow-hidden"
            >
              <img src={src} alt="Avatar" className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CalendarGrid() {
  const GRID_HEIGHT = 5 * 96; // 5 time slots × 96px

  return (
    <div className="col-span-12 lg:col-span-9 flex flex-col bg-[#11273f]/40 backdrop-blur-xl rounded-3xl border border-[#3b495c]/10 overflow-hidden relative">
      {/* Day headers */}
      <div className="grid grid-cols-8 border-b border-[#3b495c]/10 flex-shrink-0">
        <div className="p-4 flex items-center justify-center border-r border-[#3b495c]/10 bg-[#071a2f]/50">
          <span className="font-mono text-[10px] uppercase text-[#68768b]">GMT+2</span>
        </div>
        {DAYS.map(({ label, date, isToday, isWeekend }) => (
          <div
            key={date}
            className={cn(
              "p-4 flex flex-col items-center",
              isToday && "bg-[#ffe792]/5",
              isWeekend && "opacity-40"
            )}
          >
            <span
              className={cn(
                "text-[10px] uppercase font-semibold font-mono",
                isToday ? "text-[#ffe792]" : "text-[#a2c2fd]"
              )}
            >
              {label}
            </span>
            <span
              className={cn(
                "text-xl font-bold mt-0.5",
                isToday ? "text-[#ffe792]" : "text-[#d8e6ff]"
              )}
            >
              {date}
            </span>
          </div>
        ))}
      </div>

      {/* Time body */}
      <div className="flex-grow overflow-y-auto relative">
        {/* Current time indicator at ~42% */}
        <div
          className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
          style={{ top: `${GRID_HEIGHT * 0.42}px` }}
        >
          <div className="h-px flex-grow bg-[#ffe792] shadow-[0_0_15px_2px_rgba(255,231,146,0.4)]" />
          <div className="h-3 w-3 rounded-full bg-[#ffe792] shadow-[0_0_10px_#ffe792]" />
        </div>

        <div className="grid grid-cols-8" style={{ minHeight: `${GRID_HEIGHT}px` }}>
          {/* Time column */}
          <div className="col-span-1 border-r border-[#3b495c]/10">
            {TIME_SLOTS.map((h) => (
              <div
                key={h}
                className={cn(
                  "h-24 border-b border-[#3b495c]/5 flex items-start justify-center pt-2",
                  h === 11 && "bg-[#ffe792]/5"
                )}
              >
                <span
                  className={cn(
                    "text-[10px] font-mono",
                    h === 11 ? "text-[#ffe792] font-bold" : "text-[#68768b]"
                  )}
                >
                  {h}:00
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {DAYS.map(({ date, isToday, isWeekend }, dayIdx) => (
            <div
              key={date}
              className={cn(
                "col-span-1 border-r border-[#3b495c]/10 relative",
                isToday && "bg-[#ffe792]/5",
                isWeekend && "bg-[#071a2f]/20",
                dayIdx === DAYS.length - 1 && "border-r-0"
              )}
            >
              {EVENTS.filter((e) => e.dayIndex === dayIdx).map((event) => (
                <EventBlock key={event.id} event={event} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniCalendar() {
  return (
    <div className="bg-[#11273f]/40 backdrop-blur-xl rounded-3xl border border-[#3b495c]/10 p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-sm font-bold tracking-widest text-[#d8e6ff]">OCTOBER</h3>
        <div className="flex gap-2">
          <button className="text-[#9eacc3] hover:text-[#ffe792] transition-colors">
            <MSIcon icon="chevron_left" className="text-base" />
          </button>
          <button className="text-[#9eacc3] hover:text-[#ffe792] transition-colors">
            <MSIcon icon="chevron_right" className="text-base" />
          </button>
        </div>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 gap-y-3 text-center mb-1">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i} className="text-[10px] font-mono text-[#68768b]">
            {d}
          </span>
        ))}
      </div>

      {/* Date rows */}
      <div className="grid grid-cols-7 gap-y-3 text-center">
        {MINI_CAL_DATES.flat().map((d, i) => {
          const isGray = d.endsWith("*");
          const raw = isGray ? d.slice(0, -1) : d;
          const isToday = raw === "14" && !isGray;
          return (
            <span
              key={i}
              className={cn(
                "text-xs mx-auto flex items-center justify-center h-6 w-6 rounded-full cursor-pointer transition-colors",
                isGray && "text-[#68768b]/30",
                !isGray && !isToday && "text-[#d8e6ff] hover:bg-[#ffe792]/10",
                isToday && "bg-[#ffe792] text-[#655400] font-bold"
              )}
            >
              {raw}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function UpcomingPanel() {
  return (
    <div className="flex-grow bg-[#11273f]/40 backdrop-blur-xl rounded-3xl border border-[#3b495c]/10 p-6 flex flex-col">
      <h3 className="text-sm font-bold tracking-widest text-[#d8e6ff] mb-6">UPCOMING TODAY</h3>

      <div className="space-y-6">
        {UPCOMING.map((item) => (
          <div key={item.id} className="flex gap-4">
            <div
              className={cn(
                "h-10 w-1 flex-shrink-0 rounded-full",
                item.color === "primary" ? "bg-[#ffe792]" : "bg-[#a2c2fd]"
              )}
            />
            <div>
              <p className="text-[10px] font-mono uppercase text-[#68768b]">{item.time}</p>
              <p className="text-sm font-bold text-[#d8e6ff]">{item.title}</p>
              <p className="text-xs text-[#9eacc3]">{item.subtitle}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-8">
        <Button
          variant="outline"
          className="w-full bg-[#11273f] hover:bg-[#162d48] border border-[#3b495c]/20 py-4 h-auto rounded-2xl flex items-center justify-center gap-3 group"
        >
          <MSIcon
            icon="auto_awesome"
            className="text-[#ffe792] group-hover:scale-110 transition-transform"
          />
          <span className="text-xs font-bold tracking-widest text-[#ffe792] uppercase">
            AI Schedule Optimization
          </span>
        </Button>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function CalendarDashboard() {
  const [viewMode, setViewMode] = useState<ViewMode>("Day");

  return (
    <>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Manrope:wght@300;400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
        .material-symbols-outlined { font-family: 'Material Symbols Outlined'; font-weight: normal; font-style: normal; display: inline-block; line-height: 1; text-transform: none; letter-spacing: normal; word-wrap: normal; white-space: nowrap; direction: ltr; }
        .font-headline { font-family: 'Space Grotesk', sans-serif; }
        .font-mono { font-family: 'Space Grotesk', monospace; }
      `}</style>

      <div
        className="bg-[#010f20] text-[#d8e6ff] overflow-hidden h-screen flex"
        style={{ fontFamily: "'Manrope', sans-serif" }}
      >
        <SideNav />

        <main className="ml-[85px] w-full h-full flex flex-col relative">
          <TopBar />

          <section className="mt-20 p-8 flex flex-col h-full overflow-hidden">
            {/* Page header */}
            <div className="flex justify-between items-end mb-10">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-widest text-[#a2c2fd] font-semibold font-mono">
                  Timeline Observatory
                </p>
                <h1 className="text-5xl font-bold tracking-tighter text-[#d8e6ff] font-headline">
                  OCTOBER 2026
                </h1>
              </div>

              <div className="flex items-center gap-4">
                {/* View toggle */}
                <div className="flex bg-[#031427] p-1 rounded-xl">
                  {(["Day", "Week", "Month"] as ViewMode[]).map((v) => (
                    <button
                      key={v}
                      onClick={() => setViewMode(v)}
                      className={cn(
                        "px-6 py-2 rounded-lg text-xs uppercase font-bold font-mono transition-all",
                        viewMode === v
                          ? "bg-[#ffe792] text-[#655400]"
                          : "text-[#9eacc3] hover:text-[#ffe792]"
                      )}
                    >
                      {v}
                    </button>
                  ))}
                </div>

                {/* Add button */}
                <button className="bg-[#ffe792] hover:bg-[#ffd709] text-[#655400] h-12 w-12 rounded-xl flex items-center justify-center transition-all">
                  <MSIcon icon="add" />
                </button>
              </div>
            </div>

            {/* Bento grid */}
            <div className="grid grid-cols-12 gap-8 flex-grow overflow-hidden">
              <CalendarGrid />

              {/* Right panel */}
              <div className="hidden lg:col-span-3 lg:flex flex-col gap-8">
                <MiniCalendar />
                <UpcomingPanel />
              </div>
            </div>
          </section>
        </main>

        {/* Ambient glows */}
        <div className="fixed top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#ffe792]/5 blur-[120px] rounded-full pointer-events-none z-0" />
        <div className="fixed bottom-[-10%] left-[10%] w-[30%] h-[40%] bg-[#a2c2fd]/5 blur-[120px] rounded-full pointer-events-none z-0" />
      </div>
    </>
  );
}