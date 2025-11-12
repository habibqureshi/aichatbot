import React from "react";

export default function Bottombar() {
  return (
    <footer className="bg-transparent border-t">
      <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-2 sm:gap-0 px-4 py-3">
        <div className="text-sm text-gray-500 text-center sm:text-left">
          © 2025 Your Company. All rights reserved.
        </div>
        <div className="flex flex-wrap justify-center sm:justify-end gap-3">
          <a href="#" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Privacy Policy
          </a>
          <a href="#" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Terms of Service
          </a>
          <a href="#" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}
