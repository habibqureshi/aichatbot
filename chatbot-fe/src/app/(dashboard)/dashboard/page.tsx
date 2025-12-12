"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Conversation, getConversationsList } from "@/app/actions/conversations";
import { getTimeseries, TimeseriesResponse } from "@/app/actions/dashboardStats";

import MetricCard from "@/components/dashboard/dashboard/MetricCard";
import CallsAreaChart from "@/components/dashboard/dashboard/CallsAreaChart";
import LiveCallActivity from "@/components/dashboard/dashboard/LiveCallActivity";
import { DataTable, ExtendedColumnDef } from "@/components/common/DataTable";
import { StatusBadge, calculateDuration } from "@/lib/statusUtils";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";

export default function DashboardPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const metrics = useDashboardMetrics();
  const [timeseriesData, setTimeseriesData] = useState<TimeseriesResponse>([]);
  const [timeseriesLoading, setTimeseriesLoading] = useState(true);
  const user_timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const router = useRouter();
  // console.log("conversations", conversations);
  const columns: ExtendedColumnDef<Conversation>[] = [
    {
      accessorKey: "patient.name",
      header: "Patient Information",
      minWidth: "200px",
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-gray-900 truncate">{row.original.patient?.name || "N/A"}</div>
          <div className="text-sm text-gray-500 truncate">
            {row.original.patient?.phone_number || "N/A"}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "started_at",
      header: "Call Duration",
      minWidth: "140px",
      cell: ({ row }) => (
        <div className="text-sm text-gray-600">
          {calculateDuration(row.original.started_at, row.original.ended_at)}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      minWidth: "80px",
      cell: ({ row }) => <StatusBadge status={row.original.status || "N/A"} />,
    },
    {
      accessorKey: "id",
      header: "Call ID",
      minWidth: "100px",
      cell: ({ row }) => <div className="text-sm text-gray-600">{row.original.id}</div>,
    },
    {
      accessorKey: "call_sid",
      header: "Call SID",
      minWidth: "150px",
      cell: ({ row }) => <div className="text-sm text-gray-600 truncate">{row.original.call_sid}</div>,
    },
  ];

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true);
        const response = await getConversationsList(1, 3, user_timezone);
        setConversations(response.data);
      } catch (error) {
        console.error("Error fetching conversations:", error);
        setConversations([]);
      } finally {
        setLoading(false);
      }
    };
    fetchConversations();
  }, [user_timezone]);

  useEffect(() => {
    const fetchTimeseries = async () => {
      try {
        setTimeseriesLoading(true);

        // Get date range for last year
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);

        const start = startDate.toISOString().split("T")[0];
        const end = endDate.toISOString().split("T")[0];

        const response = await getTimeseries(start, end, "month");
        setTimeseriesData(response);
      } catch (error) {
        console.error("Error fetching timeseries:", error);
        setTimeseriesData([]);
      } finally {
        setTimeseriesLoading(false);
      }
    };

    fetchTimeseries();
  }, []);

  // Calculate totals from timeseries data
  const totalSuccessful = timeseriesData.reduce((sum, item) => sum + item.successful, 0);
  const totalFailed = timeseriesData.reduce((sum, item) => sum + item.failed, 0);
  const totalCalls = timeseriesData.reduce((sum, item) => sum + item.total, 0);
  const successfulPercentage = totalCalls > 0 ? Math.round((totalSuccessful / totalCalls) * 100) : 0;
  const failedPercentage = totalCalls > 0 ? Math.round((totalFailed / totalCalls) * 100) : 0;

  return (
    <div className="space-y-6 px-6">
      {/* Header / Title */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Dashboard</h1>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metrics.map((item, index) => (
          <MetricCard
            key={index}
            title={item.title}
            value={item.value}
            delta={item.delta}
            loading={item.loading}
          />
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-[#F6F7F9] rounded-[12px] p-6 pb-4 pt-4 shadow-sm border border-[#EEEFF2]">
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
                {/* <svg
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
                </svg> */}
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
                <span className="text-base font-bold text-gray-900">
                  {timeseriesLoading ? (
                    <div className="h-5 bg-gray-200 animate-pulse rounded w-12"></div>
                  ) : (
                    totalSuccessful.toLocaleString()
                  )}
                </span>
                <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded">
                  {timeseriesLoading ? (
                    <div className="h-4 bg-gray-200 animate-pulse rounded w-6"></div>
                  ) : (
                    `${successfulPercentage}%`
                  )}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#D5D9E2] inline-block" />
                <span className="text-xs text-gray-600 font-medium">Failed Calls</span>
              </div>
              <div className="flex items-center gap-2 ml-5">
                <span className="text-base font-bold text-gray-900">
                  {timeseriesLoading ? (
                    <div className="h-5 bg-gray-200 animate-pulse rounded w-12"></div>
                  ) : (
                    totalFailed.toLocaleString()
                  )}
                </span>
                <span className="text-xs text-red-700 bg-red-50 px-2 py-0.5 rounded">
                  {timeseriesLoading ? (
                    <div className="h-4 bg-gray-200 animate-pulse rounded w-6"></div>
                  ) : (
                    `${failedPercentage}%`
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Chart */}
          <CallsAreaChart data={timeseriesData} loading={timeseriesLoading} />
        </div>

        <div className="lg:col-span-5">
          <LiveCallActivity />
        </div>

        <div className="lg:col-span-12">
          <DataTable
            title="Recent Calls"
            columns={columns}
            data={conversations}
            initialLoading={loading}
            enablePagination={false}
            showSearch={false}
            actionButton={
              <div
                className="text-sm text-brand-purple cursor-pointer"
                onClick={() => router.push("/calls")}
              >
                View All
              </div>
            }
            tableMinHeight="300px"
            tableMaxHeight="500px"
          />
        </div>
        {/* <div className="lg:col-span-12  bg-[#F6F7F9] rounded-[12px]">
          <SentimentBar
            positive={2456}
            neutral={756}
            negative={266}
            iconSize={44}
            emojiSize={24}
            fillColors={{ positive: "#337F3F", neutral: "#F9A307", negative: "#C61E12" }}
            progressBarColors={["#984AF8", "#E34998", "#4318FF"]}
          />
        </div> */}
      </div>
    </div>
  );
}
