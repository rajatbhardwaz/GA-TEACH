"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading || user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-surface)" }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-surface)" }}>
      <Navbar />

      <main
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "80px 24px 60px",
          textAlign: "center",
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 500ms ease-out, transform 500ms ease-out",
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 14px",
            borderRadius: "var(--radius-full)",
            background: "var(--color-primary-light)",
            border: "1px solid rgba(37, 99, 235, 0.1)",
            marginBottom: 24,
            fontSize: 12,
            fontWeight: 600,
            color: "var(--color-primary)",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
          Powered by Jitsi Meet
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: "clamp(32px, 5vw, 48px)",
            fontWeight: 700,
            lineHeight: 1.2,
            color: "var(--color-text-primary)",
            marginBottom: 16,
            letterSpacing: "-0.03em",
          }}
        >
          Online classrooms,{" "}
          <span style={{ color: "var(--color-primary)" }}>simplified</span>
        </h1>

        <p
          style={{
            fontSize: "clamp(15px, 2vw, 18px)",
            color: "var(--color-text-secondary)",
            lineHeight: 1.7,
            marginBottom: 36,
            maxWidth: 520,
            margin: "0 auto 36px",
          }}
        >
          Host video meetings, track attendance, and manage your batches — all in one clean platform.
        </p>

        {/* CTA */}
        <div className="flex gap-3 justify-center" style={{ flexWrap: "wrap" }}>
          <Link href="/signup">
            <button
              className="btn-primary"
              style={{
                padding: "14px 32px",
                fontSize: 15,
                fontWeight: 600,
                borderRadius: "var(--radius-lg)",
                boxShadow: "0 4px 16px rgba(37, 99, 235, 0.25)",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
              </svg>
              Get Started
            </button>
          </Link>
          <Link href="/login">
            <button className="btn-secondary" style={{ padding: "14px 32px", fontSize: 15 }}>
              Sign In
            </button>
          </Link>
        </div>

        {/* Feature cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
            marginTop: 64,
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 600ms ease-out 200ms, transform 600ms ease-out 200ms",
          }}
        >
          {[
            {
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
              ),
              title: "Video Meetings",
              desc: "HD video calls with screen sharing and chat",
            },
            {
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><polyline points="17,11 19,13 23,9" />
                </svg>
              ),
              title: "Attendance",
              desc: "Automatic tracking of who joins and when",
            },
            {
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><polygon points="10,8 16,12 10,16" />
                </svg>
              ),
              title: "Recordings",
              desc: "Share lecture links for students to revisit",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="card"
              style={{ padding: "24px 20px", textAlign: "left" }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: "var(--radius-md)",
                  background: "var(--color-surface-elevated)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 14,
                }}
              >
                {feature.icon}
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 4 }}>
                {feature.title}
              </h3>
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer style={{ textAlign: "center", padding: "24px 0", borderTop: "1px solid var(--color-border)" }}>
        <p style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
          Built with Next.js, Firebase & Jitsi Meet · <span style={{ fontWeight: 600 }}>GLORIOUS AMPLIFICATION</span> © {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
