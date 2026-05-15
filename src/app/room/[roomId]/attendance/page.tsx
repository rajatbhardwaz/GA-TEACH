"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/firebase/config";
import { useAuth } from "@/context/AuthContext";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import Navbar from "@/components/Navbar";
import { formatDate, formatDuration } from "@/utils/helpers";
import Link from "next/link";

interface Room {
  id: string;
  roomName: string;
  subject: string;
  teacherName: string;
  teacherId: string;
  roomCode: string;
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

export default function AttendancePage() {
  const { loading: authLoading } = useProtectedRoute();
  const { userData } = useAuth();
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  const [room, setRoom] = useState<Room | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [filterRole, setFilterRole] = useState<"all" | "student" | "teacher">("all");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchRoom = useCallback(async () => {
    try {
      const roomDoc = await getDoc(doc(db, "rooms", roomId));
      if (roomDoc.exists()) {
        setRoom({ id: roomDoc.id, ...roomDoc.data() } as Room);
      }
    } catch (err) {
      console.error("Failed to fetch room:", err);
    }
  }, [roomId]);

  const fetchAttendance = useCallback(async () => {
    try {
      const q = query(
        collection(db, "attendance"),
        where("roomId", "==", roomId),
        orderBy("joinTime", "desc")
      );
      const snapshot = await getDocs(q);
      const fetchedRecords: AttendanceRecord[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as AttendanceRecord[];
      setRecords(fetchedRecords);
    } catch (err) {
      console.error("Failed to fetch attendance:", err);
    }
  }, [roomId]);

  useEffect(() => {
    const load = async () => {
      setLoadingData(true);
      await Promise.all([fetchRoom(), fetchAttendance()]);
      setLoadingData(false);
    };
    load();
  }, [fetchRoom, fetchAttendance]);

  const isTeacher = userData?.role === "teacher" && userData?.uid === room?.teacherId;

  // Group attendance by user — show latest record per user
  const getUniqueAttendees = () => {
    const userMap = new Map<string, AttendanceRecord>();
    // Process records (already sorted desc by joinTime)
    for (const record of records) {
      if (!userMap.has(record.userId)) {
        userMap.set(record.userId, record);
      }
    }
    return Array.from(userMap.values());
  };

  // Get total duration per user from completed records
  const getTotalDuration = (userId: string): number => {
    return records
      .filter((r) => r.userId === userId && r.duration !== null)
      .reduce((sum, r) => sum + (r.duration || 0), 0);
  };

  // Get total sessions per user
  const getSessionCount = (userId: string): number => {
    return records.filter((r) => r.userId === userId && r.leaveTime !== null).length;
  };

  const uniqueAttendees = getUniqueAttendees();

  const filteredAttendees = uniqueAttendees.filter((record) => {
    const matchesRole = filterRole === "all" || record.userRole === filterRole;
    const matchesSearch =
      searchTerm === "" ||
      record.userName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRole && matchesSearch;
  });

  // Stats
  const totalStudents = uniqueAttendees.filter((r) => r.userRole === "student").length;
  const totalTeachers = uniqueAttendees.filter((r) => r.userRole === "teacher").length;
  const totalSessions = records.filter((r) => r.leaveTime !== null).length;
  const avgDuration =
    totalSessions > 0
      ? Math.round(
          records
            .filter((r) => r.duration !== null)
            .reduce((sum, r) => sum + (r.duration || 0), 0) / totalSessions
        )
      : 0;

  if (authLoading || loadingData) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--color-surface)" }}>
        <Navbar />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "60vh",
          }}
        >
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--color-surface)" }}>
        <Navbar />
        <div className="empty-state" style={{ marginTop: 80 }}>
          <h3>Room not found</h3>
          <p>This room may have been deleted.</p>
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

  if (!isTeacher) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--color-surface)" }}>
        <Navbar />
        <div className="empty-state" style={{ marginTop: 80 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          <h3>Access Restricted</h3>
          <p>Only the teacher of this room can view attendance records.</p>
          <button
            className="btn-primary"
            style={{ marginTop: 16 }}
            onClick={() => router.push(`/room/${roomId}`)}
          >
            Back to Room
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-surface)" }}>
      <Navbar />
      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px" }}>
        {/* Breadcrumb */}
        <Link
          href={`/room/${roomId}`}
          className="flex items-center gap-2 no-underline"
          style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 24 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12,19 5,12 12,5" />
          </svg>
          Back to {room.roomName}
        </Link>

        {/* Page header */}
        <div className="page-enter" style={{ marginBottom: 28 }}>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 600,
              color: "var(--color-text-primary)",
              marginBottom: 4,
            }}
          >
            Attendance Records
          </h1>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
            Track who attended meetings in {room.roomName}
          </p>
        </div>

        {/* Stats cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 16,
            marginBottom: 28,
          }}
        >
          {[
            {
              label: "Students",
              value: totalStudents,
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
              ),
              color: "rgba(26, 115, 232, 0.1)",
              borderColor: "rgba(26, 115, 232, 0.2)",
            },
            {
              label: "Teachers",
              value: totalTeachers,
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                  <line x1="9" y1="9" x2="9.01" y2="9" />
                  <line x1="15" y1="9" x2="15.01" y2="9" />
                </svg>
              ),
              color: "rgba(251, 188, 4, 0.1)",
              borderColor: "rgba(251, 188, 4, 0.2)",
            },
            {
              label: "Total Sessions",
              value: totalSessions,
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12,6 12,12 16,14" />
                </svg>
              ),
              color: "rgba(52, 168, 83, 0.1)",
              borderColor: "rgba(52, 168, 83, 0.2)",
            },
            {
              label: "Avg Duration",
              value: formatDuration(avgDuration),
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-info)" strokeWidth="2">
                  <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
                </svg>
              ),
              color: "rgba(66, 133, 244, 0.1)",
              borderColor: "rgba(66, 133, 244, 0.2)",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="glass-card"
              style={{
                padding: "20px 16px",
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "var(--radius-md)",
                  background: stat.color,
                  border: `1px solid ${stat.borderColor}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {stat.icon}
              </div>
              <div>
                <p style={{ fontSize: 22, fontWeight: 600, color: "var(--color-text-primary)", lineHeight: 1.1 }}>
                  {stat.value}
                </p>
                <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>
                  {stat.label}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 20,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {/* Search */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ position: "relative" }}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-text-muted)"
                strokeWidth="2"
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field"
                style={{ paddingLeft: 36 }}
              />
            </div>
          </div>

          {/* Role filter buttons */}
          <div className="flex gap-2">
            {(["all", "student", "teacher"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilterRole(f)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "var(--radius-full)",
                  border: `1px solid ${filterRole === f ? "var(--color-primary)" : "var(--color-border)"}`,
                  background: filterRole === f ? "rgba(26, 115, 232, 0.12)" : "transparent",
                  color: filterRole === f ? "var(--color-primary)" : "var(--color-text-secondary)",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all var(--transition-fast)",
                  textTransform: "capitalize",
                }}
              >
                {f === "all" ? "All" : `${f}s`}
              </button>
            ))}
          </div>
        </div>

        {/* Attendance table */}
        {filteredAttendees.length === 0 ? (
          <div className="glass-card empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
            <h3>No attendance records</h3>
            <p>
              {searchTerm
                ? "No matching records found. Try a different search."
                : "Attendance will be automatically recorded when participants join meetings."}
            </p>
          </div>
        ) : (
          <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
            {/* Table header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
                padding: "14px 20px",
                background: "rgba(0, 0, 0, 0.15)",
                borderBottom: "1px solid var(--color-border)",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--color-text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                gap: 12,
              }}
            >
              <span>Participant</span>
              <span>Role</span>
              <span>Last Join</span>
              <span>Sessions</span>
              <span>Total Time</span>
            </div>

            {/* Table rows */}
            {filteredAttendees.map((record, index) => (
              <div
                key={record.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
                  padding: "16px 20px",
                  borderBottom:
                    index < filteredAttendees.length - 1
                      ? "1px solid var(--color-border)"
                      : "none",
                  alignItems: "center",
                  gap: 12,
                  transition: "background var(--transition-fast)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                {/* Name */}
                <div className="flex items-center gap-3">
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "var(--radius-full)",
                      background:
                        record.userRole === "teacher"
                          ? "linear-gradient(135deg, #fbbc04, #f9ab00)"
                          : "linear-gradient(135deg, #8ab4f8, #1a73e8)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                      fontWeight: 600,
                      color: record.userRole === "teacher" ? "#202124" : "#fff",
                      flexShrink: 0,
                    }}
                  >
                    {record.userName.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>
                    {record.userName}
                  </span>
                </div>

                {/* Role */}
                <span
                  className={`badge ${record.userRole === "teacher" ? "badge-teacher" : "badge-student"}`}
                >
                  {record.userRole}
                </span>

                {/* Last join */}
                <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                  {formatDate(record.joinTime)}
                </span>

                {/* Sessions */}
                <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>
                  {getSessionCount(record.userId)}
                </span>

                {/* Total time */}
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: getTotalDuration(record.userId) > 0
                      ? "var(--color-success)"
                      : "var(--color-text-muted)",
                  }}
                >
                  {getTotalDuration(record.userId) > 0
                    ? formatDuration(getTotalDuration(record.userId))
                    : "In progress"}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Detailed log section */}
        {records.length > 0 && (
          <div style={{ marginTop: 36 }}>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 500,
                color: "var(--color-text-primary)",
                marginBottom: 16,
              }}
            >
              Detailed Session Log ({records.length})
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {records.map((record) => (
                <div
                  key={record.id}
                  className="glass-card"
                  style={{
                    padding: "14px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: record.leaveTime
                          ? "var(--color-text-muted)"
                          : "var(--color-success)",
                        boxShadow: record.leaveTime
                          ? "none"
                          : "0 0 8px var(--color-success-glow)",
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>
                      {record.userName}
                    </span>
                    <span
                      className={`badge ${record.userRole === "teacher" ? "badge-teacher" : "badge-student"}`}
                      style={{ fontSize: 10, padding: "2px 8px" }}
                    >
                      {record.userRole}
                    </span>
                  </div>
                  <div className="flex items-center gap-4" style={{ flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                      Joined: {formatDate(record.joinTime)}
                    </span>
                    {record.leaveTime ? (
                      <>
                        <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                          Left: {formatDate(record.leaveTime)}
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "var(--color-success)",
                            background: "var(--color-success-glow)",
                            padding: "3px 10px",
                            borderRadius: "var(--radius-full)",
                          }}
                        >
                          {record.duration != null ? formatDuration(record.duration) : "—"}
                        </span>
                      </>
                    ) : (
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--color-success)",
                          background: "var(--color-success-glow)",
                          padding: "3px 10px",
                          borderRadius: "var(--radius-full)",
                        }}
                      >
                        ● Active
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
