"use client";

import { useEffect, useState, useCallback } from "react";
import { collection, query, where, getDocs, doc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase/config";
import { useAuth } from "@/context/AuthContext";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { useLanguage } from "@/context/LanguageContext";
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
  status?: "active" | "paused" | "deleted";
}

export default function DashboardPage() {
  const { loading: authLoading } = useProtectedRoute();
  const { userData } = useAuth();
  const { language, t } = useLanguage();
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showClassPicker, setShowClassPicker] = useState(false);
  const [terminatingRoomId, setTerminatingRoomId] = useState<string | null>(null);

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
        <p style={{ color: "var(--text-secondary)", fontSize: 15, maxWidth: 360 }}>{t("dash.unable_load_profile")}</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-secondary" onClick={() => window.location.reload()}>{t("dash.retry")}</button>
          <a href="/login"><button className="btn-primary">{t("dash.go_login")}</button></a>
        </div>
      </div>
    );
  }

  const isTeacher = userData.role === "teacher" || userData.role === "admin";
  const liveRooms = rooms.filter(r => r.isActive && (r.status || "active") !== "paused");
  const now = new Date();
  const upcomingRooms = rooms.filter(r => r.scheduledAt && new Date(r.scheduledAt) > now && !r.isActive);
  const completedRooms = rooms.filter(r => !r.isActive && (!r.scheduledAt || new Date(r.scheduledAt) <= now));
  const pausedRooms = rooms.filter(r => r.status === "paused");
  const totalStudents = rooms.reduce((s, r) => s + (r.participants?.length || 0), 0);

  // Get today's date info
  const today = new Date();
  const todayStr = today.toLocaleDateString(language === "hi" ? "hi-IN" : language === "es" ? "es-ES" : language === "fr" ? "fr-FR" : "en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const getGreetingKey = (): string => {
    const h = new Date().getHours();
    return h < 12 ? "greeting.morning" : h < 17 ? "greeting.afternoon" : "greeting.evening";
  };

  const stats = [
    {
      label: isTeacher ? t("stats.total_batches") : t("stats.enrolled_batches"), value: rooms.length, color: "var(--blue)", bg: "var(--blue-light)",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg>
    },
    {
      label: t("stats.live_now"), value: liveRooms.length, color: "var(--green)", bg: "var(--green-light)",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>
    },
    {
      label: t("stats.upcoming_sessions"), value: upcomingRooms.length, color: "var(--yellow)", bg: "var(--yellow-light)",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12,6 12,12 16,14" /></svg>
    },
    {
      label: isTeacher ? t("stats.total_students") : t("stats.completed_sessions"), value: isTeacher ? totalStudents : completedRooms.length, color: "var(--purple)", bg: "var(--purple-light)",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>
    },
  ];

  return (
    <DashboardLayout title={t("dash.title")}>
      <div className="page-enter">
        {/* Greeting + Actions */}
        <div className="dash-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
              {t(getGreetingKey())}, {userData.name.split(" ")[0]} 🎯
            </h1>
            <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
              {todayStr}
            </p>
          </div>
          <div className="dash-actions" style={{ display: "flex", gap: 12 }}>
            <button className="btn-success" onClick={() => rooms.length > 0 ? setShowClassPicker(true) : (isTeacher ? setShowCreateModal(true) : setShowJoinModal(true))}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>
              {isTeacher ? t("dash.start_live") : t("dash.join_live")}
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

        {/* Live class banners (all live rooms) */}
        {liveRooms.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)", animation: "pulse-dot 2s ease-in-out infinite" }} />
              {t("dash.live_classes")}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {liveRooms.map(room => (
                <div key={room.id} className="card live-banner" style={{
                  padding: "16px 24px", borderLeft: "3px solid var(--green)",
                  display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span className="badge badge-live">{t("dash.live_now")}</span>
                    <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{room.roomName}</span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{room.subject} · {room.teacherName}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <Link href={`/room/${room.id}/meeting`}>
                      <button className="btn-success" style={{ padding: "7px 18px", fontSize: 13 }}>{t("dash.join_class_now")}</button>
                    </Link>
                    {isTeacher && (
                      <button
                        className="btn-danger"
                        disabled={terminatingRoomId === room.id}
                        onClick={() => handleTerminateLiveClass(room)}
                        style={{ padding: "7px 18px", fontSize: 13 }}
                      >
                        {terminatingRoomId === room.id ? t("dash.terminating") : t("dash.terminate_class")}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Two-column layout: Overview + Sidebar */}
        <div className="dash-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "start" }}>
          {/* Left: Overview Section */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* At a Glance */}
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 20 }}>
                {t("dash.at_a_glance")}
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* Active Batches */}
                <div style={{ padding: 16, borderRadius: "var(--radius-md)", background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)" }} />
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>{t("dash.active_batches")}</span>
                  </div>
                  <p style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>
                    {rooms.filter(r => (r.status || "active") === "active").length}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                    {liveRooms.length} {t("dash.live_now").toLowerCase()}
                  </p>
                </div>

                {/* Paused Batches */}
                <div style={{ padding: 16, borderRadius: "var(--radius-md)", background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--yellow)" }} />
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>{t("dash.paused_batches")}</span>
                  </div>
                  <p style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>
                    {pausedRooms.length}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                    {pausedRooms.length > 0 ? "Awaiting action" : "None paused"}
                  </p>
                </div>

                {/* Upcoming */}
                <div style={{ padding: 16, borderRadius: "var(--radius-md)", background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--blue)" }} />
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>{t("dash.upcoming_title")}</span>
                  </div>
                  <p style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>
                    {upcomingRooms.length}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                    {upcomingRooms.length > 0 ? `Next: ${formatDate(upcomingRooms[0].scheduledAt!)}` : "No upcoming sessions"}
                  </p>
                </div>

                {/* Total Students / Completed */}
                <div style={{ padding: 16, borderRadius: "var(--radius-md)", background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--purple)" }} />
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>{isTeacher ? t("stats.total_students") : t("stats.completed_sessions")}</span>
                  </div>
                  <p style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>
                    {isTeacher ? totalStudents : completedRooms.length}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                    {isTeacher ? `Across ${rooms.length} batches` : `${completedRooms.length} sessions finished`}
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Batches (top 3 only) */}
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{t("dash.recent_batches")}</h3>
                <Link href="/batches" style={{ fontSize: 13, color: "var(--blue)", textDecoration: "none", fontWeight: 500 }}>
                  {t("dash.view_all")}
                </Link>
              </div>
              {loadingRooms ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 60 }} />)}</div>
              ) : rooms.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 0" }}>
                  <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 12 }}>{t("dash.no_batches")}</p>
                  <button className="btn-primary" onClick={() => isTeacher ? setShowCreateModal(true) : setShowJoinModal(true)} style={{ fontSize: 13 }}>
                    {isTeacher ? t("dash.create_first_batch") : t("dash.join_batch")}
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {rooms.slice(0, 3).map(room => (
                    <div
                      key={room.id}
                      className="card card-interactive"
                      onClick={() => router.push(`/room/${room.id}`)}
                      style={{ padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, cursor: "pointer" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: "var(--radius-md)",
                          background: room.isActive ? "var(--green-light)" : room.status === "paused" ? "var(--yellow-light)" : "var(--blue-light)",
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}>
                          {room.isActive ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>
                          ) : room.status === "paused" ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" strokeWidth="2"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                          ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg>
                          )}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>{room.roomName}</p>
                          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{room.subject} · {room.participants?.length || 0} students</p>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        {room.isActive && <span className="badge badge-live" style={{ fontSize: 10 }}>{t("dash.live_now")}</span>}
                        {room.status === "paused" && <span className="badge" style={{ background: "var(--yellow-light)", color: "var(--yellow)", border: "1px solid rgba(234,179,8,0.2)", fontSize: 10 }}>Paused</span>}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><polyline points="9,18 15,12 9,6" /></svg>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Sidebar panels */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Quick Actions */}
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>{t("dash.quick_actions")}</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {isTeacher ? (
                  <>
                    <button className="btn-primary" style={{ width: "100%", justifyContent: "flex-start" }} onClick={() => setShowCreateModal(true)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                      {t("actions.create_new_batch")}
                    </button>
                    <Link href="/batches" style={{ textDecoration: "none" }}>
                      <button className="btn-secondary" style={{ width: "100%", justifyContent: "flex-start" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg>
                        {t("actions.manage_batches")}
                      </button>
                    </Link>
                    <Link href="/recordings" style={{ textDecoration: "none" }}>
                      <button className="btn-secondary" style={{ width: "100%", justifyContent: "flex-start" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17,8 12,3 7,8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                        {t("actions.upload_recording")}
                      </button>
                    </Link>
                  </>
                ) : (
                  <>
                    <button className="btn-primary" style={{ width: "100%", justifyContent: "flex-start" }} onClick={() => setShowJoinModal(true)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" /><polyline points="10,17 15,12 10,7" /><line x1="15" y1="12" x2="3" y2="12" /></svg>
                      {t("actions.join_with_code")}
                    </button>
                    <Link href="/batches" style={{ textDecoration: "none" }}>
                      <button className="btn-secondary" style={{ width: "100%", justifyContent: "flex-start" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg>
                        {t("nav.my_batches")}
                      </button>
                    </Link>
                    <Link href="/recordings" style={{ textDecoration: "none" }}>
                      <button className="btn-secondary" style={{ width: "100%", justifyContent: "flex-start" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polygon points="10,8 16,12 10,16" /></svg>
                        {t("actions.watch_recordings")}
                      </button>
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>{t("dash.recent_activity")}</h3>
              {rooms.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{t("dash.no_recent_activity")}</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {rooms.slice(0, 5).map(room => (
                    <div key={room.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                        background: room.isActive ? "var(--green)" : room.status === "paused" ? "var(--yellow)" : "var(--text-muted)",
                      }} />
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
                &ldquo;{t("quote.4")}&rdquo;
              </p>
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>{t("dash.stay_focused")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Batch picker modal */}
      {showClassPicker && (
        <div className="modal-overlay" onClick={() => setShowClassPicker(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{isTeacher ? t("picker.start_live_title") : t("picker.join_live_title")}</h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>{isTeacher ? t("picker.select_batch_desc") : t("picker.select_join_desc")}</p>
            {rooms.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 16 }}>{t("picker.no_batches_found")}</p>
                <button className="btn-primary" onClick={() => {
                  setShowClassPicker(false);
                  if (isTeacher) setShowCreateModal(true);
                  else setShowJoinModal(true);
                }}>{isTeacher ? t("picker.create_batch") : t("picker.join_code")}</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 320, overflowY: "auto" }}>
                {rooms.filter(r => (r.status || "active") !== "paused").map(room => (
                  <Link key={room.id} href={`/room/${room.id}/meeting`} onClick={() => setShowClassPicker(false)} style={{ textDecoration: "none" }}>
                    <div className="card card-interactive" style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: "var(--radius-md)", background: room.isActive ? "var(--green-light)" : "var(--blue-light)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={room.isActive ? "var(--green)" : "var(--blue)"} strokeWidth="2"><path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>
                        </div>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 2 }}>{room.roomName}</p>
                          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{room.subject} · {room.teacherName}</p>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {room.isActive && <span className="badge badge-live" style={{ fontSize: 10 }}>{t("dash.live_now")}</span>}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><polyline points="9,18 15,12 9,6" /></svg>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
              <button className="btn-secondary" onClick={() => setShowClassPicker(false)} style={{ fontSize: 13 }}>{t("picker.cancel")}</button>
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
