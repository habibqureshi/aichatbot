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
      {label && <label className="block form-label text-base mb-2">{label}</label>}
      <div className="mt-1 relative" onClick={() => setIsOpen(!isOpen)}>
        <div
          className={`select-component w-full cursor-pointer flex items-center justify-between ${
            isOpen ? "open" : ""
          }`}
        >
          <span className={`flex-1 text-left ${selectedOption ? "selected-text" : ""}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <svg
            className={`h-5 w-5 text-gray-400 transform transition-transform ${
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
          <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none border border-[#4318FF]">
            {options.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 text-center">{emptyMessage}</div>
            ) : (
              options.map((option) => (
                <div
                  key={option.id}
                  className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-100 ${
                    selectedValue === option.value ? "bg-[#FCFCFC] selected-text" : ""
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(option.value);
                  }}
                >
                  <span className="block font-normal truncate">{option.label}</span>
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
