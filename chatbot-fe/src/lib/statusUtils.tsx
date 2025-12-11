import React from "react";

type StatusBadgeProps = {
  status: string;
  statusStyles?: Record<string, { bg: string; text: string }>;
  showDot?: boolean;
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, statusStyles, showDot = false }) => {
  const defaultStatusStyles: Record<string, { bg: string; text: string }> = {
    // Booking statuses
    scheduled: { bg: "#10B981", text: "#FFFFFF" },
    confirmed: { bg: "#10B981", text: "#FFFFFF" },
    pending: { bg: "#FBBF24", text: "#FFFFFF" },
    cancelled: { bg: "#EF4444", text: "#FFFFFF" },
    canceled: { bg: "#EF4444", text: "#FFFFFF" },
    completed: { bg: "#10B981", text: "#FFFFFF" },
    rescheduled: { bg: "#3B82F6", text: "#FFFFFF" },
    // Call statuses
    "in-progress": { bg: "#3B82F6", text: "#FFFFFF" },
    failed: { bg: "#EF4444", text: "#FFFFFF" },
    missed: { bg: "#FBBF24", text: "#FFFFFF" },
    follow_up_needed: { bg: "#F97316", text: "#FFFFFF" },
    ongoing: { bg: "#FEF3C7", text: "#92400E" },
    // Default fallback
    default: { bg: "#6B7280", text: "#FFFFFF" },
  };

  const styles = statusStyles || defaultStatusStyles;
  const cleanStatus = status?.trim().toLowerCase().replace(/_/g, "-");
  const style = styles[cleanStatus] || styles.default;

  return (
    <span
      className="inline-flex items-center px-3 py-1 text-xs font-medium rounded"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {showDot && <span className="w-1 h-1 rounded-full bg-current mr-1"></span>}
      {status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
    </span>
  );
};

export const calculateDuration = (startedAt: string, endedAt: string | null): string => {
  if (!endedAt) return "00:00";

  const start = new Date(startedAt);
  const end = new Date(endedAt);
  const diffMs = end.getTime() - start.getTime();

  if (diffMs <= 0) return "00:00";

  const minutes = Math.floor(diffMs / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);

  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};
