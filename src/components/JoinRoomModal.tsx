"use client";

import { useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
  setDoc,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { useAuth } from "@/context/AuthContext";

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoomJoined: () => void;
}

export default function JoinRoomModal({ isOpen, onClose, onRoomJoined }: JoinRoomModalProps) {
  const { userData } = useAuth();
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step-based states for paid batch workflow
  const [step, setStep] = useState<"enter-code" | "checkout" | "pending" | "rejected">("enter-code");
  const [foundRoom, setFoundRoom] = useState<any>(null);
  const [paymentRequest, setPaymentRequest] = useState<any>(null);
  const [transactionId, setTransactionId] = useState("");

  if (!isOpen) return null;

  const handleClose = () => {
    setStep("enter-code");
    setRoomCode("");
    setFoundRoom(null);
    setPaymentRequest(null);
    setTransactionId("");
    setError("");
    onClose();
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;

    setLoading(true);
    setError("");

    try {
      // Find room by room code
      const q = query(collection(db, "rooms"), where("roomCode", "==", roomCode.toUpperCase()));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setError("Room not found. Check the code and try again.");
        setLoading(false);
        return;
      }

      const roomDoc = snapshot.docs[0];
      const roomData = { id: roomDoc.id, ...roomDoc.data() } as any;

      // Check if already joined
      if (roomData.participants?.includes(userData.uid)) {
        setError("You have already joined this room.");
        setLoading(false);
        return;
      }

      // If room is free, enroll student directly
      if (!roomData.isPaid || !roomData.price) {
        await updateDoc(doc(db, "rooms", roomDoc.id), {
          participants: arrayUnion(userData.uid),
        });
        setRoomCode("");
        onRoomJoined();
        onClose();
        return;
      }

      // Paid batch: Check if student has an existing payment request
      const pqQuery = query(
        collection(db, "paymentRequests"),
        where("roomId", "==", roomDoc.id),
        where("studentId", "==", userData.uid)
      );
      const pqSnap = await getDocs(pqQuery);

      if (!pqSnap.empty) {
        const pqDoc = pqSnap.docs[0];
        const pqData = pqDoc.data();

        if (pqData.status === "approved") {
          // If approved, add student to room participants
          await updateDoc(doc(db, "rooms", roomDoc.id), {
            participants: arrayUnion(userData.uid),
          });
          setRoomCode("");
          onRoomJoined();
          onClose();
          return;
        } else if (pqData.status === "pending") {
          setPaymentRequest(pqData);
          setFoundRoom(roomData);
          setStep("pending");
          return;
        } else if (pqData.status === "rejected") {
          setPaymentRequest(pqData);
          setFoundRoom(roomData);
          setStep("rejected");
          return;
        }
      }

      // No request found: transition to checkout screen
      setFoundRoom(roomData);
      setStep("checkout");
    } catch (err) {
      setError("Failed to join room. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData || !foundRoom) return;

    if (!transactionId.trim()) {
      setError("Transaction ID is required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const newRequest = {
        roomId: foundRoom.id,
        roomName: foundRoom.roomName,
        teacherId: foundRoom.teacherId,
        teacherName: foundRoom.teacherName,
        studentId: userData.uid,
        studentName: userData.name,
        studentEmail: userData.email || "",
        price: foundRoom.price || 0,
        upiId: foundRoom.upiId || "",
        transactionId: transactionId.trim(),
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Use a composite document ID to keep exactly one request per student-room pair
      const docId = `${userData.uid}_${foundRoom.id}`;
      await setDoc(doc(db, "paymentRequests", docId), newRequest);

      setPaymentRequest(newRequest);
      setStep("pending");
      setTransactionId("");
    } catch (err) {
      setError("Failed to submit payment reference. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Step 1: Enter Room Code */}
        {step === "enter-code" && (
          <>
            {/* Header */}
            <div className="flex items-center gap-3" style={{ marginBottom: 24 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "var(--radius-md)",
                  background: "linear-gradient(135deg, #34a853, #4ade80)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
                  <polyline points="10,17 15,12 10,7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
              </div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--color-text-primary)" }}>
                  Join a Room
                </h2>
                <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 2 }}>
                  Enter the 6-character code from your teacher
                </p>
              </div>
            </div>

            {error && <div className="error-alert">{error}</div>}

            <form onSubmit={handleJoin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label className="field-label">Room Code</label>
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  required
                  placeholder="e.g. ABC123"
                  maxLength={6}
                  className="input-field"
                  style={{
                    textAlign: "center",
                    fontSize: 20,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 700,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                  }}
                />
              </div>

              <div className="flex gap-3 justify-end" style={{ paddingTop: 8 }}>
                <button type="button" onClick={handleClose} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? (
                    <>
                      <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                      Checking...
                    </>
                  ) : (
                    "Join Room"
                  )}
                </button>
              </div>
            </form>
          </>
        )}

        {/* Step 2: Checkout Screen (Paid batched payment checkout) */}
        {step === "checkout" && foundRoom && (
          <div>
            <div className="flex items-center gap-3" style={{ marginBottom: 20 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "var(--radius-md)",
                  background: "linear-gradient(135deg, #f59e0b, #ca8a04)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
              </div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--color-text-primary)" }}>
                  Paid Batch Enrollment
                </h2>
                <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 2 }}>
                  Pay to enroll in <strong>{foundRoom.roomName}</strong>
                </p>
              </div>
            </div>

            {error && <div className="error-alert">{error}</div>}

            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Batch Price</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>₹{foundRoom.price} INR</span>
              </div>

              {/* QR and UPI Details */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: 16, background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", textAlign: "center", lineHeight: 1.5 }}>
                  Scan QR with GPay, PhonePe, Paytm, or any UPI app to pay
                </p>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                    `upi://pay?pa=${foundRoom.upiId}&pn=${encodeURIComponent(foundRoom.teacherName)}&am=${foundRoom.price}&cu=INR&tn=${encodeURIComponent(`Batch ${foundRoom.roomName}`)}`
                  )}`}
                  alt="UPI QR Code"
                  style={{ width: 160, height: 160, borderRadius: "var(--radius-md)", border: "4px solid #fff", display: "block" }}
                />
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>
                  UPI ID: <span style={{ color: "var(--blue)" }}>{foundRoom.upiId}</span>
                </p>
              </div>
            </div>

            <form onSubmit={handlePaymentSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label className="field-label">UPI Transaction ID / Ref Number (UTR)</label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value.replace(/[^0-9a-zA-Z]/g, ""))}
                  required
                  placeholder="Enter 12 or 16 digit Transaction Ref No"
                  maxLength={16}
                  className="input-field"
                  style={{ textAlign: "center", fontSize: 16, letterSpacing: "0.05em" }}
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setStep("enter-code")} className="btn-secondary">
                  Back
                </button>
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? "Submitting..." : "Submit Payment Proof"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3: Pending Screen */}
        {step === "pending" && foundRoom && paymentRequest && (
          <div>
            <div className="flex items-center gap-3" style={{ marginBottom: 20 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "var(--radius-md)",
                  background: "var(--yellow-light)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12,6 12,12 16,14" />
                </svg>
              </div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--color-text-primary)" }}>
                  Verification Pending
                </h2>
                <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 2 }}>
                  Your request is awaiting faculty review
                </p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16, background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Batch Name</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>{foundRoom.roomName}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Faculty</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>{foundRoom.teacherName}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Amount Paid</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>₹{paymentRequest.price} INR</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Transaction ID</span>
                <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "monospace", color: "var(--color-text-primary)" }}>{paymentRequest.transactionId}</span>
              </div>
            </div>

            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.5, marginBottom: 20 }}>
              The teacher will verify the transaction on their dashboard. Once verified, you will be enrolled automatically and will be able to view the batch details.
            </p>

            <div className="flex justify-end">
              <button type="button" onClick={handleClose} className="btn-primary">
                Done
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Rejected Screen */}
        {step === "rejected" && foundRoom && paymentRequest && (
          <div>
            <div className="flex items-center gap-3" style={{ marginBottom: 20 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "var(--radius-md)",
                  background: "var(--red-light)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--color-text-primary)" }}>
                  Enrollment Rejected
                </h2>
                <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 2 }}>
                  Your payment verification was rejected by faculty
                </p>
              </div>
            </div>

            {paymentRequest.rejectionReason && (
              <div style={{ padding: "12px 14px", background: "var(--red-light)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: "var(--radius-md)", marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: "var(--red)", fontWeight: 600, marginBottom: 4 }}>Rejection Reason:</p>
                <p style={{ fontSize: 13, color: "var(--red)", lineHeight: 1.4 }}>{paymentRequest.rejectionReason}</p>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16, background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Batch Name</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>{foundRoom.roomName}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Declined Txn ID</span>
                <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "monospace", color: "var(--color-text-primary)" }}>{paymentRequest.transactionId}</span>
              </div>
            </div>

            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.5, marginBottom: 20 }}>
              If you made a payment but typed the wrong Transaction ID, you can try again by resubmitting the details.
            </p>

            <div className="flex gap-3 justify-end">
              <button type="button" onClick={handleClose} className="btn-secondary">
                Close
              </button>
              <button type="button" onClick={() => setStep("checkout")} className="btn-primary">
                Resubmit Payment Info
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
