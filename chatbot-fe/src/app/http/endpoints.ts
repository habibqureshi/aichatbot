import { SortCriteria } from '@/app/types/settings';

export const ENDPOINTS = {
    BASE_URL:"http://127.0.0.1:8001",
    AUTH: {
        LOGIN: '/api/v1/auth/login',
        REGISTER: '/auth/register',
        LOGOUT: '/auth/logout',
        FORGOT_PASSWORD: '/auth/forgot-password',
        RESET_PASSWORD: '/auth/reset-password',
    },
    AI: {
        SEND_MESSAGE: '/api/v1/chat',
        // GET_CONVERSATION: (id: string) => `/api/v1/chat/${id}`,
    },
    RAG: {
        UPLOAD_FILE: '/api/v1/rag/upload-file',
    },
    USERS: '/users',
    ORDERS: '/orders',
    PRODUCTS: '/products',
    CATEGORIES: '/categories',
    BRANDS: '/brands',
    SETTINGS: {
        LIST: (page: number = 1, size: number = 10, sortCriteria: SortCriteria[] = [
            { field: "key", sortOrder: 1 },
            { field: "createdTs", sortOrder: 0 }
        ]) => `/api/v1/applicationSettings?page=${page}&size=${size}&sortCriteria=${encodeURIComponent(JSON.stringify(sortCriteria))}`,
        UPDATE: (id: number) => `/settings/${id}`,
    },
};