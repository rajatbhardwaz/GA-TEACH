"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

/**
 * Hook to protect routes.
 * - Redirects to /login if not authenticated.
 * - Redirects pending/rejected non-admin users to /pending-approval.
 * - Optionally restricts by role.
 */
export function useProtectedRoute(options?: {
  /** If set, only users with one of these roles can access the route */
  allowedRoles?: Array<"admin" | "teacher" | "student">;
  /** If true, non-admin users must be approved. Default: true */
  requireApproval?: boolean;
}) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const requireApproval = options?.requireApproval ?? true;
  const allowedRoles = options?.allowedRoles;

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    if (!userData) return;

    if (requireApproval && userData.role !== "admin" && userData.approvalStatus !== "approved") {
      router.push("/pending-approval");
      return;
    }

    if (allowedRoles && !allowedRoles.includes(userData.role)) {
      router.push("/dashboard");
      return;
    }
  }, [user, userData, loading, router, requireApproval, allowedRoles]);

  return { user, userData, loading };
}
