// SettingsPage.tsx — Fixed version
// Key changes:
//   1. SocialSection: getMyFollowers/getMyFollowing now pass userId correctly
//   2. ThemeSection: favicon update wired to theme changes
//   3. ProfileSection: uses dynamic BASE_URL from env

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import Sidebar from "@/components/Sidebar";
import { useTheme, THEMES, ThemeId } from "@/lib/ThemeContext";
import { uploadAvatar, getMyFollowers, getMyFollowing, followUser } from "@/api";
import * as api from "@/api";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

// ─── Types ────────────────────────────────────────────────────────────────────

type ConnectedApp = {
  id: string;
  name: string;
  status: "connected" | "disconnected";
  iconSrc: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

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
      className="fixed top-0 right-0 z-50 flex items-center justify-between px-8 h-20 transition-colors"
      style={{
        background: "color-mix(in srgb, var(--th-bg) 70%, transparent)",
        backdropFilter: "blur(20px)",
        left: "85px",
        borderBottom: "1px solid var(--th-border)",
      }}
    >
      <div className="flex items-center gap-4">
        <span
          className="text-2xl font-bold tracking-tighter transition-colors uppercase"
          style={{ ...SG, color: "var(--th-accent)" }}
        >
          SETTINGS
        </span>
      </div>
      <div className="flex items-center gap-6">
        <div
          className="relative flex items-center px-4 py-2 rounded-full w-64 transition-colors"
          style={{ background: "var(--th-surface-top)" }}
        >
          <MSIcon
            name="search"
            className="text-sm mr-2 transition-colors"
            style={{ color: "var(--th-muted)", fontSize: "18px" }}
          />
          <Input
            placeholder="Search settings..."
            className="bg-transparent border-none text-sm focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto transition-colors"
            style={{ color: "var(--th-text)" }}
          />
        </div>
        <div className="flex items-center gap-4">
          {["notifications", "account_circle"].map((icon) => (
            <button
              key={icon}
              className="transition-colors duration-300"
              style={{ color: "var(--th-secondary)" }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.color = "var(--th-accent)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.color = "var(--th-secondary)")
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

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="w-12 h-6 rounded-full relative p-1 transition-colors duration-300 shrink-0"
      style={{
        background: enabled
          ? "color-mix(in srgb, var(--th-accent) 20%, transparent)"
          : "color-mix(in srgb, var(--th-muted) 30%, transparent)",
      }}
      aria-checked={enabled}
      role="switch"
    >
      <div
        className="w-4 h-4 rounded-full transition-all duration-300"
        style={{
          background: enabled ? "var(--th-accent)" : "var(--th-muted)",
          marginLeft: enabled ? "auto" : "0",
        }}
      />
    </button>
  );
}

// ─── Profile Section ──────────────────────────────────────────────────────────

function ProfileSection() {
  const [displayName, setDisplayName] = useState("");
  const [alias, setAlias] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch(`${BASE_URL}/profile/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.data) {
          setDisplayName(data.data.full_name || "");
          setAlias(data.data.username || "");
          setBio(data.data.bio || "");
        }
      } catch (err) {
        console.error("Failed to fetch profile settings", err);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${BASE_URL}/profile/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ full_name: displayName, username: alias, bio }),
      });
      if (!res.ok) throw new Error("Update failed");
      toast.success("Profile updated successfully");
      const updatedRes = await fetch(`${BASE_URL}/profile/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const updatedData = await updatedRes.json();
      if (updatedData.data) {
        localStorage.setItem("user", JSON.stringify(updatedData.data));
      }
    } catch {
      toast.error("Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      const res = await uploadAvatar(file);
      if (res && res.data) {
        toast.success("Avatar uploaded successfully.");
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        user.avatar = res.data.avatarUrl || res.data.avatar;
        localStorage.setItem("user", JSON.stringify(user));
        window.location.reload();
      }
    } catch (err: any) {
      toast.error("Avatar upload failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  return (
    <section
      className="p-8 rounded-2xl border transition-colors"
      style={{
        background: "color-mix(in srgb, var(--th-surface-low) 40%, transparent)",
        backdropFilter: "blur(20px)",
        borderColor: "var(--th-border)",
      }}
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3
            className="text-xl font-semibold mb-1 transition-colors"
            style={{ ...SG, color: "var(--th-accent)" }}
          >
            Identity Profile
          </h3>
          <p
            className="text-[10px] uppercase tracking-widest transition-colors"
            style={{ ...SG, color: "var(--th-muted)" }}
          >
            Public Information & Security
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-2 rounded-xl text-xs font-bold tracking-wider border-0 transition-all hover:scale-105"
          style={{ ...SG, background: "var(--th-accent)", color: "var(--th-accent-text)", height: "auto" }}
        >
          {loading ? "SAVING..." : "SAVE CHANGES"}
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Avatar */}
        <label className="relative group shrink-0 cursor-pointer">
          <div
            className="w-32 h-32 rounded-xl overflow-hidden relative transition-colors"
            style={{ background: "var(--th-surface-top)" }}
          >
            <img
              src={
                user.avatar ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username || "user"}`
              }
              alt="Profile"
              className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-500"
            />
            <div
              className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-colors duration-300"
              style={{ background: "color-mix(in srgb, var(--th-bg) 60%, transparent)" }}
            >
              <MSIcon name="cloud_upload" style={{ color: "var(--th-accent)" }} />
              <span className="text-[10px] font-bold mt-1" style={{ color: "var(--th-text)" }}>
                Upload
              </span>
            </div>
          </div>
          <div
            className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-lg"
            style={{ background: "var(--th-accent)" }}
          >
            <MSIcon name="edit" filled style={{ color: "var(--th-accent-text)", fontSize: "16px" }} />
          </div>
          <input type="file" hidden accept="image/*" onChange={handleAvatarUpload} disabled={loading} />
        </label>

        {/* Fields */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <div className="space-y-2">
            <label
              className="text-[10px] uppercase tracking-widest ml-1 block transition-colors"
              style={{ ...SG, color: "var(--th-muted)" }}
            >
              Display Name
            </label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full border rounded-xl px-4 py-3 text-sm focus-visible:ring-2 transition-all"
              style={{
                background: "var(--th-surface-top)",
                borderColor: "var(--th-border)",
                color: "var(--th-text)",
              }}
            />
          </div>
          <div className="space-y-2">
            <label
              className="text-[10px] uppercase tracking-widest ml-1 block transition-colors"
              style={{ ...SG, color: "var(--th-muted)" }}
            >
              Username
            </label>
            <Input
              value={alias}
              readOnly
              className="w-full border rounded-xl px-4 py-3 text-sm transition-all"
              style={{
                background: "var(--th-surface-top)",
                borderColor: "var(--th-border)",
                color: "var(--th-accent)",
                fontWeight: 700,
              }}
            />
          </div>
          <div className="col-span-full space-y-2">
            <label
              className="text-[10px] uppercase tracking-widest ml-1 block transition-colors"
              style={{ ...SG, color: "var(--th-muted)" }}
            >
              Bio
            </label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full border rounded-xl px-4 py-3 text-sm focus-visible:ring-2 resize-none transition-all"
              style={{
                background: "var(--th-surface-top)",
                color: "var(--th-text)",
                borderColor: "var(--th-border)",
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Security Section ─────────────────────────────────────────────────────────

function SecuritySection() {
  const [twoFA, setTwoFA] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setTwoFA(user.twoFactorEnabled || false);
  }, []);

  const toggle2FA = async () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user.twoFactorEnabled) {
      try {
        const res = await api.setup2FA();
        if (res.qrCode) {
          window.open(res.qrCode, "_blank");
          const token = prompt("Scan QR and enter the 6-digit code:");
          if (token) {
            const verifyRes = await api.verify2FA(token);
            if (verifyRes.success) {
              toast.success("2FA enabled successfully.");
              user.twoFactorEnabled = true;
              localStorage.setItem("user", JSON.stringify(user));
              setTwoFA(true);
            }
          }
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to initialize 2FA.");
      }
    } else {
      toast("To disable 2FA, please contact security administrator.");
    }
  };

  return (
    <section
      className="p-8 rounded-2xl border transition-colors"
      style={{
        background: "color-mix(in srgb, var(--th-surface-low) 40%, transparent)",
        backdropFilter: "blur(20px)",
        borderColor: "var(--th-border)",
      }}
    >
      <h3 className="text-xl font-semibold mb-6 transition-colors" style={{ ...SG, color: "var(--th-accent)" }}>
        Security Protocols
      </h3>
      <div className="space-y-4">
        <div
          className="flex items-center justify-between p-4 rounded-xl transition-colors group cursor-pointer border"
          style={{ background: "var(--th-surface)", borderColor: "transparent" }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.borderColor = "var(--th-border)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.borderColor = "transparent")
          }
          onClick={toggle2FA}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
              style={{
                background: "color-mix(in srgb, var(--th-secondary) 20%, transparent)",
                color: "var(--th-secondary)",
              }}
            >
              <MSIcon name="shield_lock" />
            </div>
            <div>
              <p className="font-medium text-sm transition-colors" style={{ ...SG, color: "var(--th-text)" }}>
                Two-Factor Authentication
              </p>
              <p className="text-xs transition-colors" style={{ color: "var(--th-muted)" }}>
                Secure your account with TOTP verification.
              </p>
            </div>
          </div>
          <Toggle enabled={twoFA} onToggle={toggle2FA} />
        </div>
      </div>
    </section>
  );
}

// ─── Social Section — FIXED ───────────────────────────────────────────────────

function SocialSection() {
  const [following, setFollowing] = useState<any[]>([]);
  const [followers, setFollowers] = useState<any[]>([]);
  const [tab, setTab] = useState<"following" | "followers">("following");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Get current user's ID from localStorage
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const userId = user._id || user.id;

        if (!userId) {
          setLoading(false);
          return;
        }

        // Pass userId to the following/followers calls
        const [fingRes, fersRes] = await Promise.all([
          getMyFollowing(userId).catch(() => ({ following: [] })),
          getMyFollowers(userId).catch(() => ({ followers: [] })),
        ]);

        setFollowing(fingRes.following || []);
        setFollowers(fersRes.followers || []);
      } catch {
        // Silently fail — user might not have follows yet
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleUnfollow = async (id: string, index: number) => {
    try {
      await followUser(id);
      setFollowing((prev) => prev.filter((_, i) => i !== index));
      toast.success("Unfollowed successfully.");
    } catch {
      toast.error("Failed to unfollow.");
    }
  };

  const activeList = tab === "following" ? following : followers;

  return (
    <section
      className="p-8 rounded-2xl border transition-colors relative overflow-hidden"
      style={{
        background: "color-mix(in srgb, var(--th-surface-low) 40%, transparent)",
        backdropFilter: "blur(20px)",
        borderColor: "var(--th-border)",
      }}
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold transition-colors" style={{ ...SG, color: "var(--th-accent)" }}>
          Social Network
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setTab("following")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${tab === "following" ? "opacity-100" : "opacity-50"
              }`}
            style={{
              ...SG,
              background: tab === "following" ? "var(--th-surface-high)" : "transparent",
              color: "var(--th-text)",
            }}
          >
            Following ({following.length})
          </button>
          <button
            onClick={() => setTab("followers")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${tab === "followers" ? "opacity-100" : "opacity-50"
              }`}
            style={{
              ...SG,
              background: tab === "followers" ? "var(--th-surface-high)" : "transparent",
              color: "var(--th-text)",
            }}
          >
            Followers ({followers.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-16 rounded-xl animate-pulse"
              style={{ background: "var(--th-surface)" }}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeList.length === 0 && (
            <p className="text-sm col-span-full py-8 text-center" style={{ color: "var(--th-muted)", ...SG }}>
              No {tab} found.
            </p>
          )}
          {activeList.map((user: any, i: number) => (
            <div
              key={user._id || i}
              className="flex items-center gap-4 p-4 rounded-xl border transition-all hover:scale-[1.01]"
              style={{ background: "var(--th-surface)", borderColor: "var(--th-border)" }}
            >
              <img
                src={
                  user.avatar ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username || i}`
                }
                alt={user.username}
                className="w-12 h-12 rounded-full object-cover bg-black/10"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`;
                }}
              />
              <div className="flex-1 overflow-hidden">
                <h4 className="font-bold text-sm truncate" style={{ color: "var(--th-text)" }}>
                  {user.full_name || user.username}
                </h4>
                <p className="text-xs truncate" style={{ color: "var(--th-muted)" }}>
                  @{user.username}
                </p>
              </div>
              {tab === "following" && (
                <button
                  onClick={() => handleUnfollow(user._id, i)}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors"
                  style={{
                    background: "color-mix(in srgb, var(--th-error, #ef4444) 15%, transparent)",
                    color: "var(--th-error, #ef4444)",
                  }}
                >
                  Unfollow
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Theme Section ────────────────────────────────────────────────────────────

function ThemeSection() {
  const { themeId: selectedTheme, setTheme: setSelectedTheme } = useTheme();
  const [glassIntensity, setGlassIntensity] = useState(70);

  // Update favicon when theme changes
  useEffect(() => {
    try {
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (link) {
        // If you have theme-specific favicons, map them here
        // For now, we keep the default but the hook is wired
        const themeColors: Record<string, string> = {
          midnight: "#ffe792",
          neon: "#00f0ff",
          aurora: "#4ade80",
          ember: "#ff7143",
          default: "#ffe792",
        };
        document.documentElement.style.setProperty(
          "--favicon-color",
          themeColors[selectedTheme] || themeColors.default
        );
      }
    } catch { }
  }, [selectedTheme]);

  return (
    <section
      className="p-8 rounded-2xl border h-full transition-colors duration-300 relative z-10"
      style={{
        background: "color-mix(in srgb, var(--th-surface-low) 40%, transparent)",
        backdropFilter: "blur(20px)",
        borderColor: "var(--th-border)",
      }}
    >
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-1 transition-colors" style={{ ...SG, color: "var(--th-accent)" }}>
          Theme Customization
        </h3>
        <p className="text-[10px] uppercase tracking-widest transition-colors" style={{ ...SG, color: "var(--th-muted)" }}>
          Atmosphere &amp; Visuals
        </p>
      </div>

      <div className="space-y-8">
        {/* Palette Presets */}
        <div>
          <label
            className="text-[10px] uppercase tracking-widest block mb-4 transition-colors"
            style={{ ...SG, color: "var(--th-muted)" }}
          >
            Core Atmosphere
          </label>
          <div className="grid grid-cols-2 gap-4">
            {THEMES.map((preset) => {
              const isSelected = selectedTheme === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => setSelectedTheme(preset.id as ThemeId)}
                  className="relative flex flex-col gap-4 p-4 rounded-xl text-left transition-all"
                  style={{
                    background: isSelected ? "var(--th-surface-top)" : "var(--th-surface)",
                    border: isSelected ? "2px solid var(--th-accent)" : "2px solid transparent",
                    boxShadow: isSelected ? "0 0 0 4px var(--th-glow)" : "none",
                    opacity: isSelected ? 1 : 0.6,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.opacity = "1";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.opacity = "0.6";
                  }}
                >
                  <div className="flex gap-2">
                    {preset.swatches.map((color) => (
                      <div key={color} className="w-6 h-6 rounded-md" style={{ background: color }} />
                    ))}
                  </div>
                  <span className="text-xs font-bold transition-colors" style={{ ...SG, color: "var(--th-text)" }}>
                    {preset.label}
                  </span>
                  {isSelected && (
                    <MSIcon
                      name="check_circle"
                      filled
                      className="absolute top-3 right-3 text-sm transition-colors"
                      style={{ color: "var(--th-accent)", fontSize: "16px" }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Glass Intensity */}
        <div>
          <label
            className="text-[10px] uppercase tracking-widest block mb-6 transition-colors"
            style={{ ...SG, color: "var(--th-muted)" }}
          >
            Glass Morphism Intensity
          </label>
          <div
            className="relative h-1 w-full rounded-full mb-3 shadow-[inset_0_0_5px_rgba(0,0,0,0.5)]"
            style={{ background: "var(--th-surface-top)" }}
          >
            <div
              className="absolute top-0 left-0 h-full rounded-full transition-colors"
              style={{ width: `${glassIntensity}%`, background: "var(--th-accent)" }}
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
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full ring-4 pointer-events-none transition-all"
              style={{
                left: `calc(${glassIntensity}% - 8px)`,
                background: "var(--th-accent)",
                boxShadow: "0 0 0 4px var(--th-glow)",
              }}
            />
          </div>
          <div
            className="flex justify-between text-[10px] transition-colors"
            style={{ ...SG, color: "var(--th-muted)", opacity: 0.6 }}
          >
            <span>OFF</span>
            <span>TOTAL GLOW</span>
          </div>
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
      const response = await fetch(`${BASE_URL}/payment/create-checkout-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({ isAnonymous, planType: "premium" }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to initialize checkout");
      }
    } catch {
      toast.error("Payment gateway unavailable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      className="p-8 rounded-2xl border transition-colors"
      style={{
        background: "color-mix(in srgb, var(--th-surface-low) 40%, transparent)",
        backdropFilter: "blur(20px)",
        borderColor: "var(--th-border)",
      }}
    >
      <h3
        className="text-xl font-semibold mb-6 transition-colors"
        style={{ ...SG, color: "var(--th-text)" }}
      >
        Subscription & Billing
      </h3>
      <div className="space-y-4">
        <div
          className="flex items-center justify-between p-4 rounded-xl group transition-all"
          style={{ background: "var(--th-surface)" }}
        >
          <div>
            <p className="font-medium text-sm transition-colors" style={{ ...SG, color: "var(--th-text)" }}>
              Upgrade to Premium
            </p>
            <p className="text-xs transition-colors" style={{ color: "var(--th-muted)" }}>
              Standard checkout.
            </p>
          </div>
          <Button
            disabled={loading}
            onClick={() => handleCheckout(false)}
            className="text-xs font-bold h-8 px-4 rounded-lg transition-colors hover:scale-105"
            style={{ background: "color-mix(in srgb, var(--th-secondary) 80%, white)", color: "var(--th-bg)" }}
          >
            Upgrade
          </Button>
        </div>
      </div>
    </section>
  );
}

// ─── Ecosystem Section ────────────────────────────────────────────────────────

function EcosystemSection() {
  return (
    <div
      className="p-8 rounded-2xl border transition-colors relative z-10"
      style={{
        background: "color-mix(in srgb, var(--th-surface-low) 40%, transparent)",
        backdropFilter: "blur(20px)",
        borderColor: "var(--th-border)",
      }}
    >
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-semibold transition-colors" style={{ ...SG, color: "var(--th-accent)" }}>
          Connected Apps
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {CONNECTED_APPS.map((app) => (
          <div
            key={app.id}
            className="flex items-center gap-4 p-4 rounded-xl transition-colors"
            style={{
              background: "var(--th-surface)",
              opacity: app.status === "disconnected" ? 0.5 : 1,
              filter: app.status === "disconnected" ? "grayscale(100%)" : "none",
            }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors"
              style={{ background: "var(--th-surface-top)" }}
            >
              <img src={app.iconSrc} alt={app.name} className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold transition-colors" style={{ ...SG, color: "var(--th-text)" }}>
                {app.name}
              </p>
              <p
                className="text-[10px] transition-colors"
                style={{ color: "var(--th-muted)", ...SG, textTransform: "capitalize" }}
              >
                {app.status}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div
      className="min-h-screen transition-colors duration-300 relative overflow-hidden"
      style={{ background: "var(--th-bg)", color: "var(--th-text)" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Manrope:wght@300;400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap');
        .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
      `}</style>

      <TopBar />
      <Sidebar />

      {/* Ambient glows */}
      <div
        className="fixed top-[-10%] right-[-10%] w-[50%] h-[50%] blur-[120px] rounded-full pointer-events-none z-0 transition-colors"
        style={{ background: "var(--th-glow)" }}
      />
      <div
        className="fixed bottom-[-10%] left-[10%] w-[30%] h-[40%] blur-[120px] rounded-full pointer-events-none z-0 transition-colors"
        style={{ background: "color-mix(in srgb, var(--th-secondary) 15%, transparent)" }}
      />

      <main className="px-12 pb-20 transition-all duration-300 relative z-10" style={{ marginLeft: 96, paddingTop: "6rem" }}>
        <header className="mb-16">
          <h1
            className="text-5xl font-bold tracking-tighter mb-2 transition-colors"
            style={{ ...SG, color: "var(--th-text)" }}
          >
            Account Settings
          </h1>
          <p className="max-w-xl transition-colors" style={{ color: "var(--th-muted)" }}>
            Personalize your interface, manage security protocols, and configure your profile identity.
          </p>
        </header>

        <div className="grid grid-cols-12 gap-8 items-start">
          <div className="col-span-12 lg:col-span-7 space-y-8">
            <ProfileSection />
            <SecuritySection />
            <BillingSection />
            <EcosystemSection />
          </div>
          <div className="col-span-12 lg:col-span-5 relative space-y-8">
            <ThemeSection />
            <SocialSection />
          </div>
        </div>
      </main>
    </div>
  );
}





// import { useState, useEffect } from "react";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import { Textarea } from "@/components/ui/textarea";
// import { toast } from "sonner";
// import Sidebar from "@/components/Sidebar";
// import { useTheme, THEMES, ThemeId } from "@/lib/ThemeContext";
// import { uploadAvatar, getFollowers, getFollowing, followUser } from "@/api";

// // ─── Types ────────────────────────────────────────────────────────────────────

// type ConnectedApp = {
//   id: string;
//   name: string;
//   status: "connected" | "disconnected";
//   iconSrc: string;
// };

// // ─── Constants ────────────────────────────────────────────────────────────────

// const ACCENT_COLORS = ["#ffe792", "#ff716c", "#bcd2ff", "#f0dc2b"];

// const CONNECTED_APPS: ConnectedApp[] = [
//   {
//     id: "figma",
//     name: "Figma",
//     status: "connected",
//     iconSrc:
//       "https://lh3.googleusercontent.com/aida-public/AB6AXuBVH9cArX99Il_0LZN_Mclf4J92ZSbNyRvq1YVGndQDucDaU1IeKGKtZgvzEKKfGKWai2GA9Hnzj2WxqzcaDEGlzZWrEUDpIjK9_FROsDmrEHztDFVJOHPNhk9_9-9NCyv6Y0LK8xTp3SSnBSak-mEVXbrUeQZq1YR5ZJiQ7_fYRWSCRfdO3QMvYpOTGIoNWabplMW1oj5BYfKiliLNoRM_4CGNzCbXrHvXyojoTGv1tjUZXChr-OL7paEN910YBlgoh1UWtoucUhuc",
//   },
//   {
//     id: "slack",
//     name: "Slack",
//     status: "connected",
//     iconSrc:
//       "https://lh3.googleusercontent.com/aida-public/AB6AXuBVfsgbil0KJpyKMxadvhsoZmE0eB3Ru4n2DazoIlwjghcJgwPwOW0U3bovYT3Xud8JwJ1oDjFur29P4lcj8DK_lBdiBQMHnfm3j_9fk74aBYt-NvqWhMDeDIzMrYMD0gFByjaprBsclaN0HsztK8KDtVqAkze8MFwXZEMabUyvKnetRyODWiJTvODButV_gcoYho_JCZssms_HLqSFst1I4RDEzHMRYNobEUHrxt7Qr_mfyRznClZxF3d4K1Ui_W0PIUi2GtBg2cVZ",
//   },
//   {
//     id: "notion",
//     name: "Notion",
//     status: "disconnected",
//     iconSrc:
//       "https://lh3.googleusercontent.com/aida-public/AB6AXuDdI9_OlbbZt9r7EE8epYnJBlkzibbzNU9u_JpndEhSR-akgKRmgHWMFh3gLbQqvfxAFlI0LejrP3UCbLcw1OEHI1flOMzQXFoap5NAySEni8h4mXzjQkefvdgoWNNLtHDLfU6vFSUuK6AY9PD9HrO6d12T_7D5Z6hbvnGW1KT1o9kv3h5N10z7mUCp354iqu0jecQMp9VwBDHgmf5sCFkf7FlUABdgt1PM3jZD2vz2amICEbje1V9eaGWSs-N9fuSOxrxpCXxCq5OC",
//   },
// ];

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// const SG: React.CSSProperties = { fontFamily: "'Space Grotesk', sans-serif" };

// function MSIcon({
//   name,
//   filled = false,
//   className = "",
//   style,
// }: {
//   name: string;
//   filled?: boolean;
//   className?: string;
//   style?: React.CSSProperties;
// }) {
//   return (
//     <span
//       className={`material-symbols-outlined ${className}`}
//       style={{
//         fontVariationSettings: filled
//           ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
//           : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
//         ...style,
//       }}
//     >
//       {name}
//     </span>
//   );
// }

// // ─── TopBar ───────────────────────────────────────────────────────────────────

// function TopBar() {
//   return (
//     <header
//       className="fixed top-0 right-0 z-50 flex items-center justify-between px-8 h-20 transition-colors"
//       style={{ background: "color-mix(in srgb, var(--th-bg) 70%, transparent)", backdropFilter: "blur(20px)", left: "85px" }}
//     >
//       <div className="flex items-center gap-4">
//         <div className="flex items-center gap-3">
//           <span
//             className="text-2xl font-bold tracking-tighter transition-colors uppercase"
//             style={{ ...SG, color: "var(--th-accent)" }}
//           >
//             BUBBLE
//           </span>
//         </div>
//       </div>
//       <div className="flex items-center gap-6">
//         <div
//           className="relative flex items-center px-4 py-2 rounded-full w-64 transition-colors"
//           style={{ background: "var(--th-surface-top)" }}
//         >
//           <MSIcon
//             name="search"
//             className="text-sm mr-2 transition-colors"
//             style={{ color: "var(--th-muted)", fontSize: "18px" }}
//           />
//           <Input
//             placeholder="Search settings..."
//             className="bg-transparent border-none text-sm focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto transition-colors"
//             style={{ color: "var(--th-text)" }}
//           />
//         </div>
//         <div className="flex items-center gap-4">
//           {["notifications", "account_circle"].map((icon) => (
//             <button
//               key={icon}
//               className="transition-colors duration-300"
//               style={{ color: "var(--th-secondary)" }}
//               onMouseEnter={(e) =>
//                 ((e.currentTarget as HTMLElement).style.color = "var(--th-accent)")
//               }
//               onMouseLeave={(e) =>
//                 ((e.currentTarget as HTMLElement).style.color = "var(--th-secondary)")
//               }
//             >
//               <MSIcon name={icon} />
//             </button>
//           ))}
//         </div>
//       </div>
//     </header>
//   );
// }


// // ─── Toggle ───────────────────────────────────────────────────────────────────

// function Toggle({
//   enabled,
//   onToggle,
// }: {
//   enabled: boolean;
//   onToggle: () => void;
// }) {
//   return (
//     <button
//       onClick={onToggle}
//       className="w-12 h-6 rounded-full relative p-1 transition-colors duration-300 shrink-0"
//       style={{ background: enabled ? "color-mix(in srgb, var(--th-accent) 20%, transparent)" : "color-mix(in srgb, var(--th-muted) 30%, transparent)" }}
//       aria-checked={enabled}
//       role="switch"
//     >
//       <div
//         className="w-4 h-4 rounded-full transition-all duration-300"
//         style={{
//           background: enabled ? "var(--th-accent)" : "var(--th-muted)",
//           marginLeft: enabled ? "auto" : "0",
//         }}
//       />
//     </button>
//   );
// }

// // ─── Profile Section ──────────────────────────────────────────────────────────

// function ProfileSection() {
//   const [displayName, setDisplayName] = useState("");
//   const [alias, setAlias] = useState("");
//   const [bio, setBio] = useState("");
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//      const fetchProfile = async () => {
//          try {
//              const token = localStorage.getItem("access_token");
//              const res = await fetch("http://localhost:3000/api/v1/profile/me", {
//                  headers: { "Authorization": `Bearer ${token}` }
//              });
//              const data = await res.json();
//              if (data.data) {
//                  setDisplayName(data.data.full_name || "");
//                  setAlias(data.data.username || "");
//                  setBio(data.data.bio || "");
//              }
//          } catch(err) {
//              console.error("Failed to fetch profile settings", err);
//          }
//      }
//      fetchProfile();
//   }, []);

//   const handleSave = async () => {
//     try {
//         setLoading(true);
//         const token = localStorage.getItem("access_token");
//         const res = await fetch("http://localhost:3000/api/v1/profile/me", {
//             method: "PUT",
//             headers: {
//                 "Content-Type": "application/json",
//                 "Authorization": `Bearer ${token}`
//             },
//             body: JSON.stringify({
//                 full_name: displayName,
//                 username: alias,
//                 bio: bio
//             })
//         });

//         if (!res.ok) {
//             throw new Error("Update failed");
//         }

//         toast.success("Profile attributes updated successfully");
//         // Refetch/resync user object 
//         const updatedRes = await fetch("http://localhost:3000/api/v1/profile/me", {
//             headers: { "Authorization": `Bearer ${token}` }
//         });
//         const updatedData = await updatedRes.json();
//         if (updatedData.data) {
//            localStorage.setItem("user", JSON.stringify(updatedData.data));
//         }

//     } catch (err) {
//         toast.error("Error communicating with profile ecosystem.");
//     } finally {
//         setLoading(false);
//     }
//   };

//   const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;
//     try {
//       setLoading(true);
//       const res = await uploadAvatar(file);
//       if (res && res.data) {
//         toast.success("Avatar uploaded successfully.");
//         const user = JSON.parse(localStorage.getItem("user") || "{}");
//         user.avatar = res.data.avatarUrl || res.data.avatar;
//         localStorage.setItem("user", JSON.stringify(user));
//         window.location.reload();
//       }
//     } catch (err: any) {
//       toast.error("Avatar upload failed: " + err.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <section
//       className="p-8 rounded-2xl border transition-colors"
//       style={{
//         background: "color-mix(in srgb, var(--th-surface-low) 40%, transparent)",
//         backdropFilter: "blur(20px)",
//         borderColor: "var(--th-border)",
//       }}
//     >
//       <div className="flex items-center justify-between mb-8">
//         <div>
//           <h3
//             className="text-xl font-semibold mb-1 transition-colors"
//             style={{ ...SG, color: "var(--th-accent)" }}
//           >
//             Identity Profile
//           </h3>
//           <p
//             className="text-[10px] uppercase tracking-widest transition-colors"
//             style={{ ...SG, color: "var(--th-muted)" }}
//           >
//             Public Information & Security
//           </p>
//         </div>
//         <div className="flex items-center gap-4">
//            <div className="flex items-center gap-3 px-4 py-2 rounded-xl border border-dashed" style={{ borderColor: "var(--th-border)" }}>
//               <span className="text-[10px] uppercase tracking-widest font-bold" style={{ ...SG, color: "var(--th-accent)" }}>Security Status: Active</span>
//            </div>
//            <Button
//              onClick={handleSave}
//              disabled={loading}
//              className="px-6 py-2 rounded-xl text-xs font-bold tracking-wider border-0 transition-all hover:scale-105"
//              style={{ ...SG, background: "var(--th-accent)", color: "var(--th-accent-text)", height: "auto" }}
//            >
//              {loading ? "SAVING..." : "SAVE CHANGES"}
//            </Button>
//         </div>
//       </div>

//       <div className="flex flex-col md:flex-row gap-8 items-start">
//         {/* Avatar */}
//         <label className="relative group shrink-0 cursor-pointer">
//           <div
//             className="w-32 h-32 rounded-xl overflow-hidden relative transition-colors"
//             style={{ background: "var(--th-surface-top)" }}
//           >
//             <img
//               src={JSON.parse(localStorage.getItem("user") || "{}").avatar || "https://lh3.googleusercontent.com/aida-public/AB6AXuAxQ2i_ZwK0zv8JDoxMaBJSYx52mrOo1wV1iH9Q6CQcqTXV3Qa4E2c73vlqWOWaI-LVRRPmhKQQXlJLVtiQqMydd_Wbd7vXWbMc3Oh5XRi2oBnzOL4vIPRKSjkF2mpD_VvItmcCL8RbfAGx3owkMw0RhLKbxv6Idz6keo4oBCnvxjT3fKF0LvVf6WDnQQ4F0SpwP2R5BhQUhhLpiV54Dw1sOvtOYxbC6guGgniXF8SguL2dHL26xEk2uyc7sqmhDohdC1ZisCgAF4yq"}
//               alt="Profile"
//               className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-500"
//             />
//             <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-colors duration-300"
//               style={{ background: "color-mix(in srgb, var(--th-bg) 60%, transparent)" }}>
//               <MSIcon name="cloud_upload" style={{ color: "var(--th-accent)" }} />
//               <span className="text-[10px] font-bold mt-1" style={{ color: "var(--th-text)" }}>Upload</span>
//             </div>
//           </div>
//           <div
//             className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-lg"
//             style={{ background: "var(--th-accent)" }}
//           >
//             <MSIcon
//               name="edit"
//               filled
//               style={{ color: "var(--th-accent-text)", fontSize: "16px" }}
//             />
//           </div>
//           <input type="file" hidden accept="image/*" onChange={handleAvatarUpload} disabled={loading} />
//         </label>

//         {/* Fields */}
//         <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
//           <div className="space-y-2">
//             <label className="text-[10px] uppercase tracking-widest ml-1 block transition-colors" style={{ ...SG, color: "var(--th-muted)" }}>Display Name</label>
//             <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full border rounded-xl px-4 py-3 text-sm focus-visible:ring-2 transition-all"
//                 style={{ background: "var(--th-surface-top)", borderColor: "var(--th-border)", color: "var(--th-text)", outlineColor: "color-mix(in srgb, var(--th-accent) 20%, transparent)" }} />
//           </div>
//           <div className="space-y-2">
//             <label className="text-[10px] uppercase tracking-widest ml-1 block transition-colors" style={{ ...SG, color: "var(--th-muted)" }}>Username</label>
//             <Input value={alias} readOnly className="w-full border rounded-xl px-4 py-3 text-sm focus-visible:ring-2 transition-all"
//                 style={{ background: "var(--th-surface-top)", borderColor: "var(--th-border)", color: "var(--th-accent)", fontWeight: 700, outlineColor: "color-mix(in srgb, var(--th-accent) 20%, transparent)" }} />
//           </div>
//           <div className="col-span-full space-y-2">
//             <label
//               className="text-[10px] uppercase tracking-widest ml-1 block transition-colors"
//               style={{ ...SG, color: "var(--th-muted)" }}
//             >
//               Editorial Bio
//             </label>
//             <Textarea
//               value={bio}
//               onChange={(e) => setBio(e.target.value)}
//               rows={3}
//               className="w-full border rounded-xl px-4 py-3 text-sm focus-visible:ring-2 resize-none transition-all"
//               style={{ 
//                   background: "var(--th-surface-top)", 
//                   color: "var(--th-text)",
//                   borderColor: "var(--th-border)"
//               }}
//             />
//           </div>
//         </div>
//       </div>
//     </section>
//   );
// }

// // ─── Security Section ─────────────────────────────────────────────────────────

// function SecuritySection() {
//   const [twoFA, setTwoFA] = useState(false);

//   const toggle2FA = async () => {
//     const user = JSON.parse(localStorage.getItem("user") || "{}");
//     const currentStatus = user.twoFactorEnabled || false;

//     if (!currentStatus) {
//       try {
//         const res = await api.setup2FA();
//         if (res.qrCode) {
//           // Open QR in new tab or show alert
//           window.open(res.qrCode, '_blank');
//           const token = prompt("Scan the QR code and enter the 6-digit verification code:");
//           if (token) {
//             const verifyRes = await api.verify2FA(token);
//             if (verifyRes.success) {
//               toast.success("2FA Security Protocol successfully established.");
//               user.twoFactorEnabled = true;
//               localStorage.setItem("user", JSON.stringify(user));
//               setTwoFA(true);
//             }
//           }
//         }
//       } catch (err: any) {
//         toast.error(err.message || "Failed to initialize 2FA security.");
//       }
//     } else {
//       // Logic for disabling 2FA if needed, or just toast for now
//       toast("To disable 2FA, please contact security administrator.");
//     }
//   };

//   useEffect(() => {
//     const user = JSON.parse(localStorage.getItem("user") || "{}");
//     setTwoFA(user.twoFactorEnabled || false);
//   }, []);

//   return (
//     <section
//       className="p-8 rounded-2xl border transition-colors"
//       style={{
//         background: "color-mix(in srgb, var(--th-surface-low) 40%, transparent)",
//         backdropFilter: "blur(20px)",
//         borderColor: "var(--th-border)",
//       }}
//     >
//       <h3
//         className="text-xl font-semibold mb-6 transition-colors"
//         style={{ ...SG, color: "var(--th-accent)" }}
//       >
//         Security Protocols
//       </h3>
//       <div className="space-y-4">
//         {/* 2FA Row */}
//         <div
//           className="flex items-center justify-between p-4 rounded-xl transition-colors group cursor-pointer border"
//           style={{ background: "var(--th-surface)", borderColor: "transparent" }}
//           onMouseEnter={(e) =>
//             ((e.currentTarget as HTMLElement).style.borderColor = "var(--th-border)")
//           }
//           onMouseLeave={(e) =>
//             ((e.currentTarget as HTMLElement).style.borderColor = "transparent")
//           }
//           onClick={toggle2FA}
//         >
//           <div className="flex items-center gap-4">
//             <div
//               className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
//               style={{
//                 background: "color-mix(in srgb, var(--th-secondary) 20%, transparent)",
//                 color: "var(--th-secondary)",
//               }}
//             >
//                <MSIcon name="shield_lock" />
//             </div>
//             <div>
//               <p className="font-medium text-sm transition-colors" style={{...SG, color: "var(--th-text)"}}>
//                 Two-Factor Authentication
//               </p>
//               <p className="text-xs transition-colors" style={{ color: "var(--th-muted)" }}>
//                 Secure your account with TOTP verification.
//               </p>
//             </div>
//           </div>
//           <Toggle enabled={twoFA} onToggle={toggle2FA} />
//         </div>

//         {/* Sync Row */}
//         <div
//           className="flex items-center justify-between p-4 rounded-xl transition-colors group cursor-pointer border"
//           style={{ background: "var(--th-surface)", borderColor: "transparent" }}
//           onMouseEnter={(e) =>
//             ((e.currentTarget as HTMLElement).style.borderColor = "var(--th-border)")
//           }
//           onMouseLeave={(e) =>
//              ((e.currentTarget as HTMLElement).style.borderColor = "transparent")
//           }
//           onClick={() => {
//               toast("Full sync snapshot aggregated across active nodes.");
//           }}
//         >
//           <div className="flex items-center gap-4">
//             <div
//               className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
//               style={{ background: "var(--th-surface-top)", color: "var(--th-muted)" }}
//             >
//               <MSIcon name="sync" />
//             </div>
//             <div>
//               <p className="font-medium text-sm transition-colors" style={{...SG, color: "var(--th-text)"}}>
//                 Force State Synchronization
//               </p>
//               <p className="text-xs transition-colors" style={{ color: "var(--th-muted)" }}>
//                 Manage encrypted alignment checks across devices.
//               </p>
//             </div>
//           </div>
//           <MSIcon
//             name="chevron_right"
//             className="group-hover:translate-x-1 transition-transform cursor-pointer"
//             style={{ color: "var(--th-secondary)" }}
//           />
//         </div>
//       </div>
//     </section>
//   );
// }

// // ─── Billing Section ──────────────────────────────────────────────────────────

// function BillingSection() {
//   const [loading, setLoading] = useState(false);

//   const handleCheckout = async (isAnonymous: boolean) => {
//     setLoading(true);
//     try {
//       const response = await fetch('http://localhost:3000/api/v1/payment/create-checkout-session', {
//         method: 'POST',
//         headers: { 
//             'Content-Type': 'application/json',
//             "Authorization": `Bearer ${localStorage.getItem("access_token")}`
//         },
//         body: JSON.stringify({ isAnonymous, planType: 'premium' }),
//       });
//       const data = await response.json();
//       if (data.url) {
//          window.location.href = data.url;
//       } else {
//          toast.error(data.error || 'Failed to initialize checkout');
//       }
//     } catch (error) {
//       toast.error('Payment gateway unavailable');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <section className="p-8 rounded-2xl border transition-colors" style={{ background: "color-mix(in srgb, var(--th-surface-low) 40%, transparent)", backdropFilter: "blur(20px)", borderColor: "var(--th-border)" }}>
//       <h3 className="text-xl font-semibold mb-6 transition-colors" style={{ ...SG, color: "var(--th-text)" }}>Financial Identity & Clearance</h3>
//       <div className="space-y-4">
//         {/* Standard Checkout */}
//         <div className="flex items-center justify-between p-4 rounded-xl group transition-all" style={{ background: "var(--th-surface)" }}>
//           <div>
//             <p className="font-medium text-sm transition-colors" style={{...SG, color: "var(--th-text)"}}>Upgrade to Premium</p>
//             <p className="text-xs transition-colors" style={{color: "var(--th-muted)"}}>Standard checkout with email tracking.</p>
//           </div>
//           <Button disabled={loading} onClick={() => handleCheckout(false)} className="text-xs font-bold font-['Space_Grotesk'] h-8 px-4 rounded-lg transition-colors hover:scale-105"
//            style={{ background: "color-mix(in srgb, var(--th-secondary) 80%, white)", color: "var(--th-bg)" }}>Buy Key</Button>
//         </div>

//         {/* Anonymous Checkout */}
//         <div className="flex items-center justify-between p-4 rounded-xl border group transition-all" style={{ background: "color-mix(in srgb, var(--th-accent) 5%, transparent)", borderColor: "color-mix(in srgb, var(--th-accent) 20%, transparent)" }}>
//           <div>
//             <p className="font-medium text-sm transition-colors" style={{ ...SG, color: "var(--th-accent)" }}>Phantom Mode Transaction</p>
//             <p className="text-xs transition-colors" style={{color: "var(--th-muted)"}}>Complete financial anonymity via encrypted alias checkout.</p>
//           </div>
//           <Button disabled={loading} onClick={() => handleCheckout(true)} className="shadow-[0_0_15px_var(--th-glow)] text-xs font-bold font-['Space_Grotesk'] h-8 px-4 rounded-lg transition-colors hover:scale-105"
//           style={{ background: "var(--th-accent)", color: "var(--th-accent-text)" }}>Stealth Pay</Button>
//         </div>
//       </div>
//     </section>
//   );
// }

// // ─── Social Section ──────────────────────────────────────────────────────────

// function SocialSection() {
//   const [following, setFollowing] = useState<any[]>([]);
//   const [followers, setFollowers] = useState<any[]>([]);
//   const [tab, setTab] = useState<"following" | "followers">("following");

//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         const [fing, fers] = await Promise.all([
//           getFollowing().catch(() => ({ following: [] })),
//           getFollowers().catch(() => ({ followers: [] }))
//         ]);
//         setFollowing(fing.following || []);
//         setFollowers(fers.followers || []);
//       } catch {}
//     };
//     fetchData();
//   }, []);

//   const handleUnfollow = async (id: string, index: number) => {
//     try {
//       await followUser(id); // toggle
//       setFollowing(prev => prev.filter((_, i) => i !== index));
//     } catch {}
//   };

//   const activeList = tab === "following" ? following : followers;

//   return (
//     <section className="p-8 rounded-2xl border transition-colors relative overflow-hidden"
//       style={{ background: "color-mix(in srgb, var(--th-surface-low) 40%, transparent)", backdropFilter: "blur(20px)", borderColor: "var(--th-border)" }}>
//       <div className="flex items-center justify-between mb-6">
//         <h3 className="text-xl font-semibold transition-colors" style={{ ...SG, color: "var(--th-accent)" }}>Social Network</h3>
//         <div className="flex gap-2">
//            <button onClick={() => setTab("following")} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${tab === "following" ? 'opacity-100' : 'opacity-50'}`} style={{ ...SG, background: tab === "following" ? "var(--th-surface-high)" : "transparent", color: "var(--th-text)" }}>Following ({following.length})</button>
//            <button onClick={() => setTab("followers")} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${tab === "followers" ? 'opacity-100' : 'opacity-50'}`} style={{ ...SG, background: tab === "followers" ? "var(--th-surface-high)" : "transparent", color: "var(--th-text)" }}>Followers ({followers.length})</button>
//         </div>
//       </div>
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//         {activeList.length === 0 && (
//            <p className="text-sm col-span-full py-8 text-center" style={{ color: "var(--th-muted)", ...SG }}>No {tab} found.</p>
//         )}
//         {activeList.map((user: any, i: number) => (
//           <div key={user._id || i} className="flex items-center gap-4 p-4 rounded-xl border transition-all hover:scale-[1.01]" style={{ background: "var(--th-surface)", borderColor: "var(--th-border)" }}>
//             <img src={user.avatar || "/placeholder-user.jpg"} alt={user.username} className="w-12 h-12 rounded-full object-cover bg-black/10" />
//             <div className="flex-1 overflow-hidden">
//                <h4 className="font-bold text-sm truncate" style={{ color: "var(--th-text)" }}>{user.full_name || user.username}</h4>
//                <p className="text-xs truncate" style={{ color: "var(--th-muted)" }}>@{user.username}</p>
//             </div>
//             {tab === "following" && (
//               <button 
//                 onClick={() => handleUnfollow(user._id, i)}
//                 className="px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors"
//                 style={{ background: "color-mix(in srgb, var(--th-error) 15%, transparent)", color: "var(--th-error)" }}
//               >
//                 Unfollow
//               </button>
//             )}
//           </div>
//         ))}
//       </div>
//     </section>
//   );
// }

// // ─── Theme Section ────────────────────────────────────────────────────────────

// function ThemeSection() {
//   const { themeId: selectedTheme, setTheme: setSelectedTheme } = useTheme();
//   // We leave these as local UI for now since the full implementation only needs preset colors
//   const [accentColor, setAccentColor] = useState("#ffe792");
//   const [glassIntensity, setGlassIntensity] = useState(70);

//   return (
//     <section
//       className="p-8 rounded-2xl border h-full transition-colors duration-300 relative z-10"
//       style={{
//         background: "color-mix(in srgb, var(--th-surface-low) 40%, transparent)",
//         backdropFilter: "blur(20px)",
//         borderColor: "var(--th-border)",
//       }}
//     >
//       <div className="mb-8">
//         <h3
//           className="text-xl font-semibold mb-1 transition-colors"
//           style={{ ...SG, color: "var(--th-accent)" }}
//         >
//           Theme Customization
//         </h3>
//         <p
//           className="text-[10px] uppercase tracking-widest transition-colors"
//           style={{ ...SG, color: "var(--th-muted)" }}
//         >
//           Atmosphere &amp; Visuals
//         </p>
//       </div>

//       <div className="space-y-8">
//         {/* Palette Presets */}
//         <div>
//           <label
//             className="text-[10px] uppercase tracking-widest block mb-4 transition-colors"
//             style={{ ...SG, color: "var(--th-muted)" }}
//           >
//             Core Atmosphere
//           </label>
//           <div className="grid grid-cols-2 gap-4">
//             {THEMES.map((preset) => {
//               const isSelected = selectedTheme === preset.id;
//               return (
//                 <button
//                   key={preset.id}
//                   onClick={() => setSelectedTheme(preset.id as ThemeId)}
//                   className="relative flex flex-col gap-4 p-4 rounded-xl text-left transition-all"
//                   style={{
//                     background: isSelected ? "var(--th-surface-top)" : "var(--th-surface)",
//                     border: isSelected
//                       ? "2px solid var(--th-accent)"
//                       : "2px solid transparent",
//                     boxShadow: isSelected
//                       ? "0 0 0 4px var(--th-glow)"
//                       : "none",
//                     opacity: isSelected ? 1 : 0.6,
//                   }}
//                   onMouseEnter={(e) => {
//                     if (!isSelected)
//                       (e.currentTarget as HTMLElement).style.opacity = "1";
//                   }}
//                   onMouseLeave={(e) => {
//                     if (!isSelected)
//                       (e.currentTarget as HTMLElement).style.opacity = "0.6";
//                   }}
//                 >
//                   <div className="flex gap-2">
//                     {preset.swatches.map((color) => (
//                       <div
//                         key={color}
//                         className="w-6 h-6 rounded-md"
//                         style={{ background: color }}
//                       />
//                     ))}
//                   </div>
//                   <span className="text-xs font-bold transition-colors" style={{ ...SG, color: "var(--th-text)" }}>
//                     {preset.label}
//                   </span>
//                   {isSelected && (
//                     <MSIcon
//                       name="check_circle"
//                       filled
//                       className="absolute top-3 right-3 text-sm transition-colors"
//                       style={{ color: "var(--th-accent)", fontSize: "16px" }}
//                     />
//                   )}
//                 </button>
//               );
//             })}
//           </div>
//         </div>

//         {/* Glass Intensity Slider */}
//         <div>
//           <label
//             className="text-[10px] uppercase tracking-widest block mb-6 transition-colors"
//             style={{ ...SG, color: "var(--th-muted)" }}
//           >
//             Glass Morphism Intensity
//           </label>
//           <div className="relative h-1 w-full rounded-full mb-3 shadow-[inset_0_0_5px_rgba(0,0,0,0.5)]" style={{ background: "var(--th-surface-top)" }}>
//             <div
//               className="absolute top-0 left-0 h-full rounded-full transition-colors"
//               style={{ width: `${glassIntensity}%`, background: "var(--th-accent)" }}
//             />
//             <input
//               type="range"
//               min={0}
//               max={100}
//               value={glassIntensity}
//               onChange={(e) => setGlassIntensity(Number(e.target.value))}
//               className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
//             />
//             <div
//               className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full ring-4 pointer-events-none transition-all"
//               style={{
//                 left: `calc(${glassIntensity}% - 8px)`,
//                 background: "var(--th-accent)",
//                 boxShadow: "0 0 0 4px var(--th-glow)",
//               }}
//             />
//           </div>
//           <div
//             className="flex justify-between text-[10px] transition-colors"
//             style={{ ...SG, color: "var(--th-muted)", opacity: 0.6 }}
//           >
//             <span>LIQUID GLASS OFF</span>
//             <span>TOTAL GLOW</span>
//           </div>
//         </div>

//       </div>
//     </section>
//   );
// }

// // ─── Ecosystem Section ────────────────────────────────────────────────────────

// function EcosystemSection() {
//   return (
//     <div
//       className="p-8 rounded-2xl border transition-colors relative z-10"
//       style={{
//         background: "color-mix(in srgb, var(--th-surface-low) 40%, transparent)",
//         backdropFilter: "blur(20px)",
//         borderColor: "var(--th-border)",
//       }}
//     >
//       <div className="flex items-center justify-between mb-8">
//         <h3
//           className="text-xl font-semibold transition-colors"
//           style={{ ...SG, color: "var(--th-accent)" }}
//         >
//           Synchronized Ecosystem
//         </h3>
//         <button
//           className="text-xs hover:underline transition-colors"
//           style={{ color: "var(--th-secondary)" }}
//         >
//           View All Integrations
//         </button>
//       </div>

//       <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
//         {CONNECTED_APPS.map((app) => (
//           <div
//             key={app.id}
//             className="flex items-center gap-4 p-4 rounded-xl transition-colors"
//             style={{
//               background: "var(--th-surface)",
//               opacity: app.status === "disconnected" ? 0.5 : 1,
//               filter:
//                 app.status === "disconnected" ? "grayscale(100%)" : "none",
//             }}
//           >
//             <div
//               className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors"
//               style={{ background: "var(--th-surface-top)" }}
//             >
//               <img src={app.iconSrc} alt={app.name} className="w-6 h-6" />
//             </div>
//             <div>
//               <p className="text-sm font-bold transition-colors" style={{...SG, color: "var(--th-text)"}}>
//                 {app.name}
//               </p>
//               <p
//                 className="text-[10px] transition-colors"
//                 style={{ color: "var(--th-muted)", ...SG, textTransform: "capitalize" }}
//               >
//                 {app.status}
//               </p>
//             </div>
//           </div>
//         ))}

//         {/* Add new */}
//         <button
//           className="flex items-center justify-center p-4 rounded-xl border border-dashed transition-colors group cursor-pointer"
//           style={{ borderColor: "var(--th-border)", background: "transparent" }}
//           onMouseEnter={(e) =>
//             ((e.currentTarget as HTMLElement).style.background = "var(--th-surface)")
//           }
//           onMouseLeave={(e) =>
//             ((e.currentTarget as HTMLElement).style.background = "transparent")
//           }
//         >
//           <span
//             className="text-xs uppercase tracking-widest transition-colors group-hover:scale-105"
//             style={{ ...SG, color: "var(--th-muted)" }}
//           >
//             Link New Stream
//           </span>
//         </button>
//       </div>
//     </div>
//   );
// }

// // ─── Root ─────────────────────────────────────────────────────────────────────

// export default function SettingsPage() {
//   return (
//     <div
//       className="min-h-screen transition-colors duration-300 relative overflow-hidden"
//       style={{ background: "var(--th-bg)", color: "var(--th-text)" }}
//     >
//       <TopBar />
//       <Sidebar />

//       {/* Ambient glows */}
//       <div className="fixed top-[-10%] right-[-10%] w-[50%] h-[50%] blur-[120px] rounded-full pointer-events-none z-0 transition-colors"
//         style={{ background: "var(--th-glow)" }} />
//       <div className="fixed bottom-[-10%] left-[10%] w-[30%] h-[40%] blur-[120px] rounded-full pointer-events-none z-0 transition-colors"
//         style={{ background: "color-mix(in srgb, var(--th-secondary) 15%, transparent)" }} />


//       <main
//         className="px-12 pb-20 transition-all duration-300 relative z-10"
//         style={{ marginLeft: 96, paddingTop: "6rem" }}
//       >
//         {/* Page Header */}
//         <header className="mb-16">
//           <h1
//             className="text-5xl font-bold tracking-tighter mb-2 transition-colors"
//             style={{ ...SG, color: "var(--th-text)" }}
//           >
//             Account Settings
//           </h1>
//           <p className="max-w-xl transition-colors" style={{ color: "var(--th-muted)" }}>
//             Refine your digital existence within the ecosystem.
//             Personalize your interface, manage security protocols, and configure
//             your profile identity.
//           </p>
//         </header>

//         {/* Bento Grid */}
//         <div className="grid grid-cols-12 gap-8 items-start">
//           {/* Left: Profile + Security + Billing */}
//           <div className="col-span-12 lg:col-span-7 space-y-8">
//             <ProfileSection />
//             <SecuritySection />
//             <BillingSection />
//           </div>


//           {/* Right: Theme */}
//           <div className="col-span-12 lg:col-span-5 relative space-y-8">
//             <ThemeSection />
//             <SocialSection />
//           </div>

//           {/* Full width: Removed Ecosystem per requirements */}
//         </div>
//       </main>
//     </div>
//   );
// }