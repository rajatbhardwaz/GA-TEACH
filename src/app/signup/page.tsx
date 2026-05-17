"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"teacher" | "student">("student");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      await signup(email, password, name, role);
      router.push("/dashboard");
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      if (firebaseError.code === "auth/email-already-in-use") setError("An account with this email already exists.");
      else if (firebaseError.code === "auth/weak-password") setError("Password is too weak.");
      else setError("Failed to create account. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--bg-base)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(34,197,94,0.05) 0%, transparent 60%)", bottom: -200, left: -100, pointerEvents: "none" }} />

      <div className="page-enter" style={{ width: "100%", maxWidth: 400, position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 36 }}>
          <img src="/logo.png" alt="Glorious Amplification" style={{ width: 44, height: 44, objectFit: "contain" }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "0.02em" }}>Glorious Amplification</span>
        </div>

        <div className="card" style={{ padding: 32 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, textAlign: "center", marginBottom: 4, color: "var(--text-primary)" }}>Begin your journey</h1>
          <p style={{ fontSize: 14, textAlign: "center", color: "var(--text-secondary)", marginBottom: 28 }}>Register as a student or faculty member</p>
          {error && <div className="error-alert">{error}</div>}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label className="field-label">Full Name</label>
              <input id="signup-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Your full name" className="input-field" />
            </div>
            <div>
              <label className="field-label">Email</label>
              <input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" className="input-field" />
            </div>
            <div>
              <label className="field-label">Password</label>
              <input id="signup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Min 6 characters" className="input-field" />
            </div>
            <div>
              <label className="field-label">I am a</label>
              <div style={{ display: "flex", gap: 8 }}>
                {([
                  { key: "student" as const, label: "Student / Aspirant", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg> },
                  { key: "teacher" as const, label: "Faculty / Mentor", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
                ]).map(r => (
                  <button key={r.key} type="button" onClick={() => setRole(r.key)} style={{
                    flex: 1, padding: "10px 12px", borderRadius: "var(--radius-md)",
                    border: `1px solid ${role === r.key ? "var(--blue)" : "var(--border-light)"}`,
                    background: role === r.key ? "var(--blue-light)" : "var(--bg-elevated)",
                    color: role === r.key ? "var(--blue)" : "var(--text-secondary)",
                    fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all var(--transition-fast)",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}>
                    {r.icon}
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary" style={{ width: "100%", marginTop: 4, padding: "12px 24px" }}>
              {loading ? (<><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />Creating account...</>) : "Start Learning"}
            </button>
          </form>
        </div>
        <p style={{ fontSize: 14, textAlign: "center", marginTop: 20, color: "var(--text-secondary)" }}>
          Already registered?{" "}
          <Link href="/login" style={{ color: "var(--blue)", fontWeight: 500 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
