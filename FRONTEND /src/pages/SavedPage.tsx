import { useState } from "react";

/* ─── Icon helper ─────────────────────────────────────────────────────────── */
const Icon = ({ name, fill = false, style = {}, className = "" }) => (
  <span
    className={`material-symbols-outlined ${className}`}
    style={{ fontVariationSettings: `'FILL' ${fill ? 1 : 0},'wght' 400,'GRAD' 0,'opsz' 24`, lineHeight: 1, display: "inline-flex", alignItems: "center", ...style }}
  >
    {name}
  </span>
);

/* ─── Colour tokens ───────────────────────────────────────────────────────── */
const C = {
  bg: "#010f20",
  surface: "#071a2f",
  surfaceLow: "#031427",
  surfaceHigh: "#0c2037",
  surfaceTop: "#11273f",
  border: "rgba(59,73,92,0.15)",
  borderSoft: "rgba(59,73,92,0.1)",
  accent: "#ffe792",
  secondary: "#a2c2fd",
  text: "#d8e6ff",
  muted: "#9eacc3",
  error: "#ff716c",
};

/* ─── Nav data ────────────────────────────────────────────────────────────── */
const NAV = [
  { icon: "chat", label: "Chats" },
  { icon: "work", label: "Work" },
  { icon: "video_chat", label: "Meet" },
  { icon: "group", label: "Community" },
  { icon: "rss_feed", label: "Feed" },
  { icon: "bookmark", label: "Saved", active: true },
  { icon: "calendar_today", label: "Calendar" },
  { icon: "payments", label: "Payments" },
];

/* ─── Saved items ─────────────────────────────────────────────────────────── */
const ITEMS = [
  {
    id: 1,
    tag: "Web3 • UI/UX", tagColor: C.accent,
    title: "The Future of Glassmorphism UI in Web3 Collectives",
    thumb: "https://lh3.googleusercontent.com/aida-public/AB6AXuDfS_eg2aY3AJzKYuilDxR19TCji6x7_zKHomAuwQ9tsuC5xWRby2tHn6QpCh3Kzm9iofJq2l7Z9QwxMKASibCWcqrIzIQDyiB5hFnoOsglL-_sq6UMLDN0FltoFXBvDah23K9EKqBbtLEI7umly2v5LAhhs_OkGaHvp6sf_FnuEPTl4QZa83s4zR81dCxVVv1V3IDH2PajAwekkMvF1Uhdos8u_u5D8Lkhf3ZE7DgYlM_41pJ82tQZI06BmKBTDsg16zXdhDnRHcVm",
  },
  {
    id: 2,
    tag: "Architecture • 12m read", tagColor: C.secondary,
    title: "Decentralized Spatial Computing Protocols",
    thumb: "https://lh3.googleusercontent.com/aida-public/AB6AXuAQ9qdV135zkQb9JcOX5SAsWCBE1x6jkOARATKuvNYxpnXLSt8M3ZrTJALa2tXbcC5UyVI-tLa9JNEwjHYTJKRAwbn_B0h2qhSdqcm6T-OjSOAWj7v57DK6frnFnbR_KpmJJGx3s0UlH-Meg5-Wexy0AuLU4NVm_utrhcVnYDMXZlJ2LwR5ku8U4BQNE4Fxb0GH8wNcBnA5daC1GEjCOXuzGbHZBLJkynkf5BDpcIw1WsSjntGy_7n9j7fihuvMNdCUjpYKxUXj_s2d",
  },
  {
    id: 3,
    tag: "Editorial • 5m read", tagColor: C.secondary,
    title: "Typography as User Interface: A Manifesto",
    thumb: "https://lh3.googleusercontent.com/aida-public/AB6AXuBzlwuFS3QVNl7yBBgI-0icrRaIn1IkiXOXg9L-u0RdVk4A1lcn3jguFzriIb5Bi7mHWnEEtGu-4iGREn1atFhJT-eOmTd5AY4FTw-U8eOdiq2XwEBRiGUKHHntZhQwGSuRxc5Ra7Lv2oSxdlSeJxhJZl0dRQKfpUHrMySd-XdEkCRuCdHiI_yT6SGVynRLDpDgaYgyYYNNG7DS0qUO02upqL8xRPt8yHqY2wlS2Hde3gIm-hSI8wYDizFvGoSBqjnq1neWPdbOjEWg",
  },
  {
    id: 4,
    tag: "Network • 22m read", tagColor: C.secondary,
    title: "Bubble Protocol: Scaling Beyond Local Nodes",
    thumb: "https://lh3.googleusercontent.com/aida-public/AB6AXuAtIB_WCXiCMCkZa7AfaAoI1IUQVkLIO9KyyEQPLGZhN9PZvQZkG646vwNf9HowbyW1Fl_en5-R6a3_IG_9aYr3lidTYl3p2TFkauofANBV7latMGA_s5Nu9AShMty9WzR_yN1-XzfGsUh4k-0xjQPdJRXtQQLrqjjS50j2TqstjWOaTuf8z9d8_VSzZnI07JNR9hCBe2qdE4CY_65p0MpI9MiQ3ruDSY_cTl9g0TaaskQbanaFp86d5OXnQFivXVv9nw8o5YnnOqnm",
  },
  {
    id: 5,
    tag: "Design • 8m read", tagColor: C.secondary,
    title: "The Psychology of Haptic Feedback in VR",
    thumb: "https://lh3.googleusercontent.com/aida-public/AB6AXuBXPmYI6eT79XaLKd97wCUoJmbsGxWxzqx0WITVTUjpZI8X55PNYRbu6Vg6hi2qmMugDTZdUc4ejP2A1CiyUe2ZG1xYFHAx3nRijNxTygbseofyrM4D2cHFDQXKYni5yxaaRkL-lCEJ_CprAja73gDazTNIGmlChAzmdv3wADqhLCP1mCWUJzacPYyUed2vtc5RLkkLQo4Xxs0aEMqIO1vZGytOgDJvw5QN6wMoKwOKqF6M7AVLG5m9475YRuNzvNSrcLOCjgYJX3YX",
  },
];

