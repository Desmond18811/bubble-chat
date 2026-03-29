import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import * as api from "@/api";
import { initiateSocket, getSocket } from "@/lib/socket-client";
import { toast } from "sonner";

/* ─── avatar URLs ─────────────────────────────────────────────────────────── */
const AVATARS = {
  logo: "https://lh3.googleusercontent.com/aida-public/AB6AXuCKYLjdusC4Ja8-3B-a4YZbpc7YUCE2Q0xHcpy_2WgWFKkdsP446_h4mfESNI3DsyJkQSVNPgnA4M_SL2pZPYRylF-Q341o7yPjXZhX5eoHWZcbso3MtV5KBs0Liq64881yV5_uxnORLca0EzsXBo9PZhml7ptXRujuCfr9cfZ_pxq_8fdY9V3lKV8yzCyQq6onfMXgeGAEzctCpIOR8WBtztpX_0r7JVKVYEHc8w1o0SN5qqudL1gfEXmCZBqMROm23xDnrVF-ilOJ",
  me: "https://lh3.googleusercontent.com/aida-public/AB6AXuAKzzFKBRXwuDS0rd1wDGXzixcUaNgoML-vfE9HxhMGYcMUanM_ez1JL8ZOeQl358hoPBq_Tchy0idkeB_jzJLov4t8pN3P1US2pjVFNCBuNCehWKo3DJTZXkTgCZFhTJ6jAh0gN6NyhyGATigtTHae8-ZfCKXYNk0xNJgQEduy5pXuoA4fmlIFVMjJhECCPC4AWDhqUHdZfULwZUBV623LEuzAWQUVhCA01coQQSp1uOv_BuKcdvrtlCRJpMB2mHaePBetGgH47Ip0",
  lyra: "https://lh3.googleusercontent.com/aida-public/AB6AXuB3IG0INCCUOTtaEMdlX3G-NHTAILkrVJAAD4M-IsuRQZfavGmKb31jSaTazakel4kjvmben28jIBu49sqWDZpH6NI4CH4LZaeeJnjrL7tuhGDWvRGsPMrkvcLoltNeXEoJN22At-J9cP5V0znRGWt2snK-OU5KO_uHqvVygtPi5o508pmuuxoauGMHd1JXYtoBBzmuZlTL5S3lBQOvuKO_MMdgna5YHBdaHyxY9JKigwKwDYOslfHL2DIm_YZNFPnzTmBSjk_7Bmax",
  lyraLg: "https://lh3.googleusercontent.com/aida-public/AB6AXuAe7AZRRPcJuj_rq95gil7RKtyU0W-n4Mp6r6OpYZzMCU3mtLCxJ4WojtSMJTaJb3jYqC5SPjjyFuDpm9btTLHws4-xYH7sb0q3rr8DHFILqgc1QEaIRjecgKuaWk9ero6XdhDl0SqpLB0fdWPJ_cBQfMrYRvpyp54u3SyJ0_HHK8fmauvvt1nl_lZMQq7UhUNlmc2yvYg5Ckqblx1qvp_mZjm59wm0yrRng92Hm5k3YvFfxmdlkmXPH7315UnvCEe_1tODKQEcRbzs",
  chart: "https://lh3.googleusercontent.com/aida-public/AB6AXuC5XrzP8IVI43-Gx2MDN5YmvdlZzfy9eWAj2WIt-kYNWj50NRgeWteA6LweJtcig4swQFYhLDYSKzNH9EaLxZNCDPxiT6RKMMNzi3V-Q9AlNrH3UVy6Y2dg3aTmLz7gIbbXWR_xxJ97-rdBiCXntaW06P_ZEcIZAzp1REHZlvEyEbK1l6RpnizvFlQOdIyp4kaERMGBaGGvU3qvvc6iwCDwVSVWIIk69CYfu4nyoqjGVFrIHbW9o3xoN9tuBqdaF4JNTRojfHd1gV1A",
};

