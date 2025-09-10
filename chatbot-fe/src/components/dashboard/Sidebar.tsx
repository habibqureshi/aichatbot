"use client"
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navigation = [
    { name: 'Chat', href: '/chat', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
    { name: 'Train', href: '/train', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
]

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="h-screen w-64 bg-white border-r border-gray-200 text-gray-900 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-center p-4 border-b border-gray-200">
                <h1 className="text-lg font-semibold text-gray-900">Ask AI</h1>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6">
                <div className="space-y-2">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={
                                    `group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors
                                    ${isActive
                                        ? 'bg-gray-100 text-blue-700 font-semibold'
                                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                                    }`
                                }
                                aria-current={isActive ? "page" : undefined}
                            >
                                <svg
                                    className={`mr-3 h-5 w-5 transition-colors ${
                                        isActive
                                            ? 'text-blue-700'
                                            : 'text-gray-500 group-hover:text-gray-700'
                                    }`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                                </svg>
                                {item.name}
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Bottom Section */}
            <div className="border-t border-gray-200 p-4">
                <Link
                    href="/settings"
                    className={
                        `group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors
                        ${pathname === '/settings'
                            ? 'bg-gray-100 text-blue-700 font-semibold'
                            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                        }`
                    }
                    aria-current={pathname === '/settings' ? "page" : undefined}
                >
                    <svg
                        className={`mr-3 h-5 w-5 transition-colors ${
                            pathname === '/settings'
                                ? 'text-blue-700'
                                : 'text-gray-500 group-hover:text-gray-700'
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                </Link>
            </div>
        </div>
    )
} 