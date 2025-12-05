"use client";

interface SkeletonLoaderProps {
  className?: string;
}

export const AddDoctorSkeleton = ({ className = "" }: SkeletonLoaderProps) => (
  <div className={`p-6 ${className}`}>
    {/* Header Skeleton */}
    <div className="flex justify-between items-center mb-6">
      <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
    </div>

    <div className="bg-transparent p-6 space-y-6">
      {/* Doctor Information Card Skeleton */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="border-b border-gray-200 pb-2 mb-4">
          <div className="h-5 bg-gray-200 rounded w-48 animate-pulse mb-1"></div>
          <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <div className="h-4 bg-gray-200 rounded w-24 animate-pulse mb-2"></div>
            <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div>
            <div className="h-4 bg-gray-200 rounded w-24 animate-pulse mb-2"></div>
            <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Specialty Selection Card Skeleton */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="border-b border-gray-200 pb-2 mb-4">
          <div className="h-5 bg-gray-200 rounded w-20 animate-pulse mb-1"></div>
          <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
        </div>
        <div className="max-w-md">
          <div className="h-4 bg-gray-200 rounded w-16 animate-pulse mb-2"></div>
          <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>

      {/* Duration Card Skeleton */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="border-b border-gray-200 pb-2 mb-4">
          <div className="h-5 bg-gray-200 rounded w-40 animate-pulse mb-1"></div>
          <div className="h-4 bg-gray-200 rounded w-56 animate-pulse"></div>
        </div>
        <div className="max-w-md">
          <div className="h-4 bg-gray-200 rounded w-16 animate-pulse mb-3"></div>
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>

      {/* Time Slots Card Skeleton */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="border-b border-gray-200 pb-2 mb-4">
          <div className="h-5 bg-gray-200 rounded w-20 animate-pulse mb-1"></div>
          <div className="h-4 bg-gray-200 rounded w-56 animate-pulse"></div>
        </div>
        <div className="space-y-4">
          <div className="max-w-lg">
            <div className="h-4 bg-gray-200 rounded w-40 animate-pulse mb-2"></div>
            <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>

        {/* Created Time Slots Skeleton */}
        <div className="mt-6">
          <div className="h-5 bg-gray-200 rounded w-32 animate-pulse mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-16 animate-pulse mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
                  </div>
                  <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Submit Button Skeleton */}
      <div className="flex justify-end pt-6 border-t border-gray-200">
        <div className="h-12 bg-gray-200 rounded-lg w-40 animate-pulse"></div>
      </div>
    </div>
  </div>
);

export const SpecialtySkeleton = () => (
  <div className="max-w-md">
    <div className="h-4 bg-gray-200 rounded w-16 animate-pulse mb-2"></div>
    <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
  </div>
);
