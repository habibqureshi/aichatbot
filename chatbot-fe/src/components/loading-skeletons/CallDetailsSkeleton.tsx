"use client";

import CallInfoCardSkeleton from "./CallInfoCardSkeleton";
import CallTabsSkeleton from "./CallTabsSkeleton";

export default function CallDetailsSkeleton() {
  return (
    <aside className="w-full h-fit">
      <div
        className="rounded-xl shadow-sm"
        style={{
          minHeight: "calc(100vh - 320px)",
          maxHeight: "calc(100vh - 220px)",
        }}
      >
        {/* Header - always visible */}
        <div className="p-6">
          <h3 className="font-semibold text-brand-dark text-lg md:text-[32px] leading-[1.32]">
            Call Details
          </h3>
        </div>

        {/* Info cards skeleton */}
        <div className="pb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <CallInfoCardSkeleton title="Customer Name" />
          <CallInfoCardSkeleton title="Call Duration" />
          <CallInfoCardSkeleton title="Call Date & Time" />
        </div>

        {/* Tabs skeleton */}
        <CallTabsSkeleton />
      </div>
    </aside>
  );
}
