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
      <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(168,85,247,0.06) 0%, transparent 60%)", bottom: -200, left: -100, pointerEvents: "none" }} />

      {/* Top nav */}
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 32px", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/logo.png" alt="GA TEACH" style={{ width: 34, height: 34, borderRadius: 10, objectFit: "cover" }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "0.04em" }}>GA TEACH</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/login"><button className="btn-secondary" style={{ padding: "8px 18px", fontSize: 13 }}>Sign In</button></Link>
          <Link href="/signup"><button className="btn-primary" style={{ padding: "8px 18px", fontSize: 13 }}>Get Started</button></Link>
        </div>
      </nav>

      {/* Hero */}
      <main style={{ maxWidth: 800, margin: "0 auto", padding: "100px 24px 80px", textAlign: "center", position: "relative", zIndex: 1, opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(16px)", transition: "opacity 600ms ease-out, transform 600ms ease-out" }}>
        {/* Badge */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: "var(--radius-full)", background: "var(--blue-light)", border: "1px solid rgba(59,130,246,0.15)", marginBottom: 28, fontSize: 12, fontWeight: 600, color: "var(--blue)" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
          Powered by Jitsi Meet
        </div>

        <h1 style={{ fontSize: "clamp(36px, 5vw, 56px)", fontWeight: 700, lineHeight: 1.15, color: "var(--text-primary)", marginBottom: 20, letterSpacing: "-0.03em" }}>
          Online classrooms,{" "}
          <span style={{ background: "linear-gradient(135deg, var(--blue), #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>simplified</span>
        </h1>

        <p style={{ fontSize: "clamp(15px, 2vw, 18px)", color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 40, maxWidth: 560, margin: "0 auto 40px" }}>
          Host video meetings, track attendance, and manage your classes — all in one clean, modern platform.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/signup">
            <button className="btn-primary" style={{ padding: "14px 36px", fontSize: 15, fontWeight: 600, borderRadius: "var(--radius-lg)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
              Get Started Free
            </button>
          </Link>
          <Link href="/login">
            <button className="btn-secondary" style={{ padding: "14px 36px", fontSize: 15 }}>Sign In</button>
          </Link>
        </div>

        {/* Feature cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 80, opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(20px)", transition: "opacity 700ms ease-out 300ms, transform 700ms ease-out 300ms" }}>
          {[
            { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="1.8"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>, title: "Video Meetings", desc: "HD video calls with screen sharing and real-time chat" },
            { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.8"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17,11 19,13 23,9"/></svg>, title: "Attendance", desc: "Automatic tracking of who joins and when they leave" },
            { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16"/></svg>, title: "Recordings", desc: "Upload and share lecture recordings for students to revisit" },
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
      </main>

      {/* Footer */}
      <footer style={{ textAlign: "center", padding: "28px 0", borderTop: "1px solid var(--border)", position: "relative", zIndex: 1 }}>
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
          Built with Next.js, Firebase & Jitsi Meet · <span style={{ fontWeight: 600 }}>GA TEACH</span> © {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