/* ─── tiny helpers ────────────────────────────────────────────────────────── */
const Icon = ({ name, fill = false, className = "", style = {} }: any) => (
  <span
    className={`material-symbols-outlined ${className}`}
    style={{ fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`, ...style }}
  >
    {name}
  </span>
);

export default function BubbleMessages() {
  const [chats, setChats] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Initial data fetch
    const loadInitialData = async () => {
      try {
        const [fetchedChats, fetchedStories] = await Promise.all([
          api.fetchAllUserChats(),
          api.fetchStories()
        ]);
        setChats(fetchedChats);
        setStories(fetchedStories);
        
        // Initiate socket with real token
        const token = localStorage.getItem('token');
        if (token) initiateSocket(token);
        
        const socket = getSocket();
        socket?.on('receive_message', (payload: any) => {
          if (activeChat && payload.chat === activeChat._id) {
            setMessages(prev => [...prev, payload]);
          }
          // Optionally update chat preview in list
        });

      } catch (error) {
        console.error("Data load failed:", error);
      }
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    if (activeChat) {
      loadMessages(activeChat._id);
    }
  }, [activeChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadMessages = async (chatId: string) => {
    try {
      const fetchedMessages = await api.fetchMessages(chatId);
      setMessages(fetchedMessages);
    } catch (error) {
      console.error("Message load failed:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !activeChat) return;
    try {
      const sentMessage = await api.sendTextMessage(activeChat._id, inputText);
      setMessages(prev => [...prev, sentMessage]);
      setInputText("");
    } catch (err) {
      toast.error("Failed to send message");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChat) return;
    try {
      toast.info("Uploading high-quality media...");
      const sentMessage = await api.sendMediaMessage(activeChat._id, file);
      setMessages(prev => [...prev, sentMessage]);
    } catch (err) {
      toast.error("Upload failed or insecure file detected");
    }
  };

  const handleStoryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      toast.success("Uploading story...");
      const newStory = await api.uploadStory(file);
      setStories(prev => [newStory, ...prev]);
    } catch (err) {
      toast.error("Story upload failed");
    }
  };

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Manrope:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #010f20; }
        .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(162,194,253,0.1); border-radius: 10px; }
        input::placeholder { color: rgba(158,172,195,0.4); }
      `}</style>

      <div style={{ display: "flex", minHeight: "100vh", background: "#010f20", color: "#d8e6ff", fontFamily: "'Manrope', sans-serif", overflow: "hidden" }}>
        <Sidebar />
        <main style={{ marginLeft: 96, flex: 1, display: "flex", height: "100vh", overflow: "hidden" }}>
          
          {/* Chat List */}
          <section style={{ width: 384, display: "flex", flexDirection: "column", borderRight: "1px solid rgba(59,73,92,0.15)", background: "#031427", flexShrink: 0 }}>
            <div style={{ padding: "32px 32px 16px" }}>
              <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 30, fontWeight: 700, color: "#ffe792", margin: "0 0 24px", letterSpacing: "-0.02em" }}>Messages</h1>
              <div style={{ position: "relative", marginBottom: 24 }}>
                <Icon name="search" style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", fontSize: 18, color: "#9eacc3" }} />
                <input placeholder="Search transmissions..." style={{ width: "100%", background: "#11273f", border: "none", borderRadius: 12, padding: "12px 16px 12px 44px", fontSize: 14, color: "#d8e6ff", outline: "none", boxSizing: "border-box" }} />
              </div>
              {/* Stories */}
              <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 8 }}>
                <label style={{ cursor: "pointer" }}>
                  <input type="file" hidden onChange={handleStoryUpload} accept="image/*,video/*,audio/*" />
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <div style={{ width: 56, height: 56, borderRadius: "50%", padding: 2, border: "2px solid #ffe792" }}>
                      <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "#071a2f", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon name="add" style={{ color: "#ffe792" }} />
                      </div>
                    </div>
                    <span style={{ fontSize: 10, textTransform: "uppercase", color: "#9eacc3" }}>Story</span>
                  </div>
                </label>
                {stories.map((story, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <div style={{ width: 56, height: 56, borderRadius: "50%", padding: 2, border: "2px solid #ffe792" }}>
                      <img src={story.author?.avatar || AVATARS.lyra} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                    </div>
                    <span style={{ fontSize: 10, textTransform: "uppercase", color: "#9eacc3" }}>{story.author?.name?.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Conversations */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0 16px" }}>
              {chats.map((c: any) => (
                <div key={c._id} onClick={() => setActiveChat(c)} style={{ padding: 16, borderRadius: 12, cursor: "pointer", marginBottom: 4, background: activeChat?._id === c._id ? "rgba(11,39,63,0.4)" : "transparent" }}>
                  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <div style={{ position: "relative" }}>
                      <img src={c.users[0]?.avatar || AVATARS.lyra} style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover" }} />
                      <div style={{ position: "absolute", bottom: 0, right: 0, width: 12, height: 12, borderRadius: "50%", border: "2px solid #031427", background: c.users[0]?.isOnline ? "#ffe792" : "#68768b" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, color: "#d8e6ff", fontSize: 14 }}>{c.chatName === 'sender' ? c.users[0]?.name : c.chatName}</p>
                      <p style={{ fontSize: 13, color: "#9eacc3", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.latestMessage?.content || "No messages yet"}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Message Thread */}
          <section style={{ flex: 1, display: "flex", flexDirection: "column", background: "#010f20", minWidth: 0 }}>
            <header style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", background: "rgba(11,39,63,0.4)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(59,73,92,0.15)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <img src={activeChat?.users[0]?.avatar || AVATARS.lyra} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", border: "2px solid #ffd709" }} />
                <div>
                   <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{activeChat?.users[0]?.name || "Select a chat"}</h2>
                   <span style={{ fontSize: 10, textTransform: "uppercase", color: "#ffe792" }}>{activeChat?.users[0]?.isOnline ? "Transmitting Live" : "Offline"}</span>
                </div>
              </div>
            </header>
            <div style={{ flex: 1, overflowY: "auto", padding: 32, display: "flex", flexDirection: "column", gap: 32 }}>
              {messages.map((msg: any) => (
                <div key={msg._id} style={{ display: "flex", gap: 16, maxWidth: 560, marginLeft: msg.sender?._id === "me_placeholder" ? "auto" : 0 }}>
                   <div style={{ background: "#071a2f", padding: 16, borderRadius: 16 }}>
                     {msg.content}
                     {msg.mediaUrl && (
                       <div style={{ marginTop: 12 }}>
                         {msg.mediaType === 'image' && <img src={msg.mediaUrl} style={{ width: '100%', borderRadius: 8 }} />}
                         {msg.mediaType === 'video' && <video src={msg.mediaUrl} controls style={{ width: '100%', borderRadius: 8 }} />}
                         {msg.mediaType === 'voice' && <audio src={msg.mediaUrl} controls style={{ width: '100%' }} />}
                       </div>
                     )}
                   </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <footer style={{ padding: "0 32px 32px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, background: "rgba(11,39,63,0.4)", borderRadius: 16, padding: 8 }}>
                <button onClick={() => fileInputRef.current?.click()} style={{ background: "none", border: "none", cursor: "pointer" }}><Icon name="add_circle" /></button>
                <input type="file" ref={fileInputRef} hidden onChange={handleFileUpload} />
                <input value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} placeholder="Type a message..." style={{ flex: 1, background: "transparent", border: "none", color: "#d8e6ff", outline: "none" }} />
                <button onClick={handleSendMessage} style={{ background: "#ffe792", border: "none", borderRadius: 12, padding: "8px 16px" }}><Icon name="send" /></button>
              </div>
            </footer>
          </section>

          {/* Profile Sidebar */}
          <section style={{ width: 420, background: "#031427", borderLeft: "1px solid rgba(59,73,92,0.15)", display: "flex", flexDirection: "column", padding: 32 }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <img src={activeChat?.users[0]?.avatar || AVATARS.lyraLg} style={{ width: 128, height: 128, borderRadius: "50%", border: "2px solid #ffe792", margin: "0 auto 24px" }} />
              <h2>{activeChat?.users[0]?.name || "Lyra Belacqua"}</h2>
              <p style={{ color: "#9eacc3" }}>{activeChat?.users[0]?.bio || "No status set"}</p>
            </div>
          </section>

        </main>
      </div>
    </>
  );
}