"use client";

import { useEffect, useState, useCallback } from "react";
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase/config";
import { useAuth } from "@/context/AuthContext";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import CreateRoomModal from "@/components/CreateRoomModal";
import JoinRoomModal from "@/components/JoinRoomModal";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDate } from "@/utils/helpers";

interface Room {
    id: string; roomName: string; subject: string; teacherName: string;
    teacherId: string; roomCode: string; createdAt: string;
    participants: string[]; isActive: boolean; scheduledAt?: string; currentSession?: string;
    status?: "active" | "paused" | "deleted";
}

export default function BatchesPage() {
    const { loading: authLoading } = useProtectedRoute();
    const { userData } = useAuth();
    const router = useRouter();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loadingRooms, setLoadingRooms] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [activeTab, setActiveTab] = useState<"all" | "active" | "paused" | "completed">("all");
    const [actionInProgress, setActionInProgress] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    const [showPauseConfirm, setShowPauseConfirm] = useState<string | null>(null);

    const fetchRooms = useCallback(async () => {
        if (!userData) return;
        setLoadingRooms(true);
        try {
            const q = userData.role === "admin"
                ? query(collection(db, "rooms"))
                : userData.role === "teacher"
                    ? query(collection(db, "rooms"), where("teacherId", "==", userData.uid))
                    : query(collection(db, "rooms"), where("participants", "array-contains", userData.uid));
            const snapshot = await getDocs(q);
            const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Room[];
            fetched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setRooms(fetched);
        } catch (err) { console.error("Failed to fetch rooms:", err); }
        finally { setLoadingRooms(false); }
    }, [userData]);

    useEffect(() => {
        if (!userData) return;

        const roomsQuery = userData.role === "admin"
            ? query(collection(db, "rooms"))
            : userData.role === "teacher"
                ? query(collection(db, "rooms"), where("teacherId", "==", userData.uid))
                : query(collection(db, "rooms"), where("participants", "array-contains", userData.uid));

        const unsubscribe = onSnapshot(
            roomsQuery,
            (snapshot) => {
                const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Room[];
                fetched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setRooms(fetched);
                setLoadingRooms(false);
            },
            (err) => {
                console.error("Failed to subscribe to rooms:", err);
                setLoadingRooms(false);
            }
        );

        return () => unsubscribe();
    }, [userData]);

    // Pause a batch
    const handlePauseBatch = async (room: Room) => {
        if (!userData) return;
        const canManage = userData.role === "admin" || (userData.role === "teacher" && room.teacherId === userData.uid);
        if (!canManage) return;

        setActionInProgress(room.id);
        try {
            await updateDoc(doc(db, "rooms", room.id), {
                status: "paused",
                isActive: false,
                currentSession: null,
                pausedAt: new Date().toISOString(),
                pausedBy: userData.uid,
            });
            setShowPauseConfirm(null);
        } catch (err) {
            console.error("Failed to pause batch:", err);
            window.alert("Could not pause the batch. Please try again.");
        } finally {
            setActionInProgress(null);
        }
    };

    // Resume a batch
    const handleResumeBatch = async (room: Room) => {
        if (!userData) return;
        const canManage = userData.role === "admin" || (userData.role === "teacher" && room.teacherId === userData.uid);
        if (!canManage) return;

        setActionInProgress(room.id);
        try {
            await updateDoc(doc(db, "rooms", room.id), {
                status: "active",
                resumedAt: new Date().toISOString(),
                resumedBy: userData.uid,
            });
        } catch (err) {
            console.error("Failed to resume batch:", err);
            window.alert("Could not resume the batch. Please try again.");
        } finally {
            setActionInProgress(null);
        }
    };

    // Delete a batch
    const handleDeleteBatch = async (room: Room) => {
        if (!userData) return;
        const canManage = userData.role === "admin" || (userData.role === "teacher" && room.teacherId === userData.uid);
        if (!canManage) return;

        setActionInProgress(room.id);
        try {
            await deleteDoc(doc(db, "rooms", room.id));
            setShowDeleteConfirm(null);
        } catch (err) {
            console.error("Failed to delete batch:", err);
            window.alert("Could not delete the batch. Please try again.");
        } finally {
            setActionInProgress(null);
        }
    };

    if (authLoading) {
        return (<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-base)" }}><div className="spinner" /></div>);
    }

    if (!userData) {
        return (
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, padding: 24, textAlign: "center", background: "var(--bg-base)" }}>
                <p style={{ color: "var(--text-secondary)", fontSize: 15, maxWidth: 360 }}>Unable to load your profile.</p>
                <div style={{ display: "flex", gap: 10 }}>
                    <button className="btn-secondary" onClick={() => window.location.reload()}>Retry</button>
                    <a href="/login"><button className="btn-primary">Go to Login</button></a>
                </div>
            </div>
        );
    }

    const isTeacher = userData.role === "teacher" || userData.role === "admin";

    // Filter logic
    const activeRooms = rooms.filter(r => (r.status || "active") === "active" && !r.isActive);
    const pausedRooms = rooms.filter(r => r.status === "paused");
    const liveRooms = rooms.filter(r => r.isActive && (r.status || "active") !== "paused");
    const completedRooms = rooms.filter(r => !r.isActive && (r.status || "active") !== "paused" && r.status !== "deleted");

    const getFilteredRooms = () => {
        let filtered = rooms;
        switch (activeTab) {
            case "active": filtered = [...liveRooms, ...activeRooms]; break;
            case "paused": filtered = pausedRooms; break;
            case "completed": filtered = completedRooms; break;
            default: filtered = rooms;
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(r =>
                r.roomName.toLowerCase().includes(q) ||
                r.subject.toLowerCase().includes(q) ||
                r.teacherName.toLowerCase().includes(q) ||
                r.roomCode.toLowerCase().includes(q)
            );
        }
        return filtered;
    };

    const filteredRooms = getFilteredRooms();

    const getBatchStatusBadge = (room: Room) => {
        if (room.isActive && (room.status || "active") !== "paused") {
            return <span className="badge badge-live">Live</span>;
        }
        if (room.status === "paused") {
            return <span className="badge" style={{ background: "var(--yellow-light)", color: "var(--yellow)", border: "1px solid rgba(234,179,8,0.2)" }}>Paused</span>;
        }
        return null;
    };

    const tabs = [
        { key: "all" as const, label: "All Batches", count: rooms.length },
        { key: "active" as const, label: "Active", count: liveRooms.length + activeRooms.length },
        { key: "paused" as const, label: "Paused", count: pausedRooms.length },
        { key: "completed" as const, label: "Completed", count: completedRooms.length },
    ];

    return (
        <DashboardLayout title="My Batches">
            <div className="page-enter">
                {/* Page Header */}
                <div className="batch-page-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, gap: 16, flexWrap: "wrap" }}>
                    <div>
                        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
                            {isTeacher ? "Batch Management" : "My Batches"} 📚
                        </h1>
                        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
                            {isTeacher
                                ? "Create, manage, pause, or terminate your batches"
                                : "View and access all your enrolled batches"}
                        </p>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                        {isTeacher ? (
                            <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                                Create Batch
                            </button>
                        ) : (
                            <button className="btn-primary" onClick={() => setShowJoinModal(true)}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" /><polyline points="10,17 15,12 10,7" /><line x1="15" y1="12" x2="3" y2="12" /></svg>
                                Join with Batch Code
                            </button>
                        )}
                    </div>
                </div>

                {/* Search + Tabs */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 16, flexWrap: "wrap" }}>
                    {/* Tabs */}
                    <div className="batch-tabs" style={{ display: "flex", alignItems: "center", gap: 2, borderBottom: "1px solid var(--border)" }}>
                        {tabs.map(tab => (
                            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                                padding: "10px 18px", fontSize: 13, fontWeight: 500, cursor: "pointer", border: "none", background: "transparent",
                                color: activeTab === tab.key ? "var(--blue)" : "var(--text-muted)",
                                borderBottom: activeTab === tab.key ? "2px solid var(--blue)" : "2px solid transparent",
                                transition: "all var(--transition-fast)",
                            }}>{tab.label} ({tab.count})</button>
                        ))}
                    </div>

                    {/* Search */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 14px", borderRadius: "var(--radius-md)", background: "var(--bg-elevated)", border: "1px solid var(--border)", minWidth: 220 }}>
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

                {/* Batch List */}
                {loadingRooms ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 80 }} />)}</div>
                ) : filteredRooms.length === 0 ? (
                    <div className="card empty-state" style={{ marginTop: 8 }}>
                        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg>
                        <h3>{activeTab === "all" ? "No batches yet" : `No ${activeTab} batches`}</h3>
                        <p>{isTeacher ? "Create your first batch to start teaching" : "Join a batch with your batch code to begin learning"}</p>
                        {activeTab === "all" && <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => isTeacher ? setShowCreateModal(true) : setShowJoinModal(true)}>{isTeacher ? "Create First Batch" : "Join a Batch"}</button>}
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {filteredRooms.map(room => (
                            <div key={room.id} className="card batch-mgmt-card" style={{ padding: 0, overflow: "hidden" }}>
                                {/* Status strip */}
                                <div style={{
                                    height: 3,
                                    background: room.isActive && (room.status || "active") !== "paused"
                                        ? "linear-gradient(90deg, var(--green), #4ade80)"
                                        : room.status === "paused"
                                            ? "linear-gradient(90deg, var(--yellow), #facc15)"
                                            : "linear-gradient(90deg, var(--blue), #818cf8)"
                                }} />
                                <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                                    {/* Left: Batch info (clickable) */}
                                    <div
                                        style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0, cursor: "pointer" }}
                                        onClick={() => router.push(`/room/${room.id}`)}
                                    >
                                        <div style={{
                                            width: 46, height: 46, borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                                            background: room.isActive && (room.status || "active") !== "paused"
                                                ? "var(--green-light)"
                                                : room.status === "paused"
                                                    ? "var(--yellow-light)"
                                                    : "var(--blue-light)",
                                        }}>
                                            {room.isActive && (room.status || "active") !== "paused" ? (
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>
                                            ) : room.status === "paused" ? (
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" strokeWidth="2"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                                            ) : (
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg>
                                            )}
                                        </div>
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                                                <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{room.roomName}</p>
                                                {getBatchStatusBadge(room)}
                                            </div>
                                            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                                                {room.subject} · {room.teacherName} · {room.participants?.length || 0} students · Created {formatDate(room.createdAt)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Right: Actions */}
                                    <div className="batch-mgmt-actions" style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
                                        {isTeacher && <span style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 600, color: "var(--blue)", background: "var(--blue-light)", padding: "3px 8px", borderRadius: "var(--radius-sm)" }}>{room.roomCode}</span>}

                                        {/* View details */}
                                        <button
                                            className="btn-secondary"
                                            onClick={() => router.push(`/room/${room.id}`)}
                                            style={{ padding: "6px 14px", fontSize: 12 }}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                            View
                                        </button>

                                        {/* Teacher-only management buttons */}
                                        {isTeacher && (room.status || "active") !== "paused" && !room.isActive && (
                                            <button
                                                className="btn-secondary"
                                                onClick={(e) => { e.stopPropagation(); setShowPauseConfirm(room.id); }}
                                                disabled={actionInProgress === room.id}
                                                style={{ padding: "6px 14px", fontSize: 12, color: "var(--yellow)" }}
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                                                Pause
                                            </button>
                                        )}

                                        {isTeacher && room.status === "paused" && (
                                            <button
                                                className="btn-success"
                                                onClick={(e) => { e.stopPropagation(); handleResumeBatch(room); }}
                                                disabled={actionInProgress === room.id}
                                                style={{ padding: "6px 14px", fontSize: 12 }}
                                            >
                                                {actionInProgress === room.id ? "Resuming..." : (
                                                    <>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5,3 19,12 5,21" /></svg>
                                                        Resume
                                                    </>
                                                )}
                                            </button>
                                        )}

                                        {isTeacher && (
                                            <button
                                                className="btn-danger"
                                                onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(room.id); }}
                                                disabled={actionInProgress === room.id}
                                                style={{ padding: "6px 14px", fontSize: 12 }}
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,6 5,6 21,6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                                                Delete
                                            </button>
                                        )}

                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" style={{ cursor: "pointer" }} onClick={() => router.push(`/room/${room.id}`)}><polyline points="9,18 15,12 9,6" /></svg>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Summary bar at bottom */}
                {!loadingRooms && rooms.length > 0 && (
                    <div style={{
                        marginTop: 24, padding: "14px 20px", borderRadius: "var(--radius-lg)", background: "var(--bg-card)", border: "1px solid var(--border)",
                        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
                    }}>
                        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Total: <strong style={{ color: "var(--text-primary)" }}>{rooms.length}</strong></span>
                            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Active: <strong style={{ color: "var(--green)" }}>{liveRooms.length + activeRooms.length}</strong></span>
                            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Paused: <strong style={{ color: "var(--yellow)" }}>{pausedRooms.length}</strong></span>
                            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Students: <strong style={{ color: "var(--blue)" }}>{rooms.reduce((s, r) => s + (r.participants?.length || 0), 0)}</strong></span>
                        </div>
                    </div>
                )}
            </div>

            {/* Pause Confirmation Modal */}
            {showPauseConfirm && (
                <div className="modal-overlay" onClick={() => setShowPauseConfirm(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                            <div style={{ width: 44, height: 44, borderRadius: "var(--radius-md)", background: "var(--yellow-light)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" strokeWidth="2"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                            </div>
                            <div>
                                <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--text-primary)" }}>Pause Batch</h2>
                                <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Students won't be able to join sessions while paused</p>
                            </div>
                        </div>
                        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 8, lineHeight: 1.6 }}>
                            Are you sure you want to pause <strong style={{ color: "var(--text-primary)" }}>&ldquo;{rooms.find(r => r.id === showPauseConfirm)?.roomName}&rdquo;</strong>?
                        </p>
                        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
                            You can resume it anytime from the batch management panel.
                        </p>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                            <button className="btn-secondary" onClick={() => setShowPauseConfirm(null)} style={{ fontSize: 13 }}>Cancel</button>
                            <button
                                className="btn-primary"
                                disabled={actionInProgress === showPauseConfirm}
                                onClick={() => {
                                    const r = rooms.find(r => r.id === showPauseConfirm);
                                    if (r) handlePauseBatch(r);
                                }}
                                style={{ fontSize: 13, background: "linear-gradient(135deg, var(--yellow), #ca8a04)" }}
                            >
                                {actionInProgress === showPauseConfirm ? "Pausing..." : "Pause Batch"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                            <div style={{ width: 44, height: 44, borderRadius: "var(--radius-md)", background: "var(--red-light)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2"><polyline points="3,6 5,6 21,6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                            </div>
                            <div>
                                <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--text-primary)" }}>Delete Batch</h2>
                                <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>This action cannot be undone</p>
                            </div>
                        </div>
                        <div style={{ padding: "12px 16px", background: "var(--red-light)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: "var(--radius-md)", marginBottom: 16 }}>
                            <p style={{ fontSize: 13, color: "var(--red)", lineHeight: 1.6 }}>
                                ⚠️ Deleting this batch will permanently remove all associated data including student enrollments. Recordings will remain available separately.
                            </p>
                        </div>
                        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.6 }}>
                            Are you sure you want to delete <strong style={{ color: "var(--text-primary)" }}>&ldquo;{rooms.find(r => r.id === showDeleteConfirm)?.roomName}&rdquo;</strong>?
                        </p>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                            <button className="btn-secondary" onClick={() => setShowDeleteConfirm(null)} style={{ fontSize: 13 }}>Cancel</button>
                            <button
                                className="btn-danger"
                                disabled={actionInProgress === showDeleteConfirm}
                                onClick={() => {
                                    const r = rooms.find(r => r.id === showDeleteConfirm);
                                    if (r) handleDeleteBatch(r);
                                }}
                                style={{ fontSize: 13 }}
                            >
                                {actionInProgress === showDeleteConfirm ? "Deleting..." : "Delete Permanently"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <CreateRoomModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onRoomCreated={fetchRooms} />
            <JoinRoomModal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} onRoomJoined={fetchRooms} />
        </DashboardLayout>
    );
}
