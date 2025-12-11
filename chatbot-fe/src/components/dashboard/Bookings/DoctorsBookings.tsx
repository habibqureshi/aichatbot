"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { DataTable, ExtendedColumnDef } from "@/components/common/DataTable";
import { getAppointmentsList, Appointment } from "@/app/actions/appointments";
import { toast } from "react-toastify";
import { StatusBadge } from "@/lib/statusUtils";
import { getInitials, getAvatarColors } from "@/lib/avatarUtils";

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatTime = (timeString: string): string => {
  const time = new Date(timeString);
  return time.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const columns: ExtendedColumnDef<Appointment>[] = [
  {
    accessorKey: "id",
    header: "ID",
    width: "100px",
    cell: ({ row }) => (
      <div className="font-medium text-gray-900">APT-{String(row.original.id).padStart(3, "0")}</div>
    ),
  },
  {
    accessorKey: "patient_id",
    header: "PATIENT",
    width: "220px",
    cell: ({ row }) => {
      const patientName = row.original.patient?.name || `Patient ${row.original.patient_id}`;
      const phoneNumber = row.original.patient?.phone_number || "N/A";
      const initials = getInitials(patientName);
      const avatarColors = getAvatarColors(row.original.patient_id);

      return (
        <div className="flex items-start gap-3">
          <div
            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: avatarColors.bg }}
          >
            <span className="text-sm font-semibold" style={{ color: avatarColors.text }}>
              {initials}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">{patientName}</p>
            <p className="text-sm text-gray-600 truncate">{phoneNumber}</p>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "doctor_id",
    header: "DOCTOR",
    width: "220px",
    cell: ({ row }) => {
      const doctorName = row.original.doctor?.name || `Doctor ${row.original.doctor_id}`;
      const specialty = row.original.doctor?.specialty?.name || row.original.doctor?.specialty || "N/A";
      const initials = getInitials(doctorName);
      const avatarColors = getAvatarColors(row.original.doctor_id);

      return (
        <div className="flex items-start gap-3">
          <div
            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: avatarColors.bg }}
          >
            <span className="text-sm font-semibold" style={{ color: avatarColors.text }}>
              {initials}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">{doctorName}</p>
            <p className="text-sm text-gray-600 truncate">{String(specialty)}</p>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "appointment_date",
    header: "APPOINTMENT DATE",
    width: "220px",
    cell: ({ row }) => {
      const appointmentDateString = row.original.appointment_date;
      const startTimeString = row.original.start_time;
      const createdString = row.original.created_at;

      return (
        <div>
          {appointmentDateString && startTimeString ? (
            <>
              {/* Appointment Date */}
              <p className="flex items-center gap-1 text-sm font-medium text-gray-900">
                <Image src="/assets/CalendarBlank.svg" alt="calendar" width={16} height={16} />
                {formatDate(appointmentDateString)}
              </p>

              {/* Appointment Time */}
              <p className="flex items-center gap-1 text-sm font-medium text-gray-900">
                <Image src="/assets/Clock2.svg" alt="clock" width={16} height={16} />
                {formatTime(startTimeString)}
              </p>

              {/* Booked Date */}
              <p className="flex items-center gap-1 text-sm text-gray-600">
                Booked: {createdString ? formatDate(createdString) : "N/A"}
              </p>
            </>
          ) : (
            <p className="text-gray-600">N/A</p>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "STATUS",
    width: "150px",
    cell: ({ row }) => <StatusBadge status={row.original.status || "N/A"} />,
  },
];

export default function DoctorBookings() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
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
        setAppointments(response.data);
        setTotalPages(response.metadata.total_pages);
        setCurrentPage(response.metadata.page);
      } catch (error: unknown) {
        console.error("Error fetching appointments:", error);
        if (error instanceof Error && error.message) {
          toast.error(error.message);
        } else {
          toast.error("Failed to load appointments from server");
        }
        setAppointments([]);
        setTotalPages(0);
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
          <h1 className="text-2xl  sm:text-2xl font-semibold text-[#000000]">Appoinments</h1>
          <p className="text-md font-inter font-normal sm:text-base text-[#787878] mt-1">
            Manage all patient bookings handled by the AI system.
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
