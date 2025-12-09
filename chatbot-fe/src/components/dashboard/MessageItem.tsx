import React from "react";
import Image from "next/image";
import { Message } from "@/app/actions/conversations";

type Props = {
  message: Message;
  patientName: string;
  formattedTime: string;
};

const MessageItem: React.FC<Props> = ({ message, patientName, formattedTime }) => {
  const isUser = message.role === "user" || message.role === "customer";
  const displayName = isUser ? patientName || "Customer" : "AI Agent";
  const avatarSrc = isUser ? "/assets/calls/User.svg" : "/assets/calls/aiAgent.svg";

  const bubbleStyle: React.CSSProperties = isUser
    ? {
        background: "rgba(113,41,194,0.08)",
        color: "#000000",
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
    <div className={`flex items-start gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {/* Left avatar for AI */}
      {!isUser && (
        <div className="flex flex-col items-center pt-1">
          <Image
            src={avatarSrc}
            alt={displayName}
            width={39}
            height={39}
            className="rounded-full"
            style={{ borderWidth: 1, borderStyle: "solid", borderColor: "#E8E3FF" }}
          />
        </div>
      )}

      {/* Content */}
      <div className={`flex-1 flex flex-col ${isUser ? "items-end" : "items-start"}`}>
        <div style={nameStyle} className="text-sm text-brand-dark">
          {displayName}
        </div>

        <div className={`flex items-end gap-2`}>
          <div style={bubbleStyle} className="max-w-[463px] break-words">
            <p style={messageTextStyle}>{message.content}</p>
          </div>

          <div style={timeStyle}>{formattedTime}</div>
        </div>
      </div>

      {/* Right avatar for user */}
      {isUser && (
        <div className="flex flex-col items-center pt-1">
          <Image
            src={avatarSrc}
            alt={displayName}
            width={39}
            height={39}
            className="rounded-full"
            style={{ borderWidth: 1, borderStyle: "solid", borderColor: "#E8E3FF" }}
          />
        </div>
      )}
    </div>
  );
};

export default MessageItem;
