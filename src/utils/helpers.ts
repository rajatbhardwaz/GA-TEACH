// Generate a unique room code (6 characters, uppercase alphanumeric)
export function generateRoomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Format a date string for display
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Calculate duration in minutes between two timestamps
export function calculateDuration(joinTime: string, leaveTime: string): number {
  const join = new Date(joinTime).getTime();
  const leave = new Date(leaveTime).getTime();
  return Math.round((leave - join) / 60000); // convert ms to minutes
}

// Format duration in minutes to a readable string
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hrs}h ${mins}m`;
}
