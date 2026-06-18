"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, setDoc } from "firebase/firestore";
import { updateEmail, updatePassword } from "firebase/auth";
import { db, auth } from "@/firebase/config";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { useLanguage, Language } from "@/context/LanguageContext";
import DashboardLayout from "@/components/DashboardLayout";

export default function SettingsPage() {
  const { loading: authLoading } = useProtectedRoute();
  const { userData, logout, refreshUserData } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  // Profile forms state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // OTP Verification state
  const [verifyStep, setVerifyStep] = useState<"idle" | "email" | "phone">("idle");
  const [otpInput, setOtpInput] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingPhone, setPendingPhone] = useState("");
  const [otpError, setOtpError] = useState("");

  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // Language state
  const { language, changeLanguage, t } = useLanguage();

  // Sync state with userData on load
  useEffect(() => {
    if (userData) {
      setName(userData.name || "");
      setEmail(userData.email || "");
      setPhone(userData.phone || "");
    }
  }, [userData]);

  const handleLanguageChange = (lang: string) => {
    changeLanguage(lang as Language);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData || !auth.currentUser) return;

    setErrorMsg("");
    setSuccessMsg("");

    const emailChanged = email.trim().toLowerCase() !== userData.email.toLowerCase();
    const phoneChanged = phone.trim() !== (userData.phone || "");

    if (emailChanged) {
      // Generate OTP for email verification
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(otp);
      setPendingEmail(email.trim().toLowerCase());
      setPendingPhone(phone.trim());
      setOtpInput("");
      setOtpError("");
      setVerifyStep("email");
    } else if (phoneChanged) {
      // Generate OTP for phone verification
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(otp);
      setPendingEmail(email.trim().toLowerCase());
      setPendingPhone(phone.trim());
      setOtpInput("");
      setOtpError("");
      setVerifyStep("phone");
    } else {
      // Neither changed (only name or nothing changed), save details directly
      setLoading(true);
      try {
        const docRef = doc(db, "users", userData.uid);
        await setDoc(docRef, {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim()
        }, { merge: true });

        await refreshUserData();
        setSuccessMsg(t("settings.profile_success"));
      } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message || "Failed to update profile details.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpInput.trim() !== generatedOtp) {
      setOtpError(t("settings.otp_error"));
      return;
    }

    if (verifyStep === "email") {
      const phoneChanged = pendingPhone !== (userData?.phone || "");
      if (phoneChanged) {
        // Transition to phone verification
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedOtp(otp);
        setOtpInput("");
        setOtpError("");
        setVerifyStep("phone");
      } else {
        // Phone didn't change, proceed to save details
        await performSaveDetails(pendingEmail, pendingPhone);
      }
    } else if (verifyStep === "phone") {
      // Phone verification complete, save details
      await performSaveDetails(pendingEmail, pendingPhone);
    }
  };

  const performSaveDetails = async (targetEmail: string, targetPhone: string) => {
    if (!userData || !auth.currentUser) return;
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    setVerifyStep("idle");

    let authEmailUpdated = true;
    let authUpdateErrorMsg = "";

    try {
      const emailChanged = targetEmail !== userData.email.toLowerCase();

      // 1. If email changed, try updating in Firebase Authentication
      if (emailChanged) {
        try {
          await updateEmail(auth.currentUser, targetEmail);
        } catch (authErr: any) {
          console.warn("Firebase updateEmail failed, falling back:", authErr);
          authEmailUpdated = false;
          if (authErr.code === "auth/requires-recent-login") {
            authUpdateErrorMsg = "requires-recent-login";
          } else {
            authUpdateErrorMsg = authErr.code || authErr.message || "auth-error";
          }
        }
      }

      // 2. Update student profile details in Firestore user record
      const docRef = doc(db, "users", userData.uid);
      await setDoc(docRef, {
        name: name.trim(),
        email: targetEmail,
        phone: targetPhone
      }, { merge: true });

      await refreshUserData();

      if (emailChanged && !authEmailUpdated) {
        if (authUpdateErrorMsg === "requires-recent-login") {
          setErrorMsg("⚠️ For security, you must log out and log back in to change your email address in Authentication. Firestore record was updated.");
        } else {
          setSuccessMsg(t("settings.profile_fallback_success"));
        }
      } else {
        setSuccessMsg(t("settings.profile_success"));
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to update profile details.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters long.");
      return;
    }

    setPasswordLoading(true);
    setPasswordError("");
    setPasswordSuccess("");

    try {
      await updatePassword(auth.currentUser, newPassword);
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess(t("settings.password_success"));
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/requires-recent-login") {
        setPasswordError("⚠️ For security, you must log out and log back in to change your password.");
      } else {
        setPasswordError(err.message || "Failed to change password.");
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSwitchAccount = async () => {
    await logout();
    router.push("/login?switch=true");
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-base)" }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!userData) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-base)" }}>
        <p style={{ color: "var(--text-secondary)" }}>{t("settings.unable_load")}</p>
      </div>
    );
  }

  return (
    <DashboardLayout title={t("nav.settings")}>
      <div className="page-enter" style={{ maxWidth: 800, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
            {t("settings.title")}
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            {t("settings.subtitle")}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* General Preferences Card */}
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 20 }}>
              {t("settings.general_pref")}
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Theme Toggle */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{t("settings.theme_mode")}</p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("settings.theme_desc")}</p>
                </div>
                <div
                  onClick={toggleTheme}
                  style={{
                    width: 58,
                    height: 30,
                    borderRadius: 15,
                    background: theme === "light" ? "#93c5fd" : "#4b5563",
                    position: "relative",
                    cursor: "pointer",
                    transition: "background 0.3s ease",
                    display: "flex",
                    alignItems: "center",
                    padding: "0 3px",
                    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.1)"
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: theme === "light" ? "#fbbf24" : "#f3f4f6",
                      position: "absolute",
                      left: theme === "light" ? "31px" : "3px",
                      transition: "left 0.25s cubic-bezier(0.4, 0, 0.2, 1), background 0.25s ease",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                    }}
                  >
                    {theme === "light" ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#78350f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="5" />
                        <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                        <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>

              <div className="divider" style={{ margin: 0 }} />

              {/* Language Selection */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{t("settings.lang_pref")}</p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("settings.lang_desc")}</p>
                </div>
                <select
                  className="select-field"
                  value={language}
                  onChange={e => handleLanguageChange(e.target.value)}
                  style={{ width: "auto", minWidth: 160, padding: "6px 12px", fontSize: 13 }}
                >
                  <option value="en">English (US)</option>
                  <option value="hi">हिन्दी (Hindi)</option>
                  <option value="es">Español (Spanish)</option>
                  <option value="fr">Français (French)</option>
                </select>
              </div>

              <div className="divider" style={{ margin: 0 }} />

              {/* Account Management (Switch & Logout) */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{t("settings.acc_control")}</p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("settings.acc_desc")}</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-secondary" onClick={handleSwitchAccount} style={{ padding: "8px 16px", fontSize: 13 }}>
                    {t("settings.switch_account")}
                  </button>
                  <button className="btn-danger" onClick={handleLogout} style={{ padding: "8px 16px", fontSize: 13 }}>
                    {t("settings.logout")}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Edit Profile (Privacy & Credentials) */}
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 20 }}>
              {t("settings.privacy_profile")}
            </h2>

            {errorMsg && <div className="error-alert" style={{ marginBottom: 16 }}>{errorMsg}</div>}
            {successMsg && <div className="success-alert" style={{ marginBottom: 16, background: "var(--green-light)", color: "var(--green)", padding: 12, borderRadius: "var(--radius-md)", fontSize: 13, fontWeight: 500 }}>{successMsg}</div>}

            <form onSubmit={handleUpdateProfile} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label className="field-label">{t("settings.display_name")}</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="input-field"
                  placeholder="Your full name"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <label className="field-label">{t("settings.email_address")}</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="input-field"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="field-label">{t("settings.phone_number")}</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="input-field"
                    placeholder="e.g. +91 99999 99999"
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 8 }}>
                <button type="submit" disabled={loading} className="btn-primary" style={{ padding: "10px 20px" }}>
                  {loading ? t("settings.saving_details") : t("settings.save_details")}
                </button>
              </div>
            </form>
          </div>

          {/* Change Password Card */}
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 20 }}>
              {t("settings.security_settings")}
            </h2>

            {passwordError && <div className="error-alert" style={{ marginBottom: 16 }}>{passwordError}</div>}
            {passwordSuccess && <div className="success-alert" style={{ marginBottom: 16, background: "var(--green-light)", color: "var(--green)", padding: 12, borderRadius: "var(--radius-md)", fontSize: 13, fontWeight: 500 }}>{passwordSuccess}</div>}

            <form onSubmit={handleUpdatePassword} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label className="field-label">{t("settings.new_password")}</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="input-field"
                    placeholder="At least 6 characters"
                  />
                </div>
                <div>
                  <label className="field-label">{t("settings.confirm_password")}</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="input-field"
                    placeholder="Re-enter new password"
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 8 }}>
                <button type="submit" disabled={passwordLoading} className="btn-primary" style={{ padding: "10px 20px" }}>
                  {passwordLoading ? t("settings.updating_password") : t("settings.update_password")}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {verifyStep !== "idle" && (
        <div className="modal-overlay" style={{ zIndex: 100 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
                {verifyStep === "email" ? t("settings.otp_title_email") : t("settings.otp_title_phone")}
              </h3>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: "1.5" }}>
                {verifyStep === "email"
                  ? t("settings.otp_desc_email", { email: pendingEmail })
                  : t("settings.otp_desc_phone", { phone: pendingPhone })}
              </p>
            </div>

            {/* Demo Mode Banner */}
            <div style={{
              background: "rgba(59, 130, 246, 0.1)",
              border: "1px dashed rgba(59, 130, 246, 0.3)",
              borderRadius: "var(--radius-md)",
              padding: "10px 14px",
              marginBottom: 16,
              color: "var(--blue)",
              fontSize: 13,
              fontWeight: 500,
              textAlign: "center"
            }}>
              {t("settings.otp_demo_banner", { otp: generatedOtp })}
            </div>

            {otpError && (
              <div className="error-alert" style={{ marginBottom: 16 }}>
                {otpError}
              </div>
            )}

            <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label className="field-label">{t("settings.otp_input_label")}</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="input-field"
                  placeholder="e.g. 123456"
                  autoFocus
                  style={{ textAlign: "center", letterSpacing: "0.5em", fontSize: 18, fontWeight: 700 }}
                />
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setVerifyStep("idle");
                    setOtpInput("");
                    setOtpError("");
                  }}
                  style={{ padding: "8px 16px", fontSize: 13 }}
                >
                  {t("settings.otp_cancel_btn")}
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: "8px 16px", fontSize: 13 }}
                >
                  {t("settings.otp_verify_btn")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
