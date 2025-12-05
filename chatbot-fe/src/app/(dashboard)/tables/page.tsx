"use client";

import { useState, useEffect, useCallback } from "react";
import { DataTable, ExtendedColumnDef, ActionsMenu } from "@/components/common/DataTable";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { getRestaurantTablesList, RestaurantTable } from "../../actions/table-bookings";

export default function TablesPage() {
  const router = useRouter();
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalTables, setTotalTables] = useState(0);

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tableToDelete, setTableToDelete] = useState<RestaurantTable | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Simulate fetching data
  const fetchTables = useCallback(async (page: number = 1, limit: number = 10) => {
    const user_timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    try {
      setLoading(true);
      const response = await getRestaurantTablesList(page, limit, user_timezone);
      setTables(response.data);
      setTotalPages(response.metadata.total_pages);
      setTotalTables(response.metadata.total);
      setCurrentPage(response.metadata.page);
    } catch (error: unknown) {
      console.error("Error fetching tables:", error);
      if (error instanceof Error && error.message) {
        toast.error(error.message);
      } else {
        toast.error("Failed to load tables from server");
      }
      setTables([]);
      setTotalPages(0);
      setTotalTables(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTables(currentPage, pageSize);
  }, [fetchTables, currentPage, pageSize]);

  const handlePageChange = (pageIndex: number) => {
    setCurrentPage(pageIndex + 1); // DataTable uses 0-based indexing, API uses 1-based
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when page size changes
  };

  const handleDeleteClick = (table: RestaurantTable) => {
    setTableToDelete(table);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!tableToDelete) return;

    try {
      setDeleting(true);
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Remove from dummy data
      setTables((prev) => prev.filter((t) => t.id !== tableToDelete.id));
      setTotalTables((prev) => prev - 1);

      toast.success("Table deleted successfully");
      setDeleteDialogOpen(false);
      setTableToDelete(null);
    } catch (error) {
      console.error("Error deleting table:", error);
      toast.error("Failed to delete table");
    } finally {
      setDeleting(false);
    }
  };

  // Define columns
  const columns: ExtendedColumnDef<RestaurantTable>[] = [
    {
      accessorKey: "table_number",
      header: "Table ID",
      width: "120px",
      cell: ({ row }) => <div className="font-medium text-gray-900">{row.original.table_number}</div>,
    },
    {
      accessorKey: "capacity",
      header: "Capacity",
      width: "100px",
      cell: ({ row }) => <div>{row.original.capacity} seats</div>,
    },
    {
      accessorKey: "location",
      header: "Location",
      width: "120px",
      cell: ({ row }) => <div className="capitalize">{row.original.location}</div>,
    },
    {
      accessorKey: "is_active",
      header: "Status",
      width: "100px",
      cell: ({ row }) => (
        <span
          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            row.original.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {row.original.is_active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Created",
      width: "150px",
      cell: ({ row }) => <div>{new Date(row.original.created_at).toLocaleDateString()}</div>,
    },
    {
      id: "actions",
      header: "Actions",
      width: "120px",
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
              onClick: () => router.push(`/dashboard/tables/manage?id=${row.original.id}`),
            },
            {
              label: "Delete",
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              ),
              onClick: () => handleDeleteClick(row.original),
              className: "text-red-600 hover:text-red-800",
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
          <h1 className="text-2xl font-bold text-gray-900">Tables</h1>
          <p className="text-gray-600">Manage restaurant tables</p>
        </div>

        <Link href="/tables/manage" className="btn-primary-gradient">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Add Table
        </Link>
      </div>

      {/* Search */}
      {/* DataTable handles search internally */}

      {/* Table */}
      <DataTable
        data={tables}
        columns={columns}
        title="Tables"
        loading={loading}
        initialLoading={loading && tables.length === 0}
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
        title="Delete Table"
        description={`Are you sure you want to delete table ${tableToDelete?.table_number}? This action cannot be undone.`}
        confirmText="Delete Table"
        onConfirm={handleDeleteConfirm}
        loading={deleting}
      />
    </div>
  );
}
