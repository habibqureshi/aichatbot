"use server";

import { API, axios } from "@/app/http/axio";
import { z } from "zod";
import { ENDPOINTS } from "@/app/http/endpoints";
import { createSession } from "@/app/actions/session";

// Define the form schema
const LoginSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username cannot exceed 50 characters"),
  password: z
    .string()
    .min(3, "Password must be at least 3 characters")
    .max(100, "Password cannot exceed 100 characters"),
});

// Type for the form data
export type LoginFormType = z.infer<typeof LoginSchema>;

// Type for the response
export interface AuthResponse {
  token?: string;
  user?: {
    id: number;
    email: string;
    username: string;
    permissions: string[];
  };
  expiresIn?: number;
  refreshToken?: string;
  refreshTokenExpiresIn?: number;
  error?: string;
}

export type LoginActionResponse = {
  fieldErrors?: {
    username?: string[];
    password?: string[];
  };
  error?: string;
  success?: boolean;
  data?: AuthResponse;
  formData?: {
    username: string;
    password: string;
  };
};

export async function loginUser(
  prevState: LoginActionResponse,
  formData: FormData
): Promise<LoginActionResponse> {
  // Extract form data
  const data = {
    username: formData.get("username") as string,
    password: formData.get("password") as string,
  };

  try {
    // Validate form data
    const validatedFields = LoginSchema.safeParse(data);

    // Return validation errors if any
    if (!validatedFields.success) {
      return {
        fieldErrors: validatedFields.error.flatten().fieldErrors,
        formData: data,
      };
    }

    // API call
    const response = await API.post<AuthResponse>(ENDPOINTS.AUTH.LOGIN, {
      username: validatedFields.data.username,
      password: validatedFields.data.password,
    });

    console.log("response", response.data);
    // Create session
    if (response.data.token) {
      await createSession(response.data, response.data.expiresIn);
    }

    return {
      success: true,
      data: response.data,
      formData: data,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return {
        error: error.response?.data?.detail || "Authentication failed",
        formData: data,
      };
    }
    console.log("error", error);
    return {
      error: "Something went wrong",
      formData: data,
    };
  }
}

// Define the signup schema
const SignupSchema = z
  .object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(50, "Username cannot exceed 50 characters"),
    email: z
      .string()
      .email("Please enter a valid email address")
      .max(100, "Email cannot exceed 100 characters"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(100, "Password cannot exceed 100 characters"),
    confirmPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(100, "Password cannot exceed 100 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// Type for the signup form data
export type SignupFormType = z.infer<typeof SignupSchema>;

// Type for the signup response
export type SignupActionResponse = {
  fieldErrors?: {
    username?: string[];
    email?: string[];
    password?: string[];
    confirmPassword?: string[];
  };
  error?: string;
  success?: boolean;
  data?: AuthResponse;
  formData?: {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
  };
};

export async function signupUser(
  prevState: SignupActionResponse,
  formData: FormData
): Promise<SignupActionResponse> {
  // Extract form data
  const data = {
    username: formData.get("username") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  };

  try {
    // Validate form data
    const validatedFields = SignupSchema.safeParse(data);

    // Return validation errors if any
    if (!validatedFields.success) {
      return {
        fieldErrors: validatedFields.error.flatten().fieldErrors,
        formData: data,
      };
    }

    // API call - assuming there's a signup endpoint
    const response = await API.post<AuthResponse>(ENDPOINTS.AUTH.REGISTER || "/auth/register", {
      username: validatedFields.data.username,
      email: validatedFields.data.email,
      password: validatedFields.data.password,
    });

    console.log("signup response", response.data);
    // Create session
    if (response.data.token) {
      await createSession(response.data, response.data.expiresIn);
    }

    return {
      success: true,
      data: response.data,
      formData: data,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return {
        error: error.response?.data?.detail || "Registration failed",
        formData: data,
      };
    }
    console.log("signup error", error);
    return {
      error: "Something went wrong",
      formData: data,
    };
  }
}
