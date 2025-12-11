"use client";

import { useRef, useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";

import { ChartConfig, ChartContainer } from "@/components/ui/chart";
import { TimeseriesData } from "@/app/actions/dashboardStats";

const chartConfig = {
  successful: {
    label: "Successful Calls",
    color: "#863ED8",
  },
  failed: {
    label: "Failed Calls",
    color: "#D5D9E2",
  },
} satisfies ChartConfig;

interface CallsAreaChartProps {
  data?: TimeseriesData[];
  loading?: boolean;
  className?: string;
}

export default function CallsAreaChart({
  data = [],
  loading = false,
  className = "",
}: CallsAreaChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(680);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setChartWidth(containerRef.current.offsetWidth);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Transform API data to chart format and add dummy data for better visualization
  //TODO: remove dummy data when real data is sufficient
  const transformChartData = (apiData: TimeseriesData[]) => {
    // Create a base dataset with dummy data for a full year
    const baseData = [
      { month: "Jan", successful: 45, failed: 12 },
      { month: "Feb", successful: 52, failed: 15 },
      { month: "Mar", successful: 48, failed: 11 },
      { month: "Apr", successful: 91, failed: 18 },
      { month: "May", successful: 55, failed: 14 },
      { month: "Jun", successful: 67, failed: 20 },
      { month: "Jul", successful: 72, failed: 22 },
      { month: "Aug", successful: 68, failed: 19 },
      { month: "Sep", successful: 75, failed: 21 },
      { month: "Oct", successful: 82, failed: 24 },
      { month: "Nov", successful: 78, failed: 23 },
      { month: "Dec", successful: 85, failed: 25 },
    ];

    // If we have API data, replace the corresponding months with real data
    if (apiData.length > 0) {
      apiData.forEach((item) => {
        const monthNum = parseInt(item.label.split("-")[1]);
        const monthNames = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];
        const monthName = monthNames[monthNum - 1];

        if (monthName) {
          const index = baseData.findIndex((d) => d.month === monthName);
          if (index !== -1) {
            baseData[index] = {
              month: monthName,
              successful: item.successful,
              failed: item.failed,
            };
          }
        }
      });
    }

    return baseData;
  };

  const chartData = transformChartData(data);
  // const chartData = data.map(item => ({
  //   month: item.label,
  //   successful: item.successful,
  //   failed: item.failed,
  // }));

  // Calculate max value for Y-axis
  const maxValue = Math.max(
    ...chartData.map((item) => Math.max(item.successful, item.failed)),
    200 // minimum
  );

  if (loading) {
    return <div ref={containerRef} className="w-full h-[160px] bg-gray-50 animate-pulse rounded"></div>;
  }

  return (
    <div ref={containerRef} className="w-full">
      <ChartContainer config={chartConfig} className={className}>
        <AreaChart
          accessibilityLayer
          data={chartData}
          margin={{
            left: 0,
            right: 0,
            top: 20,
            bottom: 0,
          }}
          width={chartWidth}
          height={160}
        >
          <defs>
            <linearGradient id="colorSuccessful" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#863ED8" stopOpacity={0.7} />
              <stop offset="100%" stopColor="#863ED8" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D5D9E2" stopOpacity={0.6} />
              <stop offset="100%" stopColor="#D5D9E2" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="#E5E7EB" />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tickMargin={12}
            tick={{ fill: "#A8ACBA", fontSize: 11, fontWeight: 500 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#A8ACBA", fontSize: 11 }}
            width={40}
            domain={[0, maxValue]}
          />
          <Tooltip
            cursor={{ fill: "rgba(134, 62, 216, 0.1)" }}
            contentStyle={{
              background: "rgba(255, 255, 255, 0.98)",
              border: "1px solid #E5E7EB",
              borderRadius: "8px",
              padding: "12px 14px",
              boxShadow: "0 6px 12px rgba(0, 0, 0, 0.12)",
            }}
            formatter={(value) => [`${value}`, ""]}
          />
          <Area
            type="natural"
            dataKey="failed"
            stroke="#D5D9E2"
            fill="url(#colorFailed)"
            fillOpacity={1}
            strokeWidth={2}
            dot={false}
            isAnimationActive={true}
          />
          <Area
            type="natural"
            dataKey="successful"
            stroke="#863ED8"
            fill="url(#colorSuccessful)"
            fillOpacity={1}
            strokeWidth={3}
            dot={false}
            isAnimationActive={true}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