const HERO_IMG = "https://lh3.googleusercontent.com/aida-public/AB6AXuBuLj67ZifOoKpsyEVW9jNmod2B8aFmfJomh0HFrEf4qb0cg4Q0uwo5jUSJZK71VJDZOhVAQRfQPiZEuT5poP6aQpHfpgOaCXvuy17k3IaV0Pn1ucZTKaIaHMLLDBmKIgpkNq5fhNZpl9tFhvwn8z9ohsyjLZXbvUnin5aCGLr8Hv3V-1PSpMjcmjYomPubwPG3EWSs0dbsq_lQMrLvmDcJEsvcsg7kHPkJMdwpVIW93vZ9YOVtA94l2rj7e5jC5f4_yW6tNh7vWLq_";
const AUTHOR_IMG = "https://lh3.googleusercontent.com/aida-public/AB6AXuDBno3kQzgMzZK-vNvuH2hfTW3pLszzypKgkkeIJ6OViuMIkiQ7Ss7U2SJff8mAvS9VeTNls5-qDCeZDlQk0yKPfov576Ih-Gfgb2Vwpjq54h3yBxQcWjekhfWZGv8UE1hrx8uIPauVcb1gw63Dd_tHHyuQyKYEmlVKKRNnELk1O66toqVNDYBp-FDfz4RXiA-6OO6X3bGiyF_mAasCOo2SnagzreGfSMUUkKJGR-ju6ctCKeJ7mFmhoUzvj4_TkXw1_oVWwk1pFPbA";
const PROFILE_IMG = "https://lh3.googleusercontent.com/aida-public/AB6AXuB-Xzhf5tC-uNh7ogpOrpF197rUmVQlpgQMJpaeLdDgY06RlhL-hgoayPJkGqzjn0yx2g3UcSrtGWPfZcvovXBtbtlKNHxjv0joupsh7p3oDluu9nsTcPo0IpZrCnv6_epcgeCt7EuPtiUg4GXIVa1ALqmFtpE8t49yPoub6hZWG1YqFz7EOerKKHZJoIlBlFECeds1vFQ9JI1A31pZHNdTb74rgBJWra7gqrErlFu_I370RDBPpfRxc3UhJQ9I_HpSmDBMDQbUVa6j";

