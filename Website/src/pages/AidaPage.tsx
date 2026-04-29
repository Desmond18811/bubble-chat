import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { cn } from "@/lib/utils";
import { chatWithAida, fetchAidaBriefing, fetchAidaFinanceAdvice, aidaFlagPayments, aidaScheduleTask, aidaExtractActionItems } from "@/api";
import { toast } from "sonner";

/* ─── UI Components ───────────────────────────────────────────────────────── */

const Icon = ({ name, className = "", style = {} }: { name: string; className?: string; style?: any }) => (
  <span className={cn("material-symbols-outlined", className)} style={{ fontSize: 22, ...style }}>
    {name}
  </span>
);

const SG = { fontFamily: "'Space Grotesk', sans-serif" };

// Persistent storage key per user
const getStorageKey = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const uid = user._id || user.id || "guest";
    return `aida_messages_${uid}`;
  } catch {
    return "aida_messages_guest";
  }
};

export default function AidaPage() {
  // Get user's real name for personalization
  const currentUser = (() => { try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; } })();
  const userName = currentUser?.full_name || currentUser?.username || null;
  const greeting = userName
    ? `Hey ${userName.split(" ")[0]}! 👋 I'm Aida, your intelligent workspace companion. I can help you plan your schedule, draft templates, summarize meetings, and much more. What shall we tackle today?`
    : "Greetings! I'm Aida, your intelligent workspace companion. I can help you plan your schedule, draft templates, summarize meetings, and much more. How can I assist you today?";

  const defaultGreeting = {
    role: "assistant",
    content: greeting,
  };

  const [messages, setMessages] = useState<any[]>(() => {
    try {
      const key = getStorageKey();
      const saved = localStorage.getItem(key);
      if (saved) return JSON.parse(saved);
    } catch { }
    return [defaultGreeting];
  });

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    try {
      const key = getStorageKey();
      localStorage.setItem(key, JSON.stringify(messages));
    } catch (e) {
      console.warn("[Aida] Could not persist conversation:", e);
    }
  }, [messages]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Handle URL trigger params (e.g., from calendar briefing button)
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
    window.history.replaceState({}, document.title, window.location.pathname);
  }, []);

  const handleSend = async (customText?: string) => {
    const text = customText || input;
    if (!text.trim()) return;

    const userMsg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInput("");

    setLoading(true);
    try {
      const res = await chatWithAida(text);
      const actions = res.actions || (res.action ? [res.action] : []);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.reply || "I'm having trouble connecting to the model.",
          actions: actions,
        },
      ]);

      if (actions.length > 0) {
        for (const action of actions) {
          if (action.type === 'OPEN_CALENDAR') {
            setTimeout(() => {
              window.location.href = '/calendar';
            }, 1500);
          } else if (action.type === 'CREATE_TEMPLATE' && action.templateContent) {
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: "Here's your template!",
                template: action.templateContent,
              },
            ]);
          }
        }
      }
    } catch (err: any) {
      toast.error("Aida connection failed: " + err.message);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "The cosmic threads are tangled. I cannot reach my intelligence core right now.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleBriefing = async () => {
    setMessages((prev) => [
      ...prev,
      { role: "user", content: "Give me my daily briefing." },
    ]);
    setLoading(true);
    try {
      const res = await fetchAidaBriefing();
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
    } catch (err: any) {
      toast.error("Failed to get briefing: " + err.message);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Could not retrieve your briefing right now." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFinance = async () => {
    setMessages((prev) => [
      ...prev,
      { role: "user", content: "What's my financial situation?" },
    ]);
    setLoading(true);
    try {
      const res = await fetchAidaFinanceAdvice();
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
    } catch (err: any) {
      toast.error("Failed to get financial advice: " + err.message);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Could not retrieve financial data right now." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedSummarize = async () => {
    setMessages((prev) => [
      ...prev,
      { role: "user", content: "Can you summarize the recent activity in my feed?" },
    ]);
    setLoading(true);
    try {
      const res = await chatWithAida("Summarize recent feed activity");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.reply, actions: res.actions || (res.action ? [res.action] : []) },
      ]);
    } catch (err: any) {
      toast.error("Feed summarization failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAudit = async () => {
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: "Please run an audit on my recent payments and detect any anomalies.",
      },
    ]);
    setLoading(true);
    try {
      const res = await aidaFlagPayments();
      const flagsText = res.flags
        .map((f: any) => `- [${f.severity.toUpperCase()}] ${f.message}`)
        .join("\n");
      const reply = `Audit complete. Here is what I found:\n\n${flagsText}`;
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err: any) {
      toast.error("Audit failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTranscript = async () => {
    const transcript = window.prompt("Paste your meeting transcript here to extract action items:");
    if (!transcript) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", content: "Extract action items and tasks from this meeting transcript." },
    ]);
    setLoading(true);
    try {
      const res = await aidaExtractActionItems(transcript);
      if (res.actionItems && res.actionItems.length > 0) {
        const items = res.actionItems.map((item: any) => `- ${item.text} (Assignee: ${item.assignedToName || 'Unassigned'})`).join('\n');
        setMessages((prev) => [...prev, { role: "assistant", content: `I found the following action items:\n\n${items}` }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: "I couldn't find any clear action items in that transcript." }]);
      }
    } catch (err: any) {
      toast.error("Failed to extract action items: " + err.message);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "My systems encountered an error analyzing the transcript." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearConversation = () => {
    if (!window.confirm("Clear conversation history?")) return;
    const fresh = [defaultGreeting];
    setMessages(fresh);
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(fresh));
    } catch { }
  };

  return (
    <div
      className="text-[var(--th-text)] min-h-screen flex font-['Manrope']"
      style={{ background: "var(--th-bg)" }}
    >
      <Sidebar />

      <main className="ml-[85px] flex-1 flex flex-col h-screen relative overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#ffe792]/5 blur-[120px] rounded-full pointer-events-none transition-colors" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#ffe792]/5 blur-[120px] rounded-full pointer-events-none transition-colors" />

        {/* Header */}
        <header
          className="h-24 shrink-0 px-10 flex items-center justify-between border-b backdrop-blur-xl relative z-10"
          style={{
            background: "color-mix(in srgb, var(--th-bg) 70%, transparent)",
            borderColor: "var(--th-border)",
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center border transition-all shadow-[0_0_20px_rgba(255,231,146,0.15)]"
              style={{
                background: "rgba(255,231,146,0.1)",
                borderColor: "rgba(255,231,146,0.3)",
              }}
            >
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
            <button
              onClick={handleBriefing}
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-[var(--th-surface-top)] border border-[var(--th-border)] text-xs font-bold uppercase tracking-widest hover:border-[#ffe792]/40 hover:text-[#ffe792] transition-all disabled:opacity-50"
              style={SG}
            >
              Daily Briefing
            </button>
            <button
              onClick={handleFinance}
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-[var(--th-surface-top)] border border-[var(--th-border)] text-xs font-bold uppercase tracking-widest hover:border-[#ffe792]/40 hover:text-[#ffe792] transition-all disabled:opacity-50"
              style={SG}
            >
              Finance Advisor
            </button>
            <button
              onClick={handleTranscript}
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-[var(--th-surface-top)] border border-[var(--th-border)] text-xs font-bold uppercase tracking-widest hover:border-[#ffe792]/40 hover:text-[#ffe792] transition-all disabled:opacity-50"
              style={SG}
            >
              Meeting Transcripts
            </button>
            <button
              onClick={handleClearConversation}
              title="Clear conversation"
              className="w-10 h-10 rounded-xl bg-[var(--th-surface-top)] border border-[var(--th-border)] flex items-center justify-center text-[var(--th-muted)] hover:text-red-400 hover:border-red-400/30 transition-all"
            >
              <Icon name="delete_sweep" style={{ fontSize: 18 }} />
            </button>
          </div>
        </header>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-10 py-8 relative z-10 custom-scrollbar"
        >
          <div className="max-w-4xl mx-auto space-y-8">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn("flex gap-5", msg.role === "user" ? "flex-row-reverse" : "")}
              >
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border transition-all shadow-sm"
                  style={
                    msg.role === "assistant"
                      ? {
                        background: "rgba(255,231,146,0.1)",
                        borderColor: "rgba(255,231,146,0.2)",
                        color: "#ffe792",
                      }
                      : {
                        background: "var(--th-surface-top)",
                        borderColor: "var(--th-border)",
                        color: "var(--th-secondary)",
                      }
                  }
                >
                  <Icon name={msg.role === "assistant" ? "auto_awesome" : "person"} />
                </div>
                <div
                  className={cn(
                    "px-7 py-5 rounded-3xl max-w-[80%] text-[15px] leading-[1.7] shadow-xl relative transition-all"
                  )}
                  style={
                    msg.role === "assistant"
                      ? {
                        background: "rgba(255,255,255,0.03)",
                        color: "var(--th-text)",
                        border: "1px solid rgba(255,255,255,0.05)",
                        backdropFilter: "blur(10px)",
                        whiteSpace: "pre-wrap",
                      }
                      : {
                        background: "#ffe792",
                        color: "#655400",
                        fontWeight: "600",
                        whiteSpace: "pre-wrap",
                      }
                  }
                >
                  {msg.content}

                  {/* Action results mapped for multiple actions */}
                  {msg.actions && msg.actions.map((action: any, idx: number) => (
                    <div key={idx}>
                      {action.type === "FIND_FILE" && action.files?.length > 0 && (
                        <div className="mt-4 flex flex-col gap-2">
                          <p className="text-sm font-semibold opacity-70 mb-1">Found files:</p>
                          {action.files.map((f: any) => (
                            <a
                              href="/workspace"
                              key={f._id}
                              className="block p-3 rounded-xl border border-white/10 bg-black/20 hover:bg-black/40 transition-colors"
                            >
                              <p
                                className="text-sm font-bold truncate"
                                style={{ color: "#ffe792" }}
                              >
                                {f.name}
                              </p>
                              <p className="text-[10px] text-white/50 uppercase mt-1 tracking-widest">
                                {f.fileType}
                              </p>
                            </a>
                          ))}
                        </div>
                      )}

                      {action.type === "SCHEDULE_TASK" && (
                        <div className="mt-4 p-4 rounded-xl border border-white/10 bg-black/20 flex items-center gap-3">
                          <Icon name="event_available" style={{ color: "#ffe792" }} />
                          <div>
                            <p className="text-sm font-bold text-white">{action.title}</p>
                            <p className="text-xs text-white/60">Preparing to schedule...</p>
                          </div>
                        </div>
                      )}

                      {action.type === "OPEN_CALENDAR" && (
                        <div className="mt-4 p-4 rounded-xl border border-white/10 bg-black/20 flex items-center gap-3">
                          <Icon name="calendar_month" style={{ color: "#ffe792" }} />
                          <div>
                            <p className="text-sm font-bold text-white">Opening Calendar...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}{/* Render Template Output */}
                  {msg.template && (
                    <div className="mt-4 p-5 rounded-2xl border border-white/20 bg-[#111620] shadow-2xl">
                      <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                        <div className="flex items-center gap-2 text-[#ffe792]">
                          <Icon name="description" style={{ fontSize: 18 }} />
                          <span className="text-xs font-bold uppercase tracking-widest">Generated Template</span>
                        </div>
                        <button
                          onClick={() => { navigator.clipboard.writeText(msg.template); toast.success("Copied to clipboard!"); }}
                          className="flex items-center gap-1.5 text-xs font-semibold text-white/50 hover:text-white transition-colors"
                        >
                          <Icon name="content_copy" style={{ fontSize: 14 }} />
                          Copy
                        </button>
                      </div>
                      <pre className="text-sm text-white/80 whitespace-pre-wrap font-sans" style={{ lineHeight: 1.6 }}>
                        {msg.template}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="flex gap-5">
                <div className="w-11 h-11 rounded-2xl bg-[#ffe792]/10 border border-[#ffe792]/20 flex items-center justify-center animate-pulse">
                  <Icon name="auto_awesome" style={{ color: "#ffe792" }} />
                </div>
                <div className="px-7 py-5 rounded-3xl bg-white/5 border border-white/5 flex gap-1.5 items-center">
                  <div
                    className="w-1.5 h-1.5 bg-[#ffe792] rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <div
                    className="w-1.5 h-1.5 bg-[#ffe792] rounded-full animate-bounce"
                    style={{ animationDelay: "200ms" }}
                  />
                  <div
                    className="w-1.5 h-1.5 bg-[#ffe792] rounded-full animate-bounce"
                    style={{ animationDelay: "400ms" }}
                  />
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
                fontFamily: "'Manrope', sans-serif",
              }}
              placeholder="How can Aida guide you today?"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
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
          <p
            className="text-center text-[10px] text-white/20 mt-4 uppercase tracking-widest"
            style={SG}
          >
            Powered by Deep Six AI · Luminous Intelligence · Conversation persisted across sessions
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