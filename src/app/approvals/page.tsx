"use client";

import { useEffect, useState, useCallback } from "react";
import { collection, getDocs, doc, updateDoc, query, where, arrayUnion } from "firebase/firestore";
import { db } from "@/firebase/config";
import { useAuth } from "@/context/AuthContext";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import { formatDate } from "@/utils/helpers";

interface PaymentRequest {
  id: string;
  roomId: string;
  roomName: string;
  teacherId: string;
  teacherName: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  price: number;
  upiId: string;
  transactionId: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
  rejectionReason?: string;
}

export default function ApprovalsPage() {
  // Allow teachers and admins
  const { loading: authLoading } = useProtectedRoute({ allowedRoles: ["teacher", "admin"] });
  const { userData } = useAuth();
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  
  // Rejection modal state
  const [selectedRequestForRejection, setSelectedRequestForRejection] = useState<PaymentRequest | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState("");

  const fetchRequests = useCallback(async () => {
    if (!userData) return;
    setLoadingRequests(true);
    try {
      // Teachers only see requests for their own batches
      // Admins see all requests on the platform
      const q = userData.role === "admin"
        ? query(collection(db, "paymentRequests"))
        : query(collection(db, "paymentRequests"), where("teacherId", "==", userData.uid));

      const snapshot = await getDocs(q);
      const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as PaymentRequest[];
      
      // Sort by newest first
      fetched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRequests(fetched);
    } catch (err) {
      console.error("Failed to fetch payment requests:", err);
    } finally {
      setLoadingRequests(false);
    }
  }, [userData]);

  useEffect(() => {
    if (userData) {
      fetchRequests();
    }
  }, [userData, fetchRequests]);

  const handleApprove = async (req: PaymentRequest) => {
    if (!userData) return;
    setActionInProgress(req.id);
    try {
      // 1. Update the status of the request
      await updateDoc(doc(db, "paymentRequests", req.id), {
        status: "approved",
        updatedAt: new Date().toISOString(),
        approvedBy: userData.uid,
      });

      // 2. Add student to the room participants array
      await updateDoc(doc(db, "rooms", req.roomId), {
        participants: arrayUnion(req.studentId)
      });

      await fetchRequests();
    } catch (err) {
      console.error("Failed to approve payment request:", err);
      window.alert("Failed to approve enrollment. Please try again.");
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
      await updateDoc(doc(db, "paymentRequests", req.id), {
        status: "rejected",
        rejectionReason: rejectionReasonText.trim() || "Transaction ID could not be verified.",
        updatedAt: new Date().toISOString(),
        rejectedBy: userData.uid,
      });

      setSelectedRequestForRejection(null);
      setRejectionReasonText("");
      await fetchRequests();
    } catch (err) {
      console.error("Failed to reject request:", err);
      window.alert("Failed to reject payment request.");
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
        r.roomName.toLowerCase().includes(q) ||
        r.transactionId.toLowerCase().includes(q)
      );
    }
    return filtered;
  };

  const filteredRequests = getFilteredRequests();

  const getStatusBadge = (status: PaymentRequest["status"]) => {
    const styles: Record<PaymentRequest["status"], { bg: string; color: string; label: string }> = {
      pending: { bg: "var(--yellow-light)", color: "var(--yellow)", label: "Pending" },
      approved: { bg: "var(--green-light)", color: "var(--green)", label: "Approved" },
      rejected: { bg: "var(--red-light)", color: "var(--red)", label: "Rejected" },
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
    <DashboardLayout title="Payment Approvals">
      <div className="page-enter">
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 36, gap: 16, flexWrap: "wrap", position: "relative", zIndex: 10 }}>
          <div>
            <h1 style={{ fontSize: "clamp(24px, 4vw, 32px)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 6 }}>
              <span className="text-gradient">Payment Approvals 💳</span>
            </h1>
            <p style={{ fontSize: 15, color: "var(--text-secondary)", fontWeight: 500 }}>
              Check student Transaction Ref Numbers (UTR) against your bank receipts to approve enrollments.
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
        <div className="glass-card" style={{ padding: "16px 24px", background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: "var(--radius-lg)", marginBottom: 32 }}>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            💡 <strong style={{ color: "var(--blue)" }}>How it works:</strong> Students pay to your UPI ID directly and paste their 12-digit transaction ID (UTR). Match the transaction ID shown below with the credit receipt in your bank/UPI app statement to confirm the credit, then click <strong style={{ color: "var(--text-primary)" }}>Approve</strong>.
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
          <div className="glass-card empty-state" style={{ marginTop: 8, padding: 60, textAlign: "center", border: "1px dashed var(--border)" }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1" style={{ marginBottom: 16 }}>
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            <h3 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>No requests found</h3>
            <p style={{ fontSize: 15, color: "var(--text-secondary)" }}>No enrollment requests match the selected filters or search terms.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {filteredRequests.map(req => (
              <div key={req.id} className="glass-card" style={{ padding: "24px 32px", display: "flex", flexDirection: "column", gap: 20, border: "1px solid var(--border-glow)", boxShadow: "var(--shadow-md)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6, letterSpacing: "-0.01em" }}>
                      {req.studentName}
                    </h3>
                    <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 12 }}>
                      {req.studentEmail}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", fontSize: 12, color: "var(--text-muted)" }}>
                      <span>Batch: <strong style={{ color: "var(--text-secondary)" }}>{req.roomName}</strong></span>
                      <span>•</span>
                      <span>Price: <strong style={{ color: "var(--text-secondary)" }}>₹{req.price} INR</strong></span>
                      <span>•</span>
                      <span>UPI Paid to: <strong style={{ color: "var(--text-secondary)" }}>{req.upiId}</strong></span>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                    {getStatusBadge(req.status)}
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      Submitted {formatDate(req.createdAt)}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "10px 14px", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", marginRight: 8, textTransform: "uppercase" }}>Transaction Reference No:</span>
                    <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "monospace", color: "var(--blue)", letterSpacing: "0.05em" }}>
                      {req.transactionId}
                    </span>
                  </div>

                  {req.status === "pending" && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        className="btn-success"
                        disabled={actionInProgress === req.id}
                        onClick={() => handleApprove(req)}
                        style={{ padding: "6px 14px", fontSize: 12 }}
                      >
                        {actionInProgress === req.id ? "Approving..." : "Approve enrollment"}
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
                    <div style={{ fontSize: 12.5, color: "var(--red)" }}>
                      ❌ <strong>Rejection Reason:</strong> {req.rejectionReason}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Rejection Modal */}
        {selectedRequestForRejection && (
          <div className="modal-overlay" onClick={() => setSelectedRequestForRejection(null)}>
            <div className="glass-card modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 440, padding: 32, border: "1px solid var(--border-glow)", boxShadow: "0 24px 48px rgba(0,0,0,0.4)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>Reject Request</h2>
                  <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>Explain why the verification failed</p>
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
                    placeholder="e.g. Transaction ID was not found in our statements. / Incorrect amount paid."
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
