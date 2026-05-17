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
    <div className="landing-page" style={{ minHeight: "100vh", background: "var(--bg-base)", position: "relative", overflow: "hidden" }}>
      {/* Background gradient orbs */}
      <div className="landing-orb landing-orb-1" />
      <div className="landing-orb landing-orb-2" />

      {/* Top nav */}
      <nav className="landing-nav">
        <div className="landing-nav-logo">
          <img src="/logo.png" alt="Glorious Amplification" style={{ width: 36, height: 36, objectFit: "contain" }} />
          <span className="landing-nav-brand">Glorious Amplification</span>
        </div>
        <div className="landing-nav-actions">
          <Link href="/login"><button className="btn-secondary landing-nav-btn">Sign In</button></Link>
          <Link href="/signup"><button className="btn-primary landing-nav-btn">Start Learning</button></Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="landing-hero" style={{ opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(16px)", transition: "opacity 600ms ease-out, transform 600ms ease-out" }}>
        {/* Badge */}
        <div className="landing-badge">
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", animation: "pulse-dot 2s ease-in-out infinite" }} />
          Live Batches Running Now
        </div>

        <h1 className="landing-heading">
          Your journey to{" "}
          <span style={{ background: "linear-gradient(135deg, var(--blue), #22c55e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>success starts here</span>
        </h1>

        <p className="landing-subheading">
          Live coaching for Government Exams, Spoken English, Psychology & more.
          HD video lectures, real-time doubt solving, attendance tracking, and recorded sessions — all in one platform.
        </p>

        <div className="landing-cta-group">
          <Link href="/signup">
            <button className="btn-primary landing-cta-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
              Join as Student
            </button>
          </Link>
          <Link href="/signup">
            <button className="btn-secondary landing-cta-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Register as Faculty
            </button>
          </Link>
        </div>

        {/* Feature cards */}
        <div className="landing-features" style={{ opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(20px)", transition: "opacity 700ms ease-out 300ms, transform 700ms ease-out 300ms" }}>
          {[
            { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="1.8"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>, title: "Live Coaching", desc: "HD live classes with real-time doubt solving and faculty interaction" },
            { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.8"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17,11 19,13 23,9"/></svg>, title: "Smart Attendance", desc: "Auto-tracked attendance for every lecture and practice session" },
            { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16"/></svg>, title: "Lecture Recordings", desc: "Missed a class? Revise anytime with recorded lectures and sessions" },
          ].map((f) => (
            <div key={f.title} className="card landing-feature-card">
              <div className="landing-feature-icon">
                {f.icon}
              </div>
              <h3 className="landing-feature-title">{f.title}</h3>
              <p className="landing-feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Trust markers */}
        <div className="landing-trust">
          {[
            { value: "500+", label: "Students Enrolled" },
            { value: "50+", label: "Batches Completed" },
            { value: "10+", label: "Expert Faculty" },
          ].map(t => (
            <div key={t.label} style={{ textAlign: "center" }}>
              <p className="landing-trust-value">{t.value}</p>
              <p className="landing-trust-label">{t.label}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
          <span style={{ fontWeight: 600 }}>Glorious Amplification</span> — Coaching & Mentorship Platform · © {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
