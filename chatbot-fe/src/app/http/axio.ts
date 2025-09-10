"use server"
import axios from 'axios';
import { ENV } from "@/app/utils/env";
import { clearSession, getSession } from '@/app/actions/session';
import { redirect } from 'next/navigation';

// Create axios instance
const API = axios.create({
    baseURL: ENV.NEXT_PUBLIC_API_URL,
    // headers: {
    //     'Content-Type': 'application/json',
    // },
});

// Request interceptor
API.interceptors.request.use(
    async (config) => {
        // Get session and add token if exists
        const session = await getSession();
        if (session?.token) {
            config.headers.Authorization = `Bearer ${session.token}`;
        }

        if (config.baseURL && config.url) {
            console.log('Request:', {
                url: config.baseURL + config.url,
                method: config.method,
                data: config.data,
                headers: config.headers
            });
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor
API.interceptors.response.use(
    (response) => {

        return response;
    },
    async (error) => {
        console.log(' interceptors Error:', error);
        if (error.response?.status === 403) {
            // Clear localStorage
            console.log(`typeof window`, typeof window);
            try {
                clearSession();
                if (typeof window !== 'undefined') {
                    window.location.href = '/auth/login';
                }
                redirect('/auth/login');


            } catch (e) {
                // Handle server-side case where window/localStorage isn't available
                console.log('Navigation failed:', e);
                throw e
            }
        }
        return Promise.reject(error);
    }
);

export { API, axios };
