"use client";

import { useState, useRef } from "react";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/firebase/config";
import { useAuth } from "@/context/AuthContext";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

interface Room {
  id: string;
  roomName: string;
  subject: string;
}

interface UploadRecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: Room[];
  onRecordingUploaded: () => void;
}

// Files larger than this will be auto-compressed
const COMPRESS_THRESHOLD = 30 * 1024 * 1024; // 30 MB

type Phase =
  | "idle"
  | "loading-ffmpeg"
  | "compressing"
  | "uploading"
  | "done";

export default function UploadRecordingModal({
  isOpen,
  onClose,
  rooms,
  onRecordingUploaded,
}: UploadRecordingModalProps) {
  const { userData } = useAuth();
  const [title, setTitle] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [linkMode, setLinkMode] = useState(false);
  const [externalLink, setExternalLink] = useState("");

  // Phase tracking
  const [phase, setPhase] = useState<Phase>("idle");
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  const [compressedSize, setCompressedSize] = useState<number | null>(null);

  const [shouldCompress, setShouldCompress] = useState(true);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadStartRef = useRef<number>(0);

  if (!isOpen) return null;

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);
  const isBusy = phase !== "idle";
  const isLargeFile = file && file.size > COMPRESS_THRESHOLD;

  /* ─── Helpers ─────────────────────────────────────────────── */
  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatSpeed = (bps: number) => {
    if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(0)} KB/s`;
    return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  const formatTime = (sec: number) => {
    if (sec < 60) return `${Math.ceil(sec)}s left`;
    return `${Math.floor(sec / 60)}m ${Math.ceil(sec % 60)}s left`;
  };

  /* ─── Drag & drop ─────────────────────────────────────────── */
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped?.type.startsWith("video/")) {
      setFile(dropped);
      if (!title) setTitle(dropped.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " "));
    } else {
      setError("Please upload a video file (MP4, WebM, MKV)");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sel = e.target.files?.[0];
    if (sel) {
      setFile(sel);
      if (!title) setTitle(sel.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " "));
    }
  };

  /* ─── Compress with FFmpeg.wasm ───────────────────────────── */
  const compressVideo = async (inputFile: File): Promise<File> => {
    const ffmpeg = new FFmpeg();

    // Progress callback from FFmpeg
    ffmpeg.on("progress", ({ progress }: { progress: number }) => {
      setCompressionProgress(Math.min(99, Math.round(progress * 100)));
    });

    setPhase("loading-ffmpeg");

    // Use SINGLE-THREADED core — no SharedArrayBuffer needed, no COOP/COEP headers
    const coreBase = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
    await ffmpeg.load({
      coreURL: await toBlobURL(`${coreBase}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${coreBase}/ffmpeg-core.wasm`, "application/wasm"),
    });

    setPhase("compressing");
    setCompressionProgress(0);

    const ext = inputFile.name.split(".").pop()?.toLowerCase() || "mp4";
    const inputName = `input.${ext}`;

    await ffmpeg.writeFile(inputName, await fetchFile(inputFile));

    // H.264 fast compression — CRF 26 balances quality & size perfectly for lectures
    await ffmpeg.exec([
      "-i", inputName,
      "-vcodec", "libx264",
      "-crf", "26",
      "-preset", "fast",
      "-acodec", "aac",
      "-b:a", "128k",
      "-movflags", "+faststart",
      "output.mp4",
    ]);

    const data = await ffmpeg.readFile("output.mp4") as Uint8Array;
    const compressedBlob = new Blob([data as any], { type: "video/mp4" });
    setCompressedSize(compressedBlob.size);
    setCompressionProgress(100);

    return new File([compressedBlob], "compressed.mp4", { type: "video/mp4" });
  };

  /* ─── Upload to Firebase Storage ─────────────────────────── */
  const uploadToFirebase = (fileToUpload: File, originalFile: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const safeTitle = (title || "recording").replace(/\s+/g, "_");
      const fileName = `${safeTitle}_${timestamp}.mp4`;
      const filePath = `recordings/${selectedRoomId}/${fileName}`;

      const storageRef = ref(storage, filePath);
      const uploadTask = uploadBytesResumable(storageRef, fileToUpload, {
        contentType: "video/mp4",
      });

      uploadStartRef.current = Date.now();

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          );
          setUploadProgress(progress);

          const elapsed = (Date.now() - uploadStartRef.current) / 1000;
          if (elapsed > 1) {
            const speed = snapshot.bytesTransferred / elapsed;
            const remaining = (snapshot.totalBytes - snapshot.bytesTransferred) / speed;
            setUploadSpeed(formatSpeed(speed));
            setTimeRemaining(remaining > 0 ? formatTime(remaining) : null);
          }
        },
        (err) => reject(err),
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          await addDoc(collection(db, "recordings"), {
            roomId: selectedRoomId,
            title: title || "Untitled Recording",
            link: downloadURL,
            uploadedBy: userData!.name,
            uploadedById: userData!.uid,
            teacherName: userData!.name,
            subject: selectedRoom?.subject || "",
            fileSize: fileToUpload.size,
            originalFileSize: originalFile.size,
            createdAt: new Date().toISOString(),
            storagePath: filePath,
            type: "obs-upload",
            compressed: fileToUpload !== originalFile,
          });
          resolve();
        }
      );
    });
  };

  /* ─── Submit ──────────────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData || !selectedRoomId) return;

    setError("");

    try {
      if (linkMode) {
        if (!externalLink) {
          setError("Please provide a recording link");
          return;
        }
        setPhase("uploading");
        await addDoc(collection(db, "recordings"), {
          roomId: selectedRoomId,
          title: title || "Untitled Recording",
          link: externalLink,
          uploadedBy: userData.name,
          uploadedById: userData.uid,
          teacherName: userData.name,
          subject: selectedRoom?.subject || "",
          createdAt: new Date().toISOString(),
          type: "external-link",
        });
        setPhase("done");
        resetAndClose();
        onRecordingUploaded();
      } else {
        if (!file) {
          setError("Please select a video file");
          return;
        }

        let fileToUpload = file;

        // Compress if enabled and file is large
        if (shouldCompress && file.size > COMPRESS_THRESHOLD) {
          fileToUpload = await compressVideo(file);
        }

        setPhase("uploading");
        setUploadProgress(0);
        await uploadToFirebase(fileToUpload, file);

        setPhase("done");
        resetAndClose();
        onRecordingUploaded();
      }
    } catch (err) {
      console.error("Upload failed:", err);
      setError("Something went wrong. Please try again.");
      setPhase("idle");
    }
  };

  const resetAndClose = () => {
    setTitle("");
    setSelectedRoomId("");
    setFile(null);
    setExternalLink("");
    setPhase("idle");
    setCompressionProgress(0);
    setUploadProgress(0);
    setUploadSpeed(null);
    setTimeRemaining(null);
    setCompressedSize(null);
    setShouldCompress(true);
    setError("");
    setLinkMode(false);
    onClose();
  };

  /* ─── Phase UI helpers ────────────────────────────────────── */
  const phaseLabel: Record<Phase, string> = {
    "idle": "",
    "loading-ffmpeg": "Loading compressor…",
    "compressing": `Compressing… ${compressionProgress}%`,
    "uploading": `Uploading… ${uploadProgress}%`,
    "done": "Done!",
  };

  const phaseProgress: Record<Phase, number> = {
    "idle": 0,
    "loading-ffmpeg": 5,
    "compressing": compressionProgress,
    "uploading": uploadProgress,
    "done": 100,
  };

  const phaseColor: Record<Phase, string> = {
    "idle": "#2563eb",
    "loading-ffmpeg": "#f59e0b",
    "compressing": "#7c3aed",
    "uploading": "#2563eb",
    "done": "#16a34a",
  };

  /* ─── Render ──────────────────────────────────────────────── */
  return (
    <div className="modal-overlay" onClick={isBusy ? undefined : resetAndClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>

        {/* Header */}
        <div className="flex items-center gap-3" style={{ marginBottom: 24 }}>
          <div
            style={{
              width: 40, height: 40,
              borderRadius: "var(--radius-md)",
              background: "linear-gradient(135deg, #2563eb, #7c3aed)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17,8 12,3 7,8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--color-text-primary)" }}>Upload Recording</h2>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 2 }}>
              Upload an OBS recording or add an external link
            </p>
          </div>
        </div>

        {/* Mode toggle */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, padding: 3, background: "var(--color-surface-hover)", borderRadius: "var(--radius-md)" }}>
          {(["file", "link"] as const).map((m) => {
            const active = m === "link" ? linkMode : !linkMode;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setLinkMode(m === "link")}
                disabled={isBusy}
                style={{
                  flex: 1, padding: "8px 0", fontSize: 13, fontWeight: 500,
                  border: "none", borderRadius: "var(--radius-sm)", cursor: isBusy ? "not-allowed" : "pointer",
                  transition: "all 150ms ease",
                  background: active ? "#fff" : "transparent",
                  color: active ? "var(--color-text-primary)" : "var(--color-text-muted)",
                  boxShadow: active ? "var(--shadow-sm)" : "none",
                }}
              >
                {m === "file" ? "📁 File Upload" : "🔗 External Link"}
              </button>
            );
          })}
        </div>

        {error && <div className="error-alert">{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Class selection */}
          <div>
            <label className="field-label">Class / Batch *</label>
            <select
              className="select-field"
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              disabled={isBusy}
              required
            >
              <option value="">Select a class...</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.roomName} — {room.subject}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="field-label">Recording Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={isBusy}
              placeholder="e.g. Lecture 5 — Organic Chemistry"
              className="input-field"
            />
          </div>

          {/* File or link */}
          {linkMode ? (
            <div>
              <label className="field-label">Recording Link *</label>
              <input
                type="url"
                value={externalLink}
                onChange={(e) => setExternalLink(e.target.value)}
                required
                disabled={isBusy}
                placeholder="https://drive.google.com/... or YouTube link"
                className="input-field"
              />
              <p style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4 }}>
                Paste a Google Drive, YouTube, or any direct video link
              </p>
            </div>
          ) : (
            <div>
              <label className="field-label">Video File *</label>
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={isBusy ? undefined : handleDrop}
                onClick={isBusy ? undefined : () => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragActive ? "var(--color-primary)" : "var(--color-border)"}`,
                  borderRadius: "var(--radius-md)",
                  padding: file ? "12px 16px" : "32px 16px",
                  textAlign: "center",
                  cursor: isBusy ? "not-allowed" : "pointer",
                  transition: "all 150ms ease",
                  background: dragActive ? "var(--color-primary-light)" : "var(--color-surface-muted)",
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  style={{ display: "none" }}
                />
                {file ? (
                  <div className="flex items-center gap-3" style={{ textAlign: "left" }}>
                    <div
                      style={{
                        width: 40, height: 40, borderRadius: "var(--radius-md)",
                        background: "#eff6ff", display: "flex",
                        alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                        <polygon points="23,7 16,12 23,17" /><rect x="1" y="5" width="15" height="14" rx="2" />
                      </svg>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {file.name}
                      </p>
                      <p style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                        {formatSize(file.size)}
                        {compressedSize && (
                          <span style={{ color: "#16a34a", marginLeft: 6, fontWeight: 600 }}>
                            → {formatSize(compressedSize)} after compression ✓
                          </span>
                        )}
                      </p>
                    </div>
                    {!isBusy && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setFile(null); setCompressedSize(null); }}
                        style={{ marginLeft: "auto", background: "transparent", border: "none", color: "var(--color-text-muted)", cursor: "pointer", padding: 4 }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5" style={{ margin: "0 auto 8px" }}>
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="17,8 12,3 7,8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <p style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 4 }}>
                      Drop your video file here
                    </p>
                    <p style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                      or click to browse · MP4, WebM, MKV supported
                    </p>
                  </>
                )}
              </div>

              {/* Compress toggle — show for large files */}
              {isLargeFile && !isBusy && (
                <div
                  style={{
                    marginTop: 10,
                    padding: "10px 14px",
                    borderRadius: "var(--radius-md)",
                    border: shouldCompress ? "1px solid #818cf8" : "1px solid var(--color-border)",
                    background: shouldCompress ? "#eef2ff" : "var(--color-surface-muted)",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    cursor: "pointer",
                    transition: "all 150ms ease",
                  }}
                  onClick={() => setShouldCompress((v) => !v)}
                >
                  <div
                    style={{
                      width: 38, height: 22, borderRadius: 11, flexShrink: 0,
                      background: shouldCompress ? "#6366f1" : "#cbd5e1",
                      position: "relative",
                      transition: "background 200ms",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: 3, left: shouldCompress ? 19 : 3,
                        width: 16, height: 16, borderRadius: "50%",
                        background: "#fff",
                        transition: "left 200ms",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                      }}
                    />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: shouldCompress ? "#3730a3" : "var(--color-text-primary)", margin: 0 }}>
                      ⚡ Compress before upload
                    </p>
                    <p style={{ fontSize: 11, color: "var(--color-text-muted)", margin: 0 }}>
                      {shouldCompress
                        ? "File will be compressed in your browser first — typically 60–80% smaller"
                        : `Uploading ${formatSize(file!.size)} as-is — may be slow`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Progress panel */}
          {isBusy && phase !== "done" && (
            <div
              style={{
                padding: "14px 16px",
                borderRadius: "var(--radius-md)",
                border: `1px solid ${phaseColor[phase]}40`,
                background: `${phaseColor[phase]}08`,
              }}
            >
              {/* Phase steps */}
              {!linkMode && shouldCompress && file && file.size > COMPRESS_THRESHOLD && (
                <div className="flex gap-2 items-center" style={{ marginBottom: 12 }}>
                  {(["loading-ffmpeg", "compressing", "uploading"] as Phase[]).map((p, i) => {
                    const phaseOrder = ["loading-ffmpeg", "compressing", "uploading"];
                    const currentIdx = phaseOrder.indexOf(phase);
                    const done = phaseOrder.indexOf(p) < currentIdx;
                    const active = p === phase;
                    return (
                      <div key={p} className="flex items-center gap-2" style={{ flex: 1 }}>
                        <div
                          style={{
                            width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                            background: done ? "#16a34a" : active ? phaseColor[p] : "var(--color-border)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 10, color: "#fff", fontWeight: 700,
                            transition: "background 300ms",
                          }}
                        >
                          {done ? "✓" : i + 1}
                        </div>
                        <span style={{ fontSize: 11, color: active ? phaseColor[p] : done ? "#16a34a" : "var(--color-text-muted)", fontWeight: active ? 600 : 400 }}>
                          {p === "loading-ffmpeg" ? "Load" : p === "compressing" ? "Compress" : "Upload"}
                        </span>
                        {i < 2 && <div style={{ flex: 1, height: 1, background: done ? "#16a34a" : "var(--color-border)" }} />}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Label + percentage */}
              <div className="flex justify-between" style={{ marginBottom: 6 }}>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: phaseColor[phase] }}>
                    {phaseLabel[phase]}
                  </span>
                  {phase === "uploading" && uploadSpeed && (
                    <span style={{ fontSize: 11, color: "var(--color-text-muted)", marginLeft: 6 }}>
                      ({uploadSpeed})
                    </span>
                  )}
                </div>
                {phase === "uploading" && timeRemaining && (
                  <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                    {timeRemaining}
                  </span>
                )}
              </div>

              {/* Progress bar */}
              <div style={{ height: 6, background: "var(--color-border)", borderRadius: 3, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${phaseProgress[phase]}%`,
                    background: `linear-gradient(90deg, ${phaseColor[phase]}, ${phase === "compressing" ? "#a855f7" : "#60a5fa"})`,
                    borderRadius: 3,
                    transition: "width 0.4s ease",
                  }}
                />
              </div>

              {phase === "loading-ffmpeg" && (
                <p style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 6 }}>
                  Downloading FFmpeg engine (~10 MB, only the first time)…
                </p>
              )}
              {phase === "compressing" && (
                <p style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 6 }}>
                  Compressing video in your browser — don't close this tab
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end" style={{ paddingTop: 8 }}>
            <button type="button" onClick={resetAndClose} className="btn-secondary" disabled={isBusy}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={isBusy || (!linkMode && !file) || !selectedRoomId}
              className="btn-primary"
            >
              {isBusy ? (
                <>
                  <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  {phase === "loading-ffmpeg" ? "Loading…"
                    : phase === "compressing" ? `Compressing ${compressionProgress}%`
                    : phase === "uploading" ? `Uploading ${uploadProgress}%`
                    : "Processing…"}
                </>
              ) : linkMode ? (
                "Add Recording"
              ) : (
                "Upload Recording"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
