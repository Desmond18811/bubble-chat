import { useState } from "react";
import Sidebar from "@/components/Sidebar";


/* ─── Icon helper ─────────────────────────────────────────────────────────── */
const Icon = ({ name, fill = false, className = "", style = {} }) => (
  <span
    className={`material-symbols-outlined ${className}`}
    style={{ fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`, lineHeight: 1, ...style }}
  >
    {name}
  </span>
);

/* ─── Data ────────────────────────────────────────────────────────────────── */
const NAV_ITEMS = [
  { icon: "chat", label: "Chats" },
  { icon: "work", label: "Work" },
  { icon: "video_chat", label: "Meet" },
  { icon: "groups", label: "Community" },
  { icon: "rss_feed", label: "Feed", active: true },
  { icon: "bookmark", label: "Saved" },
  { icon: "calendar_today", label: "Calendar" },
  { icon: "payments", label: "Payments" },
];

const POSTS = [
  {
    id: 1,
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuDYShZzDa2WEdztxRJWYYF6ruxKmasbWYUKfOp-2ZCWlD7Rbf06rgQq4Sm-DTadQG80lzljoZOFPwUln5F1jXCnKTP5ROfjnwsXIFOcMMZbkexrROXUM6lTKjGnaDQL2aerHO0MuHkNR3jUgXnJrPT7WoaHKJeGJT3SpkKNgRi-z-oLJR13PblD73IXdJ6mb5vtj1cmRF0FQCGJR4FJufhNr5Q8PAYrk5JwLgNUMKqyEOuuwy1YAxWprMRhGNNZYCkuyJ4NTJjgx2KK",
    name: "Nova_Loom", handle: "@novaloom", time: "2h",
    text: "Witnessing the convergence of stellar data and architectural rhythm. The new BUBBLE protocol is finally reaching its peak luminosity. #DataAesthetics #Luminous",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCzqvfnYbBQ8PbeCx1W5MGjmUVxe3qFImMvaNh-jfKy0UuYucQ10f0kzAPc__EMbToCTbCIs3dgn33hMYvZDiPLbD6P-3ZPvAABCcC2Oo1gGr2eBQh7azlf-vP__AfZog3icPtk4fk2lA6MnyRjJZw5dko0dNQm1rhe23V8teFCOH6clLdhd2Ndc9DiootlpLvUJylOHJaQcWSucAgdk-b1prH12N-2JwNYUEprKGhqqJ51vaCKZE_haoItp6MBX2ibhnVVOGS9L5Zn",
    stats: { comments: 24, reposts: 12, likes: "1.2k", liked: true },
  },
  {
    id: 2,
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuA-J6lP24ytqcsQ5b04HpmuwoH_WnsvUp1mgU2PkuDqkjT5hFI_B-izTQeBX8XtP-mUMVeh-ZN_dq9BUf-IDI4ycLHSTkB7MLk3nQ89-9M-WXBkHyZHdwJBm7McTKZ_iCINrdu0q_Q4Cexeg0e8ZfoSfl_WF2620ohgi8XOwMvXqRbJYRrnxI72pSlenqgXtSDCIKaoxqPWLMCkBNMC5pGkaQDSUSWUmAIrQFyRDa5hivcVKY_MFHdbmRLj5My6B_56wRKNMBp3BEhz",
    name: "Cortex_Dev", handle: "@cortex_dev", time: "5h",
    text: `"Architecture is the learned game, correct and magnificent, of forms assembled in the light." — But make it digital. The observatory is live.`,
    quote: true,
    stats: { comments: 8, reposts: 42, likes: "389", liked: false },
  },
  {
    id: 3,
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuDnustE43fD0eL2IQgJVpqkULV7RV090WfPb8eo9Rp-EF2qDstJ1fCG477BErsTt7SnflHH3SYSLCeV1Bz5oFSOqUV56e7QdSLkD-3GHzH1ll90Pxz1r5u-sNymsW8szk239S5EHn9UMTqRMsMB4cP3uf326Mj3Wm70V6GOd2rjKvF29VzXSnkwhWUv4le-gWRkyhUCGJU9sMRK6LJeQGoNRHo-Ep6_2XuwMJZynLfJ-oNg5txruMqG8bbAcf1nQggMQgcyKcXJxcOh",
    name: "Aether_Bound", handle: "@aether", time: "8h",
    text: "Mood board for the upcoming Flux event. We're leaning heavily into the obsidian glass aesthetic. Thoughts?",
    images: [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBySKDkS4jVZaL2YkMrDza1AwX5jEdM8bq5db5OGUlo8MnnTQSvUPaZS5RZfN6dIU6wxUg_JdwRCaGmd4iWJalM5scCAvMomHmLq1oxjKoEUd0zztlhT7nf7sUOoRoa8qw80w36Iz6K4vsWorgUhgSNP4b3lURlEdRJ0Hy1ckyJ3-EZuPwKgBjOjHkwo39UpT4T3C3BgVo7bEfWuTX3i5vj0F-wCgec3SZZTQJoBHQRJmjFsBxQyI3FvAq7ATl3syoc9r3S0iRzjn6Y",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBiWUaXP_Z3igewndK0ftjbClmTcBmz32vGqc_T9bbejwmmHOc71zH3i9LzRl_v0Oy5CFP0mBzIGbY14cda2_hG4j4GQABT1LQiyHB0hLBjfuKDCyOmb6b2rVBWR015w1Uw7VO-xsTWPUQ1bcFgdrhSVSnBeKJDDlK3k9foDf40W06NLpHjIn96onixLrtAJQjZHcBGvL_pY5o1FE9EuoKraAdKooDWuJwSQTlP7nfk3fBSqfyNxMnsd7r3l_g1_qN2P5dcivM6sger",
    ],
    stats: { comments: 156, reposts: 98, likes: "4.5k", liked: false },
  },
];

const TRENDING = [
  { tag: "#Crystalline", title: "The Obsidian Protocol", count: "24.5k" },
  { tag: "#DeepObservatory", title: "BubbleWise AI v2.4", count: "18.2k" },
  { tag: "#SpaceGrotesk", title: "Typography Evolution", count: "12.1k" },
  { tag: "#TotalDark", title: "Interface Depth Systems", count: "9.4k" },
];

const SUGGESTED = [
  {
    name: "Vector_Flux", handle: "@vflux",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuC8YiflD0cWu9MsOf9KF6Thc4PEUjBOp7xP-_ioyUEsbV1u9Gl7AXkb_1PjFBRLdwYOnF3o6KnartA8VsPANFU5rYmLJhlt1MJ7jaU2SPV-VdQz3Ut0ZwC9cWlvF4S7dz1RCjP7WMXbleFTXBVDJ4Y6v7vyHrDSr3bvHyTq7zyN-OQDBeFlpd2Hw4wqQ0Zy3iAq9cWeOiv84C1q1LLDEV9gO1T2Uk_TEXknFSnamoCJtUzVK3H7x70G7vLKkhI6PzCbos40lcP7PaxL",
  },
  {
    name: "Zenith_Mind", handle: "@zenith",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuBsra8iDKIYXoEflpvEzjekuhXxws0ya75EJdnExUVrAjvKQfmOweKEjqpREmVdMpo_FSMNP7TVMNQ0qF5eoOFbvUAbbxoCBUeXvDxqtowXnmxkF7lxKtlVuikmCgwEM16zOZAwNNlN0zPk61KfSctNarPWs_azauzy9Z6I6GCQSGul_6bytP8bTyoEs2-WqHULBEMICZGbsMxXxvjO4G1Ph6a-oZ1T9nXLoJNsdu9tsnoFDML3KRobwyeDc_ZdDX-xNewDOQhFeTGm",
  },
];

const ME_AVATAR = "https://lh3.googleusercontent.com/aida-public/AB6AXuCZPMqRZM3V7t_IW5p_Y3sMEQdcwMVbrZCH29wUPBagx61k9rgK9soZ5Ln7feNd2lWbJxDQoPMZYPr63usWDYMTK_Kc3e7-06n2pTxCEiXVNMYznKUFrfCBk9LU9K48MNYRiumXXtZw-ya7BugiEYlZBrT9Rsxac-3CPK2q1Ccz9iH_pkhiD14FEebbNao069ucH3IBUMg16KxA7a6-Zj5RjXUCbfJDouMfq-okenldCGMA7LjMKhiV3t-JgCtjqvryzJNMn1U0xmDO";
const ME_HDR = "https://lh3.googleusercontent.com/aida-public/AB6AXuCey3W_mrj0Cm8njfr3RFDb9RzVS0Ye_umBs5hT7CkfxVV05B2cDgEDLC1Bs_4WWjlE1tAx7zxIzunWV1eTKaskAWaJC8er_pKZZ3D6xZluRXYnojRlCpOtgXOIXsqRA0AOuuEj7mODK653Ry2tvXZNMSfsiUJcezLiz5Jns34N98OP6TyzgVoNuzE5TQ82KcboocZuPN7kuCiajs7Rq5MwlHDDw3z_lZujwDVXzerkxzvt0vbVBaGTt4Q_lH717wKrS4inuDeiHK6Y";

/* ─── colour tokens ───────────────────────────────────────────────────────── */
const C = {
  bg: "#010f20",
  surface: "#071a2f",
  surfaceLow: "#031427",
  surfaceHigh: "#0c2037",
  surfaceTop: "#11273f",
  border: "rgba(59,73,92,0.15)",
  borderSoft: "rgba(59,73,92,0.1)",
  accent: "#ffe792",
  accentDim: "#efc900",
  secondary: "#a2c2fd",
  text: "#d8e6ff",
  muted: "#9eacc3",
  error: "#ff716c",
};



/* ─── TopBar ──────────────────────────────────────────────────────────────── */
function TopBar() {
  return (
    <header style={{
      position: "fixed", top: 0, left: 96, right: 0, height: 80, zIndex: 40,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 32px",
      background: "rgba(1,15,32,0.85)", backdropFilter: "blur(20px)",
      boxShadow: "0 4px 32px rgba(0,0,0,0.5)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 24, color: C.accent, letterSpacing: "-0.04em", margin: 0 }}>
          BUBBLE
        </h1>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: C.surfaceTop, borderRadius: 999,
          padding: "8px 16px", border: `1px solid rgba(59,73,92,0.15)`, width: 384,
        }}>
          <Icon name="search" style={{ color: C.muted, fontSize: 20 }} />
          <input placeholder="Explore the Luminous..." style={{
            background: "transparent", border: "none", outline: "none",
            fontSize: 14, color: C.text, fontFamily: "'Manrope',sans-serif", width: "100%",
          }} />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <div style={{ display: "flex", gap: 16, color: C.secondary }}>
          {["notifications", "help", "settings"].map(name => (
            <button key={name} style={{ background: "none", border: "none", cursor: "pointer", color: C.secondary, transition: "color 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.color = C.accent}
              onMouseLeave={e => e.currentTarget.style.color = C.secondary}
            >
              <Icon name={name} style={{ fontSize: 22 }} />
            </button>
          ))}
        </div>
        <div style={{ width: 40, height: 40, borderRadius: "50%", padding: 2, border: `1px solid rgba(255,231,146,0.2)`, background: C.surfaceHigh }}>
          <img src={ME_HDR} alt="Profile" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
        </div>
      </div>
    </header>
  );
}

/* ─── Composer ────────────────────────────────────────────────────────────── */
function Composer() {
  const [value, setValue] = useState("");
  return (
    <div style={{ background: C.surfaceLow, padding: 24, borderRadius: 12, marginBottom: 48, border: `1px solid rgba(59,73,92,0.05)` }}>
      <div style={{ display: "flex", gap: 16 }}>
        <img src={ME_AVATAR} alt="Me" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <textarea
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="Transmit a thought to the observatory..."
            style={{
              width: "100%", background: "transparent", border: "none", outline: "none",
              fontSize: 18, color: C.text, fontFamily: "'Manrope',sans-serif",
              resize: "none", height: 96,
            }}
          />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, paddingTop: 16, borderTop: `1px solid rgba(59,73,92,0.1)` }}>
            <div style={{ display: "flex", gap: 16, color: C.secondary }}>
              {["image", "gif_box", "poll", "sentiment_satisfied"].map(name => (
                <button key={name} style={{ background: "none", border: "none", cursor: "pointer", color: C.secondary, transition: "color 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.color = C.accent}
                  onMouseLeave={e => e.currentTarget.style.color = C.secondary}
                >
                  <Icon name={name} style={{ fontSize: 22 }} />
                </button>
              ))}
            </div>
            <button style={{
              background: C.accent, color: "#655400", padding: "8px 32px", borderRadius: 999,
              fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14,
              letterSpacing: "0.05em", border: "none", cursor: "pointer",
              transition: "filter 0.2s, transform 0.1s",
            }}
              onMouseEnter={e => e.currentTarget.style.filter = "brightness(1.1)"}
              onMouseLeave={e => e.currentTarget.style.filter = "brightness(1)"}
              onMouseDown={e => e.currentTarget.style.transform = "scale(0.95)"}
              onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
            >
              POST
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Post ────────────────────────────────────────────────────────────────── */
function Post({ post }) {
  const [liked, setLiked] = useState(post.stats.liked);
  const [hovered, setHovered] = useState(false);

  return (
    <article
      style={{
        background: hovered ? "rgba(7,26,47,0.5)" : "rgba(7,26,47,0.3)",
        padding: 24, borderRadius: 12, border: `1px solid rgba(59,73,92,0.05)`,
        transition: "background 0.2s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: "flex", gap: 16 }}>
        <img src={post.avatar} alt={post.name} style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
            <div>
              <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, color: C.text, marginRight: 8 }}>{post.name}</span>
              <span style={{ fontFamily: "'Space Grotesk',sans-serif", color: C.muted, fontSize: 14 }}>{post.handle} · {post.time}</span>
            </div>
            <button style={{ background: "none", border: "none", cursor: "pointer", color: C.muted }}>
              <Icon name="more_horiz" style={{ fontSize: 20 }} />
            </button>
          </div>

          {/* Text */}
          <p style={{
            color: C.text, fontFamily: "'Manrope',sans-serif",
            fontSize: post.quote ? 20 : 15,
            fontWeight: post.quote ? 300 : 400,
            lineHeight: post.quote ? 1.4 : 1.65,
            marginBottom: 16,
          }}>
            {post.text}
          </p>

          {/* Single image */}
          {post.image && (
            <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid rgba(59,73,92,0.1)`, aspectRatio: "16/9", marginBottom: 16 }}>
              <img src={post.image} alt="Post media" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
          )}

          {/* Grid images */}
          {post.images && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              {post.images.map((src, i) => (
                <img key={i} src={src} alt={`Media ${i}`} style={{ borderRadius: 8, height: 192, width: "100%", objectFit: "cover", display: "block" }} />
              ))}
            </div>
          )}

          {/* Stats */}
          <div style={{ display: "flex", gap: 32, color: C.muted }}>
            <StatBtn icon="mode_comment" count={post.stats.comments} hoverColor={C.accent} />
            <StatBtn icon="cached" count={post.stats.reposts} hoverColor="#4ade80" />
            <button
              style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: liked ? C.accent : C.muted, transition: "color 0.2s" }}
              onClick={() => setLiked(l => !l)}
            >
              <Icon name="favorite" fill={liked} style={{ fontSize: 20 }} />
              <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14 }}>{post.stats.likes}</span>
            </button>
            <StatBtn icon="share" count={undefined} hoverColor={C.secondary} />
          </div>
        </div>
      </div>
    </article>
  );
}

