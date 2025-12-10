"use client";
import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  TimeScale,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  TimeScale
);

const labels = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

const data = {
  labels,
  datasets: [
    {
      label: "Successful Calls",
      data: [50, 60, 70, 90, 80, 95, 110, 120, 140, 130, 120, 150],
      fill: true,
      backgroundColor: "rgba(99,37,169,0.15)",
      borderColor: "#6325A9",
      tension: 0.4,
      pointRadius: 0,
    },
    {
      label: "Failed Calls",
      data: [10, 8, 12, 15, 20, 18, 25, 26, 30, 40, 45, 22],
      fill: false,
      borderColor: "#EA4A4A",
      backgroundColor: "rgba(234,74,74,0.15)",
      tension: 0.4,
      pointRadius: 0,
    },
  ],
};

export default function LineChart({ className = "" }: { className?: string }) {
  return (
    <div className={`w-full h-[320px] ${className}`}>
      <Line
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true, position: "top" },
            tooltip: { mode: "index", intersect: false },
          },
          interaction: { mode: "index", intersect: false },
          scales: {
            x: { grid: { display: false } },
            y: { grid: { color: "#F3F4F6" }, beginAtZero: true },
          },
        }}
        data={data}
      />
    </div>
  );
}
