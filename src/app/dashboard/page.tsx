"use client";

import { useEffect, useState, useCallback } from "react";
import { collection, query, where, getDocs, doc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase/config";
import { useAuth } from "@/context/AuthContext";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import CreateRoomModal from "@/components/CreateRoomModal";
import JoinRoomModal from "@/components/JoinRoomModal";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDate } from "@/utils/helpers";

interface Room {
  id: string; roomName: string; subject: string; teacherName: string;
  teacherId: string; roomCode: string; createdAt: string;
  participants: string[]; isActive: boolean; scheduledAt?: string; currentSession?: string;
}

export default function DashboardPage() {
  const { loading: authLoading } = useProtectedRoute();
  const { userData } = useAuth();
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showClassPicker, setShowClassPicker] = useState(false);
  const [activeTab, setActiveTab] = useState<"all"|"upcoming"|"completed">("all");
  const [terminatingRoomId, setTerminatingRoomId] = useState<string | null>(null);

  const fetchRooms = useCallback(async () => {
    if (!userData) return;
    setLoadingRooms(true);
    try {
      const q = userData.role === "admin"
        ? query(collection(db, "rooms"))
        : userData.role === "teacher"
        ? query(collection(db, "rooms"), where("teacherId", "==", userData.uid))
        : query(collection(db, "rooms"), where("participants", "array-contains", userData.uid));
      const snapshot = await getDocs(q);
      const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Room[];
      fetched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRooms(fetched);
    } catch (err) { console.error("Failed to fetch rooms:", err); }
    finally { setLoadingRooms(false); }
  }, [userData]);

  useEffect(() => {
    if (!userData) return;

    const roomsQuery = userData.role === "admin"
      ? query(collection(db, "rooms"))
      : userData.role === "teacher"
      ? query(collection(db, "rooms"), where("teacherId", "==", userData.uid))
      : query(collection(db, "rooms"), where("participants", "array-contains", userData.uid));

    const unsubscribe = onSnapshot(
      roomsQuery,
      (snapshot) => {
        const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Room[];
        fetched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setRooms(fetched);
        setLoadingRooms(false);
      },
      (err) => {
        console.error("Failed to subscribe to rooms:", err);
        setLoadingRooms(false);
      }
    );

    return () => unsubscribe();
  }, [userData]);

  const handleTerminateLiveClass = async (room: Room) => {
    if (!userData || !room.isActive) return;
    const canTerminate = userData.role === "admin" || (userData.role === "teacher" && room.teacherId === userData.uid);
    if (!canTerminate) return;

    const confirmed = window.confirm(`Terminate the live class "${room.roomName}"? Students will no longer be able to join this session.`);
    if (!confirmed) return;

    setTerminatingRoomId(room.id);
    try {
      await updateDoc(doc(db, "rooms", room.id), {
        isActive: false,
        currentSession: null,
        endedAt: new Date().toISOString(),
        endedBy: userData.uid,
      });
      setRooms(prev => prev.map(r => r.id === room.id ? { ...r, isActive: false, currentSession: undefined } : r));
    } catch (err) {
      console.error("Failed to terminate live class:", err);
      window.alert("Could not terminate the live class. Please try again.");
    } finally {
      setTerminatingRoomId(null);
    }
  };

  if (authLoading) {
    return (<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-base)" }}><div className="spinner" /></div>);
  }

  if (!userData) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, padding: 24, textAlign: "center", background: "var(--bg-base)" }}>
        <p style={{ color: "var(--text-secondary)", fontSize: 15, maxWidth: 360 }}>Unable to load your profile.</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-secondary" onClick={() => window.location.reload()}>Retry</button>
          <a href="/login"><button className="btn-primary">Go to Login</button></a>
        </div>
      </div>
    );
  }

  const isTeacher = userData.role === "teacher" || userData.role === "admin";
  const liveRooms = rooms.filter(r => r.isActive);
  const now = new Date();
  const upcomingRooms = rooms.filter(r => r.scheduledAt && new Date(r.scheduledAt) > now && !r.isActive);
  const completedRooms = rooms.filter(r => !r.isActive && (!r.scheduledAt || new Date(r.scheduledAt) <= now));
  const filteredRooms = activeTab === "upcoming" ? upcomingRooms : activeTab === "completed" ? completedRooms : rooms;

  const stats = [
    { label: isTeacher ? "Total Batches" : "Enrolled Batches", value: rooms.length, color: "var(--blue)", bg: "var(--blue-light)",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg> },
    { label: "Live Now", value: liveRooms.length, color: "var(--green)", bg: "var(--green-light)",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg> },
    { label: "Upcoming Sessions", value: upcomingRooms.length, color: "var(--yellow)", bg: "var(--yellow-light)",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg> },
    { label: isTeacher ? "Total Students" : "Completed Sessions", value: isTeacher ? rooms.reduce((s,r) => s + (r.participants?.length||0), 0) : completedRooms.length, color: "var(--purple)", bg: "var(--purple-light)",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg> },
  ];

  return (
    <DashboardLayout title="Dashboard">
      <div className="page-enter">
        {/* Greeting + Actions */}
        <div className="dash-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
              {getGreeting()}, {userData.name.split(" ")[0]} 🎯
            </h1>
            <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
              {isTeacher
                ? "Manage your batches, track attendance, and inspire your students."
                : "Stay consistent. Your preparation today shapes your success tomorrow."}
            </p>
          </div>
          <div className="dash-actions" style={{ display: "flex", gap: 12 }}>
            {isTeacher ? (
              <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Create Batch
              </button>
            ) : (
              <button className="btn-primary" onClick={() => setShowJoinModal(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10,17 15,12 10,7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                Join with Batch Code
              </button>
            )}
            <button className="btn-success" onClick={() => rooms.length > 0 ? setShowClassPicker(true) : (isTeacher ? setShowCreateModal(true) : setShowJoinModal(true))}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
              {isTeacher ? "Start Live Class" : "Join Live Class"}
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
          {stats.map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
              <div>
                <p className="stat-value">{s.value}</p>
                <p className="stat-label">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Live class banner */}
        {liveRooms.length > 0 && (
          <div className="card live-banner" style={{ padding: "16px 24px", marginBottom: 24, borderLeft: "3px solid var(--green)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="badge badge-live">Live Now</span>
              <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{liveRooms[0].roomName}</span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{liveRooms[0].subject} · {liveRooms[0].teacherName}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Link href={`/room/${liveRooms[0].id}/meeting`}>
                <button className="btn-success" style={{ padding: "7px 18px", fontSize: 13 }}>Join Class Now →</button>
              </Link>
              {isTeacher && (
                <button
                  className="btn-danger"
                  disabled={terminatingRoomId === liveRooms[0].id}
                  onClick={() => handleTerminateLiveClass(liveRooms[0])}
                  style={{ padding: "7px 18px", fontSize: 13 }}
                >
                  {terminatingRoomId === liveRooms[0].id ? "Terminating..." : "Terminate Class"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Two-column layout: Batches + Activity */}
        <div className="dash-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "start" }}>
          {/* Left: Batch list */}
          <div>
            {/* Tabs */}
            <div className="batch-tabs" style={{ display: "flex", alignItems: "center", gap: 2, marginBottom: 20, borderBottom: "1px solid var(--border)" }}>
              {(["all","upcoming","completed"] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  padding: "10px 18px", fontSize: 13, fontWeight: 500, cursor: "pointer", border: "none", background: "transparent",
                  color: activeTab === tab ? "var(--blue)" : "var(--text-muted)",
                  borderBottom: activeTab === tab ? "2px solid var(--blue)" : "2px solid transparent",
                  transition: "all var(--transition-fast)",
                }}>{tab === "all" ? `All Batches (${rooms.length})` : tab === "upcoming" ? `Upcoming (${upcomingRooms.length})` : `Completed (${completedRooms.length})`}</button>
              ))}
            </div>

            {/* Room list */}
            {loadingRooms ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 72 }}/>)}</div>
            ) : filteredRooms.length === 0 ? (
              <div className="card empty-state" style={{ marginTop: 8 }}>
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
                <h3>{activeTab === "all" ? "No batches yet" : `No ${activeTab} sessions`}</h3>
                <p>{isTeacher ? "Create your first batch to start teaching" : "Join a batch with your batch code to begin learning"}</p>
                {activeTab === "all" && <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => isTeacher ? setShowCreateModal(true) : setShowJoinModal(true)}>{isTeacher ? "Create First Batch" : "Join a Batch"}</button>}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {filteredRooms.map(room => (
                    <div key={room.id} className="card card-interactive" onClick={() => router.push(`/room/${room.id}`)} style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, cursor: "pointer" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>
                        <div style={{ width: 42, height: 42, borderRadius: "var(--radius-md)", background: room.isActive ? "var(--green-light)" : "var(--blue-light)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {room.isActive ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                          ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
                          )}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 3 }}>{room.roomName}</p>
                          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                            {room.subject} · {room.teacherName}
                            {room.scheduledAt && ` · ${formatDate(room.scheduledAt)}`}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        {room.isActive && <span className="badge badge-live">Live</span>}
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{room.participants?.length || 0} students</span>
                        {isTeacher && <span style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 600, color: "var(--blue)", background: "var(--blue-light)", padding: "3px 8px", borderRadius: "var(--radius-sm)" }}>{room.roomCode}</span>}
                        {isTeacher && room.isActive && (
                          <button
                            className="btn-danger"
                            disabled={terminatingRoomId === room.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTerminateLiveClass(room);
                            }}
                            style={{ padding: "5px 10px", fontSize: 11 }}
                          >
                            {terminatingRoomId === room.id ? "Ending..." : "Terminate"}
                          </button>
                        )}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><polyline points="9,18 15,12 9,6"/></svg>
                      </div>
                    </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Quick Info Panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Quick Actions */}
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>Quick Actions</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {isTeacher ? (
                  <>
                    <button className="btn-primary" style={{ width: "100%", justifyContent: "flex-start" }} onClick={() => setShowCreateModal(true)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      Create New Batch
                    </button>
                    <Link href="/recordings" style={{ textDecoration: "none" }}>
                      <button className="btn-secondary" style={{ width: "100%", justifyContent: "flex-start" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        Upload Recording
                      </button>
                    </Link>
                  </>
                ) : (
                  <>
                    <button className="btn-primary" style={{ width: "100%", justifyContent: "flex-start" }} onClick={() => setShowJoinModal(true)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10,17 15,12 10,7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                      Join with Batch Code
                    </button>
                    <Link href="/recordings" style={{ textDecoration: "none" }}>
                      <button className="btn-secondary" style={{ width: "100%", justifyContent: "flex-start" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16"/></svg>
                        Watch Lecture Recordings
                      </button>
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>Recent Activity</h3>
              {rooms.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No recent activity yet</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {rooms.slice(0, 4).map(room => (
                    <div key={room.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: room.isActive ? "var(--green)" : "var(--text-muted)", flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{room.roomName}</p>
                        <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{room.subject} · {formatDate(room.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Motivational Card */}
            <div className="card" style={{ padding: 20, background: "var(--blue-light)", borderColor: "rgba(59,130,246,0.15)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <img src="/logo.png" alt="GA" style={{ width: 30, height: 30, objectFit: "contain" }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--blue)" }}>Glorious Amplification</span>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, fontStyle: "italic" }}>
                &ldquo;Discipline is the bridge between goals and accomplishment.&rdquo;
              </p>
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>Stay focused. Stay consistent. 🎯</p>
            </div>
          </div>
        </div>
      </div>

      {/* Batch picker modal */}
      {showClassPicker && (
        <div className="modal-overlay" onClick={() => setShowClassPicker(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{isTeacher ? "Start a live class" : "Join a session"}</h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>Select a batch to {isTeacher ? "begin teaching" : "join the lecture"}</p>
            {rooms.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 16 }}>No batches found</p>
                <button className="btn-primary" onClick={() => {
                  setShowClassPicker(false);
                  if (isTeacher) setShowCreateModal(true);
                  else setShowJoinModal(true);
                }}>{isTeacher ? "Create Batch" : "Join with Code"}</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 320, overflowY: "auto" }}>
                {rooms.map(room => (
                  <Link key={room.id} href={`/room/${room.id}/meeting`} onClick={() => setShowClassPicker(false)} style={{ textDecoration: "none" }}>
                    <div className="card card-interactive" style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: "var(--radius-md)", background: room.isActive ? "var(--green-light)" : "var(--blue-light)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={room.isActive ? "var(--green)" : "var(--blue)"} strokeWidth="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                        </div>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 2 }}>{room.roomName}</p>
                          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{room.subject} · {room.teacherName}</p>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {room.isActive && <span className="badge badge-live" style={{ fontSize: 10 }}>Live</span>}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><polyline points="9,18 15,12 9,6"/></svg>
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
    </DashboardLayout>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}
