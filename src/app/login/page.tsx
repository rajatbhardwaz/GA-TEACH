"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

type View = "main" | "phone" | "profile-setup";

export default function LoginPage() {
  const { login, signInWithGoogle, sendPhoneOTP, confirmPhoneOTP, completeProfile } = useAuth();
  const router = useRouter();

  // Shared
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<View>("main");

  // Email login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Phone login
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);

  // Profile setup (for new social/phone users)
  const [profileName, setProfileName] = useState("");
  const [profileRole, setProfileRole] = useState<"teacher" | "student">("student");
  const [profilePhone, setProfilePhone] = useState("");

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      if (firebaseError.code === "auth/user-not-found") setError("No account found with this email.");
      else if (firebaseError.code === "auth/wrong-password") setError("Incorrect password.");
      else if (firebaseError.code === "auth/invalid-credential") setError("Invalid email or password.");
      else setError("Failed to login. Please try again.");
    } finally { setLoading(false); }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result.isNewUser) {
        setProfileName(result.displayName || "");
        setView("profile-setup");
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      if (firebaseError.code === "auth/popup-closed-by-user") setError("Sign-in popup was closed.");
      else if (firebaseError.code === "auth/cancelled-popup-request") { /* ignore */ }
      else setError("Google sign-in failed. Please try again.");
    } finally { setLoading(false); }
  };

  const handleSendOTP = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const fullNumber = "+91" + phoneNumber.replace(/\D/g, "").slice(-10);
      await sendPhoneOTP(fullNumber, "recaptcha-container-login");
      setOtpSent(true);
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      if (firebaseError.code === "auth/invalid-phone-number") setError("Invalid phone number format.");
      else if (firebaseError.code === "auth/too-many-requests") setError("Too many attempts. Try again later.");
      else setError("Failed to send OTP. Please try again.");
    } finally { setLoading(false); }
  };

  const handleVerifyOTP = async () => {
    const code = otp.join("");
    if (code.length !== 6) { setError("Please enter the full 6-digit code."); return; }
    setError("");
    setLoading(true);
    try {
      const result = await confirmPhoneOTP(code);
      if (result.isNewUser) {
        setProfilePhone("+91" + phoneNumber.replace(/\D/g, "").slice(-10));
        setView("profile-setup");
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      if (firebaseError.code === "auth/invalid-verification-code") setError("Invalid code. Please check and try again.");
      else if (firebaseError.code === "auth/code-expired") setError("Code expired. Please request a new one.");
      else setError("Verification failed. Please try again.");
    } finally { setLoading(false); }
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) { setError("Please enter your name."); return; }
    setError("");
    setLoading(true);
    try {
      await completeProfile(profileName.trim(), profileRole, profilePhone || undefined);
      router.push(profileRole === "teacher" ? "/pending-approval" : "/dashboard");
    } catch {
      setError("Failed to complete profile. Please try again.");
    } finally { setLoading(false); }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/^\d$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      const next = document.getElementById(`otp-login-${index + 1}`);
      next?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prev = document.getElementById(`otp-login-${index - 1}`);
      prev?.focus();
    }
  };

  // Google icon SVG
  const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );

  const PhoneIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
    </svg>
  );

  const BackArrow = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
    </svg>
  );

  return (
    <div className="auth-card-wrapper" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--bg-base)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 60%)", top: -200, right: -200, pointerEvents: "none" }} />

      <div className="page-enter" style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}>
        <div className="auth-logo" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 36 }}>
          <img src="/logo.png" alt="Glorious Amplification" style={{ width: 44, height: 44, objectFit: "contain" }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "0.02em" }}>Glorious Amplification</span>
        </div>

        <div className="card auth-card-inner" style={{ padding: 32 }}>
          {/* ─── MAIN LOGIN VIEW ─── */}
          {view === "main" && (
            <>
              <h1 style={{ fontSize: 22, fontWeight: 600, textAlign: "center", marginBottom: 4, color: "var(--text-primary)" }}>Welcome back, aspirant</h1>
              <p style={{ fontSize: 14, textAlign: "center", color: "var(--text-secondary)", marginBottom: 28 }}>Sign in to continue your preparation</p>
              {error && <div className="error-alert">{error}</div>}

              {/* Social buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                <button onClick={handleGoogleLogin} disabled={loading} className="btn-social btn-social-google" id="google-login-btn">
                  <GoogleIcon />
                  Continue with Google
                </button>
                <button onClick={() => { setError(""); setView("phone"); }} className="btn-social btn-social-phone" id="phone-login-btn">
                  <PhoneIcon />
                  Continue with Phone
                </button>
              </div>

              {/* Divider */}
              <div className="auth-divider"><span>or sign in with email</span></div>

              {/* Email form */}
              <form onSubmit={handleEmailLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label className="field-label">Email</label>
                  <input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" className="input-field" />
                </div>
                <div>
                  <label className="field-label">Password</label>
                  <input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Enter your password" className="input-field" />
                </div>
                <button type="submit" disabled={loading} className="btn-primary" style={{ width: "100%", marginTop: 4, padding: "12px 24px" }}>
                  {loading ? (<><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />Signing in...</>) : "Sign In"}
                </button>
              </form>
            </>
          )}

          {/* ─── PHONE LOGIN VIEW ─── */}
          {view === "phone" && (
            <>
              <button onClick={() => { setView("main"); setError(""); setOtpSent(false); setOtp(["","","","","",""]); setPhoneNumber(""); }} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, marginBottom: 20, padding: 0 }}>
                <BackArrow /> Back to login
              </button>
              <h1 style={{ fontSize: 22, fontWeight: 600, textAlign: "center", marginBottom: 4, color: "var(--text-primary)" }}>Phone Sign In</h1>
              <p style={{ fontSize: 14, textAlign: "center", color: "var(--text-secondary)", marginBottom: 28 }}>
                {otpSent ? "Enter the 6-digit code sent to your phone" : "We'll send you a one-time verification code"}
              </p>
              {error && <div className="error-alert">{error}</div>}

              {!otpSent ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label className="field-label">Phone Number</label>
                    <div className="phone-input-group">
                      <span className="phone-prefix">+91</span>
                      <input
                        id="login-phone"
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        placeholder="Enter 10-digit number"
                        className="input-field"
                        style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeft: "none" }}
                      />
                    </div>
                  </div>
                  <button onClick={handleSendOTP} disabled={loading || phoneNumber.length < 10} className="btn-primary" style={{ width: "100%", padding: "12px 24px" }}>
                    {loading ? (<><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />Sending...</>) : "Send OTP"}
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center" }}>
                  <div className="otp-container">
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        id={`otp-login-${i}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        className="otp-input"
                        autoFocus={i === 0}
                      />
                    ))}
                  </div>
                  <button onClick={handleVerifyOTP} disabled={loading || otp.join("").length !== 6} className="btn-primary" style={{ width: "100%", padding: "12px 24px" }}>
                    {loading ? (<><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />Verifying...</>) : "Verify & Sign In"}
                  </button>
                  <button onClick={() => { setOtpSent(false); setOtp(["","","","","",""]); setError(""); }} style={{ background: "none", border: "none", color: "var(--blue)", cursor: "pointer", fontSize: 13 }}>
                    Resend code
                  </button>
                </div>
              )}
            </>
          )}

          {/* ─── PROFILE SETUP VIEW (for new Google/Phone users) ─── */}
          {view === "profile-setup" && (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--blue-light)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 600, textAlign: "center", marginBottom: 4, color: "var(--text-primary)" }}>Complete Your Profile</h1>
              <p style={{ fontSize: 14, textAlign: "center", color: "var(--text-secondary)", marginBottom: 28 }}>Just a few details to get you started</p>
              {error && <div className="error-alert">{error}</div>}

              <form onSubmit={handleCompleteProfile} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label className="field-label">Full Name</label>
                  <input type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)} required placeholder="Your full name" className="input-field" />
                </div>
                <div>
                  <label className="field-label">I am a</label>
                  <div className="role-selector" style={{ display: "flex", gap: 8 }}>
                    {([
                      { key: "student" as const, label: "Student / Aspirant", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg> },
                      { key: "teacher" as const, label: "Faculty / Mentor", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
                    ]).map(r => (
                      <button key={r.key} type="button" onClick={() => setProfileRole(r.key)} style={{
                        flex: 1, padding: "10px 12px", borderRadius: "var(--radius-md)",
                        border: `1px solid ${profileRole === r.key ? "var(--blue)" : "var(--border-light)"}`,
                        background: profileRole === r.key ? "var(--blue-light)" : "var(--bg-elevated)",
                        color: profileRole === r.key ? "var(--blue)" : "var(--text-secondary)",
                        fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all var(--transition-fast)",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      }}>
                        {r.icon}
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
                {profileRole === "teacher" && (
                  <div style={{ padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--yellow-light)", border: "1px solid rgba(234,179,8,0.15)", fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                    <span style={{ fontWeight: 600, color: "var(--yellow)" }}>Note:</span> Faculty accounts require admin approval before accessing teacher features.
                  </div>
                )}
                <button type="submit" disabled={loading} className="btn-primary" style={{ width: "100%", marginTop: 4, padding: "12px 24px" }}>
                  {loading ? (<><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />Setting up...</>) : "Get Started"}
                </button>
              </form>
            </>
          )}
        </div>

        {view === "main" && (
          <p style={{ fontSize: 14, textAlign: "center", marginTop: 20, color: "var(--text-secondary)" }}>
            New here?{" "}
            <Link href="/signup" style={{ color: "var(--blue)", fontWeight: 500 }}>Create your account</Link>
          </p>
        )}
      </div>

      {/* Invisible reCAPTCHA container for phone auth */}
      <div id="recaptcha-container-login" />
    </div>
  );
}
