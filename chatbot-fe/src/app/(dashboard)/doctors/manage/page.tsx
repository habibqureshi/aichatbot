"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SingleSelect from "@/components/common/SingleSelect";
import TimeRangePicker from "@/components/common/TimeRangePicker";
import { getSpecialitiesList } from "@/app/actions/specialities";
import { createDoctor, updateDoctor, getDoctorById } from "@/app/actions/doctors";
import { toast } from "react-toastify";
import { AddDoctorSkeleton, SpecialtySkeleton } from "@/components/ui/skeleton-loader";

interface TimeSlot {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  date?: string; // Optional date field
}

interface DoctorData {
  name: string;
  specialty: string;
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

function AddDoctorPageContent() {
  const searchParams = useSearchParams();
  const doctorId = searchParams.get("id");
  const isEditMode = !!doctorId;
  const router = useRouter();

  const [formData, setFormData] = useState<DoctorData>({
    name: "",
    specialty: "",
    phone_number: "",
    availabilities: [],
    duration: 30,
    timeSlots: [],
  });
  const [specialities, setSpecialities] = useState<string[]>([]);
  const [loading, setLoading] = useState(isEditMode); // Only show loading for edit mode
  const [loadingSpecialities, setLoadingSpecialities] = useState(true); // Separate loading for specialities
  const [selectedDayForSlot, setSelectedDayForSlot] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFormValid = () => {
    return (
      formData.name.trim() !== "" &&
      formData.phone_number.trim() !== "" &&
      formData.specialty.trim() !== "" &&
      formData.timeSlots.length > 0
    );
  };

  // Fetch specialities and doctor data on component mount
  useEffect(() => {
    // Move user_timezone inside useEffect so it's not recalculated on every render
    const user_timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const fetchData = async () => {
      try {
        // Fetch specialities (always needed)
        setLoadingSpecialities(true);
        const specialitiesResponse = await getSpecialitiesList(1, 100, user_timezone);
        // console.log("specialitiesResponse", specialitiesResponse);
        setSpecialities(specialitiesResponse.data);
        setLoadingSpecialities(false);

        // If editing, fetch doctor data
        if (isEditMode && doctorId) {
          setLoading(true);
          const doctorResponse = await getDoctorById(parseInt(doctorId), user_timezone);

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
            specialty: doctorResponse.specialty,
            phone_number: doctorResponse.phone_number,
            availabilities: doctorResponse.availabilities,
            duration: doctorResponse.duration,
            timeSlots,
          });
          setLoading(false);
        }
      } catch (error: unknown) {
        console.error("Error fetching data:", error);
        if (error instanceof Error && error.message) {
          toast.error(error.message);
        } else {
          toast.error("Failed to load data");
        }
        setLoadingSpecialities(false);
        setLoading(false);
      }
    };

    fetchData();
    // Remove user_timezone from dependencies - it should only run when doctorId changes
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
      const user_timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const availabilities = formData.timeSlots.map((slot) => ({
        start_time: `${slot.startTime}:00.000Z`,
        end_time: `${slot.endTime}:00.000Z`,
        day_of_week: slot.day,
      }));

      const doctorData = {
        name: formData.name,
        specialty: formData.specialty,
        phone_number: formData.phone_number,
        availabilities,
        duration: formData.duration,
      };
      console.log("doctors data", doctorData);

      if (isEditMode && doctorId) {
        // Update existing doctor
        await updateDoctor(parseInt(doctorId), doctorData, user_timezone);
        toast.success("Doctor updated successfully!");
        router.push("/doctors");
      } else {
        // Create new doctor
        await createDoctor(doctorData, user_timezone);
        router.push("/doctors");
        toast.success("Doctor created successfully!");
      }

      // Reset form only for create mode
      if (!isEditMode) {
        setFormData({
          name: "",
          specialty: "",
          phone_number: "",
          availabilities: [],
          duration: 30,
          timeSlots: [],
        });
        setSelectedDayForSlot("");
      }
    } catch (error: unknown) {
      console.error("Error saving doctor:", error);
      if (error instanceof Error && error.message) {
        toast.error(error.message);
      } else {
        toast.error(`Failed to ${isEditMode ? "update" : "create"} doctor`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <AddDoctorSkeleton />;
  }

  return (
    <div className="p-2 sm:p-4 lg:p-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          {isEditMode ? "Edit Doctor Profile" : "Add Doctor Profile"}
        </h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          {isEditMode ? "Update doctor information and availability" : "Add a new doctor to your team"}
        </p>
      </div>

      <div className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Doctor Information Card */}
          <div
            className="border rounded-xl p-4 sm:p-6 shadow-sm"
            style={{
              background: "#FFFFFF",
              borderColor: "#F0EEFF",
            }}
          >
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Doctor Information</h2>
              <p className="text-sm text-gray-600 mt-1">Enter the doctor&apos;s basic details</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-2">
                  Doctor Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter doctor's full name"
                />
              </div>

              <div>
                <label htmlFor="phone_number" className="block text-sm font-medium text-gray-900 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone_number"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                {loadingSpecialities ? (
                  <SpecialtySkeleton />
                ) : (
                  <>
                    <label
                      htmlFor="specialty_id"
                      className="block text-sm font-medium text-gray-900 mb-2"
                    >
                      Specialty
                    </label>
                    <SingleSelect
                      label=""
                      options={specialities.map((specialty, index) => ({
                        id: index.toString(),
                        label: specialty,
                        value: specialty,
                      }))}
                      selectedValue={formData.specialty}
                      onChange={(value) =>
                        setFormData((prev) => ({ ...prev, specialty: value as string }))
                      }
                      placeholder="Select Specialty"
                      searchable={true}
                    />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Duration and Time Slots Card */}
          <div
            className="border rounded-xl p-4 sm:p-6 shadow-sm space-y-6"
            style={{
              background: "#FFFFFF",
              borderColor: "#F0EEFF",
            }}
          >
            {/* Duration Section */}
            <div>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Appointment Duration</h2>
                <p className="text-sm text-gray-600 mt-1">Select the duration for each appointment</p>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-900 mb-3">Duration</label>
                <div className="flex flex-wrap gap-3">
                  {[15, 30, 60].map((duration) => (
                    <button
                      key={duration}
                      type="button"
                      onClick={() => handleDurationChange(duration)}
                      disabled={formData.timeSlots.length > 0}
                      className={`px-6 py-3 text-sm font-medium rounded-lg transition-all ${
                        formData.duration === duration
                          ? "bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] text-white shadow-md"
                          : formData.timeSlots.length > 0
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-300"
                          : "bg-white text-gray-700 border border-gray-300 hover:border-[#8B5CF6] hover:text-[#8B5CF6]"
                      }`}
                    >
                      {duration} minutes
                    </button>
                  ))}
                </div>
                {formData.timeSlots.length > 0 && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <svg
                        className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <p className="text-sm text-blue-800">
                        Duration cannot be changed while slots exist.{" "}
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, timeSlots: [] }))}
                          className="underline font-medium text-blue-700 hover:text-blue-900"
                        >
                          Clear all slots
                        </button>{" "}
                        to change duration.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Time Slots Section */}
            <div className="border-t border-gray-200 pt-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Time Slots</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Set the available time slots for appointments
                </p>
              </div>

              <div className="space-y-4">
                <div className="max-w-2xl">
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Select Day for Slot Creation
                  </label>
                  <SingleSelect
                    label=""
                    options={DAYS_OF_WEEK}
                    selectedValue={selectedDayForSlot}
                    onChange={(value) => setSelectedDayForSlot(value as string)}
                    placeholder="Choose a day to create slots"
                    searchable={true}
                  />
                </div>

                <TimeRangePicker
                  timeSlots={formData.timeSlots}
                  onChange={handleTimeSlotsChange}
                  onDurationChange={handleDurationChange}
                  label=""
                  hideDuration={true}
                  selectedDay={selectedDayForSlot}
                />
              </div>

              {/* Display created slots in cards */}
              {formData.timeSlots.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-4">Created Time Slots</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {formData.timeSlots.map((slot) => {
                      const dayLabel = DAYS_OF_WEEK.find((d) => d.value === slot.day)?.label || slot.day;
                      return (
                        <div
                          key={slot.id}
                          className="relative bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-[#8B5CF6] to-[#3B82F6] rounded-lg flex items-center justify-center">
                              <svg
                                className="w-5 h-5 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="text-sm font-semibold text-gray-900 mb-1">{dayLabel}</h5>
                              <p className="text-xs text-gray-700">
                                {formatTimeDisplay(slot.startTime)} - {formatTimeDisplay(slot.endTime)}
                              </p>
                              <p className="text-xs text-gray-600 mt-1">
                                Duration: {formData.duration} min
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeTimeSlot(slot.id)}
                            className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
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
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Submit Section */}
          <div
            className="backdrop-blur-sm border rounded-xl p-4 sm:p-6 shadow-sm"
            style={{
              background: "#FFFFFF",
              borderColor: "#F0EEFF",
            }}
          >
            <div className="space-y-4">
              {!isFormValid() && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 mb-2">
                        Please complete all required fields:
                      </p>
                      <ul className="text-sm space-y-1 ml-4 list-disc text-amber-800">
                        {formData.name.trim() === "" && <li>Doctor Name is required</li>}
                        {formData.phone_number.trim() === "" && <li>Phone Number is required</li>}
                        {formData.specialty.trim() === "" && <li>Specialty must be selected</li>}
                        {formData.timeSlots.length === 0 && (
                          <li>At least one time slot must be created</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting || !isFormValid()}
                  className="btn-primary-gradient"
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
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AddDoctorPage() {
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
      <AddDoctorPageContent />
    </Suspense>
  );
}
