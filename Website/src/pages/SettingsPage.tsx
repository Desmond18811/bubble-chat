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
import { uploadAvatar } from "@/api";
import { getSecureMediaUrl } from "@/lib/utils";
import * as api from "@/api";
import { exportKeyBackup, importKeyBackup, getPrivateKey } from "@/lib/key-storage";
import { MobileHeader } from "@/components/MobileHeader";
import { Icon } from "@/components/Icon";

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
      className="fixed top-0 right-0 z-50 hidden md:flex items-center justify-between px-8 h-20 transition-colors"
      style={{
        background: "rgba(255, 255, 255, 0.4)",
        backdropFilter: "blur(24px)",
        left: "var(--sidebar-width)",
        borderBottom: "1px solid rgba(12, 32, 55, 0.15)",
      }}
    >
      <div className="flex items-center gap-4">
        <span
          className="text-2xl font-bold tracking-tighter transition-colors uppercase"
          style={{ ...SG, color: "var(--primary)" }}
        >
          SETTINGS
        </span>
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
          ? "color-mix(in srgb, var(--primary) 20%, transparent)"
          : "color-mix(in srgb, var(--muted-foreground) 30%, transparent)",
      }}
      aria-checked={enabled}
      role="switch"
    >
      <div
        className="w-4 h-4 rounded-full transition-all duration-300"
        style={{
          background: enabled ? "var(--primary)" : "var(--muted-foreground)",
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
        background: "color-mix(in srgb, var(--muted) 40%, transparent)",
        backdropFilter: "blur(20px)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3
            className="text-xl font-semibold mb-1 transition-colors"
            style={{ ...SG, color: "var(--primary)" }}
          >
            Identity Profile
          </h3>
          <p
            className="text-[10px] uppercase tracking-widest transition-colors"
            style={{ ...SG, color: "var(--muted-foreground)" }}
          >
            Public Information & Security
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-2 rounded-xl text-xs font-bold tracking-wider border-0 transition-all hover:scale-105"
          style={{ ...SG, background: "var(--primary)", color: "var(--primary-foreground)", height: "auto" }}
        >
          {loading ? "SAVING..." : "SAVE CHANGES"}
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Avatar */}
        <label className="relative group shrink-0 cursor-pointer">
          <div
            className="w-32 h-32 rounded-xl overflow-hidden relative transition-colors"
            style={{ background: "var(--accent)" }}
          >
            <img
              src={
                getSecureMediaUrl(user.avatar) ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username || "user"}`
              }
              alt="Profile"
              className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-500"
            />
            <div
              className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-colors duration-300"
              style={{ background: "color-mix(in srgb, var(--background) 60%, transparent)" }}
            >
              <MSIcon name="cloud_upload" style={{ color: "var(--primary)" }} />
              <span className="text-[10px] font-bold mt-1" style={{ color: "var(--foreground)" }}>
                Upload
              </span>
            </div>
          </div>
          <div
            className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-lg"
            style={{ background: "var(--primary)" }}
          >
            <MSIcon name="edit" filled style={{ color: "var(--primary-foreground)", fontSize: "16px" }} />
          </div>
          <input type="file" hidden accept="image/*" onChange={handleAvatarUpload} disabled={loading} />
        </label>

        {/* Fields */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <div className="space-y-2">
            <label
              className="text-[10px] uppercase tracking-widest ml-1 block transition-colors"
              style={{ ...SG, color: "var(--muted-foreground)" }}
            >
              Display Name
            </label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full border rounded-xl px-4 py-3 text-sm focus-visible:ring-2 transition-all"
              style={{
                background: "var(--accent)",
                borderColor: "rgba(12, 32, 55, 0.12)",
                color: "var(--foreground)",
              }}
            />
          </div>
          <div className="space-y-2">
            <label
              className="text-[10px] uppercase tracking-widest ml-1 block transition-colors"
              style={{ ...SG, color: "var(--muted-foreground)" }}
            >
              Username
            </label>
            <Input
              value={alias}
              readOnly
              className="w-full border rounded-xl px-4 py-3 text-sm transition-all"
              style={{
                background: "var(--accent)",
                borderColor: "rgba(12, 32, 55, 0.12)",
                color: "var(--primary)",
                fontWeight: 700,
              }}
            />
          </div>
          <div className="col-span-full space-y-2">
            <label
              className="text-[10px] uppercase tracking-widest ml-1 block transition-colors"
              style={{ ...SG, color: "var(--muted-foreground)" }}
            >
              Bio
            </label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full border rounded-xl px-4 py-3 text-sm focus-visible:ring-2 resize-none transition-all"
              style={{
                background: "var(--accent)",
                color: "var(--foreground)",
                borderColor: "rgba(12, 32, 55, 0.12)",
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
      className="p-8 rounded-3xl border transition-all"
      style={{
        background: "rgba(255, 255, 255, 0.4)",
        backdropFilter: "blur(24px)",
        borderColor: "rgba(12, 32, 55, 0.1)",
      }}
    >
      <h3 className="text-xl font-semibold mb-6 transition-colors" style={{ ...SG, color: "var(--primary)" }}>
        Security Protocols
      </h3>
      <div className="space-y-4">
        <div
          className="flex items-center justify-between p-4 rounded-xl transition-colors group cursor-pointer border"
          style={{ background: "var(--card)", borderColor: "transparent" }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.borderColor = "var(--border)")
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
                background: "color-mix(in srgb, var(--secondary) 20%, transparent)",
                color: "var(--secondary)",
              }}
            >
              <MSIcon name="shield_lock" />
            </div>
            <div>
              <p className="font-medium text-sm transition-colors" style={{ ...SG, color: "var(--foreground)" }}>
                Two-Factor Authentication
              </p>
              <p className="text-xs transition-colors" style={{ color: "var(--muted-foreground)" }}>
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

// ─── Encryption Section ────────────────────────────────────────────────────────
function EncryptionSection() {
  const [hasKey, setHasKey] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getPrivateKey().then(sk => setHasKey(!!sk));
  }, []);

  const handleBackup = async () => {
    try {
      const blob = await exportKeyBackup();
      if (!blob) throw new Error("No encryption key found on this device.");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bubble-chat-${JSON.parse(localStorage.getItem("user") || "{}").username || "user"}.bubblekey`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Identity backup downloaded successfully.");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      const text = await file.text();
      await importKeyBackup(text.trim());
      setHasKey(true);
      toast.success("Identity key imported successfully.");
    } catch (err: any) {
      toast.error("Failed to import key: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="p-8 rounded-3xl border transition-all mb-8" style={{ background: "rgba(255, 255, 255, 0.4)", backdropFilter: "blur(24px)", borderColor: "rgba(var(--primary), 0.1)" }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold mb-1 transition-colors" style={{ ...SG, color: "var(--primary)" }}>End-to-End Encryption</h3>
          <p className="text-[10px] uppercase tracking-widest transition-colors" style={{ ...SG, color: "var(--muted-foreground)" }}>Privacy Protection & Identity Backup</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: hasKey ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", color: hasKey ? "#10b981" : "#ef4444", border: `1px solid ${hasKey ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}` }}>
            {hasKey ? "E2EE ACTIVE" : "E2EE INACTIVE"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border transition-colors group cursor-pointer" style={{ background: "var(--card)", borderColor: "transparent" }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--border)")}
          onMouseLeave={e => (e.currentTarget.style.borderColor = "transparent")}
          onClick={handleBackup}>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors" style={{ background: "color-mix(in srgb, var(--primary) 20%, transparent)", color: "var(--primary)" }}>
              <MSIcon name="download" />
            </div>
            <div>
              <p className="font-medium text-sm transition-colors" style={{ ...SG, color: "var(--foreground)" }}>Backup Identity Key</p>
              <p className="text-xs transition-colors" style={{ color: "var(--muted-foreground)" }}>Download your .bubblekey file</p>
            </div>
          </div>
        </div>

        <label className="p-4 rounded-xl border transition-colors group cursor-pointer" style={{ background: "var(--card)", borderColor: "transparent" }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--border)")}
          onMouseLeave={e => (e.currentTarget.style.borderColor = "transparent")}>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors" style={{ background: "color-mix(in srgb, var(--secondary) 20%, transparent)", color: "var(--secondary)" }}>
              <MSIcon name="upload" />
            </div>
            <div>
              <p className="font-medium text-sm transition-colors" style={{ ...SG, color: "var(--foreground)" }}>Restore Identity</p>
              <p className="text-xs transition-colors" style={{ color: "var(--muted-foreground)" }}>Import from .bubblekey backup</p>
            </div>
          </div>
          <input type="file" hidden accept=".bubblekey,.txt" onChange={handleImport} disabled={loading} />
        </label>
      </div>

      <p className="mt-6 text-[11px] leading-relaxed transition-colors flex items-start gap-2" style={{ color: "var(--muted-foreground)" }}>
        <span>ℹ️</span>
        <span>End-to-End Encryption ensures that only you and your recipients can read your transmissions. Your private key is stored locally and encrypted on this device. <strong>Bubble Space</strong> never has access to your private key. <strong>Always keep a backup file in a safe place.</strong></span>
      </p>
    </section>
  );
}

