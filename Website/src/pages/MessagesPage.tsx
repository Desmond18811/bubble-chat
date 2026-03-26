import { useState } from "react";
import Sidebar from "@/components/Sidebar";


/* ─── avatar URLs ─────────────────────────────────────────────────────────── */
const AVATARS = {
  logo: "https://lh3.googleusercontent.com/aida-public/AB6AXuCKYLjdusC4Ja8-3B-a4YZbpc7YUCE2Q0xHcpy_2WgWFKkdsP446_h4mfESNI3DsyJkQSVNPgnA4M_SL2pZPYRylF-Q341o7yPjXZhX5eoHWZcbso3MtV5KBs0Liq64881yV5_uxnORLca0EzsXBo9PZhml7ptXRujuCfr9cfZ_pxq_8fdY9V3lKV8yzCyQq6onfMXgeGAEzctCpIOR8WBtztpX_0r7JVKVYEHc8w1o0SN5qqudL1gfEXmCZBqMROm23xDnrVF-ilOJ",
  me: "https://lh3.googleusercontent.com/aida-public/AB6AXuAKzzFKBRXwuDS0rd1wDGXzixcUaNgoML-vfE9HxhMGYcMUanM_ez1JL8ZOeQl358hoPBq_Tchy0idkeB_jzJLov4t8pN3P1US2pjVFNCBuNCehWKo3DJTZXkTgCZFhTJ6jAh0gN6NyhyGATigtTHae8-ZfCKXYNk0xNJgQEduy5pXuoA4fmlIFVMjJhECCPC4AWDhqUHdZfULwZUBV623LEuzAWQUVhCA01coQQSp1uOv_BuKcdvrtlCRJpMB2mHaePBetGgH47Ip0",
  lyra: "https://lh3.googleusercontent.com/aida-public/AB6AXuB3IG0INCCUOTtaEMdlX3G-NHTAILkrVJAAD4M-IsuRQZfavGmKb31jSaTazakel4kjvmben28jIBu49sqWDZpH6NI4CH4LZaeeJnjrL7tuhGDWvRGsPMrkvcLoltNeXEoJN22At-J9cP5V0znRGWt2snK-OU5KO_uHqvVygtPi5o508pmuuxoauGMHd1JXYtoBBzmuZlTL5S3lBQOvuKO_MMdgna5YHBdaHyxY9JKigwKwDYOslfHL2DIm_YZNFPnzTmBSjk_7Bmax",
  lyraLg: "https://lh3.googleusercontent.com/aida-public/AB6AXuAe7AZRRPcJuj_rq95gil7RKtyU0W-n4Mp6r6OpYZzMCU3mtLCxJ4WojtSMJTaJb3jYqC5SPjjyFuDpm9btTLHws4-xYH7sb0q3rr8DHFILqgc1QEaIRjecgKuaWk9ero6XdhDl0SqpLB0fdWPJ_cBQfMrYRvpyp54u3SyJ0_HHK8fmauvvt1nl_lZMQq7UhUNlmc2yvYg5Ckqblx1qvp_mZjm59wm0yrRng92Hm5k3YvFfxmdlkmXPH7315UnvCEe_1tODKQEcRbzs",
  nova: "https://lh3.googleusercontent.com/aida-public/AB6AXuCvXZWxPQizQcGq36EfSrqAu1wWIVXA_au6pp2MLF-KFrQ8gjbm3n93gVXr1BCJGqknaHmpgkMqPmEMiHmG42lC4XsnAhkF4R0Nz1D4JFBMVDySIpuKEkWFm3jOndLXJccuDTjGgYIO4oKwnofb8LZVTE8XyFFWyxvrXYj56CNpmGa23My86yfXfsAndZBgHt7IhcuBXBRYezOiyuuBAqAFpaGwuUH9EuEzxTu0vYBUokzHdfjd2TmYe7oe7QTO0IbmvniwaVaE08uS",
  orion: "https://lh3.googleusercontent.com/aida-public/AB6AXuCMZwKpAA244dHeZos-QLemNgr_wx3DLwZ2BXmOFfmvSAMxK7AhpUaxbRxVIBwqEv9e0YEt7I6QcTf1WSxUEajoXS4BYwKOYH2rbpwwiudqIz59E5hpsXVbHn_fMUQCtavXSEOutoNHkvAgBuYFsMZzmdEae4run47DJhIMDDNRw59pqxVgt3pfroRsuTOwmHL5RAqGwZ4Nq1pBVIh1PI9hsRGahTR7HKl2Wl04icSBxgcyvFO4jAMIlNOcNlzkG2AerJiKqk7-yfMa",
  cassian: "https://lh3.googleusercontent.com/aida-public/AB6AXuCrLm_RGytKTRAhj1cP9pbE-lf5GHcLS282Y2FJAAZ93PWkgTF8TDLAUNHavUjyr8T7iyP2ZXpNRckWEeLMf59CgH_-3qw6mqD-BT6PV3oDgUC40ky-qOh8aYGi68KqVJZhLvVq1u1O3T3nlVim4R1tdAGalcUuZnTTRFtLdOsz3QUq4z4o2MuAsb5n-lEIUJfAizTRq3l6635O7zJt60VMNdoPEhiVB86rjQOtU25t_rxwyf3_kua3Q1L_OeWPXwHOneSXEaqaLf0z",
  elowen: "https://lh3.googleusercontent.com/aida-public/AB6AXuClR7vFUGYup_SlaEXlI4bPwVWYFeSk11nmKqkLOud2c1r_ZIKyPKQNnoMmD25r2trH_RIFfpMZ93RRlGHbAugWHqrX49eyjvK4jMQ1Z8-Gv-fCCM4iBfXuftBvVxO1Sd1qGmQzUdFb_3AvatarfCCM4iBfXuftBvVxO1Sd1qGmQzUdFb_3AvatarfCCM4iBfXuftBvVxO1Sd1qGmQzUdFb_3Avatar",
  chart: "https://lh3.googleusercontent.com/aida-public/AB6AXuC5XrzP8IVI43-Gx2MDN5YmvdlZzfy9eWAj2WIt-kYNWj50NRgeWteA6LweJtcig4swQFYhLDYSKzNH9EaLxZNCDPxiT6RKMMNzi3V-Q9AlNrH3UVy6Y2dg3aTmLz7gIbbXWR_xxJ97-rdBiCXntaW06P_ZEcIZAzp1REHZlvEyEbK1l6RpnizvFlQOdIyp4kaERMGBaGGvU3qvvc6iwCDwVSVWIIk69CYfu4nyoqjGVFrIHbW9o3xoN9tuBqdaF4JNTRojfHd1gV1A",
  lyraMsg: "https://lh3.googleusercontent.com/aida-public/AB6AXuAZh-U7vBjM1YXSsL3MXoI5x6DPMwDmbgrxGL4_X7tWszaJu62pBdXiV3NMmNg8kxEt1rc-YVdIiV21J1ACkgnTrAUOakJp5cyaCiTBoCiHId9vF3kPf5bMp93m36zS-v3JwKLckYhqnfuGW9kn0BoEJOumVlNIy_D5TZUGw1L3-pUCN0WNSL9vAV5D9mscV3_7KAU_wejRFC2SHemSZJDLuj3SqD3KMcE_ncWfgbfTQ84fXbGHLloDeNP6s8XQAGK2HwMTbGGlITCm",
  meMsg: "https://lh3.googleusercontent.com/aida-public/AB6AXuDt8tBqKkROGSHUVOfTBWSM_yok5NqDVFC1SxALu6VDxqZiDxdU91Rb8zW16CKUA-CV6AZgJHDDPkMwTNyVImKZFa4w5z9noHOlkXyE-oTN48jWwoFZqcMTtFTFptrYLKmcaV2dFzguDSlW99e5sL6d0zuPiGCks7dVoipGy17pjn9TzRL_h0ij_KnAVwCiJ3U_xE3TlbHpI27hjWM0AtKWxMZmp_gs37YLeg4BBu0pD15eMlLHAQ63oTbXVcYaFXSjQLMIs9obpCAY",
  lyraHdr: "https://lh3.googleusercontent.com/aida-public/AB6AXuBiAGpeVONt9sBfOBViAhwd4IvdGxe2k0Pn_RScBLB337XtBbA_wblvlhygNZEWuOkejhOdgAZ-fH-G2AiVfWXCTOB0_KIJoHDTjPY_GVei59gJVjP2jVDyZT6GB_zNBCYNYMNOkq0gjqPN-yTrCfiyhppztlcHV85TB7MdGQ6yewNMhKngxewog7n1Nh_K0xAzKgfqI9W-3k7mo3ird54Xe-j__mXGe86o43Oo1oh0qfhIrDAfE7xEaE_FXR6ekrpz-4WJr5NNR34r",
};

