"use client";

import { useState } from "react";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { useAuth } from "@/context/AuthContext";
import { generateRoomCode } from "@/utils/helpers";

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoomCreated: () => void;
}

export default function CreateRoomModal({ isOpen, onClose, onRoomCreated }: CreateRoomModalProps) {
  const { userData } = useAuth();
  const [roomName, setRoomName] = useState("");
  const [subject, setSubject] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState("");
  const [upiId, setUpiId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;

    setLoading(true);
    setError("");

    try {
      // Generate a unique room code, ensure it doesn't already exist
      let roomCode = generateRoomCode();
      const existingRooms = await getDocs(
        query(collection(db, "rooms"), where("roomCode", "==", roomCode))
      );
      if (!existingRooms.empty) {
        roomCode = generateRoomCode(); // retry once
      }

      await addDoc(collection(db, "rooms"), {
        roomName,
        subject,
        teacherName: userData.name,
        teacherId: userData.uid,
        roomCode,
        createdAt: new Date().toISOString(),
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        participants: [],
        isActive: false,
        isPaid,
        price: isPaid ? Number(price) : 0,
        upiId: isPaid ? (upiId.trim() || "admin.gloriousamplification@okaxis") : "",
      });

      setRoomName("");
      setScheduledAt("");
      setSubject("");
      setIsPaid(false);
      setPrice("");
      setUpiId("");
      onRoomCreated();
      onClose();
    } catch (err) {
      setError("Failed to create room. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3" style={{ marginBottom: 24 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "var(--radius-md)",
              background: "linear-gradient(135deg, #1a73e8, #4285f4)",
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
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--color-text-primary)" }}>
              Create New Room
            </h2>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 2 }}>
              Set up a classroom for your students
            </p>
          </div>
        </div>

        {error && <div className="error-alert">{error}</div>}

        <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label className="field-label">Room Name</label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              required
              placeholder="e.g. Math 101"
              className="input-field"
            />
          </div>

          <div>
            <label className="field-label">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              placeholder="e.g. Mathematics"
              className="input-field"
            />
          </div>

          <div>
            <label className="field-label">Schedule (optional)</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="input-field"
            />
          </div>

          {/* Is Paid Toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "8px 0" }}>
            <input
              type="checkbox"
              id="isPaid"
              checked={isPaid}
              onChange={(e) => setIsPaid(e.target.checked)}
              style={{ width: 18, height: 18, cursor: "pointer" }}
            />
            <label htmlFor="isPaid" style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)", cursor: "pointer" }}>
              Paid Batch (Requires Student Payment)
            </label>
          </div>

          {isPaid && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 12, borderRadius: "var(--radius-md)", background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
              <div>
                <label className="field-label">Price (INR)</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required={isPaid}
                  min={1}
                  placeholder="e.g. 999"
                  className="input-field"
                />
              </div>
              <div>
                <label className="field-label">Direct UPI ID for Payments (optional)</label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="Leave blank to use default (admin.gloriousamplification@okaxis)"
                  className="input-field"
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end" style={{ paddingTop: 8 }}>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? (
                <>
                  <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  Creating...
                </>
              ) : (
                "Create Room"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
