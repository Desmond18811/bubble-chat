import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
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

/* ─── UI Components ───────────────────────────────────────────────────────── */

const Icon = ({ name, className = "", style = {} }: { name: string; className?: string; style?: any }) => (
  <span className={cn("material-symbols-outlined", className)} style={{ fontSize: 22, ...style }}>
    {name}
  </span>
);

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
        className="w-full max-w-2xl mx-4 rounded-3xl border p-8 shadow-2xl"
        style={{
          background: "color-mix(in srgb, var(--th-bg) 90%, transparent)",
          borderColor: "rgba(255,231,146,0.2)",
        }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,231,146,0.1)", border: "1px solid rgba(255,231,146,0.3)" }}
          >
            <Icon name="mic" style={{ color: "#ffe792" }} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#ffe792]" style={SG}>Meeting Transcript</h2>
            <p className="text-xs text-white/40">Paste your transcript — Aida will extract action items & summary</p>
          </div>
          <button onClick={onClose} className="ml-auto text-white/30 hover:text-white transition-colors">
            <Icon name="close" />
          </button>
        </div>
        <textarea
          autoFocus
          className="w-full h-56 rounded-2xl p-4 text-sm outline-none resize-none"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "var(--th-text)",
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
            className="flex-1 py-3 rounded-xl border text-sm font-semibold text-white/50 hover:text-white transition-all"
            style={{ borderColor: "rgba(255,255,255,0.08)" }}
          >
            Cancel
          </button>
          <button
            onClick={() => { if (text.trim()) { onSubmit(text.trim()); onClose(); } }}
            disabled={!text.trim()}
            className="flex-1 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-30"
            style={{ background: "#ffe792", color: "#655400" }}
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
      await createOrgDoc({ ...form, tags });
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
    color: "var(--th-text)",
    fontFamily: "'Manrope', sans-serif",
    outline: "none",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-3xl max-h-[90vh] rounded-3xl border flex flex-col shadow-2xl overflow-hidden"
        style={{ background: "color-mix(in srgb, var(--th-bg) 95%, transparent)", borderColor: "rgba(255,231,146,0.2)" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-6 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,231,146,0.1)", border: "1px solid rgba(255,231,146,0.3)" }}>
            <Icon name="library_books" style={{ color: "#ffe792" }} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#ffe792]" style={SG}>AIda Knowledge Base</h2>
            <p className="text-xs text-white/40">Documents AIda reads to answer your questions accurately</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all"
            style={{ background: "rgba(255,231,146,0.1)", color: "#ffe792", border: "1px solid rgba(255,231,146,0.2)" }}
          >
            <Icon name={showForm ? "remove" : "add"} style={{ fontSize: 16 }} />
            Add Doc
          </button>
          <button onClick={onClose} className="ml-2 text-white/30 hover:text-white transition-colors">
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
              className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-30"
              style={{ background: "#ffe792", color: "#655400" }}
            >
              {saving ? "Saving…" : "Add to Knowledge Base"}
            </button>
          </div>
        )}

        {/* Doc List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
          {loading ? (
            <div className="text-center text-white/30 py-12 text-sm">Loading knowledge base…</div>
          ) : docs.length === 0 ? (
            <div className="text-center py-12">
              <Icon name="library_books" style={{ color: "#ffe792", fontSize: 40, opacity: 0.3 }} />
              <p className="text-white/30 text-sm mt-4">No documents yet. Add your company policies, SOPs, mission statements, and more.</p>
              <p className="text-white/20 text-xs mt-2">AIda will use these to give context-aware, accurate answers.</p>
            </div>
          ) : (
            docs.map((doc: any) => (
              <div
                key={doc._id}
                className="flex items-center gap-4 p-4 rounded-2xl border group"
                style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(255,231,146,0.08)", border: "1px solid rgba(255,231,146,0.15)" }}
                >
                  <Icon name="article" style={{ color: "#ffe792", fontSize: 18 }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{doc.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] uppercase tracking-widest text-white/30 px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                      {doc.department}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-[#ffe792]/50 px-2 py-0.5 rounded-full" style={{ background: "rgba(255,231,146,0.05)" }}>
                      {doc.accessLevel}
                    </span>
                    {(doc.tags || []).slice(0, 3).map((t: string) => (
                      <span key={t} className="text-[10px] text-white/20">#{t}</span>
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
    else if (trigger === "finance") handleFinance();
    else if (trigger === "flag_payments") handleAudit();
    window.history.replaceState({}, document.title, window.location.pathname);
  }, []);

  const pushMessage = (role: string, content: string, extra?: any) =>
    setMessages((prev) => [...prev, { role, content, ...extra }]);

  const handleSend = async (customText?: string) => {
    const text = customText || input;
    if (!text.trim()) return;
    pushMessage("user", text);
    if (!customText) setInput("");
    setLoading(true);
    try {
      const res = await chatWithAida(text);
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

  const handleFinance = async () => {
    pushMessage("user", "What's my financial situation?");
    setLoading(true);
    try {
      const res = await fetchAidaFinanceAdvice();
      pushMessage("assistant", res.reply);
    } catch (err: any) {
      toast.error("Failed to get financial advice: " + err.message);
      pushMessage("assistant", "Could not retrieve financial data right now.");
    } finally { setLoading(false); }
  };

  const handleAudit = async () => {
    pushMessage("user", "Please run an audit on my recent payments and detect any anomalies.");
    setLoading(true);
    try {
      const res = await aidaFlagPayments();
      const flagsText = res.flags.map((f: any) => `- [${f.severity.toUpperCase()}] ${f.message}`).join("\n");
      pushMessage("assistant", `Audit complete. Here is what I found:\n\n${flagsText}`);
    } catch (err: any) {
      toast.error("Audit failed: " + err.message);
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
    <div className="text-[var(--th-text)] min-h-screen flex font-['Manrope']" style={{ background: "var(--th-bg)" }}>
      <Sidebar />

      {/* Modals */}
      {showTranscript && <TranscriptModal onClose={() => setShowTranscript(false)} onSubmit={handleTranscriptSubmit} />}
      {showKnowledge && <KnowledgeBaseModal onClose={() => setShowKnowledge(false)} />}

      <main className="ml-[85px] flex-1 flex flex-col h-screen relative overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#ffe792]/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#ffe792]/5 blur-[120px] rounded-full pointer-events-none" />

        {/* Header */}
        <header
          className="h-20 shrink-0 px-8 flex items-center justify-between border-b backdrop-blur-xl relative z-10"
          style={{ background: "color-mix(in srgb, var(--th-bg) 70%, transparent)", borderColor: "var(--th-border)" }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center border shadow-[0_0_20px_rgba(255,231,146,0.15)]"
              style={{ background: "rgba(255,231,146,0.1)", borderColor: "rgba(255,231,146,0.3)" }}
            >
              <Icon name="auto_awesome" style={{ color: "#ffe792" }} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#ffe792]" style={SG}>Aida Luminous</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-40">DeepSeek · RAG Intelligence</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {[
              { label: "Briefing", icon: "wb_sunny", action: handleBriefing },
              { label: "Finance", icon: "account_balance", action: handleFinance },
              { label: "Transcript", icon: "mic", action: () => setShowTranscript(true) },
              { label: "Knowledge", icon: "library_books", action: () => setShowKnowledge(true) },
            ].map(({ label, icon, action }) => (
              <button
                key={label}
                onClick={action}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--th-surface-top)] border border-[var(--th-border)] text-xs font-bold uppercase tracking-widest hover:border-[#ffe792]/40 hover:text-[#ffe792] transition-all disabled:opacity-50"
                style={SG}
              >
                <Icon name={icon} style={{ fontSize: 15 }} />
                {label}
              </button>
            ))}
            <button
              onClick={handleClearConversation}
              title="Clear conversation"
              className="w-9 h-9 rounded-xl bg-[var(--th-surface-top)] border border-[var(--th-border)] flex items-center justify-center text-[var(--th-muted)] hover:text-red-400 hover:border-red-400/30 transition-all"
            >
              <Icon name="delete_sweep" style={{ fontSize: 17 }} />
            </button>
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-8 relative z-10 custom-scrollbar">
          <div className="max-w-3xl mx-auto space-y-6">

            {/* Quick chips — only show with no real conversation yet */}
            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {quickPrompts.map(({ label, icon, text }) => (
                  <button
                    key={label}
                    onClick={() => handleSend(text)}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-semibold hover:border-[#ffe792]/40 hover:text-[#ffe792] transition-all disabled:opacity-50"
                    style={{ borderColor: "rgba(255,255,255,0.08)", color: "var(--th-text)", background: "rgba(255,255,255,0.02)" }}
                  >
                    <Icon name={icon} style={{ fontSize: 16, color: "#ffe792" }} />
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
                      ? { background: "rgba(255,231,146,0.1)", borderColor: "rgba(255,231,146,0.2)", color: "#ffe792" }
                      : { background: "var(--th-surface-top)", borderColor: "var(--th-border)", color: "var(--th-secondary)" }
                  }
                >
                  <Icon name={msg.role === "assistant" ? "auto_awesome" : "person"} />
                </div>

                <div
                  className="px-6 py-4 rounded-3xl max-w-[82%] text-[14.5px] leading-[1.75] shadow-xl"
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

                  {/* Action results */}
                  {msg.actions && msg.actions.map((action: any, idx: number) => (
                    <div key={idx}>
                      {action.type === "FIND_FILE" && action.files?.length > 0 && (
                        <div className="mt-4 flex flex-col gap-2">
                          <p className="text-xs font-semibold opacity-60 mb-1">Files found:</p>
                          {action.files.map((f: any) => (
                            <a href="/workspace" key={f._id} className="block p-3 rounded-xl border border-white/10 bg-black/20 hover:bg-black/40 transition-colors">
                              <p className="text-sm font-bold truncate" style={{ color: "#ffe792" }}>{f.name}</p>
                              <p className="text-[10px] text-white/40 uppercase mt-1 tracking-widest">{f.fileType}</p>
                            </a>
                          ))}
                        </div>
                      )}

                      {action.type === "SCHEDULE_TASK" && (
                        <div className="mt-4 p-4 rounded-xl border border-white/10 bg-black/20 flex items-center gap-3">
                          <Icon name="event_available" style={{ color: "#ffe792" }} />
                          <div>
                            <p className="text-sm font-bold text-white">{action.title}</p>
                            <p className="text-xs text-white/50">Scheduled to Calendar</p>
                          </div>
                        </div>
                      )}

                      {action.type === "OPEN_CALENDAR" && (
                        <div className="mt-4 p-4 rounded-xl border border-white/10 bg-black/20 flex items-center gap-3">
                          <Icon name="calendar_month" style={{ color: "#ffe792" }} />
                          <p className="text-sm font-bold text-white">Opening Calendar…</p>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Template output */}
                  {msg.template && (
                    <div className="mt-4 p-5 rounded-2xl border border-white/20 bg-[#111620] shadow-2xl">
                      <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                        <div className="flex items-center gap-2 text-[#ffe792]">
                          <Icon name="description" style={{ fontSize: 16 }} />
                          <span className="text-xs font-bold uppercase tracking-widest">Generated Template</span>
                        </div>
                        <button
                          onClick={() => { navigator.clipboard.writeText(msg.template); toast.success("Copied!"); }}
                          className="flex items-center gap-1 text-xs font-semibold text-white/40 hover:text-white transition-colors"
                        >
                          <Icon name="content_copy" style={{ fontSize: 14 }} />
                          Copy
                        </button>
                      </div>
                      <pre className="text-sm text-white/70 whitespace-pre-wrap font-sans" style={{ lineHeight: 1.6 }}>
                        {msg.template}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-2xl bg-[#ffe792]/10 border border-[#ffe792]/20 flex items-center justify-center animate-pulse">
                  <Icon name="auto_awesome" style={{ color: "#ffe792" }} />
                </div>
                <div className="px-6 py-4 rounded-3xl bg-white/5 border border-white/5 flex gap-1.5 items-center">
                  {[0, 200, 400].map((delay) => (
                    <div key={delay} className="w-1.5 h-1.5 bg-[#ffe792] rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input area */}
        <div className="px-8 pb-6 pt-4 shrink-0 relative z-10">
          <div className="max-w-3xl mx-auto relative">
            <input
              className="w-full border rounded-[20px] py-4 pl-6 pr-16 outline-none transition-all shadow-2xl"
              style={{
                background: "rgba(17,39,63,0.4)",
                borderColor: "rgba(255,255,255,0.08)",
                color: "var(--th-text)",
                fontFamily: "'Manrope', sans-serif",
              }}
              placeholder="Ask Aida anything about your org, tasks, files…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              onFocus={(e) => { e.target.style.borderColor = "rgba(255,231,146,0.3)"; e.target.style.background = "rgba(17,39,63,0.6)"; }}
              onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.background = "rgba(17,39,63,0.4)"; }}
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg disabled:opacity-30 disabled:grayscale"
              style={{ background: "#ffe792", color: "#655400" }}
            >
              <Icon name="send" />
            </button>
          </div>
          <p className="text-center text-[10px] text-white/15 mt-3 uppercase tracking-widest" style={SG}>
            Aida · Powered by DeepSeek AI · Reads from your org knowledge base
          </p>
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,231,146,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,231,146,0.2); }
      `}</style>
    </div>
  );
}