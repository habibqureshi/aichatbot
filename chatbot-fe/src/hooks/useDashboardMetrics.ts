import { useState, useEffect } from "react";
import { getTotalCalls, getAverageDuration, getConversionRate } from "@/app/actions/dashboardStats";

interface MetricData {
  title: string;
  value: string;
  delta: string;
  loading: boolean;
}

export const useDashboardMetrics = () => {
  const [metrics, setMetrics] = useState<MetricData[]>([
    {
      title: "Total Calls",
      value: "0",
      delta: "0%",
      loading: true,
    },
    {
      title: "Average Duration",
      value: "0:00",
      delta: "0%",
      loading: true,
    },
    {
      title: "Conversion Rate",
      value: "0%",
      delta: "0%",
      loading: true,
    },
  ]);

  useEffect(() => {
    const fetchMetricsComparison = async () => {
      try {
        // Calculate date ranges
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

        const formatDate = (date: Date) => date.toISOString().split("T")[0];

        const currentStart = formatDate(currentMonthStart);
        const currentEnd = formatDate(currentMonthEnd);
        const previousStart = formatDate(previousMonthStart);
        const previousEnd = formatDate(previousMonthEnd);

        // Fetch data for both months in parallel
        const [
          currentTotalCalls,
          currentAvgDuration,
          currentConversionRate,
          previousTotalCalls,
          previousAvgDuration,
          previousConversionRate,
        ] = await Promise.all([
          getTotalCalls(currentStart, currentEnd).catch(() => ({ total: 0 })),
          getAverageDuration(currentStart, currentEnd).catch(() => ({ average_seconds: 0 })),
          getConversionRate(currentStart, currentEnd).catch(() => ({ conversion_rate: 0 })),
          getTotalCalls(previousStart, previousEnd).catch(() => ({ total: 0 })),
          getAverageDuration(previousStart, previousEnd).catch(() => ({ average_seconds: 0 })),
          getConversionRate(previousStart, previousEnd).catch(() => ({ conversion_rate: 0 })),
        ]);

        // Calculate deltas and format values
        const calculateDelta = (current: number, previous: number): string => {
          if (previous === 0) return current > 0 ? "+100%" : "0%";
          const change = ((current - previous) / previous) * 100;
          const sign = change >= 0 ? "+" : "";
          return `${sign}${change.toFixed(0)}%`;
        };

        const formatDuration = (seconds: number): string => {
          const minutes = Math.floor(seconds / 60);
          const remainingSeconds = Math.floor(seconds % 60);
          return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
            .toString()
            .padStart(2, "0")}`;
        };

        const newMetrics: MetricData[] = [
          {
            title: "Total Calls",
            value: currentTotalCalls.total.toLocaleString(),
            delta: calculateDelta(currentTotalCalls.total, previousTotalCalls.total),
            loading: false,
          },
          {
            title: "Average Duration",
            value: formatDuration(currentAvgDuration.average_seconds),
            delta: calculateDelta(
              currentAvgDuration.average_seconds,
              previousAvgDuration.average_seconds
            ),
            loading: false,
          },
          {
            title: "Conversion Rate",
            value: `${Math.round(currentConversionRate.conversion_rate)}%`,
            delta: calculateDelta(
              currentConversionRate.conversion_rate,
              previousConversionRate.conversion_rate
            ),
            loading: false,
          },
        ];

        setMetrics(newMetrics);
      } catch (error) {
        console.error("Error fetching metrics comparison:", error);
        // Set loading to false on error
        setMetrics((prev) => prev.map((metric) => ({ ...metric, loading: false })));
      }
    };

    fetchMetricsComparison();
  }, []);

  return metrics;
};
