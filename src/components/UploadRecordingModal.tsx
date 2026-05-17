"use client";

import { useState, useRef } from "react";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/firebase/config";
import { useAuth } from "@/context/AuthContext";

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
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

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
    if (e.dataTransfer.files?.[0]) {
      const dropped = e.dataTransfer.files[0];
      if (dropped.type.startsWith("video/")) {
        setFile(dropped);
        if (!title) {
          setTitle(dropped.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " "));
        }
      } else {
        setError("Please upload a video file (MP4, WebM, MKV)");
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      if (!title) {
        setTitle(selected.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " "));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData || !selectedRoomId) return;

    setError("");
    setUploading(true);

    try {
      if (linkMode) {
        // External link mode (e.g., YouTube, Google Drive)
        if (!externalLink) {
          setError("Please provide a recording link");
          setUploading(false);
          return;
        }

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

        resetAndClose();
        onRecordingUploaded();
      } else {
        // File upload mode (OBS recordings)
        if (!file) {
          setError("Please select a video file");
          setUploading(false);
          return;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const ext = file.name.split(".").pop() || "mp4";
        const safeTitle = (title || "recording").replace(/\s+/g, "_");
        const fileName = `${safeTitle}_${timestamp}.${ext}`;
        const filePath = `recordings/${selectedRoomId}/${fileName}`;

        const storageRef = ref(storage, filePath);
        const uploadTask = uploadBytesResumable(storageRef, file, {
          contentType: file.type,
        });

        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            setUploadProgress(progress);
          },
          (uploadError) => {
            console.error("Upload error:", uploadError);
            setError("Upload failed. Please try again.");
            setUploading(false);
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

            await addDoc(collection(db, "recordings"), {
              roomId: selectedRoomId,
              title: title || "Untitled Recording",
              link: downloadURL,
              uploadedBy: userData.name,
              uploadedById: userData.uid,
              teacherName: userData.name,
              subject: selectedRoom?.subject || "",
              fileSize: file.size,
              createdAt: new Date().toISOString(),
              storagePath: filePath,
              type: "obs-upload",
            });

            resetAndClose();
            onRecordingUploaded();
          }
        );
      }
    } catch (err) {
      console.error("Failed to upload recording:", err);
      setError("Something went wrong. Please try again.");
      setUploading(false);
    }
  };

  const resetAndClose = () => {
    setTitle("");
    setSelectedRoomId("");
    setFile(null);
    setExternalLink("");
    setUploading(false);
    setUploadProgress(0);
    setError("");
    setLinkMode(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={resetAndClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        {/* Header */}
        <div className="flex items-center gap-3" style={{ marginBottom: 24 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "var(--radius-md)",
              background: "linear-gradient(135deg, #2563eb, #7c3aed)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
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
          <button
            onClick={() => setLinkMode(false)}
            style={{
              flex: 1,
              padding: "8px 0",
              fontSize: 13,
              fontWeight: 500,
              border: "none",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
              transition: "all 150ms ease",
              background: !linkMode ? "#fff" : "transparent",
              color: !linkMode ? "var(--color-text-primary)" : "var(--color-text-muted)",
              boxShadow: !linkMode ? "var(--shadow-sm)" : "none",
            }}
          >
            📁 File Upload
          </button>
          <button
            onClick={() => setLinkMode(true)}
            style={{
              flex: 1,
              padding: "8px 0",
              fontSize: 13,
              fontWeight: 500,
              border: "none",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
              transition: "all 150ms ease",
              background: linkMode ? "#fff" : "transparent",
              color: linkMode ? "var(--color-text-primary)" : "var(--color-text-muted)",
              boxShadow: linkMode ? "var(--shadow-sm)" : "none",
            }}
          >
            🔗 External Link
          </button>
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
              placeholder="e.g. Lecture 5 — Organic Chemistry"
              className="input-field"
            />
          </div>

          {/* File upload or link */}
          {linkMode ? (
            <div>
              <label className="field-label">Recording Link *</label>
              <input
                type="url"
                value={externalLink}
                onChange={(e) => setExternalLink(e.target.value)}
                required
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
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragActive ? "var(--color-primary)" : "var(--color-border)"}`,
                  borderRadius: "var(--radius-md)",
                  padding: file ? "12px 16px" : "32px 16px",
                  textAlign: "center",
                  cursor: "pointer",
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
                        width: 40,
                        height: 40,
                        borderRadius: "var(--radius-md)",
                        background: "#eff6ff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
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
                      <p style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{formatFileSize(file.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                      style={{
                        marginLeft: "auto",
                        background: "transparent",
                        border: "none",
                        color: "var(--color-text-muted)",
                        cursor: "pointer",
                        padding: 4,
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <>
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--color-text-muted)"
                      strokeWidth="1.5"
                      style={{ margin: "0 auto 8px" }}
                    >
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
            </div>
          )}

          {/* Upload progress */}
          {uploading && !linkMode && (
            <div>
              <div className="flex justify-between" style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)" }}>Uploading...</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-primary)", fontFamily: "monospace" }}>
                  {uploadProgress}%
                </span>
              </div>
              <div style={{ height: 6, background: "var(--color-border)", borderRadius: 3, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${uploadProgress}%`,
                    background: "linear-gradient(90deg, #2563eb, #7c3aed)",
                    borderRadius: 3,
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end" style={{ paddingTop: 8 }}>
            <button type="button" onClick={resetAndClose} className="btn-secondary" disabled={uploading}>
              Cancel
            </button>
            <button type="submit" disabled={uploading || (!linkMode && !file) || !selectedRoomId} className="btn-primary">
              {uploading ? (
                <>
                  <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  {linkMode ? "Adding..." : `Uploading ${uploadProgress}%`}
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
