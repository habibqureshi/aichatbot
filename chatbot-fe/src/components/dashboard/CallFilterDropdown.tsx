"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

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
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isMounted, setIsMounted] = useState(false);
  const [isPositioned, setIsPositioned] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !triggerRef.current) {
      setIsPositioned(false);
      return;
    }

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) {
        setPosition({
          top: rect.bottom + 8,
          left: Math.max(16, rect.left),
        });
        setIsPositioned(true);
      }
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const handleChange = (val: string | number) => {
    onChange(val);
    setOpen(false);
  };

  return (
    <>
      <div ref={triggerRef} onClick={() => setOpen(!open)}>
        {trigger}
      </div>

      {open &&
        isMounted &&
        isPositioned &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed w-56 bg-white border border-[#D5D9E2] rounded-md shadow-lg z-[9999] animate-in fade-in duration-200"
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
            }}
          >
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
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
