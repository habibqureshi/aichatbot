import { useState } from "react";

interface SingleSelectProps {
  options: { id: string | number; label: string; value: string | number }[];
  selectedValue: string | number | null;
  onChange: (value: string | number | null) => void;
  placeholder?: string;
  label?: string;
  emptyMessage?: string;
}

export default function SingleSelect({
  options,
  selectedValue,
  onChange,
  placeholder = "Select option",
  label,
  emptyMessage = "No data available",
}: SingleSelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (value: string | number) => {
    onChange(value);
    setIsOpen(false);
  };

  const selectedOption = options.find((option) => option.value === selectedValue);

  return (
    <div className="relative">
      {label && <label className="block text-sm font-medium text-gray-900 mb-2">{label}</label>}
      <div className="mt-1 relative" onClick={() => setIsOpen(!isOpen)}>
        <div
          className={`w-full px-4 py-3 border rounded-lg shadow-sm bg-white text-gray-900 cursor-pointer flex items-center justify-between transition-colors ${
            isOpen ? "border-blue-500 ring-2 ring-blue-500" : "border-gray-300 hover:border-gray-400"
          }`}
        >
          <span
            className={`flex-1 text-left text-sm ${selectedOption ? "text-gray-900" : "text-gray-500"}`}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <svg
            className={`h-5 w-5 text-gray-400 transform transition-transform flex-shrink-0 ml-2 ${
              isOpen ? "rotate-180" : ""
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
        </div>

        {isOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-lg py-1 text-base overflow-auto focus:outline-none border border-gray-200 custom-scrollbar">
            {options.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">{emptyMessage}</div>
            ) : (
              options.map((option) => (
                <div
                  key={option.id}
                  className={`cursor-pointer select-none relative py-2.5 px-4 transition-colors ${
                    selectedValue === option.value
                      ? "bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] text-white"
                      : "text-gray-900 hover:bg-gray-100"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(option.value);
                  }}
                >
                  <span
                    className={`block truncate text-sm ${
                      selectedValue === option.value ? "font-medium" : "font-normal"
                    }`}
                  >
                    {option.label}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Overlay to close dropdown when clicking outside */}
      {isOpen && <div className="fixed inset-0 z-0" onClick={() => setIsOpen(false)} />}
    </div>
  );
}
