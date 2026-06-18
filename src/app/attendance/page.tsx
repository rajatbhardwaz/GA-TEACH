"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/firebase/config";
import { useAuth } from "@/context/AuthContext";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { useLanguage } from "@/context/LanguageContext";
import DashboardLayout from "@/components/DashboardLayout";
import { formatDate, formatDuration } from "@/utils/helpers";

/* ─── Firestore types ─── */
interface Room {
  id: string;
  roomName: string;
  subject: string;
  teacherName: string;
  teacherId: string;
  participants: string[];
}
interface AttendanceRecord {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  userRole: string;
  joinTime: string;
  leaveTime: string | null;
  duration: number | null;
}

/* ─── Aggregated view-model ─── */
interface StudentAggregate {
  userId: string;
  userName: string;
  batches: { roomId: string; roomName: string }[];
  totalLectures: number;
  totalDuration: number; // minutes
  lastActive: string;
  records: AttendanceRecord[];
}

type DateFilter = "all" | "7d" | "30d";

export default function AttendancePage() {
  const { loading: authLoading } = useProtectedRoute();
  const { userData, isAdmin } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  /* Filters */
  const [searchTerm, setSearchTerm] = useState("");
  const [batchFilter, setBatchFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  /* Detail modal */
  const [selectedStudent, setSelectedStudent] = useState<StudentAggregate | null>(null);

  /* ─── fetch data ─── */
  const fetchData = useCallback(async () => {
    if (!userData) return;
    setLoadingData(true);
    try {
      // 1. get rooms
      let roomQuery;
      if (isAdmin) {
        roomQuery = query(collection(db, "rooms"));
      } else {
        roomQuery = query(collection(db, "rooms"), where("teacherId", "==", userData.uid));
      }
      const roomSnap = await getDocs(roomQuery);
      const fetchedRooms = roomSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Room[];
      setRooms(fetchedRooms);

      // 2. get attendance for those rooms
      const roomIds = fetchedRooms.map((r) => r.id);
      if (roomIds.length === 0) {
        setRecords([]);
        setLoadingData(false);
        return;
      }

      // Firestore `in` queries accept max 30 values — batch them
      const allRecords: AttendanceRecord[] = [];
      for (let i = 0; i < roomIds.length; i += 30) {
        const batch = roomIds.slice(i, i + 30);
        const q = query(collection(db, "attendance"), where("roomId", "in", batch));
        const snap = await getDocs(q);
        snap.docs.forEach((d) => allRecords.push({ id: d.id, ...d.data() } as AttendanceRecord));
      }
      allRecords.sort((a, b) => new Date(b.joinTime).getTime() - new Date(a.joinTime).getTime());
      setRecords(allRecords);
    } catch (err) {
      console.error("Failed to fetch attendance data:", err);
    }
    setLoadingData(false);
  }, [userData, isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ─── date-filtered records ─── */
  const filteredByDate = useMemo(() => {
    if (dateFilter === "all") return records;
    const now = Date.now();
    const cutoff = dateFilter === "7d" ? now - 7 * 86400000 : now - 30 * 86400000;
    return records.filter((r) => new Date(r.joinTime).getTime() >= cutoff);
  }, [records, dateFilter]);

  /* ─── batch-filtered records ─── */
  const filteredByBatch = useMemo(() => {
    if (batchFilter === "all") return filteredByDate;
    return filteredByDate.filter((r) => r.roomId === batchFilter);
  }, [filteredByDate, batchFilter]);

  /* ─── aggregate by student ─── */
  const studentAggregates = useMemo(() => {
    const map = new Map<string, StudentAggregate>();
    const studentRecords = filteredByBatch.filter((r) => r.userRole === "student");

    for (const r of studentRecords) {
      let agg = map.get(r.userId);
      if (!agg) {
        agg = {
          userId: r.userId,
          userName: r.userName,
          batches: [],
          totalLectures: 0,
          totalDuration: 0,
          lastActive: r.joinTime,
          records: [],
        };
        map.set(r.userId, agg);
      }
      agg.records.push(r);

      // unique batches
      const room = rooms.find((rm) => rm.id === r.roomId);
      if (room && !agg.batches.some((b) => b.roomId === room.id)) {
        agg.batches.push({ roomId: room.id, roomName: room.roomName });
      }

      // completed sessions count as lectures
      if (r.leaveTime) {
        agg.totalLectures++;
        agg.totalDuration += r.duration || 0;
      }

      if (new Date(r.joinTime).getTime() > new Date(agg.lastActive).getTime()) {
        agg.lastActive = r.joinTime;
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime()
    );
  }, [filteredByBatch, rooms]);

  /* ─── search filter ─── */
  const displayStudents = useMemo(() => {
    if (!searchTerm) return studentAggregates;
    const lower = searchTerm.toLowerCase();
    return studentAggregates.filter((s) => s.userName.toLowerCase().includes(lower));
  }, [studentAggregates, searchTerm]);

  /* ─── stats ─── */
  const totalStudents = studentAggregates.length;
  const totalLectures = studentAggregates.reduce((s, a) => s + a.totalLectures, 0);
  const totalMinutes = studentAggregates.reduce((s, a) => s + a.totalDuration, 0);
  const avgStudyTime = totalStudents > 0 ? Math.round(totalMinutes / totalStudents) : 0;
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

  /* ─── detail modal helpers ─── */
  const getStudentBatchBreakdown = (student: StudentAggregate) => {
    const map = new Map<string, { roomName: string; lectures: number; duration: number }>();
    for (const r of student.records) {
      const room = rooms.find((rm) => rm.id === r.roomId);
      const key = r.roomId;
      let entry = map.get(key);
      if (!entry) {
        entry = { roomName: room?.roomName || r.roomId, lectures: 0, duration: 0 };
        map.set(key, entry);
      }
      if (r.leaveTime) {
        entry.lectures++;
        entry.duration += r.duration || 0;
      }
    }
    return Array.from(map.values());
  };

  /* ─── access guard ─── */
  const isTeacherOrAdmin = userData?.role === "teacher" || userData?.role === "admin";

  if (authLoading || loadingData) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!isTeacherOrAdmin) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="empty-state">
          <h3>{t("attend.access_restricted")}</h3>
          <p>{t("attend.access_restricted_desc")}</p>
          <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => router.push("/dashboard")}>
            {t("attend.back_dashboard")}
          </button>
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: t("attend.total_students"), value: totalStudents, color: "var(--blue)", bg: "var(--blue-light)",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>,
    },
    {
      label: t("attend.total_lectures"), value: totalLectures, color: "var(--green)", bg: "var(--green-light)",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>,
    },
    {
      label: t("attend.avg_rate"), value: formatDuration(avgStudyTime), color: "var(--purple)", bg: "var(--purple-light)",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/></svg>,
    },
    {
      label: t("attend.total_hours"), value: `${totalHours}h`, color: "var(--yellow)", bg: "var(--yellow-light)",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
    },
  ];

  return (
    <DashboardLayout title={t("attend.title")}>
      <div className="page-enter">
        {/* Header */}
        <div style={{ marginBottom: 48, position: "relative", zIndex: 10 }}>
          <h1 className="text-gradient" style={{ fontSize: "clamp(24px, 4vw, 32px)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 6 }}>
            <span className="text-gradient">{t("attend.title")} 📋</span>
          </h1>
          <p style={{ fontSize: 15, color: "var(--text-secondary)", fontWeight: 500 }}>
            {isAdmin ? t("attend.subtitle_admin") : t("attend.subtitle")}
          </p>
        </div>

        {/* Massive Hero Stats Grid */}
        <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 24, marginBottom: 48 }}>
          {stats.map((s, i) => (
            <div key={s.label} className="glass-card stat-card" style={{ padding: 32, display: "flex", flexDirection: "column", gap: 24, animationDelay: `${i * 60}ms`, animation: `stagger-in 400ms ease-out ${i * 60}ms both` }}>
              <div className="stat-icon" style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: s.color }}>{s.icon}</div>
              <div>
                <p style={{ fontSize: 48, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 8, background: `linear-gradient(135deg, #fff, ${s.color})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{s.value}</p>
                <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-secondary)" }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
          {/* search */}
          <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder={t("attend.search_placeholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
              style={{ paddingLeft: 36 }}
            />
          </div>

          {/* batch filter dropdown */}
          <select
            className="input-field"
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
            style={{ minWidth: 180, cursor: "pointer" }}
          >
            <option value="all">{t("attend.all_batches")}</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>{r.roomName}</option>
            ))}
          </select>

          {/* date range pills */}
          <div style={{ display: "flex", gap: 6 }}>
            {([
              { key: "all" as DateFilter, label: t("attend.all_time") },
              { key: "30d" as DateFilter, label: t("attend.last_30_days") },
              { key: "7d" as DateFilter, label: t("attend.last_7_days") },
            ]).map((f) => (
              <button
                key={f.key}
                onClick={() => setDateFilter(f.key)}
                style={{
                  padding: "8px 16px", borderRadius: "var(--radius-full)",
                  border: `1px solid ${dateFilter === f.key ? "var(--blue)" : "var(--border-light)"}`,
                  background: dateFilter === f.key ? "var(--blue-light)" : "transparent",
                  color: dateFilter === f.key ? "var(--blue)" : "var(--text-secondary)",
                  fontSize: 13, fontWeight: 500, cursor: "pointer",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {displayStudents.length === 0 ? (
          <div className="glass-card empty-state" style={{ marginTop: 8, padding: 60, textAlign: "center", border: "1px dashed var(--border)" }}>
            <h3 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>{searchTerm ? t("attend.no_match") : t("attend.no_records")}</h3>
            <p style={{ fontSize: 15, color: "var(--text-secondary)" }}>{searchTerm ? "" : t("attend.no_records_desc")}</p>
          </div>
        ) : (
          <div className="glass-card" style={{ padding: 0, overflow: "hidden", overflowX: "auto", border: "1px solid var(--border-glow)", boxShadow: "var(--shadow-lg)" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("attend.col_name")}</th>
                  <th>{t("attend.col_batches")}</th>
                  <th>{t("attend.col_lectures")}</th>
                  <th>{t("attend.col_study_time")}</th>
                  <th>{t("attend.col_last_active")}</th>
                  <th style={{ textAlign: "right" }}>{t("attend.col_actions")}</th>
                </tr>
              </thead>
              <tbody>
                {displayStudents.map((student) => (
                  <tr key={student.userId}>
                    {/* name */}
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: "var(--radius-full)",
                          background: "linear-gradient(135deg, var(--blue), #818cf8)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 12, fontWeight: 600, color: "#fff", flexShrink: 0,
                        }}>
                          {student.userName.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 500 }}>{student.userName}</span>
                      </div>
                    </td>
                    {/* batches */}
                    <td>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {student.batches.slice(0, 2).map((b) => (
                          <span key={b.roomId} className="badge badge-student" style={{ fontSize: 10, padding: "3px 8px" }}>
                            {b.roomName}
                          </span>
                        ))}
                        {student.batches.length > 2 && (
                          <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 2, display: "flex", alignItems: "center" }}>
                            +{student.batches.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    {/* lectures */}
                    <td style={{ fontWeight: 500 }}>{student.totalLectures}</td>
                    {/* study time */}
                    <td style={{ fontWeight: 500, color: student.totalDuration > 0 ? "var(--green)" : "var(--text-muted)" }}>
                      {student.totalDuration > 0 ? formatDuration(student.totalDuration) : "—"}
                    </td>
                    {/* last active */}
                    <td style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                      {formatDate(student.lastActive)}
                    </td>
                    {/* action */}
                    <td style={{ textAlign: "right" }}>
                      <button
                        onClick={() => setSelectedStudent(student)}
                        style={{
                          padding: "6px 14px", borderRadius: "var(--radius-md)",
                          border: "1px solid var(--border-light)", background: "transparent",
                          color: "var(--blue)", fontSize: 12, fontWeight: 500, cursor: "pointer",
                          transition: "all var(--transition-bounce)",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--blue-light)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.transform = "none"; }}
                      >
                        {t("attend.view_details")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Student Detail Modal ─── */}
      {selectedStudent && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedStudent(null); }}
        >
          <div className="modal-content" style={{ maxWidth: 680, maxHeight: "85vh", overflow: "auto" }}>
            {/* header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "var(--radius-full)",
                  background: "linear-gradient(135deg, var(--blue), #818cf8)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, fontWeight: 700, color: "#fff",
                }}>
                  {selectedStudent.userName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{selectedStudent.userName}</h2>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
                    {selectedStudent.batches.map((b) => b.roomName).join(", ")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Quick stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
              <div style={{ padding: "12px 16px", borderRadius: "var(--radius-md)", background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                <p style={{ fontSize: 20, fontWeight: 700, color: "var(--blue)", margin: 0 }}>{selectedStudent.totalLectures}</p>
                <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>{t("attend.lectures_attended")}</p>
              </div>
              <div style={{ padding: "12px 16px", borderRadius: "var(--radius-md)", background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                <p style={{ fontSize: 20, fontWeight: 700, color: "var(--green)", margin: 0 }}>{formatDuration(selectedStudent.totalDuration)}</p>
                <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>{t("attend.total_time")}</p>
              </div>
              <div style={{ padding: "12px 16px", borderRadius: "var(--radius-md)", background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                <p style={{ fontSize: 20, fontWeight: 700, color: "var(--purple)", margin: 0 }}>{selectedStudent.batches.length}</p>
                <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>{t("attend.col_batches")}</p>
              </div>
            </div>

            {/* Per-batch breakdown */}
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 10 }}>
              {t("attend.batch_breakdown")}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 24 }}>
              {getStudentBatchBreakdown(selectedStudent).map((entry) => (
                <div
                  key={entry.roomName}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 16px", borderRadius: "var(--radius-md)",
                    background: "var(--bg-elevated)", border: "1px solid var(--border)",
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{entry.roomName}</span>
                  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {entry.lectures} {t("attend.col_lectures").toLowerCase()}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--green)", background: "var(--green-light)", padding: "2px 10px", borderRadius: "var(--radius-full)" }}>
                      {formatDuration(entry.duration)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Session log */}
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 10 }}>
              {t("attend.session_log")} ({selectedStudent.records.length})
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 260, overflowY: "auto" }}>
              {selectedStudent.records.map((record) => {
                const room = rooms.find((r) => r.id === record.roomId);
                return (
                  <div
                    key={record.id}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 14px", borderRadius: "var(--radius-sm)",
                      background: "var(--bg-base)", gap: 12, flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: record.leaveTime ? "var(--text-muted)" : "var(--green)",
                        boxShadow: record.leaveTime ? "none" : "0 0 8px rgba(34,197,94,0.4)",
                        flexShrink: 0,
                      }} />
                      <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)" }}>
                        {room?.roomName || record.roomId}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {t("attend.joined")}: {formatDate(record.joinTime)}
                      </span>
                      {record.leaveTime ? (
                        <>
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            {t("attend.left")}: {formatDate(record.leaveTime)}
                          </span>
                          <span style={{
                            fontSize: 11, fontWeight: 600, color: "var(--green)",
                            background: "var(--green-light)", padding: "2px 8px",
                            borderRadius: "var(--radius-full)",
                          }}>
                            {record.duration != null ? formatDuration(record.duration) : "—"}
                          </span>
                        </>
                      ) : (
                        <span style={{
                          fontSize: 11, fontWeight: 600, color: "var(--green)",
                          background: "var(--green-light)", padding: "2px 8px",
                          borderRadius: "var(--radius-full)",
                        }}>
                          ● {t("attend.in_class")}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Close button */}
            <div style={{ marginTop: 20, textAlign: "right" }}>
              <button className="btn-secondary" onClick={() => setSelectedStudent(null)}>
                {t("attend.close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
