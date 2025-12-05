"use client";
import { useState } from "react";

import Image from "next/image";
import LoginForm from "@/components/auth/LoginForm";
import SignupForm from "@/components/auth/SignupForm";

export default function AuthenticationPage() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-accent flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <Image src="/assets/LOGO.svg" alt="AI Chatbot Logo" width={120} height={70} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isLogin ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="text-gray-600">
            {isLogin ? "Sign in to your AI Chatbot account" : "Join us and start your journey"}
          </p>
        </div>

        {/* Auth Forms */}
        <div
          className="border rounded-xl p-8 shadow-sm"
          style={{
            background: "#FFFFFF",
            borderColor: "#F0EEFF",
          }}
        >
          {isLogin ? <LoginForm /> : <SignupForm />}

          {/* Toggle between login/signup */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] bg-clip-text text-transparent font-medium px-3 py-1 hover:underline hover:decoration-[#8B5CF6] hover:decoration-2 hover:cursor-pointer transition-all duration-200"
              >
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </p>
          </div>
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
