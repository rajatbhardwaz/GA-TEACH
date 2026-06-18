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
      <nav className="px-4 sm:px-8 py-5 flex justify-between items-center z-10 w-full max-w-[1400px] mx-auto">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/logo.png" alt="Glorious Amplification" className="w-7 h-7 sm:w-8 sm:h-8 object-contain" />
          <span className="text-sm sm:text-base font-bold tracking-tight text-white whitespace-nowrap">Glorious Amplification</span>
        </div>
        <div className="flex gap-3 sm:gap-4 items-center">
          <Link href="/login" className="text-xs sm:text-sm font-semibold text-zinc-400 hover:text-white transition-colors">Sign In</Link>
          <Link href="/signup"><button className="btn-primary" style={{ padding: "6px 12px", fontSize: "12.5px" }}>Get Started</button></Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center py-12 sm:py-20 px-4 sm:px-6 z-10 max-w-[1200px] mx-auto">
        
        {/* Animated Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-light)", borderRadius: 99, marginBottom: 28, backdropFilter: "blur(12px)" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", boxShadow: "0 0 12px var(--green)" }} />
          <span className="text-xs sm:text-sm font-medium text-zinc-400">Glorious V2 Platform Live</span>
        </div>

        <h1 style={{ fontSize: "clamp(32px, 7vw, 72px)", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.1, maxWidth: 960, marginBottom: 20 }}>
          <span className="text-gradient">Redefining the</span><br />
          <span className="text-gradient-blue">Learning Experience.</span>
        </h1>

        <p style={{ fontSize: "clamp(15px, 1.8vw, 20px)", color: "var(--text-secondary)", maxWidth: 640, lineHeight: 1.5, marginBottom: 36, fontWeight: 400 }}>
          Live HD coaching, interactive doubt solving, and intelligent tracking — designed with obsessive attention to detail for the modern student.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center items-center">
          <Link href="/signup" className="w-full sm:w-auto"><button className="btn-primary w-full sm:w-auto" style={{ padding: "12px 24px", fontSize: "15px" }}>Start Learning Now</button></Link>
          <a href={APP_DOWNLOAD_URL} download className="w-full sm:w-auto">
            <button className="btn-secondary w-full sm:w-auto" style={{ padding: "12px 24px", fontSize: "15px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>
              Download App
            </button>
          </a>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-[1100px] mt-16 sm:mt-24">
          {[
            { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="1.8"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>, title: "Live HD Broadcasting", desc: "Crystal clear video sessions with ultra-low latency and real-time interaction." },
            { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.8"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17,11 19,13 23,9"/></svg>, title: "Smart Attendance", desc: "Automated, frictionless attendance tracking for every lecture." },
            { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16"/></svg>, title: "Cinematic Recordings", desc: "Missed a session? Replay it anytime with premium video playback." },
          ].map(f => (
            <div key={f.title} className="glass-card" style={{ padding: "24px", textAlign: "left", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>{f.title}</h3>
              <p style={{ fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="py-6 px-4 text-center border-top border-[var(--border)] bg-[rgba(0,0,0,0.2)] backdrop-blur-md z-10">
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>© {new Date().getFullYear()} Glorious Amplification. All rights reserved.</p>
      </footer>
    </div>
  );
}
