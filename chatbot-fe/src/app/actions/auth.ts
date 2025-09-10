'use server'

import { API, axios } from '@/app/http/axio';
import { z } from 'zod';
import { ENDPOINTS } from '@/app/http/endpoints';
import { createSession } from '@/app/actions/session';

// Define the form schema
const LoginSchema = z.object({
    username: z.string()
        .min(3, 'Username must be at least 3 characters')
        .max(50, 'Username cannot exceed 50 characters'),
    password: z.string()
        .min(3, 'Password must be at least 3 characters')
        .max(100, 'Password cannot exceed 100 characters'),
});

// Type for the form data
export type LoginFormType = z.infer<typeof LoginSchema>;

// Type for the response
export interface AuthResponse {
    token?: string;
    user?: {
        id: number,
        email: string,
        username: string,
        permissions: string[]
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

export async function loginUser(prevState: LoginActionResponse, formData: FormData): Promise<LoginActionResponse> {
    // Extract form data
    const data = {
        username: formData.get('username') as string,
        password: formData.get('password') as string,
    };

    try {
        // Validate form data
        const validatedFields = LoginSchema.safeParse(data);

        // Return validation errors if any
        if (!validatedFields.success) {
            return {
                fieldErrors: validatedFields.error.flatten().fieldErrors,
                formData: data
            };
        }

        // API call
        const response = await API.post<AuthResponse>(ENDPOINTS.AUTH.LOGIN, {
            username: validatedFields.data.username,
            password: validatedFields.data.password,
        });

        console.log('response', response.data)
        // Create session
        if (response.data.token) {
            await createSession(response.data, response.data.expiresIn);
        }

        return {
            success: true,
            data: response.data,
            formData: data
        };

    } catch (error) {
        if (axios.isAxiosError(error)) {
            return {
                error: error.response?.data?.detail || 'Authentication failed',
                formData: data
            };
        }
        console.log('error', error)
        return {
            error: 'Something went wrong',
            formData: data
        };
    }
}