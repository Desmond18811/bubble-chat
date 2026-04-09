import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { cn } from "@/lib/utils";

const Icon = ({ name, className = "" }: { name: string; className?: string }) => (
  <span className={cn("material-symbols-outlined", className)}>
    {name}
  </span>
);

export default function AidaPage() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Greetings, voyager. I am Aida, your luminous guide through the Bubble universe. How can I assist your journey today?" }
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, { role: "user", content: input }]);
    setInput("");
    
    // Simulate response
    setTimeout(() => {
      setMessages(prev => [...prev, { role: "assistant", content: "The cosmic threads are still aligning for my full integration. Soon, I will be able to analyze your data, manage your workspace, and predict your needs with stellar accuracy. Stay luminous." }]);
    }, 1000);
  };

  return (
    <div className="text-[var(--th-text)] min-h-screen flex font-['Manrope'] transition-colors duration-300" style={{ background: "var(--th-bg)" }}>
      <Sidebar />
      
      <main className="ml-[85px] flex-1 flex flex-col h-screen relative overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] blur-[120px] rounded-full pointer-events-none transition-colors" style={{ background: "var(--th-glow)" }} />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] blur-[120px] rounded-full pointer-events-none transition-colors" style={{ background: "color-mix(in srgb, var(--th-secondary) 15%, transparent)" }} />

        <header className="h-20 shrink-0 px-10 flex items-center justify-between border-b backdrop-blur-xl relative z-10 transition-colors"
          style={{ background: "color-mix(in srgb, var(--th-bg) 60%, transparent)", borderColor: "var(--th-border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center border transition-colors"
              style={{ background: "color-mix(in srgb, var(--th-accent) 10%, transparent)", borderColor: "color-mix(in srgb, var(--th-accent) 20%, transparent)" }}>
              <Icon name="smart_toy" className="" style={{ color: "var(--th-accent)" }} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight transition-colors" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Aida AI
              </h1>
              <p className="text-[10px] uppercase tracking-widest font-bold transition-colors" style={{ color: "var(--th-muted)" }}>
                Luminous Intelligence
              </p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-10 py-8 relative z-10 custom-scrollbar">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg, i) => (
              <div key={i} className={cn(
                "flex gap-4",
                msg.role === "user" ? "flex-row-reverse" : ""
              )}>
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors",
                )} style={
                  msg.role === "assistant" 
                    ? { background: "color-mix(in srgb, var(--th-accent) 10%, transparent)", borderColor: "color-mix(in srgb, var(--th-accent) 20%, transparent)", color: "var(--th-accent)" }
                    : { background: "var(--th-surface-top)", borderColor: "color-mix(in srgb, var(--th-border) 30%, transparent)", color: "var(--th-secondary)" }
                }>
                  <Icon name={msg.role === "assistant" ? "smart_toy" : "person"} />
                </div>
                <div className={cn(
                  "px-6 py-4 rounded-2xl max-w-[80%] text-sm leading-relaxed transition-colors",
                )} style={
                  msg.role === "assistant"
                    ? { background: "color-mix(in srgb, var(--th-surface-top) 40%, transparent)", color: "var(--th-text)", border: "1px solid color-mix(in srgb, var(--th-border) 30%, transparent)" }
                    : { background: "var(--th-accent)", color: "var(--th-accent-text)", fontWeight: "500" }
                }>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-8 shrink-0 relative z-10">
          <div className="max-w-3xl mx-auto relative group">
            <input 
              className="w-full border rounded-2xl py-4 pl-6 pr-16 outline-none transition-all backdrop-blur-md"
              style={{
                background: "color-mix(in srgb, var(--th-surface-low) 80%, transparent)",
                borderColor: "color-mix(in srgb, var(--th-border) 50%, transparent)",
                color: "var(--th-text)",
              }}
              placeholder="Transmit a message to Aida..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              onFocus={(e) => e.target.style.borderColor = "color-mix(in srgb, var(--th-accent) 50%, transparent)"}
              onBlur={(e) => e.target.style.borderColor = "color-mix(in srgb, var(--th-border) 50%, transparent)"}
            />
            <button 
              onClick={handleSend}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center hover:scale-105 transition-transform"
              style={{ background: "var(--th-accent)", color: "var(--th-accent-text)" }}
            >
              <Icon name="send" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
