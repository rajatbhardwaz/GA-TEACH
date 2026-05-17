"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const mainNav = [
  {
    label: "Dashboard", href: "/dashboard",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  },
  {
    label: "My Batches", href: "/dashboard",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>,
  },
  {
    label: "Lecture Recordings", href: "/recordings",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16"/></svg>,
  },
];

const secondaryNav = [
  {
    label: "Notifications", href: "#",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
  },
  {
    label: "Settings", href: "#",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { userData, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <>
      {/* Logo area */}
      <div className="sidebar-logo">
        <img src="/logo.png" alt="Glorious Amplification" style={{ width: 40, height: 40, objectFit: "contain" }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "0.02em" }}>Glorious Amplification</span>
      </div>

      {/* Main nav */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Learning</div>
        {mainNav.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`sidebar-item ${isActive(item.href) ? "active" : ""}`}
            onClick={() => setMobileOpen(false)}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}

        <div className="sidebar-section-label" style={{ marginTop: 8 }}>General</div>
        {secondaryNav.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`sidebar-item ${isActive(item.href) ? "active" : ""}`}
            onClick={() => setMobileOpen(false)}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Footer / user */}
      {userData && (
        <div className="sidebar-footer">
          <button className="sidebar-item danger" onClick={handleLogout}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Log out
          </button>
          <div className="sidebar-user" style={{ marginTop: 4 }}>
            <div style={{ width: 32, height: 32, borderRadius: "var(--radius-full)", background: "linear-gradient(135deg, var(--blue), #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
              {userData.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userData.name}</p>
              <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "capitalize" }}>{userData.role === "teacher" ? "Faculty" : "Student"}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        {sidebarContent}
      </aside>
      {mobileOpen && (
        <div className="sidebar-overlay show" onClick={() => setMobileOpen(false)} />
      )}
      <button
        className="hamburger-btn"
        onClick={() => setMobileOpen(true)}
        aria-label="Menu"
        style={{ position: "fixed", top: 8, left: 12, zIndex: 38 }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>
    </>
  );
}
