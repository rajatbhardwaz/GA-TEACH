"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  setPersistence,
  browserLocalPersistence,
  User,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/firebase/config";

// Admin email — the single admin account on the platform
// Configurable via NEXT_PUBLIC_ADMIN_EMAIL env variable
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "rajat@gloriousamplification.com";

// Approval statuses for teacher accounts
export type ApprovalStatus = "pending" | "approved" | "rejected";

// User data shape stored in Firestore
export interface UserData {
  uid: string;
  email: string;
  name: string;
  role: "admin" | "teacher" | "student";
  approvalStatus: ApprovalStatus;
  approvedBy?: string;       // admin UID who approved
  approvedAt?: string;       // ISO date when approved
  rejectedAt?: string;       // ISO date when rejected
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, role: "teacher" | "student") => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  verifyEmail: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  // Convenience flags
  isAdmin: boolean;
  isApprovedTeacher: boolean;
  isPendingTeacher: boolean;
  isRejectedTeacher: boolean;
  isStudent: boolean;
  /** True if the user has full access (admin, approved teacher, or student) */
  hasFullAccess: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Set persistence to local on mount
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(console.error);
  }, []);

  // Fetch user profile from Firestore with error handling and timeout
  const fetchUserData = useCallback(async (firebaseUser: User) => {
    try {
      // Race the Firestore fetch against a 10s timeout to avoid infinite hangs
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Firestore fetch timed out")), 10000)
      );
      const userDoc = await Promise.race([
        getDoc(doc(db, "users", firebaseUser.uid)),
        timeoutPromise,
      ]);
      if (userDoc.exists()) {
        const data = userDoc.data() as UserData;
        // Backward compatibility: if approvalStatus is missing, set defaults
        if (!data.approvalStatus) {
          if (data.role === "teacher") {
            data.approvalStatus = "pending";
          } else {
            data.approvalStatus = "approved";
          }
        }
        // Auto-detect admin by email
        if (data.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() && data.role !== "admin") {
          data.role = "admin";
          data.approvalStatus = "approved";
          // Persist the admin role update to Firestore
          await setDoc(doc(db, "users", firebaseUser.uid), { role: "admin", approvalStatus: "approved" }, { merge: true }).catch(console.error);
        }
        setUserData(data);
      } else {
        // User exists in Auth but not in Firestore — clear userData
        setUserData(null);
      }
    } catch (err) {
      console.error("Failed to fetch user data from Firestore:", err);
      // Still allow the app to load even if Firestore fails
      setUserData(null);
    }
  }, []);

  // Refresh user data (callable externally, e.g. after admin approves)
  const refreshUserData = useCallback(async () => {
    if (auth.currentUser) {
      await fetchUserData(auth.currentUser);
    }
  }, [fetchUserData]);

  // Listen for auth state changes and fetch user data from Firestore
  useEffect(() => {
    // Safety timeout: if the ENTIRE auth+data flow takes too long, unblock UI.
    // Do NOT clear this when auth resolves — only clear after everything finishes.
    // This prevents infinite spinner if Firestore hangs after auth succeeds.
    const timeout = setTimeout(() => {
      console.warn("Auth safety timeout fired — unblocking UI");
      setLoading(false);
    }, 8000);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await fetchUserData(firebaseUser);
      } else {
        setUserData(null);
      }
      clearTimeout(timeout); // Clear only AFTER everything completes
      setLoading(false);
    });

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, [fetchUserData]);

  // Login with email and password
  const login = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  // Signup: create auth user + store profile in Firestore
  const signup = useCallback(async (email: string, password: string, name: string, role: "teacher" | "student") => {
    const result = await createUserWithEmailAndPassword(auth, email, password);

    // Determine actual role and approval status
    const isAdminEmail = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const actualRole: UserData["role"] = isAdminEmail ? "admin" : role;
    const approvalStatus: ApprovalStatus = isAdminEmail
      ? "approved"  // admin bypasses approval
      : role === "student"
        ? "approved"  // students get immediate access
        : "pending";  // teachers need admin approval

    const newUser: UserData = {
      uid: result.user.uid,
      email,
      name,
      role: actualRole,
      approvalStatus,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, "users", result.user.uid), newUser);
    setUserData(newUser);

    // Send email verification
    try {
      await sendEmailVerification(result.user);
    } catch {
      // Non-blocking: if verification email fails, user can still proceed
      console.warn("Email verification send failed — user can verify later");
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    await signOut(auth);
    setUserData(null);
  }, []);

  // Reset password
  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  }, []);

  // Verify email
  const verifyEmail = useCallback(async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  }, []);

  // Convenience flags derived from userData
  const isAdmin = userData?.role === "admin";
  const isApprovedTeacher = userData?.role === "teacher" && userData?.approvalStatus === "approved";
  const isPendingTeacher = userData?.role === "teacher" && userData?.approvalStatus === "pending";
  const isRejectedTeacher = userData?.role === "teacher" && userData?.approvalStatus === "rejected";
  const isStudent = userData?.role === "student";
  const hasFullAccess = isAdmin || isApprovedTeacher || isStudent;

  return (
    <AuthContext.Provider value={{
      user, userData, loading, login, signup, logout, resetPassword, verifyEmail, refreshUserData,
      isAdmin, isApprovedTeacher, isPendingTeacher, isRejectedTeacher, isStudent, hasFullAccess,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
