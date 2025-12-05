"use client";
import { signupUser, SignupActionResponse } from "@/app/actions/auth";
import React, { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import Error from "@/components/common/error";

export default function SignupForm() {
  const initialState: SignupActionResponse = {
    formData: { username: "", email: "", password: "", confirmPassword: "" },
  };
  const [state, formAction, isPending] = useActionState(signupUser, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      router.push("/dashboard");
    }
  }, [state.success, router]);

  return (
    <form className="space-y-6" action={formAction}>
      <div className="space-y-2">
        <label htmlFor="username" className="block text-sm font-medium text-gray-900 mb-2">
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          defaultValue={state.formData?.username}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Choose a username"
        />
        {state.fieldErrors?.username && <Error error={state.fieldErrors.username[0]} />}
      </div>

      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          defaultValue={state.formData?.email}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter your email"
        />
        {state.fieldErrors?.email && <Error error={state.fieldErrors.email[0]} />}
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium text-gray-900 mb-2">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          defaultValue={state.formData?.password}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Create a password"
        />
        {state.fieldErrors?.password && <Error error={state.fieldErrors.password[0]} />}
      </div>

      <div className="space-y-2">
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-900 mb-2">
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          defaultValue={state.formData?.confirmPassword}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Confirm your password"
        />
        {state.fieldErrors?.confirmPassword && <Error error={state.fieldErrors.confirmPassword[0]} />}
      </div>

      <Button
        disabled={isPending}
        variant="default"
        size="lg"
        type="submit"
        className="w-full btn-primary-gradient"
      >
        {isPending ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
            <span>Creating account...</span>
          </div>
        ) : (
          "Create Account"
        )}
      </Button>

      {state.error && <Error error={state.error} />}
    </form>
  );
}
