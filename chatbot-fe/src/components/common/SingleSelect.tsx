import { useState, useEffect, useRef } from "react";

interface SingleSelectProps {
  options: { id: string | number; label: string; value: string | number }[];
  selectedValue: string | number | null;
  onChange: (value: string | number | null) => void;
  placeholder?: string;
  label?: string;
  emptyMessage?: string;
  searchable?: boolean;
}

export default function SingleSelect({
  options,
  selectedValue,
  onChange,
  placeholder = "Select option",
  label,
  emptyMessage = "No data available",
  searchable = false,
}: SingleSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((option) => option.value === selectedValue);

  // Filter options based on input value
  const filteredOptions =
    searchable && inputValue
      ? options.filter((option) => option.label.toLowerCase().includes(inputValue.toLowerCase()))
      : options;

  // Update input value when selected option changes
  useEffect(() => {
    if (selectedOption) {
      setInputValue(selectedOption.label);
    } else {
      setInputValue("");
    }
  }, [selectedOption]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && !(event.target as Element).closest(".single-select-container")) {
        setIsOpen(false);
        // Reset input to selected value if no valid selection
        if (selectedOption) {
          setInputValue(selectedOption.label);
        } else {
          setInputValue("");
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, selectedOption]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    if (!isOpen && searchable) {
      setIsOpen(true);
    }
  };

  // Handle input focus
  const handleInputFocus = () => {
    if (searchable) {
      setIsOpen(true);
    }
  };

  // Handle option selection
  const handleSelect = (value: string | number) => {
    onChange(value);
    setIsOpen(false);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      if (selectedOption) {
        setInputValue(selectedOption.label);
      } else {
        setInputValue("");
      }
    } else if (e.key === "Enter" && filteredOptions.length === 1) {
      // Auto-select if only one option matches
      handleSelect(filteredOptions[0].value);
    } else if (e.key === "ArrowDown" && !isOpen) {
      setIsOpen(true);
    }
  };

  // Handle toggle button click
  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen && searchable) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  return (
    <div className="relative single-select-container">
      {label && <label className="block text-sm font-medium text-gray-900 mb-2">{label}</label>}
      <div className="mt-1 relative">
        <div
          className={`w-full border rounded-lg shadow-sm bg-white text-gray-900 flex items-center transition-colors ${
            isOpen ? "border-blue-500 ring-2 ring-blue-500" : "border-gray-300 hover:border-gray-400"
          }`}
        >
          <input
            ref={inputRef}
            type="text"
            className="flex-1 px-4 py-3 text-sm border-none outline-none bg-transparent"
            placeholder={placeholder}
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            readOnly={!searchable}
          />
          <button
            type="button"
            onClick={handleToggle}
            className="px-3 py-3 flex items-center justify-center hover:bg-gray-50"
          >
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
          </button>
        </div>

        {isOpen && (
          <div className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-60 rounded-lg py-1 text-base overflow-auto focus:outline-none border border-gray-200 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                {inputValue && searchable ? "No matching options" : emptyMessage}
              </div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.id}
                  className={`cursor-pointer select-none relative py-2.5 px-4 transition-colors ${
                    selectedValue === option.value
                      ? "bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] text-white"
                      : "text-gray-900 hover:bg-gray-100"
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
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
    </div>
  );
}
