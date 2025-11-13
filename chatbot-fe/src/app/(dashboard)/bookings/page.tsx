"use client";

import { useState, useEffect, useCallback } from "react";
import { DataTable, ExtendedColumnDef } from "@/components/common/DataTable";
import { getAppointmentsList, Appointment } from "@/app/actions/appointments";
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

const columns: ExtendedColumnDef<Appointment>[] = [
  {
    accessorKey: "id",
    header: "Booking ID",
    width: "120px",
    cell: ({ row }) => <div className="font-medium text-gray-900">BK-{row.original.id}</div>,
  },
  {
    accessorKey: "patient.name",
    header: "Patient Name",
    width: "180px",
    cell: ({ row }) => (
      <div className="font-medium text-gray-900">{row.original.patient?.name || "N/A"}</div>
    ),
  },
  {
    accessorKey: "patient.phone_number",
    header: "Phone no",
    width: "150px",
    cell: ({ row }) => (
      <div className="text-gray-600">{row.original.patient?.phone_number || "N/A"}</div>
    ),
  },
  {
    accessorKey: "doctor.name",
    header: "Doctor",
    width: "150px",
    cell: ({ row }) => <div className="text-gray-900">{row.original.doctor?.name || "N/A"}</div>,
  },
  {
    accessorKey: "doctor.specialty.name",
    header: "Department",
    width: "150px",
    cell: ({ row }) => (
      <div className="text-gray-600">{row.original.doctor?.specialty?.name || "N/A"}</div>
    ),
  },
  {
    accessorKey: "appointment_date",
    header: "Appointment Date/Time",
    width: "180px",
    cell: ({ row }) => (
      <div className="text-gray-900">
        {row.original.appointment_date && row.original.start_time
          ? `${new Date(row.original.appointment_date).toLocaleDateString("en-US", {
              day: "numeric",
              month: "short",
            })}, ${row.original.start_time.slice(0, 5)}`
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

export default function BookingsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const user_timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalAppointments, setTotalAppointments] = useState(0);
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

  const fetchAppointments = useCallback(
    async (page: number = 1, limit: number = 10, name: string = "") => {
      try {
        setLoading(true);
        const response = await getAppointmentsList(
          page,
          limit,
          user_timezone,
          undefined,
          undefined,
          undefined,
          name
        );
        console.log("API Response:", response);
        console.log("Appointments data:", response.data);
        setAppointments(response.data);
        setTotalPages(response.metadata.total_pages);
        setTotalAppointments(response.metadata.total);
        setCurrentPage(response.metadata.page);
      } catch (error) {
        console.error("Error fetching appointments:", error);
        toast.error("Failed to load appointments from server");
        setAppointments([]);
        setTotalPages(0);
        setTotalAppointments(0);
      } finally {
        setLoading(false);
      }
    },
    [user_timezone]
  );

  useEffect(() => {
    fetchAppointments(currentPage, pageSize, debouncedSearchQuery);
  }, [fetchAppointments, currentPage, pageSize, debouncedSearchQuery]);

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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Manage appointment bookings and schedules ({totalAppointments} total)
          </p>
        </div>
      </div>
      <DataTable
        columns={columns}
        data={appointments}
        title="All Bookings"
        showSearch={true}
        loading={loading}
        initialLoading={loading && appointments.length === 0}
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
