"use client";
import React from "react";
import { Conversation } from "@/app/actions/conversations";
type MockConversation = Conversation & { summary?: string };

import MetricCard from "@/components/dashboard/dashboard/MetricCard";
import CallsAreaChart from "@/components/dashboard/dashboard/CallsAreaChart";
import LiveCallActivity from "@/components/dashboard/dashboard/LiveCallActivity";

export default function DashboardPage() {
  const mockCalls: MockConversation[] = [
    {
      id: 1,
      patient: {
        id: 101,
        name: "Brooklyn Simmons",
        phone_number: "+1 234 567 891",
        created_at: new Date().toISOString(),
      },
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
      status: "completed",
      call_sid: "SID123456",
      summary: "Appointment scheduled, interested in consultation.",
    },
    {
      id: 2,
      patient: {
        id: 102,
        name: "Marvin McKinney",
        phone_number: "+1 234 999 999",
        created_at: new Date().toISOString(),
      },
      started_at: new Date().toISOString(),
      ended_at: "",
      status: "ongoing",
      call_sid: "SID234567",
      summary: "Left voicemail with callback number.",
    },
    {
      id: 3,
      patient: {
        id: 103,
        name: "Guy Hawkins",
        phone_number: "+1 234 888 111",
        created_at: new Date().toISOString(),
      },
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
      status: "completed",
      call_sid: "SID345678",
      summary: "Converted to sale, sending follow-up info.",
    },
  ];
  const metrics = [
    {
      title: "Total Calls",
      value: "3.4K",
      delta: "+21%",
    },
    {
      title: "Average Duration",
      value: "4:32",
      delta: "-17%",
    },
    {
      title: "Conversion Rate",
      value: "84%",
      delta: "+24%",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header / Title */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Dashboard</h1>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metrics.map((item, index) => (
          <MetricCard key={index} title={item.title} value={item.value} delta={item.delta} />
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Chart */}
        <div className="lg:col-span-7 bg-[#F6F7F9] rounded-[12px] p-6 shadow-sm border border-[#EEEFF2]">
          {/* Header with Title and Filter */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-lg font-bold text-gray-900">Overall Call Volume</div>
              <div className="text-xs text-gray-500 mt-0.5">Last Year</div>
            </div>

            {/* Dropdown Filter */}
            <div className="relative group">
              <button className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                <span>Last Year</span>
                <svg
                  className="w-4 h-4 transform group-hover:rotate-180 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              </button>
              {/* Dropdown Menu */}
              {/* <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg">
                  Last Year
                </button>
                <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  Last 6 Months
                </button>
                <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  Last 3 Months
                </button>
                <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 last:rounded-b-lg">
                  Last Month
                </button>
              </div> */}
            </div>
          </div>

          {/* Legend - Vertical Layout */}
          <div className="flex gap-8 mb-6 pb-4 border-b border-gray-200">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#863ED8] inline-block" />
                <span className="text-xs text-gray-600 font-medium">Successful Calls</span>
              </div>
              <div className="flex items-center gap-2 ml-5">
                <span className="text-base font-bold text-gray-900">4532</span>
                <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded">55%</span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#D5D9E2] inline-block" />
                <span className="text-xs text-gray-600 font-medium">Failed Calls</span>
              </div>
              <div className="flex items-center gap-2 ml-5">
                <span className="text-base font-bold text-gray-900">600</span>
                <span className="text-xs text-red-700 bg-red-50 px-2 py-0.5 rounded">24%</span>
              </div>
            </div>
          </div>

          {/* Chart */}
          <CallsAreaChart />
        </div>
        {/* Right: Live Call Activity */}
        <div className="lg:col-span-5">
          <LiveCallActivity />
        </div>
        {/* Secondary grid: Recent Calls + Sentiment */}
        {/* <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <div className="bg-white rounded-[12px] p-6 shadow-sm border border-transparent">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-base">Recent Calls</div>
              <div className="text-sm text-brand-purple">View All</div>
            </div>
            <div className="mt-4 divide-y">
              {mockCalls.map((c) => (
                <CallCard key={c.id} conversation={c} />
              ))}
            </div>
          </div>
        </div> */}
        {/* <div className="lg:col-span-4">
          <SentimentBar positive={2456} neutral={756} negative={266} />
        </div> */}{" "}
      </div>
    </div>
  );
}
