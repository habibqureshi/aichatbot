"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

export interface ActionMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  className?: string;
}

interface ActionsMenuProps {
  actions: ActionMenuItem[];
  align?: "left" | "right";
}

export function ActionsMenu({ actions, align = "right" }: ActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row selection
    if (!isOpen) {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (rect) {
        setPosition({
          top: rect.bottom,
          left: align === "right" ? rect.right - 192 : rect.left,
        });
      }
    }
    setIsOpen(!isOpen);
  };

  const handleActionClick = (action: ActionMenuItem, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row selection
    action.onClick();
    setIsOpen(false);
  };

  return (
    <div>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="p-2 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        aria-label="Actions menu"
        type="button"
      >
        <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-50 w-48 bg-white rounded-lg shadow-xl animate-in fade-in slide-in-from-top-2 duration-200"
            style={{ top: position.top, left: position.left }}
            onClick={(e) => e.stopPropagation()} // Prevent row selection when clicking inside menu
          >
            <div className="py-1">
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={(e) => handleActionClick(action, e)}
                  className={
                    action.className ||
                    "flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-all duration-150 first:rounded-t-lg last:rounded-b-lg"
                  }
                  type="button"
                >
                  {action.icon && <span className="mr-3">{action.icon}</span>}
                  {action.label}
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
