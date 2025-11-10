"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import SingleSelect from "@/components/common/SingleSelect";
import TimeRangePicker from "@/components/common/TimeRangePicker";
import { getSpecialitiesList, Speciality } from "@/app/actions/specialities";
import { createDoctor, updateDoctor, getDoctorById } from "@/app/actions/doctors";
import { toast } from "react-toastify";

interface TimeSlot {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  date?: string; // Optional date field
}

interface DoctorData {
  name: string;
  specialty_id: number;
  phone_number: string;
  availabilities: Array<{
    start_time: string;
    end_time: string;
    day_of_week: string;
  }>;
  duration: number;
  // Keep timeSlots for UI management
  timeSlots: TimeSlot[];
}

const DAYS_OF_WEEK = [
  { id: "monday", label: "Monday", value: "monday" },
  { id: "tuesday", label: "Tuesday", value: "tuesday" },
  { id: "wednesday", label: "Wednesday", value: "wednesday" },
  { id: "thursday", label: "Thursday", value: "thursday" },
  { id: "friday", label: "Friday", value: "friday" },
  { id: "saturday", label: "Saturday", value: "saturday" },
  { id: "sunday", label: "Sunday", value: "sunday" },
];

export default function AddDoctorPage() {
  const searchParams = useSearchParams();
  const doctorId = searchParams.get("id");
  const isEditMode = !!doctorId;

  const [formData, setFormData] = useState<DoctorData>({
    name: "",
    specialty_id: 0,
    phone_number: "",
    availabilities: [],
    duration: 30,
    timeSlots: [],
  });
  const [specialities, setSpecialities] = useState<Speciality[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDayForSlot, setSelectedDayForSlot] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch specialities and doctor data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch specialities
        const specialitiesResponse = await getSpecialitiesList(1, 100, "UTC");
        setSpecialities(specialitiesResponse.data);

        // If editing, fetch doctor data
        if (isEditMode && doctorId) {
          const doctorResponse = await getDoctorById(parseInt(doctorId), "UTC");

          // Convert availabilities to timeSlots format
          const timeSlots: TimeSlot[] = doctorResponse.availabilities.map((availability, index) => {
            // Extract time from datetime strings (e.g., "09:00:00.000Z" -> "09:00")
            const startTime = availability.start_time.substring(0, 5);
            const endTime = availability.end_time.substring(0, 5);

            return {
              id: `slot-${index}`,
              day: availability.day_of_week,
              startTime,
              endTime,
            };
          });

          // Populate form with doctor data
          setFormData({
            name: doctorResponse.name,
            specialty_id: doctorResponse.specialty.id,
            phone_number: doctorResponse.phone_number,
            availabilities: doctorResponse.availabilities,
            duration: doctorResponse.duration,
            timeSlots,
          });
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isEditMode, doctorId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "number") {
      setFormData((prev) => ({ ...prev, [name]: Number(value) }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleTimeSlotsChange = (timeSlots: TimeSlot[]) => {
    setFormData((prev) => ({ ...prev, timeSlots }));
  };

  const formatTimeDisplay = (time: string) => {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const removeTimeSlot = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      timeSlots: prev.timeSlots.filter((slot) => slot.id !== id),
    }));
  };

  const handleDurationChange = (duration: number) => {
    if (formData.timeSlots.length > 0) {
      toast.error("Cannot change duration when time slots exist. Please clear all slots first.");
      return;
    }
    setFormData((prev) => ({ ...prev, duration }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Convert timeSlots to availabilities format for API
      const availabilities = formData.timeSlots.map((slot) => ({
        start_time: `${slot.startTime}:00.000Z`,
        end_time: `${slot.endTime}:00.000Z`,
        day_of_week: slot.day,
      }));

      const doctorData = {
        name: formData.name,
        specialty_id: formData.specialty_id,
        phone_number: formData.phone_number,
        availabilities,
        duration: formData.duration,
      };
      console.log("doctors data", doctorData);

      if (isEditMode && doctorId) {
        // Update existing doctor
        await updateDoctor(parseInt(doctorId), doctorData, "UTC");
        toast.success("Doctor updated successfully!");
      } else {
        // Create new doctor
        await createDoctor(doctorData, "UTC");
        toast.success("Doctor created successfully!");
      }

      // Reset form only for create mode
      if (!isEditMode) {
        setFormData({
          name: "",
          specialty_id: 0,
          phone_number: "",
          availabilities: [],
          duration: 30,
          timeSlots: [],
        });
        setSelectedDayForSlot("");
      }
    } catch (error) {
      console.error("Error saving doctor:", error);
      toast.error(`Failed to ${isEditMode ? "update" : "create"} doctor`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {isEditMode ? "Edit Doctor Profile" : "Add Doctor Profile"}
        </h1>
      </div>

      <div className="bg-transparent p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Doctor Information Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="border-b border-gray-200 pb-2 mb-4">
              <h3 className="text-lg font-medium text-gray-900">Doctor Information</h3>
              <p className="text-sm text-gray-600">Enter the doctor&apos;s basic details</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Doctor Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter doctor's full name"
                />
              </div>

              <div>
                <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone_number"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter phone number"
                />
              </div>
            </div>
          </div>

          {/* Specialty Selection */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="border-b border-gray-200 pb-2 mb-4">
              <h3 className="text-lg font-medium text-gray-900">Specialty</h3>
              <p className="text-sm text-gray-600">Select the doctor&apos;s specialty</p>
            </div>

            <div className="max-w-md">
              <label htmlFor="specialty_id" className="block text-sm font-medium text-gray-700">
                Specialty
              </label>
              <select
                id="specialty_id"
                name="specialty_id"
                value={formData.specialty_id}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={0}>Select Specialty</option>
                {specialities.map((specialty) => (
                  <option key={specialty.id} value={specialty.id}>
                    {specialty.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Duration Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="border-b border-gray-200 pb-2 mb-4">
              <h3 className="text-lg font-medium text-gray-900">Appointment Duration</h3>
              <p className="text-sm text-gray-600">Select the duration for each appointment</p>
            </div>

            <div className="max-w-md">
              <label className="block text-sm font-medium text-gray-700 mb-3">Duration</label>
              <div className="grid grid-cols-3 gap-3">
                {[15, 30, 60].map((duration) => (
                  <button
                    key={duration}
                    type="button"
                    onClick={() => handleDurationChange(duration)}
                    disabled={formData.timeSlots.length > 0}
                    className={`px-4 py-3 text-sm font-medium rounded-md border transition-colors ${
                      formData.duration === duration
                        ? "bg-blue-500 text-white border-blue-500"
                        : formData.timeSlots.length > 0
                        ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {duration} minutes
                  </button>
                ))}
              </div>
              {formData.timeSlots.length > 0 && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    Duration cannot be changed while slots exist.{" "}
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, timeSlots: [] }))}
                      className="text-yellow-900 underline hover:text-yellow-700 font-medium"
                    >
                      Clear all slots
                    </button>{" "}
                    to change duration.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Time Slots Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="border-b border-gray-200 pb-2 mb-4">
              <h3 className="text-lg font-medium text-gray-900">Time Slots</h3>
              <p className="text-sm text-gray-600">Set the available time slots for appointments</p>
            </div>

            <div className="space-y-4">
              <div className="max-w-lg">
                <SingleSelect
                  label="Select Day for Slot Creation"
                  options={DAYS_OF_WEEK}
                  selectedValue={selectedDayForSlot}
                  onChange={setSelectedDayForSlot}
                  placeholder="Choose a day to create slots"
                />
              </div>

              {selectedDayForSlot && (
                <TimeRangePicker
                  timeSlots={formData.timeSlots}
                  onChange={handleTimeSlotsChange}
                  onDurationChange={handleDurationChange}
                  label=""
                  hideDuration={true}
                  selectedDay={selectedDayForSlot}
                />
              )}
            </div>

            {/* Display created slots in cards */}
            {formData.timeSlots.length > 0 && (
              <div className="mt-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">Created Time Slots</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {formData.timeSlots.map((slot) => {
                    const dayLabel = DAYS_OF_WEEK.find((d) => d.value === slot.day)?.label || slot.day;
                    return (
                      <div
                        key={slot.id}
                        className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h5 className="font-medium text-gray-900">{dayLabel}</h5>
                            <p className="text-sm text-gray-600">
                              {formatTimeDisplay(slot.startTime)} - {formatTimeDisplay(slot.endTime)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeTimeSlot(slot.id)}
                            className="text-red-600 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded-full"
                            aria-label={`Remove slot for ${dayLabel}`}
                          >
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                        <div className="text-xs text-gray-500">
                          Duration: {formData.duration} minutes
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white text-base font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
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
                  {isEditMode ? "Updating Doctor..." : "Creating Doctor..."}
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
                  {isEditMode ? "Update Doctor" : "Save Changes"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
