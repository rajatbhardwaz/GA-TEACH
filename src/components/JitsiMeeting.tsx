"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { doc, updateDoc, addDoc, collection } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/firebase/config";
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

  // --- Screen Recording State ---
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!userData) return;

    const domain = "8x8.vc";
    const scriptSrc = `https://${domain}/external_api.js`;

    // Check if script is already loaded
    if (window.JitsiMeetExternalAPI) {
      startMeeting();
      return;
    }

    // Load the Jitsi Meet External API script
    const script = document.createElement("script");
    script.src = scriptSrc;
    script.async = true;
    script.onload = () => startMeeting();
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

  // Fetch a JWT from our server-side API, then init Jitsi with it
  const startMeeting = async () => {
    if (!jitsiContainerRef.current || !userData) return;
    if (apiRef.current) return;

    // Build the room name: on JaaS, room names are prefixed with the appId
    const appId = process.env.NEXT_PUBLIC_JAAS_APP_ID;
    const jitsiRoomSuffix = meetingSession
      ? `classroom_${roomId}_${meetingSession}`
      : `classroom_${roomId}`;

    // If JaaS is configured, fetch a JWT token from our API route
    let jwtToken: string | null = null;
    let jitsiRoomName = jitsiRoomSuffix;
    let domain = "8x8.vc";

    if (appId) {
      // JaaS mode: use JWT for authentication (no login prompt!)
      domain = "8x8.vc";
      jitsiRoomName = `${appId}/${jitsiRoomSuffix}`;

      try {
        const res = await fetch("/api/jaas-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomName: jitsiRoomSuffix,
            user: {
              id: userData.uid,
              name: userData.name,
              email: userData.email,
              isModerator: isTeacher,
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          jwtToken = data.token;
        } else {
          console.error("Failed to fetch JaaS token, falling back to anonymous mode");
        }
      } catch (err) {
        console.error("Error fetching JaaS token:", err);
      }
    }

    initJitsi(domain, jitsiRoomName, jwtToken);
  };

  const initJitsi = (domain: string, jitsiRoomName: string, jwtToken: string | null) => {
    if (!jitsiContainerRef.current || !userData) return;
    if (apiRef.current) return;

    const options: Record<string, unknown> = {
      roomName: jitsiRoomName,
      parentNode: jitsiContainerRef.current,
      width: "100%",
      height: "100%",
      // Pass JWT if available — this auto-authenticates the user, no login!
      ...(jwtToken ? { jwt: jwtToken } : {}),
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
        enableFeaturesBasedOnToken: !!jwtToken,

        // --- Guests join immediately without waiting for a moderator ---
        enableUserRolesBasedOnToken: !!jwtToken,
        moderatedRoomServiceUrl: null,

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

    // Auto-dismiss any password/lobby/auth dialogs that might appear
    api.addEventListener("passwordRequired", () => {
      api.executeCommand("password", "");
    });

    // Auto-dismiss any authentication prompts
    api.addEventListener("authenticationRequired", () => {
      // Silently ignore — JWT should prevent this, but just in case
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
    // Stop recording if active before ending meeting
    if (isRecording) {
      stopRecording();
    }
    apiRef.current?.executeCommand("hangup");
  };

  // --- Screen Recording ---
  const formatRecordingTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const startRecording = useCallback(async () => {
    try {
      // Request screen capture with audio
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser" } as MediaTrackConstraints,
        audio: true,
      });

      // Also try to capture microphone audio for teacher's voice
      let combinedStream = displayStream;
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new AudioContext();
        const destination = audioContext.createMediaStreamDestination();

        // Mix display audio + mic audio
        displayStream.getAudioTracks().forEach((track) => {
          audioContext.createMediaStreamSource(new MediaStream([track])).connect(destination);
        });
        micStream.getAudioTracks().forEach((track) => {
          audioContext.createMediaStreamSource(new MediaStream([track])).connect(destination);
        });

        // Combine video from display + mixed audio
        combinedStream = new MediaStream([
          ...displayStream.getVideoTracks(),
          ...destination.stream.getAudioTracks(),
        ]);

        // Cleanup mic stream when display stream ends
        displayStream.getVideoTracks()[0].addEventListener("ended", () => {
          micStream.getTracks().forEach((t) => t.stop());
          audioContext.close();
        });
      } catch {
        // Mic access denied — record screen audio only, that's fine
        console.log("Mic access denied, recording screen audio only");
      }

      streamRef.current = combinedStream;
      recordedChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
          ? "video/webm;codecs=vp9,opus"
          : "video/webm",
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        saveRecording();
      };

      // When user stops sharing via browser's native "Stop sharing" button
      combinedStream.getVideoTracks()[0].addEventListener("ended", () => {
        if (mediaRecorderRef.current?.state === "recording") {
          stopRecording();
        }
      });

      mediaRecorder.start(1000); // Collect data every second
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Failed to start recording:", err);
      // User cancelled the screen picker dialog
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }

    // Stop all tracks
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    // Clear timer
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    setIsRecording(false);
  }, []);

  const saveRecording = useCallback(async () => {
    if (recordedChunksRef.current.length === 0) return;

    const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `${roomName.replace(/\s+/g, "_")}_${timestamp}.webm`;
    const filePath = `recordings/${roomId}/${fileName}`;

    const recordingTitle = `Class Recording — ${new Date().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus("uploading");

    try {
      // Upload to Firebase Storage
      const storageRef = ref(storage, filePath);
      const uploadTask = uploadBytesResumable(storageRef, blob, {
        contentType: "video/webm",
      });

      // Track upload progress
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setUploadProgress(progress);
        },
        (error) => {
          console.error("Upload failed:", error);
          setUploadStatus("error");
          // Fallback: download locally if upload fails
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 10000);
          setTimeout(() => {
            setIsUploading(false);
            setUploadStatus("idle");
          }, 3000);
        },
        async () => {
          // Upload complete — get the download URL
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          // Save recording to Firestore with the download link
          await addDoc(collection(db, "recordings"), {
            roomId,
            title: recordingTitle,
            link: downloadURL,
            uploadedBy: userData?.name || "Teacher",
            uploadedById: userData?.uid || "",
            duration: formatRecordingTime(recordingTime),
            createdAt: new Date().toISOString(),
            isLocalRecording: false,
            storagePath: filePath,
          });

          setUploadStatus("done");
          setTimeout(() => {
            setIsUploading(false);
            setUploadStatus("idle");
          }, 3000);
        }
      );
    } catch (err) {
      console.error("Failed to save recording:", err);
      setUploadStatus("error");
      setTimeout(() => {
        setIsUploading(false);
        setUploadStatus("idle");
      }, 3000);
    }

    recordedChunksRef.current = [];
  }, [roomId, roomName, recordingTime, userData?.name, userData?.uid]);

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

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
            {isRecording && (
              <div
                className="flex items-center gap-2"
                style={{
                  padding: "4px 12px",
                  background: "rgba(234, 67, 53, 0.12)",
                  borderRadius: "var(--radius-full)",
                  border: "1px solid rgba(234, 67, 53, 0.3)",
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#ea4335",
                    animation: "pulse 1.5s ease-in-out infinite",
                  }}
                />
                <span style={{ fontSize: 12, fontWeight: 600, color: "#ea4335", fontFamily: "monospace" }}>
                  REC {formatRecordingTime(recordingTime)}
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
            {/* Record / Stop Recording button */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              style={{
                padding: "8px 16px",
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                gap: 8,
                borderRadius: "var(--radius-md)",
                border: isRecording ? "1px solid rgba(234, 67, 53, 0.4)" : "1px solid var(--color-border)",
                background: isRecording ? "rgba(234, 67, 53, 0.12)" : "var(--color-surface-elevated)",
                color: isRecording ? "#ea4335" : "var(--color-text-primary)",
                cursor: "pointer",
                fontWeight: 500,
                transition: "all 0.2s ease",
              }}
            >
              {isRecording ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#ea4335" stroke="none">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="4" fill="#ea4335" stroke="none" />
                </svg>
              )}
              {isRecording ? "Stop Recording" : "Record Class"}
            </button>

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

      {/* Upload progress overlay */}
      {isUploading && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 1000,
            background: "var(--color-surface-elevated)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
            padding: "20px 24px",
            minWidth: 320,
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          }}
        >
          <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
            {uploadStatus === "uploading" && (
              <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
            )}
            {uploadStatus === "done" && (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34a853" strokeWidth="2.5">
                <polyline points="20,6 9,17 4,12" />
              </svg>
            )}
            {uploadStatus === "error" && (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ea4335" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            )}
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>
                {uploadStatus === "uploading" && "Uploading recording..."}
                {uploadStatus === "done" && "Recording saved!"}
                {uploadStatus === "error" && "Upload failed — downloaded locally"}
              </p>
              <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>
                {uploadStatus === "uploading" && `${uploadProgress}% complete`}
                {uploadStatus === "done" && "Available in class recordings"}
                {uploadStatus === "error" && "Check your downloads folder"}
              </p>
            </div>
          </div>
          {uploadStatus === "uploading" && (
            <div
              style={{
                height: 4,
                background: "var(--color-border)",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${uploadProgress}%`,
                  background: "linear-gradient(90deg, #1a73e8, #4285f4)",
                  borderRadius: 2,
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
