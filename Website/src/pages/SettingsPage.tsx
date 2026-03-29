import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import Sidebar from "@/components/Sidebar";
import * as api from "@/api";


// ─── Types ────────────────────────────────────────────────────────────────────

type ThemePreset = {
  id: string;
  label: string;
  swatches: string[];
};

type ConnectedApp = {
  id: string;
  name: string;
  status: "connected" | "disconnected";
  iconSrc: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { icon: "chat", label: "Chats" },
  { icon: "work", label: "Work" },
  { icon: "video_call", label: "Meet" },
  { icon: "groups", label: "Community" },
  { icon: "rss_feed", label: "Feed" },
  { icon: "bookmark", label: "Saved" },
  { icon: "calendar_today", label: "Calendar" },
  { icon: "payments", label: "Payments" },
  { icon: "settings", label: "Settings", active: true },
  { icon: "logout", label: "Logout" },
];

const THEME_PRESETS: ThemePreset[] = [
  { id: "obsidian-gold", label: "Obsidian Gold", swatches: ["#010f20", "#ffe792", "#a2c2fd"] },
  { id: "cyber-mint", label: "Cyber Mint", swatches: ["#0a192f", "#64ffda", "#112240"] },
  { id: "nebula-violet", label: "Nebula Violet", swatches: ["#1a0b2e", "#f0abfc", "#3b0764"] },
  { id: "monolith-gray", label: "Monolith Gray", swatches: ["#1e1e1e", "#e5e5e5", "#404040"] },
];

const ACCENT_COLORS = ["#ffe792", "#ff716c", "#bcd2ff", "#f0dc2b"];

