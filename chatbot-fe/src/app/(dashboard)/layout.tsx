"use client";

import { useState } from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import Bottombar from "@/components/dashboard/Bottombar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col gradient-bg">
      {/* Topbar - Full width at the top */}
      <Topbar onMenuClick={() => setSidebarOpen(true)} />

      <div className="flex flex-1">
        {/* Sidebar with margin-top for topbar space */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main content area */}
        <div className="flex-1 flex flex-col w-full lg:ml-0 content-glass">
          <main className="flex-1 p-1 sm:p-4 overflow-auto">
            {/* <div className="w-full h-full relative z-10">{children}</div> */}
          </main>
          {/* <Bottombar /> */}
        </div>
      </div>
    </div>
  );
}
