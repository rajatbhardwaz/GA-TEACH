"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

const APP_DOWNLOAD_URL = "/downloads/glorious-amplification.apk";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => { if (!loading && user) router.push("/dashboard"); }, [user, loading, router]);

  if (loading || user) {
    return (<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-base)" }}><div className="spinner" /></div>);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* V2 Global Background Mesh */}
      <div className="bg-mesh" />

      {/* Massive Glow Orb */}
      <div style={{
        position: "absolute", top: "-20%", left: "50%", transform: "translateX(-50%)",
        width: "800px", height: "800px", background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0
      }} />

      {/* Top Nav */}
      <nav style={{ padding: "24px 48px", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src="/logo.png" alt="Glorious Amplification" style={{ width: 32, height: 32, objectFit: "contain" }} />
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>Glorious Amplification</span>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <Link href="/login" style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>Sign In</Link>
          <Link href="/signup"><button className="btn-primary" style={{ padding: "8px 16px", fontSize: 13 }}>Get Started</button></Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "80px 24px", zIndex: 10 }}>
        
        {/* Animated Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-light)", borderRadius: 99, marginBottom: 40, backdropFilter: "blur(12px)" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", boxShadow: "0 0 12px var(--green)" }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>Glorious V2 Platform Live</span>
        </div>

        <h1 style={{ fontSize: "clamp(48px, 8vw, 84px)", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.05, maxWidth: 1000, marginBottom: 24 }}>
          <span className="text-gradient">Redefining the</span><br />
          <span className="text-gradient-blue">Learning Experience.</span>
        </h1>

        <p style={{ fontSize: "clamp(18px, 2vw, 22px)", color: "var(--text-secondary)", maxWidth: 680, lineHeight: 1.5, marginBottom: 48, fontWeight: 400 }}>
          Live HD coaching, interactive doubt solving, and intelligent tracking — designed with obsessive attention to detail for the modern student.
        </p>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
          <Link href="/signup"><button className="btn-primary" style={{ padding: "16px 32px", fontSize: 16 }}>Start Learning Now</button></Link>
          <a href={APP_DOWNLOAD_URL} download>
            <button className="btn-secondary" style={{ padding: "16px 32px", fontSize: 16, gap: 10 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>
              Download App
            </button>
          </a>
        </div>

        {/* Feature Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24, maxWidth: 1100, width: "100%", marginTop: 100 }}>
          {[
            { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="1.8"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>, title: "Live HD Broadcasting", desc: "Crystal clear video sessions with ultra-low latency and real-time interaction." },
            { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.8"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17,11 19,13 23,9"/></svg>, title: "Smart Attendance", desc: "Automated, frictionless attendance tracking for every lecture." },
            { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16"/></svg>, title: "Cinematic Recordings", desc: "Missed a session? Replay it anytime with premium video playback." },
          ].map(f => (
            <div key={f.title} className="glass-card" style={{ padding: "32px 24px", textAlign: "left", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>{f.title}</h3>
              <p style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer style={{ padding: "32px", textAlign: "center", borderTop: "1px solid var(--border)", background: "rgba(0,0,0,0.2)", backdropFilter: "blur(12px)", zIndex: 10 }}>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>© {new Date().getFullYear()} Glorious Amplification. All rights reserved.</p>
      </footer>
    </div>
  );
}
