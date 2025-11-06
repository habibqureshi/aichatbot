import { useState } from "react";

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
}

interface TimeRangePickerProps {
  timeSlots: TimeSlot[];
  onChange: (timeSlots: TimeSlot[]) => void;
  label?: string;
}

export default function TimeRangePicker({
  timeSlots,
  onChange,
  label = "Time Slots",
}: TimeRangePickerProps) {
  const [newStartTime, setNewStartTime] = useState("");
  const [newEndTime, setNewEndTime] = useState("");

  const addTimeSlot = () => {
    if (!newStartTime || !newEndTime) return;

    const newSlot: TimeSlot = {
      id: Date.now().toString(),
      startTime: newStartTime,
      endTime: newEndTime,
    };

    onChange([...timeSlots, newSlot]);
    setNewStartTime("");
    setNewEndTime("");
  };

  const removeTimeSlot = (id: string) => {
    onChange(timeSlots.filter((slot) => slot.id !== id));
  };

  const formatTimeDisplay = (time: string) => {
    // Convert 24-hour format to 12-hour format for display
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>}

      {/* Add new time slot */}
      <div className="mb-4 p-4 border border-gray-200 rounded-md bg-gray-50">
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Start Time</label>
            <input
              type="time"
              value={newStartTime}
              onChange={(e) => setNewStartTime(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">End Time</label>
            <input
              type="time"
              value={newEndTime}
              onChange={(e) => setNewEndTime(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={addTimeSlot}
            disabled={!newStartTime || !newEndTime}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Slot
          </button>
        </div>
      </div>

      {/* Display existing time slots */}
      {timeSlots.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Selected Time Slots:</h4>
          {timeSlots.map((slot) => (
            <div
              key={slot.id}
              className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-md"
            >
              <span className="text-sm text-gray-900">
                {formatTimeDisplay(slot.startTime)} - {formatTimeDisplay(slot.endTime)}
              </span>
              <button
                type="button"
                onClick={() => removeTimeSlot(slot.id)}
                className="text-red-600 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {timeSlots.length === 0 && <p className="text-sm text-gray-500 italic">No time slots added yet</p>}
    </div>
  );
}
