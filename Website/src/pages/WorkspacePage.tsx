import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Sidebar from "@/components/Sidebar";
import { toast } from "sonner";
import * as api from "@/api";

/* ─── Types ────────────────────────────────────────────────────────────────── */
type FileType = "image" | "video" | "audio" | "pdf" | "doc" | "spreadsheet" | "other" | "link";
type FileSource = "manual" | "meeting";

interface WFile {
  id: string;
  name: string;
  originalName: string;
  fileUrl: string;
  fileKey: string;
  fileType: FileType | 'folder';
  mimeType: string;
  fileSize: number;
  isFolder: boolean;
  workspace: string;

  source: FileSource;
  isPublic: boolean;
  uploadedBy: any;
  sharedBy?: { id: string; full_name: string; username: string; avatar?: string };
  sharedSource?: string;
  sharedWith: any[];
  blockedUsers: any[];
  tags: string[];
  description: string | null;
  createdAt: string;
}

/* ─── Constants ─────────────────────────────────────────────────────────────── */
const SG: React.CSSProperties = { fontFamily: "'Space Grotesk', sans-serif" };
const BASE_API = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

const FILE_TYPE_COLORS: Record<string, string> = {
  image: "#a2c2fd",
  video: "#c084fc",
  audio: "#34d399",
  pdf: "#f87171",
  doc: "#60a5fa",
  spreadsheet: "#4ade80",
  folder: "var(--th-accent)",
  other: "var(--th-muted)",
};

const FILE_TYPE_ICONS: Record<string, string> = {
  image: "image",
  video: "movie",
  audio: "audio_file",
  pdf: "picture_as_pdf",
  doc: "description",
  spreadsheet: "table_chart",
  folder: "folder",
  other: "attach_file",
  link: "public",
};


const SOURCE_ICONS: Record<FileSource, string> = {
  manual: "computer",
  meeting: "video_camera_front",
};

const fmtBytes = (b: number) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
};

