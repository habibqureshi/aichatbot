"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Conversation, getConversationsList } from "@/app/actions/conversations";
import { getTotalCalls, getAverageDuration, getConversionRate } from "@/app/actions/dashboardStats";

import MetricCard from "@/components/dashboard/dashboard/MetricCard";
import CallsAreaChart from "@/components/dashboard/dashboard/CallsAreaChart";
import LiveCallActivity from "@/components/dashboard/dashboard/LiveCallActivity";
import { DataTable, ExtendedColumnDef } from "@/components/common/DataTable";
import { StatusBadge, calculateDuration } from "@/lib/statusUtils";
import SentimentBar from "@/components/dashboard/dashboard/SentimentBar";

export default function DashboardPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState({
    totalCalls: true,
    averageDuration: true,
    conversionRate: true,
  });
  const [metrics, setMetrics] = useState([
    {
      title: "Total Calls",
      value: "0",
      delta: "0%",
    },
    {
      title: "Average Duration",
      value: "0:00",
      delta: "0%",
    },
    {
      title: "Conversion Rate",
      value: "0%",
      delta: "0%",
    },
  ]);
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
      minWidth: "200px",
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
    const fetchMetrics = async () => {
      try {
        // Set all metrics to loading initially
        setMetricsLoading({
          totalCalls: true,
          averageDuration: true,
          conversionRate: true,
        });

        // Get date range for last 30 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        const start = startDate.toISOString().split("T")[0];
        const end = endDate.toISOString().split("T")[0];

        // Fetch metrics individually to handle failures gracefully
        const metricsData = [
          {
            title: "Total Calls",
            value: "0",
            delta: "0%",
          },
          {
            title: "Average Duration",
            value: "0:00",
            delta: "0%",
          },
          {
            title: "Conversion Rate",
            value: "0%",
            delta: "0%",
          },
        ];

        // Fetch total calls
        try {
          const totalCallsRes = await getTotalCalls(start, end);
          metricsData[0].value = totalCallsRes.total.toLocaleString();
        } catch (error) {
          console.error("Error fetching total calls:", error);
        } finally {
          setMetricsLoading((prev) => ({ ...prev, totalCalls: false }));
        }

        // Fetch average duration
        try {
          const avgDurationRes = await getAverageDuration(start, end);
          metricsData[1].value = formatDuration(avgDurationRes.average_seconds);
        } catch (error) {
          console.error("Error fetching average duration:", error);
        } finally {
          setMetricsLoading((prev) => ({ ...prev, averageDuration: false }));
        }

        // Fetch conversion rate
        try {
          const conversionRateRes = await getConversionRate(start, end);
          metricsData[2].value = `${Math.round(conversionRateRes.conversion_rate)}%`;
        } catch (error) {
          console.error("Error fetching conversion rate:", error);
        } finally {
          setMetricsLoading((prev) => ({ ...prev, conversionRate: false }));
        }

        setMetrics(metricsData);
      } catch (error) {
        console.error("Error in fetchMetrics:", error);

        setMetricsLoading({
          totalCalls: false,
          averageDuration: false,
          conversionRate: false,
        });
      }
    };

    fetchMetrics();
  }, []);

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6 px-6">
      {/* Header / Title */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Dashboard</h1>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metrics.map((item, index) => {
          let loading = false;
          if (item.title === "Total Calls") {
            loading = metricsLoading.totalCalls;
          } else if (item.title === "Average Duration") {
            loading = metricsLoading.averageDuration;
          } else if (item.title === "Conversion Rate") {
            loading = metricsLoading.conversionRate;
          }
          return (
            <MetricCard
              key={index}
              title={item.title}
              value={item.value}
              delta={item.delta}
              loading={loading}
            />
          );
        })}
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

        <div className="lg:col-span-5">
          <LiveCallActivity />
        </div>

        <div className="lg:col-span-12">
          <DataTable
            title="Recent Calls"
            columns={columns}
            data={conversations}
            loading={loading}
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
        <div className="lg:col-span-12  bg-[#F6F7F9] rounded-[12px]">
          <SentimentBar
            positive={2456}
            neutral={756}
            negative={266}
            iconSize={44}
            emojiSize={24}
            fillColors={{ positive: "#337F3F", neutral: "#F9A307", negative: "#C61E12" }}
            progressBarColors={["#984AF8", "#E34998", "#4318FF"]}
          />
        </div>
      </div>
    </div>
  );
}