function StatBtn({ icon, count, hoverColor }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: hov ? hoverColor : C.muted, transition: "color 0.2s" }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <Icon name={icon} style={{ fontSize: 20 }} />
      {count !== undefined && <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14 }}>{count}</span>}
    </button>
  );
}

/* ─── Right Sidebar ───────────────────────────────────────────────────────── */
function RightSidebar() {
  const [followed, setFollowed] = useState({});
  return (
    <aside style={{ padding: "40px 40px 40px 40px" }}>
      <div style={{ position: "sticky", top: 112, display: "flex", flexDirection: "column", gap: 32 }}>

        {/* Trending */}
        <div style={{ background: C.surfaceLow, borderRadius: 12, border: `1px solid rgba(59,73,92,0.1)`, overflow: "hidden" }}>
          <div style={{ padding: "16px 24px", borderBottom: `1px solid rgba(59,73,92,0.1)` }}>
            <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 18, color: C.accent, margin: 0 }}>Trending Constructs</h3>
          </div>
          {TRENDING.map((t, i) => (
            <div key={i} style={{
              padding: "16px 24px", borderBottom: i < TRENDING.length - 1 ? `1px solid rgba(59,73,92,0.1)` : "none",
              cursor: "pointer", transition: "background 0.2s",
            }}
              onMouseEnter={e => e.currentTarget.style.background = C.surfaceHigh}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 12, color: C.muted }}>{t.tag}</span>
              <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, color: C.text, margin: "4px 0" }}>{t.title}</p>
              <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 10, color: C.accent, textTransform: "uppercase", letterSpacing: "0.12em" }}>{t.count} Transmissions</span>
            </div>
          ))}
          <div style={{ padding: "12px 24px", textAlign: "center" }}>
            <button style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 12, color: C.accent, textTransform: "uppercase", letterSpacing: "0.12em", background: "none", border: "none", cursor: "pointer" }}>
              Show More
            </button>
          </div>
        </div>

        {/* Suggested */}
        <div style={{ background: C.surfaceLow, borderRadius: 12, border: `1px solid rgba(59,73,92,0.1)`, overflow: "hidden" }}>
          <div style={{ padding: "16px 24px", borderBottom: `1px solid rgba(59,73,92,0.1)` }}>
            <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 18, color: C.accent, margin: 0 }}>Connect Beings</h3>
          </div>
          <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 24 }}>
            {SUGGESTED.map((s) => (
              <div key={s.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <img src={s.avatar} alt={s.name} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
                  <div>
                    <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, color: C.text, fontSize: 14, margin: 0 }}>{s.name}</p>
                    <p style={{ fontFamily: "'Space Grotesk',sans-serif", color: C.muted, fontSize: 12, margin: 0 }}>{s.handle}</p>
                  </div>
                </div>
                <button
                  onClick={() => setFollowed(f => ({ ...f, [s.name]: !f[s.name] }))}
                  style={{
                    background: followed[s.name] ? C.accent : C.text,
                    color: "#010f20", padding: "6px 16px", borderRadius: 999,
                    fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 12,
                    border: "none", cursor: "pointer", transition: "background 0.2s",
                  }}
                >
                  {followed[s.name] ? "Following" : "Follow"}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", padding: "0 8px" }}>
          {["Privacy", "Terms", "Cookies", "Ads Info", "© 2024 BUBBLE"].map(link => (
            <a key={link} href="#" style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(158,172,195,0.4)", textDecoration: "none", transition: "color 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.color = C.accent}
              onMouseLeave={e => e.currentTarget.style.color = "rgba(158,172,195,0.4)"}
            >
              {link}
            </a>
          ))}
        </footer>
      </div>
    </aside>
  );
}