/* ─── Icon helper ───────────────────────────────────────────────────────────── */
function MSIcon({
  name, filled = false, className = "", style,
}: { name: string; filled?: boolean; className?: string; style?: React.CSSProperties }) {
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

/* ─── User Search ───────────────────────────────────────────────────────────── */
function UserSearchInput({ onSelect, placeholder = "Search users..." }: { onSelect: (u: any) => void; placeholder?: string }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      try { const r = await api.searchUsers(q); setResults(r.users || []); } catch { }
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div style={{ position: "relative" }}>
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        placeholder={placeholder}
        style={{ width: "100%", background: "var(--th-surface-low)", border: "1px solid var(--th-border)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "var(--th-text)", outline: "none" }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
      />
      {open && results.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--th-surface-high)", border: "1px solid var(--th-border)", borderRadius: 10, zIndex: 100, overflow: "hidden", maxHeight: 200, overflowY: "auto" }}>
          {results.map((u) => (
            <div key={u.id || u._id} onClick={() => { onSelect(u); setQ(""); setOpen(false); }}
              style={{ padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--th-text)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--th-surface-low)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "var(--th-accent)" }}>
                {(u.full_name || u.username || "?")[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 600, color: "var(--th-text)" }}>{u.full_name || u.username}</div>
                <div style={{ fontSize: 11, color: "var(--th-muted)" }}>{u.uniqueTag || u.email}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Access Management Modal ───────────────────────────────────────────────── */
function AccessModal({ file, onClose, onUpdated }: { file: WFile; onClose: () => void; onUpdated: (f: WFile) => void }) {
  const [sharing, setSharing] = useState(false);
  const [blocking, setBlocking] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(file.isPublic);

  const addUser = async (u: any) => {
    setSharing(true);
    try {
      const r = await api.manageWorkspaceFileAccess(file.id, { action: "add", userId: u.id || u._id });
      onUpdated(r.file);
      toast.success("Access granted");
    } catch { toast.error("Failed"); } finally { setSharing(false); }
  };

  const removeUser = async (userId: string) => {
    try {
      const r = await api.manageWorkspaceFileAccess(file.id, { action: "remove", userId });
      onUpdated(r.file);
      toast.success("Access revoked");
    } catch { toast.error("Failed"); }
  };

  const blockUser = async (userId: string) => {
    setBlocking(userId);
    try {
      const r = await api.blockWorkspaceFileUser(file.id, userId, "block");
      onUpdated(r.file);
      toast.success("User blocked from this file");
    } catch { toast.error("Failed"); } finally { setBlocking(null); }
  };

  const togglePublic = async (val: boolean) => {
    try {
      const r = await api.manageWorkspaceFileAccess(file.id, { isPublic: val });
      setIsPublic(val);
      onUpdated(r.file);
      toast.success(val ? "File is now public" : "File is now private");
    } catch { toast.error("Failed"); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 500, background: "var(--th-surface)", border: "1px solid var(--th-border)", borderRadius: 20, overflow: "hidden", boxShadow: "0 40px 100px rgba(0,0,0,0.8)" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--th-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ ...SG, fontSize: 16, fontWeight: 700, color: "var(--th-accent)", margin: 0 }}>Manage Access — {file.name}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--th-muted)", cursor: "pointer" }}><MSIcon name="close" style={{ fontSize: 20 }} /></button>
        </div>

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20, maxHeight: "70vh", overflowY: "auto" }}>
          {/* Public Toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "var(--th-surface-low)", border: "1px solid var(--th-border)", borderRadius: 12 }}>
            <div>
              <div style={{ ...SG, fontWeight: 700, fontSize: 13, color: "var(--th-text)" }}>Public Link Access</div>
              <div style={{ fontSize: 11, color: "var(--th-muted)", marginTop: 4 }}>Anyone with the link can view this file</div>
            </div>
            <button
              onClick={() => togglePublic(!isPublic)}
              style={{ width: 44, height: 24, borderRadius: 12, background: isPublic ? "var(--th-accent)" : "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s" }}
            >
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: isPublic ? "var(--th-accent-text)" : "var(--th-muted)", position: "absolute", top: 3, left: isPublic ? 23 : 3, transition: "left 0.2s" }} />
            </button>
          </div>

          {/* Add collaborator */}
          <div>
            <p style={{ ...SG, fontSize: 11, color: "var(--th-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Add Collaborator</p>
            <UserSearchInput placeholder="Search users to grant access..." onSelect={addUser} />
            {sharing && <p style={{ fontSize: 12, color: "var(--th-accent)", marginTop: 6 }}>Granting access...</p>}
          </div>

          {/* Current collaborators */}
          {file.sharedWith.length > 0 && (
            <div>
              <p style={{ ...SG, fontSize: 11, color: "var(--th-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Shared With ({file.sharedWith.length})</p>
              {file.sharedWith.map((u: any) => (
                <div key={u.id || u._id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, marginBottom: 6, background: "rgba(255,255,255,0.02)" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(162,194,253,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#a2c2fd" }}>
                    {(u.full_name || "?")[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--th-text)" }}>{u.full_name}</div>
                    <div style={{ fontSize: 11, color: "var(--th-muted)" }}>{u.uniqueTag}</div>
                  </div>
                  <button onClick={() => removeUser(u.id || u._id)} style={{ background: "none", border: "none", color: "var(--th-muted)", cursor: "pointer", padding: 4 }} title="Revoke access">
                    <MSIcon name="person_remove" style={{ fontSize: 16 }} />
                  </button>
                  <button onClick={() => blockUser(u.id || u._id)} disabled={blocking === (u.id || u._id)} style={{ background: "none", border: "none", color: "var(--th-muted)", cursor: "pointer", padding: 4 }} title="Block from file">
                    <MSIcon name="block" style={{ fontSize: 16 }} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Blocked users */}
          {file.blockedUsers.length > 0 && (
            <div>
              <p style={{ ...SG, fontSize: 11, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Blocked ({file.blockedUsers.length})</p>
              {file.blockedUsers.map((u: any) => (
                <div key={u.id || u._id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, marginBottom: 6, background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.1)" }}>
                  <div style={{ flex: 1, fontSize: 13, color: "#ef4444" }}>{u.full_name}</div>
                  <button onClick={() => api.blockWorkspaceFileUser(file.id, u.id || u._id, "unblock").then((r) => { onUpdated(r.file); toast.success("Unblocked"); })} style={{ background: "none", border: "none", color: "var(--th-muted)", cursor: "pointer", fontSize: 12 }}>Unblock</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Create Folder Modal ───────────────────────────────────────────────────── */
function FolderModal({ activeWs, onClose, onCreated }: { activeWs: string | null; onClose: () => void; onCreated: (f: WFile) => void }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name.trim()) return toast.error("Folder name required");
    setLoading(true);
    try {
      const r = await api.createWorkspaceFolder(name, activeWs || "Default");
      onCreated(r.file);
      toast.success("Folder created!");
      onClose();
    } catch (e: any) { toast.error(e.message || " creation failed"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 400, background: "var(--th-surface-high)", border: "1px solid var(--th-border)", borderRadius: 24, overflow: "hidden", boxShadow: "0 40px 100px rgba(0,0,0,0.9)" }}>
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--th-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ ...SG, fontSize: 18, fontWeight: 700, color: "var(--th-accent)", margin: 0 }}>Create Folder</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--th-muted)", cursor: "pointer" }}><MSIcon name="close" style={{ fontSize: 20 }} /></button>
        </div>
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ ...SG, fontSize: 11, color: "var(--th-muted)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>Folder Name</label>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="e.g. Assets, Q4 Reports..." style={{ width: "100%", background: "var(--th-surface-low)", border: "1px solid var(--th-border)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "var(--th-text)", outline: "none", boxSizing: "border-box" }} />
          </div>
          <button onClick={submit} disabled={loading || !name.trim()} style={{ background: "var(--th-accent)", color: "var(--th-accent-text)", border: "none", borderRadius: 12, padding: "14px", fontWeight: 700, fontSize: 14, cursor: loading || !name.trim() ? "default" : "pointer", opacity: loading || !name.trim() ? 0.7 : 1, ...SG, marginTop: 8 }}>
            {loading ? "Creating..." : "Create Folder"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Upload Modal ──────────────────────────────────────────────────────────── */
function UploadModal({ workspaces, onClose, onUploaded }: { workspaces: string[]; onClose: () => void; onUploaded: (f: WFile) => void }) {
  const [tabType, setTabType] = useState<"file" | "link">("file");
  const [file, setFile] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [workspace, setWorkspace] = useState(workspaces[0] || "Default");
  const [newWs, setNewWs] = useState("");
  const [source, setSource] = useState<FileSource>("manual");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setFile(f); setName(f.name);
    if (f.type.startsWith("image/") || f.type.startsWith("video/")) setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (tabType === "file" && !file) return toast.error("Select a file first");
    if (tabType === "link" && !linkUrl.trim()) return toast.error("Enter a valid URL to share");

    setUploading(true);
    try {
      const ws = newWs.trim() || workspace;
      const r = await api.uploadWorkspaceFile(tabType === "file" ? file : null, { linkUrl: tabType === "link" ? linkUrl : undefined, name: name || (tabType === "file" ? file?.name : linkUrl), workspace: ws, source, description, tags });
      onUploaded(r.file);
      toast.success("File uploaded!");
      onClose();
    } catch (e: any) { toast.error(e.message || "Upload failed"); }
    finally { setUploading(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 520, background: "var(--th-surface)", border: "1px solid rgba(59,73,92,0.3)", borderRadius: 24, overflow: "hidden", boxShadow: "0 40px 100px rgba(0,0,0,0.9)" }}>
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid rgba(59,73,92,0.2)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 16 }}>
            <h2 onClick={() => setTabType("file")} style={{ ...SG, fontSize: 18, fontWeight: 700, color: tabType === "file" ? "var(--th-accent)" : "var(--th-muted)", cursor: "pointer", margin: 0, transition: "color 0.2s" }}>Upload File</h2>
            <h2 onClick={() => setTabType("link")} style={{ ...SG, fontSize: 18, fontWeight: 700, color: tabType === "link" ? "var(--th-accent)" : "var(--th-muted)", cursor: "pointer", margin: 0, transition: "color 0.2s" }}>Share Link</h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--th-muted)", cursor: "pointer" }}><MSIcon name="close" style={{ fontSize: 20 }} /></button>
        </div>

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16, maxHeight: "70vh", overflowY: "auto" }}>
          {tabType === "file" ? (
            <>
              {/* Drop zone */}
              <div
                onClick={() => fileRef.current?.click()}
                style={{ border: "2px dashed color-mix(in srgb, var(--th-accent) 0.25)", borderRadius: 16, minHeight: 160, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, cursor: "pointer", background: "color-mix(in srgb, var(--th-accent) 0.02)", transition: "border-color 0.2s" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "color-mix(in srgb, var(--th-accent) 0.5)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "color-mix(in srgb, var(--th-accent) 0.25)")}
              >
                {preview ? (
                  file?.type.startsWith("image/") ? <img src={preview} style={{ maxHeight: 140, borderRadius: 10, objectFit: "cover" }} /> :
                    <video src={preview} style={{ maxHeight: 140, borderRadius: 10 }} controls />
                ) : file ? (
                  <><MSIcon name={FILE_TYPE_ICONS["other"]} style={{ fontSize: 40, color: "var(--th-accent)", opacity: 0.7 }} /><p style={{ fontSize: 13, color: "var(--th-muted)" }}>{file.name}</p></>
                ) : (
                  <><MSIcon name="cloud_upload" style={{ fontSize: 48, color: "var(--th-accent)", opacity: 0.5 }} /><p style={{ fontSize: 14, color: "var(--th-muted)" }}>Click to select any file type</p><p style={{ fontSize: 11, color: "#68768b" }}>Images, Videos, Audio, PDFs, Docs, Spreadsheets</p></>
                )}
              </div>
              <input ref={fileRef} type="file" hidden onChange={handleFile} />
            </>
          ) : (
            <div>
              <label style={{ ...SG, fontSize: 11, color: "var(--th-muted)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>Website URL</label>
              <input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://example.com" style={{ width: "100%", background: "var(--th-surface-low)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "var(--th-text)", outline: "none", boxSizing: "border-box" }} />
            </div>
          )}

          {/* Name */}
          <div>
            <label style={{ ...SG, fontSize: 11, color: "var(--th-muted)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>{tabType === "file" ? "File Name" : "Link Title"}</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Custom name (optional)" style={{ width: "100%", background: "var(--th-surface-low)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "var(--th-text)", outline: "none", boxSizing: "border-box" }} />
          </div>

          {/* Workspace */}
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ ...SG, fontSize: 11, color: "var(--th-muted)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>Workspace</label>
              <select value={workspace} onChange={(e) => setWorkspace(e.target.value)} style={{ width: "100%", background: "var(--th-surface-low)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "var(--th-text)", outline: "none", boxSizing: "border-box" }}>
                {workspaces.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ ...SG, fontSize: 11, color: "var(--th-muted)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>Or Create New</label>
              <input value={newWs} onChange={(e) => setNewWs(e.target.value)} placeholder="New workspace name" style={{ width: "100%", background: "var(--th-surface-low)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "var(--th-text)", outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>

          {/* Source */}
          <div>
            <label style={{ ...SG, fontSize: 11, color: "var(--th-muted)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 8 }}>Source</label>
            <div style={{ display: "flex", gap: 8 }}>
              {(["manual", "meeting"] as FileSource[]).map(s => (
                <button key={s} onClick={() => setSource(s)} style={{ flex: 1, background: source === s ? "color-mix(in srgb, var(--th-accent) 0.15)" : "rgba(255,255,255,0.03)", border: `1px solid ${source === s ? "color-mix(in srgb, var(--th-accent) 0.4)" : "rgba(255,255,255,0.06)"}`, borderRadius: 10, padding: "8px", cursor: "pointer", color: source === s ? "var(--th-accent)" : "var(--th-muted)", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.2s" }}>
                  <MSIcon name={SOURCE_ICONS[s]} style={{ fontSize: 16 }} />{s === "manual" ? "Computer" : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ ...SG, fontSize: 11, color: "var(--th-muted)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>Tags (comma-separated)</label>
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. design, 2024, brand" style={{ width: "100%", background: "var(--th-surface-low)", border: "1px solid var(--th-border)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "var(--th-text)", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ ...SG, fontSize: 11, color: "var(--th-muted)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>Description (optional)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="What is this file about?" style={{ width: "100%", background: "var(--th-surface-low)", border: "1px solid var(--th-border)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "var(--th-text)", outline: "none", resize: "none", boxSizing: "border-box", fontFamily: "Manrope, sans-serif" }} />
          </div>

          <button onClick={submit} disabled={uploading || (tabType === "file" ? !file : !linkUrl)} style={{ background: "var(--th-accent)", color: "var(--th-accent-text)", border: "none", borderRadius: 12, padding: "14px", fontWeight: 700, fontSize: 14, cursor: uploading || (tabType === "file" ? !file : !linkUrl) ? "default" : "pointer", opacity: uploading || (tabType === "file" ? !file : !linkUrl) ? 0.7 : 1, ...SG }}>
            {uploading ? "Transmitting Artifact..." : (tabType === "file" ? "Upload to Workspace" : "Save Link to Workspace")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Share to Chat Modal ───────────────────────────────────────────────────── */
function ShareToChatModal({ file, onClose }: { file: WFile; onClose: () => void }) {
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharingTo, setSharingTo] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [chatRes, aidaRes] = await Promise.all([
          api.fetchAllUserChats(),
          api.fetchAidaConversationObj().catch(() => null)
        ]);
        const fetchedChats = chatRes.conversations || [];
        if (aidaRes && aidaRes.conversation) {
          if (!fetchedChats.some((c: any) => c._id === aidaRes.conversation._id || c.id === aidaRes.conversation._id)) {
            fetchedChats.unshift(aidaRes.conversation);
          }
        }
        setChats(fetchedChats);
      } catch {
        toast.error("Failed to load chats");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleShare = async (chatId: string) => {
    setSharingTo(chatId);
    try {
      await api.shareWorkspaceFile(chatId, file.id);
      toast.success("File shared to chat!");
      onClose();
    } catch {
      toast.error("Failed to share file");
    } finally {
      setSharingTo(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-center items-center p-4 bg-black/80 backdrop-blur-md" onClick={onClose}>
      <div className="bg-[var(--th-surface)] w-full max-w-md rounded-2xl border border-[var(--th-border)] overflow-hidden flex flex-col shadow-2xl glass" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-[var(--th-border)] bg-[var(--th-surface-low)]">
          <h2 className="text-[var(--th-text)] font-semibold truncate flex items-center gap-2">
            <MSIcon name="send" /> Share to Chat
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-colors">
            <MSIcon name="close" style={{ fontSize: 18 }} />
          </button>
        </div>
        <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {loading ? (
            <p className="text-center text-[var(--th-muted)] text-sm py-8">Loading conversations...</p>
          ) : chats.length === 0 ? (
            <p className="text-center text-[var(--th-muted)] text-sm py-8">No conversations available.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {chats.map(chat => {
                const myId = (() => { try { return JSON.parse(localStorage.getItem("user") || "{}").id; } catch { return ""; } })();
                const otherUser = chat.users?.find((u: any) => (u._id || u.id) !== myId);
                const chatName = chat.isGroupChat ? chat.chatName : (otherUser ? (otherUser.full_name || otherUser.username) : "Self");
                return (
                  <button
                    key={chat._id || chat.id}
                    onClick={() => handleShare(chat._id || chat.id)}
                    disabled={sharingTo !== null}
                    className="flex justify-between items-center w-full text-left p-3 rounded-xl border border-[var(--th-border)] bg-[var(--th-surface-low)] hover:border-[var(--th-accent)] hover:bg-[var(--th-accent)]/10 transition-all group"
                  >
                    <span className="font-semibold text-sm text-[var(--th-text)]">{chatName}</span>
                    <span className="text-[var(--th-accent)] opacity-0 group-hover:opacity-100 transition-opacity">
                      {sharingTo === (chat._id || chat.id) ? "Sending..." : "Share"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── File Card ─────────────────────────────────────────────────────────────── */
function FileCard({ file, onDelete, onAccessManage, onOpenFolder, onPreview, onShareToChat }: { file: WFile; onDelete: (id: string) => void; onAccessManage: (f: WFile) => void; onOpenFolder: (name: string) => void; onPreview?: (f: WFile) => void; onShareToChat?: (f: WFile) => void; }) {
  const [hovered, setHovered] = useState(false);
  const color = FILE_TYPE_COLORS[file.fileType] || FILE_TYPE_COLORS.other;
  const icon = FILE_TYPE_ICONS[file.fileType] || FILE_TYPE_ICONS.other;
  const proxyUrl = `${BASE_API}/workspace/file/${file.id}/proxy`;
  const isPreviewable = file.fileType === "image" || file.fileType === "video";

  const currentUser = (() => { try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; } })();
  const myId = currentUser?.id || currentUser?._id;
  const uploaderId = typeof file.uploadedBy === 'string' ? file.uploadedBy : (file.uploadedBy?._id || file.uploadedBy?.id);
  const isOwner = file.isFolder ? true : (uploaderId === myId);

  return (
    <div
      onClick={() => { if (file.isFolder) onOpenFolder(file.name); else if (onPreview) onPreview(file); }}
      className="col-span-12 md:col-span-4 rounded-xl overflow-hidden cursor-pointer border transition-all"
      style={{ background: "var(--th-surface)", borderColor: hovered ? "color-mix(in srgb, var(--th-accent) 0.3)" : "transparent", position: "relative" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Preview */}
      <div className="aspect-video relative overflow-hidden flex items-center justify-center" style={{ background: "var(--th-surface-top)" }}>
        {file.isFolder ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <MSIcon name="folder_open" style={{ fontSize: 64, color: "var(--th-accent)", opacity: 0.8 }} filled />
          </div>
        ) : isPreviewable ? (

          <>
            {file.fileType === "image" ? (
              <img src={proxyUrl} alt={file.name} className="w-full h-full object-cover transition-transform duration-500" style={{ transform: hovered ? "scale(1.05)" : "scale(1)" }} />
            ) : (
              <video src={proxyUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            )}
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(1,15,32,0.80), transparent)" }} />
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <MSIcon name={icon} style={{ fontSize: 48, color, opacity: 0.5 }} />
            <span style={{ fontSize: 10, color: "#68768b", textTransform: "uppercase", letterSpacing: "0.08em" }}>{file.mimeType?.split("/")[1] || "FILE"}</span>
          </div>
        )}

        {/* Source badge */}
        {!file.isFolder && (
          <div style={{ position: "absolute", top: 10, left: 10, display: "flex", alignItems: "center", gap: 4, background: "rgba(1,15,32,0.7)", backdropFilter: "blur(4px)", borderRadius: 6, padding: "3px 8px" }}>
            <MSIcon name={SOURCE_ICONS[file.source]} style={{ fontSize: 12, color }} />
            <span style={{ fontSize: 9, color, fontWeight: 700, textTransform: "uppercase", ...SG }}>{file.source === "manual" ? "computer" : file.source}</span>
          </div>
        )}

        {/* NEW: Shared By indicator */}
        {file.sharedBy && (
          <div style={{ position: "absolute", bottom: 10, left: 10, display: "flex", alignItems: "center", gap: 6, background: "rgba(1,15,32,0.8)", backdropFilter: "blur(4px)", borderRadius: "20px", padding: "4px 8px" }}>
            <img src={file.sharedBy.avatar || "https://ui-avatars.com/api/?name=" + file.sharedBy.username} className="w-4 h-4 rounded-full object-cover" />
            <span style={{ fontSize: 9, color: "white", fontWeight: 600, ...SG }}>Shared by {file.sharedBy.full_name || file.sharedBy.username}</span>
          </div>
        )}

        {/* Action buttons on hover */}
        {hovered && (
          <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 6 }}>
            {!file.isFolder && onPreview && (
              <button onClick={(e) => { e.stopPropagation(); onPreview(file); }} title="View Details"
                style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(162,194,253,0.2)", border: "1px solid rgba(162,194,253,0.3)", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", cursor: "pointer" }}>
                <MSIcon name="visibility" style={{ fontSize: 15, color: "#a2c2fd" }} />
              </button>
            )}

            {!file.isFolder && onShareToChat && (
              <button onClick={(e) => { e.stopPropagation(); onShareToChat(file); }} title="Share to Chat"
                style={{ width: 30, height: 30, borderRadius: "50%", background: "color-mix(in srgb, var(--th-secondary) 0.2)", border: "1px solid color-mix(in srgb, var(--th-secondary) 0.3)", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", cursor: "pointer" }}>
                <MSIcon name="send" style={{ fontSize: 15, color: "var(--th-secondary)" }} />
              </button>
            )}

            {isOwner && (
              <>
                <button onClick={(e) => { e.stopPropagation(); onAccessManage(file); }} title="Manage access"
                  style={{ width: 30, height: 30, borderRadius: "50%", background: "color-mix(in srgb, var(--th-accent) 0.2)", border: "1px solid color-mix(in srgb, var(--th-accent) 0.3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <MSIcon name="manage_accounts" style={{ fontSize: 15, color: "var(--th-accent)" }} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(file.id); }} title="Delete"
                  style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <MSIcon name="delete" style={{ fontSize: 15, color: "#ef4444" }} />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <MSIcon name={icon} style={{ fontSize: 14, color }} />
          <span className="text-[10px] uppercase" style={{ ...SG, color: "var(--th-muted)" }}>{file.fileType}</span>
          {file.isPublic && <span style={{ ...SG, fontSize: 9, color: "#4ade80", background: "rgba(74,222,128,0.1)", borderRadius: 4, padding: "1px 5px", textTransform: "uppercase", fontWeight: 700 }}>PUBLIC</span>}
        </div>
        <h3 className="font-bold text-sm truncate" style={{ ...SG, color: "var(--th-text)" }}>{file.name}</h3>
        {file.description && <p style={{ fontSize: 11, color: "var(--th-muted)", marginTop: 4, lineHeight: 1.4 }}>{file.description}</p>}
        {file.tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
            {file.tags.slice(0, 3).map(t => <span key={t} style={{ fontSize: 9, color: "var(--th-muted)", background: "rgba(255,255,255,0.04)", borderRadius: 4, padding: "2px 6px", ...SG }}>#{t}</span>)}
          </div>
        )}
        <div className="mt-4 flex justify-between items-center">
          <span className="text-[10px]" style={{ color: "rgba(158,172,195,0.6)", ...SG }}>{file.isFolder ? "--" : fmtBytes(file.fileSize || 0)}</span>
          <div className="flex items-center gap-1.5 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all">
            {file.uploadedBy && (
              <>
                <div className="w-5 h-5 rounded-full overflow-hidden border border-[var(--th-border)] bg-[var(--th-surface)] flex items-center justify-center">
                  <img src={file.uploadedBy.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${file.uploadedBy.username}`} className="w-full h-full object-cover" alt="avatar" />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-tight" style={{ color: "var(--th-muted)", ...SG }}>
                  By {file.uploadedBy.username || "System"}
                </span>
              </>
            )}
          </div>
        </div>

        {file.sharedWith.length > 0 && (
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}>
            <MSIcon name="group" style={{ fontSize: 13, color: "var(--th-muted)" }} />
            <span style={{ fontSize: 10, color: "var(--th-muted)" }}>Shared with {file.sharedWith.length} {file.sharedWith.length === 1 ? "person" : "people"}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Storage bar ───────────────────────────────────────────────────────────── */
function StorageBar({ files }: { files: WFile[] }) {
  const totalBytes = files.reduce((acc, f) => acc + f.fileSize, 0);
  const limitBytes = 20 * 1024 * 1024 * 1024; // 20 GB
  const pct = Math.min(100, (totalBytes / limitBytes) * 100);
  return (
    <div className="mt-auto p-4 rounded-xl" style={{ background: "rgba(17,39,63,0.40)", backdropFilter: "blur(24px)" }}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-[10px] uppercase" style={{ ...SG, color: "var(--th-muted)" }}>Storage</span>
        <span className="text-[10px] uppercase" style={{ ...SG, color: pct > 80 ? "#f87171" : "var(--th-accent)" }}>{pct.toFixed(1)}%</span>
      </div>
      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--th-surface-top)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct > 80 ? "#f87171" : "var(--th-accent)" }} />
      </div>
      <p className="text-[10px] mt-2" style={{ color: "rgba(158,172,195,0.60)" }}>{fmtBytes(totalBytes)} of 20 GB used • {files.length} files</p>
    </div>
  );
}

/* ─── File Preview Modal ────────────────────────────────────────────────────── */
function FilePreviewModal({ file, onClose }: { file: WFile; onClose: () => void }) {
  const proxyUrl = `${BASE_API}/workspace/file/${file.id}/proxy`;
  const isImage = file.fileType === "image";
  const isVideo = file.fileType === "video";
  const shareLink = `${window.location.origin}/workspace/file/${file.id}`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast.success("Link copied!");
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-center items-center p-4 bg-black/80 backdrop-blur-md slide-in-bottom" onClick={onClose}>
      <div className="bg-[var(--th-surface)] w-full max-w-4xl rounded-2xl border border-[var(--th-border)] overflow-hidden flex flex-col shadow-2xl glass" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-[var(--th-border)] bg-[var(--th-surface-low)]">
          <h2 className="text-[var(--th-text)] font-semibold truncate flex items-center gap-2">
            <MSIcon name={FILE_TYPE_ICONS[file.fileType] || FILE_TYPE_ICONS.other} />
            {file.name}
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={copyLink} className="w-9 h-9 rounded-xl bg-[var(--th-surface-top)] hover:bg-[var(--th-accent)]/20 hover:text-[var(--th-accent)] flex items-center justify-center text-[var(--th-muted)] border border-[var(--th-border)] transition-colors glass" title="Copy Share Link">
              <MSIcon name="link" style={{ fontSize: 18 }} />
            </button>
            {file.fileType === "link" ? (
              <a href={file.fileUrl} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-xl bg-[var(--th-surface-top)] hover:bg-[var(--th-secondary)]/20 hover:text-[var(--th-secondary)] flex items-center justify-center text-[var(--th-muted)] border border-[var(--th-border)] transition-colors glass" title="Open Link">
                <MSIcon name="open_in_new" style={{ fontSize: 18 }} />
              </a>
            ) : (
              <a href={`${proxyUrl}?download=true`} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-xl bg-[var(--th-surface-top)] hover:bg-[var(--th-secondary)]/20 hover:text-[var(--th-secondary)] flex items-center justify-center text-[var(--th-muted)] border border-[var(--th-border)] transition-colors glass" title="Download directly">
                <MSIcon name="download" style={{ fontSize: 18 }} />
              </a>
            )}
            <button onClick={onClose} className="w-9 h-9 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 flex items-center justify-center transition-colors">
              <MSIcon name="close" style={{ fontSize: 18 }} />
            </button>
          </div>
        </div>
        <div className="flex-1 bg-[var(--th-surface-top)] min-h-[400px] max-h-[75vh] flex items-center justify-center overflow-auto p-4 custom-scrollbar">
          {isImage ? (
            <img src={proxyUrl} alt={file.name} className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
          ) : isVideo ? (
            <video src={proxyUrl} controls autoPlay className="max-w-full max-h-full rounded-lg shadow-lg"></video>
          ) : file.fileType === "link" ? (
            <div className="text-center text-[var(--th-muted)] bg-[var(--th-surface)] p-12 rounded-3xl border border-[var(--th-border)] max-w-sm w-full mx-auto shadow-2xl">
              <MSIcon name="public" style={{ fontSize: 80, opacity: 0.3 }} className="mb-4 text-[var(--th-accent)]" />
              <p className="font-bold text-[var(--th-text)] text-lg mb-1 truncate">{file.name}</p>
              <p className="text-xs max-w-xs mx-auto opacity-70 mb-8 leading-relaxed">
                This is a saved website link. Click below to securely open it in a new tab.
              </p>
              <a href={file.fileUrl} target="_blank" rel="noreferrer" className="inline-flex w-full justify-center items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[var(--th-accent)] to-[var(--th-secondary)] text-[var(--th-accent-text)] font-bold text-sm shadow-xl transition-all hover:opacity-90">
                <MSIcon name="open_in_new" className="text-lg" /> Open Tab
              </a>
            </div>
          ) : (
            <div className="text-center text-[var(--th-muted)] bg-[var(--th-surface)] p-12 rounded-3xl border border-[var(--th-border)] max-w-sm w-full mx-auto shadow-2xl">
              <MSIcon name={FILE_TYPE_ICONS[file.fileType] || FILE_TYPE_ICONS.other} style={{ fontSize: 80, opacity: 0.3 }} className="mb-4 text-[var(--th-accent)]" />
              <p className="font-bold text-[var(--th-text)] text-lg mb-1 truncate">{file.name}</p>
              <p className="text-xs max-w-xs mx-auto opacity-70 mb-8 leading-relaxed">
                Preview not available for this file type natively in the browser. You can download the file to view it locally.
              </p>
              <a href={`${proxyUrl}?download=true`} target="_blank" rel="noreferrer" className="inline-flex w-full justify-center items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[var(--th-accent)] to-[var(--th-secondary)] text-[var(--th-accent-text)] font-bold text-sm shadow-xl transition-all hover:opacity-90">
                <MSIcon name="download" className="text-lg" /> Download to View
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Root ──────────────────────────────────────────────────────────────────── */
export default function WorkspacesPage() {
  const [files, setFiles] = useState<WFile[]>([]);
  const [workspaces, setWorkspaces] = useState<string[]>(["Default"]);
  const [folderDocs, setFolderDocs] = useState<any[]>([]); // Added folderDocs state
  const [activeWs, setActiveWs] = useState<string | null>(null);
  const [activeSource, setActiveSource] = useState<FileSource | null>(null);
  const [activeType, setActiveType] = useState<FileType | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [accessFile, setAccessFile] = useState<WFile | null>(null);
  const [previewFile, setPreviewFile] = useState<WFile | null>(null);
  const [shareFile, setShareFile] = useState<WFile | null>(null);

  // Context Menu Sidebar logic
  const [sidebarMenu, setSidebarMenu] = useState<{ x: number, y: number, folderId: string } | null>(null);

  const [sortMode, setSortMode] = useState<"latest" | "oldest" | "largest">("latest");
  const [isShared, setIsShared] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (isShared) {
        const r = await api.getSharedWithMeFiles();
        setFiles(r.data || r.files || []);
        setFolderDocs([]);
      } else {
        const params: any = {};
        if (activeWs) params.workspace = activeWs;
        if (activeSource) params.source = activeSource;
        if (activeType) params.type = activeType;
        if (search) params.search = search;
        const r = await api.listWorkspaceFiles(params);
        setFiles(r.files || []);
        setFolderDocs(r.folderDocs || []);
        const additionalWorkspaces = (r.files || []).filter((f: any) => f.isFolder).map((f: any) => f.name);
        if (r.workspaces?.length || additionalWorkspaces.length || r.folderDocs?.length) {
          const docNames = (r.folderDocs || []).map((fd: any) => fd.name);
          setWorkspaces([...new Set(["Default", ...r.workspaces, ...additionalWorkspaces, ...docNames])]);
        }
      }
    } catch (e: any) {

      if (e.message?.includes("401") || e.message?.includes("Unauthorized")) {
        // Not logged in — show empty state gracefully
      } else {
        toast.error("Failed to load workspace files");
      }
    } finally { setLoading(false); }
  }, [activeWs, activeSource, activeType, search, isShared]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (fileId: string) => {
    if (!confirm("Delete this file permanently?")) return;
    try {
      await api.deleteWorkspaceFile(fileId);
      setFiles(prev => prev.filter(f => f.id !== fileId));
      toast.success("File deleted");
    } catch { toast.error("Failed to delete"); }
  };

  const handleUploaded = (f: WFile) => {
    setFiles(prev => [f, ...prev]);
    if (f.isFolder) {
      setFolderDocs(prev => [...prev, f]);
    }
    if (!workspaces.includes(f.workspace)) setWorkspaces(prev => [...prev, f.workspace]);
  };

  const handleFileUpdated = (updated: WFile) => {
    setFiles(prev => prev.map(f => f.id === updated.id ? updated : f));
    setAccessFile(updated);
  };

  const sorted = [...files].sort((a, b) => {
    if (sortMode === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (sortMode === "largest") return b.fileSize - a.fileSize;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const QUICK_FILTERS: { id: FileType; icon: string; label: string }[] = [
    { id: "image", icon: "image", label: "Images" },
    { id: "video", icon: "movie", label: "Videos" },
    { id: "audio", icon: "audio_file", label: "Audio" },
    { id: "pdf", icon: "picture_as_pdf", label: "PDFs" },
    { id: "doc", icon: "description", label: "Docs" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--th-bg)", color: "var(--th-text)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Manrope:wght@300;400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap');
        body { font-family: 'Manrope', sans-serif; }
        .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: var(--th-bg); }
        ::-webkit-scrollbar-thumb { background: #3b495c; border-radius: 10px; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {showUpload && <UploadModal workspaces={workspaces} onClose={() => setShowUpload(false)} onUploaded={handleUploaded} />}
      {showFolderModal && <FolderModal activeWs={activeWs} onClose={() => setShowFolderModal(false)} onCreated={handleUploaded} />}
      {accessFile && <AccessModal file={accessFile} onClose={() => setAccessFile(null)} onUpdated={handleFileUpdated} />}
      {previewFile && <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
      {shareFile && <ShareToChatModal file={shareFile} onClose={() => setShareFile(null)} />}

      {/* Sidebar Folder Context Menu */}
      {sidebarMenu && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000 }} onClick={() => setSidebarMenu(null)} onContextMenu={(e) => { e.preventDefault(); setSidebarMenu(null); }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", top: sidebarMenu.y, left: sidebarMenu.x, background: "#0c2037", border: "1px solid rgba(59,73,92,0.4)", borderRadius: 12, padding: "8px", width: 180, display: "flex", flexDirection: "column", gap: 4, boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}>
            <button
              onClick={() => {
                const doc = folderDocs.find(f => f.id === sidebarMenu.folderId);
                if (doc) setAccessFile({ ...doc, isFolder: true, sharedWith: [], blockedUsers: [] } as any); // Partial fill placeholder for fetching true details or passing ID
                setSidebarMenu(null);
              }}
              style={{ background: "transparent", color: "var(--th-text)", border: "none", padding: "10px 12px", textAlign: "left", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 13, transition: "background 0.2s" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(162,194,253,0.15)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <MSIcon name="share" style={{ fontSize: 16 }} /> Share Link
            </button>
            <button
              onClick={() => {
                handleDelete(sidebarMenu.folderId);
                setSidebarMenu(null);
              }}
              style={{ background: "transparent", color: "#ef4444", border: "none", padding: "10px 12px", textAlign: "left", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 13, transition: "background 0.2s" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(239,68,68,0.1)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <MSIcon name="delete" style={{ fontSize: 16 }} /> Delete Folder
            </button>
          </div>
        </div>
      )}

      <Sidebar />



      {/* Top Bar */}
      <header className="fixed top-0 right-0 z-40 h-20 px-10 flex justify-between items-center bg-[var(--th-bg)]/80 backdrop-blur-xl border-b border-[var(--th-border)]"
        style={{ left: "85px" }}>
        <h1 className="text-xl font-bold tracking-widest text-[var(--th-accent)] uppercase mr-6" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          WORK
        </h1>
        <div className="flex items-center gap-6 flex-1">
          <div className="relative w-full max-w-md">
            <MSIcon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--th-muted)", fontSize: "18px" }} />
            <Input
              placeholder="Search files, folders, tags..."
              className="w-full border-none rounded-xl py-2.5 pl-12 pr-4 text-sm focus-visible:ring-2 focus-visible:ring-yellow-300/20"
              style={{ background: "var(--th-surface-top)", color: "var(--th-text)" }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={() => setShowFolderModal(true)}
            className="flex items-center gap-2 rounded-xl font-bold transition-all hover:scale-[1.02]"
            style={{ background: "rgba(162,194,253,0.1)", color: "#a2c2fd", border: "1px solid rgba(162,194,253,0.2)", padding: "10px 16px", ...SG }}
          >
            <MSIcon name="create_new_folder" className="text-sm" />
            CREATE FOLDER
          </Button>
          <Button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 rounded-xl font-bold border-0 transition-all hover:scale-[1.02]"
            style={{ background: "var(--th-accent)", color: "var(--th-accent-text)", padding: "10px 20px", ...SG }}
          >
            <MSIcon name="add_circle" className="text-sm" />
            UPLOAD FILE
          </Button>
          <div className="flex items-center gap-6 ml-2">
            <div className="w-10 h-10 rounded-full bg-[var(--th-surface-high)] flex items-center justify-center cursor-pointer border border-[var(--th-border)] overflow-hidden">
              <img src={(() => { try { return JSON.parse(localStorage.getItem("user") || "{}").avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=user`; } catch { return ''; } })()} className="w-full h-full object-cover" alt="Avatar" />
            </div>
          </div>
        </div>
      </header>

      <main className="flex overflow-hidden" style={{ marginLeft: "85px", paddingTop: "80px", height: "100vh" }}>
        {/* Left Sidebar */}
        <aside className="w-72 flex flex-col gap-6 overflow-y-auto p-8 shrink-0" style={{ background: "var(--th-surface)" }}>
          {/* Main buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => { setIsShared(false); setActiveWs(null); setActiveSource(null); setActiveType(null); }}
              className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 border-0 transition-all"
              style={{ ...SG, background: !isShared && !activeWs && !activeSource && !activeType ? "var(--th-accent)" : "rgba(17,39,63,0.5)", color: !isShared && !activeWs && !activeSource && !activeType ? "var(--th-accent-text)" : "var(--th-muted)", cursor: "pointer" }}
            >
              <MSIcon name="folder_open" className="text-sm" />ALL FILES
            </button>
            <button
              onClick={() => { setIsShared(true); setActiveWs(null); setActiveSource(null); setActiveType(null); }}
              className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 border-0 transition-all"
              style={{ ...SG, background: isShared ? "var(--th-accent)" : "rgba(17,39,63,0.5)", color: isShared ? "var(--th-accent-text)" : "var(--th-muted)", cursor: "pointer" }}
            >
              <MSIcon name="group" className="text-sm" />SHARED WITH ME
            </button>
          </div>

          {/* Workspaces */}
          <nav className="space-y-6">
            <div>
              <h3 className="text-[10px] uppercase tracking-[0.2em] mb-4" style={{ ...SG, color: "var(--th-muted)" }}>Workspaces</h3>
              <ul className="space-y-1">
                {workspaces.map(ws => {
                  const doc = folderDocs.find(f => f.name === ws);
                  return (
                    <li key={ws}>
                      <a href="#"
                        onClick={(e) => { e.preventDefault(); setIsShared(false); setActiveWs(ws === activeWs ? null : ws); }}
                        onContextMenu={(e) => {
                          if (doc) {
                            e.preventDefault();
                            setSidebarMenu({ x: e.clientX, y: e.clientY, folderId: doc.id });
                          }
                        }}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all"
                        style={activeWs === ws ? { background: "var(--th-surface-top)", color: "var(--th-accent)", fontWeight: 500 } : { color: "var(--th-muted)" }}>
                        <MSIcon name={activeWs === ws ? "folder_open" : "folder"} className="text-lg" />
                        {ws}
                      </a>
                    </li>
                  );
                })}
              </ul>

            </div>

            {/* Quick Filters - File types */}
            <div>
              <h3 className="text-[10px] uppercase tracking-[0.2em] mb-4" style={{ ...SG, color: "var(--th-muted)" }}>File Types</h3>
              <ul className="space-y-1">
                {QUICK_FILTERS.map(f => (
                  <li key={f.id}>
                    <a href="#" onClick={(e) => { e.preventDefault(); setIsShared(false); setActiveType(activeType === f.id ? null : f.id); }}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all"
                      style={activeType === f.id ? { background: "rgba(17,39,63,0.30)", color: FILE_TYPE_COLORS[f.id] } : { color: "var(--th-muted)" }}>
                      <MSIcon name={f.icon} className="text-lg" style={{ color: activeType === f.id ? FILE_TYPE_COLORS[f.id] : undefined }} />
                      {f.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Source Filters */}
            <div>
              <h3 className="text-[10px] uppercase tracking-[0.2em] mb-4" style={{ ...SG, color: "var(--th-muted)" }}>Source</h3>
              <ul className="space-y-1">
                {(["manual", "meeting"] as FileSource[]).map(s => (
                  <li key={s}>
                    <a href="#" onClick={(e) => { e.preventDefault(); setIsShared(false); setActiveSource(activeSource === s ? null : s); }}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all"
                      style={activeSource === s ? { background: "rgba(17,39,63,0.30)", color: "var(--th-accent)" } : { color: "var(--th-muted)" }}>
                      <MSIcon name={SOURCE_ICONS[s]} className="text-lg" />
                      From {s === "manual" ? "Computer" : s.charAt(0).toUpperCase() + s.slice(1)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          <StorageBar files={files} />
        </aside>

        {/* Main grid */}
        <section className="flex-1 overflow-y-auto p-10" style={{ background: "var(--th-bg)" }}>
          {/* Page Header */}
          <header className="flex justify-between items-end mb-10">
            <div>
              <nav className="flex items-center gap-2 text-[10px] uppercase tracking-widest mb-2" style={{ ...SG, color: "var(--th-muted)" }}>
                <span>Workspaces</span>
                <MSIcon name="chevron_right" className="text-xs" style={{ fontSize: "14px" }} />
                <span style={{ color: "var(--th-accent)" }}>{isShared ? "Shared with me" : (activeWs || "All Files")}</span>
                {!isShared && activeSource && <><MSIcon name="chevron_right" className="text-xs" style={{ fontSize: "14px" }} /><span style={{ color: "#a2c2fd" }}>From {activeSource}</span></>}
              </nav>
              <h1 className="text-4xl font-bold tracking-tight" style={{ ...SG, color: "var(--th-text)" }}>
                {isShared ? "Shared with me" : (activeWs || "All Files")}
              </h1>
              <p style={{ ...SG, fontSize: 12, color: "#68768b", marginTop: 4 }}>{sorted.length} {sorted.length === 1 ? "file" : "files"} {loading ? "— loading..." : ""}</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Sort */}
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as typeof sortMode)}
                style={{ background: "#0c2037", border: "1px solid rgba(59,73,92,0.1)", color: "var(--th-text)", borderRadius: 10, padding: "8px 12px", fontSize: 12, cursor: "pointer", ...SG, outline: "none" }}
              >
                <option value="latest">Latest First</option>
                <option value="oldest">Oldest First</option>
                <option value="largest">Largest First</option>
              </select>
              <button onClick={load} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(59,73,92,0.1)", color: "var(--th-muted)", borderRadius: 10, padding: "8px 10px", cursor: "pointer" }}>
                <MSIcon name="refresh" style={{ fontSize: 18 }} />
              </button>
            </div>
          </header>

          {/* Empty state */}
          {!loading && sorted.length === 0 && (
            <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--th-muted)" }}>
              <MSIcon name="folder_open" style={{ fontSize: 64, opacity: 0.2, display: "block", margin: "0 auto 20px" }} />
              <p style={{ ...SG, fontSize: 18, fontWeight: 700, color: "var(--th-text)", marginBottom: 8 }}>No files here yet</p>
              <p style={{ fontSize: 13 }}>Upload your first file or create a folder</p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24 }}>
                <button onClick={() => setShowFolderModal(true)} style={{ background: "rgba(162,194,253,0.1)", color: "#a2c2fd", border: "1px solid rgba(162,194,253,0.2)", borderRadius: 12, padding: "12px 24px", fontWeight: 700, cursor: "pointer", ...SG }}>
                  Create Folder
                </button>
                <button onClick={() => setShowUpload(true)} style={{ background: "var(--th-accent)", color: "#1a0a00", border: "none", borderRadius: 12, padding: "12px 24px", fontWeight: 700, cursor: "pointer", ...SG }}>
                  Upload a File
                </button>
              </div>
            </div>
          )}

          {/* File Cards Grid */}
          {sorted.length > 0 && (
            <div className="grid grid-cols-12 gap-8" style={{ animation: "fadeUp 0.2s ease" }}>
              {sorted.map(f => (
                <FileCard
                  key={f.id}
                  file={f}
                  onDelete={handleDelete}
                  onAccessManage={(file) => setAccessFile(file)}
                  onOpenFolder={(name) => setActiveWs(name)}
                  onPreview={(f) => setPreviewFile(f)}
                  onShareToChat={(f) => setShareFile(f)}
                />
              ))}
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="grid grid-cols-12 gap-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="col-span-12 md:col-span-4 rounded-xl overflow-hidden" style={{ background: "var(--th-surface)", height: 280, animation: "pulse 1.5s infinite" }} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}