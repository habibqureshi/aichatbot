import React from "react";
import { Conversation, Message } from "@/app/actions/conversations";

type Props = {
  conversation?: Conversation | null;
  messages?: Message[];
  loading?: boolean;
};

export default function CallDetails({ conversation, messages, loading = false }: Props) {
  // Fallback values if no conversation is selected
  const caller = conversation?.patient?.name || "-";
  const phone = conversation?.patient?.phone_number || "-";
  const status = conversation?.status || "Unknown";
  const summary =
    (conversation && (conversation as unknown as { summary?: string }).summary) ||
    "No summary available.";

  return (
    <aside className="w-full">
      <div className="bg-white/60 backdrop-blur-sm border border-[#E3C5FF55] rounded-xl p-4 shadow-sm">
        <h3 className="text-lg font-semibold mb-3">Call Details</h3>

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
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                {status}
              </span>
            </div>
          </div>

          <div>
            <div className="font-medium text-gray-900 mb-2">Summary</div>
            <div className="bg-white rounded-lg border p-3 text-sm text-gray-700 min-h-[80px]">
              {summary}
            </div>
          </div>

          <div>
            <div className="font-medium text-gray-900 mb-2">Transcript Preview</div>
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
                      className={`text-sm p-3 rounded-lg max-w-xs lg:max-w-md ${
                        message.role === "user"
                          ? "bg-white text-gray-700 border"
                          : "bg-[#F6F5FF] text-[#6A4BFF]"
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
