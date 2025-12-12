import React from "react";
import Image from "next/image";
import { Message } from "@/app/actions/conversations";

type Props = {
  message: Message;
  patientName: string;
  formattedTime: string;
};

const MessageItem: React.FC<Props> = ({ message, patientName, formattedTime }) => {
  const isUser = message.role === "user";
  const displayName = isUser ? patientName || "Sarah Johnson" : "AI Agent";
  const avatarSrc = isUser ? "/assets/calls/avatar.svg" : "/assets/calls/aiAgent.svg";

  const bubbleStyle: React.CSSProperties = isUser
    ? {
        background: "rgba(113,41,194,0.08)",
        color: "#23272E",
        padding: "16px 15px",
        borderTopLeftRadius: 12,
        borderBottomRightRadius: 12,
        borderBottomLeftRadius: 22,
        borderTopRightRadius: 12,
      }
    : {
        background: "#6325A9",
        color: "#FFFFFF",
        padding: "16px 15px",
        borderTopRightRadius: 12,
        borderBottomRightRadius: 22,
        borderBottomLeftRadius: 12,
        borderTopLeftRadius: 12,
      };

  const nameStyle: React.CSSProperties = {
    fontFamily: "Figtree",
    fontWeight: 500,
    fontSize: 16,
    lineHeight: "132%",
    marginBottom: 6,
  };

  const messageTextStyle: React.CSSProperties = {
    fontFamily: "Figtree",
    fontWeight: 400,
    fontSize: 16,
    lineHeight: "120%",
    letterSpacing: "-0.04em",
    margin: 0,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  };

  const timeStyle: React.CSSProperties = {
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: 14,
    lineHeight: "120%",
    color: "#6B7280",
    marginLeft: 8,
    minWidth: 36,
    textAlign: "right",
  };

  return (
    <div className="flex flex-col">
      {/* AI avatar + name on top */}
      {!isUser && (
        <div className="flex items-center gap-2 mb-1">
          <Image
            src={avatarSrc}
            alt={displayName}
            width={39}
            height={39}
            className="rounded-full"
          />
          <div style={nameStyle} className="text-sm text-brand-dark">
            {displayName}
          </div>
        </div>
      )}

      {/* USER avatar on top */}
      {isUser && (
        <div className="flex justify-end items-center gap-2 mb-1">
          <div style={nameStyle} className="text-sm text-brand-dark">
            {displayName}
          </div>
          <Image
            src={avatarSrc}
            alt={displayName}
            width={39}
            height={39}
            className="rounded-full"
          />
        </div>
      )}

      {/* Bubble + time */}
      <div className={`flex ${isUser ? "justify-end pr-12" : "justify-start pl-12"}`}>
        {!isUser ? (
          // AI → Bubble then Time (default)
          <div className="flex items-center gap-2">
            <div style={bubbleStyle} className="max-w-[463px] break-words">
              <p style={messageTextStyle}>{message.content}</p>
            </div>
            <div style={timeStyle}>{formattedTime}</div>
          </div>
        ) : (
          // USER → Time then Bubble
          <div className="flex items-center gap-2">
            <div style={timeStyle}>{formattedTime}</div>
            <div style={bubbleStyle} className="max-w-[463px] break-words">
              <p style={messageTextStyle}>{message.content}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageItem;
