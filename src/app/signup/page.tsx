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

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      await signup(email, password, name, role);
      router.push("/dashboard");
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      if (firebaseError.code === "auth/email-already-in-use") {
        setError("An account with this email already exists.");
      } else if (firebaseError.code === "auth/weak-password") {
        setError("Password is too weak. Use at least 6 characters.");
      } else {
        setError("Failed to create account. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "var(--color-surface)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background blobs */}
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(52,168,83,0.12) 0%, transparent 70%)",
          top: -200,
          left: -100,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(26,115,232,0.08) 0%, transparent 70%)",
          bottom: -150,
          right: -100,
          pointerEvents: "none",
        }}
      />

      <div className="page-enter" style={{ width: "100%", maxWidth: 400, position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <div className="flex items-center justify-center gap-3" style={{ marginBottom: 32 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "var(--radius-md)",
              background: "linear-gradient(135deg, #1a73e8, #4285f4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 16px rgba(26, 115, 232, 0.35)",
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M23 7l-7 5 7 5V7z" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </div>
          <span style={{ fontSize: 24, fontWeight: 600, color: "var(--color-text-primary)" }}>
            Classroom
          </span>
        </div>

        {/* Card */}
        <div className="glass-card" style={{ padding: 32 }}>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 600,
              textAlign: "center",
              marginBottom: 8,
              color: "var(--color-text-primary)",
            }}
          >
            Create your account
          </h1>
          <p style={{ fontSize: 14, textAlign: "center", color: "var(--color-text-secondary)", marginBottom: 28 }}>
            Join as a teacher or student
          </p>

          {error && <div className="error-alert">{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label className="field-label">Full Name</label>
              <input
                id="signup-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="John Doe"
                className="input-field"
              />
            </div>

            <div>
              <label className="field-label">Email</label>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="input-field"
              />
            </div>

            <div>
              <label className="field-label">Password</label>
              <input
                id="signup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Min 6 characters"
                className="input-field"
              />
            </div>

            <div>
              <label className="field-label">Role</label>
              {/* Role toggle buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRole("student")}
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    borderRadius: "var(--radius-md)",
                    border: `1px solid ${role === "student" ? "var(--color-primary)" : "var(--color-border)"}`,
                    background: role === "student" ? "rgba(26, 115, 232, 0.12)" : "var(--color-surface-elevated)",
                    color: role === "student" ? "var(--color-primary)" : "var(--color-text-secondary)",
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all var(--transition-fast)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                  </svg>
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setRole("teacher")}
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    borderRadius: "var(--radius-md)",
                    border: `1px solid ${role === "teacher" ? "var(--color-primary)" : "var(--color-border)"}`,
                    background: role === "teacher" ? "rgba(26, 115, 232, 0.12)" : "var(--color-surface-elevated)",
                    color: role === "teacher" ? "var(--color-primary)" : "var(--color-text-secondary)",
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all var(--transition-fast)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                    <line x1="9" y1="9" x2="9.01" y2="9" />
                    <line x1="15" y1="9" x2="15.01" y2="9" />
                  </svg>
                  Teacher
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary" style={{ width: "100%", marginTop: 4, padding: "12px 24px" }}>
              {loading ? (
                <>
                  <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>
        </div>

        <p style={{ fontSize: 14, textAlign: "center", marginTop: 20, color: "var(--color-text-secondary)" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--color-primary)", fontWeight: 500 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
