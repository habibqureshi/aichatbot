"use client";

import React, { useState, useRef, useEffect } from "react";
// Image not used here but imported in other places; removed to keep file clean

type Option = { id: string | number; label: string; value: string | number };

type OnChangeFn = (value: string | number | null) => void;

type Props = {
  options: Option[];
  selectedValue: string | number | null;
  onChange: OnChangeFn;
  trigger?: React.ReactNode;
};

export default function CallFilterDropdown({ options, selectedValue, onChange, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (val: string | number) => {
    onChange(val);
  };

  return (
    <div className="relative inline-block" ref={ref}>
      <div onClick={() => setOpen((v) => !v)}>{trigger}</div>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white border rounded-md shadow-lg z-50">
          <div className="p-3">
            <p className="text-sm font-medium text-gray-700 mb-2">Filter by Status</p>
            <div className="space-y-1">
              {options.map((opt) => (
                <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    checked={String(selectedValue) === String(opt.value)}
                    onChange={() => handleChange(opt.value)}
                    className="form-radio"
                  />
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <button
                onClick={() => {
                  onChange("all");
                  setOpen(false);
                }}
                className="text-sm px-3 py-1 rounded border text-gray-700"
              >
                Reset
              </button>
              <button
                onClick={() => setOpen(false)}
                className="text-sm px-3 py-1 rounded bg-indigo-600 text-white"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
