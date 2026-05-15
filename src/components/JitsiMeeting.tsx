"use client";

import { useEffect, useRef, useState } from "react";
import { doc, updateDoc, addDoc, collection } from "firebase/firestore";
import { db } from "@/firebase/config";
import { useAuth } from "@/context/AuthContext";

interface JitsiMeetingProps {
  roomId: string;
  roomName: string;
  isTeacher: boolean;
  meetingSession: string;
}

// Declare Jitsi types for TypeScript
declare global {
  interface Window {
    JitsiMeetExternalAPI: new (domain: string, options: Record<string, unknown>) => JitsiAPI;
  }
}

interface JitsiAPI {
  dispose: () => void;
  executeCommand: (command: string, ...args: unknown[]) => void;
  addEventListener: (event: string, handler: (...args: unknown[]) => void) => void;
  getNumberOfParticipants: () => number;
}

export default function JitsiMeeting({ roomId, roomName, isTeacher, meetingSession }: JitsiMeetingProps) {
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiAPI | null>(null);
  const { userData } = useAuth();
  const [isLoaded, setIsLoaded] = useState(false);
  const joinTimeRef = useRef<string>("");

  useEffect(() => {
    if (!userData) return;

    const domain = process.env.NEXT_PUBLIC_JITSI_DOMAIN || "meet.jit.si";
    const scriptSrc = `https://${domain}/external_api.js`;

    // Check if script is already loaded
    if (window.JitsiMeetExternalAPI) {
      initJitsi();
      return;
    }

    // Load the Jitsi Meet External API script
    const script = document.createElement("script");
    script.src = scriptSrc;
    script.async = true;
    script.onload = () => initJitsi();
    document.head.appendChild(script);

    return () => {
      // Cleanup: dispose API and record leave time
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
      recordLeaveTime();
      // Only remove script if it's still in the DOM
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData]);

  const initJitsi = () => {
    if (!jitsiContainerRef.current || !userData) return;

    // If already initialized, don't re-initialize
    if (apiRef.current) return;

    const domain = process.env.NEXT_PUBLIC_JITSI_DOMAIN || "meet.jit.si";

    // Configure Jitsi meeting options
    // Key: the public meet.jit.si server enforces moderator auth server-side.
    // To avoid the "waiting for moderator" screen, we:
    //   1. Use a unique room name per session so the first joiner is auto-moderator
    //   2. Disable all lobby/pre-join/auth UI
    //   3. Set all participants as guests who join immediately
    // Use meetingSession in room name so each session is a fresh Jitsi room
    // The first person to join a fresh room auto-becomes moderator (no login!)
    const jitsiRoomName = meetingSession
      ? `classroom_${roomId}_${meetingSession}`
      : `classroom_${roomId}`;

    const options: Record<string, unknown> = {
      roomName: jitsiRoomName,
      parentNode: jitsiContainerRef.current,
      width: "100%",
      height: "100%",
      userInfo: {
        displayName: userData.name,
        email: userData.email,
      },
      configOverwrite: {
        // --- Skip ALL login / pre-join / lobby screens ---
        prejoinPageEnabled: false,
        prejoinConfig: { enabled: false },
        lobbyModeEnabled: false,
        enableLobbyChat: false,
        hideLobbyButton: true,
        requireDisplayName: false,
        enableInsecureRoomNameWarning: false,
        enableWelcomePage: false,
        enableClosePage: false,

        // --- Disable ALL authentication-related features ---
        enableAutomaticUrlCopy: false,
        hideLoginButton: true,
        tokenAuthUrl: null,
        authenticationUrl: null,
        enableFeaturesBasedOnToken: false,
        
        // --- Guests should be allowed without waiting ---
        enableUserRolesBasedOnToken: false,
        
        // --- Audio/video defaults ---
        startWithAudioMuted: !isTeacher,
        startWithVideoMuted: false,
        
        // --- Disable moderation features that trigger login ---
        disableModeratorIndicator: !isTeacher,
        disableRemoteMute: !isTeacher,
        remoteVideoMenu: { disableKick: !isTeacher, disableGrantModerator: !isTeacher },
        disableReactions: false,
        
        // --- Disable notifications that clutter the UI ---
        notifications: [],
        disableJoinLeaveSounds: false,
        
        // --- Security: disable lobby ---
        security: { lobbyModeEnabled: false },
        
        // --- Recording ---
        disableRecordAudioNotification: true,
        
        // --- Make it feel smooth ---
        disableDeepLinking: true,
        disableThirdPartyRequests: true,
        disableInviteFunctions: true,
        doNotStoreRoom: true,
        enableNoisyMicDetection: false,
        
        // --- P2P for better performance in small rooms ---
        p2p: { enabled: true },
        
        // --- Subject (room title shown in Jitsi UI) ---
        subject: roomName,
      },
      interfaceConfigOverwrite: {
        TOOLBAR_BUTTONS: [
          "microphone",
          "camera",
          "desktop",
          "chat",
          "raisehand",
          "tileview",
          "fullscreen",
          "hangup",
          ...(isTeacher ? ["mute-everyone", "security"] : []),
        ],
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        SHOW_BRAND_WATERMARK: false,
        SHOW_POWERED_BY: false,
        DEFAULT_BACKGROUND: "#1a1a2e",
        DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
        FILM_STRIP_MAX_HEIGHT: 120,
        MOBILE_APP_PROMO: false,
        HIDE_INVITE_MORE_HEADER: true,
        DISABLE_RINGING: true,
        DISABLE_FOCUS_INDICATOR: true,
        DISABLE_DOMINANT_SPEAKER_INDICATOR: false,
        GENERATE_ROOMNAMES_ON_WELCOME_PAGE: false,
        AUTHENTICATION_ENABLE: false,
        TOOLBAR_ALWAYS_VISIBLE: true,
        SETTINGS_SECTIONS: ["devices", "language"],
      },
    };

    const api = new window.JitsiMeetExternalAPI(domain, options);
    apiRef.current = api;

    // Record join time for attendance
    joinTimeRef.current = new Date().toISOString();
    recordJoinTime();

    // Mark room as active when teacher starts
    if (isTeacher) {
      updateDoc(doc(db, "rooms", roomId), { isActive: true }).catch(console.error);
    }

    // Auto-dismiss any password/lobby dialogs that might appear
    api.addEventListener("passwordRequired", () => {
      api.executeCommand("password", "");
    });

    // Listen for conference joined to confirm successful connection
    api.addEventListener("videoConferenceJoined", () => {
      setIsLoaded(true);
      // If teacher, disable lobby once in the room
      if (isTeacher) {
        try {
          api.executeCommand("toggleLobby", false);
        } catch {
          // toggleLobby may not be available on all Jitsi versions
        }
      }
    });

    // Listen for conference left event
    api.addEventListener("readyToClose", () => {
      recordLeaveTime();
      if (isTeacher) {
        updateDoc(doc(db, "rooms", roomId), { isActive: false }).catch(console.error);
      }
      window.location.href = "/dashboard";
    });

    // Fallback: mark as loaded after a short delay
    setTimeout(() => setIsLoaded(true), 3000);
  };

  // Record when a participant joins
  const recordJoinTime = async () => {
    if (!userData) return;
    try {
      await addDoc(collection(db, "attendance"), {
        roomId,
        userId: userData.uid,
        userName: userData.name,
        userRole: userData.role,
        joinTime: new Date().toISOString(),
        leaveTime: null,
        duration: null,
      });
    } catch (err) {
      console.error("Failed to record join time:", err);
    }
  };

  // Record when a participant leaves
  const recordLeaveTime = async () => {
    if (!userData || !joinTimeRef.current) return;
    try {
      const leaveTime = new Date().toISOString();
      const joinMs = new Date(joinTimeRef.current).getTime();
      const leaveMs = new Date(leaveTime).getTime();
      const durationMin = Math.round((leaveMs - joinMs) / 60000);

      await addDoc(collection(db, "attendance"), {
        roomId,
        userId: userData.uid,
        userName: userData.name,
        userRole: userData.role,
        joinTime: joinTimeRef.current,
        leaveTime,
        duration: durationMin,
      });
    } catch (err) {
      console.error("Failed to record leave time:", err);
    }
  };

  // Teacher controls
  const muteAll = () => {
    apiRef.current?.executeCommand("muteEveryone");
  };

  const endMeeting = () => {
    apiRef.current?.executeCommand("hangup");
  };

  return (
    <div className="flex flex-col" style={{ height: "100%", background: "#000" }}>
      {/* Teacher controls toolbar - Google Meet style */}
      {isTeacher && isLoaded && (
        <div
          style={{
            display: "flex",
            gap: 12,
            padding: "12px 20px",
            background: "var(--color-surface-elevated)",
            borderBottom: "1px solid var(--color-border)",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div className="flex items-center gap-2">
            <span className="badge badge-live">Live</span>
            <span style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>{roomName}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={muteAll} className="btn-secondary" style={{ padding: "8px 16px", fontSize: 13 }}>
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
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" />
                <path d="M17 16.95A7 7 0 015 12" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
              Mute All
            </button>
            <button onClick={endMeeting} className="btn-danger" style={{ padding: "8px 16px", fontSize: 13 }}>
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
                <path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7 2 2 0 011.72 2v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91" />
                <line x1="23" y1="1" x2="1" y2="23" />
              </svg>
              End Meeting
            </button>
          </div>
        </div>
      )}

      {/* Jitsi container */}
      <div
        ref={jitsiContainerRef}
        style={{
          flex: 1,
          minHeight: 0,
          borderRadius: isTeacher && isLoaded ? "0 0 var(--radius-lg) var(--radius-lg)" : "var(--radius-lg)",
        }}
      />

      {!isLoaded && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--color-surface)",
            gap: 16,
          }}
        >
          <div className="spinner" style={{ width: 48, height: 48 }} />
          <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>Connecting to meeting...</p>
        </div>
      )}
    </div>
  );
}
