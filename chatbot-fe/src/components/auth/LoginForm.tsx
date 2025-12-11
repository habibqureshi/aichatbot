"use client";
import { loginUser, LoginActionResponse } from "@/app/actions/auth";
import React, { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import Error from "@/components/common/error";
import { toast } from "react-toastify";

export default function LoginForm() {
  const initialState: LoginActionResponse = { formData: { username: "", password: "" } };
  const [state, formAction, isPending] = useActionState(loginUser, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast.success("Login successful!");
      router.push("/dashboard");
    }
  }, [state.success, router]);
  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    }
  }, [state.error]);
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
          placeholder="Enter your username"
        />
        {state.fieldErrors?.username && <Error error={state.fieldErrors.username[0]} />}
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
          placeholder="Enter your password"
        />
        {state.fieldErrors?.password && <Error error={state.fieldErrors.password[0]} />}
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
            <span>Signing in...</span>
          </div>
        ) : (
          "Sign In"
        )}
      </Button>
    </form>
  );
}
