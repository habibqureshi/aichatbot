/* eslint-disable no-unused-vars */
"use client";

import React from "react";
import { Conversation } from "@/app/actions/conversations";
import Image from "next/image";
import { StatusBadge } from "@/lib/statusUtils";

const callStatusStyles: Record<string, { bg: string; text: string }> = {
  completed: { bg: "#F4FBF6", text: "#3E864A" },
  ongoing: { bg: "#FEF3C7", text: "#92400E" },
};

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
    Positive: "bg-[#F3FDF5D4] text-[#3E864A]",
    Negative: "bg-[#FAE3E3] text-[#B21D1B]",
    Neutral: "bg-[#F3F4F6] text-[#3E864A]",
  };

  const emojiPaths: Record<string, string> = {
    Positive: "/assets/Heart-eyes.svg",
    Negative: "/assets/Pensive.svg",
    Neutral: "/assets/Smile-with-big-eyes.svg",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 text-base font-medium leading[1.32] px-3 py-1 rounded-full ${
        styles[sentiment] || styles.Neutral
      }`}
    >
      <Image
        src={emojiPaths[sentiment] || emojiPaths.Neutral}
        alt={`${sentiment} emoji`}
        width={16}
        height={16}
      />
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

const getInitials = (name: string) => {
  if (!name || name === "Unknown") return "U";
  return name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2); // Limit to 2 characters
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
      className={`cursor-pointer flex items-start gap-1 p-6 min-h-[150px] transition-shadow 
    border-b border-gray-200
    ${
      isSelected
        ? "border-l-4 !border-l-[#6325A9] bg-[#6325A90F]"
        : "hover:bg-[#6325A90F] hover:shadow-sm"
    }`}
    >
      <div className="flex-shrink-0 w-[47px] h-[47px] rounded-full overflow-hidden bg-[#6C54C4] flex items-center justify-center">
        <span className="text-white font-medium text-[22px]">{getInitials(caller)}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 ml-2">
            <p className="font-semibold text-base leading-[100%] text-black truncate">{caller}</p>
            <p className="font-medium text-xs leading-[132%] text-[#64748B] truncate">{phone}</p>
          </div>
          <div className="flex items-center gap-2">
            <SentimentBadge sentiment={sentiment} />
          </div>
        </div>

        <div className="flex flex-col items-start justify-between mt-2">
          <div className="flex items-center gap-2 text-xs text-[#64748B]">
            <div className="flex items-center gap-2">
              <Image src="/assets/Clock.svg" alt="clock" width={16} height={16} />
              <span className="inline-block">{formatTime(conversation.started_at)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Image src="/assets/Phone.svg" alt="phone" width={12} height={12} />
              <span className="font-mono text-[12px] mt-1 text-[#64748B]">
                {calculateDuration(conversation.started_at, conversation.ended_at)}
              </span>
            </div>
          </div>
          <div className="text-xs mt-2">
            <StatusBadge
              status={conversation.ended_at ? "completed" : "ongoing"}
              statusStyles={callStatusStyles}
              showDot={true}
            />
          </div>
        </div>

        <div className="mt-1 font-medium text-base leading-[132%] text-gray-600 max-w-full line-clamp-3">
          {summary || "No summary available."}
        </div>
      </div>
    </div>
  );
}
