import { useState, useEffect, useRef } from "react";
import {
  startOfWeek,
  addDays,
  format,
  isSameDay,
  getHours,
  getMinutes,
  parseISO,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  startOfMonth,
  getDaysInMonth,
  getDay,
  isToday,
  subDays,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import Sidebar from "@/components/Sidebar";
import { toast } from "sonner";
import { fetchTemplates, fetchAidaBriefing } from "@/api";
import { AvatarInitials } from "@/components/AvatarInitials";
import { MobileHeader } from "@/components/MobileHeader";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalendarEvent {
  _id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  status: "todo" | "in-progress" | "done";
  meetingRef?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function MSIcon({
  icon,
  filled = false,
  className,
  style,
  title,
}: {
  icon: string;
  filled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn("material-symbols-outlined select-none", className)}
      style={
        filled
          ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24", ...style }
          : { fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24", ...style }
      }
    >
      {icon}
    </span>
  );
}

function formatHour(h: number): string {
  return `${h.toString().padStart(2, "0")}:00`;
}

function TopBar({
  searchQuery,
  setSearchQuery,
  onBriefing,
}: {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onBriefing: () => void;
}) {
  const tzAbbrev =
    new Intl.DateTimeFormat("en-US", { timeZoneName: "short" })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value || "Local";

  const user = (() => { try { return JSON.parse(localStorage.getItem('user') || "{}"); } catch { return {}; } })();

  return (
    <header
      className="hidden md:flex fixed top-0 right-0 z-40 h-20 px-10 justify-between items-center bg-[var(--background)]/80 backdrop-blur-xl border-b border-[#0c2037]/20"
      style={{ left: "85px" }}
    >
      <h1
        className="text-xl font-bold tracking-widest text-[var(--primary)] uppercase"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        CALENDAR{" "}
        <span className="ml-2 text-xs text-[var(--muted-foreground)] normal-case font-normal">
          {tzAbbrev}
        </span>
      </h1>

      <div className="flex flex-1 mx-8 justify-end">
        <div
          className="flex items-center px-4 py-2 rounded-xl transition-all border border-transparent focus-within:border-[var(--primary)]"
          style={{ background: "var(--accent)" }}
        >
          <MSIcon icon="search" className="text-sm mr-2" style={{ color: "var(--muted-foreground)" }} />
          <Input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none focus-visible:ring-0 text-sm w-64 h-auto p-0 transition-colors"
            style={{ color: "var(--foreground)" }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="ml-2 text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
            >
              <MSIcon icon="close" style={{ fontSize: 16 }} />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Get Briefing - calls inline handler, no navigation */}
        <button
          onClick={onBriefing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-all group"
        >
          <MSIcon icon="auto_awesome" style={{ color: "var(--primary)", fontSize: 18 }} />
          <span
            className="text-[10px] font-bold uppercase tracking-wider text-primary"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Get Briefing
          </span>
        </button>
        <div className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer border overflow-hidden" style={{ borderColor: "#0c2037/20" }}>
          <AvatarInitials name={user?.full_name || user?.username || "U"} url={user?.avatar} />
        </div>
      </div>
    </header>
  );
}

// ─── Mini Calendar ────────────────────────────────────────────────────────────

function MiniCalendar({
  selectedDate,
  onSelect,
  onClose,
}: {
  selectedDate: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
}) {
  const [viewMonth, setViewMonth] = useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    setTimeout(() => document.addEventListener("mousedown", handleClick), 0);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const daysInMonth = getDaysInMonth(viewMonth);
  const firstDayOfMonth = getDay(startOfMonth(viewMonth));
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const weeks: (Date | null)[][] = [];
  let day = 1;
  for (let w = 0; w < 6; w++) {
    const week: (Date | null)[] = [];
    for (let d = 0; d < 7; d++) {
      const cellIdx = w * 7 + d;
      if (cellIdx < startOffset || day > daysInMonth) {
        week.push(null);
      } else {
        week.push(new Date(year, month, day++));
      }
    }
    weeks.push(week);
    if (day > daysInMonth) break;
  }

  return (
    <div
      ref={popupRef}
      className="absolute z-50 rounded-2xl shadow-2xl border overflow-hidden"
      style={{
        top: "calc(100% + 12px)",
        left: 0,
        width: 280,
        background: "var(--card)",
        borderColor: "#0c2037/20",
        boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: "#0c2037/20" }}
      >
        <button
          onClick={() => setViewMonth(subMonths(viewMonth, 1))}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:scale-105 transition-all"
          style={{ background: "var(--accent)", color: "var(--secondary)" }}
        >
          <MSIcon icon="chevron_left" style={{ fontSize: 18 }} />
        </button>
        <span
          className="font-bold text-sm"
          style={{ color: "var(--foreground)", fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {format(viewMonth, "MMMM yyyy")}
        </span>
        <button
          onClick={() => setViewMonth(addMonths(viewMonth, 1))}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:scale-105 transition-all"
          style={{ background: "var(--accent)", color: "var(--secondary)" }}
        >
          <MSIcon icon="chevron_right" style={{ fontSize: 18 }} />
        </button>
      </div>

      <div className="grid grid-cols-7 px-3 py-2">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-bold uppercase"
            style={{ color: "var(--muted-foreground)" }}
          >
            {d}
          </div>
        ))}
      </div>

      <div className="px-3 pb-3">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-0.5">
            {week.map((date, di) => {
              if (!date) return <div key={di} />;
              const isSelected = isSameDay(date, selectedDate);
              const isTodayDate = isToday(date);
              return (
                <button
                  key={di}
                  onClick={() => {
                    onSelect(date);
                    onClose();
                  }}
                  className="w-8 h-8 mx-auto flex items-center justify-center rounded-xl text-xs font-medium transition-all hover:scale-110"
                  style={{
                    background: isSelected
                      ? "var(--primary)"
                      : isTodayDate
                        ? "color-mix(in srgb, var(--primary) 20%, transparent)"
                        : "transparent",
                    color: isSelected
                      ? "var(--primary-foreground)"
                      : isTodayDate
                        ? "var(--primary)"
                        : "var(--foreground)",
                    fontWeight: isSelected || isTodayDate ? 700 : 400,
                  }}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="border-t px-3 py-2" style={{ borderColor: "#0c2037/20" }}>
        <button
          onClick={() => {
            onSelect(new Date());
            onClose();
          }}
          className="w-full py-1.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all hover:scale-[1.02]"
          style={{
            background: "color-mix(in srgb, var(--primary) 15%, transparent)",
            color: "var(--primary)",
          }}
        >
          Jump to Today
        </button>
      </div>
    </div>
  );
}

function MobileAgenda({ currentDate, events, onSelectDate }: { currentDate: Date, events: CalendarEvent[], onSelectDate: (d: Date) => void }) {
  const [showJumper, setShowJumper] = useState(false);
  const [viewMonth, setViewMonth] = useState(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));

  const years = Array.from({ length: 10 }, (_, i) => 2024 + i);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handleJump = (monthIdx: number, year: number) => {
    const d = new Date(year, monthIdx, 1);
    setViewMonth(d);
    onSelectDate(d);
    setShowJumper(false);
  };

  const weekStart = startOfWeek(viewMonth, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Get events for the selected date
  const dayEvents = events.filter(e => isSameDay(parseISO(e.start_time), currentDate));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Month/Year Jumper Toggle */}
      <div className="px-8 py-4 flex items-center justify-between border-b" style={{ borderColor: "#0c2037/20", background: "color-mix(in srgb, var(--muted) 50%, transparent)" }}>
        <button
          onClick={() => setShowJumper(!showJumper)}
          className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-[var(--card)] border border-[#0c2037/20] shadow-lg shadow-black/20 transition-all"
        >
          <span className="font-bold text-base" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {format(viewMonth, "MMMM yyyy")}
          </span>
          <MSIcon icon={showJumper ? "expand_less" : "expand_more"} style={{ fontSize: 20, color: "var(--primary)" }} />
        </button>
        <button
          onClick={() => onSelectDate(new Date())}
          className="px-5 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-[0.14em] transition-all"
          style={{ background: "color-mix(in srgb, var(--primary) 15%, transparent)", color: "var(--primary)" }}
        >
          Current
        </button>
      </div>

      {showJumper && (
        <div className="bg-[var(--secondary)] border-b p-4 max-h-[300px] overflow-y-auto custom-scrollbar" style={{ borderColor: "#0c2037/20" }}>
          <div className="grid grid-cols-3 gap-2">
            {months.map((m, idx) => (
              <button
                key={m}
                onClick={() => handleJump(idx, viewMonth.getFullYear())}
                className={cn("py-2 rounded-xl text-[10px] font-bold uppercase transition-all border",
                  viewMonth.getMonth() === idx ? "bg-[var(--primary)] text-[var(--primary-foreground)] border-transparent" : "bg-[var(--card)] text-[var(--muted-foreground)] border-[#0c2037/20]"
                )}
              >
                {m.slice(0, 3)}
              </button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto mt-4 pb-2 no-scrollbar">
            {years.map(y => (
              <button
                key={y}
                onClick={() => handleJump(viewMonth.getMonth(), y)}
                className={cn("px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all border shrink-0",
                  viewMonth.getFullYear() === y ? "bg-[var(--secondary)] text-white border-transparent" : "bg-[var(--card)] text-[var(--muted-foreground)] border-[#0c2037/20]"
                )}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Week Strip */}
      <div className="grid grid-cols-7 border-b transition-colors" style={{ borderColor: "#0c2037/20", background: "var(--muted)" }}>
        {weekDays.map(d => {
          const active = isSameDay(d, currentDate);
          const tday = isToday(d);
          return (
            <button
              key={d.toISOString()}
              onClick={() => onSelectDate(d)}
              className="py-3 flex flex-col items-center gap-1 transition-all"
              style={{ background: active ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent" }}
            >
              <span className={cn("text-[9px] font-bold uppercase", active ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]")}>{format(d, "eee")}</span>
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                active ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : tday ? "border border-[var(--primary)] text-[var(--primary)]" : "text-[var(--foreground)]")}>
                {format(d, "d")}
              </div>
            </button>
          );
        })}
      </div>

      {/* Agenda Events */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 custom-scrollbar">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Mission Timeline</h3>
        {dayEvents.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-16 h-16 rounded-3xl bg-[var(--card)] flex items-center justify-center mx-auto mb-4 border border-[#0c2037/20]">
              <MSIcon icon="calendar_today" className="text-2xl text-[var(--muted-foreground)]" />
            </div>
            <p className="text-sm font-medium text-[var(--muted-foreground)]">No active segments defined for this sector.</p>
          </div>
        ) : (
          dayEvents.sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime()).map(e => {
            const start = parseISO(e.start_time);
            const isDone = e.status === "done";
            return (
              <div key={e._id} className="relative group">
                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-full group-hover:w-1.5 transition-all" style={{ background: isDone ? "var(--muted-foreground)" : "var(--primary)" }} />
                <div className="ml-4 p-4 rounded-2xl bg-[var(--card)] border border-[#0c2037/20] hover:border-[var(--primary)]/30 transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold text-[var(--primary)] uppercase tracking-wider">{format(start, "h:mm a")}</p>
                    {e.meetingRef && <MSIcon icon="auto_awesome" className="text-xs text-[var(--primary)]" title="Aida Synced" />}
                  </div>
                  <h4 className={cn("font-bold text-base mb-1", isDone && "line-through opacity-50")}>{e.title}</h4>
                  {e.description && <p className="text-xs text-[var(--muted-foreground)] line-clamp-2">{e.description}</p>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [showMiniCal, setShowMiniCal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [showBriefingModal, setShowBriefingModal] = useState(false);
  const [briefingText, setBriefingText] = useState("");
  const [briefingLoading, setBriefingLoading] = useState(false);

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskHour, setNewTaskHour] = useState("09");

  const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => i); // 00:00 → 23:00
  const PIXELS_PER_HOUR = 80;

  const [templates, setTemplates] = useState<any[]>([]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("access_token");
      const res = await fetch(
        `${(import.meta.env.VITE_API_URL?.replace(/ i$/, '')?.trim()) || "http://localhost:3000/api/v1"}/tasks`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.tasks) setEvents(data.tasks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTemplates = async () => {
    try {
      const data = await fetchTemplates();
      if (data.templates) setTemplates(data.templates);
    } catch { }
  };

  useEffect(() => {
    fetchTasks();
    fetchAllTemplates();
  }, []);

  const handleCreateTask = async () => {
    if (!newTaskTitle) return;
    try {
      const start = new Date(currentDate);
      start.setHours(parseInt(newTaskHour), 0, 0, 0);
      const end = new Date(start);
      end.setHours(end.getHours() + 1);

      const token = localStorage.getItem("access_token");
      const res = await fetch(
        `${(import.meta.env.VITE_API_URL?.replace(/ i$/, '')?.trim()) || "http://localhost:3000/api/v1"}/tasks`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: newTaskTitle,
            description: newTaskDesc,
            start_time: start.toISOString(),
            end_time: end.toISOString(),
          }),
        }
      );

      if (res.ok) {
        setNewTaskTitle("");
        setNewTaskDesc("");
        fetchTasks();
        toast.success("Task scheduled successfully.");
      } else {
        toast.error("Failed to schedule task.");
      }
    } catch {
      toast.error("Connection failed.");
    }
  };

  const handleMarkDone = async (id: string, currentStatus: string) => {
    try {
      const nextStatus = currentStatus === "done" ? "todo" : "done";
      const token = localStorage.getItem("access_token");
      await fetch(
        `${(import.meta.env.VITE_API_URL?.replace(/ i$/, '')?.trim()) || "http://localhost:3000/api/v1"}/tasks/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: nextStatus }),
        }
      );
      fetchTasks();
    } catch { }
  };

  const handleDelete = async (id: string) => {
    try {
      const token = localStorage.getItem("access_token");
      await fetch(
        `${(import.meta.env.VITE_API_URL?.replace(/ i$/, '')?.trim()) || "http://localhost:3000/api/v1"}/tasks/${id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      fetchTasks();
      toast.success("Task deleted.");
    } catch { }
  };

  const handleClearAllTasks = async () => {
    if (!window.confirm("Are you sure you want to clear absolutely ALL your schedules? This action cannot be undone.")) return;
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(
        `${(import.meta.env.VITE_API_URL?.replace(/ i$/, '')?.trim()) || "http://localhost:3000/api/v1"}/tasks/all`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        setEvents([]);
        toast.success("All schedules have been wiped clean.");
      } else {
        toast.error("Failed to execute clearance protocol.");
      }
    } catch {
      toast.error("Network timeout while attempting to clear schedules.");
    }
  };

  /**
   * Get Briefing — opens an inline modal, does NOT navigate away
   */
  const handleGetBriefing = async () => {
    setShowBriefingModal(true);
    setBriefingLoading(true);
    setBriefingText("");
    try {
      const res = await fetchAidaBriefing();
      setBriefingText(res.reply || "No briefing available.");
    } catch {
      setBriefingText("Failed to retrieve briefing from Aida. Please check your connection.");
    } finally {
      setBriefingLoading(false);
    }
  };

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Filter events by search query
  const getFilteredDayEvents = (day: Date) =>
    events.filter((e) => {
      if (!isSameDay(parseISO(e.start_time), day)) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        e.title.toLowerCase().includes(q) ||
        (e.description || "").toLowerCase().includes(q)
      );
    });

  return (
    <div
      className="min-h-screen transition-colors duration-300 relative overflow-hidden"
      style={{ background: "var(--background)", color: "var(--foreground)", fontFamily: "'Manrope', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Manrope:wght@300;400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap');
        .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(158,172,195,0.2); border-radius: 10px; }
      `}</style>

      <Sidebar />
      <MobileHeader title="CALENDAR" />
      <TopBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onBriefing={handleGetBriefing}
      />

      {/* Ambient glows */}
      <div
        className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] blur-[120px] rounded-full pointer-events-none z-0"
        style={{ background: "var(--th-glow)" }}
      />
      <div
        className="absolute bottom-[-10%] left-[10%] w-[30%] h-[40%] blur-[120px] rounded-full pointer-events-none z-0"
        style={{ background: "color-mix(in srgb, var(--secondary) 15%, transparent)" }}
      />

      <main
        className="pt-24 md:pt-28 px-3 md:px-10 pb-10 flex gap-8 h-screen relative z-10 box-border"
        style={{ marginLeft: "var(--main-margin)" }}
      >
        {/* ── Main Calendar Grid ── */}
        <div
          className="flex-1 flex flex-col backdrop-blur-xl rounded-3xl border overflow-hidden transition-colors"
          style={{
            background: "color-mix(in srgb, var(--accent) 40%, transparent)",
            borderColor: "#0c2037/20",
          }}
        >
          {/* ── Mobile Agenda View (Visible only on mobile) ── */}
          <div className="md:hidden flex-1 overflow-hidden">
            <MobileAgenda
              currentDate={currentDate}
              events={events}
              onSelectDate={(d) => setCurrentDate(d)}
            />
          </div>

          {/* ── Desktop Desktop View (Hidden on mobile) ── */}
          <div className="hidden md:flex flex-1 flex-col overflow-hidden">
            <div
              className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 md:p-6 border-b transition-colors gap-3 md:gap-0"
              style={{ borderColor: "#0c2037/20" }}
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <button
                    onClick={() => setShowMiniCal((v) => !v)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:scale-105 transition-all group"
                    style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }}
                  >
                    <h2
                      className="text-lg md:text-2xl font-bold transition-colors"
                      style={{ fontFamily: "'Space Grotesk', sans-serif", color: "var(--primary)" }}
                    >
                      {format(currentDate, "MMMM yyyy")}
                    </h2>
                    <MSIcon
                      icon={showMiniCal ? "expand_less" : "expand_more"}
                      style={{ color: "var(--primary)", fontSize: 20 }}
                    />
                  </button>
                  {showMiniCal && (
                    <MiniCalendar
                      selectedDate={currentDate}
                      onSelect={(date) => {
                        setCurrentDate(date);
                        setShowMiniCal(false);
                      }}
                      onClose={() => setShowMiniCal(false)}
                    />
                  )}
                </div>
                {loading && (
                  <div
                    className="w-4 h-4 border-2 rounded-full animate-spin"
                    style={{ borderColor: "var(--primary)", borderTopColor: "transparent" }}
                  />
                )}
              </div>

              <div className="flex gap-1.5 items-center overflow-x-auto no-scrollbar w-full md:w-auto pb-1 md:pb-0">
                <button
                  className="px-2 py-1 rounded-lg font-bold text-[10px] uppercase transition-colors border flex items-center gap-1 shrink-0"
                  onClick={handleClearAllTasks}
                  style={{ background: "color-mix(in srgb, red 10%, transparent)", borderColor: "red", color: "#ff6b6b" }}
                  title="Wipe all schedules"
                >
                  <MSIcon icon="delete_sweep" style={{ fontSize: 13 }} />
                  <span className="hidden md:inline">Clear All</span>
                </button>
                <button
                  className="px-2 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl font-bold text-[10px] uppercase transition-colors border flex items-center gap-1 shrink-0"
                  onClick={() => setCurrentDate(subDays(currentDate, 1))}
                  style={{ background: "var(--card)", borderColor: "#0c2037/20", color: "var(--secondary)" }}
                >
                  <MSIcon icon="chevron_left" style={{ fontSize: 14 }} />
                  <span className="hidden md:inline">Prev</span>
                </button>
                <button
                  className="px-2 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl font-bold text-[10px] uppercase transition-colors border flex items-center gap-1 shrink-0"
                  onClick={() => setCurrentDate(new Date())}
                  style={{ background: "var(--card)", borderColor: "#0c2037/20", color: "var(--primary)" }}
                >
                  Today
                </button>
                <button
                  className="px-2 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl font-bold text-[10px] uppercase transition-colors border flex items-center gap-1 shrink-0"
                  onClick={() => setCurrentDate(addDays(currentDate, 1))}
                  style={{ background: "var(--card)", borderColor: "#0c2037/20", color: "var(--secondary)" }}
                >
                  <span className="hidden md:inline">Next</span>
                  <MSIcon icon="chevron_right" style={{ fontSize: 14 }} />
                </button>
                <button
                  className="px-2 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl font-bold text-[10px] uppercase transition-colors border flex items-center gap-1 shrink-0"
                  onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
                  style={{ background: "var(--card)", borderColor: "#0c2037/20", color: "var(--secondary)" }}
                >
                  <span className="md:inline">+Week</span>
                  <MSIcon icon="keyboard_double_arrow_right" style={{ fontSize: 14 }} />
                </button>
              </div>
            </div>

            {/* Scrollable calendar grid */}
            <div className="overflow-x-auto custom-scrollbar flex-1 flex flex-col">
              <div
                className="grid border-b flex-shrink-0 transition-colors"
                style={{ borderColor: "#0c2037/20", gridTemplateColumns: "60px repeat(7, minmax(100px, 1fr))" }}
              >
                <div
                  className="p-4 flex flex-col items-center justify-center border-r transition-colors"
                  style={{
                    borderColor: "#0c2037/20",
                    background: "color-mix(in srgb, var(--muted) 50%, transparent)",
                  }}
                >
                  <span
                    className="font-mono text-[10px] uppercase transition-colors"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    TIME
                  </span>
                </div>
                {weekDays.map((day) => {
                  const isSelected = isSameDay(day, currentDate);
                  const isTodayDate = isSameDay(day, new Date());
                  return (
                    <div
                      key={day.toISOString()}
                      className="p-4 flex flex-col items-center transition-colors cursor-pointer hover:bg-white/5"
                      onClick={() => setCurrentDate(day)}
                      style={{
                        background: isSelected
                          ? "color-mix(in srgb, var(--primary) 15%, transparent)"
                          : isTodayDate
                            ? "color-mix(in srgb, var(--primary) 5%, transparent)"
                            : "transparent",
                      }}
                    >
                      <span
                        className="text-[10px] uppercase font-semibold font-mono transition-colors"
                        style={{ color: isSelected || isTodayDate ? "var(--primary)" : "var(--secondary)" }}
                      >
                        {format(day, "eee")}
                      </span>
                      <button
                        className="text-xl font-bold mt-0.5 transition-all hover:scale-110 w-9 h-9 rounded-full flex items-center justify-center"
                        style={{
                          color: isSelected ? "var(--primary-foreground)" : "var(--foreground)",
                          background: isSelected ? "var(--primary)" : "transparent",
                          border: isTodayDate && !isSelected ? "1px solid var(--primary)" : "none",
                        }}
                      >
                        {format(day, "d")}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Time body */}
              <div className="flex-grow overflow-y-auto relative custom-scrollbar">
                <div
                  className="grid"
                  style={{ minHeight: `${TIME_SLOTS.length * PIXELS_PER_HOUR}px`, gridTemplateColumns: "60px repeat(7, minmax(100px, 1fr))" }}
                >
                  {/* Time column */}
                  <div
                    className="col-span-1 border-r transition-colors"
                    style={{ borderColor: "#0c2037/20" }}
                  >
                    {TIME_SLOTS.map((h) => (
                      <div
                        key={h}
                        className="border-b flex items-start justify-center pt-2 transition-colors"
                        style={{
                          height: PIXELS_PER_HOUR,
                          borderColor: "color-mix(in srgb, #0c2037/20 20%, transparent)",
                        }}
                      >
                        <span
                          className="font-mono text-[10px] transition-colors select-none"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          {/* Fixed AM/PM formatting */}
                          {formatHour(h)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Day columns */}
                  {weekDays.map((day) => {
                    const dayEvents = getFilteredDayEvents(day);
                    return (
                      <div
                        key={day.toISOString()}
                        className="col-span-1 border-r relative transition-colors"
                        style={{
                          borderColor: "color-mix(in srgb, #0c2037/20 20%, transparent)",
                        }}
                      >
                        {TIME_SLOTS.map((h) => (
                          <div
                            key={`tick-${h}`}
                            className="border-b pointer-events-none transition-colors"
                            style={{
                              height: PIXELS_PER_HOUR,
                              borderColor: "color-mix(in srgb, #0c2037/20 10%, transparent)",
                            }}
                          />
                        ))}

                        {/* Events for this day */}
                        {dayEvents.map((e) => {
                          const startDate = parseISO(e.start_time);
                          const endDate = parseISO(e.end_time);
                          const s_hr = getHours(startDate) + getMinutes(startDate) / 60;
                          const e_hr = getHours(endDate) + getMinutes(endDate) / 60;

                          const offsetStart = s_hr - TIME_SLOTS[0];
                          if (offsetStart < 0) return null;

                          const dur = Math.max(0.5, e_hr - s_hr);
                          const topPx = offsetStart * PIXELS_PER_HOUR;
                          const heightPx = dur * PIXELS_PER_HOUR;
                          const isDone = e.status === "done";

                          return (
                            <div
                              key={e._id}
                              className="absolute left-1 right-1 rounded-xl p-3 overflow-hidden shadow-lg border-l-4 transition-all group select-none"
                              style={{
                                top: topPx,
                                height: heightPx,
                                background: isDone
                                  ? "color-mix(in srgb, var(--card) 60%, transparent)"
                                  : "color-mix(in srgb, var(--primary) 20%, transparent)",
                                borderColor: isDone ? "#0c2037/20" : "var(--primary)",
                                opacity: isDone ? 0.6 : 1,
                                zIndex: 10,
                              }}
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex items-center gap-1 overflow-hidden">
                                  {e.meetingRef && (
                                    <MSIcon
                                      icon="auto_awesome"
                                      className="text-[10px] shrink-0"
                                      style={{ color: "var(--primary)" }}
                                      title="Synced by Aida"
                                    />
                                  )}
                                  <p
                                    className="font-bold text-[11px] leading-tight truncate transition-colors"
                                    style={{ color: isDone ? "var(--foreground)" : "var(--primary)" }}
                                  >
                                    {e.title}
                                  </p>
                                </div>
                                <div
                                  className="hidden group-hover:flex gap-1 p-1 rounded-lg shrink-0"
                                  style={{ background: "var(--card)" }}
                                >
                                  <button
                                    onClick={() => handleMarkDone(e._id, e.status)}
                                    style={{ color: "var(--primary)" }}
                                    title={isDone ? "Mark as todo" : "Mark as done"}
                                  >
                                    <MSIcon
                                      icon="check_circle"
                                      filled={isDone}
                                      style={{ fontSize: 14 }}
                                    />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(e._id)}
                                    style={{ color: "var(--muted-foreground)" }}
                                    title="Delete"
                                  >
                                    <MSIcon icon="delete" style={{ fontSize: 14 }} />
                                  </button>
                                </div>
                              </div>
                              {heightPx > 40 && e.description && (
                                <p
                                  className="text-[10px] mt-1 truncate transition-colors"
                                  style={{ color: "var(--foreground)" }}
                                >
                                  {e.description}
                                </p>
                              )}
                              {heightPx > 30 && (
                                <p
                                  className="text-[9px] mt-0.5 transition-colors"
                                  style={{ color: "var(--muted-foreground)" }}
                                >
                                  {format(startDate, "h:mm a")} – {format(endDate, "h:mm a")}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>{/* end desktop wrapper */}
        </div>

        {/* ── Right Panel (hidden on mobile) ── */}
        <div className="hidden md:flex w-80 flex-col gap-6">
          {/* Create Task */}
          <div
            className="backdrop-blur-xl rounded-3xl p-6 border transition-colors relative overflow-hidden"
            style={{
              background: "color-mix(in srgb, var(--muted) 40%, transparent)",
              borderColor: "#0c2037/20",
            }}
          >
            <h3
              className="font-bold text-lg mb-1 transition-colors"
              style={{ fontFamily: "'Space Grotesk', sans-serif", color: "var(--primary)" }}
            >
              Schedule Task
            </h3>
            <p
              className="text-[10px] uppercase tracking-widest mb-5 transition-colors"
              style={{ color: "var(--muted-foreground)" }}
            >
              {format(currentDate, "EEEE, MMMM d")}
            </p>

            <div className="space-y-4 relative z-10">
              {/* Templates */}
              {templates.length > 0 && (
                <div className="mb-2">
                  <label
                    className="text-[10px] uppercase font-bold tracking-widest mb-2 block transition-colors"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Templates
                  </label>
                  <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                    {templates.map((t: any) => (
                      <div
                        key={t._id}
                        onClick={() => {
                          setNewTaskTitle(t.title || t.name || "");
                          setNewTaskDesc(t.description || t.content || "");
                        }}
                        className="shrink-0 w-32 p-3 rounded-xl border cursor-pointer hover:scale-105 transition-all flex flex-col justify-between h-20"
                        style={{
                          borderColor: "#0c2037/20",
                          background: "var(--card)",
                          color: "var(--foreground)",
                        }}
                      >
                        <span className="font-bold text-[11px] truncate">{t.title || t.name}</span>
                        <span
                          className="text-[9px] uppercase tracking-wider"
                          style={{ color: "var(--primary)" }}
                        >
                          USE →
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label
                  className="text-[10px] uppercase font-bold tracking-widest mb-1 block transition-colors"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Title
                </label>
                <Input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Team sync"
                  className="bg-transparent border transition-colors text-sm"
                  style={{ borderColor: "#0c2037/20", color: "var(--foreground)" }}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateTask()}
                />
              </div>

              <div>
                <label
                  className="text-[10px] uppercase font-bold tracking-widest mb-1 block transition-colors"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Notes
                </label>
                <Input
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  placeholder="Optional description"
                  className="bg-transparent border transition-colors text-sm"
                  style={{ borderColor: "#0c2037/20", color: "var(--foreground)" }}
                />
              </div>

              <div>
                <label
                  className="text-[10px] uppercase font-bold tracking-widest mb-1 block transition-colors"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Start Hour (24h)
                </label>
                <Input
                  value={newTaskHour}
                  onChange={(e) => setNewTaskHour(e.target.value)}
                  type="number"
                  min={7}
                  max={20}
                  className="bg-transparent border transition-colors text-sm"
                  style={{ borderColor: "#0c2037/20", color: "var(--foreground)" }}
                />
                {newTaskHour && (
                  <p className="text-[10px] mt-1" style={{ color: "var(--muted-foreground)" }}>
                    = {formatHour(parseInt(newTaskHour) || 9)}
                  </p>
                )}
              </div>

              <Button
                onClick={handleCreateTask}
                disabled={!newTaskTitle}
                className="w-full h-12 uppercase font-bold tracking-widest text-[10px] rounded-xl hover:scale-105 transition-transform"
                style={{
                  background: "var(--primary)",
                  color: "var(--primary-foreground)",
                  boxShadow: "0 0 15px color-mix(in srgb, var(--primary) 20%, transparent)",
                }}
              >
                Schedule Task
              </Button>
            </div>
          </div>

          {/* Upcoming events list */}
          <div
            className="backdrop-blur-xl rounded-3xl p-6 border flex-1 transition-colors relative overflow-hidden overflow-y-auto custom-scrollbar"
            style={{
              background: "color-mix(in srgb, var(--muted) 40%, transparent)",
              borderColor: "#0c2037/20",
            }}
          >
            <h3
              className="font-bold text-lg mb-6 transition-colors"
              style={{ fontFamily: "'Space Grotesk', sans-serif", color: "var(--foreground)" }}
            >
              Upcoming
            </h3>

            <div className="space-y-4 relative z-10">
              {events.length === 0 && (
                <p className="text-xs transition-colors" style={{ color: "var(--muted-foreground)" }}>
                  No events scheduled.
                </p>
              )}
              {events
                .filter((e) => new Date(e.start_time) >= new Date())
                .sort(
                  (a, b) =>
                    new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
                )
                .slice(0, 10)
                .map((e) => {
                  const d = parseISO(e.start_time);
                  return (
                    <div
                      key={e._id}
                      className="p-3 rounded-xl border transition-colors flex items-start gap-3"
                      style={{ background: "var(--card)", borderColor: "transparent" }}
                    >
                      <div
                        className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                        style={{
                          background:
                            e.status === "done" ? "var(--muted-foreground)" : "var(--primary)",
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className="font-bold text-xs leading-tight mb-1 transition-colors truncate"
                          style={{ color: "var(--foreground)" }}
                        >
                          {e.title}
                        </p>
                        <p
                          className="text-[10px] uppercase font-bold tracking-widest transition-colors"
                          style={{ color: "var(--secondary)" }}
                        >
                          {format(d, "MMM d")} · {format(d, "h:mm a")}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </main>

      {/* ── Briefing Modal ── */}
      {showBriefingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="relative w-full max-w-lg rounded-3xl border border-border p-8 shadow-2xl overflow-hidden z-10"
            style={{
              background: "var(--card)",
              borderColor: "var(--primary)/30",
            }}
          >
            <button
              onClick={() => setShowBriefingModal(false)}
              className="absolute top-6 right-6 hover:scale-110 transition-transform"
            >
              <MSIcon icon="close" style={{ color: "var(--muted-foreground)" }} />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary/10 border border-primary/30">
                <MSIcon icon="auto_awesome" style={{ color: "var(--primary)", fontSize: 20 }} />
              </div>
              <h3
                className="text-xl font-bold tracking-tight text-primary"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Aida Daily Briefing
              </h3>
            </div>
            <div className="min-h-[120px] max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {briefingLoading ? (
                <div className="flex flex-col gap-3 py-4">
                  <div className="h-4 bg-white/5 rounded-full w-full animate-pulse" />
                  <div className="h-4 bg-white/5 rounded-full w-5/6 animate-pulse" />
                  <div className="h-4 bg-white/5 rounded-full w-4/6 animate-pulse" />
                </div>
              ) : (
                <div
                  className="text-[13px] leading-relaxed whitespace-pre-wrap"
                  style={{ color: "var(--foreground)" }}
                >
                  {briefingText}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}