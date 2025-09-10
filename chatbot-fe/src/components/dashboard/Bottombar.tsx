import React from 'react'

export default function Bottombar() {
    return (
        <footer className="bg-white border-t">
            <div className="h-12 flex items-center justify-between px-4">
                <div className="text-sm text-gray-500">
                    © 2025 Your Company. All rights reserved.
                </div>
                <div className="flex space-x-4">
                    <a href="#" className="text-sm text-gray-500 hover:text-gray-700">Privacy Policy</a>
                    <a href="#" className="text-sm text-gray-500 hover:text-gray-700">Terms of Service</a>
                    <a href="#" className="text-sm text-gray-500 hover:text-gray-700">Contact</a>
                </div>
            </div>
        </footer>
    )
} 