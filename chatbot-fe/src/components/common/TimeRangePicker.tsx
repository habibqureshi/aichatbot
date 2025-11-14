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
      {label && <label className="block form-label text-base mb-3">{label}</label>}

      <div className="mb-4">
        {/* Duration Selector */}
        {!hideDuration && (
          <div className="mb-4">
            <label className="block form-label text-base mb-1">Appointment Duration</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDurationOpen((v) => !v)}
                className={`select-component w-full flex items-center justify-between ${
                  isDurationOpen ? "open" : ""
                }`}
              >
                <span className={`flex-1 text-left ${selectedDuration ? "selected-text" : ""}`}>
                  {DURATION_OPTIONS.find((d) => d.value === selectedDuration)?.label ||
                    "Select duration"}
                </span>
                <svg
                  className={`h-4 w-4 text-gray-400 transform transition-transform ${
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
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md py-1 text-base border border-[#4318FF]">
                  {DURATION_OPTIONS.map((duration) => (
                    <button
                      key={duration.value}
                      type="button"
                      onClick={() => handleDurationSelect(duration.value)}
                      className={`w-full text-left px-3 py-2 focus:outline-none ${
                        selectedDuration === duration.value
                          ? "bg-[#FCFCFC] selected-text"
                          : "hover:bg-gray-100 focus:bg-gray-100"
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

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Start */}
          <div className="max-w-lg flex-1">
            <label className="block form-label text-base mb-1">Start Time</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsStartOpen((v) => !v)}
                className={`select-component w-full flex items-center justify-between ${
                  isStartOpen ? "open" : ""
                }`}
              >
                <span className={`flex-1 text-left ${newStartTime ? "selected-text" : ""}`}>
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
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-56 rounded-md py-1 text-base border border-[#4318FF] overflow-auto">
                  {TIME_OPTIONS.map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => handleStartTimeSelect(time)}
                      className={`w-full text-left px-3 py-2 focus:outline-none ${
                        time === newStartTime
                          ? "bg-[#FCFCFC] selected-text"
                          : "hover:bg-gray-100 focus:bg-gray-100"
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
          <div className="max-w-lg flex-1">
            <label className="block form-label text-base mb-1">End Time</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsEndOpen((v) => !v)}
                className={`select-component w-full flex items-center justify-between ${
                  isEndOpen ? "open" : ""
                }`}
              >
                <span className={`flex-1 text-left ${newEndTime ? "selected-text" : ""}`}>
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
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-56 rounded-md py-1 text-base border border-[#4318FF] overflow-auto">
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
                            : time === newEndTime
                            ? "bg-[#FCFCFC] selected-text"
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
              className="px-4 py-2 mt-4 bg-transparent text-[#4318FF] border border-[#4318FF] text-sm font-medium rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-[138px] h-[43px]"
            >
              {editingSlotId ? "Update Slot" : "Add Slot"}
            </button>
          </div>
        </div>
      </div>

      {/* Pills */}
      {timeSlots.length < 1 && <p className="text-sm text-gray-500 italic">No time slots added yet</p>}

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
