"use client";

import { useState, useEffect, useCallback } from "react";
import { DataTable, ExtendedColumnDef } from "@/components/common/DataTable";
import { getRestaurantReservationsList, TableBooking } from "../../../app/actions/table-bookings";
import { toast } from "react-toastify";

const StatusBadge = ({ status }: { status: string }) => {
  const statusStyles: Record<string, { bg: string; text: string }> = {
    scheduled: { bg: "#10B981", text: "#FFFFFF" },
    confirmed: { bg: "#10B981", text: "#FFFFFF" },
    pending: { bg: "#FBBF24", text: "#FFFFFF" },
    cancelled: { bg: "#EF4444", text: "#FFFFFF" },
    canceled: { bg: "#EF4444", text: "#FFFFFF" },
    completed: { bg: "#3B82F6", text: "#FFFFFF" },
    rescheduled: { bg: "#3B82F6", text: "#FFFFFF" },
  };

  const style = statusStyles[status.toLowerCase()] || { bg: "#6B7280", text: "#FFFFFF" };

  return (
    <span
      className="inline-flex px-3 py-1 text-xs font-medium rounded"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const columns: ExtendedColumnDef<TableBooking>[] = [
  {
    accessorKey: "id",
    header: "Booking ID",
    width: "120px",
    cell: ({ row }) => <div className="font-medium text-gray-900">TB-{row.original.id}</div>,
  },
  {
    accessorKey: "customer.name",
    header: "Customer Name",
    width: "180px",
    cell: ({ row }) => (
      <div className="font-medium text-gray-900">{row.original.customer?.name || "N/A"}</div>
    ),
  },
  {
    accessorKey: "customer.phone_number",
    header: "Phone no",
    width: "150px",
    cell: ({ row }) => (
      <div className="text-gray-600">{row.original.customer?.phone_number || "N/A"}</div>
    ),
  },
  {
    accessorKey: "table.table_number",
    header: "Table",
    width: "150px",

    cell: ({ row }) => <div className="text-gray-900">{row.original.table?.table_number || "N/A"}</div>,
  },
  {
    accessorKey: "party_size",
    header: "Party Size",
    width: "150px",
    cell: ({ row }) => <div className="text-gray-600">{row.original.party_size || "N/A"}</div>,
  },
  {
    accessorKey: "reservation_date",
    header: "Reservation Date/Time",
    width: "180px",
    cell: ({ row }) => (
      <div className="text-gray-900">
        {row.original.reservation_date
          ? new Date(row.original.reservation_date).toLocaleString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "N/A"}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    width: "130px",
    cell: ({ row }) => <StatusBadge status={row.original.status || "N/A"} />,
  },
];

export default function ResturantBookings() {
  const [bookings, setBookings] = useState<TableBooking[]>([]);
  const user_timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

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

  const fetchBookings = useCallback(
    async (page: number = 1, limit: number = 10, name: string = "") => {
      try {
        setLoading(true);
        const response = await getRestaurantReservationsList(
          page,
          limit,
          user_timezone,
          undefined,
          undefined,
          undefined,
          name
        );
        setBookings(response.data);
        setTotalPages(response.metadata.total_pages);
        setCurrentPage(response.metadata.page);
      } catch (error: unknown) {
        console.error("Error fetching table bookings:", error);
        if (error instanceof Error && error.message) {
          toast.error(error.message);
        } else {
          toast.error("Failed to load table bookings from server");
        }
        setBookings([]);
        setTotalPages(0);
      } finally {
        setLoading(false);
      }
    },
    [user_timezone]
  );

  useEffect(() => {
    fetchBookings(currentPage, pageSize, debouncedSearchQuery);
  }, [fetchBookings, currentPage, pageSize, debouncedSearchQuery]);

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
          <h1 className="text-2xl  sm:text-2xl font-semibold text-[#000000]">Table Bookings</h1>
          <p className="text-md font-inter font-normal sm:text-base text-[#787878] mt-1">
            Manage all table reservations handled by the AI system.
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={bookings}
        title="All Table Bookings"
        showSearch={true}
        loading={loading}
        initialLoading={loading && bookings.length === 0}
        externalSearchValue={searchQuery}
        onExternalSearchChange={handleSearchChange}
        enablePagination={true}
        externalPageIndex={currentPage - 1}
        totalPages={totalPages}
        onExternalPageChange={handlePageChange}
        onExternalPageSizeChange={handlePageSizeChange}
      />
    </div>
  );
}
