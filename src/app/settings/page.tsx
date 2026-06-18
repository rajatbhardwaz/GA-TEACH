"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, setDoc } from "firebase/firestore";
import { updateEmail, updatePassword } from "firebase/auth";
import { db, auth } from "@/firebase/config";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
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

  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // Language state
  const [language, setLanguage] = useState("en");

  // Sync state with userData on load
  useEffect(() => {
    if (userData) {
      setName(userData.name || "");
      setEmail(userData.email || "");
      setPhone(userData.phone || "");
    }
  }, [userData]);

  // Read saved language preference from local storage
  useEffect(() => {
    const savedLang = localStorage.getItem("ga-language") || "en";
    setLanguage(savedLang);
  }, []);

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    localStorage.setItem("ga-language", lang);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData || !auth.currentUser) return;

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const emailChanged = email.trim().toLowerCase() !== userData.email.toLowerCase();

      // 1. If email changed, update in Firebase Authentication first
      if (emailChanged) {
        await updateEmail(auth.currentUser, email.trim());
      }

      // 2. Update student profile details in Firestore user record
      const docRef = doc(db, "users", userData.uid);
      await setDoc(docRef, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim()
      }, { merge: true });

      await refreshUserData();
      setSuccessMsg("Profile information updated successfully!");
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/requires-recent-login") {
        setErrorMsg("⚠️ For security, you must log out and log back in to change your email address.");
      } else {
        setErrorMsg(err.message || "Failed to update profile details.");
      }
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
      setPasswordSuccess("Password changed successfully!");
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
        <p style={{ color: "var(--text-secondary)" }}>Unable to load profile settings.</p>
      </div>
    );
  }

  return (
    <DashboardLayout title="Settings">
      <div className="page-enter" style={{ maxWidth: 800, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
            System Settings ⚙️
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            Configure your application preferences, profile information, and security credentials.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* General Preferences Card */}
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 20 }}>
              General Preferences
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Theme Toggle */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Theme Color Mode</p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Toggle between light and dark visual mode appearance.</p>
                </div>
                <button className="btn-secondary" onClick={toggleTheme} style={{ textTransform: "capitalize", padding: "8px 16px", fontSize: 13 }}>
                  Switch to {theme === "dark" ? "Light Mode ☀️" : "Dark Mode 🌙"}
                </button>
              </div>

              <div className="divider" style={{ margin: 0 }} />

              {/* Language Selection */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Language Preference</p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Change interface display language.</p>
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
                  <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Account Control</p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Switch to a different account or sign out of your profile.</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-secondary" onClick={handleSwitchAccount} style={{ padding: "8px 16px", fontSize: 13 }}>
                    Switch Account
                  </button>
                  <button className="btn-danger" onClick={handleLogout} style={{ padding: "8px 16px", fontSize: 13 }}>
                    Log Out
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Edit Profile (Privacy & Credentials) */}
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 20 }}>
              Privacy & Profile Credentials
            </h2>

            {errorMsg && <div className="error-alert" style={{ marginBottom: 16 }}>{errorMsg}</div>}
            {successMsg && <div className="success-alert" style={{ marginBottom: 16, background: "var(--green-light)", color: "var(--green)", padding: 12, borderRadius: "var(--radius-md)", fontSize: 13, fontWeight: 500 }}>{successMsg}</div>}

            <form onSubmit={handleUpdateProfile} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label className="field-label">Display Name</label>
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
                  <label className="field-label">Email Address</label>
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
                  <label className="field-label">Phone Number</label>
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
                  {loading ? "Saving changes..." : "Save Profile Details"}
                </button>
              </div>
            </form>
          </div>

          {/* Change Password Card */}
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 20 }}>
              Security Settings (Change Password)
            </h2>

            {passwordError && <div className="error-alert" style={{ marginBottom: 16 }}>{passwordError}</div>}
            {passwordSuccess && <div className="success-alert" style={{ marginBottom: 16, background: "var(--green-light)", color: "var(--green)", padding: 12, borderRadius: "var(--radius-md)", fontSize: 13, fontWeight: 500 }}>{passwordSuccess}</div>}

            <form onSubmit={handleUpdatePassword} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label className="field-label">New Password</label>
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
                  <label className="field-label">Confirm New Password</label>
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
                  {passwordLoading ? "Updating password..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
