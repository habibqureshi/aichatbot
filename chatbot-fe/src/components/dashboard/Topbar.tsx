"use client";
import { AuthResponse } from "@/app/actions/auth";
import { getSession } from "@/app/actions/session";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState } from "react";

interface TopbarProps {
  onMenuClick: () => void;
  isSidebarOpen?: boolean;
}

export default function Topbar({ onMenuClick, isSidebarOpen = false }: TopbarProps) {
  const [session, setSession] = useState<AuthResponse | null>(null);
  useEffect(() => {
    const fetchSession = async () => {
      const session = await getSession();
      setSession(session);
    };
    fetchSession();
  }, []);
  return (
    <header className="fixed top-0 w-full z-50 bg-white border-b border-gray-100">
      <div className="h-20 flex items-center justify-between px-4 lg:px-10">
        <div className="flex items-center gap-4">
          {/* Hamburger menu button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-md hover:bg-gray-50 transition-colors text-gray-700"
          >
            {isSidebarOpen ? (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>

          <Image src="/assets/LOGO.svg" alt="Logo" width={200} height={100} className="object-contain" />
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
          <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <svg
              className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </button>
          <div className="relative group">
            <button className="flex items-center space-x-2">
              <Image
                width={32}
                height={32}
                src="/assets/images/user.png"
                alt="User avatar"
                className="h-8 w-8 rounded-full"
              />
              <span className="hidden sm:block text-sm font-medium text-gray-800">
                {session?.user?.username || session?.user?.email}
              </span>
            </button>
            {/* <div className="absolute right-0 w-48 bg-white rounded-md shadow-lg py-1 hidden group-hover:block hover:block z-50">
              <Link
                href="/settings"
                className="block px-4 py-2 text-sm hover:bg-gray-50"
                style={{ color: "#2A2A2A" }}
              >
                Settings
              </Link>
              <Link
                href="/auth/logout"
                className="block px-4 py-2 text-sm hover:bg-gray-50"
                style={{ color: "#2A2A2A" }}
              >
                Logout
              </Link>
            </div> */}
          </div>
        </div>
      </div>
    </header>
  );
}
