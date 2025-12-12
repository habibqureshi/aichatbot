"use client";

interface CallTabsSkeletonProps {
  tabs?: string[];
}

export default function CallTabsSkeleton({
  tabs = ["Call Transcript", "Call Recording", "AI Summary"],
}: CallTabsSkeletonProps) {
  // const activeIndex = 0;

  return (
    <div className="p-6 border border-[#D5D9E2] shadow-[0_2px_2px_0_#23272E14] rounded-[16px]">
      {/* Tabs - show actual tab names as muted skeleton text, highlight first tab */}
      <div className="flex gap-6 border-b border-gray-200 pb-3 items-end">
        {tabs.map((tab, index) => {
          // const isActive = index === activeIndex;
          return (
            <button
              key={index}
              className={`pb-3 transition-colors min-w-[160px] ${
                // isActive
                //   ? "text-[#6325A9] border-b-2 border-[#6325A9]":
                "text-[#4C5564] hover:text-gray-700"
              }`}
              style={{
                fontFamily: "Figtree",
                fontWeight: 500,
                fontSize: "20px",
                lineHeight: "132%",
                letterSpacing: "0%",
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Tab content skeleton - default to "chat" transcript skeleton (first tab selected) */}
      <div className="mt-6 max-h-[410px] overflow-hidden">
        <div className="space-y-6">
          {/* replicate MessageItem structure for better visual match */}
          {[
            { isUser: true, width: "40%" },
            { isUser: false, width: "65%" },
            { isUser: true, width: "30%" },
            { isUser: false, width: "65%" },
            { isUser: true, width: "60%" },
          ].map((msg, idx) => (
            <div key={idx} className="flex flex-col">
              {/* avatar + name */}
              {!msg.isUser ? (
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-[39px] h-[39px] rounded-full bg-gray-200 animate-pulse" />
                  <div className="h-7 bg-gray-200 rounded w-32 animate-pulse" />
                </div>
              ) : (
                <div className="flex justify-end items-center gap-2 mb-2">
                  <div className="h-7 bg-gray-200 rounded w-32 animate-pulse" />
                  <div className="w-[39px] h-[39px] rounded-full bg-gray-200 animate-pulse" />
                </div>
              )}

              {/* bubble + time */}
              <div className={`flex ${msg.isUser ? "justify-end pr-14" : "justify-start pl-14"}`}>
                {!msg.isUser ? (
                  <div className="flex items-center gap-3 w-full">
                    <div
                      className="h-14 rounded-[12px] break-words animate-pulse"
                      style={{ width: msg.width, background: "#E8E3FF" }}
                    />
                    <div className="h-4 w-12 bg-gray-200 rounded ml-2 animate-pulse" />
                  </div>
                ) : (
                  <div className="flex items-center gap-3 w-full justify-end">
                    <div className="h-4 w-12 bg-gray-200 rounded mr-2 animate-pulse" />
                    <div
                      className="h-14 rounded-[12px] break-words animate-pulse"
                      style={{ width: msg.width, background: "#E8E3FF" }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
