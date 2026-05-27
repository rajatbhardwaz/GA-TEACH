"use client";

import { useEffect, useState, useCallback } from "react";
import { collection, getDocs, doc, updateDoc, query, where, orderBy } from "firebase/firestore";
import { db } from "@/firebase/config";
import { useAuth, type UserData, type ApprovalStatus } from "@/context/AuthContext";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import { formatDate } from "@/utils/helpers";

type ManageTab = "teachers" | "students";

export default function AdminPage() {
  const { loading: authLoading } = useProtectedRoute({ allowedRoles: ["admin"] });
  const { userData } = useAuth();
  const [teachers, setTeachers] = useState<UserData[]>([]);
  const [students, setStudents] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ManageTab>("teachers");
  const [activeFilter, setActiveFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  const fetchUsers = useCallback(async (role: "teacher" | "student") => {
    try {
      const q = query(collection(db, "users"), where("role", "==", role), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => d.data() as UserData);
    } catch {
      // Fallback without orderBy
      try {
        const q2 = query(collection(db, "users"), where("role", "==", role));
        const snapshot = await getDocs(q2);
        const fetched = snapshot.docs.map(d => d.data() as UserData);
        fetched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return fetched;
      } catch (err2) {
        console.error(`Failed to fetch ${role}s:`, err2);
        return [];
      }
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [t, s] = await Promise.all([fetchUsers("teacher"), fetchUsers("student")]);
    setTeachers(t);
    setStudents(s);
    setLoading(false);
  }, [fetchUsers]);

  useEffect(() => { if (userData?.role === "admin") fetchAll(); }, [userData, fetchAll]);

  const updateUserStatus = async (uid: string, status: ApprovalStatus) => {
    if (!userData) return;
    setActionLoading(uid);
    try {
      const updateData: Record<string, unknown> = { approvalStatus: status };
      if (status === "approved") {
        updateData.approvedBy = userData.uid;
        updateData.approvedAt = new Date().toISOString();
      } else if (status === "rejected") {
        updateData.rejectedAt = new Date().toISOString();
      }
      await updateDoc(doc(db, "users", uid), updateData);
      await fetchAll();
      if (selectedUser?.uid === uid) {
        setSelectedUser(prev => prev ? { ...prev, approvalStatus: status } : null);
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
    setActionLoading(null);
  };

  // Current list based on active tab
  const currentList = activeTab === "teachers" ? teachers : students;
  const filteredList = activeFilter === "all"
    ? currentList
    : currentList.filter(u => (u.approvalStatus || "pending") === activeFilter);

  const pendingTeachers = teachers.filter(t => (t.approvalStatus || "pending") === "pending").length;
  const pendingStudents = students.filter(s => (s.approvalStatus || "pending") === "pending").length;
  const totalPending = pendingTeachers + pendingStudents;

  const pendingCount = currentList.filter(u => (u.approvalStatus || "pending") === "pending").length;
  const approvedCount = currentList.filter(u => u.approvalStatus === "approved").length;
  const rejectedCount = currentList.filter(u => u.approvalStatus === "rejected").length;

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

  const roleLabel = activeTab === "teachers" ? "Faculty / Teacher" : "Student / Aspirant";
  const roleIcon = activeTab === "teachers" ? "🎓" : "📚";

  return (
    <DashboardLayout title="Admin Panel">
      <div className="page-enter">
        {/* Header */}
        <div className="dash-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
              User Management 🛡️
            </h1>
            <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
              Review, approve, or revoke access for teachers and students.
            </p>
          </div>
          <button className="btn-secondary" onClick={fetchAll} disabled={loading}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23,4 23,10 17,10"/><polyline points="1,20 1,14 7,14"/>
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
            Refresh
          </button>
        </div>

        {/* Role tabs: Teachers / Students */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", padding: 3, border: "1px solid var(--border)", maxWidth: 400 }}>
          {([
            { key: "teachers" as ManageTab, label: "Teachers", count: teachers.length, pending: pendingTeachers },
            { key: "students" as ManageTab, label: "Students", count: students.length, pending: pendingStudents },
          ]).map(tab => (
            <button key={tab.key} onClick={() => { setActiveTab(tab.key); setSelectedUser(null); setActiveFilter("pending"); }} style={{
              flex: 1, padding: "10px 16px", borderRadius: "var(--radius-sm)", border: "none",
              background: activeTab === tab.key ? "var(--bg-hover)" : "transparent",
              color: activeTab === tab.key ? "var(--text-primary)" : "var(--text-muted)",
              fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all var(--transition-fast)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              {tab.label}
              {tab.pending > 0 && (
                <span style={{
                  padding: "1px 7px", fontSize: 10, fontWeight: 700, borderRadius: "var(--radius-full)",
                  background: "var(--yellow)", color: "#fff", minWidth: 18, textAlign: "center",
                }}>{tab.pending}</span>
              )}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
          <div className="stat-card" onClick={() => setActiveFilter("all")} style={{ cursor: "pointer", borderColor: activeFilter === "all" ? "var(--blue)" : undefined }}>
            <div className="stat-icon" style={{ background: "var(--blue-light)", color: "var(--blue)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            </div>
            <div><p className="stat-value">{currentList.length}</p><p className="stat-label">Total {activeTab === "teachers" ? "Teachers" : "Students"}</p></div>
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
        {totalPending > 0 && activeFilter !== "pending" && (
          <div className="card" style={{ padding: "14px 20px", marginBottom: 20, borderLeft: "3px solid var(--yellow)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
                {pendingTeachers > 0 && `${pendingTeachers} teacher${pendingTeachers > 1 ? "s" : ""}`}
                {pendingTeachers > 0 && pendingStudents > 0 && " and "}
                {pendingStudents > 0 && `${pendingStudents} student${pendingStudents > 1 ? "s" : ""}`}
                {" "}waiting for approval
              </span>
            </div>
            <button className="btn-primary" style={{ padding: "6px 16px", fontSize: 12 }} onClick={() => setActiveFilter("pending")}>Review Now</button>
          </div>
        )}

        {/* Two-column: User list + Detail panel */}
        <div className="dash-two-col" style={{ display: "grid", gridTemplateColumns: selectedUser ? "1fr 380px" : "1fr", gap: 24, alignItems: "start" }}>
          {/* User list */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
                {activeFilter === "all" ? `All ${activeTab === "teachers" ? "Teachers" : "Students"}` : activeFilter === "pending" ? "Pending Approval" : activeFilter === "approved" ? `Approved ${activeTab === "teachers" ? "Teachers" : "Students"}` : "Rejected Applications"}
                <span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-muted)", marginLeft: 8 }}>({filteredList.length})</span>
              </h2>
            </div>

            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80 }}/>)}</div>
            ) : filteredList.length === 0 ? (
              <div className="card empty-state" style={{ marginTop: 8 }}>
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                <h3>No {activeFilter !== "all" ? activeFilter : ""} {activeTab === "teachers" ? "teachers" : "students"}</h3>
                <p>{activeFilter === "pending" ? "All applications have been reviewed" : "No users match this filter"}</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {filteredList.map(user => (
                    <div
                    key={user.uid}
                    className="card card-interactive admin-teacher-card"
                    onClick={() => setSelectedUser(selectedUser?.uid === user.uid ? null : user)}
                    style={{
                      padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, cursor: "pointer",
                      borderColor: selectedUser?.uid === user.uid ? "var(--blue)" : undefined,
                      background: selectedUser?.uid === user.uid ? "var(--blue-light)" : undefined,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: "var(--radius-full)",
                        background: activeTab === "teachers" ? "linear-gradient(135deg, var(--blue), #7c3aed)" : "linear-gradient(135deg, #10b981, #06b6d4)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 16, fontWeight: 700, color: "#fff", flexShrink: 0,
                      }}>
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 3 }}>{user.name}</p>
                        <p style={{ fontSize: 12, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email || user.phone || "—"}</p>
                      </div>
                    </div>
                    <div className="admin-teacher-actions" style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                      {getStatusBadge(user.approvalStatus)}
                      {(user.approvalStatus || "pending") === "pending" && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            className="btn-success"
                            style={{ padding: "6px 14px", fontSize: 12 }}
                            disabled={actionLoading === user.uid}
                            onClick={(e) => { e.stopPropagation(); updateUserStatus(user.uid, "approved"); }}
                          >
                            {actionLoading === user.uid ? <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> : "Approve"}
                          </button>
                          <button
                            className="btn-danger"
                            style={{ padding: "6px 14px", fontSize: 12 }}
                            disabled={actionLoading === user.uid}
                            onClick={(e) => { e.stopPropagation(); updateUserStatus(user.uid, "rejected"); }}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {user.approvalStatus === "approved" && (
                        <button
                          className="btn-secondary"
                          style={{ padding: "6px 14px", fontSize: 12, color: "var(--red)" }}
                          disabled={actionLoading === user.uid}
                          onClick={(e) => { e.stopPropagation(); updateUserStatus(user.uid, "rejected"); }}
                        >
                          Revoke
                        </button>
                      )}
                      {user.approvalStatus === "rejected" && (
                        <button
                          className="btn-secondary"
                          style={{ padding: "6px 14px", fontSize: 12, color: "var(--green)" }}
                          disabled={actionLoading === user.uid}
                          onClick={(e) => { e.stopPropagation(); updateUserStatus(user.uid, "approved"); }}
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
          {selectedUser && (
            <div className="card admin-detail-panel" style={{ padding: 0, overflow: "hidden", position: "sticky", top: 80 }}>
              {/* Header gradient */}
              <div style={{ height: 80, background: activeTab === "teachers" ? "linear-gradient(135deg, var(--blue), #7c3aed)" : "linear-gradient(135deg, #10b981, #06b6d4)", position: "relative" }}>
                <div style={{
                  position: "absolute", bottom: -28, left: 20,
                  width: 56, height: 56, borderRadius: "var(--radius-full)",
                  background: activeTab === "teachers" ? "linear-gradient(135deg, var(--blue), #7c3aed)" : "linear-gradient(135deg, #10b981, #06b6d4)",
                  border: "3px solid var(--bg-card)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22, fontWeight: 700, color: "#fff",
                }}>
                  {selectedUser.name.charAt(0).toUpperCase()}
                </div>
              </div>

              <div style={{ padding: "36px 20px 20px" }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>{selectedUser.name}</h3>
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>{selectedUser.email || selectedUser.phone || "—"}</p>
                {getStatusBadge(selectedUser.approvalStatus)}

                <div className="divider" style={{ margin: "16px 0" }} />

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <DetailRow label="Role" value={roleLabel} />
                  <DetailRow label="Applied On" value={new Date(selectedUser.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} />
                  <DetailRow label="Status" value={(selectedUser.approvalStatus || "pending").charAt(0).toUpperCase() + (selectedUser.approvalStatus || "pending").slice(1)} />
                  {selectedUser.approvedAt && <DetailRow label="Approved On" value={formatDate(selectedUser.approvedAt)} />}
                  {selectedUser.rejectedAt && <DetailRow label="Rejected On" value={formatDate(selectedUser.rejectedAt)} />}
                  {selectedUser.authProvider && <DetailRow label="Auth Method" value={selectedUser.authProvider.charAt(0).toUpperCase() + selectedUser.authProvider.slice(1)} />}
                </div>

                <div className="divider" style={{ margin: "16px 0" }} />

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(selectedUser.approvalStatus || "pending") === "pending" && (
                    <>
                      <button className="btn-success" style={{ width: "100%", justifyContent: "center" }}
                        disabled={actionLoading === selectedUser.uid}
                        onClick={() => updateUserStatus(selectedUser.uid, "approved")}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20,6 9,17 4,12"/></svg>
                        Approve {activeTab === "teachers" ? "Teacher" : "Student"}
                      </button>
                      <button className="btn-danger" style={{ width: "100%", justifyContent: "center" }}
                        disabled={actionLoading === selectedUser.uid}
                        onClick={() => updateUserStatus(selectedUser.uid, "rejected")}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        Reject Application
                      </button>
                    </>
                  )}
                  {selectedUser.approvalStatus === "approved" && (
                    <button className="btn-danger" style={{ width: "100%", justifyContent: "center" }}
                      disabled={actionLoading === selectedUser.uid}
                      onClick={() => updateUserStatus(selectedUser.uid, "rejected")}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                      Revoke Access
                    </button>
                  )}
                  {selectedUser.approvalStatus === "rejected" && (
                    <button className="btn-success" style={{ width: "100%", justifyContent: "center" }}
                      disabled={actionLoading === selectedUser.uid}
                      onClick={() => updateUserStatus(selectedUser.uid, "approved")}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20,6 9,17 4,12"/></svg>
                      Re-approve {activeTab === "teachers" ? "Teacher" : "Student"}
                    </button>
                  )}
                  <button className="btn-secondary" style={{ width: "100%", justifyContent: "center" }}
                    onClick={() => setSelectedUser(null)}>
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
