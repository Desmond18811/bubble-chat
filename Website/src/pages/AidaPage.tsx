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
    <div className="bg-[#010f20] text-[#d8e6ff] min-h-screen flex font-['Manrope']">
      {/* Global styles now handled in index.css */}
      
      <Sidebar />
      
      <main className="ml-[85px] flex-1 flex flex-col h-screen relative overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#ffe792]/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#a2c2fd]/5 blur-[120px] rounded-full pointer-events-none" />

        <header className="h-20 shrink-0 px-10 flex items-center justify-between border-b border-[#3b495c]/10 bg-[#010f20]/60 backdrop-blur-xl relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ffe792]/10 flex items-center justify-center border border-[#ffe792]/20">
              <Icon name="smart_toy" className="text-[#ffe792]" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Aida AI
              </h1>
              <p className="text-[10px] text-[#9eacc3] uppercase tracking-widest font-bold">
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
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                  msg.role === "assistant" 
                    ? "bg-[#ffe792]/10 border-[#ffe792]/20 text-[#ffe792]" 
                    : "bg-[#11273f] border-[#3b495c]/30 text-[#a2c2fd]"
                )}>
                  <Icon name={msg.role === "assistant" ? "smart_toy" : "person"} />
                </div>
                <div className={cn(
                  "px-6 py-4 rounded-2xl max-w-[80%] text-sm leading-relaxed",
                  msg.role === "assistant"
                    ? "bg-[#11273f]/40 text-[#d8e6ff] border border-[#3b495c]/10"
                    : "bg-[#ffe792] text-[#010f20] font-medium"
                )}>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-8 shrink-0 relative z-10">
          <div className="max-w-3xl mx-auto relative group">
            <input 
              className="w-full bg-[#031427]/80 border border-[#3b495c]/30 rounded-2xl py-4 pl-6 pr-16 text-[#d8e6ff] outline-none focus:border-[#ffe792]/50 transition-all backdrop-blur-md"
              placeholder="Transmit a message to Aida..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
            />
            <button 
              onClick={handleSend}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#ffe792] text-[#010f20] rounded-xl flex items-center justify-center hover:scale-105 transition-transform"
            >
              <Icon name="send" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
