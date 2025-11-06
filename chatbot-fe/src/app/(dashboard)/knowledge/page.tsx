"use client";

export default function KnowledgePage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Current Knowledge</h1>
        <p className="text-gray-600 mt-1">View and manage the system&apos;s current knowledge base</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Knowledge Base</h3>
          <p className="mt-1 text-sm text-gray-500">what needs to be shown here.</p>
          <div className="mt-6">
            <p className="text-xs text-gray-400">
              This section is under development. Please check back later for detailed implementation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
