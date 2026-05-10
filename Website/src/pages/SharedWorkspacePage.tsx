import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AvatarInitials } from "@/components/AvatarInitials";
import * as api from "@/api";

/* ─── Types & Config ─── */
const SG: React.CSSProperties = { fontFamily: "'Space Grotesk', sans-serif" };
const BASE_API = (import.meta.env.VITE_API_URL?.replace(/ i$/, '')?.trim()) || "http://localhost:3000/api/v1";

const FILE_TYPE_COLORS: Record<string, string> = {
  image: "#a2c2fd", video: "#c084fc", audio: "#34d399", pdf: "#f87171",
  doc: "#60a5fa", spreadsheet: "#4ade80", folder: "#ffe792", other: "#9eacc3",
};
const FILE_TYPE_ICONS: Record<string, string> = {
  image: "image", video: "movie", audio: "audio_file", pdf: "picture_as_pdf",
  doc: "description", spreadsheet: "table_chart", folder: "folder", other: "attach_file",
};

function MSIcon({ name, className = "", style }: { name: string; className?: string; style?: React.CSSProperties }) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24", ...style }}
    >
      {name}
    </span>
  );
}

const fmtBytes = (b: number) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
};

export default function SharedWorkspacePage() {
  const { folderId } = useParams();
  const navigate = useNavigate();
  const [folder, setFolder] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    if (!localStorage.getItem("access_token")) return;
    const BASE = (import.meta.env.VITE_API_URL?.replace(/ i$/, '')?.trim()) || "http://localhost:3000/api/v1";
    fetch(`${BASE}/profile/me`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
    })
      .then(r => r.json())
      .then(j => { if (j.data) setUserData(j.data); })
      .catch(() => { });
  }, []);

  useEffect(() => {
    if (!folderId) return;
    const fetchShared = async () => {
      try {
        const res = await api.getSharedWorkspaceFolder(folderId);
        setFolder(res.folder);
        setFiles(res.files || []);
      } catch (e: any) {
        toast.error("This workspace is not public or does not exist.");
        navigate("/");
      } finally {
        setLoading(false);
      }
    };
    fetchShared();
  }, [folderId, navigate]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: "#010f20", color: "#d8e6ff" }}>Loading workspace...</div>;
  }

  if (!folder) return null;

  return (
    <div className="min-h-screen" style={{ background: "#010f20", color: "#d8e6ff" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Manrope:wght@300;400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap');
        body { font-family: 'Manrope', sans-serif; }
        .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
      `}</style>

      {/* Navbar Minimal */}
      <header className="px-10 py-6 border-b border-[rgba(59,73,92,0.2)] flex justify-between items-center" style={{ background: "#031427" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl" style={{ background: "linear-gradient(135deg, #ffd709, #ffe792)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(255, 215, 9, 0.3)" }}>
            <span style={{ fontSize: 18, color: "#1a0a00" }} className="material-symbols-outlined">bubble_chart</span>
          </div>
          <span style={{ ...SG, fontSize: 18, fontWeight: 700, color: "#d8e6ff" }}>Bubble space</span>
        </div>
        {!localStorage.getItem("access_token") ? (
          <button onClick={() => navigate("/login")} style={{ ...SG, background: "rgba(255,231,146,0.1)", color: "#ffe792", border: "1px solid rgba(255,231,146,0.2)", borderRadius: 10, padding: "8px 16px", cursor: "pointer", fontWeight: 700 }}>
            Sign In
          </button>
        ) : (
          <div className="w-10 h-10 rounded-xl overflow-hidden border shrink-0" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
            <AvatarInitials name={userData?.full_name || userData?.username || "U"} url={userData?.avatar} className="text-sm" />
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto py-12 px-8">
        <header className="mb-12">
          {/* ── Folder Title ── */}
          <h1 className="text-4xl font-bold tracking-tight mb-2" style={{ ...SG, color: "#d8e6ff" }}>{folder.name}</h1>
          {folder.description && <p style={{ color: "#9eacc3", fontSize: 15, maxWidth: "600px", marginBottom: 24 }}>{folder.description}</p>}

          {/* ── Sharer Contact Card ── */}
          {folder.uploadedBy && (
            <div style={{ display: "flex", alignItems: "center", gap: 16, background: "rgba(162,194,253,0.06)", border: "1px solid rgba(162,194,253,0.15)", borderRadius: 16, padding: "16px 20px", maxWidth: 520, marginTop: 16 }}>
              {/* Avatar */}
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(162,194,253,0.2)", border: "2px solid rgba(162,194,253,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#a2c2fd", flexShrink: 0, overflow: "hidden" }}>
                {folder.uploadedBy.avatar
                  ? <img src={folder.uploadedBy.avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="avatar" />
                  : (folder.uploadedBy.full_name || "?")[0].toUpperCase()
                }
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ ...SG, fontSize: 14, fontWeight: 700, color: "#d8e6ff" }}>{folder.uploadedBy.full_name || folder.uploadedBy.username}</span>
                  {folder.uploadedBy.username && (
                    <span style={{ fontSize: 11, color: "#68768b", fontFamily: "monospace" }}>@{folder.uploadedBy.username}</span>
                  )}
                </div>

                {(folder.uploadedBy.org_role || folder.uploadedBy.organization) && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <MSIcon name="business" style={{ fontSize: 13, color: "#9eacc3" }} />
                    <span style={{ fontSize: 12, color: "#9eacc3" }}>
                      {folder.uploadedBy.org_role ? `${folder.uploadedBy.org_role} at ` : ""}{folder.uploadedBy.organization}
                    </span>
                  </div>
                )}

                {folder.uploadedBy.email && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                    <MSIcon name="mail" style={{ fontSize: 13, color: "#9eacc3" }} />
                    <a href={`mailto:${folder.uploadedBy.email}`} style={{ fontSize: 12, color: "#a2c2fd", textDecoration: "none" }}>{folder.uploadedBy.email}</a>
                  </div>
                )}
              </div>

              {/* Contact Button */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                {localStorage.getItem("access_token") && (
                  <button
                    onClick={() => navigate("/messages")}
                    style={{ ...SG, background: "rgba(162,194,253,0.15)", border: "1px solid rgba(162,194,253,0.3)", color: "#a2c2fd", borderRadius: 10, padding: "7px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}
                  >
                    <MSIcon name="chat" style={{ fontSize: 14 }} /> Message
                  </button>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <MSIcon name="folder_shared" style={{ fontSize: 12, color: "#68768b" }} />
                  <span style={{ ...SG, fontSize: 10, color: "#68768b", textTransform: "uppercase", letterSpacing: "0.1em" }}>Shared Folder</span>
                </div>
              </div>
            </div>
          )}
        </header>

        {files.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", color: "#9eacc3" }}>
            <MSIcon name="folder_open" style={{ fontSize: 64, opacity: 0.2, display: "block", margin: "0 auto 20px" }} />
            <p style={{ ...SG, fontSize: 18, fontWeight: 700, color: "#d8e6ff", marginBottom: 8 }}>Empty Folder</p>
            <p style={{ fontSize: 13 }}>No files have been added to this public workspace yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-8">
            {files.map(f => (
              <SharedFileCard key={f.id} file={f} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function SharedFileCard({ file }: { file: any }) {
  const color = FILE_TYPE_COLORS[file.fileType] || FILE_TYPE_COLORS.other;
  const icon = FILE_TYPE_ICONS[file.fileType] || FILE_TYPE_ICONS.other;
  const proxyUrl = `${BASE_API}/workspace/file/${file.id}/proxy`;
  const isPreviewable = file.fileType === "image" || file.fileType === "video";

  return (
    <div className="col-span-12 md:col-span-4 rounded-xl overflow-hidden border relative" style={{ background: "#031427", borderColor: "transparent" }}>
      <div className="aspect-video relative overflow-hidden flex items-center justify-center group" style={{ background: "#11273f" }}>
        {isPreviewable ? (
          <>
            {file.fileType === "image" ? (
              <img src={proxyUrl} alt={file.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
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

        {/* Force download using ?download=true */}
        <a href={`${proxyUrl}?download=true`} target="_blank" rel="noreferrer" title="Download"
          className="absolute top-8 right-8 w-10 h-10 rounded-full opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center transform group-hover:translate-y-0 translate-y-4"
          style={{ background: "rgba(162,194,253,0.3)", border: "1px solid rgba(162,194,253,0.5)", textDecoration: "none" }}>
          <MSIcon name="download" style={{ fontSize: 18, color: "#a2c2fd" }} />
        </a>
      </div>
      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <MSIcon name={icon} style={{ fontSize: 14, color }} />
          <span className="text-[10px] uppercase" style={{ ...SG, color: "#9eacc3" }}>{file.fileType}</span>
        </div>
        <h3 className="font-bold text-sm truncate" style={{ ...SG, color: "#d8e6ff" }}>{file.name}</h3>
        <div className="mt-4 flex justify-between items-center">
          <span className="text-[10px]" style={{ color: "rgba(158,172,195,0.6)", ...SG }}>{fmtBytes(file.fileSize || 0)}</span>
        </div>
      </div>
    </div>
  );
}
