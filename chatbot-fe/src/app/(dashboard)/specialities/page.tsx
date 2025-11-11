"use client";

import { useState, useEffect, useCallback } from "react";
import { DataTable, ExtendedColumnDef, ActionsMenu } from "@/components/common/DataTable";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getSpecialitiesList,
  createSpeciality,
  updateSpeciality,
  deleteSpeciality,
  Speciality,
} from "@/app/actions/specialities";
import { toast } from "react-toastify";

export default function SpecialitiesPage() {
  const user_timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [specialities, setSpecialities] = useState<Speciality[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalSpecialities, setTotalSpecialities] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSpeciality, setEditingSpeciality] = useState<Speciality | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [specialityToDelete, setSpecialityToDelete] = useState<Speciality | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Debounced search value
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  // Define columns inside the component to access handlers
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
      cell: ({ row }) => <div className="font-medium text-gray-900">{row.original.name || "N/A"}</div>,
    },
    {
      accessorKey: "description",
      header: "Description",
      width: "300px",
      cell: ({ row }) => (
        <div className="text-sm text-gray-600">{row.original.description || "N/A"}</div>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Created At",
      width: "160px",
      cell: ({ row }) => (
        <div className="text-sm text-gray-600">
          {row.original.created_at ? new Date(row.original.created_at).toLocaleString() : "N/A"}
        </div>
      ),
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
              onClick: () => handleEditClick(row.original),
            },
            {
              label: "Delete",
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

  const fetchSpecialities = useCallback(
    async (page: number = 1, limit: number = 10, name: string = "") => {
      try {
        setLoading(true);
        const response = await getSpecialitiesList(page, limit, user_timezone, name);
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

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchSpecialities(currentPage, pageSize, debouncedSearchQuery);
  }, [fetchSpecialities, currentPage, pageSize, debouncedSearchQuery]);

  const handlePageChange = (pageIndex: number) => {
    setCurrentPage(pageIndex + 1);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const handleCreateClick = () => {
    setEditingSpeciality(null);
    setFormData({ name: "", description: "" });
    setModalOpen(true);
  };

  const handleEditClick = (speciality: Speciality) => {
    setEditingSpeciality(speciality);
    setFormData({ name: speciality.name, description: speciality.description });
    setModalOpen(true);
  };

  const handleDeleteClick = (speciality: Speciality) => {
    setSpecialityToDelete(speciality);
    setDeleteDialogOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingSpeciality(null);
    setFormData({ name: "", description: "" });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.description.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setSubmitting(true);
    try {
      if (editingSpeciality) {
        await updateSpeciality(editingSpeciality.id, formData, user_timezone);
        toast.success("Speciality updated successfully");
      } else {
        await createSpeciality(formData, user_timezone);
        toast.success("Speciality created successfully");
      }
      fetchSpecialities(currentPage, pageSize, debouncedSearchQuery);
      handleModalClose();
    } catch (error) {
      console.error("Error saving speciality:", error);
      toast.error(`Failed to ${editingSpeciality ? "update" : "create"} speciality`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!specialityToDelete) return;

    setDeleting(true);
    try {
      await deleteSpeciality(specialityToDelete.id);
      toast.success("Speciality deleted successfully");
      fetchSpecialities(currentPage, pageSize, debouncedSearchQuery);
      setDeleteDialogOpen(false);
      setSpecialityToDelete(null);
    } catch (error) {
      console.error("Error deleting speciality:", error);
      toast.error("Failed to delete speciality");
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setSpecialityToDelete(null);
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
        <Button
          onClick={handleCreateClick}
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
          Add Speciality
        </Button>
      </div>

      <DataTable
        title="Specialities List"
        columns={columns}
        data={specialities}
        searchKey="name"
        searchPlaceholder="Search specialities by name..."
        showSearch={true}
        loading={loading}
        initialLoading={loading && specialities.length === 0}
        externalSearchValue={searchQuery}
        onExternalSearchChange={handleSearchChange}
        enablePagination={true}
        externalPageIndex={currentPage - 1}
        totalPages={totalPages}
        onExternalPageChange={handlePageChange}
        onExternalPageSizeChange={handlePageSizeChange}
      />

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSpeciality ? "Edit Speciality" : "Create Speciality"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFormSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <Input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="mt-1 block w-full"
                  placeholder="Enter speciality name"
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={3}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter speciality description"
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={handleModalClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    {editingSpeciality ? "Updating..." : "Creating..."}
                  </>
                ) : editingSpeciality ? (
                  "Update"
                ) : (
                  "Create"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Speciality"
        description={`Are you sure you want to delete "${specialityToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        loading={deleting}
      />
    </div>
  );
}
