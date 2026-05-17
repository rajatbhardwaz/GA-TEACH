"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import { useAuth } from "@/context/AuthContext";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import dynamic from "next/dynamic";
import Link from "next/link";

const JitsiMeeting = dynamic(() => import("@/components/JitsiMeeting"), {
  ssr: false,
  loading: () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", background: "#000" }}>
      <div style={{ textAlign: "center" }}>
        <div className="spinner" style={{ width: 48, height: 48, margin: "0 auto 16px" }} />
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Setting up your classroom...</p>
      </div>
    </div>
  ),
});

interface Room {
  id: string; roomName: string; subject: string; teacherName: string;
  teacherId: string; roomCode: string; createdAt: string;
  participants: string[]; isActive: boolean;
}

export default function MeetingPage() {
  const { loading: authLoading } = useProtectedRoute();
  const { userData } = useAuth();
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  const [room, setRoom] = useState<Room | null>(null);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [joined, setJoined] = useState(false);
  const [meetingSession, setMeetingSession] = useState<string>("");

  const fetchRoom = useCallback(async () => {
    try { const roomDoc = await getDoc(doc(db, "rooms", roomId)); if (roomDoc.exists()) setRoom({ id: roomDoc.id, ...roomDoc.data() } as Room); } catch (err) { console.error(err); }
    finally { setLoadingRoom(false); }
  }, [roomId]);

  useEffect(() => { fetchRoom(); }, [fetchRoom]);

  const isTeacher = userData?.role === "teacher" && userData?.uid === room?.teacherId;

  if (authLoading || loadingRoom) {
    return (<div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg-base)", gap: 16 }}><div className="spinner" style={{ width: 48, height: 48 }} /><p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Preparing your classroom...</p></div>);
  }

  if (!room) {
    return (<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-base)" }}><div className="empty-state"><h3>Batch not found</h3><p>This classroom doesn&apos;t exist or has been removed.</p><button className="btn-primary" style={{ marginTop: 16 }} onClick={() => router.push("/dashboard")}>Back to Dashboard</button></div></div>);
  }

  // Pre-join lobby
  if (!joined) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--bg-base)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)", top: -200, right: -200, pointerEvents: "none" }} />

        <div className="page-enter" style={{ width: "100%", maxWidth: 520, position: "relative", zIndex: 1 }}>
          <Link href={`/room/${roomId}`} style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24, display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12,19 5,12 12,5"/></svg>
            Back to Batch
          </Link>

          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ height: 4, background: room.isActive ? "linear-gradient(90deg, var(--green), #4ade80)" : "linear-gradient(90deg, var(--blue), #818cf8)" }} />
            
            {/* Classroom preview */}
            <div style={{ height: 200, background: "linear-gradient(135deg, #0a0a12, #111118)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, position: "relative" }}>
              <div style={{ width: 80, height: 80, borderRadius: "var(--radius-full)", background: "linear-gradient(135deg, var(--blue), #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 32px rgba(59,130,246,0.3)" }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Camera preview will appear here</p>
              {room.isActive && (
                <div style={{ position: "absolute", top: 16, right: 16 }}>
                  <span className="badge badge-live">Class in progress</span>
                </div>
              )}
            </div>

            <div style={{ padding: "28px 32px" }}>
              <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>{room.roomName}</h1>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 20 }}>{room.subject} • Faculty: {room.teacherName}</p>

              <div style={{ display: "flex", gap: 20, padding: "16px 0", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", marginBottom: 24, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{room.participants?.length || 0} students enrolled</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                  <span style={{ fontSize: 13, fontFamily: "monospace", color: "var(--blue)", fontWeight: 600 }}>{room.roomCode}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={room.isActive ? "var(--green)" : "var(--text-muted)"} strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
                  <span style={{ fontSize: 13, color: room.isActive ? "var(--green)" : "var(--text-secondary)" }}>{room.isActive ? "Class is live" : "Not started yet"}</span>
                </div>
              </div>

              {/* Joining as */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, padding: "12px 16px", background: "var(--blue-light)", borderRadius: "var(--radius-md)", border: "1px solid rgba(59,130,246,0.1)" }}>
                <div style={{ width: 36, height: 36, borderRadius: "var(--radius-full)", background: "linear-gradient(135deg, var(--blue), #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, color: "#fff", flexShrink: 0 }}>
                  {userData?.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{userData?.name}</p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Joining as {isTeacher ? "Faculty (Host)" : "Student"}</p>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button className="btn-primary" style={{ flex: 1, padding: "14px 24px", fontSize: 15 }} onClick={async () => {
                  if (isTeacher) {
                    const sessionId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
                    await updateDoc(doc(db, "rooms", roomId), { currentSession: sessionId });
                    setMeetingSession(sessionId);
                  } else {
                    const freshRoom = await getDoc(doc(db, "rooms", roomId));
                    const session = freshRoom.data()?.currentSession || roomId;
                    setMeetingSession(session);
                  }
                  setJoined(true);
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                  {isTeacher ? (room.isActive ? "Rejoin Classroom" : "Start Live Class") : "Enter Classroom"}
                </button>
                <button className="btn-secondary" style={{ padding: "14px 24px" }} onClick={() => router.push(`/room/${roomId}`)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active classroom view
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#000", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", background: "var(--bg-surface)", borderBottom: "1px solid var(--border)", zIndex: 20, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.push("/dashboard")} className="btn-icon" title="Back to Dashboard" style={{ width: 36, height: 36 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12,19 5,12 12,5"/></svg>
          </button>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{room.roomName}</span>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{room.subject}</span>
          <span className="badge badge-live" style={{ marginLeft: 8 }}>Live Class</span>
        </div>
        <button onClick={() => router.push("/dashboard")} className="btn-danger" style={{ padding: "6px 16px", fontSize: 13 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          End Class
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <JitsiMeeting roomId={roomId} roomName={room.roomName} isTeacher={isTeacher} meetingSession={meetingSession} />
      </div>
    </div>
  );
}
