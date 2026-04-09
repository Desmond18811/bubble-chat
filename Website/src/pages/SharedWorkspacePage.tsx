import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import * as api from "@/api";

/* ─── Types & Config ─── */
const SG: React.CSSProperties = { fontFamily: "'Space Grotesk', sans-serif" };
const BASE_API = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

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
          <span style={{ ...SG, fontSize: 18, fontWeight: 700, color: "#d8e6ff" }}>Bubble workspace</span>
        </div>
        {!localStorage.getItem("access_token") && (
          <button onClick={() => navigate("/login")} style={{ ...SG, background: "rgba(255,231,146,0.1)", color: "#ffe792", border: "1px solid rgba(255,231,146,0.2)", borderRadius: 10, padding: "8px 16px", cursor: "pointer", fontWeight: 700 }}>
            Sign In
          </button>
        )}
      </header>

      <main className="max-w-6xl mx-auto py-12 px-8">
        <header className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(162,194,253,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#a2c2fd" }}>
              {(folder.uploadedBy?.full_name || "?")[0].toUpperCase()}
            </div>
            <div>
              <p style={{ ...SG, fontSize: 11, color: "#9eacc3", textTransform: "uppercase", letterSpacing: "0.1em" }}>Shared by {folder.uploadedBy?.full_name}</p>
              <h1 className="text-4xl font-bold tracking-tight mt-1" style={{ ...SG, color: "#d8e6ff" }}>{folder.name}</h1>
            </div>
          </div>
          {folder.description && <p style={{ color: "#9eacc3", fontSize: 15, maxWidth: "600px" }}>{folder.description}</p>}
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
