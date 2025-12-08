"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useInstallation } from "@/app/contexts/InstallationContext";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigation = [
  // {
  //   name: "Chat",
  //   href: "/chat",
  //   icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
  // },
  {
    name: "Calls",
    href: "/calls",
    iconActive: "/assets/sideBarIcons/call_active.svg",
    iconInactive: "/assets/sideBarIcons/call_inactive.svg",
  },
  {
    name: "Bookings",
    href: "/bookings",
    iconActive: "/assets/sideBarIcons/booking_active.svg",
    iconInactive: "/assets/sideBarIcons/booking_inactive.svg",
  },

  // {
  //   name: "Train",
  //   href: "/train",
  //   icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  // },
  {
    name: "Doctors",
    href: "/doctors",
    iconActive: "/assets/sideBarIcons/doctor_active.svg",
    iconInactive: "/assets/sideBarIcons/doctor_inactive.svg",
    showOnlyFor: "clinic",
  },
  {
    name: "Tables",
    href: "/tables",
    iconActive: "/assets/sideBarIcons/booking_active.svg", // Using booking icon as placeholder
    iconInactive: "/assets/sideBarIcons/booking_inactive.svg",
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
    iconActive: "/assets/sideBarIcons/knowledge_active.svg",
    iconInactive: "/assets/sideBarIcons/knowledge_inactive.svg",
  },

  // {
  //   name: "Restaurant Settings",
  //   href: "/restaurant-settings",
  //   iconActive: "/assets/sideBarIcons/knowledge_active.svg", // Using knowledge icon as placeholder
  //   iconInactive: "/assets/sideBarIcons/knowledge_inactive.svg",
  //   showOnlyFor: ["restaurant", ],
  //   // showOnlyFor: ["restaurant", "clinic"],
  // },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { installationType, isLoading } = useInstallation();

  const handleLinkClick = () => {
    // Close sidebar on mobile when clicking a link
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  // Filter navigation based on installation type
  const filteredNavigation = navigation.filter((item) => {
    if (isLoading) return true; // Show all items while loading
    if (!item.showOnlyFor) return true; // Always show if no restriction

    if (Array.isArray(item.showOnlyFor)) {
      return item.showOnlyFor.includes(installationType);
    }

    return item.showOnlyFor === installationType;
  });

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={onClose} />}

      {/* Sidebar */}
      <div
        className={`fixed top-0 lg:top-20 left-0 z-40 w-64 border-r border-transparent bg-brand-purple text-white
              flex flex-col transform transition-transform duration-300 ease-in-out 
              h-screen lg:h-[calc(100vh-5rem)]
              ${isOpen ? "translate-x-0" : "-translate-x-full"} 
              lg:translate-x-0`}
      >
        {/* Header - Only show close button on mobile */}
        <div className="flex items-center justify-end p-4 border-b border-gray-200 lg:hidden">
          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors text-gray-600"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6">
          <div className="space-y-2">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={handleLinkClick}
                  className={`sidebar-item group flex items-center px-4 py-3 rounded-lg transition-all h-[48px] ${
                    isActive ? "bg-gradient-to-r from-[#A357F7] to-[#CE53B7] text-white" : "text-white hover:bg-gradient-to-r hover:from-[#A357F7]/20 hover:to-[#CE53B7]/20"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Image
                    src={isActive ? item.iconActive : item.iconInactive}
                    alt={`${item.name} icon`}
                    width={24}
                    height={24}
                    className="mr-3"
                  />

                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Bottom Section */}
        {/* <div className="border-t border-purple-200/30 p-4">
          <Link
            href="/settings"
            onClick={handleLinkClick}
            className={`sidebar-item group flex items-center px-4 py-3 rounded-lg transition-all hover:bg-purple-100/30
                        ${
                          pathname === "/settings" ? "bg-gradient-to-r from-[#F1E6FF] to-[#E3C5FF]" : ""
                        }`}
            style={{
              color: pathname === "/settings" ? "#751AE5" : "#2A2A2A",
            }}
            aria-current={pathname === "/settings" ? "page" : undefined}
          >
            <svg
              className="mr-3 h-5 w-5 transition-colors"
              style={{ color: pathname === "/settings" ? "#751AE5" : "#666666" }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Settings
          </Link>
        </div> */}
      </div>
    </>
  );
}
