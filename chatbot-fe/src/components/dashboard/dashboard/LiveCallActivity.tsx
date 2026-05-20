"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { getConversationsList, Conversation } from "@/app/actions/conversations";

export default function LiveCallActivity() {
  const [liveData, setLiveData] = useState<Conversation[] | null>(null);
  const [loading, setLoading] = useState(false);
  const user_timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    const fetchLiveActivity = async () => {
      try {
        setLoading(true);
        const response = await getConversationsList(1, 1, user_timezone, "active");
        setLiveData(response.data);
      } catch (error) {
        console.error("Error fetching live activity:", error);
        setLiveData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchLiveActivity();

    // Refresh every 30 seconds
    // const interval = setInterval(fetchLiveActivity, 30000);
    // return () => clearInterval(interval);
  }, [user_timezone]);

  const formatDuration = (startedAt: string): string => {
    const start = new Date(startedAt);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();

    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  const getInitials = (name: string): string => {
    if (!name || name === "Unknown") return "U";
    return name
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase())
      .join("")
      .slice(0, 2);
  };

  return (
    <div className="bg-brand-card text-white rounded-[8px] p-4 shadow-md h-[347px]">
      <div className="text-[24px] font-semibold leading[1.32] tracking-normal text-white">
        Live Call Activity
      </div>
      <div className="text-base font-medium leading[1.32] tracking-normal text-white mt-1">
        Real-time agent status
      </div>

      {/* Active Calls Count */}
      <div className="mt-8 bg-[#9151DC] py-2 px-4 rounded-md flex flex-col items-start justify-between h-[69px] border border-[#FFFFFF4D] shadow-[0px_2px_2px_0px_#23272E14]">
        <div className="flex items-center gap-2 text-base font-medium leading[1.32] tracking-normal text-white">
          <Image src="/assets/activecall.svg" alt="call" width={18} height={14} className="mr-2" />{" "}
          Active Calls
        </div>
        <div className="text-xl font-semibold leading[1.32] tracking-normal text-white">
          {loading ? (
            <div className="h-6 bg-white/20 animate-pulse rounded w-8"></div>
          ) : (
            liveData?.length || 0
          )}
        </div>
      </div>

      {/* Live Calls List */}
      <div className="mt-4 space-y-2 max-h-[120px] overflow-y-auto">
        {loading ? (
          // Loading skeleton
          <div className="bg-[#9151DC] py-2 px-4 rounded-md h-[69px] border border-[#FFFFFF4D] shadow-[0px_2px_2px_0px_#23272E14]">
            <div className="flex items-center gap-3 h-full">
              <div className="flex-shrink-0 w-[46px] h-[46px] rounded-full bg-white/20 animate-pulse"></div>
              <div className="flex-1">
                <div className="h-4 bg-white/20 animate-pulse rounded mb-1 w-20"></div>
                <div className="h-3 bg-white/20 animate-pulse rounded w-16"></div>
              </div>
              <div className="h-3 bg-white/20 animate-pulse rounded w-12"></div>
            </div>
          </div>
        ) : (
          <div className="bg-[#9151DC] py-2 px-4 rounded-md flex items-center justify-between h-[69px] border border-[#FFFFFF4D] shadow-[0px_2px_2px_0px_#23272E14]">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-[46px] h-[46px] rounded-full overflow-hidden bg-[#FFCB14] flex items-center justify-center">
                <span className="text-white font-medium text-[22px]">
                  {liveData && liveData.length > 0 ? getInitials(liveData[0].patient?.name) : "U"}
                </span>
              </div>
              <div>
                <div className="text-base font-bold leading[1.32] tracking-normal text-white truncate max-w-[120px]">
                  {liveData && liveData.length > 0 ? liveData[0].patient?.name : "No Active Calls"}
                </div>
                <div className="text-base font-normal leading[1.32] tracking-normal text-white">
                  {liveData && liveData.length > 0 ? "On Call" : ""}
                </div>
              </div>
            </div>
            {liveData && liveData.length > 0 && (
              <div className="text-xs text-white">{formatDuration(liveData[0].started_at)}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
