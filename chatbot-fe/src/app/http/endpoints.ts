import { SortCriteria } from "@/app/types/settings";

export const ENDPOINTS = {
  BASE_URL: "http://192.168.1.16:8001",
  AUTH: {
    LOGIN: "/api/v1/auth/login",
    REGISTER: "/auth/register",
    LOGOUT: "/auth/logout",
    FORGOT_PASSWORD: "/auth/forgot-password",
    RESET_PASSWORD: "/auth/reset-password",
  },
  AI: {
    SEND_MESSAGE: "/api/v1/chat",
    // GET_CONVERSATION: (id: string) => `/api/v1/chat/${id}`,
  },
  RAG: {
    UPLOAD_FILE: "/api/v1/rag/upload-file",
  },
  USERS: "/users",
  ORDERS: "/orders",
  PRODUCTS: "/products",
  CATEGORIES: "/categories",
  BRANDS: "/brands",
  DOCTORS: {
    LIST: (
      page: number = 1,
      limit: number = 10,
      user_timezone: string = "UTC",
      specialty_id?: number
    ) => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        user_timezone,
      });
      if (specialty_id !== undefined) {
        params.append("specialty_id", specialty_id.toString());
      }
      return `/api/v1/doctors/?${params.toString()}`;
    },
  },
  SETTINGS: {
    LIST: (
      page: number = 1,
      size: number = 10,
      sortCriteria: SortCriteria[] = [
        { field: "key", sortOrder: 1 },
        { field: "createdTs", sortOrder: 0 },
      ]
    ) =>
      `/api/v1/applicationSettings?page=${page}&size=${size}&sortCriteria=${encodeURIComponent(
        JSON.stringify(sortCriteria)
      )}`,
    UPDATE: (id: number) => `/settings/${id}`,
  },
  KNOWLEDGE: {
    LIST: "/api/v1/knowledge",
    CREATE: "/api/v1/knowledge",
    UPDATE_ACTIVE: "/api/v1/knowledge/active",
  },
};
