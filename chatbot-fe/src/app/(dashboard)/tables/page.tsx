"use client";

import { useState, useEffect, useCallback } from "react";
import { DataTable, ExtendedColumnDef, ActionsMenu } from "@/components/common/DataTable";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

// Define TableBooking type
export interface TableBooking {
  id: string;
  tableNumber: number;
  customerName: string;
  phoneNumber: string;
  date: string;
  time: string;
  guests: number;
  status: "confirmed" | "pending" | "cancelled";
  createdAt: string;
}

export default function TablesPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<TableBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState<TableBooking | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Debounced search value
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  // Simulate fetching data
  const fetchBookings = useCallback(async (page: number = 1, limit: number = 10, query: string = "") => {
    // Dummy data
    const dummyBookings: TableBooking[] = [
      {
        id: "1",
        tableNumber: 1,
        customerName: "John Doe",
        phoneNumber: "+1234567890",
        date: "2025-12-05",
        time: "19:00",
        guests: 4,
        status: "confirmed",
        createdAt: "2025-12-01T10:00:00Z",
      },
      {
        id: "2",
        tableNumber: 2,
        customerName: "Jane Smith",
        phoneNumber: "+1234567891",
        date: "2025-12-05",
        time: "20:00",
        guests: 2,
        status: "pending",
        createdAt: "2025-12-02T11:00:00Z",
      },
      {
        id: "3",
        tableNumber: 3,
        customerName: "Bob Johnson",
        phoneNumber: "+1234567892",
        date: "2025-12-06",
        time: "18:30",
        guests: 6,
        status: "confirmed",
        createdAt: "2025-12-03T12:00:00Z",
      },
      {
        id: "4",
        tableNumber: 4,
        customerName: "Alice Brown",
        phoneNumber: "+1234567893",
        date: "2025-12-06",
        time: "21:00",
        guests: 3,
        status: "cancelled",
        createdAt: "2025-12-04T13:00:00Z",
      },
    ];

    try {
      setLoading(true);
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      let filteredBookings = dummyBookings;

      if (query) {
        filteredBookings = dummyBookings.filter(
          (booking) =>
            booking.customerName.toLowerCase().includes(query.toLowerCase()) ||
            booking.phoneNumber.includes(query) ||
            booking.tableNumber.toString().includes(query)
        );
      }

      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedBookings = filteredBookings.slice(startIndex, endIndex);

      setBookings(paginatedBookings);
      setTotalPages(Math.ceil(filteredBookings.length / limit));
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast.error("Failed to load table bookings");
    } finally {
      setLoading(false);
    }
  }, []);

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

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1); // Reset to first page on search
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleDeleteClick = (booking: TableBooking) => {
    setBookingToDelete(booking);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!bookingToDelete) return;

    try {
      setDeleting(true);
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Remove from dummy data
      setBookings((prev) => prev.filter((b) => b.id !== bookingToDelete.id));

      toast.success("Table booking cancelled successfully");
      setDeleteDialogOpen(false);
      setBookingToDelete(null);
    } catch (error) {
      console.error("Error cancelling booking:", error);
      toast.error("Failed to cancel booking");
    } finally {
      setDeleting(false);
    }
  };

  // Define columns
  const columns: ExtendedColumnDef<TableBooking>[] = [
    {
      accessorKey: "tableNumber",
      header: "Table",
      width: "100px",
      cell: ({ row }) => (
        <div className="font-medium text-gray-900">Table {row.original.tableNumber}</div>
      ),
    },
    {
      accessorKey: "customerName",
      header: "Customer",
      width: "200px",
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-gray-900">{row.original.customerName}</div>
          <div className="text-sm text-gray-500">{row.original.phoneNumber}</div>
        </div>
      ),
    },
    {
      accessorKey: "date",
      header: "Date & Time",
      width: "180px",
      cell: ({ row }) => (
        <div>
          <div>{new Date(row.original.date).toLocaleDateString()}</div>
          <div className="text-sm text-gray-500">{row.original.time}</div>
        </div>
      ),
    },
    {
      accessorKey: "guests",
      header: "Guests",
      width: "100px",
      cell: ({ row }) => <div>{row.original.guests}</div>,
    },
    {
      accessorKey: "status",
      header: "Status",
      width: "120px",
      cell: ({ row }) => (
        <span
          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            row.original.status === "confirmed"
              ? "bg-green-100 text-green-800"
              : row.original.status === "pending"
              ? "bg-yellow-100 text-yellow-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}
        </span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Booked On",
      width: "150px",
      cell: ({ row }) => <div>{new Date(row.original.createdAt).toLocaleDateString()}</div>,
    },
    {
      id: "actions",
      header: "Actions",
      width: "120px",
      cell: ({ row }) => (
        <ActionsMenu
          actions={[
            {
              label: "View",
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              ),
              onClick: () => router.push(`/tables/${row.original.id}`),
            },
            {
              label: "Edit",
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              ),
              onClick: () => router.push(`/tables/manage?id=${row.original.id}`),
            },
            {
              label: "Cancel",
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="red" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              ),
              onClick: () => handleDeleteClick(row.original),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Table Bookings</h1>
          <p className="text-gray-600">Manage restaurant table reservations</p>
        </div>
        {/* <Link
          href="/tables/manage"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          New Booking
        </Link> */}
      </div>

      {/* Search */}
      {/* DataTable handles search internally */}

      {/* Table */}
      <DataTable
        data={bookings}
        columns={columns}
        title="Table Bookings"
        searchKey="customerName"
        searchPlaceholder="Search by customer name, phone, or table number..."
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Cancel Booking"
        description={`Are you sure you want to cancel the booking for ${bookingToDelete?.customerName} at Table ${bookingToDelete?.tableNumber}?`}
        confirmText="Cancel Booking"
        onConfirm={handleDeleteConfirm}
        loading={deleting}
      />
    </div>
  );
}