const CONNECTED_APPS: ConnectedApp[] = [
  {
    id: "figma",
    name: "Figma",
    status: "connected",
    iconSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBVH9cArX99Il_0LZN_Mclf4J92ZSbNyRvq1YVGndQDucDaU1IeKGKtZgvzEKKfGKWai2GA9Hnzj2WxqzcaDEGlzZWrEUDpIjK9_FROsDmrEHztDFVJOHPNhk9_9-9NCyv6Y0LK8xTp3SSnBSak-mEVXbrUeQZq1YR5ZJiQ7_fYRWSCRfdO3QMvYpOTGIoNWabplMW1oj5BYfKiliLNoRM_4CGNzCbXrHvXyojoTGv1tjUZXChr-OL7paEN910YBlgoh1UWtoucUhuc",
  },
  {
    id: "slack",
    name: "Slack",
    status: "connected",
    iconSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBVfsgbil0KJpyKMxadvhsoZmE0eB3Ru4n2DazoIlwjghcJgwPwOW0U3bovYT3Xud8JwJ1oDjFur29P4lcj8DK_lBdiBQMHnfm3j_9fk74aBYt-NvqWhMDeDIzMrYMD0gFByjaprBsclaN0HsztK8KDtVqAkze8MFwXZEMabUyvKnetRyODWiJTvODButV_gcoYho_JCZssms_HLqSFst1I4RDEzHMRYNobEUHrxt7Qr_mfyRznClZxF3d4K1Ui_W0PIUi2GtBg2cVZ",
  },
  {
    id: "notion",
    name: "Notion",
    status: "disconnected",
    iconSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDdI9_OlbbZt9r7EE8epYnJBlkzibbzNU9u_JpndEhSR-akgKRmgHWMFh3gLbQqvfxAFlI0LejrP3UCbLcw1OEHI1flOMzQXFoap5NAySEni8h4mXzjQkefvdgoWNNLtHDLfU6vFSUuK6AY9PD9HrO6d12T_7D5Z6hbvnGW1KT1o9kv3h5N10z7mUCp354iqu0jecQMp9VwBDHgmf5sCFkf7FlUABdgt1PM3jZD2vz2amICEbje1V9eaGWSs-N9fuSOxrxpCXxCq5OC",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SG: React.CSSProperties = { fontFamily: "'Space Grotesk', sans-serif" };

function MSIcon({
  name,
  filled = false,
  className = "",
  style,
}: {
  name: string;
  filled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{
        fontVariationSettings: filled
          ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
          : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
        ...style,
      }}
    >
      {name}
    </span>
  );
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

function TopBar() {
  return (
    <header
      className="fixed top-0 w-full z-50 flex items-center justify-between px-8 h-20"
      style={{ background: "#010f20" }}
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8 shrink-0">
            <div
              className="absolute top-0 left-0 w-5 h-5 border-2"
              style={{ borderColor: "#ffe792" }}
            />
            <div
              className="absolute bottom-0 right-0 w-5 h-5 border-2"
              style={{ borderColor: "#ffe792" }}
            />
          </div>
          <span
            className="text-2xl font-bold tracking-tighter"
            style={{ ...SG, color: "#ffe792" }}
          >
            BUBBLE
          </span>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div
          className="relative flex items-center px-4 py-2 rounded-full w-64"
          style={{ background: "#11273f" }}
        >
          <MSIcon
            name="search"
            className="text-sm mr-2"
            style={{ color: "#9eacc3", fontSize: "18px" }}
          />
          <Input
            placeholder="Search settings..."
            className="bg-transparent border-none text-sm focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto"
            style={{ color: "#d8e6ff" }}
          />
        </div>
        <div className="flex items-center gap-4">
          {["notifications", "account_circle"].map((icon) => (
            <button
              key={icon}
              className="transition-colors duration-300"
              style={{ color: "#a2c2fd" }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.color = "#ffe792")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.color = "#a2c2fd")
              }
            >
              <MSIcon name={icon} />
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}


// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-12 h-6 rounded-full relative p-1 transition-colors duration-300 shrink-0"
      style={{ background: enabled ? "rgba(255,231,146,0.20)" : "rgba(59,73,92,0.30)" }}
      aria-checked={enabled}
      role="switch"
    >
      <div
        className="w-4 h-4 rounded-full transition-all duration-300"
        style={{
          background: enabled ? "#ffe792" : "#68768b",
          marginLeft: enabled ? "auto" : "0",
        }}
      />
    </button>
  );
}

// ─── Profile Section ──────────────────────────────────────────────────────────

function ProfileSection() {
  const [displayName, setDisplayName] = useState("Astrid Vance");
  const [alias, setAlias] = useState("@astrid_v");
  const [bio, setBio] = useState(
    "Digital architect specializing in atmospheric UI/UX design. Obsessed with deep navy palettes and celestial interfaces."
  );

  return (
    <section
      className="p-8 rounded-2xl border"
      style={{
        background: "rgba(17,39,63,0.40)",
        backdropFilter: "blur(20px)",
        borderColor: "rgba(59,73,92,0.10)",
      }}
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3
            className="text-xl font-semibold mb-1"
            style={{ ...SG, color: "#ffe792" }}
          >
            Identity Profile
          </h3>
          <p
            className="text-[10px] uppercase tracking-widest"
            style={{ ...SG, color: "#9eacc3" }}
          >
            Public Information
          </p>
        </div>
        <Button
          className="px-6 py-2 rounded-xl text-xs font-bold tracking-wider border-0 transition-all"
          style={{ ...SG, background: "#ffe792", color: "#655400", height: "auto" }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.background = "#ffd709")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.background = "#ffe792")
          }
        >
          SAVE CHANGES
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Avatar */}
        <div className="relative group shrink-0">
          <div
            className="w-32 h-32 rounded-xl overflow-hidden relative"
            style={{ background: "#11273f" }}
          >
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAxQ2i_ZwK0zv8JDoxMaBJSYx52mrOo1wV1iH9Q6CQcqTXV3Qa4E2c73vlqWOWaI-LVRRPmhKQQXlJLVtiQqMydd_Wbd7vXWbMc3Oh5XRi2oBnzOL4vIPRKSjkF2mpD_VvItmcCL8RbfAGx3owkMw0RhLKbxv6Idz6keo4oBCnvxjT3fKF0LvVf6WDnQQ4F0SpwP2R5BhQUhhLpiV54Dw1sOvtOYxbC6guGgniXF8SguL2dHL26xEk2uyc7sqmhDohdC1ZisCgAF4yq"
              alt="Profile"
              className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: "rgba(255,231,146,0.20)" }}>
              <MSIcon name="photo_camera" style={{ color: "#655400" }} />
            </div>
          </div>
          <div
            className="absolute -bottom-2 -right-2 w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: "#ffe792" }}
          >
            <MSIcon
              name="edit"
              filled
              style={{ color: "#655400", fontSize: "14px" }}
            />
          </div>
        </div>

        {/* Fields */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          {[
            { label: "Display Name", value: displayName, setter: setDisplayName },
            { label: "Unique Alias", value: alias, setter: setAlias },
          ].map(({ label, value, setter }) => (
            <div key={label} className="space-y-2">
              <label
                className="text-[10px] uppercase tracking-widest ml-1 block"
                style={{ ...SG, color: "#9eacc3" }}
              >
                {label}
              </label>
              <Input
                value={value}
                onChange={(e) => setter(e.target.value)}
                className="w-full border-none rounded-xl px-4 py-3 text-sm focus-visible:ring-2 transition-all"
                style={{
                  background: "#11273f",
                  color: "#d8e6ff",
                  focusRingColor: "rgba(255,231,146,0.20)",
                }}
              />
            </div>
          ))}
          <div className="col-span-full space-y-2">
            <label
              className="text-[10px] uppercase tracking-widest ml-1 block"
              style={{ ...SG, color: "#9eacc3" }}
            >
              Editorial Bio
            </label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full border-none rounded-xl px-4 py-3 text-sm focus-visible:ring-2 resize-none transition-all"
              style={{ background: "#11273f", color: "#d8e6ff" }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Security Section ─────────────────────────────────────────────────────────

function SecuritySection() {
  const [twoFA, setTwoFA] = useState(true);

  return (
    <section
      className="p-8 rounded-2xl border"
      style={{
        background: "rgba(17,39,63,0.40)",
        backdropFilter: "blur(20px)",
        borderColor: "rgba(59,73,92,0.10)",
      }}
    >
      <h3
        className="text-xl font-semibold mb-6"
        style={{ ...SG, color: "#ffe792" }}
      >
        Security Protocols
      </h3>
      <div className="space-y-4">
        {/* 2FA Row */}
        <div
          className="flex items-center justify-between p-4 rounded-xl transition-colors group cursor-pointer"
          style={{ background: "#031427" }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.background = "#071a2f")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.background = "#031427")
          }
          onClick={() => setTwoFA((v) => !v)}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{
                background: "rgba(36,71,122,0.30)",
                color: "#a2c2fd",
              }}
            >
              {/* <MSIcon name="authenticator" /> */}
            </div>
            <div>
              <p className="font-medium text-sm" style={SG}>
                Two-Factor Authentication
              </p>
              <p className="text-xs" style={{ color: "#9eacc3" }}>
                Secure your account with biometric verification.
              </p>
            </div>
          </div>
          <Toggle enabled={twoFA} onToggle={() => setTwoFA((v) => !v)} />
        </div>

        {/* Passkey Row */}
        <div
          className="flex items-center justify-between p-4 rounded-xl transition-colors group cursor-pointer"
          style={{ background: "#031427" }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.background = "#071a2f")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.background = "#031427")
          }
        >
          <div className="flex items-center gap-4">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: "#11273f", color: "#9eacc3" }}
            >
              <MSIcon name="key" />
            </div>
            <div>
              <p className="font-medium text-sm" style={SG}>
                Passkey Synchronization
              </p>
              <p className="text-xs" style={{ color: "#9eacc3" }}>
                Manage encrypted access across your devices.
              </p>
            </div>
          </div>
          <MSIcon
            name="chevron_right"
            className="group-hover:text-yellow-300 transition-colors"
            style={{ color: "#9eacc3" }}
          />
        </div>
      </div>
    </section>
  );
}

