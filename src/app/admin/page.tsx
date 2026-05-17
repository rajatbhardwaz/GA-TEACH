"use client";

import { useEffect, useState, useCallback } from "react";
import { collection, getDocs, doc, updateDoc, query, where, orderBy } from "firebase/firestore";
import { db } from "@/firebase/config";
import { useAuth, type UserData, type ApprovalStatus } from "@/context/AuthContext";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import { formatDate } from "@/utils/helpers";

export default function AdminPage() {
  const { loading: authLoading } = useProtectedRoute({ allowedRoles: ["admin"] });
  const { userData } = useAuth();
  const [teachers, setTeachers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<UserData | null>(null);

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "users"), where("role", "==", "teacher"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const fetched = snapshot.docs.map(d => d.data() as UserData);
      setTeachers(fetched);
    } catch (err) {
      console.error("Failed to fetch teachers:", err);
      // Fallback: fetch without orderBy (index may not exist)
      try {
        const q2 = query(collection(db, "users"), where("role", "==", "teacher"));
        const snapshot = await getDocs(q2);
        const fetched = snapshot.docs.map(d => d.data() as UserData);
        fetched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setTeachers(fetched);
      } catch (err2) {
        console.error("Fallback fetch also failed:", err2);
      }
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (userData?.role === "admin") fetchTeachers(); }, [userData, fetchTeachers]);

  const updateTeacherStatus = async (teacherUid: string, status: ApprovalStatus) => {
    if (!userData) return;
    setActionLoading(teacherUid);
    try {
      const updateData: Record<string, unknown> = {
        approvalStatus: status,
      };
      if (status === "approved") {
        updateData.approvedBy = userData.uid;
        updateData.approvedAt = new Date().toISOString();
      } else if (status === "rejected") {
        updateData.rejectedAt = new Date().toISOString();
      }
      await updateDoc(doc(db, "users", teacherUid), updateData);
      // Refresh the list
      await fetchTeachers();
      // Update selected teacher if viewing
      if (selectedTeacher?.uid === teacherUid) {
        setSelectedTeacher(prev => prev ? { ...prev, approvalStatus: status } : null);
      }
    } catch (err) {
      console.error("Failed to update teacher status:", err);
    }
    setActionLoading(null);
  };

  const filteredTeachers = activeFilter === "all"
    ? teachers
    : teachers.filter(t => (t.approvalStatus || "pending") === activeFilter);

  const pendingCount = teachers.filter(t => (t.approvalStatus || "pending") === "pending").length;
  const approvedCount = teachers.filter(t => t.approvalStatus === "approved").length;
  const rejectedCount = teachers.filter(t => t.approvalStatus === "rejected").length;

  if (authLoading) {
    return (<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-base)" }}><div className="spinner" /></div>);
  }

  if (!userData || userData.role !== "admin") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, padding: 24, background: "var(--bg-base)" }}>
        <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>Access denied. Admin privileges required.</p>
        <a href="/dashboard"><button className="btn-primary">Go to Dashboard</button></a>
      </div>
    );
  }

  const getStatusBadge = (status: ApprovalStatus | undefined) => {
    const s = status || "pending";
    const styles: Record<string, { bg: string; color: string; label: string }> = {
      pending: { bg: "var(--yellow-light)", color: "var(--yellow)", label: "Pending" },
      approved: { bg: "var(--green-light)", color: "var(--green)", label: "Approved" },
      rejected: { bg: "var(--red-light)", color: "var(--red)", label: "Rejected" },
    };
    const st = styles[s];
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "3px 10px", fontSize: 11, fontWeight: 600, textTransform: "uppercase",
        letterSpacing: "0.5px", borderRadius: "var(--radius-full)",
        background: st.bg, color: st.color,
        border: `1px solid ${st.color}22`,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: st.color }} />
        {st.label}
      </span>
    );
  };

  return (
    <DashboardLayout title="Admin Panel">
      <div className="page-enter">
        {/* Header */}
        <div className="dash-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
              Teacher Management 🛡️
            </h1>
            <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
              Review, approve, or revoke teacher access to the platform.
            </p>
          </div>
          <button className="btn-secondary" onClick={fetchTeachers} disabled={loading}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23,4 23,10 17,10"/><polyline points="1,20 1,14 7,14"/>
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
          <div className="stat-card" onClick={() => setActiveFilter("all")} style={{ cursor: "pointer", borderColor: activeFilter === "all" ? "var(--blue)" : undefined }}>
            <div className="stat-icon" style={{ background: "var(--blue-light)", color: "var(--blue)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            </div>
            <div><p className="stat-value">{teachers.length}</p><p className="stat-label">Total Teachers</p></div>
          </div>
          <div className="stat-card" onClick={() => setActiveFilter("pending")} style={{ cursor: "pointer", borderColor: activeFilter === "pending" ? "var(--yellow)" : undefined }}>
            <div className="stat-icon" style={{ background: "var(--yellow-light)", color: "var(--yellow)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
            </div>
            <div><p className="stat-value">{pendingCount}</p><p className="stat-label">Pending Review</p></div>
          </div>
          <div className="stat-card" onClick={() => setActiveFilter("approved")} style={{ cursor: "pointer", borderColor: activeFilter === "approved" ? "var(--green)" : undefined }}>
            <div className="stat-icon" style={{ background: "var(--green-light)", color: "var(--green)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>
            </div>
            <div><p className="stat-value">{approvedCount}</p><p className="stat-label">Approved</p></div>
          </div>
          <div className="stat-card" onClick={() => setActiveFilter("rejected")} style={{ cursor: "pointer", borderColor: activeFilter === "rejected" ? "var(--red)" : undefined }}>
            <div className="stat-icon" style={{ background: "var(--red-light)", color: "var(--red)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            </div>
            <div><p className="stat-value">{rejectedCount}</p><p className="stat-label">Rejected</p></div>
          </div>
        </div>

        {/* Pending alert */}
        {pendingCount > 0 && activeFilter !== "pending" && (
          <div className="card" style={{ padding: "14px 20px", marginBottom: 20, borderLeft: "3px solid var(--yellow)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{pendingCount} teacher{pendingCount > 1 ? "s" : ""} waiting for approval</span>
            </div>
            <button className="btn-primary" style={{ padding: "6px 16px", fontSize: 12 }} onClick={() => setActiveFilter("pending")}>Review Now</button>
          </div>
        )}

        {/* Two-column: Teacher list + Detail panel */}
        <div className="dash-two-col" style={{ display: "grid", gridTemplateColumns: selectedTeacher ? "1fr 380px" : "1fr", gap: 24, alignItems: "start" }}>
          {/* Teacher list */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
                {activeFilter === "all" ? "All Teachers" : activeFilter === "pending" ? "Pending Approval" : activeFilter === "approved" ? "Approved Teachers" : "Rejected Applications"}
                <span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-muted)", marginLeft: 8 }}>({filteredTeachers.length})</span>
              </h2>
            </div>

            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80 }}/>)}</div>
            ) : filteredTeachers.length === 0 ? (
              <div className="card empty-state" style={{ marginTop: 8 }}>
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                <h3>No {activeFilter !== "all" ? activeFilter : ""} teachers</h3>
                <p>{activeFilter === "pending" ? "All teacher applications have been reviewed" : "No teachers match this filter"}</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {filteredTeachers.map(teacher => (
                  <div
                    key={teacher.uid}
                    className="card card-interactive"
                    onClick={() => setSelectedTeacher(selectedTeacher?.uid === teacher.uid ? null : teacher)}
                    style={{
                      padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, cursor: "pointer",
                      borderColor: selectedTeacher?.uid === teacher.uid ? "var(--blue)" : undefined,
                      background: selectedTeacher?.uid === teacher.uid ? "var(--blue-light)" : undefined,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: "var(--radius-full)",
                        background: "linear-gradient(135deg, var(--blue), #7c3aed)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 16, fontWeight: 700, color: "#fff", flexShrink: 0,
                      }}>
                        {teacher.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 3 }}>{teacher.name}</p>
                        <p style={{ fontSize: 12, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{teacher.email}</p>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                      {getStatusBadge(teacher.approvalStatus)}
                      {(teacher.approvalStatus || "pending") === "pending" && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            className="btn-success"
                            style={{ padding: "6px 14px", fontSize: 12 }}
                            disabled={actionLoading === teacher.uid}
                            onClick={(e) => { e.stopPropagation(); updateTeacherStatus(teacher.uid, "approved"); }}
                          >
                            {actionLoading === teacher.uid ? <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> : "Approve"}
                          </button>
                          <button
                            className="btn-danger"
                            style={{ padding: "6px 14px", fontSize: 12 }}
                            disabled={actionLoading === teacher.uid}
                            onClick={(e) => { e.stopPropagation(); updateTeacherStatus(teacher.uid, "rejected"); }}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {teacher.approvalStatus === "approved" && (
                        <button
                          className="btn-secondary"
                          style={{ padding: "6px 14px", fontSize: 12, color: "var(--red)" }}
                          disabled={actionLoading === teacher.uid}
                          onClick={(e) => { e.stopPropagation(); updateTeacherStatus(teacher.uid, "rejected"); }}
                        >
                          Revoke
                        </button>
                      )}
                      {teacher.approvalStatus === "rejected" && (
                        <button
                          className="btn-secondary"
                          style={{ padding: "6px 14px", fontSize: 12, color: "var(--green)" }}
                          disabled={actionLoading === teacher.uid}
                          onClick={(e) => { e.stopPropagation(); updateTeacherStatus(teacher.uid, "approved"); }}
                        >
                          Approve
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selectedTeacher && (
            <div className="card" style={{ padding: 0, overflow: "hidden", position: "sticky", top: 80 }}>
              {/* Header gradient */}
              <div style={{ height: 80, background: "linear-gradient(135deg, var(--blue), #7c3aed)", position: "relative" }}>
                <div style={{
                  position: "absolute", bottom: -28, left: 20,
                  width: 56, height: 56, borderRadius: "var(--radius-full)",
                  background: "linear-gradient(135deg, var(--blue), #7c3aed)",
                  border: "3px solid var(--bg-card)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22, fontWeight: 700, color: "#fff",
                }}>
                  {selectedTeacher.name.charAt(0).toUpperCase()}
                </div>
              </div>

              <div style={{ padding: "36px 20px 20px" }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>{selectedTeacher.name}</h3>
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>{selectedTeacher.email}</p>
                {getStatusBadge(selectedTeacher.approvalStatus)}

                <div className="divider" style={{ margin: "16px 0" }} />

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <DetailRow label="Role" value="Faculty / Teacher" />
                  <DetailRow label="Applied On" value={new Date(selectedTeacher.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} />
                  <DetailRow label="Status" value={(selectedTeacher.approvalStatus || "pending").charAt(0).toUpperCase() + (selectedTeacher.approvalStatus || "pending").slice(1)} />
                  {selectedTeacher.approvedAt && <DetailRow label="Approved On" value={formatDate(selectedTeacher.approvedAt)} />}
                  {selectedTeacher.rejectedAt && <DetailRow label="Rejected On" value={formatDate(selectedTeacher.rejectedAt)} />}
                </div>

                <div className="divider" style={{ margin: "16px 0" }} />

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(selectedTeacher.approvalStatus || "pending") === "pending" && (
                    <>
                      <button className="btn-success" style={{ width: "100%", justifyContent: "center" }}
                        disabled={actionLoading === selectedTeacher.uid}
                        onClick={() => updateTeacherStatus(selectedTeacher.uid, "approved")}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20,6 9,17 4,12"/></svg>
                        Approve Teacher
                      </button>
                      <button className="btn-danger" style={{ width: "100%", justifyContent: "center" }}
                        disabled={actionLoading === selectedTeacher.uid}
                        onClick={() => updateTeacherStatus(selectedTeacher.uid, "rejected")}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        Reject Application
                      </button>
                    </>
                  )}
                  {selectedTeacher.approvalStatus === "approved" && (
                    <button className="btn-danger" style={{ width: "100%", justifyContent: "center" }}
                      disabled={actionLoading === selectedTeacher.uid}
                      onClick={() => updateTeacherStatus(selectedTeacher.uid, "rejected")}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                      Revoke Access
                    </button>
                  )}
                  {selectedTeacher.approvalStatus === "rejected" && (
                    <button className="btn-success" style={{ width: "100%", justifyContent: "center" }}
                      disabled={actionLoading === selectedTeacher.uid}
                      onClick={() => updateTeacherStatus(selectedTeacher.uid, "approved")}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20,6 9,17 4,12"/></svg>
                      Re-approve Teacher
                    </button>
                  )}
                  <button className="btn-secondary" style={{ width: "100%", justifyContent: "center" }}
                    onClick={() => setSelectedTeacher(null)}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: 13, color: "var(--text-muted)", flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", textAlign: "right" }}>{value}</span>
    </div>
  );
}
