"use client";

import { useRef, useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";

import { ChartConfig, ChartContainer } from "@/components/ui/chart";

const chartData = [
  { month: "Apr", successful: 50, failed: 80 },
  { month: "May", successful: 80, failed: 60 },
  { month: "Jun", successful: 70, failed: 75 },
  { month: "Jul", successful: 120, failed: 40 },
  { month: "Aug", successful: 100, failed: 55 },
  { month: "Sep", successful: 140, failed: 35 },
  { month: "Oct", successful: 130, failed: 50 },
  { month: "Nov", successful: 150, failed: 30 },
  { month: "Dec", successful: 160, failed: 45 },
  { month: "Jan", successful: 140, failed: 55 },
  { month: "Feb", successful: 130, failed: 50 },
  { month: "Mar", successful: 170, failed: 25 },
];

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

export default function CallsAreaChart({ className = "" }: { className?: string }) {
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
            domain={[0, 200]}
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
