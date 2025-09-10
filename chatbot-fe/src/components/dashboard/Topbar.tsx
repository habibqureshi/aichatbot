"use client";
import { AuthResponse } from "@/app/actions/auth";
import { getSession } from "@/app/actions/session";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState } from "react";

export default function Topbar() {
  const [session, setSession] = useState<AuthResponse | null>(null);
  useEffect(() => {
    const fetchSession = async () => {
      const session = await getSession();
      setSession(session);
    };
    fetchSession();
  }, []);
  return (
    <header className="bg-white shadow-sm">
      <div className="h-16 flex items-center justify-between px-4">
        <div className="flex items-center">
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        </div>
        <div className="flex items-center space-x-4">
          <button className="p-2 rounded-full hover:bg-gray-100">
            <svg
              className="h-6 w-6 text-gray-500"
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
              <span className="text-sm font-medium text-gray-700">
                {session?.user?.username || session?.user?.email}
              </span>
            </button>
            <div className="absolute right-0  w-48 bg-white rounded-md shadow-lg py-1 hidden group-hover:block hover:block">
              <Link
                href="/settings"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Settings
              </Link>
              <Link
                href="/auth/logout"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Logout
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
