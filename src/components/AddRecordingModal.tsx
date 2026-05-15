"use client";

import { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import { useAuth } from "@/context/AuthContext";

interface AddRecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  onRecordingAdded: () => void;
}

export default function AddRecordingModal({
  isOpen,
  onClose,
  roomId,
  onRecordingAdded,
}: AddRecordingModalProps) {
  const { userData } = useAuth();
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;

    setLoading(true);
    setError("");

    try {
      await addDoc(collection(db, "recordings"), {
        roomId,
        title,
        link,
        uploadedBy: userData.name,
        uploadedById: userData.uid,
        createdAt: new Date().toISOString(),
      });

      setTitle("");
      setLink("");
      onRecordingAdded();
      onClose();
    } catch (err) {
      setError("Failed to add recording. Please try again.");
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
              background: "linear-gradient(135deg, #ea4335, #ff6d60)",
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
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--color-text-primary)" }}>
              Add Recording
            </h2>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 2 }}>
              Share a recording link with your class
            </p>
          </div>
        </div>

        {error && <div className="error-alert">{error}</div>}

        <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label className="field-label">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. Lecture 1 - Introduction"
              className="input-field"
            />
          </div>

          <div>
            <label className="field-label">Recording Link</label>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              required
              placeholder="https://..."
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
                  Adding...
                </>
              ) : (
                "Add Recording"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
