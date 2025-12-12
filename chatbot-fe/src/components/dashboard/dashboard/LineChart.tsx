"use client";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const chartData = [
  { month: "Apr", successful: 50, failed: 10 },
  { month: "May", successful: 60, failed: 8 },
  { month: "Jun", successful: 70, failed: 12 },
  { month: "Jul", successful: 90, failed: 15 },
  { month: "Aug", successful: 80, failed: 20 },
  { month: "Sep", successful: 95, failed: 18 },
  { month: "Oct", successful: 110, failed: 25 },
  { month: "Nov", successful: 120, failed: 26 },
  { month: "Dec", successful: 140, failed: 30 },
  { month: "Jan", successful: 130, failed: 40 },
  { month: "Feb", successful: 120, failed: 45 },
  { month: "Mar", successful: 150, failed: 22 },
];

const chartConfig = {
  successful: {
    label: "Successful Calls",
    color: "#6325A9",
  },
  failed: {
    label: "Failed Calls",
    color: "#EA4A4A",
  },
} satisfies ChartConfig;

export default function CallsAreaChart({ className = "" }: { className?: string }) {
  return (
    <div className={`w-full h-[320px] ${className}`}>
      <ChartContainer config={chartConfig}>
        <AreaChart
          accessibilityLayer
          data={chartData}
          margin={{
            left: 12,
            right: 12,
          }}
        >
          <CartesianGrid vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          <Area
            dataKey="failed"
            type="natural"
            fill="#EA4A4A"
            fillOpacity={0.4}
            stroke="#EA4A4A"
            stackId="a"
          />
          <Area
            dataKey="successful"
            type="natural"
            fill="#6325A9"
            fillOpacity={0.4}
            stroke="#6325A9"
            stackId="a"
          />
          <ChartLegend content={<ChartLegendContent />} />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
