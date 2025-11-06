"use client";

import { useState } from "react";
import MultiSelect from "@/components/common/MultiSelect";
import TimeRangePicker from "@/components/common/TimeRangePicker";

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
}

interface DoctorData {
  name: string;
  experience: number;
  timeSlots: TimeSlot[];
  availableDays: string[];
  department: string;
  expertise: string;
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
    availableDays: [],
    department: "",
    expertise: "",
    duration: 30, // Default to 30 minutes
  });
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

  const handleDaysChange = (selectedDays: string[]) => {
    setFormData((prev) => ({ ...prev, availableDays: selectedDays }));
  };

  const handleTimeSlotsChange = (timeSlots: TimeSlot[]) => {
    setFormData((prev) => ({ ...prev, timeSlots }));
  };

  const handleDurationChange = (duration: number) => {
    setFormData((prev) => ({ ...prev, duration }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    // Simulate API call
    try {
      console.log("form data", formData);
      // Here you would make an API call to save the doctor data
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setMessage("Doctor added successfully!");
      setFormData({
        name: "",
        experience: 0,
        timeSlots: [],
        availableDays: [],
        department: "",
        expertise: "",
        duration: 30,
      });
    } catch {
      setMessage("Failed to add doctor. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Upload Doctor Data</h1>
        <p className="text-gray-600 mt-1">Add new doctor information to the system</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

            <div className="md:col-span-2">
              <TimeRangePicker
                timeSlots={formData.timeSlots}
                onChange={handleTimeSlotsChange}
                onDurationChange={handleDurationChange}
                label="Time Slots"
              />
            </div>

            <div>
              <MultiSelect
                label="Available Days"
                options={DAYS_OF_WEEK}
                selectedValues={formData.availableDays}
                onChange={handleDaysChange}
                placeholder="Select available days"
              />
            </div>

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
                <option value="">Select Department</option>
                <option value="Cardiology">Cardiology</option>
                <option value="Neurology">Neurology</option>
                <option value="Orthopedics">Orthopedics</option>
                <option value="Pediatrics">Pediatrics</option>
                <option value="Dermatology">Dermatology</option>
                <option value="General Medicine">General Medicine</option>
              </select>
            </div>

            <div>
              <label htmlFor="expertise" className="block text-sm font-medium text-gray-700">
                Expertise (Specialization)
              </label>
              <input
                type="text"
                id="expertise"
                name="expertise"
                value={formData.expertise}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Heart Surgery, Brain Disorders"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Adding Doctor..." : "Add Doctor"}
            </button>
          </div>
        </form>

        {message && (
          <div
            className={`mt-4 p-4 rounded-md ${
              message.includes("successfully") ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
