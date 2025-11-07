"use client";

import { useState } from "react";
import SingleSelect from "@/components/common/SingleSelect";
import TimeRangePicker from "@/components/common/TimeRangePicker";

interface TimeSlot {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  date?: string; // Optional date field
}

interface DoctorData {
  name: string;
  experience: number;
  timeSlots: TimeSlot[];
  department: string;
  duration: number;
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

export default function DoctorsPage() {
  const [formData, setFormData] = useState<DoctorData>({
    name: "",
    experience: 0,
    timeSlots: [],
    department: "",
    duration: 30, // Default to 30 minutes
  });
  const [selectedDayForSlot, setSelectedDayForSlot] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "number") {
      // For number inputs, convert empty string to 0, otherwise to number
      let numValue = value === "" ? 0 : Number(value);

      // Limit experience to reasonable maximum (60 years)
      if (name === "experience" && numValue > 60) {
        numValue = 60;
      }

      setFormData((prev) => ({ ...prev, [name]: numValue }));
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
    // Prevent changing duration if slots already exist
    if (formData.timeSlots.length > 0) {
      alert("Cannot change duration when time slots exist. Please clear all slots first.");
      return;
    }
    setFormData((prev) => ({ ...prev, duration }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    // Prepare data for backend
    const doctorData = {
      ...formData,
      timeSlots: formData.timeSlots.map((slot) => ({
        day: slot.day,
        startTime: slot.startTime,
        endTime: slot.endTime,
        duration: formData.duration,
      })),
    };

    // Simulate API call
    try {
      console.log("Doctor data with slots:", doctorData);
      // Here you would make an API call to save the doctor data
      // Example: await api.post('/doctors', doctorData);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setMessage("Doctor added successfully!");
      // setFormData({
      //   name: "",
      //   experience: 0,
      //   timeSlots: [],
      //   department: "",
      //   duration: 30,
      // });
      setSelectedDayForSlot("");
    } catch {
      setMessage("Failed to add doctor. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Add Doctor Profile</h1>
      </div>

      <div className="bg-transparent  p-6">
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
                <label htmlFor="experience" className="block text-sm font-medium text-gray-700">
                  Experience (Years)
                </label>
                <input
                  type="number"
                  id="experience"
                  name="experience"
                  value={formData.experience || ""}
                  onChange={handleChange}
                  required
                  min="0"
                  max="60"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Years of experience (0-60)"
                />
                <p className="mt-1 text-xs text-gray-500">Enter years of medical practice experience</p>
              </div>
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

          {/* Additional Information Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="border-b border-gray-200 pb-2 mb-4">
              <h3 className="text-lg font-medium text-gray-900">Additional Information</h3>
              <p className="text-sm text-gray-600">Department and specialization details</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                  Department
                </label>
                <select
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Expertise</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Neurology">Neurology</option>
                  <option value="Orthopedics">Orthopedics</option>
                  <option value="Pediatrics">Pediatrics</option>
                  <option value="Dermatology">Dermatology</option>
                  <option value="General Medicine">General Medicine</option>
                </select>
              </div>
            </div>
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
                  Saving Changes...
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
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>

        {message && (
          <div
            className={`mt-6 p-4 rounded-lg border ${
              message.includes("successfully")
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {message.includes("successfully") ? (
                  <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{message}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
