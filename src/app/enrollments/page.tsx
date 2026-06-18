"use client";

import { useEffect, useState, useCallback } from "react";
import { collection, getDocs, doc, updateDoc, query, where, arrayUnion, getDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import { useAuth } from "@/context/AuthContext";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import { formatDate } from "@/utils/helpers";

interface EnrollmentRequest {
  id: string;
  roomId: string;
  roomName: string;
  teacherId: string;
  teacherName: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
  rejectionReason?: string;
}

export default function EnrollmentsPage() {
  const { loading: authLoading } = useProtectedRoute({ allowedRoles: ["teacher", "admin"] });
  const { userData } = useAuth();

  const [requests, setRequests] = useState<EnrollmentRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Rejection modal state
  const [selectedRequestForRejection, setSelectedRequestForRejection] = useState<EnrollmentRequest | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState("");

  const fetchRequests = useCallback(async () => {
    if (!userData) return;
    setLoadingRequests(true);
    try {
      const q = userData.role === "admin"
        ? query(collection(db, "enrollmentRequests"))
        : query(collection(db, "enrollmentRequests"), where("teacherId", "==", userData.uid));

      const snapshot = await getDocs(q);
      const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as EnrollmentRequest[];
      
      fetched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRequests(fetched);
    } catch (err) {
      console.error("Failed to fetch access requests:", err);
    } finally {
      setLoadingRequests(false);
    }
  }, [userData]);

  useEffect(() => {
    if (userData) {
      fetchRequests();
    }
  }, [userData, fetchRequests]);

  const handleApprove = async (req: EnrollmentRequest) => {
    if (!userData) return;
    setActionInProgress(req.id);
    try {
      // 1. Fetch room details to check if it's a paid batch
      const roomDoc = await getDoc(doc(db, "rooms", req.roomId));
      
      if (!roomDoc.exists()) {
        window.alert("Room/Batch not found. It might have been deleted.");
        setActionInProgress(null);
        return;
      }

      const roomData = roomDoc.data();
      const isPaid = roomData.isPaid === true;

      // 2. Update the enrollment request status
      await updateDoc(doc(db, "enrollmentRequests", req.id), {
        status: "approved",
        updatedAt: new Date().toISOString(),
        approvedBy: userData.uid,
      });

      // 3. For free batches, directly enroll the student in participants array
      if (!isPaid) {
        await updateDoc(doc(db, "rooms", req.roomId), {
          participants: arrayUnion(req.studentId)
        });
      }

      await fetchRequests();
    } catch (err) {
      console.error("Failed to approve access request:", err);
      window.alert("Failed to approve enrollment access. Please try again.");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData || !selectedRequestForRejection) return;

    const req = selectedRequestForRejection;
    setActionInProgress(req.id);
    try {
      await updateDoc(doc(db, "enrollmentRequests", req.id), {
        status: "rejected",
        rejectionReason: rejectionReasonText.trim() || "Enrollment request declined by faculty.",
        updatedAt: new Date().toISOString(),
        rejectedBy: userData.uid,
      });

      setSelectedRequestForRejection(null);
      setRejectionReasonText("");
      await fetchRequests();
    } catch (err) {
      console.error("Failed to reject access request:", err);
      window.alert("Failed to reject enrollment access request.");
    } finally {
      setActionInProgress(null);
    }
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-base)" }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!userData) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-base)" }}>
        <p style={{ color: "var(--text-secondary)" }}>Unable to load profile.</p>
      </div>
    );
  }

  // Filter requests based on tabs and search query
  const pendingRequests = requests.filter(r => r.status === "pending");
  const approvedRequests = requests.filter(r => r.status === "approved");
  const rejectedRequests = requests.filter(r => r.status === "rejected");

  const getFilteredRequests = () => {
    let filtered = requests;
    switch (activeTab) {
      case "pending": filtered = pendingRequests; break;
      case "approved": filtered = approvedRequests; break;
      case "rejected": filtered = rejectedRequests; break;
      default: filtered = requests;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.studentName.toLowerCase().includes(q) ||
        r.studentEmail.toLowerCase().includes(q) ||
        r.roomName.toLowerCase().includes(q)
      );
    }
    return filtered;
  };

  const filteredRequests = getFilteredRequests();

  const getStatusBadge = (status: EnrollmentRequest["status"]) => {
    const styles: Record<EnrollmentRequest["status"], { bg: string; color: string; label: string }> = {
      pending: { bg: "var(--yellow-light)", color: "var(--yellow)", label: "Pending Access" },
      approved: { bg: "var(--green-light)", color: "var(--green)", label: "Access Approved" },
      rejected: { bg: "var(--red-light)", color: "var(--red)", label: "Access Rejected" },
    };
    const st = styles[status];
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "3px 10px", fontSize: 11, fontWeight: 600, textTransform: "uppercase",
        letterSpacing: "0.5px", borderRadius: "var(--radius-full)",
        background: st.bg, color: st.color,
        border: `1px solid ${st.color}22`,
      }}>
        {st.label}
      </span>
    );
  };

  const tabs = [
    { key: "pending" as const, label: "Pending", count: pendingRequests.length },
    { key: "approved" as const, label: "Approved", count: approvedRequests.length },
    { key: "rejected" as const, label: "Rejected", count: rejectedRequests.length },
    { key: "all" as const, label: "All requests", count: requests.length },
  ];

  return (
    <DashboardLayout title="Enrollment Requests">
      <div className="page-enter">
        {/* Page Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
              Enrollment Access Requests 🎓
            </h1>
            <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
              Review and approve access for students seeking to enroll in your classroom batches.
            </p>
          </div>
          <button className="btn-secondary" onClick={fetchRequests} disabled={loadingRequests}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23,4 23,10 17,10" /><polyline points="1,20 1,14 7,14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Informative Help Box */}
        <div style={{ padding: "12px 16px", background: "var(--blue-light)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: "var(--radius-lg)", marginBottom: 24 }}>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            💡 <strong>How it works:</strong> Approve a student&apos;s request to grant access. For <strong>Free batches</strong>, they are immediately enrolled. For <strong>Paid batches</strong>, they will be allowed to view payment checkout and pay UPI.
          </p>
        </div>

        {/* Filters/Tabs */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 16, flexWrap: "wrap" }}>
          <div className="batch-tabs" style={{ display: "flex", alignItems: "center", gap: 2, borderBottom: "1px solid var(--border)" }}>
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: "10px 18px", fontSize: 13, fontWeight: 500, cursor: "pointer", border: "none", background: "transparent",
                  color: activeTab === tab.key ? "var(--blue)" : "var(--text-muted)",
                  borderBottom: activeTab === tab.key ? "2px solid var(--blue)" : "2px solid transparent",
                  transition: "all var(--transition-fast)",
                }}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 14px", borderRadius: "var(--radius-md)", background: "var(--bg-elevated)", border: "1px solid var(--border)", minWidth: 240 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input
              type="text"
              placeholder="Search student or batch..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ border: "none", background: "none", outline: "none", color: "var(--text-primary)", fontSize: 13, width: "100%" }}
            />
          </div>
        </div>

        {/* Requests List */}
        {loadingRequests ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 100 }} />)}
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="card empty-state" style={{ marginTop: 8 }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
            </svg>
            <h3>No requests found</h3>
            <p>No enrollment access requests match the selected filters.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filteredRequests.map(req => (
              <div key={req.id} className="card" style={{ padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
                    {req.studentName}
                  </h3>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>
                    {req.studentEmail}
                  </p>
                  <p style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
                    Wants to enroll in: <strong style={{ color: "var(--text-primary)" }}>{req.roomName}</strong>
                  </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  {getStatusBadge(req.status)}

                  {req.status === "pending" && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        className="btn-success"
                        disabled={actionInProgress === req.id}
                        onClick={() => handleApprove(req)}
                        style={{ padding: "6px 14px", fontSize: 12 }}
                      >
                        {actionInProgress === req.id ? "Approving..." : "Approve Access"}
                      </button>
                      <button
                        className="btn-danger"
                        disabled={actionInProgress === req.id}
                        onClick={() => setSelectedRequestForRejection(req)}
                        style={{ padding: "6px 14px", fontSize: 12 }}
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  {req.status === "rejected" && req.rejectionReason && (
                    <div style={{ fontSize: 12, color: "var(--red)", maxWidth: 200, wordBreak: "break-word" }}>
                      Reason: {req.rejectionReason}
                    </div>
                  )}

                  <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 6 }}>
                    Requested {formatDate(req.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Rejection Modal */}
        {selectedRequestForRejection && (
          <div className="modal-overlay" onClick={() => setSelectedRequestForRejection(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: "var(--radius-md)", background: "var(--red-light)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                </div>
                <div>
                  <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--text-primary)" }}>Reject Access Request</h2>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Explain why the student is not permitted to enroll</p>
                </div>
              </div>

              <form onSubmit={handleRejectSubmit}>
                <div style={{ marginBottom: 20 }}>
                  <label className="field-label">Rejection Reason</label>
                  <textarea
                    rows={3}
                    required
                    value={rejectionReasonText}
                    onChange={e => setRejectionReasonText(e.target.value)}
                    placeholder="e.g. You are not registered in our database. / Please check with admin."
                    className="input-field"
                    style={{ resize: "vertical", width: "100%", padding: 10, fontSize: 13 }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => { setSelectedRequestForRejection(null); setRejectionReasonText(""); }}
                    style={{ fontSize: 13 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-danger"
                    disabled={actionInProgress === selectedRequestForRejection.id}
                    style={{ fontSize: 13 }}
                  >
                    {actionInProgress === selectedRequestForRejection.id ? "Rejecting..." : "Confirm Reject"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
