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
      if (firebaseError.code === "auth/user-not-found") setError("No account found with this email.");
      else if (firebaseError.code === "auth/wrong-password") setError("Incorrect password.");
      else if (firebaseError.code === "auth/invalid-credential") setError("Invalid email or password.");
      else setError("Failed to login. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--bg-base)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 60%)", top: -200, right: -200, pointerEvents: "none" }} />

      <div className="page-enter" style={{ width: "100%", maxWidth: 400, position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 36 }}>
          <img src="/logo.png" alt="GA TEACH" style={{ width: 36, height: 36, borderRadius: 10, objectFit: "cover" }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "0.04em" }}>GA TEACH</span>
        </div>

        <div className="card" style={{ padding: 32 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, textAlign: "center", marginBottom: 4, color: "var(--text-primary)" }}>Welcome back</h1>
          <p style={{ fontSize: 14, textAlign: "center", color: "var(--text-secondary)", marginBottom: 28 }}>Sign in to your account</p>
          {error && <div className="error-alert">{error}</div>}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label className="field-label">Email</label>
              <input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" className="input-field" />
            </div>
            <div>
              <label className="field-label">Password</label>
              <input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Enter your password" className="input-field" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary" style={{ width: "100%", marginTop: 4, padding: "12px 24px" }}>
              {loading ? (<><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />Signing in...</>) : "Sign In"}
            </button>
          </form>
        </div>
        <p style={{ fontSize: 14, textAlign: "center", marginTop: 20, color: "var(--text-secondary)" }}>
          Don&apos;t have an account?{" "}
          <Link href="/signup" style={{ color: "var(--blue)", fontWeight: 500 }}>Create one</Link>
        </p>
      </div>
    </div>
  );
}