/* ─── Sidebar ─────────────────────────────────────────────────────────────── */
function Sidebar() {
  return (
    <aside style={{
      position: "fixed", left: 0, top: 0, width: 85, height: "100vh", zIndex: 50,
      background: "rgba(1,15,32,0.85)", backdropFilter: "blur(20px)",
      display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 0 16px",
      boxShadow: "4px 0 32px rgba(0,0,0,0.5)",
    }}>
      {/* Logo */}
      <div style={{
        fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 20,
        color: C.accent, background: C.bg, padding: "8px 10px", borderRadius: 8,
        marginBottom: 16, letterSpacing: "-0.04em",
      }}>BB</div>

      {/* Nav items */}
      <nav style={{ flex: 1, width: "100%", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
        {NAV.map(({ icon, label, active }) => (
          <button key={label} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            padding: "12px 0", width: "100%", border: "none", cursor: "pointer",
            background: active ? "rgba(255,231,146,0.1)" : "transparent",
            borderLeft: active ? `4px solid ${C.accent}` : "4px solid transparent",
            color: active ? C.accent : "rgba(162,194,253,0.6)",
            transition: "all 0.2s",
          }}
            onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "rgba(255,231,146,0.05)"; e.currentTarget.style.color = C.accent; } }}
            onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(162,194,253,0.6)"; } }}
          >
            <Icon name={icon} fill={active} style={{ fontSize: 22 }} />
            <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</span>
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 2, marginTop: "auto" }}>
        <button style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "12px 0", border: "none", background: "transparent", cursor: "pointer", color: "rgba(162,194,253,0.6)", borderLeft: "4px solid transparent", transition: "all 0.2s" }}
          onMouseEnter={e => { e.currentTarget.style.color = C.accent; e.currentTarget.style.background = "rgba(255,231,146,0.05)"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "rgba(162,194,253,0.6)"; e.currentTarget.style.background = "transparent"; }}
        >
          <Icon name="settings" style={{ fontSize: 22 }} />
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em" }}>Settings</span>
        </button>
        <button style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "12px 0", border: "none", background: "transparent", cursor: "pointer", color: "rgba(162,194,253,0.6)", borderLeft: "4px solid transparent" }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden", border: `1px solid rgba(59,73,92,0.3)` }}>
            <img src={PROFILE_IMG} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(162,194,253,0.6)" }}>Profile</span>
        </button>
      </div>
    </aside>
  );
}

