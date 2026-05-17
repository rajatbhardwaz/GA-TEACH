"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import { useAuth } from "@/context/AuthContext";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import dynamic from "next/dynamic";
import Link from "next/link";

// Dynamic import with SSR disabled — Jitsi needs browser APIs
const JitsiMeeting = dynamic(() => import("@/components/JitsiMeeting"), {
  ssr: false,
  loading: () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", background: "#000" }}>
      <div style={{ textAlign: "center" }}>
        <div className="spinner" style={{ width: 48, height: 48, margin: "0 auto 16px" }} />
        <p style={{ color: "#94a3b8", fontSize: 14 }}>Loading meeting interface...</p>
      </div>
    </div>
  ),
});

interface Room {
  id: string;
  roomName: string;
  subject: string;
  teacherName: string;
  teacherId: string;
  roomCode: string;
  createdAt: string;
  participants: string[];
  isActive: boolean;
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
    try {
      const roomDoc = await getDoc(doc(db, "rooms", roomId));
      if (roomDoc.exists()) {
        setRoom({ id: roomDoc.id, ...roomDoc.data() } as Room);
      }
    } catch (err) {
      console.error("Failed to fetch room:", err);
    } finally {
      setLoadingRoom(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchRoom();
  }, [fetchRoom]);

  const isTeacher = userData?.role === "teacher" && userData?.uid === room?.teacherId;

