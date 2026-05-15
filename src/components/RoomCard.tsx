"use client";

import Link from "next/link";
import { formatDate } from "@/utils/helpers";

interface Room {
  id: string;
  roomName: string;
  subject: string;
  teacherName: string;
  roomCode: string;
  createdAt: string;
  isActive: boolean;
}

interface RoomCardProps {
  room: Room;
  role: "teacher" | "student";
}

export default function RoomCard({ room, role }: RoomCardProps) {
  return (
    <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
      {/* Colored top bar */}
      <div
        style={{
          height: 4,
          background: room.isActive
            ? "linear-gradient(90deg, #34a853, #4ade80)"
            : "linear-gradient(90deg, #1a73e8, #8ab4f8)",
        }}
      />

      <div style={{ padding: "20px 24px" }}>
        {/* Header */}
        <div className="flex justify-between items-start" style={{ marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <h3
              style={{
                fontSize: 17,
                fontWeight: 600,
                color: "var(--color-text-primary)",
                marginBottom: 4,
              }}
            >
              {room.roomName}
            </h3>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{room.subject}</p>
          </div>
          {room.isActive && <span className="badge badge-live">Live</span>}
        </div>

        {/* Info */}
        <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="flex items-center gap-2">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-text-muted)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>{room.teacherName}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-text-muted)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
              {formatDate(room.createdAt)}
            </span>
          </div>
        </div>

        {/* Room code visible to teachers */}
        {role === "teacher" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              background: "rgba(26, 115, 232, 0.08)",
              borderRadius: "var(--radius-md)",
              marginBottom: 16,
              border: "1px solid rgba(26, 115, 232, 0.15)",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Code:</span>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 700,
                fontSize: 14,
                color: "var(--color-primary)",
                letterSpacing: "0.1em",
              }}
            >
              {room.roomCode}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
          <Link href={`/room/${room.id}`} className="no-underline">
            <button className={room.isActive ? "btn-primary" : "btn-secondary"} style={{ fontSize: 13 }}>
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
                {room.isActive ? (
                  <>
                    <path d="M23 7l-7 5 7 5V7z" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </>
                ) : (
                  <>
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                    <polyline points="15,3 21,3 21,9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </>
                )}
              </svg>
              {room.isActive ? "Join Meeting" : "Open Room"}
            </button>
          </Link>
          {role === "teacher" && (
            <Link href={`/room/${room.id}/attendance`} className="no-underline">
              <button className="btn-secondary" style={{ fontSize: 13 }}>
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
                  <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <polyline points="17,11 19,13 23,9" />
                </svg>
                Attendance
              </button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