/* ─── TopBar ──────────────────────────────────────────────────────────────── */
function TopBar() {
  return (
    <header style={{
      position: "fixed", top: 0, left: 85, right: 0, height: 80, zIndex: 40,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 40px",
      background: "rgba(1,15,32,0.5)", backdropFilter: "blur(16px)",
    }}>
      {/* Search */}
      <div style={{ position: "relative", width: 360 }}>
        <Icon name="search" style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", fontSize: 18, color: C.muted }} />
        <input placeholder="Search saved items..." style={{
          width: "100%", background: C.surfaceTop, border: "none", outline: "none",
          borderRadius: 12, padding: "10px 16px 10px 44px", fontSize: 14,
          color: C.text, fontFamily: "'Manrope',sans-serif", boxSizing: "border-box",
        }} />
      </div>

      {/* Right actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <button style={{ position: "relative", background: "none", border: "none", cursor: "pointer", color: C.secondary, transition: "color 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.color = C.accent}
          onMouseLeave={e => e.currentTarget.style.color = C.secondary}
        >
          <Icon name="notifications" style={{ fontSize: 24 }} />
          <span style={{ position: "absolute", top: 0, right: 0, width: 8, height: 8, background: C.accent, borderRadius: "50%" }} />
        </button>
        <div style={{ width: 1, height: 32, background: "rgba(59,73,92,0.2)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>Synced 2m ago</span>
          <Icon name="cloud_done" style={{ fontSize: 20, color: C.accent }} />
        </div>
      </div>
    </header>
  );
}

/* ─── Saved List ──────────────────────────────────────────────────────────── */
const FILTERS = ["Articles", "Videos", "Links"];

function SavedList({ activeId, onSelect }) {
  const [activeFilter, setActiveFilter] = useState("Articles");

  return (
    <aside style={{
      width: 380, height: "100%", flexShrink: 0,
      background: "rgba(17,39,63,0.4)", backdropFilter: "blur(20px)",
      borderRight: `1px solid rgba(59,73,92,0.1)`,
      display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{ padding: "32px 32px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 24, color: C.text, margin: 0 }}>Saved</h1>
          <button style={{ padding: 8, background: "none", border: "none", cursor: "pointer", color: C.accent, borderRadius: 8, transition: "background 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,231,146,0.1)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <Icon name="filter_list" style={{ fontSize: 20 }} />
          </button>
        </div>

        {/* Filter pills */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setActiveFilter(f)} style={{
              padding: "6px 16px", borderRadius: 999, border: "none", cursor: "pointer",
              fontFamily: "'Space Grotesk',sans-serif", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em",
              flexShrink: 0, transition: "background 0.2s, color 0.2s",
              background: activeFilter === f ? C.accent : C.surfaceTop,
              color: activeFilter === f ? "#655400" : C.muted,
            }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Item list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 32px", display: "flex", flexDirection: "column", gap: 8 }}>
        {ITEMS.map(item => {
          const isActive = item.id === activeId;
          return (
            <div key={item.id} onClick={() => onSelect(item.id)} style={{
              padding: 16, borderRadius: 12, cursor: "pointer",
              background: isActive ? C.surfaceHigh : "transparent",
              borderLeft: isActive ? `4px solid ${C.accent}` : "4px solid transparent",
              boxShadow: isActive ? "0 0 15px rgba(255,231,146,0.1)" : "none",
              transition: "all 0.2s",
            }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = C.surfaceLow; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 8, overflow: "hidden", flexShrink: 0,
                  filter: isActive ? "none" : "grayscale(100%)", transition: "filter 0.2s",
                }}
                  onMouseEnter={e => e.currentTarget.style.filter = "none"}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.filter = "grayscale(100%)"; }}
                >
                  <img src={item.thumb} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <span style={{
                    fontFamily: "'Space Grotesk',sans-serif", fontSize: 10, textTransform: "uppercase",
                    letterSpacing: "0.1em", color: item.tagColor, display: "block", marginBottom: 4,
                  }}>{item.tag}</span>
                  <h3 style={{
                    fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 13,
                    color: isActive ? C.text : C.muted, lineHeight: 1.4, margin: 0,
                    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                    transition: "color 0.2s",
                  }}>{item.title}</h3>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

/* ─── Article ─────────────────────────────────────────────────────────────── */
function Article() {
  return (
    <section style={{ flex: 1, height: "100%", overflowY: "auto", background: C.bg }}>
      <div style={{ maxWidth: 768, margin: "0 auto", padding: "64px 48px 80px" }}>

        {/* Top nav */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 48 }}>
          <button style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", color: C.secondary, fontFamily: "'Space Grotesk',sans-serif", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", transition: "color 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.color = C.accent}
            onMouseLeave={e => e.currentTarget.style.color = C.secondary}
          >
            <Icon name="arrow_back" style={{ fontSize: 18 }} />
            Back to List
          </button>
          <div style={{ display: "flex", gap: 4 }}>
            {[
              { icon: "text_fields", color: C.muted, hoverColor: C.accent },
              { icon: "share", color: C.muted, hoverColor: C.accent },
              { icon: "bookmark", color: C.accent, fill: true },
              { icon: "delete", color: C.muted, hoverColor: C.error },
            ].map(({ icon, color, fill, hoverColor }) => (
              <button key={icon} style={{ padding: 8, background: "none", border: "none", cursor: "pointer", color, transition: "color 0.2s", borderRadius: 8 }}
                onMouseEnter={e => { if (hoverColor) e.currentTarget.style.color = hoverColor; }}
                onMouseLeave={e => { if (hoverColor) e.currentTarget.style.color = color; }}
              >
                <Icon name={icon} fill={fill} style={{ fontSize: 22 }} />
              </button>
            ))}
          </div>
        </div>

        {/* Hero image */}
        <div style={{ width: "100%", aspectRatio: "16/9", borderRadius: 24, overflow: "hidden", marginBottom: 48, boxShadow: "0 24px 80px rgba(255,231,146,0.08)" }}>
          <img src={HERO_IMG} alt="Article hero" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        </div>

        {/* Article body */}
        <article>
          {/* Meta + title */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
              <span style={{
                padding: "4px 12px", background: "rgba(255,231,146,0.1)", color: C.accent,
                fontFamily: "'Space Grotesk',sans-serif", fontSize: 10, textTransform: "uppercase",
                letterSpacing: "0.1em", borderRadius: 999,
              }}>Editorial Focus</span>
              <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>Published Oct 24, 2023</span>
            </div>
            <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 44, lineHeight: 1.1, color: C.text, margin: "0 0 24px", letterSpacing: "-0.02em" }}>
              The Future of Glassmorphism UI in Web3 Collectives
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <img src={AUTHOR_IMG} alt="Julian Vane" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", border: `1px solid rgba(255,231,146,0.2)` }} />
              <div>
                <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, color: C.text, fontSize: 14, margin: 0 }}>Julian Vane</p>
                <p style={{ fontFamily: "'Space Grotesk',sans-serif", color: C.muted, fontSize: 12, margin: 0 }}>Design Lead @ BUBBLE Labs</p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "linear-gradient(to right, rgba(255,231,146,0.3), rgba(59,73,92,0.1), transparent)", marginBottom: 40 }} />

          {/* Body text */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24, color: "rgba(216,230,255,0.9)", fontSize: 18, lineHeight: 1.75, fontFamily: "'Manrope',sans-serif" }}>
            <p>
              As we navigate the shifting landscapes of the decentralized web, our visual language must evolve to reflect the transparency and layered complexity of the underlying protocols. Glassmorphism, once a mere trend of aesthetic lightness, is maturing into a functional paradigm for Web3 interfaces.
            </p>
            <p>
              In the context of{" "}
              <a href="#" style={{ color: C.accent, textDecoration: "none", borderBottom: `1px solid rgba(255,231,146,0.4)` }}>DAOs and Collectives</a>
              , the use of frosted-glass aesthetics serves as more than just visual flair. It symbolizes the "Permeable Boundary"—an organizational structure that is distinct yet transparent.
            </p>

            {/* Blockquote */}
            <blockquote style={{
              margin: "16px 0", padding: "24px 32px",
              borderLeft: `4px solid ${C.accent}`,
              background: C.surfaceLow, borderRadius: "0 16px 16px 0",
              fontStyle: "italic", fontSize: 20, color: "#ffd709",
            }}>
              "Transparency is not just about showing everything; it's about making the depth of the system visible without overwhelming the observer."
            </blockquote>

            <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 24, color: C.text, margin: "16px 0 0" }}>
              The Depth of Decision Making
            </h3>
            <p>
              Modern BUBBLE interfaces utilize tonal layering instead of traditional borders to guide the user's eye. By adjusting the opacity and blur radius of containers based on the current context of a smart contract interaction, we can provide subtle cognitive cues about the finality of a transaction.
            </p>

            {/* Feature grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, margin: "16px 0" }}>
              {[
                { icon: "blur_on", title: "Backdrop Blur", body: "Creating vertical hierarchy through depth of field rather than simple stacking." },
                { icon: "layers", title: "Multi-Level Tones", body: "Leveraging the full spectrum of navy tones to define interaction boundaries." },
              ].map(({ icon, title, body }) => (
                <div key={title} style={{ background: C.surfaceHigh, padding: 32, borderRadius: 24, border: `1px solid rgba(59,73,92,0.2)` }}>
                  <Icon name={icon} style={{ fontSize: 40, color: C.accent, display: "block", marginBottom: 16 }} />
                  <h4 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 18, color: C.text, margin: "0 0 8px" }}>{title}</h4>
                  <p style={{ fontSize: 14, color: C.muted, margin: 0, lineHeight: 1.6 }}>{body}</p>
                </div>
              ))}
            </div>

            <p>
              Future iterations of the BUBBLE design system will continue to push these celestial aesthetics, ensuring that as the technology becomes more complex, the experience becomes more luminous and intuitive.
            </p>
          </div>

          {/* Next article */}
          <div style={{ marginTop: 64 }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: 32, background: C.surface, borderRadius: 24, border: `1px solid rgba(59,73,92,0.1)`,
            }}>
              <div>
                <h4 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, color: C.text, margin: "0 0 4px" }}>Next Article</h4>
                <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 20, color: C.accent, margin: 0 }}>Scaling Distributed Systems in 2024</p>
              </div>
              <button style={{
                width: 48, height: 48, borderRadius: "50%", background: C.accent, border: "none",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                color: "#655400", transition: "transform 0.2s",
              }}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              >
                <Icon name="arrow_forward" style={{ fontSize: 22 }} />
              </button>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

