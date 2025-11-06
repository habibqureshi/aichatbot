import { useState } from "react";

interface TimeSlot {
  id: string;
  startTime: string; // in HH:MM 24h
  endTime: string; // in HH:MM 24h
}

interface TimeRangePickerProps {
  timeSlots: TimeSlot[];
  onChange: (timeSlots: TimeSlot[]) => void;
  label?: string;
}

const DURATION_OPTIONS = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 60, label: "60 minutes" },
];

// Generate time options based on duration step
const generateTimeOptions = (stepMinutes: number): string[] => {
  const options: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += stepMinutes) {
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      options.push(`${hh}:${mm}`);
    }
  }
  return options;
};

export default function TimeRangePicker({
  timeSlots,
  onChange,
  label = "Time Slots",
}: TimeRangePickerProps) {
  const [newStartTime, setNewStartTime] = useState("");
  const [newEndTime, setNewEndTime] = useState("");
  const [selectedDuration, setSelectedDuration] = useState(30); // Default to 30 minutes
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isEndOpen, setIsEndOpen] = useState(false);
  const [isDurationOpen, setIsDurationOpen] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);

  // Generate time options based on selected duration
  const TIME_OPTIONS = generateTimeOptions(selectedDuration);

  const formatTimeDisplay = (time: string) => {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Check if a time conflicts with existing slots
  const isTimeConflicting = (startTime: string, endTime: string, excludeId?: string): boolean => {
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);

    return timeSlots.some((slot) => {
      if (excludeId && slot.id === excludeId) return false;
      const slotStart = timeToMinutes(slot.startTime);
      const slotEnd = timeToMinutes(slot.endTime);
      // Check for overlap: not (end <= slotStart || start >= slotEnd)
      return !(end <= slotStart || start >= slotEnd);
    });
  };

  // Convert HH:MM to total minutes
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const addOrUpdateSlot = () => {
    if (!newStartTime || !newEndTime) return;
    if (newEndTime <= newStartTime) {
      alert("End time must be after start time");
      return;
    }

    // Check for conflicts with existing slots
    if (isTimeConflicting(newStartTime, newEndTime, editingSlotId || undefined)) {
      alert("This time slot conflicts with an existing slot");
      return;
    }

    if (editingSlotId) {
      const updated = timeSlots.map((s) =>
        s.id === editingSlotId ? { ...s, startTime: newStartTime, endTime: newEndTime } : s
      );
      onChange(updated);
      setEditingSlotId(null);
    } else {
      const newSlot: TimeSlot = {
        id: Date.now().toString(),
        startTime: newStartTime,
        endTime: newEndTime,
      };
      onChange([...timeSlots, newSlot]);
    }

    setNewStartTime("");
    setNewEndTime("");
    setIsStartOpen(false);
    setIsEndOpen(false);
  };

  const handleStartTimeSelect = (time: string) => {
    setNewStartTime(time);
    setIsStartOpen(false);
  };

  const handleEndTimeSelect = (time: string) => {
    setNewEndTime(time);
    setIsEndOpen(false);
  };

  const handleDurationSelect = (duration: number) => {
    setSelectedDuration(duration);
    setIsDurationOpen(false);
    // Clear current selections when duration changes
    setNewStartTime("");
    setNewEndTime("");
  };

  const removeTimeSlot = (id: string) => {
    onChange(timeSlots.filter((slot) => slot.id !== id));
    if (editingSlotId === id) {
      setEditingSlotId(null);
      setNewStartTime("");
      setNewEndTime("");
    }
  };

  const startEdit = (slot: TimeSlot) => {
    setEditingSlotId(slot.id);
    setNewStartTime(slot.startTime);
    setNewEndTime(slot.endTime);
    setIsStartOpen(false);
  };

  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-3">{label}</label>}

      <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
        {/* Duration Selector */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-600 mb-1">Appointment Duration</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDurationOpen((v) => !v)}
              className="w-full px-3 py-2 text-left border border-gray-300 rounded-md shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between"
            >
              <span className="text-gray-900">
                {DURATION_OPTIONS.find((d) => d.value === selectedDuration)?.label || "Select duration"}
              </span>
              <svg
                className={`h-4 w-4 text-gray-400 transform transition-transform ${
                  isDurationOpen ? "rotate-180" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isDurationOpen && (
              <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md py-1 text-base ring-1 ring-black ring-opacity-5">
                {DURATION_OPTIONS.map((duration) => (
                  <button
                    key={duration.value}
                    type="button"
                    onClick={() => handleDurationSelect(duration.value)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                  >
                    {duration.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Start */}
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Start Time</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsStartOpen((v) => !v)}
                className="w-full px-3 py-2 text-left border border-gray-300 rounded-md shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between"
              >
                <span className={newStartTime ? "text-gray-900" : "text-gray-500"}>
                  {newStartTime ? formatTimeDisplay(newStartTime) : "Select time"}
                </span>
                <svg
                  className={`h-4 w-4 text-gray-400 transform transition-transform ${
                    isStartOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {isStartOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-56 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto">
                  {TIME_OPTIONS.map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => handleStartTimeSelect(time)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                    >
                      {formatTimeDisplay(time)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* End */}
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">End Time</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsEndOpen((v) => !v)}
                className="w-full px-3 py-2 text-left border border-gray-300 rounded-md shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between"
              >
                <span className={newEndTime ? "text-gray-900" : "text-gray-500"}>
                  {newEndTime ? formatTimeDisplay(newEndTime) : "Select time"}
                </span>
                <svg
                  className={`h-4 w-4 text-gray-400 transform transition-transform ${
                    isEndOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {isEndOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-56 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto">
                  {TIME_OPTIONS.map((time) => {
                    const isDisabled = newStartTime ? time <= newStartTime : false;
                    return (
                      <button
                        key={time}
                        type="button"
                        onClick={() => !isDisabled && handleEndTimeSelect(time)}
                        disabled={isDisabled}
                        className={`w-full text-left px-3 py-2 focus:outline-none ${
                          isDisabled
                            ? "text-gray-400 cursor-not-allowed bg-gray-50"
                            : "hover:bg-gray-100 focus:bg-gray-100 text-gray-900"
                        }`}
                      >
                        {formatTimeDisplay(time)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Add / Update */}
          <div className="flex-shrink-0">
            <button
              type="button"
              onClick={addOrUpdateSlot}
              disabled={!newStartTime || !newEndTime}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {editingSlotId ? "Update Slot" : "Add Slot"}
            </button>
          </div>
        </div>
      </div>

      {/* Pills */}
      {timeSlots.length > 0 ? (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Time Slots:</h4>
          <div className="flex flex-wrap gap-2">
            {timeSlots.map((slot) => (
              <div
                key={slot.id}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-blue-50 text-blue-900 border border-blue-100"
              >
                <button
                  type="button"
                  onClick={() => startEdit(slot)}
                  className="text-sm text-blue-900 hover:underline focus:outline-none"
                >
                  {formatTimeDisplay(slot.startTime)} - {formatTimeDisplay(slot.endTime)}
                </button>

                <button
                  type="button"
                  onClick={() => removeTimeSlot(slot.id)}
                  className="text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-full"
                  aria-label={`Remove ${slot.startTime} to ${slot.endTime}`}
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        </div>
      ) : (
        <p className="text-sm text-gray-500 italic">No time slots added yet</p>
      )}

      {/* Click outside to close dropdowns */}
      {(isStartOpen || isDurationOpen) && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => {
            setIsStartOpen(false);
            setIsDurationOpen(false);
          }}
        />
      )}
    </div>
  );
}
