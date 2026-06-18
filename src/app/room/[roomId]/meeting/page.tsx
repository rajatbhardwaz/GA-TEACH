"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, addDoc, deleteDoc, collection, onSnapshot } from "firebase/firestore";
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
  participants: string[]; isActive: boolean; currentSession?: string;
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

  // Join request state (student lobby)
  const [joinRequestId, setJoinRequestId] = useState<string | null>(null);
  const [joinRequestStatus, setJoinRequestStatus] = useState<"idle" | "pending" | "accepted" | "declined">("idle");
  const joinRequestIdRef = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "rooms", roomId),
      (roomDoc) => {
        if (roomDoc.exists()) setRoom({ id: roomDoc.id, ...roomDoc.data() } as Room);
        setLoadingRoom(false);
      },
      (err) => {
        console.error(err);
        setLoadingRoom(false);
      }
    );

    return () => unsubscribe();
  }, [roomId]);

  const isTeacher = (userData?.role === "teacher" || userData?.role === "admin") && userData?.uid === room?.teacherId;

  useEffect(() => {
    if (!joined || !roomId) return;
    const unsub = onSnapshot(doc(db, "rooms", roomId), (snap) => {
      if (!snap.exists()) {
        router.push("/dashboard");
        return;
      }
      const nextRoom = { id: snap.id, ...snap.data() } as Room;
      setRoom(nextRoom);
      if (!nextRoom.isActive) {
        router.push("/dashboard");
      }
    });
    return () => unsub();
  }, [joined, roomId, router]);

  // Listen for join request status changes (student side)
  useEffect(() => {
    if (!joinRequestId) return;
    const unsub = onSnapshot(doc(db, "joinRequests", joinRequestId), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.status === "accepted") {
        setJoinRequestStatus("accepted");
        // Auto-join the meeting
        const session = data.meetingSession || roomId;
        setMeetingSession(session);
        setTimeout(() => setJoined(true), 800); // Brief delay for UX
      } else if (data.status === "declined") {
        setJoinRequestStatus("declined");
      }
    });
    return () => unsub();
  }, [joinRequestId, roomId]);

  // Cleanup pending request on unmount
  useEffect(() => {
    joinRequestIdRef.current = joinRequestId;
  }, [joinRequestId]);

  useEffect(() => {
    return () => {
      if (joinRequestIdRef.current) {
        deleteDoc(doc(db, "joinRequests", joinRequestIdRef.current)).catch(console.error);
      }
    };
  }, []);

  // Student: send join request
  const handleStudentJoinRequest = async () => {
    if (!userData || !room) return;
    try {
      const freshRoom = await getDoc(doc(db, "rooms", roomId));
      const session = freshRoom.data()?.currentSession || roomId;
      const requestRef = await addDoc(collection(db, "joinRequests"), {
        roomId,
        meetingSession: session,
        studentId: userData.uid,
        studentName: userData.name,
        studentEmail: userData.email || "",
        status: "pending",
        requestedAt: new Date().toISOString(),
      });
      setJoinRequestId(requestRef.id);
      setJoinRequestStatus("pending");
    } catch (err) {
      console.error("Failed to send join request:", err);
    }
  };

  // Student: cancel request
  const handleCancelRequest = async () => {
    if (joinRequestId) {
      await deleteDoc(doc(db, "joinRequests", joinRequestId)).catch(console.error);
      setJoinRequestId(null);
      setJoinRequestStatus("idle");
    }
  };

  // Student: retry after decline
  const handleRetryRequest = () => {
    setJoinRequestId(null);
    setJoinRequestStatus("idle");
  };

  if (authLoading || loadingRoom) {
    return (<div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg-base)", gap: 16 }}><div className="spinner" style={{ width: 48, height: 48 }} /><p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Preparing your classroom...</p></div>);
  }

  if (!room) {
    return (<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-base)" }}><div className="empty-state"><h3>Batch not found</h3><p>This classroom doesn&apos;t exist or has been removed.</p><button className="btn-primary" style={{ marginTop: 16 }} onClick={() => router.push("/dashboard")}>Back to Dashboard</button></div></div>);
  }

  const isParticipant = room.participants?.includes(userData?.uid || "");
  const hasAccess = userData?.role === "admin" || isTeacher || isParticipant;

  if (!hasAccess) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div className="card empty-state" style={{ maxWidth: 440, padding: 32, textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--red-light)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>Access Restricted</h3>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 20 }}>
            You are not enrolled in this batch, or your enrollment is awaiting manual payment approval. Please join using the batch code or check with your teacher.
          </p>
          <button className="btn-primary" style={{ margin: "0 auto" }} onClick={() => router.push("/dashboard")}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Student waiting screen (after sending join request) ──
  if (!isTeacher && joinRequestStatus !== "idle") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--bg-base)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)", top: -200, right: -200, pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(168,85,247,0.04) 0%, transparent 60%)", bottom: -150, left: -100, pointerEvents: "none" }} />

        <div className="page-enter" style={{ width: "100%", maxWidth: 460, position: "relative", zIndex: 1, textAlign: "center" }}>
          <div className="card" style={{ padding: 40 }}>
            {/* Status icon */}
            <div style={{
              width: 80, height: 80, borderRadius: "50%", margin: "0 auto 24px",
              background: joinRequestStatus === "declined" ? "var(--red-light)" : "linear-gradient(135deg, rgba(59,130,246,0.12), rgba(168,85,247,0.12))",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: joinRequestStatus === "declined" ? "2px solid rgba(239,68,68,0.2)" : "2px solid rgba(59,130,246,0.15)",
            }}>
              {joinRequestStatus === "pending" && (
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" style={{ animation: "spin 3s linear infinite" }}>
                  <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="15" />
                </svg>
              )}
              {joinRequestStatus === "accepted" && (
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5">
                  <polyline points="20,6 9,17 4,12" />
                </svg>
              )}
              {joinRequestStatus === "declined" && (
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
              )}
            </div>

            {/* Title */}
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
              {joinRequestStatus === "pending" && "Waiting for Teacher"}
              {joinRequestStatus === "accepted" && "Request Accepted!"}
              {joinRequestStatus === "declined" && "Request Declined"}
            </h1>

            {/* Status badge */}
            {joinRequestStatus === "pending" && (
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px",
                borderRadius: "var(--radius-full)", background: "var(--blue-light)",
                border: "1px solid rgba(59,130,246,0.15)", marginBottom: 20,
              }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--blue)", animation: "pulse-dot 2s ease-in-out infinite" }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--blue)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Knock sent</span>
              </div>
            )}

            {/* Description */}
            <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 28, maxWidth: 360, margin: "0 auto 28px" }}>
              {joinRequestStatus === "pending" && "Your request to join has been sent to the teacher. Please wait while they review your request."}
              {joinRequestStatus === "accepted" && "The teacher has approved your entry. Connecting you to the classroom..."}
              {joinRequestStatus === "declined" && "The teacher has declined your request to join this session. You can try again or go back."}
            </p>

            {/* Class info */}
            <div style={{
              background: "var(--bg-elevated)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)", padding: 16, marginBottom: 24, textAlign: "left",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: "var(--radius-md)", background: "var(--blue-light)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{room.roomName}</p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{room.subject} • {room.teacherName}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              {joinRequestStatus === "pending" && (
                <button className="btn-secondary" onClick={handleCancelRequest} style={{ padding: "10px 24px" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  Cancel Request
                </button>
              )}
              {joinRequestStatus === "declined" && (
                <>
                  <button className="btn-primary" onClick={handleRetryRequest} style={{ padding: "10px 24px" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23,4 23,10 17,10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
                    Try Again
                  </button>
                  <button className="btn-secondary" onClick={() => router.push(`/room/${roomId}`)} style={{ padding: "10px 24px" }}>
                    Go Back
                  </button>
                </>
              )}
            </div>
          </div>

          <p style={{ fontSize: 12, textAlign: "center", marginTop: 16, color: "var(--text-muted)" }}>
            Glorious Amplification — Live Classroom
          </p>
        </div>
      </div>
    );
  }

  // ── Pre-join lobby ──
  if (!joined) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--bg-base)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)", top: -200, right: -200, pointerEvents: "none" }} />

        <div className="page-enter meeting-prejoin-card" style={{ width: "100%", maxWidth: 520, position: "relative", zIndex: 1 }}>
          <Link href={`/room/${roomId}`} style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24, display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12,19 5,12 12,5"/></svg>
            Back to Batch
          </Link>

          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ height: 4, background: room.isActive ? "linear-gradient(90deg, var(--green), #4ade80)" : "linear-gradient(90deg, var(--blue), #818cf8)" }} />
            
            {/* Classroom preview */}
            <div className="meeting-prejoin-preview" style={{ height: 200, background: "linear-gradient(135deg, #0a0a12, #111118)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, position: "relative" }}>
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

            <div className="meeting-prejoin-content" style={{ padding: "28px 32px" }}>
              <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>{room.roomName}</h1>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 20 }}>{room.subject} • Faculty: {room.teacherName}</p>

              <div className="meeting-prejoin-stats" style={{ display: "flex", gap: 20, padding: "16px 0", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", marginBottom: 24, flexWrap: "wrap" }}>
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

              {/* Student info note */}
              {!isTeacher && (
                <div style={{ padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--yellow-light)", border: "1px solid rgba(234,179,8,0.15)", fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 20 }}>
                  <span style={{ fontWeight: 600, color: "var(--yellow)" }}>Note:</span> You can join directly once the class is live.
                </div>
              )}

              <div className="meeting-prejoin-actions" style={{ display: "flex", gap: 12 }}>
                <button className="btn-primary" disabled={!isTeacher && !room.isActive} style={{ flex: 1, padding: "14px 24px", fontSize: 15 }} onClick={async () => {
                  if (isTeacher) {
                    const sessionId = room.isActive && room.currentSession
                      ? room.currentSession
                      : Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
                    await updateDoc(doc(db, "rooms", roomId), { currentSession: sessionId, isActive: true });
                    setMeetingSession(sessionId);
                    setRoom((prev) => prev ? { ...prev, currentSession: sessionId, isActive: true } : prev);
                    setJoined(true);
                  } else {
                    setMeetingSession(room.currentSession || roomId);
                    setJoined(true);
                  }
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                  {isTeacher ? (room.isActive ? "Rejoin Classroom" : "Start Live Class") : room.isActive ? "Join Classroom" : "Class Not Started"}
                </button>
                <button className="btn-secondary" style={{ padding: "14px 24px" }} onClick={() => router.push(`/room/${roomId}`)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Active classroom view ──
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#000", overflow: "hidden" }}>
      <div className="meeting-topbar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", background: "var(--bg-surface)", borderBottom: "1px solid var(--border)", zIndex: 20, flexShrink: 0 }}>
        <div className="meeting-topbar-info" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.push("/dashboard")} className="btn-icon" title="Back to Dashboard" style={{ width: 36, height: 36 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12,19 5,12 12,5"/></svg>
          </button>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{room.roomName}</span>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{room.subject}</span>
          <span className="badge badge-live" style={{ marginLeft: 8 }}>Live Class</span>
        </div>
        <button onClick={async () => {
          if (isTeacher) {
            await updateDoc(doc(db, "rooms", roomId), {
              isActive: false,
              currentSession: null,
              endedAt: new Date().toISOString(),
              endedBy: userData?.uid || null,
            }).catch(console.error);
          }
          router.push("/dashboard");
        }} className="btn-danger" style={{ padding: "6px 16px", fontSize: 13 }}>
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
