"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/firebase/config";
import { useAuth } from "@/context/AuthContext";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import UploadRecordingModal from "@/components/UploadRecordingModal";
import { formatDate } from "@/utils/helpers";

interface Recording {
  id: string; roomId: string; title: string; link: string;
  uploadedBy: string; uploadedById: string; teacherName?: string;
  duration?: string; fileSize?: number; createdAt: string;
  type?: string; subject?: string;
}

interface Room {
  id: string; roomName: string; subject: string;
  teacherId: string; participants: string[];
}

export default function RecordingsPage() {
  const { loading: authLoading } = useProtectedRoute();
  const { userData } = useAuth();
  const [recordings, setRecordings] = useState<(Recording & { roomName: string; roomSubject: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [selectedRecording, setSelectedRecording] = useState<(Recording & { roomName: string; roomSubject: string }) | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);

  const fetchRecordings = useCallback(async () => {
    if (!userData) return;
    setLoading(true);
    try {
      const roomQ = userData.role === "teacher"
        ? query(collection(db, "rooms"), where("teacherId", "==", userData.uid))
        : query(collection(db, "rooms"), where("participants", "array-contains", userData.uid));
      const roomSnap = await getDocs(roomQ);
      const fetchedRooms: Room[] = roomSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Room[];
      setRooms(fetchedRooms);
      const allRecordings: (Recording & { roomName: string; roomSubject: string })[] = [];
      for (const room of fetchedRooms) {
        try {
          const recQ = query(collection(db, "recordings"), where("roomId", "==", room.id));
          const recSnap = await getDocs(recQ);
          recSnap.docs.forEach((d) => {
            allRecordings.push({ id: d.id, ...d.data(), roomName: room.roomName, roomSubject: room.subject } as Recording & { roomName: string; roomSubject: string });
          });
        } catch { /* skip */ }
      }
      allRecordings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRecordings(allRecordings);
    } catch (err) { console.error("Failed to fetch recordings:", err); }
    finally { setLoading(false); }
  }, [userData]);

  useEffect(() => { if (userData) fetchRecordings(); }, [userData, fetchRecordings]);

  const subjects = Array.from(new Set(recordings.map((r) => r.roomSubject).filter(Boolean)));
  const filteredRecordings = recordings
    .filter((rec) => {
      const matchesSearch = searchQuery === "" || rec.title.toLowerCase().includes(searchQuery.toLowerCase()) || rec.roomName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSubject = filterSubject === "all" || rec.roomSubject === filterSubject;
      return matchesSearch && matchesSubject;
    })
    .sort((a, b) => sortBy === "newest" ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentCount = recordings.filter((r) => new Date(r.createdAt) > weekAgo).length;

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "—";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  if (authLoading) return (<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-base)" }}><div className="spinner" /></div>);
  if (!userData) return (<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, padding: 24, background: "var(--bg-base)" }}><p style={{ color: "var(--text-secondary)" }}>Unable to load profile.</p><div style={{ display: "flex", gap: 10 }}><button className="btn-secondary" onClick={() => window.location.reload()}>Retry</button><a href="/login"><button className="btn-primary">Login</button></a></div></div>);

  const isTeacher = userData.role === "teacher";

  return (
    <DashboardLayout title="Recordings">
      <div className="page-enter">
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Recordings</h1>
            <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>{isTeacher ? "Manage and upload class recordings" : "Watch recordings from your classes"}</p>
          </div>
          {isTeacher && (
            <button className="btn-primary" onClick={() => setShowUploadModal(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Upload Recording
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "var(--blue-light)", color: "var(--blue)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16"/></svg>
            </div>
            <div><p className="stat-value">{recordings.length}</p><p className="stat-label">Total Recordings</p></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "var(--green-light)", color: "var(--green)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23,6 13.5,15.5 8.5,10.5 1,18"/><polyline points="17,6 23,6 23,12"/></svg>
            </div>
            <div><p className="stat-value">{recentCount}</p><p className="stat-label">This Week</p></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "var(--yellow-light)", color: "var(--yellow)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
            </div>
            <div><p className="stat-value">{subjects.length}</p><p className="stat-label">Subjects</p></div>
          </div>
        </div>

        {/* Search/Filters */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 220, position: "relative" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" className="input-field" placeholder="Search recordings..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ paddingLeft: 40 }} />
          </div>
          <select className="select-field" value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} style={{ width: "auto", minWidth: 160 }}>
            <option value="all">All Subjects</option>
            {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="select-field" value={sortBy} onChange={(e) => setSortBy(e.target.value as "newest"|"oldest")} style={{ width: "auto", minWidth: 140 }}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>

        {/* Recording list + detail */}
        <div style={{ display: "grid", gridTemplateColumns: selectedRecording ? "1fr 380px" : "1fr", gap: 20, alignItems: "start" }}>
          <div>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 88 }}/>)}</div>
            ) : filteredRecordings.length === 0 ? (
              <div className="card empty-state">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16"/></svg>
                <h3>{searchQuery || filterSubject !== "all" ? "No matching recordings" : "No recordings yet"}</h3>
                <p>{searchQuery || filterSubject !== "all" ? "Try adjusting your search or filters" : isTeacher ? "Record your classes using OBS, then upload here" : "Your teachers will add recordings after sessions"}</p>
                {isTeacher && !searchQuery && filterSubject === "all" && <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => setShowUploadModal(true)}>Upload First Recording</button>}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {filteredRecordings.map((rec) => (
                  <div key={rec.id} className="card card-interactive" onClick={() => setSelectedRecording(selectedRecording?.id === rec.id ? null : rec)}
                    style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, cursor: "pointer",
                      borderColor: selectedRecording?.id === rec.id ? "var(--blue)" : undefined,
                      background: selectedRecording?.id === rec.id ? "var(--blue-light)" : undefined }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>
                      <div style={{ width: 56, height: 56, borderRadius: "var(--radius-md)", background: "linear-gradient(135deg, #1a1a2e, #16213e)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative", overflow: "hidden" }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2"><polygon points="5,3 19,12 5,21"/></svg>
                        {rec.duration && <span style={{ position: "absolute", bottom: 2, right: 2, fontSize: 9, fontWeight: 600, color: "#fff", background: "rgba(0,0,0,0.7)", padding: "1px 4px", borderRadius: 3, fontFamily: "monospace" }}>{rec.duration}</span>}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rec.title}</p>
                        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{rec.roomName} · {rec.roomSubject} · {rec.uploadedBy}</p>
                        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{formatDate(rec.createdAt)}{rec.fileSize ? ` · ${formatFileSize(rec.fileSize)}` : ""}</p>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <a href={rec.link} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ padding: "7px 14px", fontSize: 12 }} onClick={(e) => e.stopPropagation()}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5,3 19,12 5,21"/></svg>
                        Watch
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selectedRecording && (
            <div className="card recording-detail-panel" style={{ padding: 0, overflow: "hidden", position: "sticky", top: 80 }}>
              <div style={{ background: "#000", position: "relative" }}>
                <video ref={videoRef} src={selectedRecording.link} controls style={{ width: "100%", maxHeight: 220, display: "block" }} />
              </div>
              <div style={{ padding: "20px" }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 14 }}>{selectedRecording.title}</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <DetailRow label="Class" value={selectedRecording.roomName} />
                  <DetailRow label="Subject" value={selectedRecording.roomSubject} />
                  <DetailRow label="Teacher" value={selectedRecording.uploadedBy} />
                  <DetailRow label="Date" value={formatDate(selectedRecording.createdAt)} />
                  {selectedRecording.duration && <DetailRow label="Duration" value={selectedRecording.duration} />}
                  {selectedRecording.fileSize && <DetailRow label="Size" value={formatFileSize(selectedRecording.fileSize)} />}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
                  <a href={selectedRecording.link} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ flex: 1, textDecoration: "none", textAlign: "center", fontSize: 13 }}>Watch Full</a>
                  <a href={selectedRecording.link} download className="btn-secondary" style={{ flex: 1, textDecoration: "none", textAlign: "center", fontSize: 13 }}>Download</a>
                </div>
                <button className="btn-secondary" onClick={() => setSelectedRecording(null)} style={{ width: "100%", marginTop: 8, fontSize: 13 }}>Close</button>
              </div>
            </div>
          )}
        </div>
      </div>
      <UploadRecordingModal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} rooms={rooms} onRecordingUploaded={fetchRecordings} />
    </DashboardLayout>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: 13, color: "var(--text-muted)", flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
    </div>
  );
}
