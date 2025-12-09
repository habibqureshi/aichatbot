import React from "react";
import { Message } from "@/app/actions/conversations";

type Props = {
  summary: string;
  messages: Message[];
};

const AISummaryTab: React.FC<Props> = ({ summary, messages }) => {
  return (
    <div className="space-y-4">
      <div className="rounded-lg p-4 border" style={{ background: "#F5F3FF", borderColor: "#E8E3FF" }}>
        <div className="flex gap-3 mb-3">
          <div
            className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
            style={{ background: "#6366F1" }}
          >
            <span className="text-white text-sm font-bold">AI</span>
          </div>
          <div>
            <div className="font-medium text-brand-dark">AI Generated Summary</div>
            <div className="text-xs text-gray-500">
              Automatically generated using advanced AI analysis
            </div>
          </div>
        </div>
        <div className="rounded-lg border p-3" style={{ background: "#FFFFFF", borderColor: "#E8E3FF" }}>
          <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
        </div>

        <div className="mt-4 rounded-lg p-3" style={{ background: "#FFFFFF", borderColor: "#E8E3FF" }}>
          <div className="font-medium text-sm text-brand-dark mb-2">Conversation Metrics</div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-gray-500 mb-1">Total messages</div>
              <div className="font-semibold text-brand-dark">{messages.length}</div>
              <div className="text-xs text-gray-400">
                {messages.filter((m) => m.role === "user").length} AI •{" "}
                {messages.filter((m) => m.role !== "user").length} Customer
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Average response</div>
              <div className="font-semibold text-brand-dark">1.2s</div>
              <div className="text-xs text-gray-400">AI agent response time</div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t" style={{ borderColor: "#E8E3FF" }}>
            <div className="text-xs font-medium text-gray-500 mb-2">Speaking Distribution</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">AI Agent</span>
                <span className="text-xs font-semibold text-brand-dark">55%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-brand-button h-2 rounded-full" style={{ width: "55%" }}></div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-gray-600">Customer</span>
                <span className="text-xs font-semibold text-brand-dark">45%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-gray-400 h-2 rounded-full" style={{ width: "45%" }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AISummaryTab;
