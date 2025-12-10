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
    <div className="bg-brand-card text-white rounded-[8px] p-4 shadow-md">
      <div className="text-[24px] font-semibold leading[1.32] tracking-normal text-white">
        Live Call Activity
      </div>
      <div className="text-base font-medium leading[1.32] tracking-normal text-white mt-1">
        Real-time agent status
      </div>
      <div className="mt-4 bg-[#9151DC] p-3 rounded-md flex flex-col items-start justify-between h-[69px]">
        <div className="flex items-center gap-2text-base font-medium leading[1.32] tracking-normal text-white">
          <Image src="/assets/activecall.svg" alt="call" width={24} height={24} className="mr-2" />{" "}
          Active Calls
        </div>
        <div className="text-xl font-semibold leading[1.32] tracking-normal text-white">
          {activeCalls}
        </div>
      </div>
      <div className="mt-4 bg-[#9151DC] p-3 rounded-md flex items-center justify-between">
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
            <div className="text-base font-bold leading[1.32] tracking-normal text-white">
              {agentName}
            </div>
            <div className="text-base font-normal leading[1.32] tracking-normal text-white">On Call</div>
          </div>
        </div>
        <div className="text-xs">{agentTime}</div>
      </div>
    </div>
  );
}
