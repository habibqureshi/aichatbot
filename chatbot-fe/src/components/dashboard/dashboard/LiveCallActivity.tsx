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
    <div className="bg-brand-card text-white rounded-[8px] p-4 shadow-md h-[347px]">
      <div className="text-[24px] font-semibold leading[1.32] tracking-normal text-white">
        Live Call Activity
      </div>
      <div className="text-base font-medium leading[1.32] tracking-normal text-white mt-1">
        Real-time agent status
      </div>
      <div className="mt-8 bg-[#9151DC] py-2 px-4 rounded-md flex flex-col items-start justify-between h-[69px] border border-[#FFFFFF4D] shadow-[0px_2px_2px_0px_#23272E14]">
        <div className="flex items-center gap-2 text-base font-medium leading[1.32] tracking-normal text-white">
          <Image src="/assets/activecall.svg" alt="call" width={18} height={14} className="mr-2" />{" "}
          Active Calls
        </div>
        <div className="text-xl font-semibold leading[1.32] tracking-normal text-white">
          {activeCalls}
        </div>
      </div>
      <div className="mt-4 bg-[#9151DC] py-2 px-4 rounded-md flex items-center justify-between h-[69px] border border-[#FFFFFF4D] shadow-[0px_2px_2px_0px_#23272E14]">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-[46px] h-[46px] rounded-full overflow-hidden bg-[#FFCB14] flex items-center justify-center">
            <span className="text-white font-medium text-[22px]">A</span>
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
