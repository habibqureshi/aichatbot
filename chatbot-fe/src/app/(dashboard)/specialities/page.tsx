"use client";

import { useState, useEffect, useCallback } from "react";
import { DataTable, ExtendedColumnDef } from "@/components/common/DataTable";
import { getSpecialitiesList, Speciality } from "@/app/actions/specialities";
import { toast } from "react-toastify";

const columns: ExtendedColumnDef<Speciality>[] = [
  {
    accessorKey: "id",
    header: "ID",
    width: "80px",
    cell: ({ row }) => <div className="text-sm text-gray-600 font-mono">{row.original.id}</div>,
  },
  {
    accessorKey: "name",
    header: "Name",
    width: "200px",
    cell: ({ row }) => <div className="font-medium text-gray-900">{row.original.name}</div>,
  },
  {
    accessorKey: "description",
    header: "Description",
    width: "300px",
    cell: ({ row }) => <div className="text-sm text-gray-600">{row.original.description}</div>,
  },
  {
    accessorKey: "created_at",
    header: "Created At",
    width: "160px",
    cell: ({ row }) => (
      <div className="text-sm text-gray-600">{new Date(row.original.created_at).toLocaleString()}</div>
    ),
  },
];

export default function SpecialitiesPage() {
  const [specialities, setSpecialities] = useState<Speciality[]>([]);
  const user_timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalSpecialities, setTotalSpecialities] = useState(0);

  const fetchSpecialities = useCallback(
    async (page: number = 1, limit: number = 10) => {
      try {
        setLoading(true);
        const response = await getSpecialitiesList(page, limit, user_timezone);
        // console.log("API Response:", response);
        // console.log("Specialities data:", response.data);
        setSpecialities(response.data);
        setTotalPages(response.metadata.total_pages);
        setTotalSpecialities(response.metadata.total);
        setCurrentPage(response.metadata.page);
      } catch (error) {
        console.error("Error fetching specialities:", error);
        toast.error("Failed to load specialities from server");
        setSpecialities([]);
        setTotalPages(0);
        setTotalSpecialities(0);
      } finally {
        setLoading(false);
      }
    },
    [user_timezone]
  );

  useEffect(() => {
    fetchSpecialities(currentPage, pageSize);
  }, [fetchSpecialities, currentPage, pageSize]);

  const handlePageChange = (pageIndex: number) => {
    setCurrentPage(pageIndex + 1); // DataTable uses 0-based indexing, API uses 1-based
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when page size changes
  };

  return (
    <div className="p-2 sm:p-4 lg:p-6">
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Specialities</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Manage medical specialities ({totalSpecialities} total)
          </p>
        </div>
      </div>

      <DataTable
        title="Specialities List"
        columns={columns}
        data={specialities}
        loading={loading}
        initialLoading={loading && specialities.length === 0}
        enablePagination={true}
        externalPageIndex={currentPage - 1}
        totalPages={totalPages}
        onExternalPageChange={handlePageChange}
        onExternalPageSizeChange={handlePageSizeChange}
      />
    </div>
  );
}
