"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

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

  // If logged in, show loading while redirecting
  if (loading || user) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--color-surface)",
        }}
      >
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-surface)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Ambient background effects */}
      <div
        style={{
          position: "absolute",
          width: 800,
          height: 800,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(26,115,232,0.08) 0%, transparent 60%)",
          top: -300,
          right: -200,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(52,168,83,0.06) 0%, transparent 60%)",
          bottom: -200,
          left: -200,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(251,188,4,0.04) 0%, transparent 60%)",
          top: "40%",
          left: "50%",
          transform: "translateX(-50%)",
          pointerEvents: "none",
        }}
      />

      {/* Top nav */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 32px",
          position: "relative",
          zIndex: 10,
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "var(--radius-md)",
              background: "linear-gradient(135deg, #1a73e8, #4285f4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 16px rgba(26, 115, 232, 0.3)",
            }}
          >
            <svg
              width="22"
              height="22"
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
          <span
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: "var(--color-text-primary)",
              letterSpacing: "-0.02em",
            }}
          >
            Classroom
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login">
            <button className="btn-secondary" style={{ padding: "10px 20px" }}>
              Sign In
            </button>
          </Link>
          <Link href="/signup">
            <button className="btn-primary" style={{ padding: "10px 20px" }}>
              Get Started
            </button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "80px 32px 40px",
          position: "relative",
          zIndex: 1,
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 600ms ease-out, transform 600ms ease-out",
        }}
      >
        <div
          style={{
            textAlign: "center",
            maxWidth: 700,
            margin: "0 auto",
          }}
        >
          {/* Pill badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 16px",
              borderRadius: "var(--radius-full)",
              background: "rgba(26, 115, 232, 0.08)",
              border: "1px solid rgba(26, 115, 232, 0.15)",
              marginBottom: 28,
              fontSize: 13,
              fontWeight: 500,
              color: "var(--color-primary)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="13,2 3,14 12,14 11,22 21,10 12,10" />
            </svg>
            Powered by Jitsi Meet
          </div>

          <h1
            style={{
              fontSize: "clamp(36px, 5vw, 56px)",
              fontWeight: 700,
              lineHeight: 1.15,
              color: "var(--color-text-primary)",
              marginBottom: 20,
              letterSpacing: "-0.03em",
            }}
          >
            Online Classrooms,{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #1a73e8, #8ab4f8, #34a853)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Reimagined
            </span>
          </h1>

          <p
            style={{
              fontSize: "clamp(16px, 2vw, 20px)",
              color: "var(--color-text-secondary)",
              lineHeight: 1.6,
              marginBottom: 40,
              maxWidth: 560,
              margin: "0 auto 40px",
            }}
          >
            Host video meetings, track attendance, share recordings, and manage
            your classrooms — all in one seamless, Google Meet-inspired platform.
          </p>

          {/* CTA buttons */}
          <div className="flex gap-4 justify-center" style={{ flexWrap: "wrap" }}>
            <Link href="/signup">
              <button
                className="btn-primary"
                style={{
                  padding: "14px 32px",
                  fontSize: 16,
                  boxShadow: "0 4px 24px rgba(26, 115, 232, 0.4)",
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M23 7l-7 5 7 5V7z" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
                Start for Free
              </button>
            </Link>
            <Link href="/login">
              <button
                className="btn-secondary"
                style={{
                  padding: "14px 32px",
                  fontSize: 16,
                }}
              >
                Sign In
              </button>
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: 20,
            marginTop: 80,
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(30px)",
            transition: "opacity 800ms ease-out 200ms, transform 800ms ease-out 200ms",
          }}
        >
          {[
            {
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 7l-7 5 7 5V7z" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
              ),
              title: "HD Video Meetings",
              desc: "Crystal-clear video conferencing with screen sharing, chat, and real-time collaboration.",
              gradient: "linear-gradient(135deg, #1a73e8, #4285f4)",
            },
            {
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <polyline points="17,11 19,13 23,9" />
                </svg>
              ),
              title: "Auto Attendance",
              desc: "Automatically track who joins, their session duration, and generate attendance reports.",
              gradient: "linear-gradient(135deg, #34a853, #4ade80)",
            },
            {
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polygon points="10,8 16,12 10,16" />
                </svg>
              ),
              title: "Class Recordings",
              desc: "Share recording links so students can revisit lectures anytime, anywhere.",
              gradient: "linear-gradient(135deg, #ea4335, #ff6d60)",
            },
            {
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              ),
              title: "Room Codes",
              desc: "Secure 6-character codes for easy room access. Share with students in seconds.",
              gradient: "linear-gradient(135deg, #fbbc04, #f9ab00)",
            },
          ].map((feature, i) => (
            <div
              key={feature.title}
              className="glass-card"
              style={{
                padding: "28px 24px",
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(20px)",
                transition: `opacity 600ms ease-out ${300 + i * 100}ms, transform 600ms ease-out ${300 + i * 100}ms`,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "var(--radius-md)",
                  background: feature.gradient,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                  boxShadow: `0 4px 16px rgba(0,0,0,0.2)`,
                }}
              >
                {feature.icon}
              </div>
              <h3
                style={{
                  fontSize: 17,
                  fontWeight: 600,
                  color: "var(--color-text-primary)",
                  marginBottom: 8,
                }}
              >
                {feature.title}
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--color-text-secondary)",
                  lineHeight: 1.6,
                }}
              >
                {feature.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Role section */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 24,
            marginTop: 60,
            marginBottom: 40,
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(30px)",
            transition: "opacity 800ms ease-out 600ms, transform 800ms ease-out 600ms",
          }}
        >
          {/* Teacher card */}
          <div
            className="glass-card"
            style={{
              padding: "32px 28px",
              borderTop: "3px solid var(--color-primary)",
            }}
          >
            <div className="flex items-center gap-3" style={{ marginBottom: 20 }}>
              <span className="badge badge-teacher">Teacher</span>
            </div>
            <h3
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: "var(--color-text-primary)",
                marginBottom: 12,
              }}
            >
              For Educators
            </h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                "Create unlimited classrooms",
                "Start video meetings instantly",
                "Track student attendance",
                "Share class recordings",
                "Mute all & moderate sessions",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-3"
                  style={{ fontSize: 14, color: "var(--color-text-secondary)" }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--color-success)"
                    strokeWidth="2"
                    style={{ flexShrink: 0 }}
                  >
                    <polyline points="20,6 9,17 4,12" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Student card */}
          <div
            className="glass-card"
            style={{
              padding: "32px 28px",
              borderTop: "3px solid var(--color-warning)",
            }}
          >
            <div className="flex items-center gap-3" style={{ marginBottom: 20 }}>
              <span className="badge badge-student">Student</span>
            </div>
            <h3
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: "var(--color-text-primary)",
                marginBottom: 12,
              }}
            >
              For Students
            </h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                "Join rooms with a simple code",
                "Attend live video classes",
                "Auto attendance tracking",
                "Access class recordings",
                "Chat during meetings",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-3"
                  style={{ fontSize: 14, color: "var(--color-text-secondary)" }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--color-success)"
                    strokeWidth="2"
                    style={{ flexShrink: 0 }}
                  >
                    <polyline points="20,6 9,17 4,12" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <footer
          style={{
            textAlign: "center",
            padding: "32px 0",
            borderTop: "1px solid var(--color-border)",
            marginTop: 40,
          }}
        >
          <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
            Built with Next.js, Firebase & Jitsi Meet •{" "}
            <span style={{ color: "var(--color-text-secondary)" }}>Classroom</span> © {new Date().getFullYear()}
          </p>
        </footer>
      </main>
    </div>
  );
}
