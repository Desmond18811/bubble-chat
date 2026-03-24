import BubbleLayout from "@/components/BubbleLayout";
import { Plus } from "lucide-react";

const days = [
  { day: "MON", date: 12, isToday: false },
  { day: "TUE", date: 13, isToday: false },
  { day: "WED", date: 14, isToday: true },
  { day: "THU", date: 15, isToday: false },
  { day: "FRI", date: 16, isToday: false },
  { day: "SAT", date: 17, isToday: false },
  { day: "SUN", date: 18, isToday: false },
];

const hours = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00"];

interface CalendarEvent {
  title: string;
  subtitle?: string;
  day: number;
  startHour: number;
  duration: number;
  variant: "gold" | "navy" | "accent";
  avatars?: number;
}

const events: CalendarEvent[] = [
  { title: "Weekly Sync", subtitle: "Room A", day: 12, startHour: 9, duration: 1.5, variant: "navy" },
  { title: "Design Sync", day: 13, startHour: 10, duration: 1, variant: "gold", avatars: 2 },
  { title: "Client Brief", day: 15, startHour: 9.5, duration: 0.75, variant: "navy" },
  { title: "Bubble Audit", day: 15, startHour: 10.5, duration: 1.5, variant: "navy" },
];

const CalendarPage = () => {
  return (
    <BubbleLayout>
      <div className="flex flex-col h-[calc(100vh-3.5rem)] p-6 overflow-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-muted-foreground text-[10px] tracking-widest mb-1">TIMELINE OBSERVATORY</p>
            <h1 className="font-display font-bold text-foreground text-4xl">OCTOBER 2026</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-secondary rounded-lg overflow-hidden">
              {["DAY", "WEEK", "MONTH"].map((view, i) => (
                <button
                  key={view}
                  className={`px-4 py-2 text-xs font-display font-semibold tracking-wider transition-colors ${
                    i === 0 ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {view}
                </button>
              ))}
            </div>
            <button className="w-10 h-10 bg-primary text-primary-foreground rounded-lg flex items-center justify-center hover:opacity-90 transition-opacity">
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 bg-card/50 rounded-2xl border border-border overflow-hidden">
          {/* Day Headers */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border">
            <div className="p-3 text-muted-foreground text-xs text-center">GMT+2</div>
            {days.map((d) => (
              <div key={d.day} className={`p-3 text-center border-l border-border ${d.isToday ? "" : ""}`}>
                <p className={`text-[10px] tracking-wider ${d.isToday ? "text-primary" : "text-muted-foreground"}`}>{d.day}</p>
                <p className={`font-display font-bold text-xl ${d.isToday ? "text-primary" : "text-foreground"}`}>{d.date}</p>
              </div>
            ))}
          </div>

          {/* Time Grid */}
          <div className="relative">
            {hours.map((hour, i) => (
              <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] h-20 border-b border-border/50">
                <div className="p-2 text-muted-foreground text-[10px] text-right pr-3">{hour}</div>
                {days.map((d) => (
                  <div key={d.date} className={`border-l border-border/50 ${d.isToday ? "bg-primary/5" : ""}`} />
                ))}
              </div>
            ))}

            {/* Events */}
            {events.map((event, i) => {
              const dayIndex = days.findIndex((d) => d.date === event.day);
              if (dayIndex === -1) return null;
              const top = (event.startHour - 9) * 80;
              const height = event.duration * 80;
              const left = `calc(60px + ${dayIndex} * ((100% - 60px) / 7) + 4px)`;
              const width = `calc((100% - 60px) / 7 - 8px)`;

              return (
                <div
                  key={i}
                  className={`absolute rounded-lg p-2 text-xs font-display font-semibold overflow-hidden ${
                    event.variant === "gold"
                      ? "bg-primary/20 border border-primary/40 text-primary"
                      : "bg-secondary border border-border text-foreground"
                  }`}
                  style={{ top, height, left, width }}
                >
                  <p className="truncate">{event.title}</p>
                  {event.subtitle && <p className="text-muted-foreground text-[10px] font-normal">{event.subtitle}</p>}
                  {event.avatars && (
                    <div className="flex -space-x-1 mt-1">
                      {Array.from({ length: event.avatars }).map((_, j) => (
                        <div key={j} className="w-5 h-5 rounded-full bg-primary/40 border border-card" />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Current Time Line */}
            <div className="absolute w-full flex items-center" style={{ top: "240px" }}>
              <div className="w-[60px]" />
              <div className="flex-1 h-0.5 bg-primary relative">
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-primary" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </BubbleLayout>
  );
};

export default CalendarPage;