/* ─── Root ────────────────────────────────────────────────────────────────── */
export default function BubbleFeed() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Manrope:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #010f20; overflow-x: hidden; }
        .material-symbols-outlined { font-variation-settings: 'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24; line-height: 1; display: inline-flex; align-items: center; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(59,73,92,0.4); border-radius: 4px; }
        textarea::placeholder, input::placeholder { color: rgba(158,172,195,0.4); }
        textarea { caret-color: #ffe792; }
      `}</style>

      <div style={{ background: C.bg, color: C.text, minHeight: "100vh", fontFamily: "'Manrope', sans-serif" }}>
        <Sidebar />
        <TopBar />

        {/* Main content: offset by sidebar (96px) and topbar (80px) */}
        <main style={{ marginLeft: 96, paddingTop: 80, display: "grid", gridTemplateColumns: "1fr 420px", minHeight: "100vh" }}>

          {/* Feed column */}
          <section style={{ borderRight: `1px solid rgba(59,73,92,0.1)`, padding: "40px 32px" }}>
            <div style={{ maxWidth: 680, margin: "0 auto" }}>
              <Composer />
              <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
                {POSTS.map(post => <Post key={post.id} post={post} />)}
              </div>
            </div>
          </section>

          {/* Right sidebar */}
          <RightSidebar />
        </main>

        {/* FAB */}
        <button style={{
          position: "fixed", bottom: 32, right: 32, width: 56, height: 56,
          background: C.accent, borderRadius: "50%", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 30px rgba(255,231,146,0.4)", zIndex: 50,
          transition: "transform 0.2s",
        }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          onMouseDown={e => e.currentTarget.style.transform = "scale(0.95)"}
          onMouseUp={e => e.currentTarget.style.transform = "scale(1.1)"}
        >
          <Icon name="add" style={{ fontSize: 28, color: "#655400" }} />
        </button>
      </div>
    </>
  );
}