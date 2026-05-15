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

  if (!isOpen) return null;

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
      const roomData = roomDoc.data();

      // Check if already joined
      if (roomData.participants?.includes(userData.uid)) {
        setError("You have already joined this room.");
        setLoading(false);
        return;
      }

      // Add student to room participants
      await updateDoc(doc(db, "rooms", roomDoc.id), {
        participants: arrayUnion(userData.uid),
      });

      setRoomCode("");
      onRoomJoined();
      onClose();
    } catch (err) {
      setError("Failed to join room. Please try again.");
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
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? (
                <>
                  <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  Joining...
                </>
              ) : (
                "Join Room"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
