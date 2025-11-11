"use client";

import { useState, useEffect, useCallback } from "react";
import { DataTable, ExtendedColumnDef } from "@/components/common/DataTable";
import { getConversationsList, Conversation } from "@/app/actions/conversations";
import { toast } from "react-toastify";

const StatusBadge = ({ status }: { status: string }) => {
  const statusStyles: Record<string, string> = {
    completed: "bg-green-100 text-green-800",
    "in-progress": "bg-blue-100 text-blue-800",
    failed: "bg-red-100 text-red-800",
    missed: "bg-yellow-100 text-yellow-800",
  };

  return (
    <span
      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
        statusStyles[status] || "bg-gray-100 text-gray-800"
      }`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const calculateDuration = (startedAt: string, endedAt: string | null): string => {
  if (!endedAt) return "00:00";

  const start = new Date(startedAt);
  const end = new Date(endedAt);
  const diffMs = end.getTime() - start.getTime();

  if (diffMs <= 0) return "00:00";

  const minutes = Math.floor(diffMs / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);

  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

const columns: ExtendedColumnDef<Conversation>[] = [
  {
    accessorKey: "patient.name",
    header: "Patient Information",
    width: "200px",
    cell: ({ row }) => (
      <div>
        <div className="font-medium text-gray-900">{row.original.patient?.name || "N/A"}</div>
        <div className="text-sm text-gray-500">{row.original.patient?.phone_number || "N/A"}</div>
      </div>
    ),
  },
  {
    accessorKey: "started_at",
    header: "Call Duration",
    width: "120px",
    cell: ({ row }) => (
      <div className="text-sm text-gray-600">
        {calculateDuration(row.original.started_at, row.original.ended_at)}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    width: "120px",
    cell: ({ row }) => <StatusBadge status={row.original.status || "N/A"} />,
  },
  {
    accessorKey: "call_sid",
    header: "Call SID",
    width: "180px",
    cell: ({ row }) => (
      <div className="text-sm text-gray-600 font-mono">{row.original.call_sid || "N/A"}</div>
    ),
  },
  {
    id: "started_at_display",
    header: "Started At",
    width: "160px",
    cell: ({ row }) => (
      <div className="text-sm text-gray-600">
        {row.original.started_at ? new Date(row.original.started_at).toLocaleString() : "N/A"}
      </div>
    ),
  },
  {
    id: "ended_at_display",
    header: "Ended At",
    width: "160px",
    cell: ({ row }) => (
      <div className="text-sm text-gray-600">
        {row.original.ended_at ? new Date(row.original.ended_at).toLocaleString() : "Ongoing"}
      </div>
    ),
  },
];

export default function CallsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const user_timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalConversations, setTotalConversations] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Status options passed from parent
  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "active", label: "Active" },
    { value: "ended", label: "Ended" },
  ];

  // Debounced search value
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchConversations = useCallback(
    async (page: number = 1, limit: number = 10, name: string = "") => {
      try {
        setLoading(true);
        const response = await getConversationsList(
          page,
          limit,
          user_timezone,
          statusFilter === "all" ? undefined : statusFilter || undefined,
          name
        );
        console.log("API Response:", response);
        console.log("Conversations data:", response.data);
        setConversations(response.data);
        setTotalPages(response.metadata.total_pages);
        setTotalConversations(response.metadata.total);
        setCurrentPage(response.metadata.page);
      } catch (error) {
        console.error("Error fetching conversations:", error);
        toast.error("Failed to load conversations from server");
        setConversations([]);
        setTotalPages(0);
        setTotalConversations(0);
      } finally {
        setLoading(false);
      }
    },
    [user_timezone, statusFilter]
  );

  // Reset to first page when status filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  useEffect(() => {
    fetchConversations(currentPage, pageSize, debouncedSearchQuery);
  }, [fetchConversations, currentPage, pageSize, debouncedSearchQuery]);

  const handlePageChange = (pageIndex: number) => {
    setCurrentPage(pageIndex + 1); // DataTable uses 0-based indexing, API uses 1-based
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when page size changes
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  return (
    <div className="p-2 sm:p-4 lg:p-6">
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Call History</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Manage conversation records and call history ({totalConversations} total)
          </p>
        </div>
      </div>

      <DataTable
        title="Conversations List"
        columns={columns}
        data={conversations}
        searchKey="patient.name"
        searchPlaceholder="Search by patient name..."
        showSearch={true}
        loading={loading}
        initialLoading={loading && conversations.length === 0}
        externalSearchValue={searchQuery}
        onExternalSearchChange={handleSearchChange}
        externalStatusValue={statusFilter}
        onExternalStatusChange={setStatusFilter}
        statusOptions={statusOptions}
        statusPlaceholder="All Status"
        enablePagination={true}
        externalPageIndex={currentPage - 1}
        totalPages={totalPages}
        onExternalPageChange={handlePageChange}
        onExternalPageSizeChange={handlePageSizeChange}
      />
    </div>
  );
}
