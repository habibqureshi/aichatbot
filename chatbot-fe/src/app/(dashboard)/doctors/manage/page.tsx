"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SingleSelect from "@/components/common/SingleSelect";
import TimeRangePicker from "@/components/common/TimeRangePicker";
import { getSpecialitiesList, Speciality } from "@/app/actions/specialities";
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

function AddDoctorPageContent() {
  const searchParams = useSearchParams();
  const doctorId = searchParams.get("id");
  const isEditMode = !!doctorId;
  const router = useRouter();

  const [formData, setFormData] = useState<DoctorData>({
    name: "",
    specialty_id: 0,
    phone_number: "",
    availabilities: [],
    duration: 30,
    timeSlots: [],
  });
  const [specialities, setSpecialities] = useState<Speciality[]>([]);
  const [loading, setLoading] = useState(isEditMode); // Only show loading for edit mode
  const [loadingSpecialities, setLoadingSpecialities] = useState(true); // Separate loading for specialities
  const [selectedDayForSlot, setSelectedDayForSlot] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFormValid = () => {
    return (
      formData.name.trim() !== "" &&
      formData.phone_number.trim() !== "" &&
      formData.specialty_id > 0 &&
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
            specialty_id: doctorResponse.specialty.id,
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
        specialty_id: formData.specialty_id,
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
          specialty_id: 0,
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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#2A2A2A]">
          {isEditMode ? "Edit Doctor Profile" : "Add Doctor Profile"}
        </h1>
      </div>

      <div className="bg-transparent py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Doctor Information Card */}
          <div className="bg-[#F4F4FD] rounded-lg p-4 shadow-sm">
            <div
              className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 py-8 px-4 rounded-lg"
              style={{ border: "1px solid #E3C5FF" }}
            >
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-[#2A2A2A]">
                  Doctor Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full px-3 py-2 rounded-md shadow-sm bg-white text-[#2A2A2A]"
                  style={{ border: "1px solid #E3C5FF", outline: "none" }}
                  placeholder="Enter doctor's full name"
                />
              </div>

              <div>
                <label htmlFor="phone_number" className="block text-sm font-medium text-[#2A2A2A]">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone_number"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full px-3 py-2 rounded-md shadow-sm bg-white text-[#2A2A2A]"
                  style={{ border: "1px solid #E3C5FF", outline: "none" }}
                  placeholder="Enter phone number"
                />
              </div>
              <div className="max-w-md">
                {loadingSpecialities ? (
                  <SpecialtySkeleton />
                ) : (
                  <>
                    <label htmlFor="specialty_id" className="block text-sm font-medium text-[#2A2A2A]">
                      Specialty
                    </label>
                    <select
                      id="specialty_id"
                      name="specialty_id"
                      value={formData.specialty_id}
                      onChange={handleChange}
                      required
                      className="mt-1 block w-full px-3 py-2 rounded-md shadow-sm bg-white text-[#2A2A2A]"
                      style={{ border: "1px solid #E3C5FF", outline: "none" }}
                    >
                      <option value={0}>Select Specialty</option>
                      {specialities.map((specialty) => (
                        <option key={specialty.id} value={specialty.id}>
                          {specialty.name}
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Duration Card */}
          <div className="bg-[#F4F4FD] rounded-lg p-4 shadow-sm space-y-6">
            <div className=" rounded-lg p-6 shadow-sm" style={{ border: "1px solid #E3C5FF" }}>
              <div className="pb-2 mb-4" style={{ borderBottom: "1px solid #E3C5FF" }}>
                <h3 className="text-lg font-medium text-[#2A2A2A]">Appointment Duration</h3>
                <p className="text-sm text-[#787878]">Select the duration for each appointment</p>
              </div>

              <div className="max-w-md">
                <label className="block text-sm font-medium text-[#2A2A2A] mb-3">Duration</label>
                <div className="grid grid-cols-3 gap-3">
                  {[15, 30, 60].map((duration) => (
                    <button
                      key={duration}
                      type="button"
                      onClick={() => handleDurationChange(duration)}
                      disabled={formData.timeSlots.length > 0}
                      className={`px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                        formData.duration === duration
                          ? "bg-gradient-to-r from-[#9882F7] to-[#4318FF] text-white"
                          : formData.timeSlots.length > 0
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-white text-[#2A2A2A]"
                      }`}
                      style={{
                        border:
                          formData.duration === duration ? "1px solid #4318ff" : "1px solid #E3C5FF",
                      }}
                    >
                      {duration} minutes
                    </button>
                  ))}
                </div>
                {formData.timeSlots.length > 0 && (
                  <div
                    className="mt-3 p-3 rounded-md"
                    style={{ backgroundColor: "#F4F4FD", border: "1px solid #E3C5FF" }}
                  >
                    <p className="text-sm" style={{ color: "#2A2A2A" }}>
                      Duration cannot be changed while slots exist.{" "}
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, timeSlots: [] }))}
                        className="underline font-medium"
                        style={{ color: "#4318FF" }}
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
            <div className="rounded-lg p-6 shadow-sm" style={{ border: "1px solid #E3C5FF" }}>
              <div className="pb-2 mb-4" style={{ borderBottom: "1px solid #E3C5FF" }}>
                <h3 className="text-lg font-medium text-[#2A2A2A]">Time Slots</h3>
                <p className="text-sm text-[#787878]">Set the available time slots for appointments</p>
              </div>

              <div className="space-y-4">
                <div className="max-w-lg">
                  <SingleSelect
                    label="Select Day for Slot Creation"
                    options={DAYS_OF_WEEK}
                    selectedValue={selectedDayForSlot}
                    onChange={(value) => setSelectedDayForSlot(value as string)}
                    placeholder="Choose a day to create slots"
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
                  <h4 className="text-md font-medium text-[#2A2A2A] mb-4">Created Time Slots</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {formData.timeSlots.map((slot) => {
                      const dayLabel = DAYS_OF_WEEK.find((d) => d.value === slot.day)?.label || slot.day;
                      return (
                        <div
                          key={slot.id}
                          className="bg-white rounded-lg p-4 shadow-sm"
                          style={{ border: "1px solid #E3C5FF" }}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h5 className="font-medium text-[#2A2A2A]">{dayLabel}</h5>
                              <p className="text-sm text-[#787878]">
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
                          <div className="text-xs text-[#787878]">
                            Duration: {formData.duration} minutes
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end pt-6" style={{ borderTop: "1px solid #E3C5FF" }}>
            <div className="flex flex-col items-end gap-3 w-full">
              {!isFormValid() && (
                <div
                  className="w-full rounded-lg p-4 shadow-sm"
                  style={{ backgroundColor: "#F4F4FD", border: "1px solid #E3C5FF" }}
                >
                  <p className="text-sm font-semibold mb-2" style={{ color: "#2A2A2A" }}>
                    Please complete all required fields:
                  </p>
                  <ul className="text-sm space-y-1 ml-4 list-disc" style={{ color: "#4318FF" }}>
                    {formData.name.trim() === "" && <li>Doctor Name is required</li>}
                    {formData.phone_number.trim() === "" && <li>Phone Number is required</li>}
                    {formData.specialty_id === 0 && <li>Specialty must be selected</li>}
                    {formData.timeSlots.length === 0 && <li>At least one time slot must be created</li>}
                  </ul>
                </div>
              )}
              <button
                type="submit"
                disabled={isSubmitting || !isFormValid()}
                className="inline-flex items-center px-6 py-3 text-white text-base font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 bg-gradient-to-r from-[#9882F7] to-[#4318FF]"
                style={{
                  borderColor: isSubmitting || !isFormValid() ? "#9CA3AF" : "#4318ff",
                }}
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