/* ─── data ────────────────────────────────────────────────────────────────── */
const NAV_ITEMS = [
  { icon: "chat", label: "Chats", fill: true, active: true },
  { icon: "work", label: "Work", fill: false, active: false },
  { icon: "video_chat", label: "Meet", fill: false, active: false },
  { icon: "groups", label: "Community", fill: false, active: false },
  { icon: "rss_feed", label: "Feed", fill: false, active: false },
];

const STORIES = [
  { label: "Your Story", img: null, isAdd: true },
  { label: "Nova", img: AVATARS.nova, isAdd: false },
  { label: "Orion", img: AVATARS.orion, isAdd: false },
];

const CONVERSATIONS = [
  { name: "Lyra Belacqua", time: "12:45", preview: "The coordinates for the nebula are updated.", img: AVATARS.lyra, online: true, active: true, dot: "gold" },
  { name: "Cassian Thorne", time: "2h ago", preview: "Did you receive the encrypted logs?", img: AVATARS.cassian, online: false, active: false, dot: "grey" },
  { name: "Fleet Operations", time: "5h ago", preview: "Systems check completed. All green.", img: null, online: false, active: false, dot: null },
  { name: "Elowen Stark", time: "Yesterday", preview: "The bubble shield is holding steady.", img: AVATARS.elowen, online: true, active: false, dot: "gold" },
];

