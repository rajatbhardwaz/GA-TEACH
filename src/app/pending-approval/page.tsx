"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function PendingApprovalPage() {
  const { user, userData, loading, logout, isPendingTeacher, isRejectedTeacher, hasFullAccess } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/login"); return; }
    // If user has full access (approved/admin/student), go to dashboard
    if (userData && hasFullAccess) { router.push("/dashboard"); return; }
  }, [user, userData, loading, hasFullAccess, router]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  if (loading || !userData) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-base)" }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      background: "var(--bg-base)",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background orbs */}
      <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 60%)", top: -200, right: -200, pointerEvents: "none" }} />
      <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(168,85,247,0.04) 0%, transparent 60%)", bottom: -150, left: -100, pointerEvents: "none" }} />

      <div className="page-enter" style={{ width: "100%", maxWidth: 480, position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 36 }}>
          <img src="/logo.png" alt="Glorious Amplification" style={{ width: 48, height: 48, objectFit: "contain" }} />
          <span style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "0.02em" }}>Glorious Amplification</span>
        </div>

        <div className="card pending-card" style={{ padding: 40, textAlign: "center" }}>
          {/* Status Icon */}
          <div className="pending-status-icon" style={{
            width: 72, height: 72, borderRadius: "50%", margin: "0 auto 24px",
            background: isRejectedTeacher
              ? "var(--red-light)"
              : "var(--yellow-light)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {isRejectedTeacher ? (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            ) : (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>
              </svg>
            )}
          </div>

          {/* Title */}
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8, letterSpacing: "-0.02em" }}>
            {isRejectedTeacher
              ? "Application Not Approved"
              : "Account Under Review"}
          </h1>

          {/* Status badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: "var(--radius-full)", marginBottom: 20,
            background: isRejectedTeacher ? "var(--red-light)" : "var(--yellow-light)",
            border: isRejectedTeacher ? "1px solid rgba(239,68,68,0.2)" : "1px solid rgba(234,179,8,0.2)",
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: isRejectedTeacher ? "var(--red)" : "var(--yellow)",
              ...(isPendingTeacher ? { animation: "pulse-dot 2s ease-in-out infinite" } : {}),
            }} />
            <span style={{
              fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px",
              color: isRejectedTeacher ? "var(--red)" : "var(--yellow)",
            }}>
              {isRejectedTeacher ? "Rejected" : "Pending Approval"}
            </span>
          </div>

          {/* Description */}
          <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 32, maxWidth: 380, margin: "0 auto 32px" }}>
            {isRejectedTeacher
              ? "Your teacher account application has been reviewed and was not approved. If you believe this is an error, please contact the administrator."
              : "Your teacher account is currently under admin review. You will receive access to the full teacher dashboard once the administrator approves your application."}
          </p>

          {/* Info card */}
          <div className="account-details" style={{
            background: "var(--bg-elevated)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)", padding: 20, marginBottom: 28, textAlign: "left",
          }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>Your Account Details</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--text-muted)" }}>Name</span>
                <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{userData.name}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--text-muted)" }}>{userData.phone && !userData.email ? "Phone" : "Email"}</span>
                <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{userData.email || userData.phone || "—"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--text-muted)" }}>Role</span>
                <span className="badge badge-teacher" style={{ fontSize: 10, padding: "2px 8px" }}>Faculty</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--text-muted)" }}>Applied</span>
                <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                  {new Date(userData.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
            </div>
          </div>

          {/* Contact / Support */}
          <div className="support-box" style={{
            background: "var(--blue-light)", border: "1px solid rgba(59,130,246,0.15)",
            borderRadius: "var(--radius-lg)", padding: 16, marginBottom: 24, textAlign: "left",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
              </svg>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--blue)" }}>Need Help?</span>
            </div>
            <p style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Contact the administrator at{" "}
              <a href="mailto:admin.gloriousamplification@gmail.com" style={{ color: "var(--blue)", fontWeight: 500 }}>
                admin.gloriousamplification@gmail.com
              </a>
              {" "}for questions about your account status.
            </p>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button className="btn-secondary" onClick={handleLogout} style={{ padding: "10px 24px" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Log Out
            </button>
          </div>
        </div>

        <p style={{ fontSize: 12, textAlign: "center", marginTop: 20, color: "var(--text-muted)" }}>
          <span style={{ fontWeight: 600 }}>Glorious Amplification</span> — Coaching & Mentorship Platform
        </p>
      </div>
    </div>
  );
}
