"use client";

import { useState, useEffect, useCallback } from "react";
import { DataTable, ExtendedColumnDef } from "@/components/common/DataTable";
import { getRestaurantReservationsList, TableBooking } from "../../../app/actions/table-bookings";
import { toast } from "react-toastify";
import { StatusBadge } from "@/lib/statusUtils";
import Image from "next/image";
import { formatDate, formatTime } from "@/lib/utils";
import { getInitials, getAvatarColors } from "@/lib/avatarUtils";

const columns: ExtendedColumnDef<TableBooking>[] = [
  {
    accessorKey: "id",
    header: "ID",
    width: "100px",
    cell: ({ row }) => (
      <div className="font-medium text-sm leading-[1.32] tracking-[0%] text-brand-dark1">
        RES-{String(row.original.id).padStart(3, "0")}
      </div>
    ),
  },
  {
    accessorKey: "customer_id",
    header: "CUSTOMER",
    width: "200px",
    cell: ({ row }) => {
      const customerName = row.original.customer?.name || `Customer ${row.original.customer_id}`;
      const phoneNumber = row.original.customer?.phone_number || "N/A";
      const initials = getInitials(customerName);
      const avatarColors = getAvatarColors(row.original.customer_id);

      return (
        <div className="flex items-start gap-3">
          <div
            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: avatarColors.bg }}
          >
            <span
              className="text-sm leading-[1.32] tracking-[0%] font-medium"
              style={{ color: avatarColors.text }}
            >
              {initials}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm leading-[1.32] tracking-[0%] font-medium text-brand-dark1 truncate">
              {customerName}
            </p>
            <p className="text-sm leading-[1.32] tracking-[0%] text-brand-light truncate">
              {phoneNumber}
            </p>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "reservation_date",
    header: "RESERVATION DATE",
    width: "200px",
    cell: ({ row }) => {
      const dateString = row.original.reservation_date;
      const createdString = row.original.created_at;

      return (
        <div>
          {dateString ? (
            <>
              {/* Reservation Date */}
              <p className="flex items-center gap-1 text-sm font-medium text-brand-dark1">
                <Image src="/assets/CalendarBlank.svg" alt="calendar" width={16} height={16} />
                {formatDate(dateString)}
              </p>

              {/* Reservation Time */}
              <p className="flex items-center gap-1 text-sm font-medium text-brand-dark1">
                <Image src="/assets/Clock2.svg" alt="clock" width={16} height={16} />
                {formatTime(dateString)}
              </p>

              {/* Booked Date */}
              <p className="flex items-center gap-1 text-sm font-medium text-brand-light3">
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
    accessorKey: "party_size",
    header: "GUESTS",
    width: "120px",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Image src="/assets/Users.svg" alt="guests" width={16} height={16} />
        <span className="font-medium text-brand-dark1">{row.original.party_size || "N/A"}</span>
      </div>
    ),
  },
  {
    accessorKey: "table_id",
    header: "TABLE NO",
    width: "120px",
    cell: ({ row }) => (
      <div className="font-medium text-brand-dark1">
        {row.original.table?.table_number
          ? `T-${row.original.table.table_number}`
          : `T-${row.original.table_id}`}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "STATUS",
    width: "150px",
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
