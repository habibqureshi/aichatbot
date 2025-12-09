/* eslint-disable no-unused-vars */
"use client";

import Image from "next/image";
import React from "react";
import { Conversation } from "@/app/actions/conversations";

type Props = {
  conversation: Conversation;
  onClick?: (conversation: Conversation) => void;
  isSelected?: boolean;
};

const sentimentFromSummary = (summary?: string) => {
  if (!summary) return "Neutral";
  const s = summary.toLowerCase();
  if (s.match(/(great|good|awesome|love|positive|thank)/)) return "Positive";
  if (s.match(/(bad|poor|not|disappointed|negative|issue|problem)/)) return "Negative";
  return "Neutral";
};

const SentimentBadge = ({ sentiment }: { sentiment: string }) => {
  const styles: Record<string, string> = {
    Positive: "bg-green-100 text-green-700",
    Negative: "bg-red-100 text-red-700",
    Neutral: "bg-yellow-100 text-yellow-800",
  };
  return (
    <span
      className={`inline-flex items-center text-xs font-semibold px-2 py-1 rounded-full ${
        styles[sentiment] || styles.Neutral
      }`}
    >
      {sentiment}
    </span>
  );
};

const formatTime = (dateString?: string) => {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "N/A";
  }
};

const calculateDuration = (startedAt: string, endedAt: string | null): string => {
  if (!startedAt) return "00:00";
  const start = new Date(startedAt);
  const end = endedAt ? new Date(endedAt) : new Date();
  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) return "00:00";
  const minutes = Math.floor(diffMs / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

export default function CallCard({ conversation, onClick, isSelected = false }: Props) {
  const caller = conversation?.patient?.name || "Unknown";
  const phone = conversation?.patient?.phone_number || "N/A";
  const summary = (conversation as unknown as { summary?: string })?.summary || "";
  const sentiment = sentimentFromSummary(summary);

  return (
    <div
      role="button"
      onClick={() => onClick && onClick(conversation)}
      className={`cursor-pointer flex items-start gap-3 p-3 rounded-lg transition-shadow border ${
        isSelected ? "ring-2 ring-indigo-300 bg-indigo-50" : "hover:shadow-sm"
      }`}
    >
      <div className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
        <Image
          src="/assets/images/user.png"
          alt={caller}
          width={48}
          height={48}
          className="object-cover"
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-sm text-brand-dark truncate">{caller}</p>
            <p className="text-[13px] text-gray-500 truncate">{phone}</p>
          </div>
          <div className="flex items-center gap-2">
            <SentimentBadge sentiment={sentiment} />
          </div>
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="inline-block">{formatTime(conversation.started_at)}</span>
            <span className="text-gray-300">•</span>
            <span className="font-mono text-[12px] text-gray-700">
              {calculateDuration(conversation.started_at, conversation.ended_at)}
            </span>
          </div>
          <div className="text-xs">
            <span className="text-xs text-gray-500">{conversation.ended_at ? "Ended" : "Ongoing"}</span>
          </div>
        </div>

        <div className="mt-2 text-xs text-gray-600 truncate max-w-full">
          {summary || "No summary available."}
        </div>
      </div>
    </div>
  );
}
