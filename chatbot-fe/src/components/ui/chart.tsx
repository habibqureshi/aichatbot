"use client";
import React from "react";
import { Legend, Tooltip } from "recharts";

export type ChartConfig = Record<string, { label: string; color: string }>;

export function ChartContainer({
  children,
  config,
  className = "",
}: {
  children: React.ReactNode;
  config?: ChartConfig;
  className?: string;
}) {
  // Set CSS variables with provided colors for each config key
  const style: Record<string, string> = {};
  if (config) {
    Object.keys(config).forEach((key) => {
      const color = config[key].color;
      style[`--color-${key}`] = color;
    });
  }
  return (
    <div style={style} className={`w-full ${className}`}>
      {children}
    </div>
  );
}

export { Legend, Tooltip };

export const ChartLegend = Legend;
export const ChartTooltip = Tooltip;

export function ChartLegendContent() {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[var(--color-successful)] block" />
        <span className="text-sm">Successful Calls</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[var(--color-failed)] block" />
        <span className="text-sm">Failed Calls</span>
      </div>
    </div>
  );
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    color: string;
    dataKey: string;
    name: string;
    value: number;
    payload: Record<string, unknown>;
  }>;
  label?: string;
}

export function ChartTooltipContent({ active, payload, label }: TooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-1 gap-2">
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">{label}</span>
            {payload.map((entry, index) => (
              <span key={index} className="font-bold" style={{ color: entry.color }}>
                {entry.name}: {entry.value}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export default ChartContainer;
