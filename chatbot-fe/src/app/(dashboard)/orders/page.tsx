"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/common/DataTable";

interface BookingData {
  id: string;
  doctorName: string;
  department: string;
  expertise: string;
  userName: string;
  userPhone: string;
  status: "confirmed" | "pending" | "cancelled" | "completed";
  bookingDate: string;
}

const dummyBookingData: BookingData[] = [
  {
    id: "1",
    doctorName: "Dr. Sarah Johnson",
    department: "Cardiology",
    expertise: "Heart Surgery",
    userName: "John Doe",
    userPhone: "+1-555-0123",
    status: "confirmed",
    bookingDate: "2025-11-06",
  },
  {
    id: "2",
    doctorName: "Dr. Michael Chen",
    department: "Neurology",
    expertise: "Brain Disorders",
    userName: "Jane Smith",
    userPhone: "+1-555-0124",
    status: "pending",
    bookingDate: "2025-11-06",
  },
  {
    id: "3",
    doctorName: "Dr. Emily Davis",
    department: "Orthopedics",
    expertise: "Joint Replacement",
    userName: "Mike Johnson",
    userPhone: "+1-555-0125",
    status: "completed",
    bookingDate: "2025-11-05",
  },
  {
    id: "4",
    doctorName: "Dr. Robert Wilson",
    department: "Pediatrics",
    expertise: "Child Health",
    userName: "Sarah Wilson",
    userPhone: "+1-555-0126",
    status: "cancelled",
    bookingDate: "2025-11-05",
  },
  {
    id: "5",
    doctorName: "Dr. Lisa Brown",
    department: "Dermatology",
    expertise: "Skin Conditions",
    userName: "David Brown",
    userPhone: "+1-555-0127",
    status: "confirmed",
    bookingDate: "2025-11-04",
  },
  {
    id: "6",
    doctorName: "Dr. James Miller",
    department: "General Medicine",
    expertise: "Internal Medicine",
    userName: "Lisa Davis",
    userPhone: "+1-555-0128",
    status: "pending",
    bookingDate: "2025-11-04",
  },
  {
    id: "7",
    doctorName: "Dr. Anna Garcia",
    department: "Cardiology",
    expertise: "Cardiac Care",
    userName: "Robert Miller",
    userPhone: "+1-555-0129",
    status: "completed",
    bookingDate: "2025-11-03",
  },
  {
    id: "8",
    doctorName: "Dr. Thomas Lee",
    department: "Neurology",
    expertise: "Neurological Disorders",
    userName: "Emily Garcia",
    userPhone: "+1-555-0130",
    status: "confirmed",
    bookingDate: "2025-11-03",
  },
];

const StatusBadge = ({ status }: { status: BookingData["status"] }) => {
  const statusStyles = {
    confirmed: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    cancelled: "bg-red-100 text-red-800",
    completed: "bg-blue-100 text-blue-800",
  };

  return (
    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusStyles[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const columns: ColumnDef<BookingData>[] = [
  {
    accessorKey: "doctorName",
    header: "Doctor's Name",
    cell: ({ row }) => <div className="font-medium text-gray-900">{row.original.doctorName}</div>,
  },
  {
    accessorKey: "department",
    header: "Department",
    cell: ({ row }) => <div className="text-sm text-gray-600">{row.original.department}</div>,
  },
  {
    accessorKey: "expertise",
    header: "Expertise",
    cell: ({ row }) => <div className="text-sm text-gray-600">{row.original.expertise}</div>,
  },
  {
    accessorKey: "userName",
    header: "User Name",
    cell: ({ row }) => <div className="font-medium text-gray-900">{row.original.userName}</div>,
  },
  {
    accessorKey: "userPhone",
    header: "User Phone Number",
    cell: ({ row }) => <div className="text-sm text-gray-600">{row.original.userPhone}</div>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "bookingDate",
    header: "Date",
    cell: ({ row }) => (
      <div className="text-sm text-gray-500">
        {new Date(row.original.bookingDate).toLocaleDateString()}
      </div>
    ),
  },
];

export default function OrdersPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
        <p className="text-gray-600 mt-1">View and manage all booking records</p>
      </div>

      <DataTable
        columns={columns}
        data={dummyBookingData}
        title="Booking Records"
        searchKey="userName"
        searchPlaceholder="Search bookings by user name..."
        enableSorting={true}
        enableFiltering={true}
        enableColumnVisibility={true}
        enablePagination={true}
        pageSize={5}
        showSearch={true}
        showSorting={true}
      />
    </div>
  );
}