const MESSAGES = [
  { id: 1, from: "lyra", avatar: AVATARS.lyraMsg, text: "Hey! I've just updated the orbital trajectory for the BUBBLE observatory. We should have clear line-of-sight for the next 48 hours.", time: "12:30 PM" },
  { id: 2, from: "me", avatar: AVATARS.meMsg, text: "Excellent work, Lyra. Did you account for the solar wind fluctuations in the sector?", time: "12:35 PM" },
  { id: 3, from: "lyra", avatar: AVATARS.lyraMsg, text: "The coordinates for the nebula are updated. Check this chart.", time: "12:45 PM", chart: AVATARS.chart },
];

const ARTIFACTS = [
  { icon: "description", color: "#ffe792", name: "nebula-map-v2.dat", meta: "4.2 MB • 2h ago" },
  { icon: "image", color: "#a2c2fd", name: "observation_log.png", meta: "12 MB • Yesterday" },
  { icon: "video_file", color: "#fff7d0", name: "sector_7_pan.mp4", meta: "158 MB • 3d ago" },
];

const LINKS = ["bubble-net.io", "starmap.internal", "obsidian.vault"];

/* ─── tiny helpers ────────────────────────────────────────────────────────── */
const Icon = ({ name, fill = false, className = "", style = {} }) => (
  <span
    className={`material-symbols-outlined ${className}`}
    style={{ fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`, ...style }}
  >
    {name}
  </span>
);

/* ─── sub-components ──────────────────────────────────────────────────────── */



function ChatList() {
  return (
    <section style={{
      width: 384, display: "flex", flexDirection: "column",
      borderRight: "1px solid rgba(59,73,92,0.15)", background: "#031427", flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{ padding: "32px 32px 16px" }}>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 30, fontWeight: 700, color: "#ffe792", margin: "0 0 24px", letterSpacing: "-0.02em" }}>
          Messages
        </h1>
        <div style={{ position: "relative", marginBottom: 24 }}>
          <Icon name="search" style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", fontSize: 18, color: "#9eacc3" }} />
          <input placeholder="Search transmissions..." style={{
            width: "100%", background: "#11273f", border: "none", borderRadius: 12,
            padding: "12px 16px 12px 44px", fontSize: 14, color: "#d8e6ff",
            outline: "none", fontFamily: "'Manrope',sans-serif", boxSizing: "border-box",
          }} />
        </div>

        {/* Stories */}
        <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 8 }}>
          {STORIES.map(({ label, img, isAdd }) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flexShrink: 0, cursor: "pointer" }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%", padding: 2,
                border: `2px solid ${isAdd ? "#ffe792" : (img ? "#ffe792" : "rgba(162,194,253,0.3)")}`,
                boxShadow: img && !isAdd ? "0 0 10px rgba(255,231,146,0.2)" : "none",
              }}>
                {isAdd ? (
                  <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "#071a2f", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name="add" style={{ color: "#ffe792" }} />
                  </div>
                ) : (
                  <img src={img} alt={label} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                )}
              </div>
              <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#9eacc3" }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Conversation list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px" }}>
        {CONVERSATIONS.map((c, i) => (
          <div key={i} style={{
            padding: 16, borderRadius: 12, cursor: "pointer", marginBottom: 4,
            background: c.active ? "rgba(17,39,63,0.4)" : "transparent",
            border: c.active ? "1px solid rgba(255,231,146,0.1)" : "1px solid transparent",
            backdropFilter: c.active ? "blur(24px)" : "none",
            boxShadow: c.active ? "0 0 20px rgba(255,231,146,0.05)" : "none",
            transition: "background 0.2s",
          }}>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                {c.img ? (
                  <img src={c.img} alt={c.name} style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#24477a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name="rocket_launch" style={{ color: "#a2c2fd" }} />
                  </div>
                )}
                {c.dot && (
                  <div style={{
                    position: "absolute", bottom: 0, right: 0, width: 12, height: 12,
                    borderRadius: "50%", border: "2px solid #031427",
                    background: c.dot === "gold" ? "#ffe792" : "#68768b",
                    boxShadow: c.dot === "gold" ? "0 0 5px #ffe792" : "none",
                  }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, color: c.active ? "#d8e6ff" : "#9eacc3", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.name}
                  </span>
                  <span style={{ fontSize: 10, color: c.active ? "#ffe792" : "rgba(158,172,195,0.4)", fontWeight: 500, flexShrink: 0, marginLeft: 8 }}>
                    {c.time}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: c.active ? "#ffe792" : "#9eacc3", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: c.active ? 500 : 400 }}>
                  {c.preview}
                </p>
              </div>
              {c.active && (
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ffe792", boxShadow: "0 0 8px #ffe792", flexShrink: 0 }} />
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MessageThread() {
  const [input, setInput] = useState("");

  return (
    <section style={{ flex: 1, display: "flex", flexDirection: "column", background: "#010f20", minWidth: 0 }}>
      {/* Header */}
      <header style={{
        height: 80, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 32px", background: "rgba(17,39,63,0.4)", backdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(59,73,92,0.15)", flexShrink: 0, zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", padding: 2, background: "#ffd709" }}>
            <img src={AVATARS.lyraHdr} alt="Lyra" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
          </div>
          <div>
            <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, color: "#d8e6ff", margin: 0, fontSize: 18, lineHeight: 1 }}>
              Lyra Belacqua
            </h2>
            <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: "#ffe792" }}>
              Transmitting Live
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          {["videocam", "call", "more_vert"].map(name => (
            <button key={name} style={{ background: "none", border: "none", cursor: "pointer", color: "#a2c2fd", transition: "color 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.color = "#ffe792"}
              onMouseLeave={e => e.currentTarget.style.color = "#a2c2fd"}
            >
              <Icon name={name} style={{ fontSize: 24 }} />
            </button>
          ))}
        </div>
      </header>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: 32, display: "flex", flexDirection: "column", gap: 32 }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <span style={{
            fontFamily: "'Space Grotesk',sans-serif", fontSize: 10, textTransform: "uppercase",
            letterSpacing: "0.2em", color: "rgba(158,172,195,0.4)",
            padding: "4px 16px", borderRadius: 999, border: "1px solid rgba(59,73,92,0.3)",
          }}>
            Today, Cycle 402
          </span>
        </div>

        {MESSAGES.map(msg => {
          const isMe = msg.from === "me";
          return (
            <div key={msg.id} style={{ display: "flex", gap: 16, maxWidth: 560, flexDirection: isMe ? "row-reverse" : "row", marginLeft: isMe ? "auto" : 0 }}>
              <img src={msg.avatar} alt={msg.from} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0, marginTop: 4 }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: isMe ? "flex-end" : "flex-start" }}>
                <div style={{
                  background: isMe ? "#ffe792" : "#071a2f",
                  color: isMe ? "#655400" : "#d8e6ff",
                  padding: 16, borderRadius: 16,
                  borderTopLeftRadius: isMe ? 16 : 4,
                  borderTopRightRadius: isMe ? 4 : 16,
                  fontFamily: "'Manrope',sans-serif", fontSize: 14, lineHeight: 1.6,
                  border: isMe ? "none" : "1px solid rgba(59,73,92,0.1)",
                  boxShadow: isMe ? "0 4px 20px rgba(255,231,146,0.2)" : "0 4px 20px rgba(0,0,0,0.3)",
                }}>
                  {msg.text}
                  {msg.chart && (
                    <div style={{ marginTop: 12, borderRadius: 8, overflow: "hidden", border: "1px solid rgba(59,73,92,0.2)" }}>
                      <img src={msg.chart} alt="Chart" style={{ width: "100%", height: 192, objectFit: "cover", opacity: 0.8, display: "block" }} />
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "0 4px" }}>
                  <span style={{ fontSize: 10, color: "#9eacc3" }}>{msg.time}</span>
                  {isMe && <Icon name="done_all" style={{ fontSize: 12, color: "#ffe792" }} />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <footer style={{ padding: "0 32px 32px", flexShrink: 0 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 16,
          background: "rgba(17,39,63,0.4)", backdropFilter: "blur(24px)",
          borderRadius: 16, padding: 8,
          border: "1px solid rgba(59,73,92,0.2)", boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        }}>
          <button style={{ width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "#9eacc3", transition: "color 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.color = "#ffe792"}
            onMouseLeave={e => e.currentTarget.style.color = "#9eacc3"}
          >
            <Icon name="add_circle" style={{ fontSize: 24 }} />
          </button>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type a message into the void..."
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#d8e6ff", fontFamily: "'Manrope',sans-serif", fontSize: 14 }}
          />
          <button style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "#9eacc3", transition: "color 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.color = "#ffe792"}
            onMouseLeave={e => e.currentTarget.style.color = "#9eacc3"}
          >
            <Icon name="mood" style={{ fontSize: 24 }} />
          </button>
          <button style={{
            width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
            background: "#ffe792", border: "none", borderRadius: 12, cursor: "pointer",
            boxShadow: "0 0 15px rgba(255,231,146,0.3)", transition: "transform 0.1s",
            color: "#655400",
          }}
            onMouseDown={e => e.currentTarget.style.transform = "scale(0.9)"}
            onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
          >
            <Icon name="send" style={{ fontSize: 20 }} />
          </button>
        </div>
      </footer>
    </section>
  );
}

function ProfilePanel() {
  return (
    <section style={{
      width: 420, background: "#031427", borderLeft: "1px solid rgba(59,73,92,0.15)",
      display: "flex", flexDirection: "column", overflowY: "auto", padding: 32, flexShrink: 0,
    }}>
      {/* Avatar + name */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 40 }}>
        <div style={{ width: 128, height: 128, borderRadius: "50%", padding: 4, border: "2px solid #ffe792", boxShadow: "0 0 30px rgba(255,231,146,0.1)", marginBottom: 24 }}>
          <img src={AVATARS.lyraLg} alt="Lyra" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
        </div>
        <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, color: "#d8e6ff", fontSize: 24, margin: "0 0 4px" }}>
          Lyra Belacqua
        </h2>
        <p style={{ fontFamily: "'Manrope',sans-serif", color: "#9eacc3", fontSize: 14, margin: 0 }}>
          Lead Astrophysicist @ BubbleLab
        </p>
        <div style={{ display: "flex", gap: 16, marginTop: 24 }}>
          {["notifications", "favorite", "share"].map(name => (
            <button key={name} style={{
              width: 40, height: 40, borderRadius: "50%", background: "#071a2f",
              border: "1px solid rgba(59,73,92,0.2)", display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#a2c2fd", transition: "color 0.2s",
            }}
              onMouseEnter={e => e.currentTarget.style.color = "#ffe792"}
              onMouseLeave={e => e.currentTarget.style.color = "#a2c2fd"}
            >
              <Icon name={name} style={{ fontSize: 20 }} />
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        {/* Bio */}
        <div>
          <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(158,172,195,0.6)", marginBottom: 16 }}>Bio</h3>
          <p style={{ fontFamily: "'Manrope',sans-serif", color: "#d8e6ff", fontSize: 14, lineHeight: 1.7, margin: 0 }}>
            Scanning the unknown from the Luminous Observatory. Passionate about deep-space anomalies and coffee.
          </p>
        </div>

        {/* Artifacts */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(158,172,195,0.6)", margin: 0 }}>Shared Artifacts</h3>
            <button style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 10, color: "#ffe792", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", background: "none", border: "none", cursor: "pointer" }}>
              View All
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {ARTIFACTS.map((a, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 16, padding: 12, borderRadius: 12,
                background: "rgba(7,26,47,0.5)", border: "1px solid rgba(59,73,92,0.1)", cursor: "pointer",
                transition: "border-color 0.2s",
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(255,231,146,0.2)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(59,73,92,0.1)"}
              >
                <div style={{ width: 48, height: 48, borderRadius: 8, background: "#11273f", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon name={a.icon} style={{ color: a.color, fontSize: 22 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 500, color: "#d8e6ff", fontSize: 14, margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</p>
                  <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 10, color: "#9eacc3", textTransform: "uppercase" }}>{a.meta}</span>
                </div>
                <button style={{ background: "none", border: "none", cursor: "pointer", color: "#9eacc3", transition: "color 0.2s", flexShrink: 0 }}
                  onMouseEnter={e => e.currentTarget.style.color = "#ffe792"}
                  onMouseLeave={e => e.currentTarget.style.color = "#9eacc3"}
                >
                  <Icon name="download" style={{ fontSize: 20 }} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* System Links */}
        <div>
          <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(158,172,195,0.6)", marginBottom: 16 }}>System Links</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {LINKS.map(link => (
              <span key={link} style={{
                padding: "4px 12px", background: "#11273f", color: "#d8e6ff", fontSize: 12,
                borderRadius: 999, border: "1px solid rgba(59,73,92,0.2)", fontFamily: "'Manrope',sans-serif",
              }}>
                {link}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Block button */}
      <div style={{ marginTop: "auto", paddingTop: 40 }}>
        <button style={{
          width: "100%", padding: 16, background: "rgba(159,5,25,0.1)",
          border: "1px solid rgba(255,113,108,0.2)", borderRadius: 12,
          color: "#ff716c", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700,
          fontSize: 12, textTransform: "uppercase", letterSpacing: "0.15em", cursor: "pointer",
          transition: "background 0.2s",
        }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(159,5,25,0.2)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(159,5,25,0.1)"}
        >
          Block Frequency
        </button>
      </div>
    </section>
  );
}

/* ─── root ────────────────────────────────────────────────────────────────── */
export default function BubbleMessages() {
  return (
    <>
      {/* Google Fonts */}
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
          <ChatList />
          <MessageThread />
          <ProfilePanel />
        </main>
      </div>
    </>
  );
}