import { useState, useEffect, useMemo } from "react";
import { startOfWeek, addDays, format, isSameDay, getHours, getMinutes, parseISO, addHours, startOfDay, addWeeks, subWeeks } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import Sidebar from "@/components/Sidebar";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalendarEvent {
  _id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  status: "todo" | "in-progress" | "done";
}

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

function TopBar() {
  return (
    <header className="flex justify-between items-center h-20 px-10 fixed top-0 right-0 left-[85px] z-40 transition-colors"
      style={{ background: "color-mix(in srgb, var(--th-bg) 60%, transparent)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--th-border)" }}>
      <div className="flex items-center px-4 py-2 rounded-xl transition-all border border-transparent focus-within:border-[var(--th-accent)]"
        style={{ background: "var(--th-surface-top)" }}>
        <MSIcon icon="search" className="text-sm mr-2" style={{ color: "var(--th-muted)" }} />
        <Input
          type="text"
          placeholder="Search scheduled matrices..."
          className="bg-transparent border-none focus-visible:ring-0 text-sm w-64 h-auto p-0 transition-colors"
          style={{ color: "var(--th-text)" }}
        />
      </div>

      <div className="flex items-center gap-6">
        <button className="p-2 transition-colors hover:scale-105" style={{ color: "var(--th-secondary)" }} onMouseEnter={e => e.currentTarget.style.color = "var(--th-accent)"} onMouseLeave={e => e.currentTarget.style.color = "var(--th-secondary)"}>
          <MSIcon icon="notifications" />
        </button>
        <div className="h-10 w-10 rounded-full overflow-hidden border transition-colors" style={{ borderColor: "var(--th-border)", background: "var(--th-surface-low)" }}>
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

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Create New Task form state
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskHour, setNewTaskHour] = useState("09");

  const TIME_SLOTS = Array.from({ length: 15 }, (_, i) => i + 7); // 7 AM to 9 PM

  // Load functions
  const fetchTasks = async () => {
    try {
        setLoading(true);
        const res = await fetch("http://localhost:3000/api/v1/tasks", {
            headers: { "Authorization": `Bearer ${localStorage.getItem("access_token")}` }
        });
        const data = await res.json();
        if (data.tasks) {
            setEvents(data.tasks);
        }
    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, []);

  const handleCreateTask = async () => {
    if (!newTaskTitle) return;
    try {
        const start = new Date(currentDate);
        start.setHours(parseInt(newTaskHour), 0, 0, 0);
        
        const end = new Date(start);
        end.setHours(end.getHours() + 1);

        const res = await fetch("http://localhost:3000/api/v1/tasks", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("access_token")}`
            },
            body: JSON.stringify({
                title: newTaskTitle,
                description: newTaskDesc,
                start_time: start.toISOString(),
                end_time: end.toISOString()
            })
        });
        
        if (res.ok) {
            setNewTaskTitle("");
            setNewTaskDesc("");
            fetchTasks();
            toast.success("Scheduled mapping defined successfully.");
        } else {
            toast.error("Failed to map task overlay.");
        }
    } catch (err) {
        toast.error("Communications failed.");
    }
  };

  const handleMarkDone = async (id: string, currentStatus: string) => {
    try {
        const nextStatus = currentStatus === "done" ? "todo" : "done";
        await fetch(`http://localhost:3000/api/v1/tasks/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("access_token")}` },
            body: JSON.stringify({ status: nextStatus })
        });
        fetchTasks();
    } catch (e) { }
  };

  const handleDelete = async (id: string) => {
    try {
        await fetch(`http://localhost:3000/api/v1/tasks/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${localStorage.getItem("access_token")}` },
        });
        fetchTasks();
        toast.success("Matrix segment erased.");
    } catch (e) { }
  };

  // Math logic
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const PIXELS_PER_HOUR = 96;

  return (
    <div className="min-h-screen transition-colors duration-300 relative overflow-hidden"
      style={{ background: "var(--th-bg)", color: "var(--th-text)", fontFamily: "'Manrope', sans-serif" }}>
      <Sidebar />
      <TopBar />

      {/* Glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] blur-[120px] rounded-full pointer-events-none z-0 transition-colors scale-150"
        style={{ background: "var(--th-glow)" }} />
      <div className="absolute bottom-[-10%] left-[10%] w-[30%] h-[40%] blur-[120px] rounded-full pointer-events-none z-0 transition-colors"
        style={{ background: "color-mix(in srgb, var(--th-secondary) 15%, transparent)" }} />

      <main className="ml-[85px] pt-28 px-10 pb-10 flex gap-8 h-screen relative z-10 box-border">
        {/* Main Calendar Grid */}
        <div className="flex-1 flex flex-col backdrop-blur-xl rounded-3xl border overflow-hidden transition-colors"
            style={{ background: "color-mix(in srgb, var(--th-surface-top) 40%, transparent)", borderColor: "var(--th-border)" }}>
            
            {/* Header / Nav */}
            <div className="flex justify-between items-center p-6 border-b transition-colors" style={{ borderColor: "var(--th-border)" }}>
               <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-bold transition-colors" style={{ fontFamily: "'Space Grotesk', sans-serif", color: "var(--th-text)" }}>
                     {format(weekStart, "MMMM yyyy")}
                  </h2>
               </div>
               <div className="flex gap-2">
                  <button className="p-2 rounded-xl transition-colors border flex items-center justify-center hover:scale-105"
                     onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
                     style={{ background: "var(--th-surface)", borderColor: "var(--th-border)" }}>
                     <MSIcon icon="chevron_left" />
                  </button>
                  <button className="px-4 py-2 rounded-xl font-bold text-xs uppercase uppercase transition-colors border hover:scale-105"
                     onClick={() => setCurrentDate(new Date())}
                     style={{ background: "var(--th-surface)", borderColor: "var(--th-border)", color: "var(--th-accent)" }}>
                     Today
                  </button>
                  <button className="p-2 rounded-xl transition-colors border flex items-center justify-center hover:scale-105"
                     onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
                     style={{ background: "var(--th-surface)", borderColor: "var(--th-border)" }}>
                     <MSIcon icon="chevron_right" />
                  </button>
               </div>
            </div>

            {/* Days Header Row */}
            <div className="grid grid-cols-8 border-b flex-shrink-0 transition-colors" style={{ borderColor: "var(--th-border)" }}>
                <div className="p-4 flex flex-col items-center justify-center border-r transition-colors"
                   style={{ borderColor: "var(--th-border)", background: "color-mix(in srgb, var(--th-surface-low) 50%, transparent)" }}>
                   <span className="font-mono text-[10px] uppercase transition-colors" style={{ color: "var(--th-muted)" }}>GMT+2</span>
                </div>
                {weekDays.map((day) => {
                   const today = isSameDay(day, new Date());
                   return (
                     <div key={day.toISOString()} className={cn("p-4 flex flex-col items-center transition-colors")}
                       style={{ background: today ? "color-mix(in srgb, var(--th-accent) 5%, transparent)" : "transparent" }}>
                       <span className="text-[10px] uppercase font-semibold font-mono transition-colors" style={{ color: today ? "var(--th-accent)" : "var(--th-secondary)" }}>
                         {format(day, "eee")}
                       </span>
                       <span className="text-xl font-bold mt-0.5 transition-colors" style={{ color: today ? "var(--th-accent)" : "var(--th-text)" }}>
                         {format(day, "d")}
                       </span>
                     </div>
                   );
                })}
            </div>

            {/* Time Body */}
            <div className="flex-grow overflow-y-auto relative custom-scrollbar">
                <div className="grid grid-cols-8" style={{ minHeight: `${TIME_SLOTS.length * PIXELS_PER_HOUR}px` }}>
                    {/* Tick scale */}
                    <div className="col-span-1 border-r transition-colors" style={{ borderColor: "var(--th-border)" }}>
                        {TIME_SLOTS.map((h) => (
                           <div key={h} className="h-24 border-b flex items-start justify-center pt-2 transition-colors"
                              style={{ borderColor: "color-mix(in srgb, var(--th-border) 20%, transparent)" }}>
                              <span className="font-mono text-[10px] transition-colors" style={{ color: "var(--th-muted)" }}>{h}:00</span>
                           </div>
                        ))}
                    </div>

                    {/* Columns array */}
                    {weekDays.map((day) => {
                       const dayEvents = events.filter(e => isSameDay(parseISO(e.start_time), day));

                       return (
                         <div key={day.toISOString()} className="col-span-1 border-r relative transition-colors" style={{ borderColor: "color-mix(in srgb, var(--th-border) 20%, transparent)" }}>
                             {/* Background grid ticks */}
                             {TIME_SLOTS.map(h => (
                               <div key={`tick-${h}`} className="h-24 border-b pointer-events-none transition-colors" style={{ borderColor: "color-mix(in srgb, var(--th-border) 10%, transparent)" }} />
                             ))}

                             {/* Events Rendering */}
                             {dayEvents.map(e => {
                                 const startDate = parseISO(e.start_time);
                                 const endDate = parseISO(e.end_time);
                                 const s_hr = getHours(startDate) + getMinutes(startDate)/60;
                                 const e_hr = getHours(endDate) + getMinutes(endDate)/60;
                                 
                                 // Offset relative to the first allowed slot
                                 const offsetStart = s_hr - TIME_SLOTS[0];
                                 if (offsetStart < 0) return null; // out of bounds

                                 const dur = e_hr - s_hr;
                                 const topPx = offsetStart * PIXELS_PER_HOUR;
                                 const heightPx = dur * PIXELS_PER_HOUR;
                                 const isDone = e.status === "done";

                                 return (
                                     <div key={e._id} 
                                        className="absolute left-1 right-1 rounded-xl p-3 overflow-hidden shadow-lg border-l-4 transition-all group"
                                        style={{ 
                                            top: topPx, height: heightPx, 
                                            background: isDone ? "color-mix(in srgb, var(--th-surface) 60%, transparent)" : "color-mix(in srgb, var(--th-accent) 20%, transparent)",
                                            borderColor: isDone ? "var(--th-border)" : "var(--th-accent)",
                                            opacity: isDone ? 0.6 : 1
                                        }}>
                                        <div className="flex justify-between items-start">
                                           <p className="font-bold text-[11px] leading-tight truncate transition-colors"
                                             style={{ color: isDone ? "var(--th-text)" : "var(--th-accent)" }}>
                                             {e.title}
                                           </p>
                                           <div className="hidden group-hover:flex gap-1 bg-[var(--th-surface)] p-1 rounded-lg">
                                               <button onClick={() => handleMarkDone(e._id, e.status)} style={{color: "var(--th-accent)"}}><MSIcon icon="check_circle" filled={isDone} style={{fontSize: 14}} /></button>
                                               <button onClick={() => handleDelete(e._id)} style={{color: "var(--th-muted)"}}><MSIcon icon="delete" style={{fontSize: 14}}/></button>
                                           </div>
                                        </div>
                                        {e.description && (
                                            <p className="text-[10px] mt-1 truncate transition-colors" style={{ color: "var(--th-text)" }}>{e.description}</p>
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

        {/* Action Panel Sidebar */}
        <div className="w-80 flex flex-col gap-6">
            <div className="backdrop-blur-xl rounded-3xl p-6 border transition-colors relative overflow-hidden"
              style={{ background: "color-mix(in srgb, var(--th-surface-low) 40%, transparent)", borderColor: "var(--th-border)" }}>
               <h3 className="font-bold text-lg mb-6 transition-colors" style={{ fontFamily: "'Space Grotesk', sans-serif", color: "var(--th-accent)" }}>Inject Task Matrix</h3>
               
               <div className="space-y-4 relative z-10">
                   <div>
                       <label className="text-[10px] uppercase font-bold tracking-widest mb-1 block transition-colors" style={{ color: "var(--th-muted)" }}>Designation</label>
                       <Input value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} placeholder="e.g. Protocol Sync" className="bg-transparent border transition-colors text-sm" style={{borderColor: "var(--th-border)", color: "var(--th-text)"}} />
                   </div>
                   <div>
                       <label className="text-[10px] uppercase font-bold tracking-widest mb-1 block transition-colors" style={{ color: "var(--th-muted)" }}>Time Sector (HR)</label>
                       <Input value={newTaskHour} onChange={e => setNewTaskHour(e.target.value)} type="number" min={7} max={20} className="bg-transparent border transition-colors text-sm" style={{borderColor: "var(--th-border)", color: "var(--th-text)"}} />
                   </div>
                   <Button onClick={handleCreateTask} disabled={!newTaskTitle} className="w-full h-12 uppercase font-bold tracking-widest text-[10px] rounded-xl hover:scale-105 transition-transform" 
                     style={{background: "var(--th-accent)", color: "var(--th-accent-text)", boxShadow: "0 0 15px color-mix(in srgb, var(--th-accent) 20%, transparent)"}}>
                      Initialize Phase
                   </Button>
               </div>
            </div>

            {/* Upcoming Summary View */}
            <div className="backdrop-blur-xl rounded-3xl p-6 border flex-1 transition-colors relative overflow-hidden overflow-y-auto custom-scrollbar"
              style={{ background: "color-mix(in srgb, var(--th-surface-low) 40%, transparent)", borderColor: "var(--th-border)" }}>
               <h3 className="font-bold text-lg mb-6 transition-colors" style={{ fontFamily: "'Space Grotesk', sans-serif", color: "var(--th-text)" }}>Mission Feed</h3>
               
               <div className="space-y-4 relative z-10">
                   {events.length === 0 && <p className="text-xs transition-colors" style={{color: "var(--th-muted)"}}>No active streams detected.</p>}
                   {events.slice(0, 10).map(e => {
                       const d = parseISO(e.start_time);
                       return (
                       <div key={e._id} className="p-3 rounded-xl border transition-colors flex items-start gap-3" 
                         style={{ background: "var(--th-surface)", borderColor: "transparent" }}>
                          <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{background: e.status === 'done' ? "var(--th-muted)" : "var(--th-accent)"}} />
                          <div>
                             <p className="font-bold text-xs leading-tight mb-1 transition-colors" style={{ color: "var(--th-text)" }}>{e.title}</p>
                             <p className="text-[10px] uppercase font-bold tracking-widest transition-colors" style={{ color: "var(--th-secondary)" }}>
                                {format(d, "MMM d, h:mm a")}
                             </p>
                          </div>
                       </div>
                   )})}
               </div>
            </div>
        </div>

      </main>
    </div>
  );
}