"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/firebase/config";
import { useAuth } from "@/context/AuthContext";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import Navbar from "@/components/Navbar";
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
  uploadedBy: string; createdAt: string;
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
    try {
      const roomDoc = await getDoc(doc(db, "rooms", roomId));
      if (roomDoc.exists()) setRoom({ id: roomDoc.id, ...roomDoc.data() } as Room);
    } catch (err) { console.error("Failed to fetch room:", err); }
  }, [roomId]);

  const fetchRecordings = useCallback(async () => {
    try {
      const q = query(collection(db, "recordings"), where("roomId", "==", roomId), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      setRecordings(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Recording[]);
    } catch (err) { console.error("Failed to fetch recordings:", err); }
  }, [roomId]);

  useEffect(() => {
    const load = async () => { setLoadingRoom(true); await Promise.all([fetchRoom(), fetchRecordings()]); setLoadingRoom(false); };
    load();
  }, [fetchRoom, fetchRecordings]);

  const copyCode = () => { if (room) { navigator.clipboard.writeText(room.roomCode); setCopied(true); setTimeout(() => setCopied(false), 2000); } };
  const isTeacher = userData?.role === "teacher" && userData?.uid === room?.teacherId;

  if (authLoading || loadingRoom) {
    return (<div style={{ minHeight: "100vh", background: "var(--color-surface)" }}><Navbar /><div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}><div className="spinner" /></div></div>);
  }
  if (!room) {
    return (<div style={{ minHeight: "100vh", background: "var(--color-surface)" }}><Navbar /><div className="empty-state" style={{ marginTop: 80 }}><h3>Room not found</h3><p>This room may have been deleted.</p><button className="btn-primary" style={{ marginTop: 16 }} onClick={() => router.push("/dashboard")}>Back to Dashboard</button></div></div>);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-surface)" }}>
      <Navbar />
      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px" }}>
        <Link href="/dashboard" className="flex items-center gap-2 no-underline" style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 24 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12,19 5,12 12,5" /></svg>
          Back to Dashboard
        </Link>

        {/* Room header */}
        <div className="glass-card page-enter" style={{ padding: 0, overflow: "hidden", marginBottom: 28 }}>
          <div style={{ height: 4, background: room.isActive ? "linear-gradient(90deg, #34a853, #4ade80)" : "linear-gradient(90deg, #1a73e8, #8ab4f8)" }} />
          <div style={{ padding: "28px 32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div className="flex items-center gap-3" style={{ marginBottom: 8 }}>
                  <h1 style={{ fontSize: 24, fontWeight: 600, color: "var(--color-text-primary)" }}>{room.roomName}</h1>
                  {room.isActive && <span className="badge badge-live">Live</span>}
                </div>
                <p style={{ fontSize: 15, color: "var(--color-text-secondary)", marginBottom: 12 }}>{room.subject}</p>
                <div className="flex items-center gap-4" style={{ flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Teacher: {room.teacherName}</span>
                  <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Created: {formatDate(room.createdAt)}</span>
                  <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>{room.participants?.length || 0} students</span>
                </div>
              </div>
              {isTeacher && (
                <div onClick={copyCode} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "rgba(26,115,232,0.08)", border: "1px solid rgba(26,115,232,0.15)", borderRadius: "var(--radius-md)", cursor: "pointer" }}>
                  <div>
                    <p style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 2 }}>ROOM CODE</p>
                    <p style={{ fontFamily: "monospace", fontSize: 18, fontWeight: 700, color: "var(--color-primary)", letterSpacing: "0.1em" }}>{room.roomCode}</p>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={copied ? "var(--color-success)" : "var(--color-primary)"} strokeWidth="2">
                    {copied ? <polyline points="20,6 9,17 4,12" /> : <><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></>}
                  </svg>
                </div>
              )}
            </div>
            <div className="flex gap-3" style={{ marginTop: 24, flexWrap: "wrap" }}>
              <button className="btn-primary" onClick={() => router.push(`/room/${roomId}/meeting`)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>
                {room.isActive ? "Join Meeting" : isTeacher ? "Start Meeting" : "Join Meeting"}
              </button>
              {isTeacher && (
                <>
                  <button className="btn-secondary" onClick={() => router.push(`/room/${roomId}/attendance`)}>Attendance</button>
                  <button className="btn-secondary" onClick={() => setShowRecordingModal(true)}>Add Recording</button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Recordings */}
        <h2 style={{ fontSize: 18, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 16 }}>Recordings ({recordings.length})</h2>
        {recordings.length === 0 ? (
          <div className="glass-card empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="5,3 19,12 5,21" /></svg>
            <h3>No recordings yet</h3>
            <p>{isTeacher ? "Add recording links after your classes" : "Your teacher will add recordings after sessions"}</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {recordings.map((rec) => (
              <div key={rec.id} className="glass-card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                <div className="flex items-center gap-3" style={{ flex: 1 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "var(--radius-md)", background: "rgba(234,67,53,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" strokeWidth="2"><polygon points="5,3 19,12 5,21" /></svg>
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>{rec.title}</p>
                    <p style={{ fontSize: 12, color: "var(--color-text-muted)" }}>By {rec.uploadedBy} • {formatDate(rec.createdAt)}</p>
                  </div>
                </div>
                <a href={rec.link} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ padding: "8px 16px", fontSize: 13 }}>Watch</a>
              </div>
            ))}
          </div>
        )}
      </main>
      <AddRecordingModal isOpen={showRecordingModal} onClose={() => setShowRecordingModal(false)} roomId={roomId} onRecordingAdded={fetchRecordings} />
    </div>
  );
}
