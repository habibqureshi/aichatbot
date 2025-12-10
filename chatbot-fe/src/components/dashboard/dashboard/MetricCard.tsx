"use client";
import React from "react";

type MetricCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  delta?: string; // e.g., +21%
};

export default function MetricCard({ title, value, subtitle, delta }: MetricCardProps) {
  return (
    <div className="bg-white rounded-[12px] p-5 shadow-sm border border-transparent">
      <div className="text-xs text-gray-500 font-medium">{title}</div>
      <div className="text-2xl font-extrabold text-black mt-2">{value}</div>
      {subtitle && <div className="text-sm text-gray-400 mt-1">{subtitle}</div>}
      {delta && (
        <div
          className={`text-xs mt-2 inline-block font-semibold ${
            delta.startsWith("+") ? "text-green-600" : "text-red-600"
          }`}
        >
          {delta} Compared to last month
        </div>
      )}
    </div>
  );
}
