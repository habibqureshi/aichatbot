"use client";

import { useState } from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Topbar - Full width at the top */}
      <Topbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} isSidebarOpen={sidebarOpen} />

      <div className="flex flex-1 pt-20">
        {/* Sidebar with margin-top for topbar space */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main content area */}
        <div className="flex-1 flex flex-col w-full lg:pl-64">
          <main className="flex-1 p-1 sm:p-4 overflow-auto">
            <div className="w-full h-full relative z-10">{children}</div>
          </main>
          {/* <Bottombar /> */}
        </div>
      </div>
    </div>
  );
}
