// Password validation requirements
export interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
  met: boolean;
}

export function getPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    { label: "At least 8 characters", test: (p) => p.length >= 8, met: password.length >= 8 },
    { label: "One uppercase letter", test: (p) => /[A-Z]/.test(p), met: /[A-Z]/.test(password) },
    { label: "One lowercase letter", test: (p) => /[a-z]/.test(p), met: /[a-z]/.test(password) },
    { label: "One number", test: (p) => /[0-9]/.test(p), met: /[0-9]/.test(password) },
    { label: "One special character (!@#$%^&*)", test: (p) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(p), met: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password) },
  ];
}

export function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: "", color: "transparent" };

  const requirements = getPasswordRequirements(password);
  const metCount = requirements.filter((r) => r.met).length;

  if (metCount <= 1) return { score: 20, label: "Very Weak", color: "#ef4444" };
  if (metCount === 2) return { score: 40, label: "Weak", color: "#f97316" };
  if (metCount === 3) return { score: 60, label: "Fair", color: "#eab308" };
  if (metCount === 4) return { score: 80, label: "Strong", color: "#22c55e" };
  return { score: 100, label: "Very Strong", color: "#10b981" };
}

export function isPasswordValid(password: string): boolean {
  return getPasswordRequirements(password).every((r) => r.met);
}

export function getFirebaseErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/user-disabled":
      return "This account has been disabled. Contact support.";
    case "auth/user-not-found":
      return "No account found with this email address.";
    case "auth/wrong-password":
      return "Incorrect password. Please try again.";
    case "auth/invalid-credential":
      return "Invalid email or password. Please check and try again.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try signing in.";
    case "auth/weak-password":
      return "Password is too weak. Please use a stronger password.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network error. Please check your connection and try again.";
    case "auth/popup-closed-by-user":
      return "Sign-in popup was closed. Please try again.";
    case "auth/requires-recent-login":
      return "Please sign in again to complete this action.";
    case "auth/operation-not-allowed":
      return "This sign-in method is not enabled. Contact support.";
    case "auth/missing-email":
      return "Please enter your email address.";
    default:
      return "An unexpected error occurred. Please try again.";
  }
}
