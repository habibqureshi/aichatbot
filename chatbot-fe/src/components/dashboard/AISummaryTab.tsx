import React from "react";
import { Message } from "@/app/actions/conversations";
import Image from "next/image";

type Props = {
  summary: string;
  messages: Message[];
};

const AISummaryTab: React.FC<Props> = ({ summary, messages }) => {
  return (
    <div className="space-y-4">
      <div
        className="rounded-lg p-4 border"
        style={{ background: "#F7F1FF70", borderColor: "#6325A94D" }}
      >
        <div className="flex gap-3 mb-3">
          <div className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0">
            <Image src="/assets/summary.svg" width={45} height={45} alt="Summary Icon" />
          </div>
          <div>
            <div className="font-medium text-black text-[18px] leading-[1.32]">AI Generated Summary</div>
          </div>
        </div>
        <div className=" p-3 px-0">
          <p className="text-sm font-medium text-[#384152] leading-[1.32]">{summary}</p>
        </div>
        <div className="flex items-center gap-2 text-[14px] text-[#6325A9]  font-normal leading-[1.2] mt-2">
          <Image src="/assets/purple.svg" width={7} height={7} alt="Summary Icon" /> Automatically
          generated using advanced AI analysis
        </div>
      </div>
      <div className="mt-4 rounded-lg p-3" style={{ background: "#FFFFFF", borderColor: "#D5D9E24D" }}>
        <div className="flex items-center gap-2 font-medium text-black text-[18px] leading-[1.32] mb-2">
          <Image src="/assets/conversation.svg" width={31} height={31} alt="conversation Icon" />
          Conversation Metrics
        </div>
        <div className="flex items-center   gap-12">
          <div
            style={{
              width: "300px",
              height: "108px",
              borderRadius: "8px",
              border: "1px solid #F2F4F6",
              padding: "8px 16px",
            }}
            className="flex flex-col justify-between"
          >
            <div className="flex items-center gap-1">
              <Image src="/assets/Chat.svg" width={24} height={24} alt="average Icon" />
              <div className="text-base leading-[1.32] text-[#4C5564] font-medium">Total messages</div>
            </div>
            <div className="font-semibold text-brand-dark text-lg">{messages.length}</div>
            <div className="text-sm leading-[1.32] text-[#4C5564] font-medium">
              {messages.filter((m) => m.role === "user").length} AI •{" "}
              {messages.filter((m) => m.role !== "user").length} Customer
            </div>
          </div>
          <div
            style={{
              width: "246px",
              height: "108px",
              borderRadius: "8px",
              border: "1px solid #F2F4F6",
              padding: "8px 16px",
            }}
            className="flex flex-col justify-between"
          >
            <div className="flex items-center gap-1">
              <Image src="/assets/Clock.svg" width={24} height={24} alt="average Icon" />
              <div className="text-base leading-[1.32] text-[#4C5564] font-medium">Average response</div>
            </div>
            <div className="font-semibold text-brand-dark text-lg">1.2s</div>
             <div className="text-sm leading-[1.32] text-[#4C5564] font-medium">AI agent response time</div>
          </div>
        </div>

        <div className="mt-4 pt-6 border-t" style={{ borderColor: "#E8E3FF" }}>
        <div className="text-base leading-[1.32] text-[#4C5564] font-medium">Speaking Distribution</div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm leading-[1.32] text-black font-medium">AI Agent</span>
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
  );
};

export default AISummaryTab;
