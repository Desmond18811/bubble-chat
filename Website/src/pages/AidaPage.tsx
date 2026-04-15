import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { cn } from "@/lib/utils";
import { chatWithAida, fetchAidaBriefing, fetchAidaFinanceAdvice, aidaFlagPayments } from "@/api";
import { toast } from "sonner";

/* ─── UI Components ───────────────────────────────────────────────────────── */

const Icon = ({ name, className = "", style = {} }: { name: string; className?: string; style?: any }) => (
  <span className={cn("material-symbols-outlined", className)} style={{ fontSize: 22, ...style }}>
    {name}
  </span>
);

const SG = { fontFamily: "'Space Grotesk', sans-serif" };

export default function AidaPage() {
  const [messages, setMessages] = useState<any[]>([
    { role: "assistant", content: "Greetings, voyager. I am Aida, your luminous guide through the Sets universe. How can I assist your journey today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const trigger = params.get("trigger");
    if (trigger === "briefing") {
      handleBriefing();
    } else if (trigger === "finance") {
      handleFinance();
    } else if (trigger === "feed") {
      handleFeedSummarize();
    } else if (trigger === "flag_payments") {
      handleAudit();
    }
    // Clean up URL to avoid re-triggering on refresh
    window.history.replaceState({}, document.title, window.location.pathname);
  }, []);

  const handleSend = async (customText?: string) => {
    const text = customText || input;
    if (!text.trim()) return;

    const userMsg = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    if (!customText) setInput("");
    
    setLoading(true);
    try {
      const res = await chatWithAida(text);
      setMessages(prev => [...prev, { role: "assistant", content: res.reply || "I'm having trouble connecting to the model.", action: res.action }]);
    } catch (err: any) {
      toast.error("Aida connection failed: " + err.message);
      setMessages(prev => [...prev, { role: "assistant", content: "The cosmic threads are tangled. I cannot reach my intelligence core right now." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleBriefing = async () => {
    setLoading(true);
    try {
      const res = await fetchAidaBriefing();
      setMessages(prev => [...prev, { role: "assistant", content: res.reply }]);
    } catch (err: any) {
      toast.error("Failed to get briefing: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFinance = async () => {
    setLoading(true);
    try {
      const res = await fetchAidaFinanceAdvice();
      setMessages(prev => [...prev, { role: "assistant", content: res.reply }]);
    } catch (err: any) {
      toast.error("Failed to get financial advice: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedSummarize = async () => {
    setLoading(true);
    setMessages(prev => [...prev, { role: "user", content: "Can you summarize the recent activity in my feed?" }]);
    try {
      const res = await chatWithAida("Summarize recent feed activity");
      setMessages(prev => [...prev, { role: "assistant", content: res.reply, action: res.action }]);
    } catch (err: any) {
      toast.error("Feed summarization failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAudit = async () => {
    setLoading(true);
    setMessages(prev => [...prev, { role: "user", content: "Please run an audit on my recent payments and detect any anomalies." }]);
    try {
      const res = await aidaFlagPayments();
      // Format the structured flag response into a message
      const flagsText = res.flags.map((f: any) => `- [${f.severity.toUpperCase()}] ${f.message}`).join('\n');
      const reply = `Audit complete. Here is what I found:\n\n${flagsText}`;
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (err: any) {
      toast.error("Audit failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="text-[var(--th-text)] min-h-screen flex font-['Manrope']" style={{ background: "var(--th-bg)" }}>
      <Sidebar />
      
      <main className="ml-[85px] flex-1 flex flex-col h-screen relative overflow-hidden">
        {/* Ambient Glows — Yellow themed */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#ffe792]/5 blur-[120px] rounded-full pointer-events-none transition-colors" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#ffe792]/5 blur-[120px] rounded-full pointer-events-none transition-colors" />

        <header className="h-24 shrink-0 px-10 flex items-center justify-between border-b backdrop-blur-xl relative z-10"
          style={{ background: "color-mix(in srgb, var(--th-bg) 70%, transparent)", borderColor: "var(--th-border)" }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center border transition-all shadow-[0_0_20px_rgba(255,231,146,0.15)]"
              style={{ background: "rgba(255,231,146,0.1)", borderColor: "rgba(255,231,146,0.3)" }}>
              <Icon name="auto_awesome" style={{ color: "#ffe792" }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#ffe792]" style={SG}>
                Aida Luminous
              </h1>
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-60">
                Luminous Intelligence Assistant
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <button onClick={handleBriefing} className="px-5 py-2 rounded-xl bg-[var(--th-surface-top)] border border-[var(--th-border)] text-xs font-bold uppercase tracking-widest hover:border-[#ffe792]/40 hover:text-[#ffe792] transition-all" style={SG}>
               Daily Briefing
             </button>
             <button onClick={handleFinance} className="px-5 py-2 rounded-xl bg-[var(--th-surface-top)] border border-[var(--th-border)] text-xs font-bold uppercase tracking-widest hover:border-[#ffe792]/40 hover:text-[#ffe792] transition-all" style={SG}>
               Finance Advisor
             </button>
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-10 py-8 relative z-10 custom-scrollbar translate-y-0">
          <div className="max-w-4xl mx-auto space-y-8">
            {messages.map((msg, i) => (
              <div key={i} className={cn(
                "flex gap-5",
                msg.role === "user" ? "flex-row-reverse" : ""
              )}>
                <div className={cn(
                  "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border transition-all shadow-sm",
                )} style={
                  msg.role === "assistant" 
                    ? { background: "rgba(255,231,146,0.1)", borderColor: "rgba(255,231,146,0.2)", color: "#ffe792" }
                    : { background: "var(--th-surface-top)", borderColor: "var(--th-border)", color: "var(--th-secondary)" }
                }>
                  <Icon name={msg.role === "assistant" ? "auto_awesome" : "person"} />
                </div>
                <div className={cn(
                  "px-7 py-5 rounded-3xl max-w-[80%] text-[15px] leading-[1.7] shadow-xl relative transition-all",
                )} style={
                  msg.role === "assistant"
                    ? { background: "rgba(255,255,255,0.03)", color: "var(--th-text)", border: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(10px)" }
                    : { background: "#ffe792", color: "#655400", fontWeight: "600" }
                }>
                  {msg.content}
                  
                  {msg.action && msg.action.type === "FIND_FILE" && msg.action.files?.length > 0 && (
                     <div className="mt-4 flex flex-col gap-2">
                       {msg.action.files.map((f: any) => (
                          <a href={`/workspace`} key={f._id} className="block p-3 rounded-xl border border-white/10 bg-black/20 hover:bg-black/40 transition-colors">
                             <p className="text-sm font-bold truncate" style={{ color: "#ffe792" }}>{f.name}</p>
                             <p className="text-[10px] text-white/50 uppercase mt-1 tracking-widest">{f.fileType}</p>
                          </a>
                       ))}
                     </div>
                  )}
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex gap-5">
                <div className="w-11 h-11 rounded-2xl bg-[#ffe792]/10 border border-[#ffe792]/20 flex items-center justify-center animate-pulse">
                  <Icon name="auto_awesome" style={{ color: "#ffe792" }} />
                </div>
                <div className="px-7 py-5 rounded-3xl bg-white/5 border border-white/5 flex gap-1.5 items-center">
                  <div className="w-1.5 h-1.5 bg-[#ffe792] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-[#ffe792] rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                  <div className="w-1.5 h-1.5 bg-[#ffe792] rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input area */}
        <div className="p-10 shrink-0 relative z-10 mb-2">
          <div className="max-w-4xl mx-auto relative group">
            <input 
              className="w-full border rounded-[24px] py-5 pl-8 pr-20 outline-none transition-all shadow-2xl"
              style={{
                background: "rgba(17,39,63,0.4)",
                borderColor: "rgba(255,255,255,0.08)",
                color: "var(--th-text)",
                fontFamily: "'Manrope', sans-serif"
              }}
              placeholder="How can Aida guide you today?"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              onFocus={(e) => {
                e.target.style.borderColor = "rgba(255,231,146,0.3)";
                e.target.style.background = "rgba(17,39,63,0.6)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(255,255,255,0.08)";
                e.target.style.background = "rgba(17,39,63,0.4)";
              }}
            />
            <button 
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg disabled:opacity-30 disabled:grayscale"
              style={{ background: "#ffe792", color: "#655400" }}
            >
              <Icon name="send" />
            </button>
          </div>
          <p className="text-center text-[10px] text-white/20 mt-4 uppercase tracking-widest" style={SG}>
            Powered by Gemma 2 · Luminous Intelligence
          </p>
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,231,146,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,231,146,0.2); }
      `}</style>
    </div>
  );
}
