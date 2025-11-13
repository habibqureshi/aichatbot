import React from "react";
import { Conversation, Message } from "@/app/actions/conversations";

type Props = {
  conversation?: Conversation | null;
  messages?: Message[];
  loading?: boolean;
};
const StatusBadge = ({ status }: { status: string }) => {
  const statusStyles: Record<string, { bg: string; text: string }> = {
    active: { bg: "#06A35A", text: "#FFFFFF" },
    confirmed: { bg: "#10B981", text: "#FFFFFF" },
    pending: { bg: "#FBBF24", text: "#FFFFFF" },
    cancelled: { bg: "#EF4444", text: "#FFFFFF" },
    canceled: { bg: "#EF4444", text: "#FFFFFF" },
    completed: { bg: "#3B82F6", text: "#FFFFFF" },
    rescheduled: { bg: "#3B82F6", text: "#FFFFFF" },
  };

  const cleanStatus = status?.trim().toLowerCase();
  const style = statusStyles[cleanStatus] || { bg: "#6B7280", text: "#FFFFFF" };

  return (
    <span
      className="inline-flex px-3 py-1 text-xs font-medium rounded"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};
export default function CallDetails({ conversation, messages, loading = false }: Props) {
  // Fallback values if no conversation is selected
  const caller = conversation?.patient?.name || "Muhammad Rizwan";
  const phone = conversation?.patient?.phone_number || "+92 3150921150";
  const status = conversation?.status || "Unknown";
  const summary =
    (conversation && (conversation as unknown as { summary?: string }).summary) ||
    "No summary available.";

  return (
    <aside className="w-full h-fit">
      <div
        className="bg-white/60 backdrop-blur-sm border border-[#E3C5FF55] rounded-xl p-4 shadow-sm"
        style={{
          // background: "var(--lighter-purple-bg)",
          minHeight: "400px",
          maxHeight: "920px",
        }}
      >
        <h3 className="calldetails-title mb-6">Call Details</h3>
        <div className="bg-[#E6E4FB] h-[0.5px] my-4" />
        <div className="space-y-5">
          <div>
            <div className="calldetails-label mb-1">Caller</div>
            <div className="calldetails-value">{caller}</div>
          </div>

          <div>
            <div className="calldetails-label mb-1">Phone no</div>
            <div className="calldetails-value">{phone}</div>
          </div>

          <div>
            <div className="calldetails-label mb-2">Status</div>
            <div className="mt-2 inline-block">
              <StatusBadge status={status} />
            </div>
          </div>

          <div className="bg-[#E6E4FB] rounded-lg p-4">
            <div className="calldetails-section-title mb-2">Summary</div>
            <div className=" rounded-lg border p-3 min-h-[80px]">
              <p className="calldetails-summary-text">{summary}</p>
            </div>
          </div>
          <div className="bg-[#E6E4FB] rounded-lg p-4">
            <div className="calldetails-section-title mb-3">Transcript Preview</div>
            <div className="h-[354px] overflow-y-auto">
              <div className="space-y-3">
                {loading ? (
                  // Skeleton loader for messages
                  <>
                    <div className="flex justify-start">
                      <div className="h-12 bg-gray-200 rounded-lg animate-pulse max-w-xs lg:max-w-md w-full"></div>
                    </div>
                    <div className="flex justify-end">
                      <div className="h-12 bg-gray-200 rounded-lg animate-pulse max-w-xs lg:max-w-md w-full"></div>
                    </div>
                    <div className="flex justify-start">
                      <div className="h-12 bg-gray-200 rounded-lg animate-pulse max-w-xs lg:max-w-md w-full"></div>
                    </div>
                    <div className="flex justify-end">
                      <div className="h-12 bg-gray-200 rounded-lg animate-pulse max-w-xs lg:max-w-md w-full"></div>
                    </div>
                  </>
                ) : messages && messages.length > 0 ? (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === "user" ? "justify-start" : "justify-end"}`}
                    >
                      <div
                        className={`text-sm p-3 rounded-lg max-w-xs lg:max-w-[255px] ${
                          message.role === "user"
                            ? "bg-gradient-to-r from-[#EEEAFF] to-[#DAD2FF] text-[#4318FF]"
                            : "bg-white text-gray-700 border"
                        }`}
                      >
                        <p
                          className={
                            message.role === "user" ? "calldetails-chat-user" : "calldetails-chat-bot"
                          }
                        >
                          {message.content}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex justify-center">
                    <div className="p-3 rounded-lg bg-gray-100 text-gray-500">
                      <p>No chat transcript available</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <button className="w-full bg-gradient-to-r from-[#8A6BFF] to-[#6A4BFF] text-white py-3 rounded-lg shadow-md hover:opacity-90 transition-opacity">
              ▶ Play Recording
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
