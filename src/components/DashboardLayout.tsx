"use client";

import { ReactNode, useState, useEffect } from "react";
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
  const { theme, isDark } = useTheme();
  
  // Motivational Quotes Pool
  const MOTIVATIONAL_QUOTES = [
    "🌟 Believe you can and you're halfway there. Keep pushing!",
    "🎯 Consistency beats talent. Stay consistent with your lectures!",
    "📚 Every mistake is progress in disguise. Keep learning!",
    "💪 Discipline is the bridge between goals and accomplishment.",
    "🚀 Your limitations are only in your imagination. Reach for the stars!",
    "🌱 Growth begins at the end of your comfort zone. Keep evolving.",
    "🧘 Mindset is everything. Positive thoughts yield positive results.",
    "💫 You are capable of amazing things. Believe in your potential.",
    "🏆 Hard work beats talent when talent doesn't work hard.",
    "🌞 Each day is a new opportunity to improve. Make today count!",
    "🔑 Success is the sum of small efforts, repeated day in and day out.",
    "🌈 Difficult roads often lead to beautiful destinations. Stay strong!",
    "💭 Dream big, work hard, and make it happen.",
    "🛡️ Your passion is your greatest asset. Let it guide you to success.",
    "⏳ Don't wait for opportunity. Create it.",
    "🌠 The future belongs to those who believe in the beauty of their dreams.",
    "💡 The only limit to our realization of tomorrow will be our doubts of today.",
    "🎨 Every morning we are born again. What we do today is what matters most.",
    "🏔️ Climb the mountain not to show the world, but so you can see the world.",
    "🌻 Believe in yourself, take on your challenges, and conquer your fears."
  ];

  const getRelativeTime = (timestamp: number): string => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return "Just now";
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
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
              <input type="text" placeholder="Search batches, lectures..." />
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
                  position: "absolute", top: 38, right: 0, width: 320,
                  background: "var(--bg-card)", border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)", boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                  zIndex: 100, overflow: "hidden"
                }}>
                  {/* Dropdown Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Alert Center 🔔</span>
                    {notifications.some(n => !n.read) && (
                      <button
                        onClick={() => {
                          const updated = notifications.map(n => ({ ...n, read: true }));
                          setNotifications(updated);
                          localStorage.setItem("ga-motivational-notifications", JSON.stringify(updated));
                        }}
                        style={{ border: "none", background: "none", color: "var(--blue)", fontSize: 11, cursor: "pointer", fontWeight: 500 }}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* Dropdown List */}
                  <div style={{ maxHeight: 280, overflowY: "auto", display: "flex", flexDirection: "column" }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                        No notifications. Stay tuned!
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
                            {n.text}
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
                      Close Notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

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
