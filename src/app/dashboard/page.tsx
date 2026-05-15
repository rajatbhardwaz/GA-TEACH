"use client";

import { useEffect, useState, useCallback } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/firebase/config";
import { useAuth } from "@/context/AuthContext";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import Navbar from "@/components/Navbar";
import RoomCard from "@/components/RoomCard";
import CreateRoomModal from "@/components/CreateRoomModal";
import JoinRoomModal from "@/components/JoinRoomModal";

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

  const fetchRooms = useCallback(async () => {
    if (!userData) return;

    setLoadingRooms(true);
    try {
      let q;
      if (userData.role === "teacher") {
        // Teachers see rooms they created
        q = query(
          collection(db, "rooms"),
          where("teacherId", "==", userData.uid)
        );
      } else {
        // Students see rooms they've joined
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

      // Sort client-side (avoids needing Firestore composite indexes)
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
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--color-surface)",
        }}
      >
        <div className="spinner" />
      </div>
    );
  }

  const liveRooms = rooms.filter((r) => r.isActive);
  const otherRooms = rooms.filter((r) => !r.isActive);

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-surface)" }}>
      <Navbar />

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        {/* Header section */}
        <div className="page-enter">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              marginBottom: 8,
            }}
          >
            <h1
              style={{
                fontSize: 28,
                fontWeight: 600,
                color: "var(--color-text-primary)",
              }}
            >
              {getGreeting()}, {userData.name.split(" ")[0]}
            </h1>
            <p style={{ fontSize: 15, color: "var(--color-text-secondary)" }}>
              {userData.role === "teacher"
                ? "Manage your classrooms and start meetings"
                : "Join your classes and attend live meetings"}
            </p>
          </div>

          {/* Quick actions */}
          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 24,
              marginBottom: 36,
              flexWrap: "wrap",
            }}
          >
            {userData.role === "teacher" ? (
              <>
                <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  New Classroom
                </button>
                <button className="btn-secondary" onClick={() => setShowJoinModal(true)}>
                  <svg
                    width="18"
                    height="18"
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
                  Start Instant Meeting
                </button>
              </>
            ) : (
              <button className="btn-primary" onClick={() => setShowJoinModal(true)}>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
                  <polyline points="10,17 15,12 10,7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
                Join with Code
              </button>
            )}
          </div>
        </div>

        {/* Loading skeleton */}
        {loadingRooms && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: 200 }} />
            ))}
          </div>
        )}

        {/* Live rooms section */}
        {!loadingRooms && liveRooms.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <div className="flex items-center gap-2" style={{ marginBottom: 16 }}>
              <span className="badge badge-live">Live Now</span>
              <h2 style={{ fontSize: 16, fontWeight: 500, color: "var(--color-text-primary)" }}>
                Active Meetings ({liveRooms.length})
              </h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
              {liveRooms.map((room) => (
                <RoomCard key={room.id} room={room} role={userData.role} />
              ))}
            </div>
          </div>
        )}

        {/* Other rooms */}
        {!loadingRooms && otherRooms.length > 0 && (
          <div>
            <h2
              style={{
                fontSize: 16,
                fontWeight: 500,
                color: "var(--color-text-secondary)",
                marginBottom: 16,
              }}
            >
              {userData.role === "teacher" ? "Your Classrooms" : "Enrolled Classrooms"} ({otherRooms.length})
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
              {otherRooms.map((room) => (
                <RoomCard key={room.id} room={room} role={userData.role} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loadingRooms && rooms.length === 0 && (
          <div className="empty-state glass-card" style={{ marginTop: 32 }}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M23 7l-7 5 7 5V7z" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
            <h3>No classrooms yet</h3>
            <p>
              {userData.role === "teacher"
                ? "Create your first classroom to get started with online teaching"
                : "Ask your teacher for a room code and join your first class"}
            </p>
            <button
              className="btn-primary"
              style={{ marginTop: 20 }}
              onClick={() =>
                userData.role === "teacher"
                  ? setShowCreateModal(true)
                  : setShowJoinModal(true)
              }
            >
              {userData.role === "teacher" ? "Create Classroom" : "Join a Room"}
            </button>
          </div>
        )}
      </main>

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
