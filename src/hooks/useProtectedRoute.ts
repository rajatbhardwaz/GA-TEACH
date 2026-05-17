"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

/**
 * Hook to protect routes.
 * - Redirects to /login if not authenticated.
 * - Redirects pending/rejected teachers to /pending-approval.
 * - Optionally restricts by role.
 */
export function useProtectedRoute(options?: {
  /** If set, only users with one of these roles can access the route */
  allowedRoles?: Array<"admin" | "teacher" | "student">;
  /** If true, teacher must be approved (not pending/rejected) to access. Default: true */
  requireApproval?: boolean;
}) {
  const { user, userData, loading, hasFullAccess, isPendingTeacher, isRejectedTeacher } = useAuth();
  const router = useRouter();
  const requireApproval = options?.requireApproval ?? true;
  const allowedRoles = options?.allowedRoles;

  useEffect(() => {
    if (loading) return;

    // Not authenticated → login
    if (!user) {
      router.push("/login");
      return;
    }

    // User data not loaded yet → wait
    if (!userData) return;

    // Pending/rejected teacher → pending approval page
    if (requireApproval && (isPendingTeacher || isRejectedTeacher)) {
      router.push("/pending-approval");
      return;
    }

    // Role restriction check
    if (allowedRoles && !allowedRoles.includes(userData.role)) {
      router.push("/dashboard");
      return;
    }
  }, [user, userData, loading, hasFullAccess, isPendingTeacher, isRejectedTeacher, router, requireApproval, allowedRoles]);

  return { user, userData, loading };
}
