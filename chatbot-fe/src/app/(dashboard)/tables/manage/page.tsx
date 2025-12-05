"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SingleSelect from "@/components/common/SingleSelect";
import { toast } from "react-toastify";
import {
  getRestaurantTable,
  createRestaurantTable,
  updateRestaurantTable,
  RestaurantTable,
} from "../../../actions/table-bookings";

interface TableData {
  table_number: string;
  capacity: number;
  location: "front" | "corner" | "roof" | "indoor" | "outdoor";
  is_active: boolean;
}

const LOCATIONS = [
  { id: "front", label: "Front", value: "front" },
  { id: "corner", label: "Corner", value: "corner" },
  { id: "roof", label: "Roof", value: "roof" },
  { id: "indoor", label: "Indoor", value: "indoor" },
  { id: "outdoor", label: "Outdoor", value: "outdoor" },
];

function AddTablePageContent() {
  const searchParams = useSearchParams();
  const tableId = searchParams.get("id");
  const isEditMode = !!tableId;
  const router = useRouter();

  const [formData, setFormData] = useState<TableData>({
    table_number: "",
    capacity: 2,
    location: "indoor",
    is_active: true,
  });
  const [loading, setLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFormValid = () => {
    return formData.table_number.trim() !== "" && formData.capacity > 0;
  };

  // Fetch table data on component mount if editing
  useEffect(() => {
    if (isEditMode && tableId) {
      const fetchTable = async () => {
        try {
          setLoading(true);
          const user_timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          const tableData = await getRestaurantTable(Number(tableId), user_timezone);
          setFormData({
            table_number: tableData.table_number,
            capacity: tableData.capacity,
            location: tableData.location as TableData["location"],
            is_active: tableData.is_active,
          });
          setLoading(false);
        } catch (error) {
          console.error("Error fetching table:", error);
          toast.error("Failed to load table data");
          setLoading(false);
        }
      };

      fetchTable();
    }
  }, [isEditMode, tableId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === "number") {
      setFormData((prev) => ({ ...prev, [name]: Number(value) }));
    } else if (type === "checkbox") {
      const target = e.target as HTMLInputElement;
      setFormData((prev) => ({ ...prev, [name]: target.checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleLocationChange = (value: string | number | null) => {
    setFormData((prev) => ({ ...prev, location: value as TableData["location"] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const user_timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (isEditMode && tableId) {
        // Update existing table
        await updateRestaurantTable(Number(tableId), formData, user_timezone);
        toast.success("Table updated successfully!");
        router.push("/tables");
      } else {
        // Create new table
        await createRestaurantTable(formData, user_timezone);
        toast.success("Table created successfully!");
        router.push("/tables");
      }

      // Reset form only for create mode
      if (!isEditMode) {
        setFormData({
          table_number: "",
          capacity: 2,
          location: "indoor",
          is_active: true,
        });
      }
    } catch (error: unknown) {
      console.error("Error saving table:", error);
      if (error instanceof Error && error.message) {
        toast.error(error.message);
      } else {
        toast.error(`Failed to ${isEditMode ? "update" : "create"} table`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-2 sm:p-4 lg:p-6">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            {isEditMode ? "Edit Table" : "Add Table"}
          </h1>
        </div>
        <div
          className="backdrop-blur-sm border rounded-xl p-6 shadow-sm"
          style={{
            background: "#FFFFFF",
            borderColor: "#F0EEFF",
          }}
        >
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-100 rounded"></div>
            <div className="h-32 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-4 lg:p-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          {isEditMode ? "Edit Table Profile" : "Add Table Profile"}
        </h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          {isEditMode ? "Update table information and settings" : "Add a new table to your restaurant"}
        </p>
      </div>

      <div className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Table Information Card */}
          <div
            className="border rounded-xl p-4 sm:p-6 shadow-sm"
            style={{
              background: "#FFFFFF",
              borderColor: "#F0EEFF",
            }}
          >
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Table Information</h2>
              <p className="text-sm text-gray-600 mt-1">Enter the table details</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label htmlFor="table_number" className="block text-sm font-medium text-gray-900 mb-2">
                  Table ID
                </label>
                <input
                  type="text"
                  id="table_number"
                  name="table_number"
                  value={formData.table_number}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter table ID (e.g., T001)"
                />
              </div>

              <div>
                <label htmlFor="capacity" className="block text-sm font-medium text-gray-900 mb-2">
                  Capacity
                </label>
                <input
                  type="number"
                  id="capacity"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleChange}
                  required
                  min="1"
                  max="20"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter number of seats"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Location</label>
                <SingleSelect
                  options={LOCATIONS.map((location) => ({
                    id: location.id,
                    label: location.label,
                    value: location.value,
                  }))}
                  selectedValue={formData.location}
                  onChange={handleLocationChange}
                  placeholder="Select location"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                  Active (available for bookings)
                </label>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || !isFormValid()}
              className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white ${
                isSubmitting || !isFormValid()
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              } transition-colors duration-200`}
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  {isEditMode ? "Updating Table..." : "Creating Table..."}
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {isEditMode ? "Update Table" : "Save Changes"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AddTablePage() {
  return (
    <Suspense
      fallback={
        <div className="p-6">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        </div>
      }
    >
      <AddTablePageContent />
    </Suspense>
  );
}
