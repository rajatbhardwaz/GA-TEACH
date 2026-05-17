"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/firebase/config";
import { useAuth } from "@/context/AuthContext";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import { formatDate, formatDuration } from "@/utils/helpers";
import Link from "next/link";

interface Room { id: string; roomName: string; subject: string; teacherName: string; teacherId: string; roomCode: string; }
interface AttendanceRecord { id: string; roomId: string; userId: string; userName: string; userRole: string; joinTime: string; leaveTime: string | null; duration: number | null; }

export default function AttendancePage() {
  const { loading: authLoading } = useProtectedRoute();
  const { userData } = useAuth();
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  const [room, setRoom] = useState<Room | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [filterRole, setFilterRole] = useState<"all"|"student"|"teacher">("all");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchRoom = useCallback(async () => {
    try { const roomDoc = await getDoc(doc(db, "rooms", roomId)); if (roomDoc.exists()) setRoom({ id: roomDoc.id, ...roomDoc.data() } as Room); } catch (err) { console.error(err); }
  }, [roomId]);

  const fetchAttendance = useCallback(async () => {
    try {
      const q = query(collection(db, "attendance"), where("roomId", "==", roomId));
      const snapshot = await getDocs(q);
      const fetched: AttendanceRecord[] = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as AttendanceRecord[];
      fetched.sort((a, b) => new Date(b.joinTime).getTime() - new Date(a.joinTime).getTime());
      setRecords(fetched);
    } catch (err) { console.error(err); }
  }, [roomId]);

  useEffect(() => { const load = async () => { setLoadingData(true); await Promise.all([fetchRoom(), fetchAttendance()]); setLoadingData(false); }; load(); }, [fetchRoom, fetchAttendance]);

  const isTeacher = userData?.role === "teacher" && userData?.uid === room?.teacherId;

  const getUniqueAttendees = () => { const m = new Map<string, AttendanceRecord>(); for (const r of records) { if (!m.has(r.userId)) m.set(r.userId, r); } return Array.from(m.values()); };
  const getTotalDuration = (uid: string): number => records.filter(r => r.userId === uid && r.duration !== null).reduce((s, r) => s + (r.duration || 0), 0);
  const getSessionCount = (uid: string): number => records.filter(r => r.userId === uid && r.leaveTime !== null).length;

  const uniqueAttendees = getUniqueAttendees();
  const filteredAttendees = uniqueAttendees.filter(r => {
    const matchesRole = filterRole === "all" || r.userRole === filterRole;
    const matchesSearch = searchTerm === "" || r.userName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const totalStudents = uniqueAttendees.filter(r => r.userRole === "student").length;
  const totalFaculty = uniqueAttendees.filter(r => r.userRole === "teacher").length;
  const totalSessions = records.filter(r => r.leaveTime !== null).length;
  const avgDuration = totalSessions > 0 ? Math.round(records.filter(r => r.duration !== null).reduce((s, r) => s + (r.duration || 0), 0) / totalSessions) : 0;

  if (authLoading || loadingData) return (<div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "center" }}><div className="spinner" /></div>);
  if (!room) return (<div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "center" }}><div className="empty-state"><h3>Batch not found</h3><button className="btn-primary" style={{ marginTop: 16 }} onClick={() => router.push("/dashboard")}>Dashboard</button></div></div>);
  if (!isTeacher) return (<div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "center" }}><div className="empty-state"><h3>Access Restricted</h3><p>Only the batch faculty can view student attendance.</p><button className="btn-primary" style={{ marginTop: 16 }} onClick={() => router.push(`/room/${roomId}`)}>Back to Batch</button></div></div>);

  const stats = [
    { label: "Students Attended", value: totalStudents, color: "var(--blue)", bg: "var(--blue-light)",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg> },
    { label: "Faculty Present", value: totalFaculty, color: "var(--yellow)", bg: "var(--yellow-light)",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
    { label: "Total Sessions", value: totalSessions, color: "var(--green)", bg: "var(--green-light)",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg> },
    { label: "Avg Study Time", value: formatDuration(avgDuration), color: "var(--purple)", bg: "var(--purple-light)",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/></svg> },
  ];

  return (
    <DashboardLayout title="Student Attendance">
      <div className="page-enter">
        <Link href={`/room/${roomId}`} style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24, display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12,19 5,12 12,5"/></svg>
          Back to {room.roomName}
        </Link>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Student Attendance</h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>Track who attended lectures in <strong>{room.roomName}</strong> — {room.subject}</p>
        </div>

        {/* Stats */}
        <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
          {stats.map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
              <div><p className="stat-value">{s.value}</p><p className="stat-label">{s.label}</p></div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="attendance-filters" style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search student name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input-field" style={{ paddingLeft: 36 }} />
          </div>
          <div className="attendance-filter-btns" style={{ display: "flex", gap: 6 }}>
            {([
              { key: "all" as const, label: "All" },
              { key: "student" as const, label: "Students" },
              { key: "teacher" as const, label: "Faculty" },
            ]).map(f => (
              <button key={f.key} onClick={() => setFilterRole(f.key)} style={{
                padding: "8px 16px", borderRadius: "var(--radius-full)",
                border: `1px solid ${filterRole === f.key ? "var(--blue)" : "var(--border-light)"}`,
                background: filterRole === f.key ? "var(--blue-light)" : "transparent",
                color: filterRole === f.key ? "var(--blue)" : "var(--text-secondary)",
                fontSize: 13, fontWeight: 500, cursor: "pointer",
              }}>{f.label}</button>
            ))}
          </div>
        </div>

        {/* Table */}
        {filteredAttendees.length === 0 ? (
          <div className="card empty-state"><h3>No attendance records</h3><p>{searchTerm ? "No matching students found." : "Attendance will be recorded automatically when students join live classes."}</p></div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="attendance-table-header" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", padding: "14px 20px", background: "var(--bg-elevated)", borderBottom: "1px solid var(--border)", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", gap: 12 }}>
              <span>Student Name</span><span>Role</span><span>Last Attended</span><span>Lectures</span><span>Study Time</span>
            </div>
            {filteredAttendees.map((record, index) => (
              <div key={record.id} className="attendance-table-row" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", padding: "14px 20px", borderBottom: index < filteredAttendees.length - 1 ? "1px solid var(--border)" : "none", alignItems: "center", gap: 12, transition: "background var(--transition-fast)" }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-hover)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "var(--radius-full)", background: record.userRole === "teacher" ? "linear-gradient(135deg, var(--yellow), #f59e0b)" : "linear-gradient(135deg, var(--blue), #818cf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: record.userRole === "teacher" ? "#000" : "#fff", flexShrink: 0 }}>
                    {record.userName.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{record.userName}</span>
                </div>
                <span className={`badge ${record.userRole === "teacher" ? "badge-teacher" : "badge-student"}`}>{record.userRole === "teacher" ? "Faculty" : "Student"}</span>
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{formatDate(record.joinTime)}</span>
                <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{getSessionCount(record.userId)}</span>
                <span style={{ fontSize: 14, fontWeight: 500, color: getTotalDuration(record.userId) > 0 ? "var(--green)" : "var(--text-muted)" }}>
                  {getTotalDuration(record.userId) > 0 ? formatDuration(getTotalDuration(record.userId)) : "In class"}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Detailed session log */}
        {records.length > 0 && (
          <div style={{ marginTop: 36 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>Detailed Session Log ({records.length})</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {records.map(record => (
                <div key={record.id} className="card session-log-card" style={{ padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: record.leaveTime ? "var(--text-muted)" : "var(--green)", boxShadow: record.leaveTime ? "none" : "0 0 8px rgba(34,197,94,0.4)", flexShrink: 0 }} />
                    <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{record.userName}</span>
                    <span className={`badge ${record.userRole === "teacher" ? "badge-teacher" : "badge-student"}`} style={{ fontSize: 10, padding: "2px 8px" }}>{record.userRole === "teacher" ? "Faculty" : "Student"}</span>
                  </div>
                  <div className="session-log-meta" style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Joined: {formatDate(record.joinTime)}</span>
                    {record.leaveTime ? (
                      <>
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Left: {formatDate(record.leaveTime)}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--green)", background: "var(--green-light)", padding: "3px 10px", borderRadius: "var(--radius-full)" }}>
                          {record.duration != null ? formatDuration(record.duration) : "—"}
                        </span>
                      </>
                    ) : (
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--green)", background: "var(--green-light)", padding: "3px 10px", borderRadius: "var(--radius-full)" }}>● In Class</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
