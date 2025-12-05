import { useState } from "react";
import { toast } from "react-toastify";

interface TimeSlot {
  id: string;
  day: string;
  startTime: string; // in HH:MM 24h
  endTime: string; // in HH:MM 24h
  date?: string;
}

interface TimeRangePickerProps {
  timeSlots: TimeSlot[];
  onChange: (timeSlots: TimeSlot[]) => void;
  label?: string;
  onDurationChange?: (duration: number) => void;
  hideDuration?: boolean;
  selectedDay?: string;
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
  onDurationChange,
  hideDuration = false,
  selectedDay = "",
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

  // Check if a time conflicts with existing slots on the same day
  const isTimeConflicting = (startTime: string, endTime: string, excludeId?: string): boolean => {
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);

    return timeSlots.some((slot) => {
      if (excludeId && slot.id === excludeId) return false;
      // Only check conflicts for slots on the same day
      if (slot.day !== selectedDay) return false;
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
      toast.error("End time must be after start time");
      return;
    }

    // Check for conflicts with existing slots
    if (isTimeConflicting(newStartTime, newEndTime, editingSlotId || undefined)) {
      toast.error("This time slot conflicts with an existing slot");
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
        day: selectedDay,
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
    // Notify parent component of duration change
    onDurationChange?.(duration);
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
      {label && <label className="block text-sm font-medium text-gray-900 mb-3">{label}</label>}

      <div className="mb-4">
        {/* Duration Selector */}
        {!hideDuration && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-900 mb-2">Appointment Duration</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDurationOpen((v) => !v)}
                className={`w-full px-4 py-3 border rounded-lg shadow-sm bg-white text-gray-900 flex items-center justify-between transition-colors ${
                  isDurationOpen
                    ? "border-blue-500 ring-2 ring-blue-500"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <span
                  className={`flex-1 text-left text-sm ${
                    selectedDuration ? "text-gray-900" : "text-gray-500"
                  }`}
                >
                  {DURATION_OPTIONS.find((d) => d.value === selectedDuration)?.label ||
                    "Select duration"}
                </span>
                <svg
                  className={`h-5 w-5 text-gray-400 transform transition-transform flex-shrink-0 ml-2 ${
                    isDurationOpen ? "rotate-180" : ""
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

              {isDurationOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-lg py-1 text-base border border-gray-200 custom-scrollbar">
                  {DURATION_OPTIONS.map((duration) => (
                    <button
                      key={duration.value}
                      type="button"
                      onClick={() => handleDurationSelect(duration.value)}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors focus:outline-none ${
                        selectedDuration === duration.value
                          ? "bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] text-white font-medium"
                          : "text-gray-900 hover:bg-gray-100"
                      }`}
                    >
                      {duration.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
          {/* Start */}
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-900 mb-2">Start Time</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsStartOpen((v) => !v)}
                className={`w-full px-4 py-3 border rounded-lg shadow-sm bg-white text-gray-900 flex items-center justify-between transition-colors ${
                  isStartOpen
                    ? "border-blue-500 ring-2 ring-blue-500"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <span
                  className={`flex-1 text-left text-sm ${
                    newStartTime ? "text-gray-900" : "text-gray-500"
                  }`}
                >
                  {newStartTime ? formatTimeDisplay(newStartTime) : "Select time"}
                </span>
                <svg
                  className={`h-5 w-5 text-gray-400 transform transition-transform flex-shrink-0 ml-2 ${
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
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-56 rounded-lg py-1 text-base border border-gray-200 overflow-auto custom-scrollbar">
                  {TIME_OPTIONS.map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => handleStartTimeSelect(time)}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors focus:outline-none ${
                        time === newStartTime
                          ? "bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] text-white font-medium"
                          : "text-gray-900 hover:bg-gray-100"
                      }`}
                    >
                      {formatTimeDisplay(time)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* End */}
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-900 mb-2">End Time</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsEndOpen((v) => !v)}
                className={`w-full px-4 py-3 border rounded-lg shadow-sm bg-white text-gray-900 flex items-center justify-between transition-colors ${
                  isEndOpen
                    ? "border-blue-500 ring-2 ring-blue-500"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <span
                  className={`flex-1 text-left text-sm ${
                    newEndTime ? "text-gray-900" : "text-gray-500"
                  }`}
                >
                  {newEndTime ? formatTimeDisplay(newEndTime) : "Select time"}
                </span>
                <svg
                  className={`h-5 w-5 text-gray-400 transform transition-transform flex-shrink-0 ml-2 ${
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
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-56 rounded-lg py-1 text-base border border-gray-200 overflow-auto custom-scrollbar">
                  {TIME_OPTIONS.map((time) => {
                    const isDisabled = newStartTime ? time <= newStartTime : false;
                    return (
                      <button
                        key={time}
                        type="button"
                        onClick={() => !isDisabled && handleEndTimeSelect(time)}
                        disabled={isDisabled}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors focus:outline-none ${
                          isDisabled
                            ? "text-gray-400 cursor-not-allowed bg-gray-50"
                            : time === newEndTime
                            ? "bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] text-white font-medium"
                            : "text-gray-900 hover:bg-gray-100"
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
          <div className="flex-shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={addOrUpdateSlot}
              disabled={!newStartTime || !newEndTime}
              className="btn-primary-gradient w-full sm:w-auto px-6 py-3"
            >
              {editingSlotId ? "Update Slot" : "Add Slot"}
            </button>
          </div>
        </div>
      </div>

      {/* Pills */}
      {timeSlots.length < 1 && <p className="text-sm text-gray-500 italic">No time slots added yet</p>}

      {/* Click outside to close dropdowns */}
      {(isStartOpen || isEndOpen || isDurationOpen) && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => {
            setIsStartOpen(false);
            setIsEndOpen(false);
            setIsDurationOpen(false);
          }}
        />
      )}
    </div>
  );
}
