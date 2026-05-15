"use client";

import { useEffect, useState, useCallback } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/firebase/config";
import { useAuth } from "@/context/AuthContext";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import Navbar from "@/components/Navbar";
import CreateRoomModal from "@/components/CreateRoomModal";
import JoinRoomModal from "@/components/JoinRoomModal";
import Link from "next/link";

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

export default function DashboardPage() {
  const { loading: authLoading } = useProtectedRoute();
  const { userData } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showClassPicker, setShowClassPicker] = useState(false);

  const fetchRooms = useCallback(async () => {
    if (!userData) return;

    setLoadingRooms(true);
    try {
      let q;
      if (userData.role === "teacher") {
        q = query(
          collection(db, "rooms"),
          where("teacherId", "==", userData.uid)
        );
      } else {
        q = query(
          collection(db, "rooms"),
          where("participants", "array-contains", userData.uid)
        );
      }

      const snapshot = await getDocs(q);
      const fetchedRooms: Room[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Room[];

      fetchedRooms.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRooms(fetchedRooms);
    } catch (err) {
      console.error("Failed to fetch rooms:", err);
    } finally {
      setLoadingRooms(false);
    }
  }, [userData]);

  useEffect(() => {
    if (userData) fetchRooms();
  }, [userData, fetchRooms]);

  if (authLoading || !userData) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-surface)" }}>
        <div className="spinner" />
      </div>
    );
  }

  const liveRooms = rooms.filter((r) => r.isActive);

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-surface-elevated)" }}>
      <Navbar />

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px" }}>
        {/* Hero: Join / Start class — centered, clean */}
        <div className="page-enter" style={{ textAlign: "center", marginBottom: 48 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 8 }}>
            {getGreeting()}, {userData.name.split(" ")[0]}
          </h1>
          <p style={{ fontSize: 15, color: "var(--color-text-secondary)", marginBottom: 32 }}>
            {userData.role === "teacher"
              ? "Start a class or manage your batches"
              : "Join your class to attend the session"}
          </p>

          {/* Main CTA Button */}
          <button
            className="btn-primary"
            onClick={() => {
              if (rooms.length === 0 && userData.role === "student") {
                setShowJoinModal(true);
              } else {
                setShowClassPicker(true);
              }
            }}
            style={{
              padding: "16px 40px",
              fontSize: 16,
              fontWeight: 600,
              borderRadius: "var(--radius-lg)",
              boxShadow: "0 4px 20px rgba(37, 99, 235, 0.25)",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
            {userData.role === "teacher" ? "Start a Class" : "Join Class"}
          </button>

          {/* Secondary actions */}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 16 }}>
            {userData.role === "teacher" && (
              <button className="btn-secondary" onClick={() => setShowCreateModal(true)} style={{ fontSize: 13 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New Batch
              </button>
            )}
            {userData.role === "student" && (
              <button className="btn-secondary" onClick={() => setShowJoinModal(true)} style={{ fontSize: 13 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" /><polyline points="10,17 15,12 10,7" /><line x1="15" y1="12" x2="3" y2="12" />
                </svg>
                Join with Code
              </button>
            )}
          </div>
        </div>

        {/* Live now indicator */}
        {liveRooms.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div className="card" style={{ padding: "16px 20px", borderLeft: "3px solid var(--color-success)" }}>
              <div className="flex items-center gap-3">
                <span className="badge badge-live">Live Now</span>
                <span style={{ fontSize: 14, color: "var(--color-text-primary)", fontWeight: 500 }}>
                  {liveRooms.length} active {liveRooms.length === 1 ? "session" : "sessions"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Your classes list */}
        {!loadingRooms && rooms.length > 0 && (
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 12 }}>
              {userData.role === "teacher" ? "Your Batches" : "Enrolled Classes"}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {rooms.map((room) => (
                <Link key={room.id} href={`/room/${room.id}`} style={{ textDecoration: "none" }}>
                  <div
                    className="card"
                    style={{
                      padding: "14px 20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {/* Subject icon */}
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: "var(--radius-md)",
                          background: room.isActive ? "var(--color-success-light)" : "var(--color-primary-light)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={room.isActive ? "var(--color-success)" : "var(--color-primary)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                        </svg>
                      </div>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 2 }}>
                          {room.roomName}
                        </p>
                        <p style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                          {room.subject} · {room.teacherName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {room.isActive && <span className="badge badge-live">Live</span>}
                      {userData.role === "teacher" && (
                        <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 600, color: "var(--color-primary)", letterSpacing: "0.05em" }}>
                          {room.roomCode}
                        </span>
                      )}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2">
                        <polyline points="9,18 15,12 9,6" />
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loadingRooms && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: 66 }} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loadingRooms && rooms.length === 0 && (
          <div className="card empty-state" style={{ marginTop: 8 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
            </svg>
            <h3>No classes yet</h3>
            <p>
              {userData.role === "teacher"
                ? "Create your first batch to start teaching"
                : "Ask your teacher for a room code to join a class"}
            </p>
            <button
              className="btn-primary"
              style={{ marginTop: 16 }}
              onClick={() =>
                userData.role === "teacher"
                  ? setShowCreateModal(true)
                  : setShowJoinModal(true)
              }
            >
              {userData.role === "teacher" ? "Create Batch" : "Join a Class"}
            </button>
          </div>
        )}
      </main>

      {/* Class picker modal — "which class do you want to join?" */}
      {showClassPicker && (
        <div className="modal-overlay" onClick={() => setShowClassPicker(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 4 }}>
                {userData.role === "teacher" ? "Start a class" : "Which class do you want to join?"}
              </h2>
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                {userData.role === "teacher"
                  ? "Select a batch to start the session"
                  : "Select your class to join the live session"}
              </p>
            </div>

            {rooms.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <p style={{ fontSize: 14, color: "var(--color-text-muted)", marginBottom: 16 }}>
                  No classes found
                </p>
                <button
                  className="btn-primary"
                  onClick={() => {
                    setShowClassPicker(false);
                    userData.role === "teacher" ? setShowCreateModal(true) : setShowJoinModal(true);
                  }}
                >
                  {userData.role === "teacher" ? "Create a Batch" : "Join with Code"}
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 320, overflowY: "auto" }}>
                {rooms.map((room) => (
                  <Link
                    key={room.id}
                    href={`/room/${room.id}/meeting`}
                    onClick={() => setShowClassPicker(false)}
                    style={{ textDecoration: "none" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 16px",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--color-border)",
                        cursor: "pointer",
                        transition: "all var(--transition-fast)",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-surface-hover)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: "var(--radius-md)",
                            background: room.isActive ? "var(--color-success-light)" : "var(--color-primary-light)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={room.isActive ? "var(--color-success)" : "var(--color-primary)"} strokeWidth="2">
                            <path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                          </svg>
                        </div>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 2 }}>
                            {room.roomName}
                          </p>
                          <p style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                            {room.subject}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {room.isActive && <span className="badge badge-live" style={{ fontSize: 10 }}>Live</span>}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2">
                          <polyline points="9,18 15,12 9,6" />
                        </svg>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
              <button className="btn-secondary" onClick={() => setShowClassPicker(false)} style={{ fontSize: 13 }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateRoomModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onRoomCreated={fetchRooms}
      />
      <JoinRoomModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onRoomJoined={fetchRooms}
      />
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