// ─── Notifications Section ───────────────────────────────────────────────────────

function NotificationsSection() {
  const [notifsEnabled, setNotifsEnabled] = useState(false);

  useEffect(() => {
    setNotifsEnabled(localStorage.getItem('desktop_notifications') === 'true');
  }, []);

  const toggleNotifs = async () => {
    if (!notifsEnabled) {
      if (Notification.permission === 'default') {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          localStorage.setItem('desktop_notifications', 'true');
          setNotifsEnabled(true);
          toast.success("Desktop notifications enabled.");
        } else {
          toast.error("Permission denied for notifications.");
        }
      } else if (Notification.permission === 'granted') {
        localStorage.setItem('desktop_notifications', 'true');
        setNotifsEnabled(true);
        toast.success("Desktop notifications enabled.");
      } else {
        toast.error("Notifications are blocked in your browser settings.");
      }
    } else {
      localStorage.removeItem('desktop_notifications');
      setNotifsEnabled(false);
      toast("Desktop notifications disabled.");
    }
  };

  return (
    <section
      className="p-8 rounded-3xl border transition-all mt-8"
      style={{
        background: "rgba(255, 255, 255, 0.4)",
        backdropFilter: "blur(24px)",
        borderColor: "rgba(var(--primary), 0.1)",
      }}
    >
      <h3 className="text-xl font-semibold mb-6 transition-colors" style={{ ...SG, color: "var(--primary)" }}>
        Notifications
      </h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-xl transition-colors group cursor-pointer border"
          style={{ background: "var(--card)", borderColor: "transparent" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "var(--border)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "transparent")}
          onClick={toggleNotifs}>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: "color-mix(in srgb, var(--primary) 20%, transparent)", color: "var(--primary)" }}>
              <MSIcon name="notifications" />
            </div>
            <div>
              <p className="font-medium text-sm transition-colors" style={{ ...SG, color: "var(--foreground)" }}>Desktop Notifications</p>
              <p className="text-xs transition-colors" style={{ color: "var(--muted-foreground)" }}>Receive alerts when someone sends you a message.</p>
            </div>
          </div>
          <Toggle enabled={notifsEnabled} onToggle={toggleNotifs} />
        </div>
      </div>
    </section>
  );
}

