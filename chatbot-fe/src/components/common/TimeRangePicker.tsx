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
      {label && (
        <label className="flex items-baseline gap-1 mb-2 font-semibold text-[20px] leading-[132%] text-black">
          <span>{label}</span>
        </label>
      )}

      <div className="mb-4">
        {/* Duration Selector */}
        {!hideDuration && (
          <div className="mb-4">
            <label className="flex items-baseline gap-1 mb-2 font-semibold text-[20px] leading-[132%] text-black">
              <span>Appointment Duration</span>
            </label>
            <div className="relative">
              <div
                className={`w-full rounded-[8px] bg-white flex items-center transition-colors cursor-pointer ${
                  isDurationOpen ? "ring-2 ring-blue-500" : ""
                }`}
                onClick={() => setIsDurationOpen((v) => !v)}
              >
                <input
                  type="text"
                  className="flex-1 h-[42px] pt-1 pr-[19px] pb-1 pl-[19px] bg-transparent text-black font-normal text-[16px] leading-[132%] focus:outline-none placeholder:text-[#00000059] border-none rounded-[8px] cursor-pointer"
                  placeholder="Select duration"
                  value={DURATION_OPTIONS.find((d) => d.value === selectedDuration)?.label || ""}
                  readOnly
                />
                <button
                  type="button"
                  className="px-3 py-3 flex items-center justify-center hover:bg-gray-50 rounded-r-[8px]"
                >
                  <svg
                    className={`h-5 w-5 text-gray-400 transform transition-transform ${
                      isDurationOpen ? "rotate-180" : ""
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>

              {isDurationOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-60 rounded-lg py-1 text-base overflow-auto focus:outline-none border border-gray-200 custom-scrollbar">
                  {DURATION_OPTIONS.map((duration) => (
                    <div
                      key={duration.value}
                      className={`cursor-pointer select-none relative py-2.5 px-4 transition-colors ${
                        selectedDuration === duration.value
                          ? "bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] text-white"
                          : "text-gray-900 hover:bg-gray-100"
                      }`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleDurationSelect(duration.value);
                      }}
                    >
                      <span
                        className={`block truncate text-sm ${
                          selectedDuration === duration.value ? "font-medium" : "font-normal"
                        }`}
                      >
                        {duration.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
          {/* Start */}
          <div className="flex-1 w-full">
            <label className="flex items-baseline gap-1 mb-2 font-semibold text-[16px] leading-[132%] text-black">
              <span>Start Time</span>
            </label>
            <div className="relative">
              <div
                className={`w-full rounded-[8px] bg-white flex items-center transition-colors cursor-pointer ${
                  isStartOpen ? "ring-2 ring-blue-500" : ""
                }`}
                onClick={() => setIsStartOpen((v) => !v)}
              >
                <input
                  type="text"
                  className="flex-1 h-[42px] pt-1 pr-[19px] pb-1 pl-[19px] bg-transparent text-black font-normal text-[16px] leading-[132%] focus:outline-none placeholder:text-[#00000059] border-none rounded-[8px] cursor-pointer"
                  placeholder="Select time"
                  value={newStartTime ? formatTimeDisplay(newStartTime) : ""}
                  readOnly
                />
                <button
                  type="button"
                  className="px-3 py-3 flex items-center justify-center hover:bg-gray-50 rounded-r-[8px]"
                >
                  <svg
                    className={`h-5 w-5 text-gray-400 transform transition-transform ${
                      isStartOpen ? "rotate-180" : ""
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>

              {isStartOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-60 rounded-lg py-1 text-base overflow-auto focus:outline-none border border-gray-200 custom-scrollbar">
                  {TIME_OPTIONS.map((time) => (
                    <div
                      key={time}
                      className={`cursor-pointer select-none relative py-2.5 px-4 transition-colors ${
                        time === newStartTime
                          ? "bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] text-white"
                          : "text-gray-900 hover:bg-gray-100"
                      }`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleStartTimeSelect(time);
                      }}
                    >
                      <span
                        className={`block truncate text-sm ${
                          time === newStartTime ? "font-medium" : "font-normal"
                        }`}
                      >
                        {formatTimeDisplay(time)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* End */}
          <div className="flex-1 w-full">
            <label className="flex items-baseline gap-1 mb-2 font-semibold text-[16px] leading-[132%] text-black">
              <span>End Time</span>
            </label>
            <div className="relative">
              <div
                className={`w-full rounded-[8px] bg-white flex items-center transition-colors cursor-pointer ${
                  isEndOpen ? "ring-2 ring-blue-500" : ""
                }`}
                onClick={() => setIsEndOpen((v) => !v)}
              >
                <input
                  type="text"
                  className="flex-1 h-[42px] pt-1 pr-[19px] pb-1 pl-[19px] bg-transparent text-black font-normal text-[16px] leading-[132%] focus:outline-none placeholder:text-[#00000059] border-none rounded-[8px] cursor-pointer"
                  placeholder="Select time"
                  value={newEndTime ? formatTimeDisplay(newEndTime) : ""}
                  readOnly
                />
                <button
                  type="button"
                  className="px-3 py-3 flex items-center justify-center hover:bg-gray-50 rounded-r-[8px]"
                >
                  <svg
                    className={`h-5 w-5 text-gray-400 transform transition-transform ${
                      isEndOpen ? "rotate-180" : ""
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>

              {isEndOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-60 rounded-lg py-1 text-base overflow-auto focus:outline-none border border-gray-200 custom-scrollbar">
                  {TIME_OPTIONS.map((time) => {
                    const isDisabled = newStartTime ? time <= newStartTime : false;
                    return (
                      <div
                        key={time}
                        className={`cursor-pointer select-none relative py-2.5 px-4 transition-colors ${
                          isDisabled
                            ? "text-gray-400 cursor-not-allowed bg-gray-50"
                            : time === newEndTime
                            ? "bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] text-white"
                            : "text-gray-900 hover:bg-gray-100"
                        }`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          if (!isDisabled) handleEndTimeSelect(time);
                        }}
                      >
                        <span
                          className={`block truncate text-sm ${
                            time === newEndTime ? "font-medium" : "font-normal"
                          }`}
                        >
                          {formatTimeDisplay(time)}
                        </span>
                      </div>
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
