"use client";

import { useState } from "react";

interface DoctorData {
  name: string;
  experience: string;
  timeSlots: string;
  availableDays: string;
  department: string;
  expertise: string;
}

export default function DoctorsPage() {
  const [formData, setFormData] = useState<DoctorData>({
    name: "",
    experience: "",
    timeSlots: "",
    availableDays: "",
    department: "",
    expertise: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
        experience: "",
        timeSlots: "",
        availableDays: "",
        department: "",
        expertise: "",
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
                Experience
              </label>
              <input
                type="text"
                id="experience"
                name="experience"
                value={formData.experience}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 5 years"
              />
            </div>

            <div>
              <label htmlFor="timeSlots" className="block text-sm font-medium text-gray-700">
                Time Slots
              </label>
              <input
                type="text"
                id="timeSlots"
                name="timeSlots"
                value={formData.timeSlots}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 9:00 AM - 5:00 PM"
              />
            </div>

            <div>
              <label htmlFor="availableDays" className="block text-sm font-medium text-gray-700">
                Available Days
              </label>
              <input
                type="text"
                id="availableDays"
                name="availableDays"
                value={formData.availableDays}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Monday, Wednesday, Friday"
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