// ─── Billing Section ──────────────────────────────────────────────────────────

function BillingSection() {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async (isAnonymous: boolean) => {
    setLoading(true);
    try {
      // Assuming api.ts has a createCheckout method, or fetch directly
      const response = await fetch('http://localhost:3000/api/payment/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAnonymous, planType: 'premium' }),
      });
      const data = await response.json();
      if (data.url) {
         window.location.href = data.url;
      } else {
         toast.error(data.error || 'Failed to initialize checkout');
      }
    } catch (error) {
      toast.error('Payment gateway unavailable');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="p-8 rounded-2xl border" style={{ background: "rgba(17,39,63,0.40)", backdropFilter: "blur(20px)", borderColor: "rgba(59,73,92,0.10)" }}>
      <h3 className="text-xl font-semibold mb-6" style={{ ...SG, color: "#f0abfc" }}>Financial Identity & Clearance</h3>
      <div className="space-y-4">
        {/* Standard Checkout */}
        <div className="flex items-center justify-between p-4 rounded-xl group transition-all" style={{ background: "#031427" }}>
          <div>
            <p className="font-medium text-sm" style={SG}>Upgrade to Premium</p>
            <p className="text-xs text-[#9eacc3]">Standard checkout with email tracking.</p>
          </div>
          <Button disabled={loading} onClick={() => handleCheckout(false)} className="bg-[#a2c2fd] text-[#010f20] hover:bg-[#c0d6fe] text-xs font-bold font-['Space_Grotesk'] h-8 px-4 rounded-lg">Buy Key</Button>
        </div>

        {/* Anonymous Checkout */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-[#ffe792]/20 group transition-all" style={{ background: "rgba(255,231,146,0.05)" }}>
          <div>
            <p className="font-medium text-sm" style={{ ...SG, color: "#ffe792" }}>Phantom Mode Transaction</p>
            <p className="text-xs text-[#9eacc3]">Complete financial anonymity via encrypted alias checkout.</p>
          </div>
          <Button disabled={loading} onClick={() => handleCheckout(true)} className="bg-[#ffe792] text-[#655400] hover:bg-[#ffd709] shadow-[0_0_15px_rgba(255,231,146,0.3)] text-xs font-bold font-['Space_Grotesk'] h-8 px-4 rounded-lg">Stealth Pay</Button>
        </div>
      </div>
    </section>
  );
}

// ─── Theme Section ────────────────────────────────────────────────────────────


function ThemeSection() {
  const [selectedTheme, setSelectedTheme] = useState("obsidian-gold");
  const [accentColor, setAccentColor] = useState("#ffe792");
  const [glassIntensity, setGlassIntensity] = useState(70);

  return (
    <section
      className="p-8 rounded-2xl border h-full"
      style={{
        background: "rgba(17,39,63,0.40)",
        backdropFilter: "blur(20px)",
        borderColor: "rgba(59,73,92,0.10)",
      }}
    >
      <div className="mb-8">
        <h3
          className="text-xl font-semibold mb-1"
          style={{ ...SG, color: "#ffe792" }}
        >
          Theme Customization
        </h3>
        <p
          className="text-[10px] uppercase tracking-widest"
          style={{ ...SG, color: "#9eacc3" }}
        >
          Atmosphere &amp; Visuals
        </p>
      </div>

      <div className="space-y-8">
        {/* Palette Presets */}
        <div>
          <label
            className="text-[10px] uppercase tracking-widest block mb-4"
            style={{ ...SG, color: "#9eacc3" }}
          >
            Core Atmosphere
          </label>
          <div className="grid grid-cols-2 gap-4">
            {THEME_PRESETS.map((preset) => {
              const isSelected = selectedTheme === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => setSelectedTheme(preset.id)}
                  className="relative flex flex-col gap-4 p-4 rounded-xl text-left transition-all"
                  style={{
                    background: isSelected ? "#11273f" : "#071a2f",
                    border: isSelected
                      ? "2px solid #ffe792"
                      : "2px solid transparent",
                    boxShadow: isSelected
                      ? "0 0 0 4px rgba(255,231,146,0.05)"
                      : "none",
                    opacity: isSelected ? 1 : 0.6,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected)
                      (e.currentTarget as HTMLElement).style.opacity = "1";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected)
                      (e.currentTarget as HTMLElement).style.opacity = "0.6";
                  }}
                >
                  <div className="flex gap-2">
                    {preset.swatches.map((color) => (
                      <div
                        key={color}
                        className="w-6 h-6 rounded-md"
                        style={{ background: color }}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold" style={SG}>
                    {preset.label}
                  </span>
                  {isSelected && (
                    <MSIcon
                      name="check_circle"
                      filled
                      className="absolute top-3 right-3 text-sm"
                      style={{ color: "#ffe792", fontSize: "16px" }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Glass Intensity Slider */}
        <div>
          <label
            className="text-[10px] uppercase tracking-widest block mb-6"
            style={{ ...SG, color: "#9eacc3" }}
          >
            Glass Panel Refraction
          </label>
          <div className="relative h-1 w-full rounded-full mb-3" style={{ background: "#11273f" }}>
            <div
              className="absolute top-0 left-0 h-full rounded-full"
              style={{ width: `${glassIntensity}%`, background: "#ffe792" }}
            />
            <input
              type="range"
              min={0}
              max={100}
              value={glassIntensity}
              onChange={(e) => setGlassIntensity(Number(e.target.value))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full ring-4 ring-yellow-300/20 cursor-pointer pointer-events-none"
              style={{
                left: `calc(${glassIntensity}% - 8px)`,
                background: "#ffe792",
              }}
            />
          </div>
          <div
            className="flex justify-between text-[10px]"
            style={{ ...SG, color: "rgba(158,172,195,0.60)" }}
          >
            <span>MINIMAL BLUR</span>
            <span>TOTAL OBSIDIAN</span>
          </div>
        </div>

        {/* Accent Colors */}
        <div>
          <label
            className="text-[10px] uppercase tracking-widest block mb-4"
            style={{ ...SG, color: "#9eacc3" }}
          >
            Focus Accent Override
          </label>
          <div className="flex flex-wrap gap-3">
            {ACCENT_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setAccentColor(color)}
                className="w-8 h-8 rounded-full transition-transform hover:scale-110"
                style={{
                  background: color,
                  ...(accentColor === color
                    ? {
                      boxShadow: `0 0 0 2px #010f20, 0 0 0 4px ${color}`,
                    }
                    : {}),
                }}
                aria-label={color}
              />
            ))}
            <button
              className="w-8 h-8 rounded-full flex items-center justify-center border transition-transform hover:scale-110"
              style={{ background: "#11273f", borderColor: "#3b495c" }}
            >
              <MSIcon
                name="add"
                className="text-sm"
                style={{ fontSize: "16px", color: "#9eacc3" }}
              />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Ecosystem Section ────────────────────────────────────────────────────────

function EcosystemSection() {
  return (
    <div
      className="p-8 rounded-2xl border"
      style={{
        background: "rgba(17,39,63,0.40)",
        backdropFilter: "blur(20px)",
        borderColor: "rgba(59,73,92,0.10)",
      }}
    >
      <div className="flex items-center justify-between mb-8">
        <h3
          className="text-xl font-semibold"
          style={{ ...SG, color: "#ffe792" }}
        >
          Synchronized Ecosystem
        </h3>
        <button
          className="text-xs hover:underline transition-colors"
          style={{ color: "#a2c2fd" }}
        >
          View All Integrations
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {CONNECTED_APPS.map((app) => (
          <div
            key={app.id}
            className="flex items-center gap-4 p-4 rounded-xl"
            style={{
              background: "#031427",
              opacity: app.status === "disconnected" ? 0.5 : 1,
              filter:
                app.status === "disconnected" ? "grayscale(100%)" : "none",
            }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <img src={app.iconSrc} alt={app.name} className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold" style={SG}>
                {app.name}
              </p>
              <p
                className="text-[10px]"
                style={{ color: "#9eacc3", ...SG, textTransform: "capitalize" }}
              >
                {app.status}
              </p>
            </div>
          </div>
        ))}

        {/* Add new */}
        <button
          className="flex items-center justify-center p-4 rounded-xl border border-dashed transition-colors group"
          style={{ borderColor: "rgba(59,73,92,0.30)" }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.background = "#071a2f")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.background = "transparent")
          }
        >
          <span
            className="text-xs uppercase tracking-widest group-hover:text-yellow-200 transition-colors"
            style={{ ...SG, color: "#9eacc3" }}
          >
            Link New Stream
          </span>
        </button>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "#010f20", color: "#d8e6ff" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Manrope:wght@300;400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap');
        body { font-family: 'Manrope', sans-serif; }
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; }
        input[type=range]::-moz-range-thumb { appearance: none; }
      `}</style>

      <TopBar />
      <Sidebar />

      <main
        className="px-12 pb-20 transition-all duration-300"
        style={{ marginLeft: 96, paddingTop: "6rem" }}
      >
        {/* Page Header */}
        <header className="mb-16">
          <h1
            className="text-5xl font-bold tracking-tighter mb-2"
            style={{ ...SG, color: "#d8e6ff" }}
          >
            Account Settings
          </h1>
          <p className="max-w-xl" style={{ color: "#9eacc3" }}>
            Refine your digital existence within the Obsidian ecosystem.
            Personalize your interface, manage security protocols, and configure
            your profile identity.
          </p>
        </header>

        {/* Bento Grid */}
        <div className="grid grid-cols-12 gap-8 items-start">
          {/* Left: Profile + Security + Billing */}
          <div className="col-span-12 lg:col-span-7 space-y-8">
            <ProfileSection />
            <SecuritySection />
            <BillingSection />
          </div>


          {/* Right: Theme */}
          <div className="col-span-12 lg:col-span-5">
            <ThemeSection />
          </div>

          {/* Full width: Ecosystem */}
          <div className="col-span-12 pt-4">
            <EcosystemSection />
          </div>
        </div>
      </main>
    </div>
  );
}