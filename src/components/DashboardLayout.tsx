"use client";

import { ReactNode, useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import Sidebar from "@/components/Sidebar";
import { useLanguage } from "@/context/LanguageContext";

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  wide?: boolean;
}

export default function DashboardLayout({ children, title, wide }: DashboardLayoutProps) {
  const { userData } = useAuth();
  const { theme, isDark } = useTheme();
  
  const { t } = useLanguage();
  
  // Motivational Quotes Pool
  const MOTIVATIONAL_QUOTES = [
    "quote.1",
    "quote.2",
    "quote.3",
    "quote.4",
    "quote.5",
    "quote.6",
    "quote.7",
    "quote.8",
    "quote.9",
    "quote.10",
    "quote.11",
    "quote.12",
    "quote.13",
    "quote.14",
    "quote.15",
    "quote.16",
    "quote.17",
    "quote.18",
    "quote.19",
    "quote.20"
  ];

  const getRelativeTime = (timestamp: number): string => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return t("topbar.just_now");
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return t("topbar.mins_ago", { mins });
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t("topbar.hours_ago", { hours });
    const days = Math.floor(hours / 24);
    return t("topbar.days_ago", { days });
  };

  // Motivational Notifications State
  const [notifications, setNotifications] = useState<{ id: string; text: string; createdAt: number; read: boolean }[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("ga-motivational-notifications");
    let initialNotifs = [];

    if (saved) {
      try {
        initialNotifs = JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse notifications", e);
      }
    }

    if (initialNotifs.length === 0) {
      const shuffled = [...MOTIVATIONAL_QUOTES].sort(() => 0.5 - Math.random());
      const now = Date.now();
      initialNotifs = [
        { id: "1", text: shuffled[0], createdAt: now, read: false },
        { id: "2", text: shuffled[1], createdAt: now - 30 * 60 * 1000, read: false },
        { id: "3", text: shuffled[2], createdAt: now - 2 * 3600 * 1000, read: true },
        { id: "4", text: shuffled[3], createdAt: now - 5 * 3600 * 1000, read: true },
        { id: "5", text: shuffled[4], createdAt: now - 24 * 3600 * 1000, read: true },
      ];
      localStorage.setItem("ga-motivational-notifications", JSON.stringify(initialNotifs));
    }
    setNotifications(initialNotifs);

    // Setup interval to periodically add a new random motivational quote every 2 minutes
    const interval = setInterval(() => {
      setNotifications(prev => {
        const activeTexts = prev.map(n => n.text);
        const availableQuotes = MOTIVATIONAL_QUOTES.filter(q => !activeTexts.includes(q));
        const quotePool = availableQuotes.length > 0 ? availableQuotes : MOTIVATIONAL_QUOTES;
        const randomQuote = quotePool[Math.floor(Math.random() * quotePool.length)];

        const newNotif = {
          id: Math.random().toString(36).substring(2, 9),
          text: randomQuote,
          createdAt: Date.now(),
          read: false
        };

        const updated = [newNotif, ...prev].slice(0, 15);
        localStorage.setItem("ga-motivational-notifications", JSON.stringify(updated));
        return updated;
      });
    }, 120000);

    return () => clearInterval(interval);
  }, []);

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
              <input type="text" placeholder={t("topbar.search_placeholder")} />
            </div>

            {/* Notification bell */}
            <div style={{ position: "relative" }}>
              <button
                className="btn-icon"
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                style={{ border: "none", position: "relative", cursor: "pointer", background: "none" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
                </svg>
                {notifications.filter(n => !n.read).length > 0 && (
                  <span style={{
                    position: "absolute", top: 2, right: 2, width: 8, height: 8,
                    borderRadius: "50%", background: "var(--red)",
                    border: "2px solid var(--bg-card)"
                  }} />
                )}
              </button>

              {showNotifDropdown && (
                <div style={{
                  position: "absolute", top: 38, right: 0, width: 340,
                  background: "rgba(24, 24, 27, 0.88)",
                  backdropFilter: "blur(24px) saturate(1.4)",
                  WebkitBackdropFilter: "blur(24px) saturate(1.4)",
                  border: "1px solid var(--border-light)",
                  borderRadius: "var(--radius-lg)",
                  boxShadow: "0 16px 48px rgba(0,0,0,0.35), 0 0 0 1px var(--border)",
                  zIndex: 100, overflow: "hidden",
                  animation: "modal-in 180ms cubic-bezier(0.16, 1, 0.3, 1)",
                }}>
                  {/* Dropdown Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{t("topbar.alert_center")}</span>
                    {notifications.some(n => !n.read) && (
                      <button
                        onClick={() => {
                          const updated = notifications.map(n => ({ ...n, read: true }));
                          setNotifications(updated);
                          localStorage.setItem("ga-motivational-notifications", JSON.stringify(updated));
                        }}
                        style={{ border: "none", background: "none", color: "var(--blue)", fontSize: 11, cursor: "pointer", fontWeight: 500 }}
                      >
                        {t("topbar.mark_all_read")}
                      </button>
                    )}
                  </div>

                  {/* Dropdown List */}
                  <div style={{ maxHeight: 280, overflowY: "auto", display: "flex", flexDirection: "column" }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                        {t("topbar.no_notifications")}
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => {
                            const updated = notifications.map(item => item.id === n.id ? { ...item, read: true } : item);
                            setNotifications(updated);
                            localStorage.setItem("ga-motivational-notifications", JSON.stringify(updated));
                          }}
                          style={{
                            padding: "12px 16px", borderBottom: "1px solid var(--border)",
                            background: n.read ? "transparent" : "var(--blue-light)",
                            cursor: "pointer", transition: "background 0.2s ease"
                          }}
                        >
                          <p style={{ fontSize: 12.5, color: "var(--text-primary)", lineHeight: 1.5, marginBottom: 4, textAlign: "left" }}>
                            {t(n.text)}
                          </p>
                          <p style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "left", margin: 0 }}>{getRelativeTime(n.createdAt)}</p>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {/* Dropdown Footer */}
                  <div style={{ padding: 10, borderTop: "1px solid var(--border)", background: "var(--bg-elevated)", textAlign: "center" }}>
                    <button
                      className="btn-secondary"
                      onClick={() => setShowNotifDropdown(false)}
                      style={{ padding: "4px 12px", fontSize: 11, width: "100%" }}
                    >
                      {t("topbar.close_notifications")}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User pill */}
            {userData && (
              <div className="topbar-user-pill" style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "4px 12px 4px 4px", borderRadius: "var(--radius-full)",
                background: "var(--bg-elevated)", border: "1px solid var(--border)",
                transition: "all 200ms ease", cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.3)";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.boxShadow = "none";
              }}
              >
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
