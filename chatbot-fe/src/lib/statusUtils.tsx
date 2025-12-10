import React from "react";

export const StatusBadge = ({ status }: { status: string }) => {
  const statusStyles: Record<string, string> = {
    completed: "bg-green-100 text-green-800",
    "in-progress": "bg-blue-100 text-blue-800",
    failed: "bg-red-100 text-red-800",
    missed: "bg-yellow-100 text-yellow-800",
    follow_up_needed: "bg-orange-100 text-orange-800",
  };

  return (
    <span
      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
        statusStyles[status] || "bg-gray-100 text-gray-800"
      }`}
    >
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
