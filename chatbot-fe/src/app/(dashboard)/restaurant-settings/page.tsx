"use client";

import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { getRestaurantSettings, updateRestaurantSettings } from "@/app/actions/restaurant-settings";

export default function RestaurantSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    restaurant_name: "",
    opening_time: "09:00",
    closing_time: "22:00",
    slot_duration: 30,
    max_advance_booking_days: 30,
    is_active: true,
  });

  // Fetch settings on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const data = await getRestaurantSettings();
        setFormData({
          restaurant_name: data.restaurant_name,
          opening_time: data.opening_time,
          closing_time: data.closing_time,
          slot_duration: data.slot_duration,
          max_advance_booking_days: data.max_advance_booking_days,
          is_active: data.is_active,
        });
      } catch (error) {
        console.error("Error fetching restaurant settings:", error);
        toast.error("Failed to load restaurant settings");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleChange = (field: keyof typeof formData, value: string | number | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      await updateRestaurantSettings(formData);
      toast.success("Restaurant settings updated successfully");
    } catch (error) {
      console.error("Error updating restaurant settings:", error);
      toast.error("Failed to update restaurant settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-2 sm:p-4 lg:p-6">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Restaurant Settings</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Manage your restaurant availability and booking settings
          </p>
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
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Restaurant Settings</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          Configure your restaurant&apos;s availability and booking preferences
        </p>
      </div>

      <div className="max-w-5xl ">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Restaurant Information Section */}
          <div className="space-y-6">
            <div className="border border-gray-200 p-6 rounded-2xl">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Restaurant Information</h2>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="restaurant_name"
                    className="block text-sm font-medium text-gray-900 mb-2"
                  >
                    Restaurant Name
                  </label>
                  <input
                    id="restaurant_name"
                    type="text"
                    value={formData.restaurant_name}
                    onChange={(e) => handleChange("restaurant_name", e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your restaurant name"
                    required
                  />
                </div>

                {/* Active Status */}
                <div className="flex items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => handleChange("is_active", e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="ml-3">
                    <label htmlFor="is_active" className="text-sm font-medium text-gray-900">
                      Restaurant is Active
                    </label>
                    <p className="text-sm text-gray-600">Enable this to accept new bookings</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Operating Hours Section */}
            <div className="border border-gray-200 p-6 rounded-2xl">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Operating Hours</h2>
              <p className="text-sm text-gray-600 mb-4">
                Set your restaurant&apos;s daily operating schedule
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label htmlFor="opening_time" className="block text-sm font-medium text-gray-900 mb-2">
                    Opening Time
                  </label>
                  <input
                    id="opening_time"
                    type="time"
                    value={formData.opening_time}
                    onChange={(e) => handleChange("opening_time", e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="closing_time" className="block text-sm font-medium text-gray-900 mb-2">
                    Closing Time
                  </label>
                  <input
                    id="closing_time"
                    type="time"
                    value={formData.closing_time}
                    onChange={(e) => handleChange("closing_time", e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Booking Settings Section */}
           <div className="border border-gray-200 p-6 rounded-2xl">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Booking Settings</h2>
              <p className="text-sm text-gray-600 mb-4">
                Configure reservation preferences and time slots
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label
                    htmlFor="slot_duration"
                    className="block text-sm font-medium text-gray-900 mb-2"
                  >
                    Slot Duration
                  </label>
                  <select
                    id="slot_duration"
                    value={formData.slot_duration}
                    onChange={(e) => handleChange("slot_duration", parseInt(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                    <option value={120}>2 hours</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="max_advance_booking_days"
                    className="block text-sm font-medium text-gray-900 mb-2"
                  >
                    Maximum Advance Booking
                  </label>
                  <div className="relative">
                    <input
                      id="max_advance_booking_days"
                      type="number"
                      value={formData.max_advance_booking_days}
                      onChange={(e) =>
                        handleChange("max_advance_booking_days", parseInt(e.target.value))
                      }
                      min="1"
                      max="365"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-12"
                      required
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                      days
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Section */}
           <div className="border border-gray-200 p-6 rounded-2xl">
              <div className="flex items-start gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-[#8B5CF6] to-[#3B82F6] rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900">Save Your Settings</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Review your changes and save to apply the new restaurant settings.
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <button type="submit" disabled={saving} className="btn-primary-gradient">
                  {saving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
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
                      Saving Settings...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Save Settings
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
