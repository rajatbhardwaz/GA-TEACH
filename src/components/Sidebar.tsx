"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { collection, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "@/firebase/config";

// Admin-only nav item
const adminNav = {
  label: "Teacher Management", href: "/admin",
  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { userData, isAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Real-time notification badge counts
  const [pendingAccessCount, setPendingAccessCount] = useState(0);
  const [pendingPaymentCount, setPendingPaymentCount] = useState(0);
  const [studentLiveCount, setStudentLiveCount] = useState(0);
  const [studentEnrollActionsCount, setStudentEnrollActionsCount] = useState(0);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Real-time Firestore subscriptions for notification counts
  useEffect(() => {
    if (!userData) return;

    const unsubscribes: (() => void)[] = [];

    // 1. Teachers and Admins: listen to pending enrollment access requests and payment approvals
    if (userData.role === "teacher" || userData.role === "admin") {
      const erQ = userData.role === "admin"
        ? query(collection(db, "enrollmentRequests"), where("status", "==", "pending"))
        : query(collection(db, "enrollmentRequests"), where("teacherId", "==", userData.uid), where("status", "==", "pending"));

      const unsubER = onSnapshot(erQ, (snap) => {
        setPendingAccessCount(snap.size);
      }, (err) => console.error("Error listening to enrollment requests:", err));
      unsubscribes.push(unsubER);

      const prQ = userData.role === "admin"
        ? query(collection(db, "paymentRequests"), where("status", "==", "pending"))
        : query(collection(db, "paymentRequests"), where("teacherId", "==", userData.uid), where("status", "==", "pending"));

      const unsubPR = onSnapshot(prQ, (snap) => {
        setPendingPaymentCount(snap.size);
      }, (err) => console.error("Error listening to payment requests:", err));
      unsubscribes.push(unsubPR);
    }

    // 2. Students: listen to live batches and access/payment notifications requiring attention
    if (userData.role === "student") {
      const liveQ = query(collection(db, "rooms"), where("participants", "array-contains", userData.uid), where("isActive", "==", true));
      const unsubLive = onSnapshot(liveQ, (snap) => {
        setStudentLiveCount(snap.size);
      }, (err) => console.error("Error listening to live classes:", err));
      unsubscribes.push(unsubLive);

      const erStudentQ = query(collection(db, "enrollmentRequests"), where("studentId", "==", userData.uid));
      const unsubERStudent = onSnapshot(erStudentQ, (snap) => {
        const prStudentQ = query(collection(db, "paymentRequests"), where("studentId", "==", userData.uid));
        getDocs(prStudentQ).then(prSnap => {
          let count = 0;
          
          snap.docs.forEach(d => {
            const erData = d.data();
            // Acknowledge rejected access request
            if (erData.status === "rejected") count++;
            // Acknowledge approved access request if payment is needed and hasn't been submitted
            if (erData.status === "approved") {
              const hasSubmittedPayment = prSnap.docs.some(pd => pd.data().roomId === erData.roomId);
              if (!hasSubmittedPayment) {
                count++;
              }
            }
          });

          // Acknowledge rejected payment request
          prSnap.docs.forEach(d => {
            if (d.data().status === "rejected") count++;
          });

          setStudentEnrollActionsCount(count);
        }).catch(console.error);
      }, (err) => console.error("Error listening to student enrollment actions:", err));
      unsubscribes.push(unsubERStudent);
    }

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [userData]);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/batches") return pathname === "/batches";
    return pathname.startsWith(href);
  };

  const navItems = [
    {
      label: "Dashboard", href: "/dashboard",
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>,
    },
    {
      label: "My Batches", href: "/batches",
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg>,
    },
    ...(userData?.role === "student" ? [{
      label: "Enroll in Batch", href: "/enroll",
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M12 8v8M8 12h8" /></svg>
    }] : []),
    {
      label: "Lecture Recordings", href: "/recordings",
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10" /><polygon points="10,8 16,12 10,16" /></svg>,
    },
  ];

  const sidebarContent = (
    <>
      {/* Logo area */}
      <div className="sidebar-logo">
        <img src="/logo.png" alt="Glorious Amplification" style={{ width: 40, height: 40, objectFit: "contain" }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "0.02em" }}>Glorious Amplification</span>
      </div>

      {/* Main nav */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Learning</div>
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`sidebar-item ${isActive(item.href) ? "active" : ""}`}
            onClick={() => setMobileOpen(false)}
            style={{ display: "flex", alignItems: "center" }}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.label === "My Batches" && userData?.role === "student" && studentLiveCount > 0 && (
              <span style={{ fontSize: 9, fontWeight: 700, background: "var(--red)", color: "#fff", padding: "2px 6px", borderRadius: "var(--radius-full)", marginLeft: "auto", textTransform: "uppercase", letterSpacing: "0.5px" }}>Live</span>
            )}
            {item.label === "Enroll in Batch" && studentEnrollActionsCount > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, background: "var(--blue)", color: "#fff", padding: "1px 6px", borderRadius: "var(--radius-full)", marginLeft: "auto" }}>{studentEnrollActionsCount}</span>
            )}
          </Link>
        ))}

        {/* Approvals section — visible to teachers and admins */}
        {(userData?.role === "teacher" || userData?.role === "admin") && (
          <>
            <div className="sidebar-section-label" style={{ marginTop: 8 }}>Faculty / Admin</div>
            <Link
              href="/enrollments"
              className={`sidebar-item ${isActive("/enrollments") ? "active" : ""}`}
              onClick={() => setMobileOpen(false)}
              style={{ display: "flex", alignItems: "center" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
              <span>Enrollment Requests</span>
              {pendingAccessCount > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, background: "var(--yellow)", color: "#000", padding: "1px 6px", borderRadius: "var(--radius-full)", marginLeft: "auto" }}>{pendingAccessCount}</span>
              )}
            </Link>
            <Link
              href="/approvals"
              className={`sidebar-item ${isActive("/approvals") ? "active" : ""}`}
              onClick={() => setMobileOpen(false)}
              style={{ display: "flex", alignItems: "center" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="4" width="20" height="16" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
              <span>Payment Approvals</span>
              {pendingPaymentCount > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, background: "var(--yellow)", color: "#000", padding: "1px 6px", borderRadius: "var(--radius-full)", marginLeft: "auto" }}>{pendingPaymentCount}</span>
              )}
            </Link>
          </>
        )}

        {/* Admin section — only visible to admin */}
        {isAdmin && (
          <>
            <div className="sidebar-section-label" style={{ marginTop: 8 }}>Administration</div>
            <Link
              href={adminNav.href}
              className={`sidebar-item ${isActive(adminNav.href) ? "active" : ""}`}
              onClick={() => setMobileOpen(false)}
            >
              {adminNav.icon}
              {adminNav.label}
            </Link>
          </>
        )}
      </nav>

      {/* Footer / single Settings button */}
      <div className="sidebar-footer" style={{ padding: "8px 16px", marginTop: "auto", borderTop: "1px solid var(--border)" }}>
        <Link
          href="/settings"
          className={`sidebar-item ${isActive("/settings") ? "active" : ""}`}
          onClick={() => setMobileOpen(false)}
          style={{ width: "100%", justifyContent: "flex-start", gap: 12 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
          Settings
        </Link>
      </div>
    </>
  );

  return (
    <>
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        {sidebarContent}
      </aside>
      {mobileOpen && (
        <div className="sidebar-overlay show" onClick={() => setMobileOpen(false)} />
      )}
      <button
        className="hamburger-btn"
        onClick={() => setMobileOpen(true)}
        aria-label="Menu"
        style={{ position: "fixed", top: 8, left: 12, zIndex: 38 }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
    </>
  );
}