  if (authLoading || loadingRoom) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--color-surface)",
          gap: 16,
        }}
      >
        <div className="spinner" style={{ width: 48, height: 48 }} />
        <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>
          Loading meeting...
        </p>
      </div>
    );
  }

  if (!room) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--color-surface)",
        }}
      >
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <h3>Room not found</h3>
          <p>This meeting room doesn&apos;t exist or has been removed.</p>
          <button
            className="btn-primary"
            style={{ marginTop: 16 }}
            onClick={() => router.push("/dashboard")}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Pre-join lobby
  if (!joined) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: "var(--color-surface)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background effects */}
        <div
          style={{
            position: "absolute",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(26,115,232,0.08) 0%, transparent 70%)",
            top: -200,
            right: -200,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(52,168,83,0.06) 0%, transparent 70%)",
            bottom: -150,
            left: -150,
            pointerEvents: "none",
          }}
        />

        <div className="page-enter" style={{ width: "100%", maxWidth: 520, position: "relative", zIndex: 1 }}>
          {/* Back link */}
          <Link
            href={`/room/${roomId}`}
            className="flex items-center gap-2 no-underline"
            style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 24, display: "inline-flex" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12,19 5,12 12,5" />
            </svg>
            Back to Room
          </Link>

          {/* Meeting lobby card */}
          <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
            {/* Top gradient */}
            <div
              style={{
                height: 4,
                background: room.isActive
                  ? "linear-gradient(90deg, #34a853, #4ade80)"
                  : "linear-gradient(90deg, #1a73e8, #8ab4f8)",
              }}
            />

            {/* Meeting preview */}
            <div
              style={{
                height: 200,
                background: "linear-gradient(135deg, #1a1a2e, #0d0d1a)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
                position: "relative",
              }}
            >
              {/* Camera icon */}
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "var(--radius-full)",
                  background: "linear-gradient(135deg, #1a73e8, #4285f4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 8px 32px rgba(26, 115, 232, 0.35)",
                }}
              >
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M23 7l-7 5 7 5V7z" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
              </div>
              <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                Your camera preview will appear here
              </p>

              {/* Status badge */}
              {room.isActive && (
                <div
                  style={{
                    position: "absolute",
                    top: 16,
                    right: 16,
                  }}
                >
                  <span className="badge badge-live">Meeting in progress</span>
                </div>
              )}
            </div>

            {/* Room info */}
            <div style={{ padding: "28px 32px" }}>
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  color: "var(--color-text-primary)",
                  marginBottom: 6,
                }}
              >
                {room.roomName}
              </h1>
              <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 20 }}>
                {room.subject} • {room.teacherName}
              </p>

              {/* Meeting info */}
              <div
                style={{
                  display: "flex",
                  gap: 20,
                  padding: "16px 0",
                  borderTop: "1px solid var(--color-border)",
                  borderBottom: "1px solid var(--color-border)",
                  marginBottom: 24,
                  flexWrap: "wrap",
                }}
              >
                <div className="flex items-center gap-2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--color-text-muted)"
                    strokeWidth="2"
                  >
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 00-3-3.87" />
                    <path d="M16 3.13a4 4 0 010 7.75" />
                  </svg>
                  <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                    {room.participants?.length || 0} enrolled
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--color-text-muted)"
                    strokeWidth="2"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                  <span
                    style={{
                      fontSize: 13,
                      fontFamily: "monospace",
                      color: "var(--color-primary)",
                      fontWeight: 600,
                      letterSpacing: "0.05em",
                    }}
                  >
                    {room.roomCode}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={room.isActive ? "var(--color-success)" : "var(--color-text-muted)"}
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12,6 12,12 16,14" />
                  </svg>
                  <span style={{ fontSize: 13, color: room.isActive ? "var(--color-success)" : "var(--color-text-secondary)" }}>
                    {room.isActive ? "Live now" : "Not started"}
                  </span>
                </div>
              </div>

              {/* Joining as info */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 24,
                  padding: "12px 16px",
                  background: "rgba(26, 115, 232, 0.06)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid rgba(26, 115, 232, 0.1)",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "var(--radius-full)",
                    background: "linear-gradient(135deg, #8ab4f8, #1a73e8)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#fff",
                    flexShrink: 0,
                  }}
                >
                  {userData?.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>
                    {userData?.name}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                    Joining as {isTeacher ? "Host (Teacher)" : "Participant (Student)"}
                  </p>
                </div>
              </div>

              {/* Join button */}
              <div className="flex gap-3">
                <button
                  className="btn-primary"
                  style={{ flex: 1, padding: "14px 24px", fontSize: 15 }}
                  onClick={async () => {
                    // Generate a unique session ID so the Jitsi room is fresh
                    // (first joiner auto-becomes moderator, no login needed)
                    if (isTeacher) {
                      const sessionId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
                      await updateDoc(doc(db, "rooms", roomId), { currentSession: sessionId });
                      setMeetingSession(sessionId);
                    } else {
                      // Student: fetch the current session from Firestore
                      const freshRoom = await getDoc(doc(db, "rooms", roomId));
                      const session = freshRoom.data()?.currentSession || roomId;
                      setMeetingSession(session);
                    }
                    setJoined(true);
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M23 7l-7 5 7 5V7z" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                  {isTeacher
                    ? room.isActive
                      ? "Rejoin Meeting"
                      : "Start Meeting"
                    : "Join Now"}
                </button>
                <button
                  className="btn-secondary"
                  style={{ padding: "14px 24px" }}
                  onClick={() => router.push(`/room/${roomId}`)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active meeting view
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#000",
        overflow: "hidden",
      }}
    >
      {/* Top bar with back/leave button — always visible */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px",
          background: "var(--color-surface)",
          borderBottom: "1px solid var(--color-border)",
          zIndex: 20,
          flexShrink: 0,
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="btn-icon"
            title="Back to Dashboard"
            style={{ width: 36, height: 36 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12,19 5,12 12,5" />
            </svg>
          </button>
          <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>
            {room.roomName}
          </span>
          <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
            {room.subject}
          </span>
        </div>
        <button
          onClick={() => router.push("/dashboard")}
          className="btn-danger"
          style={{ padding: "6px 16px", fontSize: 13 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16,17 21,12 16,7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Leave
        </button>
      </div>

      {/* Jitsi meeting iframe */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <JitsiMeeting roomId={roomId} roomName={room.roomName} isTeacher={isTeacher} meetingSession={meetingSession} />
      </div>
    </div>
  );
}
