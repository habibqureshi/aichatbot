"use client";

export default function CallCardSkeleton() {
  return (
    <div className="cursor-pointer flex items-start gap-1 p-6 min-h-[200px] border-b border-gray-200 animate-pulse">
      {/* Avatar skeleton */}
      <div className="flex-shrink-0 w-[47px] h-[47px] rounded-full bg-gray-200"></div>

      <div className="flex-1 min-w-0">
        {/* Name and phone skeleton */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 ml-2">
            <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-24"></div>
          </div>
          {/* Sentiment badge skeleton */}
          <div className="h-5 bg-gray-200 rounded-full w-16"></div>
        </div>

        {/* Time and duration skeleton */}
        <div className="flex flex-col items-start justify-between mt-4">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded w-12"></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded w-10"></div>
            </div>
          </div>
          {/* Status badge skeleton */}
          <div className="h-6 bg-gray-200 rounded w-20 mt-4"></div>
        </div>

        {/* Summary skeleton */}
        <div className="mt-2">
          <div className="h-4 bg-gray-200 rounded w-full mb-1"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    </div>
  );
}
