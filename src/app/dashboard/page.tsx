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
import { formatDate } from "@/utils/helpers";

interface Room {
  id: string; roomName: string; subject: string; teacherName: string;
  teacherId: string; roomCode: string; createdAt: string;
  participants: string[]; isActive: boolean; scheduledAt?: string;
}

export default function DashboardPage() {
  const { loading: authLoading } = useProtectedRoute();
  const { userData } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showClassPicker, setShowClassPicker] = useState(false);
  const [activeTab, setActiveTab] = useState<"all"|"upcoming"|"completed">("all");

  const fetchRooms = useCallback(async () => {
    if (!userData) return;
    setLoadingRooms(true);
    try {
      const q = userData.role === "teacher"
        ? query(collection(db, "rooms"), where("teacherId", "==", userData.uid))
        : query(collection(db, "rooms"), where("participants", "array-contains", userData.uid));
      const snapshot = await getDocs(q);
      const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Room[];
      fetched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRooms(fetched);
    } catch (err) { console.error("Failed to fetch rooms:", err); }
    finally { setLoadingRooms(false); }
  }, [userData]);

  useEffect(() => { if (userData) fetchRooms(); }, [userData, fetchRooms]);

  if (authLoading || !userData) {
    return (<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><div className="spinner" /></div>);
  }

  const isTeacher = userData.role === "teacher";
  const liveRooms = rooms.filter(r => r.isActive);
  const now = new Date();
  const upcomingRooms = rooms.filter(r => r.scheduledAt && new Date(r.scheduledAt) > now && !r.isActive);
  const completedRooms = rooms.filter(r => !r.isActive && (!r.scheduledAt || new Date(r.scheduledAt) <= now));

  const filteredRooms = activeTab === "upcoming" ? upcomingRooms
    : activeTab === "completed" ? completedRooms : rooms;

  const stats = [
    { label: "Total Classes", value: rooms.length, color: "#2563eb", bg: "#eff6ff",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg> },
    { label: "Live Now", value: liveRooms.length, color: "#16a34a", bg: "#f0fdf4",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg> },
    { label: "Upcoming", value: upcomingRooms.length, color: "#d97706", bg: "#fffbeb",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg> },
    { label: isTeacher ? "Students Enrolled" : "Completed", value: isTeacher ? rooms.reduce((s,r) => s + (r.participants?.length||0), 0) : completedRooms.length, color: "#7c3aed", bg: "#f5f3ff",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg> },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-surface-elevated)" }}>
      <Navbar />
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
        {/* Profile header */}
        <div className="page-enter" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
          <div className="flex items-center gap-4">
            <div style={{ width: 52, height: 52, borderRadius: "var(--radius-full)", background: "linear-gradient(135deg, #2563eb, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#fff" }}>
              {userData.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 2 }}>
                {getGreeting()}, {userData.name.split(" ")[0]}
              </h1>
              <div className="flex items-center gap-2">
                <span className={`badge ${isTeacher ? "badge-teacher" : "badge-student"}`}>{userData.role}</span>
                <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>{userData.email}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {isTeacher ? (
              <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                New Batch
              </button>
            ) : (
              <button className="btn-primary" onClick={() => setShowJoinModal(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10,17 15,12 10,7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                Join with Code
              </button>
            )}
            <button className="btn-primary" onClick={() => rooms.length > 0 ? setShowClassPicker(true) : (isTeacher ? setShowCreateModal(true) : setShowJoinModal(true))} style={{ background: "#16a34a" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
              {isTeacher ? "Start Class" : "Join Class"}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 12, marginBottom: 28 }}>
          {stats.map(s => (
            <div key={s.label} className="card" style={{ padding: "18px 16px", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: "var(--radius-md)", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", color: s.color, flexShrink: 0 }}>{s.icon}</div>
              <div>
                <p style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text-primary)", lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Live banner */}
        {liveRooms.length > 0 && (
          <div className="card" style={{ padding: "14px 20px", marginBottom: 20, borderLeft: "3px solid var(--color-success)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div className="flex items-center gap-3">
              <span className="badge badge-live">Live Now</span>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{liveRooms[0].roomName}</span>
            </div>
            <Link href={`/room/${liveRooms[0].id}/meeting`}><button className="btn-primary" style={{ padding: "6px 16px", fontSize: 13 }}>Join Now</button></Link>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1" style={{ marginBottom: 16, borderBottom: "1px solid var(--color-border)", paddingBottom: 0 }}>
          {(["all","upcoming","completed"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: "10px 18px", fontSize: 13, fontWeight: 500, cursor: "pointer", border: "none", background: "transparent",
              color: activeTab === tab ? "var(--color-primary)" : "var(--color-text-muted)",
              borderBottom: activeTab === tab ? "2px solid var(--color-primary)" : "2px solid transparent",
              transition: "all var(--transition-fast)", textTransform: "capitalize",
            }}>{tab === "all" ? `All (${rooms.length})` : tab === "upcoming" ? `Upcoming (${upcomingRooms.length})` : `Completed (${completedRooms.length})`}</button>
          ))}
        </div>

        {/* Class list */}
        {loadingRooms ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 72 }}/>)}</div>
        ) : filteredRooms.length === 0 ? (
          <div className="card empty-state" style={{ marginTop: 8 }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
            <h3>{activeTab === "all" ? "No classes yet" : `No ${activeTab} classes`}</h3>
            <p>{isTeacher ? "Create a batch to get started" : "Join a class with a room code"}</p>
            {activeTab === "all" && <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => isTeacher ? setShowCreateModal(true) : setShowJoinModal(true)}>{isTeacher ? "Create Batch" : "Join Class"}</button>}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filteredRooms.map(room => (
              <div key={room.id} className="card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <Link href={`/room/${room.id}`} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>
                  <div style={{ width: 42, height: 42, borderRadius: "var(--radius-md)", background: room.isActive ? "#f0fdf4" : "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={room.isActive ? "#16a34a" : "#2563eb"} strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 2 }}>{room.roomName}</p>
                    <p style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                      {room.subject} · {room.teacherName}
                      {room.scheduledAt && ` · ${formatDate(room.scheduledAt)}`}
                    </p>
                  </div>
                </Link>
                <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
                  {room.isActive && <span className="badge badge-live">Live</span>}
                  {isTeacher && <span style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 600, color: "var(--color-primary)", background: "var(--color-primary-light)", padding: "3px 8px", borderRadius: "var(--radius-sm)" }}>{room.roomCode}</span>}
                  {isTeacher && (
                    <Link href={`/room/${room.id}/attendance`} title="Attendance">
                      <button className="btn-icon" style={{ width: 32, height: 32 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17,11 19,13 23,9"/></svg>
                      </button>
                    </Link>
                  )}
                  <Link href={`/room/${room.id}`}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2"><polyline points="9,18 15,12 9,6"/></svg></Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Class picker modal */}
      {showClassPicker && (
        <div className="modal-overlay" onClick={() => setShowClassPicker(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{isTeacher ? "Start a class" : "Which class?"}</h2>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 20 }}>Select a class to join the session</p>
            {rooms.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <p style={{ fontSize: 14, color: "var(--color-text-muted)", marginBottom: 16 }}>No classes found</p>
                <button className="btn-primary" onClick={() => { setShowClassPicker(false); isTeacher ? setShowCreateModal(true) : setShowJoinModal(true); }}>{isTeacher ? "Create Batch" : "Join with Code"}</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 320, overflowY: "auto" }}>
                {rooms.map(room => (
                  <Link key={room.id} href={`/room/${room.id}/meeting`} onClick={() => setShowClassPicker(false)} style={{ textDecoration: "none" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", cursor: "pointer", transition: "all var(--transition-fast)" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "var(--color-surface-hover)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                      <div className="flex items-center gap-3">
                        <div style={{ width: 36, height: 36, borderRadius: "var(--radius-md)", background: room.isActive ? "#f0fdf4" : "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={room.isActive ? "#16a34a" : "#2563eb"} strokeWidth="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                        </div>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 2 }}>{room.roomName}</p>
                          <p style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{room.subject}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {room.isActive && <span className="badge badge-live" style={{ fontSize: 10 }}>Live</span>}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2"><polyline points="9,18 15,12 9,6"/></svg>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
              <button className="btn-secondary" onClick={() => setShowClassPicker(false)} style={{ fontSize: 13 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <CreateRoomModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onRoomCreated={fetchRooms} />
      <JoinRoomModal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} onRoomJoined={fetchRooms} />
    </div>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}
