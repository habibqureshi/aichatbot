"use client";

export default function KnowledgeSkeleton() {
  return (
    <div className="p-2 sm:p-4 lg:p-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Knowledge Management</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          Train your AI agent and manage its knowledge base
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          {/* GreetingConfiguration Skeleton */}
          <div
            className="backdrop-blur-sm border rounded-xl p-4 sm:p-6 shadow-sm h-auto lg:min-h-[400px] flex flex-col"
            style={{
              background: "#FFFFFF",
              borderColor: "#F0EEFF",
            }}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-14 h-14 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="flex-1">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
              </div>
            </div>

            <div className="space-y-4 flex-1">
              <div>
                <div className="h-5 bg-gray-200 rounded w-1/3 mb-2 animate-pulse"></div>
                <div className="h-20 bg-gray-100 rounded-lg animate-pulse"></div>
              </div>

              <div className="flex justify-end">
                <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-full animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>

          {/* MenuTopics Skeleton */}
          <div
            className="backdrop-blur-sm border rounded-xl p-4 sm:p-6 shadow-sm h-auto lg:min-h-[430px] flex flex-col"
            style={{
              background: "#FFFFFF",
              borderColor: "#F0EEFF",
            }}
          >
            <div className="flex items-start gap-3 mb-8">
              <div className="flex-shrink-0 w-14 h-14 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="flex-1">
                <div className="h-6 bg-gray-200 rounded w-1/2 mb-2 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
              </div>
            </div>

            <div className="space-y-4 flex-1">
              {/* Menu items skeleton */}
              <div className="space-y-2 h-[238px] overflow-hidden">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="w-full flex justify-between items-center gap-4 px-4 py-3 rounded-[15px] bg-gray-100 animate-pulse h-9"
                  >
                    <div className="flex items-center justify-start gap-2">
                      <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add new topic skeleton */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 h-9 bg-gray-100 rounded-lg animate-pulse"></div>
                <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          {/* KnowledgeBase Skeleton */}
          <div
            className="backdrop-blur-sm border rounded-xl p-4 sm:p-6 shadow-sm h-auto lg:min-h-[400px] flex flex-col"
            style={{
              background: "#FFFFFF",
              borderColor: "#F0EEFF",
            }}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-14 h-14 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="flex-1">
                <div className="h-6 bg-gray-200 rounded w-1/2 mb-2 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
              </div>
            </div>

            <div className="space-y-3 flex-1">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 animate-pulse"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex-shrink-0 w-9 h-9 bg-gray-200 rounded-lg"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                  <div className="w-5 h-5 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>

          {/* FileUpload Skeleton */}
          <div
            className="backdrop-blur-sm border rounded-xl p-4 sm:p-6 shadow-sm h-auto lg:min-h-[430px] flex flex-col"
            style={{
              background: "#FFFFFF",
              borderColor: "#F0EEFF",
            }}
          >
            <div className="flex items-start gap-3 mb-8">
              <div className="flex-shrink-0 w-14 h-14 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="flex-1">
                <div className="h-6 bg-gray-200 rounded w-1/2 mb-2 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
              </div>
            </div>

            <div className="space-y-4 flex-1">
              {/* Drag & drop area skeleton */}
              <div className="w-full h-52 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 animate-pulse flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>

              {/* Upload button skeleton */}
              <div className="flex justify-end">
                <div className="h-10 bg-gray-200 rounded w-full sm:w-32 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
