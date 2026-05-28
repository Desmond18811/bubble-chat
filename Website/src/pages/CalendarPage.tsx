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
      className="hidden md:flex fixed top-0 right-0 z-40 h-20 px-10 justify-between items-center bg-[var(--th-bg)]/80 backdrop-blur-xl border-b border-[var(--th-border)]"
      style={{ left: "85px" }}
    >
      <h1
        className="text-xl font-bold tracking-widest text-[var(--th-accent)] uppercase"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        CALENDAR{" "}
        <span className="ml-2 text-xs text-[var(--th-muted)] normal-case font-normal">
          {tzAbbrev}
        </span>
      </h1>

      <div className="flex flex-1 mx-8 justify-end">
        <div
          className="flex items-center px-4 py-2 rounded-xl transition-all border border-transparent focus-within:border-[var(--th-accent)]"
          style={{ background: "var(--th-surface-top)" }}
        >
          <MSIcon icon="search" className="text-sm mr-2" style={{ color: "var(--th-muted)" }} />
          <Input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none focus-visible:ring-0 text-sm w-64 h-auto p-0 transition-colors"
            style={{ color: "var(--th-text)" }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="ml-2 text-[var(--th-muted)] hover:text-[var(--th-accent)] transition-colors"
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
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#ffe792]/5 border border-[#ffe792]/20 hover:bg-[#ffe792]/10 transition-all group"
        >
          <MSIcon icon="auto_awesome" style={{ color: "#ffe792", fontSize: 18 }} />
          <span
            className="text-[10px] font-bold uppercase tracking-wider text-[#ffe792]"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Get Briefing
          </span>
        </button>
        <div className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer border overflow-hidden" style={{ borderColor: "var(--th-border)" }}>
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
        background: "var(--th-surface)",
        borderColor: "var(--th-border)",
        boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: "var(--th-border)" }}
      >
        <button
          onClick={() => setViewMonth(subMonths(viewMonth, 1))}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:scale-105 transition-all"
          style={{ background: "var(--th-surface-top)", color: "var(--th-secondary)" }}
        >
          <MSIcon icon="chevron_left" style={{ fontSize: 18 }} />
        </button>
        <span
          className="font-bold text-sm"
          style={{ color: "var(--th-text)", fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {format(viewMonth, "MMMM yyyy")}
        </span>
        <button
          onClick={() => setViewMonth(addMonths(viewMonth, 1))}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:scale-105 transition-all"
          style={{ background: "var(--th-surface-top)", color: "var(--th-secondary)" }}
        >
          <MSIcon icon="chevron_right" style={{ fontSize: 18 }} />
        </button>
      </div>

      <div className="grid grid-cols-7 px-3 py-2">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-bold uppercase"
            style={{ color: "var(--th-muted)" }}
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
                      ? "var(--th-accent)"
                      : isTodayDate
                        ? "color-mix(in srgb, var(--th-accent) 20%, transparent)"
                        : "transparent",
                    color: isSelected
                      ? "var(--th-accent-text)"
                      : isTodayDate
                        ? "var(--th-accent)"
                        : "var(--th-text)",
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

      <div className="border-t px-3 py-2" style={{ borderColor: "var(--th-border)" }}>
        <button
          onClick={() => {
            onSelect(new Date());
            onClose();
          }}
          className="w-full py-1.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all hover:scale-[1.02]"
          style={{
            background: "color-mix(in srgb, var(--th-accent) 15%, transparent)",
            color: "var(--th-accent)",
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
      <div className="px-8 py-4 flex items-center justify-between border-b" style={{ borderColor: "var(--th-border)", background: "color-mix(in srgb, var(--th-surface-low) 50%, transparent)" }}>
        <button
          onClick={() => setShowJumper(!showJumper)}
          className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-[var(--th-surface)] border border-[var(--th-border)] shadow-lg shadow-black/20 transition-all"
        >
          <span className="font-bold text-base" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {format(viewMonth, "MMMM yyyy")}
          </span>
          <MSIcon icon={showJumper ? "expand_less" : "expand_more"} style={{ fontSize: 20, color: "var(--th-accent)" }} />
        </button>
        <button
          onClick={() => onSelectDate(new Date())}
          className="px-5 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-[0.14em] transition-all"
          style={{ background: "color-mix(in srgb, var(--th-accent) 15%, transparent)", color: "var(--th-accent)" }}
        >
          Current
        </button>
      </div>

      {showJumper && (
        <div className="bg-[var(--th-surface-high)] border-b p-4 max-h-[300px] overflow-y-auto custom-scrollbar" style={{ borderColor: "var(--th-border)" }}>
          <div className="grid grid-cols-3 gap-2">
            {months.map((m, idx) => (
              <button
                key={m}
                onClick={() => handleJump(idx, viewMonth.getFullYear())}
                className={cn("py-2 rounded-xl text-[10px] font-bold uppercase transition-all border",
                  viewMonth.getMonth() === idx ? "bg-[var(--th-accent)] text-[var(--th-accent-text)] border-transparent" : "bg-[var(--th-surface)] text-[var(--th-muted)] border-[var(--th-border)]"
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
                  viewMonth.getFullYear() === y ? "bg-[var(--th-secondary)] text-white border-transparent" : "bg-[var(--th-surface)] text-[var(--th-muted)] border-[var(--th-border)]"
                )}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Week Strip */}
      <div className="grid grid-cols-7 border-b transition-colors" style={{ borderColor: "var(--th-border)", background: "var(--th-surface-low)" }}>
        {weekDays.map(d => {
          const active = isSameDay(d, currentDate);
          const tday = isToday(d);
          return (
            <button
              key={d.toISOString()}
              onClick={() => onSelectDate(d)}
              className="py-3 flex flex-col items-center gap-1 transition-all"
              style={{ background: active ? "color-mix(in srgb, var(--th-accent) 10%, transparent)" : "transparent" }}
            >
              <span className={cn("text-[9px] font-bold uppercase", active ? "text-[var(--th-accent)]" : "text-[var(--th-muted)]")}>{format(d, "eee")}</span>
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                active ? "bg-[var(--th-accent)] text-[var(--th-accent-text)]" : tday ? "border border-[var(--th-accent)] text-[var(--th-accent)]" : "text-[var(--th-text)]")}>
                {format(d, "d")}
              </div>
            </button>
          );
        })}
      </div>

      {/* Agenda Events */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 custom-scrollbar">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--th-muted)]">Mission Timeline</h3>
        {dayEvents.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-16 h-16 rounded-3xl bg-[var(--th-surface)] flex items-center justify-center mx-auto mb-4 border border-[var(--th-border)]">
              <MSIcon icon="calendar_today" className="text-2xl text-[var(--th-muted)]" />
            </div>
            <p className="text-sm font-medium text-[var(--th-muted)]">No active segments defined for this sector.</p>
          </div>
        ) : (
          dayEvents.sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime()).map(e => {
            const start = parseISO(e.start_time);
            const isDone = e.status === "done";
            return (
              <div key={e._id} className="relative group">
                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-full group-hover:w-1.5 transition-all" style={{ background: isDone ? "var(--th-muted)" : "var(--th-accent)" }} />
                <div className="ml-4 p-4 rounded-2xl bg-[var(--th-surface)] border border-[var(--th-border)] hover:border-[var(--th-accent)]/30 transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold text-[var(--th-accent)] uppercase tracking-wider">{format(start, "h:mm a")}</p>
                    {e.meetingRef && <MSIcon icon="auto_awesome" className="text-xs text-[var(--th-accent)]" title="Aida Synced" />}
                  </div>
                  <h4 className={cn("font-bold text-base mb-1", isDone && "line-through opacity-50")}>{e.title}</h4>
                  {e.description && <p className="text-xs text-[var(--th-muted)] line-clamp-2">{e.description}</p>}
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
      style={{ background: "var(--th-bg)", color: "var(--th-text)", fontFamily: "'Manrope', sans-serif" }}
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
        style={{ background: "color-mix(in srgb, var(--th-secondary) 15%, transparent)" }}
      />

      <main
        className="pt-24 md:pt-28 px-3 md:px-10 pb-10 flex gap-8 h-screen relative z-10 box-border"
        style={{ marginLeft: "var(--main-margin)" }}
      >
        {/* ── Main Calendar Grid ── */}
        <div
          className="flex-1 flex flex-col backdrop-blur-xl rounded-3xl border overflow-hidden transition-colors"
          style={{
            background: "color-mix(in srgb, var(--th-surface-top) 40%, transparent)",
            borderColor: "var(--th-border)",
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
              style={{ borderColor: "var(--th-border)" }}
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <button
                    onClick={() => setShowMiniCal((v) => !v)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:scale-105 transition-all group"
                    style={{ background: "color-mix(in srgb, var(--th-accent) 10%, transparent)" }}
                  >
                    <h2
                      className="text-lg md:text-2xl font-bold transition-colors"
                      style={{ fontFamily: "'Space Grotesk', sans-serif", color: "var(--th-text)" }}
                    >
                      {format(currentDate, "MMMM yyyy")}
                    </h2>
                    <MSIcon
                      icon={showMiniCal ? "expand_less" : "expand_more"}
                      style={{ color: "var(--th-accent)", fontSize: 20 }}
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
                    style={{ borderColor: "var(--th-accent)", borderTopColor: "transparent" }}
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
                  style={{ background: "var(--th-surface)", borderColor: "var(--th-border)", color: "var(--th-secondary)" }}
                >
                  <MSIcon icon="chevron_left" style={{ fontSize: 14 }} />
                  <span className="hidden md:inline">Prev</span>
                </button>
                <button
                  className="px-2 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl font-bold text-[10px] uppercase transition-colors border flex items-center gap-1 shrink-0"
                  onClick={() => setCurrentDate(new Date())}
                  style={{ background: "var(--th-surface)", borderColor: "var(--th-border)", color: "var(--th-accent)" }}
                >
                  Today
                </button>
                <button
                  className="px-2 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl font-bold text-[10px] uppercase transition-colors border flex items-center gap-1 shrink-0"
                  onClick={() => setCurrentDate(addDays(currentDate, 1))}
                  style={{ background: "var(--th-surface)", borderColor: "var(--th-border)", color: "var(--th-secondary)" }}
                >
                  <span className="hidden md:inline">Next</span>
                  <MSIcon icon="chevron_right" style={{ fontSize: 14 }} />
                </button>
                <button
                  className="px-2 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl font-bold text-[10px] uppercase transition-colors border flex items-center gap-1 shrink-0"
                  onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
                  style={{ background: "var(--th-surface)", borderColor: "var(--th-border)", color: "var(--th-secondary)" }}
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
                style={{ borderColor: "var(--th-border)", gridTemplateColumns: "60px repeat(7, minmax(100px, 1fr))" }}
              >
                <div
                  className="p-4 flex flex-col items-center justify-center border-r transition-colors"
                  style={{
                    borderColor: "var(--th-border)",
                    background: "color-mix(in srgb, var(--th-surface-low) 50%, transparent)",
                  }}
                >
                  <span
                    className="font-mono text-[10px] uppercase transition-colors"
                    style={{ color: "var(--th-muted)" }}
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
                          ? "color-mix(in srgb, var(--th-accent) 15%, transparent)"
                          : isTodayDate
                            ? "color-mix(in srgb, var(--th-accent) 5%, transparent)"
                            : "transparent",
                      }}
                    >
                      <span
                        className="text-[10px] uppercase font-semibold font-mono transition-colors"
                        style={{ color: isSelected || isTodayDate ? "var(--th-accent)" : "var(--th-secondary)" }}
                      >
                        {format(day, "eee")}
                      </span>
                      <button
                        className="text-xl font-bold mt-0.5 transition-all hover:scale-110 w-9 h-9 rounded-full flex items-center justify-center"
                        style={{
                          color: isSelected ? "var(--th-accent-text)" : "var(--th-text)",
                          background: isSelected ? "var(--th-accent)" : "transparent",
                          border: isTodayDate && !isSelected ? "1px solid var(--th-accent)" : "none",
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
                    style={{ borderColor: "var(--th-border)" }}
                  >
                    {TIME_SLOTS.map((h) => (
                      <div
                        key={h}
                        className="border-b flex items-start justify-center pt-2 transition-colors"
                        style={{
                          height: PIXELS_PER_HOUR,
                          borderColor: "color-mix(in srgb, var(--th-border) 20%, transparent)",
                        }}
                      >
                        <span
                          className="font-mono text-[10px] transition-colors select-none"
                          style={{ color: "var(--th-muted)" }}
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
                          borderColor: "color-mix(in srgb, var(--th-border) 20%, transparent)",
                        }}
                      >
                        {TIME_SLOTS.map((h) => (
                          <div
                            key={`tick-${h}`}
                            className="border-b pointer-events-none transition-colors"
                            style={{
                              height: PIXELS_PER_HOUR,
                              borderColor: "color-mix(in srgb, var(--th-border) 10%, transparent)",
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
                                  ? "color-mix(in srgb, var(--th-surface) 60%, transparent)"
                                  : "color-mix(in srgb, var(--th-accent) 20%, transparent)",
                                borderColor: isDone ? "var(--th-border)" : "var(--th-accent)",
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
                                      style={{ color: "var(--th-accent)" }}
                                      title="Synced by Aida"
                                    />
                                  )}
                                  <p
                                    className="font-bold text-[11px] leading-tight truncate transition-colors"
                                    style={{ color: isDone ? "var(--th-text)" : "var(--th-accent)" }}
                                  >
                                    {e.title}
                                  </p>
                                </div>
                                <div
                                  className="hidden group-hover:flex gap-1 p-1 rounded-lg shrink-0"
                                  style={{ background: "var(--th-surface)" }}
                                >
                                  <button
                                    onClick={() => handleMarkDone(e._id, e.status)}
                                    style={{ color: "var(--th-accent)" }}
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
                                    style={{ color: "var(--th-muted)" }}
                                    title="Delete"
                                  >
                                    <MSIcon icon="delete" style={{ fontSize: 14 }} />
                                  </button>
                                </div>
                              </div>
                              {heightPx > 40 && e.description && (
                                <p
                                  className="text-[10px] mt-1 truncate transition-colors"
                                  style={{ color: "var(--th-text)" }}
                                >
                                  {e.description}
                                </p>
                              )}
                              {heightPx > 30 && (
                                <p
                                  className="text-[9px] mt-0.5 transition-colors"
                                  style={{ color: "var(--th-muted)" }}
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
              background: "color-mix(in srgb, var(--th-surface-low) 40%, transparent)",
              borderColor: "var(--th-border)",
            }}
          >
            <h3
              className="font-bold text-lg mb-1 transition-colors"
              style={{ fontFamily: "'Space Grotesk', sans-serif", color: "var(--th-accent)" }}
            >
              Schedule Task
            </h3>
            <p
              className="text-[10px] uppercase tracking-widest mb-5 transition-colors"
              style={{ color: "var(--th-muted)" }}
            >
              {format(currentDate, "EEEE, MMMM d")}
            </p>

            <div className="space-y-4 relative z-10">
              {/* Templates */}
              {templates.length > 0 && (
                <div className="mb-2">
                  <label
                    className="text-[10px] uppercase font-bold tracking-widest mb-2 block transition-colors"
                    style={{ color: "var(--th-muted)" }}
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
                          borderColor: "var(--th-border)",
                          background: "var(--th-surface)",
                          color: "var(--th-text)",
                        }}
                      >
                        <span className="font-bold text-[11px] truncate">{t.title || t.name}</span>
                        <span
                          className="text-[9px] uppercase tracking-wider"
                          style={{ color: "var(--th-accent)" }}
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
                  style={{ color: "var(--th-muted)" }}
                >
                  Title
                </label>
                <Input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Team sync"
                  className="bg-transparent border transition-colors text-sm"
                  style={{ borderColor: "var(--th-border)", color: "var(--th-text)" }}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateTask()}
                />
              </div>

              <div>
                <label
                  className="text-[10px] uppercase font-bold tracking-widest mb-1 block transition-colors"
                  style={{ color: "var(--th-muted)" }}
                >
                  Notes
                </label>
                <Input
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  placeholder="Optional description"
                  className="bg-transparent border transition-colors text-sm"
                  style={{ borderColor: "var(--th-border)", color: "var(--th-text)" }}
                />
              </div>

              <div>
                <label
                  className="text-[10px] uppercase font-bold tracking-widest mb-1 block transition-colors"
                  style={{ color: "var(--th-muted)" }}
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
                  style={{ borderColor: "var(--th-border)", color: "var(--th-text)" }}
                />
                {newTaskHour && (
                  <p className="text-[10px] mt-1" style={{ color: "var(--th-muted)" }}>
                    = {formatHour(parseInt(newTaskHour) || 9)}
                  </p>
                )}
              </div>

              <Button
                onClick={handleCreateTask}
                disabled={!newTaskTitle}
                className="w-full h-12 uppercase font-bold tracking-widest text-[10px] rounded-xl hover:scale-105 transition-transform"
                style={{
                  background: "var(--th-accent)",
                  color: "var(--th-accent-text)",
                  boxShadow: "0 0 15px color-mix(in srgb, var(--th-accent) 20%, transparent)",
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
              background: "color-mix(in srgb, var(--th-surface-low) 40%, transparent)",
              borderColor: "var(--th-border)",
            }}
          >
            <h3
              className="font-bold text-lg mb-6 transition-colors"
              style={{ fontFamily: "'Space Grotesk', sans-serif", color: "var(--th-text)" }}
            >
              Upcoming
            </h3>

            <div className="space-y-4 relative z-10">
              {events.length === 0 && (
                <p className="text-xs transition-colors" style={{ color: "var(--th-muted)" }}>
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
                      style={{ background: "var(--th-surface)", borderColor: "transparent" }}
                    >
                      <div
                        className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                        style={{
                          background:
                            e.status === "done" ? "var(--th-muted)" : "var(--th-accent)",
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className="font-bold text-xs leading-tight mb-1 transition-colors truncate"
                          style={{ color: "var(--th-text)" }}
                        >
                          {e.title}
                        </p>
                        <p
                          className="text-[10px] uppercase font-bold tracking-widest transition-colors"
                          style={{ color: "var(--th-secondary)" }}
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
            className="relative w-full max-w-lg rounded-3xl border p-8 shadow-2xl overflow-hidden z-10"
            style={{
              background: "color-mix(in srgb, var(--th-bg) 95%, transparent)",
              borderColor: "rgba(255,231,146,0.3)",
            }}
          >
            <button
              onClick={() => setShowBriefingModal(false)}
              className="absolute top-6 right-6 hover:scale-110 transition-transform"
            >
              <MSIcon icon="close" style={{ color: "var(--th-muted)" }} />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#ffe792]/10 border border-[#ffe792]/30">
                <MSIcon icon="auto_awesome" style={{ color: "#ffe792", fontSize: 20 }} />
              </div>
              <h3
                className="text-xl font-bold tracking-tight text-[#ffe792]"
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
                  style={{ color: "var(--th-text)" }}
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