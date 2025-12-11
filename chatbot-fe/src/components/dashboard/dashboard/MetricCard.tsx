"use client";
import React from "react";

type MetricCardProps = {
  title: string;
  value: string | number;
  delta?: string; // e.g., +21%
  loading?: boolean;
};

export default function MetricCard({ title, value, delta, loading = false }: MetricCardProps) {
  return (
    <div className=" p-4 bg-[#FFFFFF] border border-[#D5D9E2] shadow-[0px_1px_1px_0px_#23272E14] rounded-[8px] ">
      <div className="text-base font-medium text-brand-dark leading-[1.32]  tracking-[0%]">{title}</div>
      <div className="text-[40px] font-semibold text-brand-dark leading-[1.32]  tracking-[0%] mt-2">
        {loading ? <div className="h-[40px] w-20 bg-gray-200 animate-pulse rounded my-2"></div> : value}
      </div>

      {delta && (
        <div className="text-[14px] mt-2  flex items-center font-semibold  ">
          {loading ? (
            <div className="h-[23px] w-12 bg-gray-200 animate-pulse rounded inline-block mt-2 mr-2"></div>
          ) : (
            <span
              className={`inline-flex items-center justify-center h-[28px] px-2 rounded ${
                delta.startsWith("+") ? "text-[#337F3F] bg-[#E2FBE8]" : "text-[#C64C7F] bg-[#F9E8F3]"
              }`}
            >
              {delta}
            </span>
          )}

          <span className="text-[#64748B] font-medium leading[1.32] tracking-normal ml-2">
            Compared to last month
          </span>
        </div>
      )}
    </div>
  );
}
