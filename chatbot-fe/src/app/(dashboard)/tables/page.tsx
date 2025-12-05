"use client";

import { useState, useEffect, useCallback } from "react";
import { DataTable, ExtendedColumnDef, ActionsMenu } from "@/components/common/DataTable";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

// Define Table type
export interface Table {
  id: number;
  table_number: string;
  capacity: number;
  location: "front" | "corner" | "roof" | "indoor" | "outdoor";
  is_active: boolean;
  created_at: string;
}

export default function TablesPage() {
  const router = useRouter();
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalTables, setTotalTables] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tableToDelete, setTableToDelete] = useState<Table | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Debounced search value
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  // Simulate fetching data
  const fetchTables = useCallback(async (page: number = 1, limit: number = 10, query: string = "") => {
    // Dummy data
    const dummyTables: Table[] = [
      {
        id: 1,
        table_number: "T001",
        capacity: 4,
        location: "front",
        is_active: true,
        created_at: "2024-01-15T10:00:00Z",
      },
      {
        id: 2,
        table_number: "T002",
        capacity: 6,
        location: "corner",
        is_active: true,
        created_at: "2024-01-15T10:00:00Z",
      },
      {
        id: 3,
        table_number: "T003",
        capacity: 2,
        location: "roof",
        is_active: false,
        created_at: "2024-01-15T10:00:00Z",
      },
      {
        id: 4,
        table_number: "T004",
        capacity: 8,
        location: "indoor",
        is_active: true,
        created_at: "2024-01-15T10:00:00Z",
      },
      {
        id: 5,
        table_number: "T005",
        capacity: 4,
        location: "outdoor",
        is_active: true,
        created_at: "2024-01-15T10:00:00Z",
      },
    ];

    try {
      setLoading(true);
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      let filteredTables = dummyTables;

      if (query) {
        filteredTables = dummyTables.filter(
          (table) =>
            table.table_number.toLowerCase().includes(query.toLowerCase()) ||
            table.location.toLowerCase().includes(query.toLowerCase()) ||
            table.capacity.toString().includes(query)
        );
      }

      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedTables = filteredTables.slice(startIndex, endIndex);

      setTables(paginatedTables);
      setTotalPages(Math.ceil(filteredTables.length / limit));
      setTotalTables(filteredTables.length);
    } catch (error) {
      console.error("Error fetching tables:", error);
      toast.error("Failed to load tables");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTables(currentPage, pageSize, debouncedSearchQuery);
  }, [fetchTables, currentPage, pageSize, debouncedSearchQuery]);

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

  const handleDeleteClick = (table: Table) => {
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
  const columns: ExtendedColumnDef<Table>[] = [
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
        searchKey="table_number"
        searchPlaceholder="Search here..."
        showSearch={true}
        loading={loading}
        initialLoading={loading && tables.length === 0}
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
        title="Delete Table"
        description={`Are you sure you want to delete table ${tableToDelete?.table_number}? This action cannot be undone.`}
        confirmText="Delete Table"
        onConfirm={handleDeleteConfirm}
        loading={deleting}
      />
    </div>
  );
}
