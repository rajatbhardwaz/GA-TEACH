"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      if (firebaseError.code === "auth/user-not-found") {
        setError("No account found with this email.");
      } else if (firebaseError.code === "auth/wrong-password") {
        setError("Incorrect password.");
      } else if (firebaseError.code === "auth/invalid-credential") {
        setError("Invalid email or password.");
      } else {
        setError("Failed to login. Please try again.");
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
          background: "radial-gradient(circle, rgba(26,115,232,0.12) 0%, transparent 70%)",
          top: -200,
          right: -100,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(52,168,83,0.08) 0%, transparent 70%)",
          bottom: -150,
          left: -100,
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
            Welcome back
          </h1>
          <p style={{ fontSize: 14, textAlign: "center", color: "var(--color-text-secondary)", marginBottom: 28 }}>
            Sign in to continue to your classroom
          </p>

          {error && <div className="error-alert">{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label className="field-label">Email</label>
              <input
                id="login-email"
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
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="input-field"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary" style={{ width: "100%", marginTop: 4, padding: "12px 24px" }}>
              {loading ? (
                <>
                  <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>

        <p style={{ fontSize: 14, textAlign: "center", marginTop: 20, color: "var(--color-text-secondary)" }}>
          Don&apos;t have an account?{" "}
          <Link href="/signup" style={{ color: "var(--color-primary)", fontWeight: 500 }}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
