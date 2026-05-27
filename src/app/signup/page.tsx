"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

type AuthMethod = "email" | "phone";

export default function SignupPage() {
  const { signup, signInWithGoogle, sendPhoneOTP, confirmPhoneOTP, completeProfile } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"teacher" | "student">("student");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Auth method toggle
  const [authMethod, setAuthMethod] = useState<AuthMethod>("email");

  // Phone auth state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      await signup(email, password, name, role);
      router.push("/pending-approval");
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      if (firebaseError.code === "auth/email-already-in-use") setError("An account with this email already exists.");
      else if (firebaseError.code === "auth/weak-password") setError("Password is too weak.");
      else setError("Failed to create account. Please try again.");
    } finally { setLoading(false); }
  };

  const handleGoogleSignup = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result.isNewUser) {
        const displayName = name.trim() || result.displayName || "User";
        await completeProfile(displayName, role);
        router.push("/pending-approval");
      } else {
        // Already has a profile — just redirect
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      if (firebaseError.code === "auth/popup-closed-by-user") setError("Sign-in popup was closed.");
      else if (firebaseError.code === "auth/cancelled-popup-request") { /* ignore */ }
      else setError("Google sign-up failed. Please try again.");
    } finally { setLoading(false); }
  };

  const handleSendOTP = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }
    if (!name.trim()) {
      setError("Please enter your name before verifying.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const fullNumber = "+91" + phoneNumber.replace(/\D/g, "").slice(-10);
      await sendPhoneOTP(fullNumber, "recaptcha-container-signup");
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
        const fullNumber = "+91" + phoneNumber.replace(/\D/g, "").slice(-10);
        await completeProfile(name.trim(), role, fullNumber);
      }
      router.push(result.isNewUser ? "/pending-approval" : "/dashboard");
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      if (firebaseError.code === "auth/invalid-verification-code") setError("Invalid code. Please check and try again.");
      else if (firebaseError.code === "auth/code-expired") setError("Code expired. Please request a new one.");
      else setError("Verification failed. Please try again.");
    } finally { setLoading(false); }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/^\d$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      const next = document.getElementById(`otp-signup-${index + 1}`);
      next?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prev = document.getElementById(`otp-signup-${index - 1}`);
      prev?.focus();
    }
  };

  // Icons
  const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );

  return (
    <div className="auth-card-wrapper" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--bg-base)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(34,197,94,0.05) 0%, transparent 60%)", bottom: -200, left: -100, pointerEvents: "none" }} />

      <div className="page-enter" style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}>
        <div className="auth-logo" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 36 }}>
          <img src="/logo.png" alt="Glorious Amplification" style={{ width: 44, height: 44, objectFit: "contain" }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "0.02em" }}>Glorious Amplification</span>
        </div>

        <div className="card auth-card-inner" style={{ padding: 32 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, textAlign: "center", marginBottom: 4, color: "var(--text-primary)" }}>Begin your journey</h1>
          <p style={{ fontSize: 14, textAlign: "center", color: "var(--text-secondary)", marginBottom: 28 }}>Register as a student or faculty member</p>
          {error && <div className="error-alert">{error}</div>}

          {/* ── Name & Role (always visible) ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
            <div>
              <label className="field-label">Full Name</label>
              <input id="signup-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Your full name" className="input-field" />
            </div>
            <div>
              <label className="field-label">I am a</label>
              <div className="role-selector" style={{ display: "flex", gap: 8 }}>
                {([
                  { key: "student" as const, label: "Student / Aspirant", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg> },
                  { key: "teacher" as const, label: "Faculty / Mentor", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
                ]).map(r => (
                  <button key={r.key} type="button" onClick={() => setRole(r.key)} style={{
                    flex: 1, padding: "10px 12px", borderRadius: "var(--radius-md)",
                    border: `1px solid ${role === r.key ? "var(--blue)" : "var(--border-light)"}`,
                    background: role === r.key ? "var(--blue-light)" : "var(--bg-elevated)",
                    color: role === r.key ? "var(--blue)" : "var(--text-secondary)",
                    fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all var(--transition-fast)",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}>
                    {r.icon}
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            {role === "teacher" && (
              <div style={{ padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--yellow-light)", border: "1px solid rgba(234,179,8,0.15)", fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                <span style={{ fontWeight: 600, color: "var(--yellow)" }}>Note:</span> Faculty accounts require admin approval before accessing teacher features. You&apos;ll be notified once approved.
              </div>
            )}
            {role === "student" && (
              <div style={{ padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--yellow-light)", border: "1px solid rgba(234,179,8,0.15)", fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                <span style={{ fontWeight: 600, color: "var(--yellow)" }}>Note:</span> Student accounts require admin approval before accessing classes.
              </div>
            )}
          </div>

          {/* ── Auth method divider ── */}
          <div className="auth-divider" style={{ marginBottom: 16 }}><span>choose sign-up method</span></div>

          {/* ── Auth method tabs ── */}
          <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", padding: 3, border: "1px solid var(--border)" }}>
            {([
              { key: "email" as AuthMethod, label: "Email", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/></svg> },
              { key: "phone" as AuthMethod, label: "Phone", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18"/></svg> },
            ]).map(m => (
              <button key={m.key} type="button" onClick={() => { setAuthMethod(m.key); setError(""); setOtpSent(false); setOtp(["","","","","",""]); }} style={{
                flex: 1, padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "none",
                background: authMethod === m.key ? "var(--bg-hover)" : "transparent",
                color: authMethod === m.key ? "var(--text-primary)" : "var(--text-muted)",
                fontSize: 12.5, fontWeight: 500, cursor: "pointer", transition: "all var(--transition-fast)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              }}>
                {m.icon}
                {m.label}
              </button>
            ))}
          </div>

          {/* ── Email signup ── */}
          {authMethod === "email" && (
            <form onSubmit={handleEmailSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label className="field-label">Email</label>
                <input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" className="input-field" />
              </div>
              <div>
                <label className="field-label">Password</label>
                <input id="signup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Min 6 characters" className="input-field" />
              </div>
              <button type="submit" disabled={loading} className="btn-primary" style={{ width: "100%", marginTop: 4, padding: "12px 24px" }}>
                {loading ? (<><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />Creating account...</>) : "Create Account"}
              </button>
            </form>
          )}

          {/* ── Phone signup ── */}
          {authMethod === "phone" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {!otpSent ? (
                <>
                  <div>
                    <label className="field-label">Phone Number</label>
                    <div className="phone-input-group">
                      <span className="phone-prefix">+91</span>
                      <input
                        id="signup-phone"
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        placeholder="Enter 10-digit number"
                        className="input-field"
                        style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeft: "none" }}
                      />
                    </div>
                  </div>
                  <button onClick={handleSendOTP} disabled={loading || phoneNumber.length < 10 || !name.trim()} className="btn-primary" style={{ width: "100%", padding: "12px 24px" }}>
                    {loading ? (<><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />Sending...</>) : "Send OTP"}
                  </button>
                </>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", textAlign: "center" }}>
                    Code sent to <strong style={{ color: "var(--text-primary)" }}>+91 {phoneNumber}</strong>
                  </p>
                  <div className="otp-container">
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        id={`otp-signup-${i}`}
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
                    {loading ? (<><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />Verifying...</>) : "Verify & Create Account"}
                  </button>
                  <button onClick={() => { setOtpSent(false); setOtp(["","","","","",""]); setError(""); }} style={{ background: "none", border: "none", color: "var(--blue)", cursor: "pointer", fontSize: 13 }}>
                    Change number / Resend
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Google signup divider ── */}
          <div className="auth-divider" style={{ marginTop: 20, marginBottom: 16 }}><span>or</span></div>
          <button onClick={handleGoogleSignup} disabled={loading} className="btn-social btn-social-google" style={{ width: "100%" }}>
            <GoogleIcon />
            Sign up with Google
          </button>
        </div>

        <p style={{ fontSize: 14, textAlign: "center", marginTop: 20, color: "var(--text-secondary)" }}>
          Already registered?{" "}
          <Link href="/login" style={{ color: "var(--blue)", fontWeight: 500 }}>Sign in</Link>
        </p>
      </div>

      {/* Invisible reCAPTCHA container for phone auth */}
      <div id="recaptcha-container-signup" />
    </div>
  );
}
