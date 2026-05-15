"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";

export default function Navbar() {
  const { user, userData, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
    router.push("/login");
  };

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    )},
    { label: "Batches", href: "/dashboard", icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    )},
    { label: "Recordings", href: "/dashboard", icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polygon points="10,8 16,12 10,16" />
      </svg>
    )},
  ];

  return (
    <nav className="navbar">
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
        <div className="flex justify-between items-center" style={{ height: 56 }}>
          {/* Left: Brand */}
          <Link href="/dashboard" className="flex items-center gap-2 no-underline" style={{ textDecoration: "none" }}>
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--color-text-primary)",
                letterSpacing: "0.02em",
              }}
            >
              GLORIOUS AMPLIFICATION
            </span>
          </Link>

          {/* Center: Nav links */}
          {user && userData && (
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`nav-link ${pathname === item.href ? "active" : ""}`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </div>
          )}

          {/* Right: Profile */}
          {user && userData ? (
            <div className="profile-menu" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "6px 10px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)",
                  background: profileOpen ? "var(--color-surface-hover)" : "transparent",
                  cursor: "pointer",
                  transition: "all var(--transition-fast)",
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "var(--radius-full)",
                    background: "linear-gradient(135deg, #2563eb, #7c3aed)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#fff",
                  }}
                >
                  {userData.name.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline" style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>
                  {userData.name}
                </span>
                {/* Chevron */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2">
                  <polyline points="6,9 12,15 18,9" />
                </svg>
              </button>

              {/* Dropdown */}
              {profileOpen && (
                <div className="profile-dropdown">
                  <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--color-border)" }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>{userData.name}</p>
                    <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>{userData.email}</p>
                    <span
                      className={`badge ${userData.role === "teacher" ? "badge-teacher" : "badge-student"}`}
                      style={{ marginTop: 8 }}
                    >
                      {userData.role}
                    </span>
                  </div>
                  <div style={{ padding: "4px 0" }}>
                    <button className="profile-dropdown-item" onClick={() => { setProfileOpen(false); router.push("/dashboard"); }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                      </svg>
                      Dashboard
                    </button>
                    <div className="divider" />
                    <button className="profile-dropdown-item danger" onClick={handleLogout}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16,17 21,12 16,7" /><line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <button className="btn-secondary" style={{ padding: "8px 18px", fontSize: 13 }}>Sign In</button>
              </Link>
              <Link href="/signup">
                <button className="btn-primary" style={{ padding: "8px 18px", fontSize: 13 }}>Get Started</button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
