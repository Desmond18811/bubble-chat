import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { AvatarInitials } from "@/components/AvatarInitials";
import { cn } from "@/lib/utils";
import {
  chatWithAida,
  fetchAidaBriefing,
  fetchAidaFinanceAdvice,
  aidaFlagPayments,
  aidaScheduleTask,
  aidaExtractActionItems,
  fetchOrgDocs,
  createOrgDoc,
  deleteOrgDoc,
} from "@/api";
import { toast } from "sonner";
import { useUserProfile } from "@/hooks/useUserProfile";
import { MobileHeader } from "@/components/MobileHeader";
import { Icon } from "@/components/Icon";

/* ─── UI Components ───────────────────────────────────────────────────────── */

/* Shared Icon imported from @/components/Icon */

const SG = { fontFamily: "'Space Grotesk', sans-serif" };

const getStorageKey = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const uid = user._id || user.id || "guest";
    return `aida_messages_${uid}`;
  } catch {
    return "aida_messages_guest";
  }
};

// ─── Transcript Modal ─────────────────────────────────────────────────────────
const TranscriptModal = ({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (text: string) => void;
}) => {
  const [text, setText] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div
        className="w-full max-w-2xl mx-4 rounded-3xl border border-border p-8 shadow-2xl bg-card"
      >
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10 border border-primary/20"
          >
            <Icon name="mic" className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-primary" style={SG}>Meeting Transcript</h2>
            <p className="text-xs text-muted-foreground">Paste your transcript — Aida will extract action items & summary</p>
          </div>
          <button onClick={onClose} className="ml-auto text-muted-foreground hover:text-primary transition-colors">
            <Icon name="close" />
          </button>
        </div>
        <textarea
          autoFocus
          className="w-full h-56 rounded-2xl p-4 text-sm outline-none resize-none"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "var(--foreground)",
            fontFamily: "'Manrope', sans-serif",
          }}
          placeholder="Paste your meeting transcript here…&#10;&#10;Example:&#10;John: We need to deploy by Friday.&#10;Sarah: I'll handle the testing by Thursday.&#10;John: Great. Sarah will also update the docs."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={(e) => { e.target.style.borderColor = "rgba(255,231,146,0.3)"; }}
          onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
        />
        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => { if (text.trim()) { onSubmit(text.trim()); onClose(); } }}
            disabled={!text.trim()}
            className="flex-1 py-3 rounded-xl text-sm font-bold bg-primary text-primary-foreground transition-all disabled:opacity-30"
          >
            Extract Action Items
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Org Knowledge Base Modal ─────────────────────────────────────────────────
const KnowledgeBaseModal = ({
  onClose,
}: {
  onClose: () => void;
}) => {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", department: "general", accessLevel: "public", tags: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchOrgDocs().then((r) => { setDocs(r.docs || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!form.title.trim() || !form.content.trim()) { toast.error("Title and content are required"); return; }
    setSaving(true);
    try {
      const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
      await createOrgDoc({ ...form, tags, accessLevel: form.accessLevel as 'public' | 'restricted' | 'admin' });
      toast.success(`"${form.title}" added to Aida's knowledge base!`);
      setForm({ title: "", content: "", department: "general", accessLevel: "public", tags: "" });
      setShowForm(false);
      const r = await fetchOrgDocs();
      setDocs(r.docs || []);
    } catch (e: any) {
      toast.error("Failed to add document: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}" from the knowledge base?`)) return;
    try {
      await deleteOrgDoc(id);
      setDocs((prev) => prev.filter((d) => d._id !== id));
      toast.success("Document removed.");
    } catch (e: any) {
      toast.error("Failed to delete: " + e.message);
    }
  };

  const inputStyle = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "var(--foreground)",
    fontFamily: "'Manrope', sans-serif",
    outline: "none",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-3xl max-h-[90vh] rounded-3xl border border-border flex flex-col shadow-2xl overflow-hidden bg-card"
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-6 border-b border-border">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10 border border-primary/20">
            <Icon name="library_books" className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-primary" style={SG}>AIda Knowledge Base</h2>
            <p className="text-xs text-muted-foreground">Documents AIda reads to answer your questions accurately</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all bg-primary/10 text-primary border border-primary/20"
          >
            <Icon name={showForm ? "remove" : "add"} style={{ fontSize: 16 }} />
            Add Doc
          </button>
          <button onClick={onClose} className="ml-2 text-muted-foreground hover:text-primary transition-colors">
            <Icon name="close" />
          </button>
        </div>

        {/* Add Form */}
        {showForm && (
          <div className="p-6 border-b space-y-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2">New Document</p>
            <input
              className="w-full rounded-xl px-4 py-3 text-sm"
              style={inputStyle}
              placeholder="Document title (e.g. Company Leave Policy)"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
            <div className="flex gap-3">
              <select
                className="flex-1 rounded-xl px-4 py-3 text-sm"
                style={inputStyle}
                value={form.department}
                onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
              >
                <option value="general">General</option>
                <option value="hr">HR</option>
                <option value="finance">Finance</option>
                <option value="engineering">Engineering</option>
                <option value="operations">Operations</option>
                <option value="sales">Sales</option>
                <option value="legal">Legal</option>
              </select>
              <select
                className="flex-1 rounded-xl px-4 py-3 text-sm"
                style={inputStyle}
                value={form.accessLevel}
                onChange={(e) => setForm((f) => ({ ...f, accessLevel: e.target.value }))}
              >
                <option value="public">Public (all staff)</option>
                <option value="restricted">Restricted (team leads+)</option>
                <option value="admin">Admin only</option>
              </select>
            </div>
            <input
              className="w-full rounded-xl px-4 py-3 text-sm"
              style={inputStyle}
              placeholder="Tags (comma-separated): policy, leave, hr"
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
            />
            <textarea
              className="w-full h-40 rounded-xl p-4 text-sm resize-none"
              style={inputStyle}
              placeholder="Paste the full document content here. Aida will index and search this when answering questions…"
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            />
            <button
              onClick={handleCreate}
              disabled={saving || !form.title.trim() || !form.content.trim()}
              className="w-full py-3 rounded-xl text-sm font-bold bg-primary text-primary-foreground transition-all disabled:opacity-30"
            >
              {saving ? "Saving…" : "Add to Knowledge Base"}
            </button>
          </div>
        )}

        {/* Doc List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
          {loading ? (
            <div className="text-center text-muted-foreground py-12 text-sm">Loading knowledge base…</div>
          ) : docs.length === 0 ? (
            <div className="text-center py-12">
              <Icon name="library_books" className="text-primary opacity-30" style={{ fontSize: 40 }} />
              <p className="text-muted-foreground text-sm mt-4">No documents yet. Add your company policies, SOPs, mission statements, and more.</p>
              <p className="text-muted-foreground/60 text-xs mt-2">AIda will use these to give context-aware, accurate answers.</p>
            </div>
          ) : (
            docs.map((doc: any) => (
              <div
                key={doc._id}
                className="flex items-center gap-4 p-4 rounded-2xl border border-border group bg-secondary/30"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary/10 border border-primary/20"
                >
                  <Icon name="article" className="text-primary" style={{ fontSize: 18 }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{doc.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
                      {doc.department}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-primary/70 px-2 py-0.5 rounded-full bg-primary/5">
                      {doc.accessLevel}
                    </span>
                    {(doc.tags || []).slice(0, 3).map((t: string) => (
                      <span key={t} className="text-[10px] text-muted-foreground/60">#{t}</span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(doc._id, doc.title)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400/60 hover:text-red-400 ml-2"
                >
                  <Icon name="delete" style={{ fontSize: 18 }} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main AidaPage ────────────────────────────────────────────────────────────
export default function AidaPage() {
  const currentUser = (() => { try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; } })();
  const userName = currentUser?.full_name || currentUser?.username || null;
  const greeting = userName
    ? `Hey ${userName.split(" ")[0]}! 👋 I'm Aida, your intelligent workspace companion powered by DeepSeek AI. I can answer questions from your company's knowledge base, plan your schedule, draft templates, summarize meetings, and much more. What shall we tackle today?`
    : "Greetings! I'm Aida, your intelligent workspace companion powered by DeepSeek AI. I can help you plan your schedule, draft templates, summarize meetings, and answer questions from your company knowledge base. How can I assist you today?";

  const defaultGreeting = { role: "assistant", content: greeting };

  const [messages, setMessages] = useState<any[]>(() => {
    try {
      const key = getStorageKey();
      const saved = localStorage.getItem(key);
      if (saved) return JSON.parse(saved);
    } catch { }
    return [defaultGreeting];
  });

  useEffect(() => {
    try {
      const key = getStorageKey();
      localStorage.setItem(key, JSON.stringify(messages));
    } catch { }
  }, [messages]);

  const { userData } = useUserProfile();

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showKnowledge, setShowKnowledge] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  // URL trigger params (e.g. from calendar briefing button)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const trigger = params.get("trigger");
    if (trigger === "briefing") handleBriefing();
    else if (trigger === "flag_payments") handleSend("Please run an audit on my recent payments and detect any anomalies.");
    window.history.replaceState({}, document.title, window.location.pathname);
  }, []);

  const pushMessage = (role: string, content: string, extra?: any) =>
    setMessages((prev) => [...prev, { role, content, ...extra }]);

  const handleSend = async (customText?: string) => {
    const text = customText || input;
    if (!text.trim()) return;

    // Build the history payload BEFORE pushing the immediate user message
    // so we don't duplicate the current prompt in the context
    const historyPayload = messages
      .filter((m) => m.role !== "system" && !m.type?.includes("widget"))
      .slice(-12) // Keep the last 12 interactions for healthy memory limits
      .map((m) => ({ role: m.role, content: String(m.content) }));

    pushMessage("user", text);
    if (!customText) setInput("");
    setLoading(true);
    try {
      const res = await chatWithAida(text, historyPayload);
      const actions = res.actions || (res.action ? [res.action] : []);
      pushMessage("assistant", res.reply || "I'm having trouble connecting to my intelligence core.", { actions });

      for (const action of actions) {
        if (action.type === "OPEN_CALENDAR") {
          setTimeout(() => { window.location.href = "/calendar"; }, 1500);
        } else if (action.type === "CREATE_TEMPLATE" && action.templateContent) {
          pushMessage("assistant", "Here's your template!", { template: action.templateContent });
        }
      }
    } catch (err: any) {
      toast.error("Aida connection failed: " + err.message);
      pushMessage("assistant", "The cosmic threads are tangled. I cannot reach my intelligence core right now.");
    } finally {
      setLoading(false);
    }
  };

  const handleBriefing = async () => {
    pushMessage("user", "Give me my daily briefing.");
    setLoading(true);
    try {
      const res = await fetchAidaBriefing();
      pushMessage("assistant", res.reply);
    } catch (err: any) {
      toast.error("Failed to get briefing: " + err.message);
      pushMessage("assistant", "Could not retrieve your briefing right now.");
    } finally { setLoading(false); }
  };

  const handleTranscriptSubmit = async (transcript: string) => {
    pushMessage("user", "Extract action items and tasks from this meeting transcript.");
    setLoading(true);
    try {
      const res = await aidaExtractActionItems(transcript);
      if (res.actionItems && res.actionItems.length > 0) {
        const items = res.actionItems
          .map((item: any) => `- ${item.text}${item.assignedToName ? ` → ${item.assignedToName}` : ""}${item.deadline ? ` (by ${item.deadline})` : ""}`)
          .join("\n");
        pushMessage("assistant", `I extracted **${res.actionItems.length}** action item(s) from your transcript:\n\n${items}\n\nWould you like me to schedule any of these to your Calendar?`);
      } else {
        pushMessage("assistant", "I couldn't find any clear action items in that transcript. Try making sure the transcript has clear task language like 'will', 'should', 'must', or 'action:'.");
      }
    } catch (err: any) {
      toast.error("Failed to extract action items: " + err.message);
      pushMessage("assistant", "My systems encountered an error analyzing the transcript.");
    } finally { setLoading(false); }
  };

  const handleClearConversation = () => {
    if (!window.confirm("Clear conversation history?")) return;
    const fresh = [defaultGreeting];
    setMessages(fresh);
    try { localStorage.setItem(getStorageKey(), JSON.stringify(fresh)); } catch { }
  };

  // Quick prompt chips
  const quickPrompts = [
    { label: "Today's Tasks", icon: "checklist", text: "What do I have on my schedule today?" },
    { label: "Plan a Goal", icon: "flag", text: "Help me break down a goal into actionable steps." },
    { label: "Find a File", icon: "folder_search", text: "Search my workspace files for something." },
    { label: "Company Policies", icon: "policy", text: "What are our company policies?" },
  ];

  return (
    <div className="text-[var(--foreground)] min-h-screen flex font-['Manrope']" style={{ background: "var(--background)" }}>
      <MobileHeader title="Aida Assistant" />
      <Sidebar />

      {/* Modals */}
      {showTranscript && <TranscriptModal onClose={() => setShowTranscript(false)} onSubmit={handleTranscriptSubmit} />}
      {showKnowledge && <KnowledgeBaseModal onClose={() => setShowKnowledge(false)} />}

      <main className="flex-1 flex flex-col pt-20 md:pt-0 h-screen relative overflow-hidden transition-all duration-300" style={{ marginLeft: "var(--main-margin)" }}>
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

        {/* Header */}
        <header
          className="h-16 md:h-20 shrink-0 px-4 md:px-8 hidden md:flex items-center justify-between border-b border-border bg-background/70 backdrop-blur-xl relative z-10"
        >
          <div className="flex items-center gap-4">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center border border-primary/30 bg-primary/10 shadow-[0_0_20px_rgba(79,70,229,0.15)]"
            >
              <Icon name="auto_awesome" className="text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-primary" style={SG}>Aida Luminous</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-40">DeepSeek · RAG Intelligence</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {[
              { label: "Briefing", icon: "wb_sunny", action: handleBriefing },
              { label: "Check Calendar", icon: "calendar_month", action: () => handleSend("What's on my calendar today?") },
              { label: "Knowledge Docs", icon: "library_books", action: () => setShowKnowledge(true) },
            ].map(({ label, icon, action }) => (
              <button
                key={label}
                onClick={action}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent border border-border text-xs font-bold uppercase tracking-widest hover:border-primary/40 hover:text-primary transition-all disabled:opacity-50"
                style={SG}
              >
                <Icon name={icon} style={{ fontSize: 15 }} />
                {label}
              </button>
            ))}
            <button
              onClick={handleClearConversation}
              title="Clear conversation"
              className="w-9 h-9 rounded-xl bg-[var(--accent)] border border-[#0c2037/20] flex items-center justify-center text-[var(--muted-foreground)] hover:text-red-400 hover:border-red-400/30 transition-all"
            >
              <Icon name="delete_sweep" style={{ fontSize: 17 }} />
            </button>
            <div className="w-11 h-11 rounded-2xl overflow-hidden border ml-2" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
              <AvatarInitials name={userData?.full_name || userData?.username || "U"} url={userData?.avatar} className="text-sm" />
            </div>
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-8 py-6 md:py-8 relative z-10 custom-scrollbar pt-20 md:pt-8">
          <div className="max-w-3xl mx-auto space-y-6">

            {/* Quick chips — only show with no real conversation yet */}
            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {quickPrompts.map(({ label, icon, text }) => (
                  <button
                    key={label}
                    onClick={() => handleSend(text)}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-border text-xs font-semibold hover:border-primary/40 hover:text-primary transition-all disabled:opacity-50 bg-secondary/20"
                  >
                    <Icon name={icon} style={{ fontSize: 16 }} className="text-primary" />
                    {label}
                  </button>
                ))}
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={cn("flex gap-4", msg.role === "user" ? "flex-row-reverse" : "")}>
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border"
                  style={
                    msg.role === "assistant"
                      ? { background: "var(--primary)", borderColor: "var(--primary)", color: "var(--primary-foreground)" }
                      : { background: "var(--accent)", borderColor: "#0c2037/20", color: "var(--foreground)" }
                  }
                >
                  <Icon name={msg.role === "assistant" ? "auto_awesome" : "person"} />
                </div>

                <div
                  className={cn(
                    "px-6 py-4 rounded-3xl max-w-[82%] text-[14.5px] leading-[1.75] shadow-lg border transition-all duration-300",
                    msg.role === "assistant"
                      ? "text-[var(--foreground)]"
                      : "bg-[var(--primary)] text-white border-[var(--primary)] font-semibold shadow-[0_8px_20px_rgba(var(--primary),0.2)]"
                  )}
                  style={{
                    whiteSpace: "pre-wrap",
                    background: msg.role === "assistant" ? "rgba(255, 255, 255, 0.4)" : undefined,
                    backdropFilter: msg.role === "assistant" ? "blur(24px)" : undefined,
                    borderColor: msg.role === "assistant" ? "rgba(var(--primary), 0.1)" : undefined
                  }}
                >
                  {msg.content}

                  {/* Action results */}
                  {msg.actions && msg.actions.map((action: any, idx: number) => (
                    <div key={idx}>
                      {action.type === "FIND_FILE" && action.files?.length > 0 && (
                        <div className="mt-4 flex flex-col gap-2">
                          <p className="text-xs font-semibold opacity-60 mb-1">Files found:</p>
                          {action.files.map((f: any) => (
                            <a href="/workspace" key={f._id}
                              className="block p-4 rounded-2xl border border-[var(--primary)]/10 transition-all hover:translate-x-1"
                              style={{ background: "rgba(255, 255, 255, 0.5)", backdropFilter: "blur(12px)" }}>
                              <p className="text-sm font-bold truncate text-[var(--primary)]">{f.name}</p>
                              <p className="text-[10px] text-[var(--primary)]/60 font-bold uppercase mt-1 tracking-widest">{f.fileType}</p>
                            </a>
                          ))}
                        </div>
                      )}

                      {action.type === "SCHEDULE_TASK" && (
                        <div
                          onClick={() => window.location.href = '/calendar'}
                          className="mt-4 p-4 rounded-xl border border-border bg-muted flex items-center gap-3 cursor-pointer hover:bg-secondary transition-all hover:border-primary/40"
                        >
                          <Icon name="event_available" className="text-primary" />
                          <div>
                            <p className="text-sm font-bold text-foreground">{action.title}</p>
                            <p className="text-xs text-muted-foreground">Scheduled to Calendar (Click to view)</p>
                          </div>
                        </div>
                      )}

                      {action.type === "OPEN_CALENDAR" && (
                        <div className="mt-4 p-4 rounded-xl border border-border bg-muted flex items-center gap-3">
                          <Icon name="calendar_month" className="text-primary" />
                          <p className="text-sm font-bold text-foreground">Opening Calendar…</p>
                        </div>
                      )}

                      {action.type === "SCHEDULE_CALL" && (
                        <div className="mt-4 p-5 rounded-2xl border border-border bg-card shadow-lg relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-2xl rounded-full pointer-events-none" />
                          <div className="flex items-start justify-between relative z-10">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/30 shrink-0">
                                <Icon name="video_call" className="text-primary" />
                              </div>
                              <div>
                                <h3 className="text-sm font-bold text-foreground">Generate Call Link</h3>
                                <p className="text-xs text-muted-foreground">Start or schedule a secure meeting</p>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 flex gap-3 relative z-10">
                            <button
                              onClick={() => {
                                const uuid = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
                                const roomId = `bubble-${uuid}-${Date.now()}`;
                                window.location.href = `/meet/room/${roomId}?type=${action.callType || 'video'}`;
                              }}
                              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
                            >
                              Join Now
                            </button>
                            <button
                              onClick={() => {
                                const uuid = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
                                const roomId = `bubble-${uuid}-${Date.now()}`;
                                const link = `${window.location.origin}/meet/room/${roomId}?type=${action.callType || 'video'}`;
                                navigator.clipboard.writeText(link);
                                toast.success("Secure Call Link Copied!");
                              }}
                              className="flex-1 py-2.5 rounded-xl border border-border text-foreground text-xs font-bold uppercase tracking-widest hover:border-primary/40 transition-colors"
                            >
                              Copy Link
                            </button>
                          </div>
                        </div>
                      )}

                      {/* ─── SCHEDULE_GROUP_CALL card ─── */}
                      {action.type === "SCHEDULE_GROUP_CALL" && (
                        <div className="mt-4 p-5 rounded-2xl border border-border bg-card shadow-lg relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-2xl rounded-full pointer-events-none" />
                          <div className="flex items-center gap-3 mb-3 relative z-10">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/30 shrink-0">
                              <Icon name={action.callType === 'audio' ? "phone" : "video_call"} className="text-primary" />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-foreground">{action.title || "Group Call"}</h3>
                              <p className="text-xs text-muted-foreground">{action.callType === 'audio' ? 'Audio' : 'Video'} call link ready</p>
                            </div>
                          </div>

                          {/* Participants */}
                          {action.participants && action.participants.length > 0 && (
                            <div className="mb-3 flex flex-wrap gap-1.5 relative z-10">
                              {action.participants.map((p: string, pi: number) => (
                                <span key={pi} className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-primary/10 text-primary border border-primary/20">
                                  {p}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex gap-3 relative z-10">
                            <button
                              onClick={() => {
                                const uuid = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
                                const roomId = `bubble-${uuid}-${Date.now()}`;
                                window.location.href = `/meet/room/${roomId}?type=${action.callType || 'video'}`;
                              }}
                              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
                            >
                              Join Now
                            </button>
                            <button
                              onClick={() => {
                                const uuid = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
                                const roomId = `bubble-${uuid}-${Date.now()}`;
                                const link = `${window.location.origin}/meet/room/${roomId}?type=${action.callType || 'video'}`;
                                navigator.clipboard.writeText(link);
                                toast.success(`${action.callType === 'audio' ? 'Audio' : 'Video'} Call Link Copied!`);
                              }}
                              className="flex-1 py-2.5 rounded-xl border border-border text-foreground text-xs font-bold uppercase tracking-widest hover:border-primary/40 transition-colors"
                            >
                              Copy & Share
                            </button>
                          </div>
                        </div>
                      )}

                      {/* ─── PLAN_PHASES card ─── */}
                      {action.type === "PLAN_PHASES" && action.createdTasks && (
                        <div className="mt-4 p-5 rounded-2xl border border-border bg-card shadow-lg relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 blur-3xl rounded-full pointer-events-none" />
                          <div className="flex items-center gap-3 mb-4 relative z-10">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/30 shrink-0">
                              <Icon name="account_tree" className="text-primary" />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-foreground">{action.planTitle || 'Plan'}</h3>
                              <p className="text-xs text-muted-foreground">{action.createdTasks.length} phase(s) added to Calendar</p>
                            </div>
                          </div>

                          {/* Phase timeline */}
                          <div className="space-y-2 relative z-10 mb-4">
                            {action.createdTasks.map((task: any, ti: number) => (
                              <div key={ti} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border">
                                <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">{ti + 1}</div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-foreground truncate">{task.title}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {task.start_time ? new Date(task.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                                    {task.end_time ? ` → ${new Date(task.end_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
                                  </p>
                                </div>
                                <Icon name="check_circle" className="text-primary/30" style={{ fontSize: 16 }} />
                              </div>
                            ))}
                          </div>

                          <button
                            onClick={() => window.location.href = '/calendar'}
                            className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors relative z-10 bg-primary/10 text-primary border border-primary/20"
                          >
                            View in Calendar
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Template output */}
                  {msg.template && (
                    <div className="mt-4 p-6 rounded-2xl border border-border bg-card shadow-lg relative">
                      <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 blur-3xl rounded-full pointer-events-none" />
                      <div className="flex items-center justify-between mb-4 border-b border-border pb-3 relative z-10">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/30">
                            <Icon name="description" style={{ fontSize: 16 }} className="text-primary" />
                          </div>
                          <span className="text-xs font-bold text-foreground uppercase tracking-widest">Aida Drafted Document</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => {
                              try {
                                const BASE = (import.meta.env.VITE_API_URL?.replace(/ i$/, '')?.trim()) || "http://localhost:3000/api/v1";
                                const blob = new Blob([msg.template], { type: "text/plain" });
                                const formData = new FormData();
                                formData.append("file", blob, "Template.txt");
                                await fetch(`${BASE}/workspace/upload`, {
                                  method: "POST",
                                  headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
                                  body: formData,
                                });
                                toast.success("Saved to Workspace!");
                              } catch { toast.error("Failed to save to Workspace"); }
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[10px] uppercase font-bold text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors bg-secondary/40"
                          >
                            <Icon name="save" style={{ fontSize: 14 }} /> Workspace
                          </button>
                          <button
                            onClick={() => { navigator.clipboard.writeText(msg.template); toast.success("Copied to Clipboard!"); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/20 text-[10px] uppercase font-bold text-primary hover:bg-primary/10 transition-colors bg-primary/5"
                          >
                            <Icon name="content_copy" style={{ fontSize: 14 }} /> Copy
                          </button>
                        </div>
                      </div>
                      <div className="text-sm text-foreground/80 whitespace-pre-wrap font-sans relative z-10 bg-secondary/20 p-4 rounded-xl border border-border" style={{ lineHeight: 1.7 }}>
                        {msg.template}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center animate-pulse">
                  <Icon name="auto_awesome" className="text-primary" />
                </div>
                <div className="px-6 py-4 rounded-3xl bg-accent/40 border border-border flex gap-1.5 items-center">
                  {[0, 200, 400].map((delay) => (
                    <div key={delay} className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input area */}
        <div className="px-4 md:px-8 pb-4 md:pb-6 pt-4 shrink-0 relative z-10">
          <div className="max-w-3xl mx-auto relative">
            <input
              className="w-full border border-border rounded-2xl md:rounded-[20px] py-3 md:py-4 pl-4 md:pl-6 pr-12 md:pr-16 outline-none transition-all shadow-xl text-sm md:text-base bg-card focus:border-primary/40 text-foreground"
              style={{
                fontFamily: "'Manrope', sans-serif",
              }}
              placeholder="Ask Aida anything about your org, tasks, files…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              onFocus={(e) => { e.target.style.borderColor = "var(--primary)/30"; e.target.style.background = "var(--accent)/60"; }}
              onBlur={(e) => { e.target.style.borderColor = "#0c2037/20"; e.target.style.background = "var(--card)"; }}
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg disabled:opacity-30 disabled:grayscale"
              style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
            >
              <Icon name="send" />
            </button>
          </div>
          <p className="text-center text-[10px] text-muted-foreground/30 mt-3 uppercase tracking-widest" style={SG}>
            Aida · Powered by DeepSeek AI · Reads from your org knowledge base
          </p>
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--primary)/10; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--primary)/20; }
      `}</style>
    </div >
  );
}