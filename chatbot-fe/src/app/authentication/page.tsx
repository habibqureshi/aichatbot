"use client";

import Image from "next/image";
import LoginForm from "@/components/auth/LoginForm";

export default function AuthenticationPage() {
  return (
    <div className="min-h-screen bg-[#F6F7F9] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <Image src="/assets/LOGO.svg" alt="AI Chatbot Logo" width={120} height={70} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to your AI Chatbot account</p>
        </div>

        {/* Auth Forms */}
        <div
          className="border rounded-xl p-8 shadow-sm"
          style={{
            background: "#FFFFFF",
            borderColor: "#F0EEFF",
          }}
        >
          <LoginForm />
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-gray-600">
            {" "}
            © {new Date().getFullYear()} Callsynthra. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