/* ─── Root ────────────────────────────────────────────────────────────────── */
export default function BubbleSaved() {
  const [activeId, setActiveId] = useState(1);

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
        ::-webkit-scrollbar-thumb { background: #3b495c; border-radius: 10px; }
        input::placeholder { color: rgba(158,172,195,0.5); }
        ::selection { background: #ffe792; color: #655400; }
      `}</style>

      <div style={{ background: C.bg, color: C.text, minHeight: "100vh", fontFamily: "'Manrope', sans-serif" }}>
        <Sidebar />
        <TopBar />

        {/* Main: offset by sidebar (85px) and topbar (80px) */}
        <main style={{ marginLeft: 85, paddingTop: 80, height: "100vh", display: "flex", overflow: "hidden" }}>
          <SavedList activeId={activeId} onSelect={setActiveId} />
          <Article />
        </main>

        {/* FAB */}
        <button style={{
          position: "fixed", bottom: 40, right: 40, width: 64, height: 64,
          background: C.accent, borderRadius: "50%", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 30px rgba(255,231,146,0.4)", zIndex: 50,
          transition: "transform 0.2s",
        }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          onMouseDown={e => e.currentTarget.style.transform = "scale(0.95)"}
          onMouseUp={e => e.currentTarget.style.transform = "scale(1.05)"}
        >
          <Icon name="add" style={{ fontSize: 28, color: "#655400" }} />
        </button>
      </div>
    </>
  );
}