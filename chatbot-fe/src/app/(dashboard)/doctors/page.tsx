"use client";

import { useState, useEffect, useCallback } from "react";
import { DataTable, ExtendedColumnDef, ActionsMenu } from "@/components/common/DataTable";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getDoctorsList, Doctor } from "@/app/actions/doctors";
import { toast } from "react-toastify";

export default function DoctorsPage() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalDoctors, setTotalDoctors] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  // Debounced search value
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  // Define columns inside the component to access router
  const columns: ExtendedColumnDef<Doctor>[] = [
    {
      accessorKey: "name",
      header: "Doctor Information",
      width: "250px",
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-gray-900">{row.original.name}</div>
          <div className="text-sm text-gray-500">{row.original.specialty.name}</div>
        </div>
      ),
    },
    {
      accessorKey: "phone_number",
      header: "Phone Number",
      width: "150px",
    },
    {
      accessorKey: "specialty.name",
      header: "Specialty",
      width: "150px",
    },
    {
      accessorKey: "created_at",
      header: "Created Date",
      width: "150px",
      cell: ({ row }) => <div>{new Date(row.original.created_at).toLocaleDateString()}</div>,
    },
    {
      id: "actions",
      header: "Actions",
      width: "100px",
      cell: ({ row }) => (
        <ActionsMenu
          actions={[
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
              onClick: () => router.push(`/doctors/manage?id=${row.original.id}`),
            },
          ]}
        />
      ),
    },
  ];

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchDoctors = useCallback(async (page: number = 1, limit: number = 10, name: string = "") => {
    try {
      setLoading(true);
      const response = await getDoctorsList(page, limit, "UTC", undefined, name);
      // console.log("API Response:", response);
      // console.log("Doctors data:", response.data);
      setDoctors(response.data);
      setTotalPages(response.metadata.total_pages);
      setTotalDoctors(response.metadata.total);
      setCurrentPage(response.metadata.page);
    } catch (error) {
      console.error("Error fetching doctors:", error);
      toast.error("Failed to load doctors from server");
      setDoctors([]);
      setTotalPages(0);
      setTotalDoctors(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDoctors(currentPage, pageSize, debouncedSearchQuery);
  }, [fetchDoctors, currentPage, pageSize, debouncedSearchQuery]);

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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Doctors</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Manage doctor profiles and availability ({totalDoctors} total)
          </p>
        </div>
        <Link
          href="/doctors/manage"
          className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
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
        data={doctors}
        title="Doctors List"
        searchKey="name"
        searchPlaceholder="Search doctors by name..."
        showSearch={true}
        loading={loading}
        initialLoading={loading && doctors.length === 0}
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
