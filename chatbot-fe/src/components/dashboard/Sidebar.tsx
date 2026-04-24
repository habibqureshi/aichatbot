"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useInstallation } from "@/app/contexts/InstallationContext";
import { clearSession } from "@/app/actions/authSession";
import { toast } from "react-toastify";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: "/assets/sideBarIcons/dashboard.svg",
  },
  {
    name: "Calls",
    href: "/calls",
    icon: "/assets/sideBarIcons/Phone.svg",
  },
  {
    name: "Reservations",
    href: "/reservations",
    icon: "/assets/sideBarIcons/CalendarDots.svg",
    showOnlyFor: "restaurant",
  },
  {
    name: "Orders",
    href: "/orders",
    icon: "/assets/sideBarIcons/booking_inactive.svg",
    showOnlyFor: ["restaurant"],
  },
  {
    name: "Appointments",
    href: "/appointments",
    icon: "/assets/sideBarIcons/CalendarDots.svg",
    showOnlyFor: ["clinic"],
  },

  {
    name: "Doctors",
    href: "/doctors",
    icon: "/assets/sideBarIcons/doctor.svg",
    showOnlyFor: ["clinic"],
  },
  {
    name: "Tables",
    href: "/tables",
    icon: "/assets/sideBarIcons/table.svg",
    showOnlyFor: ["restaurant"],
  },
  // {
  //   name: "Specialities",
  //   href: "/specialities",
  //   icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  // },
  {
    name: "Knowledge",
    href: "/knowledge",
    icon: "/assets/sideBarIcons/Brain.svg",
  },

  // {
  //   name: "Restaurant Settings",
  //   href: "/restaurant-settings",

  //   icon: "/assets/sideBarIcons/Brain.svg",
  //   // showOnlyFor: ["restaurant", ],
  //   // showOnlyFor: ["restaurant", "clinic"],
  // },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { installationType, isLoading, clearInstallation } = useInstallation();
  const normalizedInstallationType = (installationType || "").trim().toLowerCase();

  const handleLinkClick = () => {
    // Close sidebar on mobile when clicking a link
    if (window.innerWidth < 1024) {
      onClose();
    }
  };
  const handleLogoutClick = () => {
    // Close sidebar on mobile when clicking a link
    if (window.innerWidth < 1024) {
      onClose();
    }
    clearSession();
    clearInstallation();
    toast.success("Logout successful");
  };
  // Filter navigation based on installation type
  const filteredNavigation = navigation.filter((item) => {
    if (isLoading) return true; // Show all items while loading
    if (!item.showOnlyFor) return true; // Always show if no restriction
    // If installation type is unknown, keep feature tabs visible.
    if (!normalizedInstallationType) return true;

    if (Array.isArray(item.showOnlyFor)) {
      return item.showOnlyFor.includes(normalizedInstallationType);
    }

    return item.showOnlyFor === normalizedInstallationType;
  });

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={onClose} />}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 z-50 w-[248px] sm:w-[280px] lg:w-[300px] border-r border-transparent bg-brand-purple text-white
            flex flex-col transform transition-transform duration-300 ease-in-out 
            h-screen
            ${isOpen ? "translate-x-0" : "-translate-x-full"} 
            lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="flex items-center h-20  relative">
          <div className="w-[192px] sm:w-[248px] mx-auto h-[56px] flex items-center gap-2 rounded-[16px] p-4 ">
            <Image
              src="/assets/sidebarLogo.svg"
              alt="Logo"
              width={233}
              height={44}
              className="object-contain -mx-3"
            />
            {/* optional title or empty space to match design */}
          </div>
        </div>
        {/* <button
          onClick={onClose}
          aria-label="Close sidebar"
          className="lg:hidden absolute right-0 top-0 p-2 rounded-md hover:bg-white/10 transition-colors text-white"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button> */}
        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 flex flex-col mt-8">
          {/* MENUS heading + items */}
          <div className="mx-auto w-[216px] sm:w-[280px]">
            <h3 className="text-[11px] sm:text-[12px] leading-[1.32] tracking-[0.12em] sm:tracking-[0.24em] uppercase text-[#8695AA] font-medium mb-3">
              Menus
            </h3>
            <div className="space-y-3">
              {filteredNavigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={handleLinkClick}
                    className={`group flex items-center w-[192px] sm:w-[248px] h-[56px] p-4 rounded-[16px] transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-[#A357F7] to-[#CE53B7] text-white"
                        : "text-white hover:bg-gradient-to-r hover:from-[#A357F7]/20 hover:to-[#CE53B7]/20"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Image
                      src={item.icon}
                      alt={`${item.name} icon`}
                      width={18}
                      height={18}
                      className="mr-3"
                    />
                    <span className="text-[14px] sm:text-[16px] font-medium leading-[1.32]">
                      {item.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* SUPPORT heading + items */}
          <div className="mx-auto w-[216px] sm:w-[280px] mt-6">
            <h3 className="text-[11px] sm:text-[12px] leading-[1.32] tracking-[0.12em] sm:tracking-[0.24em] uppercase text-purple-100 font-medium mb-3">
              Support
            </h3>
            <div className="space-y-3">
              <Link
                href="/authentication"
                onClick={handleLogoutClick}
                className="group flex items-center w-[192px] sm:w-[248px] h-[56px] p-4 rounded-[16px] transition-all text-white hover:bg-gradient-to-r hover:from-[#A357F7]/20 hover:to-[#CE53B7]/20"
              >
                <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 11-4 0v-1m0-8V7a2 2 0 114 0v1"
                  />
                </svg>
                <span className="text-[14px] sm:text-[16px] font-medium leading-[1.32]">Logout</span>
              </Link>
            </div>
          </div>

          {/* spacer to push footer to bottom */}
          <div className="flex-1" />
        </nav>

        {/* Powered by footer */}
        <div className="p-4">
          <div className="mx-auto w-[192px] sm:w-[248px] h-[64px] sm:h-[74px] rounded-[16px] px-3 sm:px-4 py-2 bg-[#4C2B97] flex items-center gap-2 sm:gap-3">
            <Image
              src="/assets/sideBarIcons/Shape.svg"
              alt="CallSynthra"
              width={36}
              height={36}
              className="object-contain rounded w-7 h-7 sm:w-9 sm:h-9"
            />
            <div className="text-white">
              <div className="text-[11px] sm:text-[12px] font-medium leading-[1.32]">Powered by</div>
              <div className="text-[14px] sm:text-[16px] font-extrabold leading-[1.25]">CallSynthra</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
