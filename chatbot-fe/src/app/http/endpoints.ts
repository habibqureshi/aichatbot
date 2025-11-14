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
  BOOKINGS: "/bookings",
  PRODUCTS: "/products",
  CATEGORIES: "/categories",
  BRANDS: "/brands",
  DOCTORS: {
    LIST: (
      page: number = 1,
      limit: number = 10,
      user_timezone: string = "UTC",
      specialty_id?: number,
      name?: string
    ) => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        user_timezone,
      });
      if (specialty_id !== undefined) {
        params.append("specialty_id", specialty_id.toString());
      }
      if (name && name.trim()) {
        params.append("name", name.trim());
      }
      return `/api/v1/doctors/?${params.toString()}`;
    },
  },
  APPOINTMENTS: {
    LIST: (
      page: number = 1,
      limit: number = 10,
      user_timezone: string = "UTC",
      doctor_id?: number,
      patient_id?: number,
      status?: string,
      name?: string
    ) => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        user_timezone,
      });
      if (doctor_id !== undefined) {
        params.append("doctor_id", doctor_id.toString());
      }
      if (patient_id !== undefined) {
        params.append("patient_id", patient_id.toString());
      }
      if (status && status.trim()) {
        params.append("status", status.trim());
      }
      if (name && name.trim()) {
        params.append("name", name.trim());
      }
      return `/api/v1/appointments/?${params.toString()}`;
    },
  },
  CONVERSATIONS: {
    LIST: (
      page: number = 1,
      limit: number = 10,
      user_timezone: string = "UTC",
      status?: string,
      name?: string
    ) => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        user_timezone,
      });
      if (status && status.trim()) {
        params.append("status", status.trim());
      }
      if (name && name.trim()) {
        params.append("name", name.trim());
      }
      return `/api/v1/conversation/?${params.toString()}`;
    },
    MESSAGES: (conversationId: number, page: number = 1, limit: number = 10) => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      return `/api/v1/conversation/${conversationId}/messages?${params.toString()}`;
    },
    STREAM: (conversationId: number) => `/api/v1/appointment/${conversationId}/stream`,
  },
  SPECIALITIES: {
    LIST: (page: number = 1, limit: number = 10, user_timezone: string = "UTC") => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        user_timezone,
      });
      return `/api/v1/specialities/?${params.toString()}`;
    },
    GET: (specialityId: number, user_timezone: string = "UTC") =>
      `/api/v1/specialities/${specialityId}?user_timezone=${user_timezone}`,
    CREATE: (user_timezone: string = "UTC") => `/api/v1/specialities/?user_timezone=${user_timezone}`,
    UPDATE: (specialityId: number, user_timezone: string = "UTC") =>
      `/api/v1/specialities/${specialityId}?user_timezone=${user_timezone}`,
    DELETE: (specialityId: number) => `/api/v1/specialities/${specialityId}`,
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
    LIST: (page: number = 1, limit: number = 10) => `/api/v1/rag/?page=${page}&limit=${limit}`,
    CREATE: "/api/v1/rag/upload-file",
    UPDATE_ACTIVE: (knowledgeId: number) => `/api/v1/rag/activate/${knowledgeId}`,
  },
};
