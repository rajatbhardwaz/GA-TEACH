"use client";

import { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import Sidebar from "@/components/Sidebar";

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  wide?: boolean;
}

export default function DashboardLayout({ children, title, wide }: DashboardLayoutProps) {
  const { userData } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-title-area" style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {title && (
              <h1 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
                {title}
              </h1>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Search */}
            <div className="topbar-search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Search batches, lectures..." />
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="theme-toggle-btn"
              aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
              title={`Switch to ${isDark ? "light" : "dark"} mode`}
            >
              <div className={`theme-toggle-track ${theme}`}>
                <div className="theme-toggle-thumb">
                  {isDark ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="5"/>
                      <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                    </svg>
                  )}
                </div>
              </div>
            </button>

            {/* Notification bell */}
            <button className="btn-icon" style={{ border: "none" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
            </button>

            {/* User pill */}
            {userData && (
              <div className="topbar-user-pill" style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 10px 4px 4px", borderRadius: "var(--radius-full)", background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                <div className="user-avatar" style={{
                  width: 28, height: 28, borderRadius: "var(--radius-full)",
                  background: userData.role === "admin"
                    ? "linear-gradient(135deg, #ef4444, #f97316)"
                    : "linear-gradient(135deg, var(--blue), #7c3aed)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff",
                }}>
                  {userData.name.charAt(0).toUpperCase()}
                </div>
                <span className="user-name" style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text-primary)", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {userData.name.split(" ")[0]}
                </span>
                <span className={`badge user-badge ${userData.role === "admin" ? "badge-teacher" : userData.role === "teacher" ? "badge-teacher" : "badge-student"}`} style={{ fontSize: 9, padding: "2px 6px" }}>
                  {userData.role === "admin" ? "Admin" : userData.role === "teacher" ? "Faculty" : "Student"}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        <main className={wide ? "page-content-wide" : "page-content"}>
          {children}
        </main>
      </div>
    </div>
  );
}
