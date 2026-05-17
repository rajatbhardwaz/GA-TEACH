"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/firebase/config";
import { useAuth } from "@/context/AuthContext";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import AddRecordingModal from "@/components/AddRecordingModal";
import { formatDate } from "@/utils/helpers";
import Link from "next/link";

interface Room {
  id: string; roomName: string; subject: string; teacherName: string;
  teacherId: string; roomCode: string; createdAt: string;
  participants: string[]; isActive: boolean;
}
interface Recording {
  id: string; roomId: string; title: string; link: string;
  uploadedBy: string; createdAt: string; duration?: string;
}

export default function RoomDetailPage() {
  const { loading: authLoading } = useProtectedRoute();
  const { userData } = useAuth();
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  const [room, setRoom] = useState<Room | null>(null);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchRoom = useCallback(async () => {
    try { const roomDoc = await getDoc(doc(db, "rooms", roomId)); if (roomDoc.exists()) setRoom({ id: roomDoc.id, ...roomDoc.data() } as Room); } catch (err) { console.error(err); }
  }, [roomId]);

  const fetchRecordings = useCallback(async () => {
    try { const q = query(collection(db, "recordings"), where("roomId", "==", roomId), orderBy("createdAt", "desc")); const snapshot = await getDocs(q); setRecordings(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Recording[]); } catch (err) { console.error(err); }
  }, [roomId]);

  useEffect(() => { const load = async () => { setLoadingRoom(true); await Promise.all([fetchRoom(), fetchRecordings()]); setLoadingRoom(false); }; load(); }, [fetchRoom, fetchRecordings]);

  const copyCode = () => { if (room) { navigator.clipboard.writeText(room.roomCode); setCopied(true); setTimeout(() => setCopied(false), 2000); } };
  const isTeacher = (userData?.role === "teacher" || userData?.role === "admin") && userData?.uid === room?.teacherId;

  if (authLoading || loadingRoom) return (<div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "center" }}><div className="spinner" /></div>);
  if (!room) return (<div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "center" }}><div className="empty-state"><h3>Batch not found</h3><p>This batch may have been removed.</p><button className="btn-primary" style={{ marginTop: 16 }} onClick={() => router.push("/dashboard")}>Back to Dashboard</button></div></div>);

  return (
    <DashboardLayout title={room.roomName}>
      <div className="page-enter">
        <Link href="/dashboard" className="flex items-center gap-2" style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24, display: "inline-flex", textDecoration: "none" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12,19 5,12 12,5"/></svg>
          Back to Dashboard
        </Link>

        {/* Batch header card */}
        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 32 }}>
          <div style={{ height: 4, background: room.isActive ? "linear-gradient(90deg, var(--green), #4ade80)" : "linear-gradient(90deg, var(--blue), #818cf8)" }} />
          <div className="room-detail-header" style={{ padding: "28px 32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>{room.roomName}</h1>
                  {room.isActive && <span className="badge badge-live">Live Class</span>}
                </div>
                <p style={{ fontSize: 15, color: "var(--text-secondary)", marginBottom: 14 }}>{room.subject}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Faculty: {room.teacherName}</span>
                  <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Created: {formatDate(room.createdAt)}</span>
                  <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{room.participants?.length || 0} students enrolled</span>
                </div>
              </div>
              {isTeacher && (
                <div onClick={copyCode} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "var(--blue-light)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: "var(--radius-md)", cursor: "pointer" }}>
                  <div>
                    <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>BATCH CODE</p>
                    <p style={{ fontFamily: "monospace", fontSize: 18, fontWeight: 700, color: "var(--blue)", letterSpacing: "0.1em" }}>{room.roomCode}</p>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={copied ? "var(--green)" : "var(--blue)"} strokeWidth="2">
                    {copied ? <polyline points="20,6 9,17 4,12" /> : <><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></>}
                  </svg>
                </div>
              )}
            </div>
              <div className="room-detail-actions" style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
              <button className="btn-primary" onClick={() => router.push(`/room/${roomId}/meeting`)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                {room.isActive ? "Join Live Class" : isTeacher ? "Start Live Class" : "Join Class"}
              </button>
              {isTeacher && (
                <>
                  <button className="btn-secondary" onClick={() => router.push(`/room/${roomId}/attendance`)}>Student Attendance</button>
                  <button className="btn-secondary" onClick={() => setShowRecordingModal(true)}>Add Lecture Recording</button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Lecture Recordings */}
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>Lecture Recordings ({recordings.length})</h2>
        {recordings.length === 0 ? (
          <div className="card empty-state">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5"><polygon points="5,3 19,12 5,21"/></svg>
            <h3>No lectures recorded yet</h3>
            <p>{isTeacher ? "Record your lectures using OBS and upload them here" : "Your faculty will upload lecture recordings after each session"}</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recordings.map((rec) => (
              <div key={rec.id} className="card card-interactive" style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>
                  <div style={{ width: 42, height: 42, borderRadius: "var(--radius-md)", background: "var(--red-light)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2"><polygon points="5,3 19,12 5,21"/></svg>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rec.title}</p>
                    <p style={{ fontSize: 12, color: "var(--text-muted)" }}>By {rec.uploadedBy} • {formatDate(rec.createdAt)}{rec.duration && <span> • {rec.duration}</span>}</p>
                  </div>
                </div>
                {rec.link ? (
                  <a href={rec.link} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ padding: "8px 16px", fontSize: 13, flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5,3 19,12 5,21"/></svg>
                    Watch Lecture
                  </a>
                ) : (
                  <span style={{ fontSize: 12, color: "var(--text-muted)", padding: "8px 16px" }}>Processing...</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <AddRecordingModal isOpen={showRecordingModal} onClose={() => setShowRecordingModal(false)} roomId={roomId} onRecordingAdded={fetchRecordings} />
    </DashboardLayout>
  );
}
