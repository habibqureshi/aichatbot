"use client";

import { useState, useEffect, useCallback } from "react";
import { DataTable, ExtendedColumnDef } from "@/components/common/DataTable";
import { getAppointmentsList, Appointment } from "@/app/actions/appointments";
import { toast } from "react-toastify";

const StatusBadge = ({ status }: { status: string }) => {
  const statusStyles: Record<string, string> = {
    confirmed: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    cancelled: "bg-red-100 text-red-800",
    completed: "bg-blue-100 text-blue-800",
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

const columns: ExtendedColumnDef<Appointment>[] = [
  {
    accessorKey: "patient.name",
    header: "Patient Information",
    width: "200px",
    cell: ({ row }) => (
      <div>
        <div className="font-medium text-gray-900">{row.original.patient.name}</div>
        <div className="text-sm text-gray-500">{row.original.patient.phone_number}</div>
      </div>
    ),
  },
  {
    accessorKey: "doctor.name",
    header: "Doctor Information",
    width: "200px",
    cell: ({ row }) => (
      <div>
        <div className="font-medium text-gray-900">{row.original.doctor.name}</div>
        <div className="text-sm text-gray-500">{row.original.doctor.specialty.name}</div>
      </div>
    ),
  },
  {
    accessorKey: "appointment_date",
    header: "Appointment Date",
    width: "180px",
    cell: ({ row }) => (
      <div className="text-sm text-gray-600">
        {new Date(row.original.appointment_date).toLocaleString()}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    width: "120px",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "notes",
    header: "Notes",
    width: "200px",
    cell: ({ row }) => (
      <div className="text-sm text-gray-600 truncate max-w-xs">{row.original.notes || "No notes"}</div>
    ),
  },
  {
    accessorKey: "created_at",
    header: "Created Date",
    width: "150px",
    cell: ({ row }) => (
      <div className="text-sm text-gray-500">
        {new Date(row.original.created_at).toLocaleDateString()}
      </div>
    ),
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
        title="Appointments List"
        searchKey="patient.name"
        searchPlaceholder="Search by name..."
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
