"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";

export default function Navbar() {
  const { user, userData, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => { setMobileMenuOpen(false); }, [pathname]);

  const handleLogout = async () => {
    setProfileOpen(false);
    setMobileMenuOpen(false);
    await logout();
    router.push("/login");
  };

  const { t } = useLanguage();

  const navItems = [
    { labelKey: "nav.dashboard", href: "/dashboard", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
    { labelKey: "nav.my_batches", href: "/dashboard", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg> },
    { labelKey: "nav.lecture_recordings", href: "/recordings", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16"/></svg> },
  ];

  return (
    <>
      <nav className="navbar">
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 16px" }}>
          <div className="flex justify-between items-center" style={{ height: 56 }}>
            <Link href="/dashboard" style={{ textDecoration: "none", flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <img src="/logo.png" alt="Glorious Amplification" style={{ width: 40, height: 40, objectFit: "contain" }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "0.02em" }}>Glorious Amplification</span>
            </Link>

            {user && userData && (
              <div className="desktop-nav" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {navItems.map((item) => (
                  <Link key={item.labelKey} href={item.href} className={`nav-link ${pathname === item.href ? "active" : ""}`}>
                    {item.icon}{t(item.labelKey)}
                  </Link>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              {user && userData ? (
                <>
                  <div className="profile-menu" ref={profileRef} style={{ display: "flex" }}>
                    <button onClick={() => setProfileOpen(!profileOpen)} className="hidden sm:flex" style={{ alignItems: "center", gap: 8, padding: "5px 10px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", background: profileOpen ? "var(--bg-hover)" : "transparent", cursor: "pointer", transition: "all var(--transition-fast)" }}>
                      <div style={{ width: 28, height: 28, borderRadius: "var(--radius-full)", background: userData.role === "admin" ? "linear-gradient(135deg, #ef4444, #f97316)" : "linear-gradient(135deg, var(--blue), #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "#fff" }}>
                        {userData.name.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userData.name}</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><polyline points="6,9 12,15 18,9"/></svg>
                    </button>

                    {profileOpen && (
                      <div className="profile-dropdown">
                        <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
                          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{userData.name}</p>
                          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{userData.email}</p>
                          <span className={`badge ${userData.role === "admin" ? "badge-teacher" : userData.role === "teacher" ? "badge-teacher" : "badge-student"}`} style={{ marginTop: 8 }}>
                            {userData.role === "admin" ? t("role.admin") : userData.role === "teacher" ? t("role.faculty") : t("role.student")}
                          </span>
                        </div>
                        <div style={{ padding: "4px 0" }}>
                          <button className="profile-dropdown-item" onClick={() => { setProfileOpen(false); router.push("/dashboard"); }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                            {t("nav.dashboard")}
                          </button>
                          <div className="divider" />
                          <button className="profile-dropdown-item danger" onClick={handleLogout}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                            {t("nav.logout")}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <button className="hamburger-btn" onClick={() => setMobileMenuOpen(true)} aria-label="Menu">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/login"><button className="btn-secondary" style={{ padding: "7px 14px", fontSize: 13 }}>{t("nav.sign_in")}</button></Link>
                  <Link href="/signup" className="hidden sm:inline"><button className="btn-primary" style={{ padding: "7px 14px", fontSize: 13 }}>{t("nav.start_learning")}</button></Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {mobileMenuOpen && (
        <>
          <div className="mobile-nav-overlay" onClick={() => setMobileMenuOpen(false)} />
          <div className="mobile-nav-drawer">
            <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.02em", color: "var(--text-primary)" }}>{t("nav.menu")}</span>
              <button className="btn-icon" onClick={() => setMobileMenuOpen(false)} style={{ width: 36, height: 36 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            {userData && (
              <div style={{ padding: "16px 14px", background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", marginBottom: 16 }}>
                <div className="flex items-center gap-3">
                  <div style={{ width: 40, height: 40, borderRadius: "var(--radius-full)", background: "linear-gradient(135deg, var(--blue), #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{userData.name.charAt(0).toUpperCase()}</div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userData.name}</p>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userData.email}</p>
                  </div>
                </div>
                <span className={`badge ${userData.role === "teacher" ? "badge-teacher" : "badge-student"}`} style={{ marginTop: 10 }}>
                  {userData.role === "teacher" ? t("role.faculty") : t("role.student")}
                </span>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {navItems.map((item) => (
                <Link key={item.labelKey} href={item.href} className={`mobile-nav-link ${pathname === item.href ? "active" : ""}`} onClick={() => setMobileMenuOpen(false)}>
                  {item.icon}{t(item.labelKey)}
                </Link>
              ))}
            </div>
            <div className="divider" style={{ margin: "12px 0" }} />
            <button className="mobile-nav-link" onClick={handleLogout} style={{ color: "var(--red)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              {t("nav.logout")}
            </button>
          </div>
        </>
      )}
    </>
  );
}