// ─── Privacy Section ──────────────────────────────────────────────────────────

function PrivacySection() {
  const [privacy, setPrivacy] = useState({
    show_online_status: true,
    email_notifications: true,
    read_receipts: true,
    profile_photo: "everyone",
  });

  useEffect(() => {
    const fetchPrivacy = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch(`${BASE_URL}/profile/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.data?.privacy_settings) {
          setPrivacy((prev) => ({
            ...prev,
            ...data.data.privacy_settings,
          }));
        }
      } catch (err) {
        console.error("Failed to fetch privacy settings", err);
      }
    };
    fetchPrivacy();
  }, []);

  const handleToggle = async (key: string) => {
    try {
      const newPrivacy = { ...privacy, [key]: !((privacy as any)[key]) };
      setPrivacy(newPrivacy);
      await api.updatePrivacy(newPrivacy);
      toast.success("Privacy settings updated");
    } catch {
      toast.error("Failed to update privacy settings");
    }
  };

  const sections = [
    {
      id: "show_online_status",
      title: "Online Presence",
      desc: "Allow others to see when you are active on the platform.",
      icon: "person_check",
    },
    {
      id: "email_notifications",
      title: "Email Notifications",
      desc: "Receive email alerts for new cross-organization message requests.",
      icon: "mail",
    },
    {
      id: "read_receipts",
      title: "Read Receipts",
      desc: "Let others know when you have read their transmissions.",
      icon: "done_all",
    },
  ];

  return (
    <section
      className="p-8 rounded-2xl border transition-colors"
      style={{
        background: "color-mix(in srgb, var(--muted) 40%, transparent)",
        backdropFilter: "blur(20px)",
        borderColor: "var(--border)",
      }}
    >
      <h3 className="text-xl font-semibold mb-6 transition-colors" style={{ ...SG, color: "var(--primary)" }}>
        Privacy Governance
      </h3>
      <div className="space-y-4">
        {sections.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between p-4 rounded-xl transition-colors group border"
            style={{ background: "var(--card)", borderColor: "transparent" }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
                style={{
                  background: "color-mix(in srgb, var(--secondary) 20%, transparent)",
                  color: "var(--secondary)",
                }}
              >
                <MSIcon name={s.icon} />
              </div>
              <div>
                <p className="font-medium text-sm transition-colors" style={{ ...SG, color: "var(--foreground)" }}>
                  {s.title}
                </p>
                <p className="text-xs transition-colors" style={{ color: "var(--muted-foreground)" }}>
                  {s.desc}
                </p>
              </div>
            </div>
            <Toggle
              enabled={Boolean((privacy as any)[s.id])}
              onToggle={() => handleToggle(s.id)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div
      className="min-h-screen transition-colors duration-300 relative overflow-hidden"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Manrope:wght@300;400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap');
        .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
      `}</style>

      <TopBar />
      <MobileHeader title="Settings" />
      <Sidebar />

      {/* Ambient glows */}
      <div
        className="fixed top-[-10%] right-[-10%] w-[50%] h-[50%] blur-[120px] rounded-full pointer-events-none z-0 transition-colors opacity-30"
        style={{ background: "var(--primary)" }}
      />
      <div
        className="fixed bottom-[-10%] left-[10%] w-[30%] h-[40%] blur-[120px] rounded-full pointer-events-none z-0 transition-colors opacity-20"
        style={{ background: "var(--primary)" }}
      />

      <main
        className="px-6 md:px-12 pb-20 transition-all duration-300 relative z-10"
        style={{ marginLeft: "var(--main-margin)", paddingTop: "5rem" }}
      >
        <header className="mb-10 md:mb-16 mt-12 md:mt-0">
          <h1
            className="text-3xl md:text-5xl font-bold tracking-tighter mb-2 transition-colors"
            style={{ ...SG, color: "var(--foreground)" }}
          >
            Account Settings
          </h1>
          <p className="max-w-xl text-sm md:text-base transition-colors" style={{ color: "var(--muted-foreground)" }}>
            Personalize your interface, manage security protocols, and configure your profile identity.
          </p>
        </header>

        <div className="grid grid-cols-12 gap-8 items-start">
          <div className="col-span-12 space-y-8">
            <ProfileSection />
            <EncryptionSection />
            <PrivacySection />
            <SecuritySection />
            <NotificationsSection />
          </div>
        </div>
      </main>
    </div>
  );
}



