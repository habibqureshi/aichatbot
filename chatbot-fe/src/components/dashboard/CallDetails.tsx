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
  const caller = conversation?.patient?.name || "-";
  const phone = conversation?.patient?.phone_number || "-";
  const status = conversation?.status || "Unknown";
  console.log("status123", status);
  const summary =
    (conversation && (conversation as unknown as { summary?: string }).summary) ||
    "No summary available.";

  return (
    <aside className="w-full max-h-[82vh] overflow-y-auto">
      <div className="bg-white/60 backdrop-blur-sm border border-[#E3C5FF55] rounded-xl p-4 shadow-sm">
        <h3 className="text-lg font-semibold mb-3">Call Details</h3>
        <div className="bg-[#E6E4FB] h-[0.5px] my-4" />
        <div className="space-y-3">
          <div className="text-sm text-gray-600">
            <div className="font-medium text-gray-900">Caller</div>
            <div className="text-sm text-gray-700">{caller}</div>
          </div>

          <div className="text-sm text-gray-600">
            <div className="font-medium text-gray-900">Phone no</div>
            <div className="text-sm text-gray-700">{phone}</div>
          </div>

          <div>
            <div className="font-medium text-gray-900">Status</div>
            <div className="mt-2 inline-block">
              <StatusBadge status={status} />
            </div>
          </div>

          <div className="bg-[#E6E4FB] rounded-lg p-4">
            <div className="font-medium text-gray-900 mb-2">Summary</div>
            <div className=" rounded-lg border p-3 text-sm text-gray-700 min-h-[80px] max-h[150px]">
              {summary}
            </div>
          </div>
          <div className="bg-[#E6E4FB] rounded-lg p-4">
            <div className="font-medium text-gray-900 mb-2">Transcript Preview</div>
            <div className="h-[354px] overflow-y-auto">
              <div className="space-y-3">
                {loading ? (
                  // Skeleton loader for messages
                  <>
                    <div className="flex justify-start">
                      <div className="h-10 bg-gray-200 rounded-lg animate-pulse max-w-xs lg:max-w-md w-full"></div>
                    </div>
                    <div className="flex justify-end">
                      <div className="h-10 bg-gray-200 rounded-lg animate-pulse max-w-xs lg:max-w-md w-full"></div>
                    </div>
                    <div className="flex justify-start">
                      <div className="h-10 bg-gray-200 rounded-lg animate-pulse max-w-xs lg:max-w-md w-full"></div>
                    </div>
                    <div className="flex justify-end">
                      <div className="h-10 bg-gray-200 rounded-lg animate-pulse max-w-xs lg:max-w-md w-full"></div>
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
                        {message.content}
                      </div>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="flex justify-start">
                      <div className="bg-[#F6F5FF] text-sm text-[#6A4BFF] p-3 rounded-lg max-w-xs lg:max-w-md">
                        Hello there! How may I assist you today?
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="bg-white text-sm text-gray-700 p-3 rounded-lg border max-w-xs lg:max-w-md">
                        I&apos;m looking for a name that reflects adventure and exploration.
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <button className="w-full bg-gradient-to-r from-[#8A6BFF] to-[#6A4BFF] text-white py-3 rounded-lg shadow-md">
              ▶ Play Recording
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
