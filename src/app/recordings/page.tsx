"use client";

import { useEffect, useState, useCallback } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/firebase/config";
import { useAuth } from "@/context/AuthContext";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import Navbar from "@/components/Navbar";
import { formatDate } from "@/utils/helpers";

interface Recording {
  id: string; roomId: string; title: string; link: string;
  uploadedBy: string; createdAt: string;
}
interface Room {
  id: string; roomName: string; subject: string; teacherId: string;
  participants: string[];
}

export default function RecordingsPage() {
  const { loading: authLoading } = useProtectedRoute();
  const { userData } = useAuth();
  const [recordings, setRecordings] = useState<(Recording & { roomName: string })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecordings = useCallback(async () => {
    if (!userData) return;
    setLoading(true);
    try {
      // First get user's rooms
      const roomQ = userData.role === "teacher"
        ? query(collection(db, "rooms"), where("teacherId", "==", userData.uid))
        : query(collection(db, "rooms"), where("participants", "array-contains", userData.uid));
      const roomSnap = await getDocs(roomQ);
      const rooms: Room[] = roomSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Room[];

      // Then get recordings for each room
      const allRecordings: (Recording & { roomName: string })[] = [];
      for (const room of rooms) {
        try {
          const recQ = query(collection(db, "recordings"), where("roomId", "==", room.id));
          const recSnap = await getDocs(recQ);
          recSnap.docs.forEach(d => {
            allRecordings.push({ id: d.id, ...d.data(), roomName: room.roomName } as Recording & { roomName: string });
          });
        } catch { /* skip rooms with no recordings */ }
      }
      allRecordings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRecordings(allRecordings);
    } catch (err) { console.error("Failed to fetch recordings:", err); }
    finally { setLoading(false); }
  }, [userData]);

  useEffect(() => { if (userData) fetchRecordings(); }, [userData, fetchRecordings]);

  if (authLoading) {
    return (<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><div className="spinner" /></div>);
  }

  if (!userData) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, padding: 24, textAlign: "center" }}>
        <p style={{ color: "var(--color-text-secondary)", fontSize: 15 }}>Unable to load your profile.</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-secondary" onClick={() => window.location.reload()} style={{ padding: "8px 20px", fontSize: 13 }}>Retry</button>
          <a href="/login"><button className="btn-primary" style={{ padding: "8px 20px", fontSize: 13 }}>Go to Login</button></a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-surface-elevated)" }}>
      <Navbar />
      <main style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px" }}>
        <div className="page-enter" style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Recordings</h1>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
            {userData.role === "teacher" ? "Lecture recordings across your batches" : "Watch recordings from your classes"}
          </p>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 72 }} />)}
          </div>
        ) : recordings.length === 0 ? (
          <div className="card empty-state">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" /><polygon points="10,8 16,12 10,16" />
            </svg>
            <h3>No recordings yet</h3>
            <p>{userData.role === "teacher" ? "Add recording links from your room pages" : "Your teachers will add recordings after sessions"}</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recordings.map(rec => (
              <div key={rec.id} className="card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                <div className="flex items-center gap-3" style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ width: 42, height: 42, borderRadius: "var(--radius-md)", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16"/></svg>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 2 }}>{rec.title}</p>
                    <p style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{rec.roomName} · {rec.uploadedBy} · {formatDate(rec.createdAt)}</p>
                  </div>
                </div>
                <a href={rec.link} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ padding: "8px 16px", fontSize: 13, flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5,3 19,12 5,21"/></svg>
                  Watch
                </a>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
