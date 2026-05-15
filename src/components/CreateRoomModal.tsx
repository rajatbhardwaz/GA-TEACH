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
        participants: [],
        isActive: false,
      });

      setRoomName("");
      setSubject("");
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
