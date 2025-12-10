"use client";
import React from "react";
import Image from "next/image";

export default function LiveCallActivity({
  activeCalls = 8,
  agentName = "Agent",
  agentTime = "00:04:32",
}: {
  activeCalls?: number;
  agentName?: string;
  agentTime?: string;
}) {
  return (
    <div className="bg-gradient-to-r from-[#7A3BC4] to-[#CE53B7] text-white rounded-[12px] p-4 shadow-md">
      <div className="text-sm font-semibold">Live Call Activity</div>
      <div className="text-xs mt-1">Real-time agent status</div>
      <div className="mt-4 flex items-center justify-between">
        <div className="text-lg font-extrabold">{activeCalls}</div>
        <div className="text-xs text-white/70">Active Calls</div>
      </div>
      <div className="mt-4 bg-white/10 p-3 rounded-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-full">
            <Image
              src="/assets/images/user.png"
              alt="agent"
              width={34}
              height={34}
              className="rounded-full"
            />
          </div>
          <div>
            <div className="text-sm font-medium">{agentName}</div>
            <div className="text-xs text-white/60">On Call</div>
          </div>
        </div>
        <div className="text-xs">{agentTime}</div>
      </div>
    </div>
  );
}
