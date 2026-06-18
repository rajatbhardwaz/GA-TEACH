"use client";

import { useEffect, useState, useCallback } from "react";
import { collection, getDocs, doc, setDoc, query, where, arrayUnion } from "firebase/firestore";
import { db } from "@/firebase/config";
import { useAuth } from "@/context/AuthContext";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import { formatDate } from "@/utils/helpers";
import { useRouter } from "next/navigation";

interface Room {
  id: string;
  roomName: string;
  subject: string;
  teacherName: string;
  teacherId: string;
  roomCode: string;
  createdAt: string;
  participants: string[];
  isActive: boolean;
  isPaid?: boolean;
  price?: number;
  upiId?: string;
  status?: string;
}

export default function EnrollPage() {
  const { loading: authLoading } = useProtectedRoute({ allowedRoles: ["student"] });
  const { userData } = useAuth();
  const router = useRouter();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [enrollmentRequests, setEnrollmentRequests] = useState<Record<string, any>>({});
  const [paymentRequests, setPaymentRequests] = useState<Record<string, any>>({});
  const [loadingData, setLoadingData] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Payment checkout modal state
  const [selectedRoomForPayment, setSelectedRoomForPayment] = useState<Room | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  const fetchData = useCallback(async () => {
    if (!userData) return;
    setLoadingData(true);
    try {
      // 1. Fetch all rooms
      const roomsSnap = await getDocs(query(collection(db, "rooms")));
      const fetchedRooms = roomsSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((r: any) => r.status !== "deleted") as Room[];
      fetchedRooms.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRooms(fetchedRooms);

      // 2. Fetch student's access requests
      const erSnap = await getDocs(
        query(collection(db, "enrollmentRequests"), where("studentId", "==", userData.uid))
      );
      const erMap: Record<string, any> = {};
      erSnap.docs.forEach(d => {
        erMap[d.data().roomId] = d.data();
      });
      setEnrollmentRequests(erMap);

      // 3. Fetch student's payment requests
      const prSnap = await getDocs(
        query(collection(db, "paymentRequests"), where("studentId", "==", userData.uid))
      );
      const prMap: Record<string, any> = {};
      prSnap.docs.forEach(d => {
        prMap[d.data().roomId] = d.data();
      });
      setPaymentRequests(prMap);
    } catch (err) {
      console.error("Failed to fetch enrollment data:", err);
    } finally {
      setLoadingData(false);
    }
  }, [userData]);

  useEffect(() => {
    if (userData) {
      fetchData();
    }
  }, [userData, fetchData]);

  const handleRequestAccess = async (room: Room) => {
    if (!userData) return;
    setSubmittingId(room.id);
    try {
      const docId = `${userData.uid}_${room.id}`;
      const newRequest = {
        roomId: room.id,
        roomName: room.roomName,
        teacherId: room.teacherId,
        teacherName: room.teacherName,
        studentId: userData.uid,
        studentName: userData.name,
        studentEmail: userData.email || "",
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, "enrollmentRequests", docId), newRequest);
      
      // Update local state
      setEnrollmentRequests(prev => ({
        ...prev,
        [room.id]: newRequest,
      }));
    } catch (err) {
      console.error("Failed to submit access request:", err);
      window.alert("Failed to submit access request. Please try again.");
    } finally {
      setSubmittingId(null);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData || !selectedRoomForPayment) return;

    if (!transactionId.trim()) {
      setPaymentError("Transaction Reference ID is required.");
      return;
    }

    setPaymentLoading(true);
    setPaymentError("");

    try {
      const newPayment = {
        roomId: selectedRoomForPayment.id,
        roomName: selectedRoomForPayment.roomName,
        teacherId: selectedRoomForPayment.teacherId,
        teacherName: selectedRoomForPayment.teacherName,
        studentId: userData.uid,
        studentName: userData.name,
        studentEmail: userData.email || "",
        price: selectedRoomForPayment.price || 0,
        upiId: selectedRoomForPayment.upiId || "",
        transactionId: transactionId.trim(),
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const docId = `${userData.uid}_${selectedRoomForPayment.id}`;
      await setDoc(doc(db, "paymentRequests", docId), newPayment);

      // Update local state
      setPaymentRequests(prev => ({
        ...prev,
        [selectedRoomForPayment.id]: newPayment,
      }));

      setSelectedRoomForPayment(null);
      setTransactionId("");
    } catch (err) {
      console.error("Failed to submit payment proof:", err);
      setPaymentError("Failed to submit payment proof. Please try again.");
    } finally {
      setPaymentLoading(false);
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

  const getFilteredRooms = () => {
    if (!searchQuery.trim()) return rooms;
    const q = searchQuery.toLowerCase();
    return rooms.filter(r =>
      r.roomName.toLowerCase().includes(q) ||
      r.subject.toLowerCase().includes(q) ||
      r.teacherName.toLowerCase().includes(q)
    );
  };

  const filteredRooms = getFilteredRooms();

  return (
    <DashboardLayout title="Enroll in Batch">
      <div className="page-enter">
        {/* Page Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
              Enroll in a Batch 📚
            </h1>
            <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
              Browse and unlock classroom batches created by faculty.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 14px", borderRadius: "var(--radius-md)", background: "var(--bg-elevated)", border: "1px solid var(--border)", minWidth: 240 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input
              type="text"
              placeholder="Search batches..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ border: "none", background: "none", outline: "none", color: "var(--text-primary)", fontSize: 13, width: "100%" }}
            />
          </div>
        </div>

        {/* Room list grid */}
        {loadingData ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
            {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 160, borderRadius: "var(--radius-lg)" }} />)}
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="card empty-state">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M12 8v8M8 12h8" /></svg>
            <h3>No batches available</h3>
            <p>No classroom batches have been created on the platform yet.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
            {filteredRooms.map(room => {
              const isEnrolled = room.participants?.includes(userData.uid);
              const accessReq = enrollmentRequests[room.id];
              const payReq = paymentRequests[room.id];
              const isPaid = room.isPaid === true;

              // Render lock/unlock indicators
              const getLockState = () => {
                if (isEnrolled) {
                  return <span className="badge badge-success" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13.5 10.5V6a4.5 4.5 0 0 0-9 0v4.5M3 10.5h18v11H3z"/><circle cx="12" cy="16" r="1.5"/></svg> Enrolled / Unlocked</span>;
                }
                return <span className="badge" style={{ background: "var(--bg-elevated)", color: "var(--text-muted)", border: "1px solid var(--border)", display: "inline-flex", alignItems: "center", gap: 4 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg> Locked</span>;
              };

              return (
                <div key={room.id} className="card" style={{ padding: 20, display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%", gap: 16, borderColor: isEnrolled ? "var(--green)" : undefined }}>
                  {/* Info */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                      {getLockState()}
                      <span style={{ fontSize: 13, fontWeight: 700, color: isPaid ? "var(--blue)" : "var(--green)" }}>
                        {isPaid ? `₹${room.price} INR` : "Free"}
                      </span>
                    </div>

                    <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
                      {room.roomName}
                    </h3>
                    <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>
                      {room.subject}
                    </p>
                    <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      Faculty: <strong>{room.teacherName}</strong>
                    </p>
                  </div>

                  {/* Actions / Status checks */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: "auto" }}>
                    {isEnrolled ? (
                      /* Enrolled: button to go to classroom */
                      <button
                        className="btn-success"
                        onClick={() => router.push(`/room/${room.id}`)}
                        style={{ width: "100%", justifyContent: "center" }}
                      >
                        Enter Batch Classroom
                      </button>
                    ) : !accessReq ? (
                      /* No Request Sent yet */
                      <button
                        className="btn-primary"
                        disabled={submittingId === room.id}
                        onClick={() => handleRequestAccess(room)}
                        style={{ width: "100%", justifyContent: "center" }}
                      >
                        {submittingId === room.id ? "Sending..." : "Request Access to Enroll"}
                      </button>
                    ) : accessReq.status === "pending" ? (
                      /* Access Request Pending */
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={{ fontSize: 12, color: "var(--yellow)", background: "var(--yellow-light)", padding: "6px 10px", borderRadius: "var(--radius-md)", textAlign: "center", fontWeight: 600 }}>
                          Access Request Pending Approval
                        </span>
                        <button className="btn-secondary" disabled style={{ width: "100%", justifyContent: "center" }}>
                          Waiting for Faculty
                        </button>
                      </div>
                    ) : accessReq.status === "rejected" ? (
                      /* Access Request Rejected */
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <span style={{ fontSize: 11, color: "var(--red)", background: "var(--red-light)", padding: "8px 10px", borderRadius: "var(--radius-md)", lineHeight: 1.4 }}>
                          ❌ <strong>Access Denied:</strong> {accessReq.rejectionReason || "Declined by faculty."}
                        </span>
                        <button
                          className="btn-danger"
                          disabled={submittingId === room.id}
                          onClick={() => handleRequestAccess(room)}
                          style={{ width: "100%", justifyContent: "center", fontSize: 12.5 }}
                        >
                          {submittingId === room.id ? "Sending..." : "Resubmit Access Request"}
                        </button>
                      </div>
                    ) : (
                      /* Access Request Approved: Payment Workflow */
                      <>
                        {!isPaid ? (
                          /* Approved Free Batch: enrollment should have completed. Show error backup helper */
                          <button
                            className="btn-primary"
                            onClick={() => router.refresh()}
                            style={{ width: "100%", justifyContent: "center" }}
                          >
                            Access Approved (Reload page to sync)
                          </button>
                        ) : !payReq ? (
                          /* Paid batch: Needs Payment checkout */
                          <button
                            className="btn-success"
                            onClick={() => setSelectedRoomForPayment(room)}
                            style={{ width: "100%", justifyContent: "center" }}
                          >
                            Proceed to Payment
                          </button>
                        ) : payReq.status === "pending" ? (
                          /* Paid batch: Payment verification pending */
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <span style={{ fontSize: 12, color: "var(--yellow)", background: "var(--yellow-light)", padding: "6px 10px", borderRadius: "var(--radius-md)", textAlign: "center", fontWeight: 600 }}>
                              Payment Verification Pending
                            </span>
                            <button className="btn-secondary" disabled style={{ width: "100%", justifyContent: "center" }}>
                              UTR: {payReq.transactionId}
                            </button>
                          </div>
                        ) : (
                          /* Paid batch: Payment rejected (resubmit payment) */
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <span style={{ fontSize: 11, color: "var(--red)", background: "var(--red-light)", padding: "8px 10px", borderRadius: "var(--radius-md)", lineHeight: 1.4 }}>
                              ❌ <strong>Payment Rejected:</strong> {payReq.rejectionReason || "Invalid UTR Reference."}
                            </span>
                            <button
                              className="btn-danger"
                              onClick={() => setSelectedRoomForPayment(room)}
                              style={{ width: "100%", justifyContent: "center", fontSize: 12.5 }}
                            >
                              Resubmit Payment Details
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* UPI Payments Checkout Modal */}
        {selectedRoomForPayment && (
          <div className="modal-overlay" onClick={() => setSelectedRoomForPayment(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
              <div className="flex items-center gap-3" style={{ marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: "var(--radius-md)", background: "linear-gradient(135deg, #f59e0b, #ca8a04)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--color-text-primary)" }}>Paid Batch Enrollment</h2>
                  <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 2 }}>Pay to enroll in <strong>{selectedRoomForPayment.roomName}</strong></p>
                </div>
              </div>

              {paymentError && <div className="error-alert">{paymentError}</div>}

              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Batch Price</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>₹{selectedRoomForPayment.price} INR</span>
                </div>

                {/* QR and UPI Details */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: 16, background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", textAlign: "center", lineHeight: 1.5 }}>Scan QR with GPay, PhonePe, Paytm, or any UPI app to pay</p>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                      `upi://pay?pa=${selectedRoomForPayment.upiId}&pn=${encodeURIComponent(selectedRoomForPayment.teacherName)}&am=${selectedRoomForPayment.price}&cu=INR&tn=${encodeURIComponent(`Batch ${selectedRoomForPayment.roomName}`)}`
                    )}`}
                    alt="UPI QR Code"
                    style={{ width: 160, height: 160, borderRadius: "var(--radius-md)", border: "4px solid #fff", display: "block" }}
                  />
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>
                    UPI ID: <span style={{ color: "var(--blue)" }}>{selectedRoomForPayment.upiId}</span>
                  </p>
                </div>
              </div>

              <form onSubmit={handlePaymentSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label className="field-label">UPI Transaction ID / Ref Number (UTR)</label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={e => setTransactionId(e.target.value.replace(/[^0-9a-zA-Z]/g, ""))}
                    required
                    placeholder="Enter 12 or 16 digit Transaction Ref No"
                    maxLength={16}
                    className="input-field"
                    style={{ textAlign: "center", fontSize: 16, letterSpacing: "0.05em" }}
                  />
                </div>

                <div className="flex gap-3 justify-end">
                  <button type="button" onClick={() => setSelectedRoomForPayment(null)} className="btn-secondary">Cancel</button>
                  <button type="submit" disabled={paymentLoading} className="btn-primary">
                    {paymentLoading ? "Submitting..." : "Submit Payment Proof"}
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
