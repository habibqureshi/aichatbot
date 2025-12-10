"use client";
import React from "react";
import type { Conversation } from "@/app/actions/conversations";
type MockConversation = Conversation & { summary?: string };
import MetricCard from "@/components/dashboard/dashboard/MetricCard";
import LineChart from "@/components/dashboard/dashboard/LineChart";
import LiveCallActivity from "@/components/dashboard/dashboard/LiveCallActivity";
import SentimentBar from "@/components/dashboard/dashboard/SentimentBar";
import CallCard from "@/components/dashboard/CallCard";

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
        <div className="lg:col-span-7 bg-white rounded-[12px] p-6 shadow-sm border border-transparent">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-base font-semibold">Overall Call Volume</div>
              <div className="text-xs text-gray-500">Last Year</div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-[#6325A9] inline-block" />
                <span className="text-gray-700 font-medium">Successful Calls</span>
                <span className="text-xs text-gray-400 ml-2">4532</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-[#EA4A4A] inline-block" />
                <span className="text-gray-700 font-medium">Failed Calls</span>
                <span className="text-xs text-gray-400 ml-2">600</span>
              </div>
            </div>
          </div>
          <LineChart />
        </div>

        {/* Right: Live Call Activity */}
        {/* <div className="lg:col-span-5">
          <LiveCallActivity />
        </div>
      </div> */}

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
        </div> */}
      </div>
    </div>
  );
}
