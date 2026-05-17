"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (!loading && user) router.push("/dashboard"); }, [user, loading, router]);

  if (loading || user) {
    return (<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-base)" }}><div className="spinner" /></div>);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", position: "relative", overflow: "hidden" }}>
      {/* Background gradient orbs */}
      <div style={{ position: "absolute", width: 800, height: 800, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 60%)", top: -300, right: -200, pointerEvents: "none" }} />
      <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(34,197,94,0.05) 0%, transparent 60%)", bottom: -200, left: -100, pointerEvents: "none" }} />

      {/* Top nav */}
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 32px", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/logo.png" alt="Glorious Amplification" style={{ width: 44, height: 44, objectFit: "contain" }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "0.02em" }}>Glorious Amplification</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/login"><button className="btn-secondary" style={{ padding: "8px 18px", fontSize: 13 }}>Sign In</button></Link>
          <Link href="/signup"><button className="btn-primary" style={{ padding: "8px 18px", fontSize: 13 }}>Start Learning</button></Link>
        </div>
      </nav>

      {/* Hero */}
      <main style={{ maxWidth: 800, margin: "0 auto", padding: "80px 24px 60px", textAlign: "center", position: "relative", zIndex: 1, opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(16px)", transition: "opacity 600ms ease-out, transform 600ms ease-out" }}>
        {/* Badge */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: "var(--radius-full)", background: "var(--green-light)", border: "1px solid rgba(34,197,94,0.15)", marginBottom: 28, fontSize: 12, fontWeight: 600, color: "var(--green)" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", animation: "pulse-dot 2s ease-in-out infinite" }} />
          Live Batches Running Now
        </div>

        <h1 style={{ fontSize: "clamp(34px, 5vw, 52px)", fontWeight: 700, lineHeight: 1.15, color: "var(--text-primary)", marginBottom: 20, letterSpacing: "-0.03em" }}>
          Your journey to{" "}
          <span style={{ background: "linear-gradient(135deg, var(--blue), #22c55e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>success starts here</span>
        </h1>

        <p style={{ fontSize: "clamp(15px, 2vw, 17px)", color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 40, maxWidth: 580, margin: "0 auto 40px" }}>
          Live coaching for Government Exams, Spoken English, Psychology & more.
          HD video lectures, real-time doubt solving, attendance tracking, and recorded sessions — all in one platform.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/signup">
            <button className="btn-primary" style={{ padding: "14px 36px", fontSize: 15, fontWeight: 600, borderRadius: "var(--radius-lg)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
              Join as Student
            </button>
          </Link>
          <Link href="/signup">
            <button className="btn-secondary" style={{ padding: "14px 36px", fontSize: 15 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Register as Faculty
            </button>
          </Link>
        </div>

        {/* Feature cards */}
        <div className="feature-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 80, opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(20px)", transition: "opacity 700ms ease-out 300ms, transform 700ms ease-out 300ms" }}>
          {[
            { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="1.8"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>, title: "Live Coaching", desc: "HD live classes with real-time doubt solving and faculty interaction" },
            { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.8"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17,11 19,13 23,9"/></svg>, title: "Smart Attendance", desc: "Auto-tracked attendance for every lecture and practice session" },
            { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16"/></svg>, title: "Lecture Recordings", desc: "Missed a class? Revise anytime with recorded lectures and sessions" },
          ].map((f) => (
            <div key={f.title} className="card" style={{ padding: "28px 24px", textAlign: "left" }}>
              <div style={{ width: 48, height: 48, borderRadius: "var(--radius-md)", background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>{f.title}</h3>
              <p style={{ fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Trust markers */}
        <div className="trust-markers" style={{ marginTop: 56, display: "flex", justifyContent: "center", gap: 32, flexWrap: "wrap" }}>
          {[
            { value: "500+", label: "Students Enrolled" },
            { value: "50+", label: "Batches Completed" },
            { value: "10+", label: "Expert Faculty" },
          ].map(t => (
            <div key={t.label} style={{ textAlign: "center" }}>
              <p style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>{t.value}</p>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{t.label}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer style={{ textAlign: "center", padding: "28px 0", borderTop: "1px solid var(--border)", position: "relative", zIndex: 1 }}>
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
          <span style={{ fontWeight: 600 }}>Glorious Amplification</span> — Coaching & Mentorship Platform · © {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
