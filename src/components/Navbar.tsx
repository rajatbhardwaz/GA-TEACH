"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const { user, userData, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <nav className="navbar">
      <div className="accent-gradient" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo / Brand */}
          <Link href="/dashboard" className="flex items-center gap-3 no-underline">
            {/* Google Meet-style camera icon */}
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "var(--radius-md)",
                background: "linear-gradient(135deg, #1a73e8, #4285f4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(26, 115, 232, 0.35)",
              }}
            >
              <svg
                width="20"
                height="20"
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
                fontSize: 20,
                fontWeight: 600,
                color: "var(--color-text-primary)",
                letterSpacing: "-0.02em",
              }}
            >
              Classroom
            </span>
          </Link>

          {/* Right side */}
          {user && userData && (
            <div className="flex items-center gap-3">
              {/* Role badge */}
              <span className={`badge ${userData.role === "teacher" ? "badge-teacher" : "badge-student"}`}>
                {userData.role}
              </span>

              {/* User avatar + name */}
              <div className="flex items-center gap-2">
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "var(--radius-full)",
                    background: "linear-gradient(135deg, #8ab4f8, #1a73e8)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#fff",
                  }}
                >
                  {userData.name.charAt(0).toUpperCase()}
                </div>
                <span
                  className="hidden sm:inline"
                  style={{ fontSize: 14, color: "var(--color-text-secondary)" }}
                >
                  {userData.name}
                </span>
              </div>

              {/* Logout */}
              <button onClick={handleLogout} className="btn-secondary" style={{ padding: "8px 16px" }}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                  <polyline points="16,17 21,12 16,7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
