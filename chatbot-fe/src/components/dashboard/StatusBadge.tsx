import React from "react";

type StatusBadgeProps = {
  status: string;
  statusStyles?: Record<string, { bg: string; text: string }>;
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, statusStyles }) => {
  const defaultStatusStyles: Record<string, { bg: string; text: string }> = {
    active: { bg: "#06A35A", text: "#FFFFFF" },
    confirmed: { bg: "#10B981", text: "#FFFFFF" },
    pending: { bg: "#FBBF24", text: "#FFFFFF" },
    cancelled: { bg: "#EF4444", text: "#FFFFFF" },
    canceled: { bg: "#EF4444", text: "#FFFFFF" },
    completed: { bg: "#3B82F6", text: "#FFFFFF" },
    rescheduled: { bg: "#3B82F6", text: "#FFFFFF" },
  };

  const styles = statusStyles || defaultStatusStyles;
  const cleanStatus = status?.trim().toLowerCase();
  const style = styles[cleanStatus] || { bg: "#6B7280", text: "#FFFFFF" };

  return (
    <span
      className="inline-flex px-3 py-1 text-xs font-medium rounded"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

export default StatusBadge;
