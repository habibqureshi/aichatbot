"use client";

import { DataTable, ExtendedColumnDef } from "@/components/common/DataTable";
import Link from "next/link";

interface DoctorData {
  id: string;
  name: string;
  experience: number;
  department: string;
  status: "active" | "inactive";
  totalSlots: number;
  createdAt: string;
}

const dummyDoctorData: DoctorData[] = [
  {
    id: "1",
    name: "Dr. Sarah Johnson",
    experience: 12,
    department: "Cardiology",
    status: "active",
    totalSlots: 24,
    createdAt: "2025-10-15",
  },
  {
    id: "2",
    name: "Dr. Michael Chen",
    experience: 8,
    department: "Neurology",
    status: "active",
    totalSlots: 18,
    createdAt: "2025-09-20",
  },
  {
    id: "3",
    name: "Dr. Emily Rodriguez",
    experience: 15,
    department: "Pediatrics",
    status: "active",
    totalSlots: 30,
    createdAt: "2025-08-10",
  },
  {
    id: "4",
    name: "Dr. David Kim",
    experience: 6,
    department: "Orthopedics",
    status: "inactive",
    totalSlots: 12,
    createdAt: "2025-11-01",
  },
  {
    id: "5",
    name: "Dr. Lisa Thompson",
    experience: 20,
    department: "General Medicine",
    status: "active",
    totalSlots: 36,
    createdAt: "2025-07-05",
  },
  {
    id: "6",
    name: "Dr. Robert Wilson",
    experience: 9,
    department: "Dermatology",
    status: "active",
    totalSlots: 20,
    createdAt: "2025-10-25",
  },
];

const StatusBadge = ({ status }: { status: DoctorData["status"] }) => {
  const statusStyles = {
    active: "bg-green-100 text-green-800",
    inactive: "bg-red-100 text-red-800",
  };

  return (
    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusStyles[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const columns: ExtendedColumnDef<DoctorData>[] = [
  {
    accessorKey: "name",
    header: "Doctor Information",
    width: "200px",
    cell: ({ row }) => (
      <div>
        <div className="font-medium text-gray-900">{row.original.name}</div>
        <div className="text-sm text-gray-500">{row.original.department}</div>
      </div>
    ),
  },
  {
    accessorKey: "experience",
    header: "Experience",
    width: "100px",
    cell: ({ row }) => <div>{row.original.experience} years</div>,
  },
  {
    accessorKey: "totalSlots",
    header: "Total Slots",
    width: "100px",
  },
  {
    accessorKey: "status",
    header: "Status",
    width: "90px",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "createdAt",
    header: "Created Date",
    width: "120px",
    cell: ({ row }) => <div>{new Date(row.original.createdAt).toLocaleDateString()}</div>,
  },
];

export default function DoctorsPage() {
  return (
    <div className="p-2 sm:p-4 lg:p-6">
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Doctors</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Manage doctor profiles and availability
          </p>
        </div>
        <Link
          href="/doctors/add"
          className="inline-flex items-center px-4 py-2  bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Add Doctor
        </Link>
      </div>

      <DataTable
        columns={columns}
        data={dummyDoctorData}
        title="Doctor Records"
        searchKey="name"
        searchPlaceholder="Search doctors by name..."
        enableSorting={true}
        enableFiltering={true}
        enableColumnVisibility={true}
        enablePagination={true}
        pageSize={5}
        showSearch={true}
        showSorting={false}
      />
    </div>
  );
}
