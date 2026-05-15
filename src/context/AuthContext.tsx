"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/firebase/config";

// User data shape stored in Firestore
interface UserData {
  uid: string;
  email: string;
  name: string;
  role: "teacher" | "student";
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, role: "teacher" | "student") => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile from Firestore with error handling
  const fetchUserData = useCallback(async (firebaseUser: User) => {
    try {
      const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
      if (userDoc.exists()) {
        setUserData(userDoc.data() as UserData);
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

  // Listen for auth state changes and fetch user data from Firestore
  useEffect(() => {
    // Safety timeout: if Firebase takes too long, stop blocking the UI
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      clearTimeout(timeout);
      setUser(firebaseUser);
      if (firebaseUser) {
        await fetchUserData(firebaseUser);
      } else {
        setUserData(null);
      }
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
    const newUser: UserData = {
      uid: result.user.uid,
      email,
      name,
      role,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, "users", result.user.uid), newUser);
    setUserData(newUser);
  }, []);

  // Logout
  const logout = useCallback(async () => {
    await signOut(auth);
    setUserData(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, userData, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
