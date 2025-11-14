import axios from "axios";
import { ENV } from "@/app/utils/env";

// Helper function to get cookie value on client side
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(";").shift();
    return cookieValue || null;
  }
  return null;
}

// Helper function to decrypt and decode token on client side
async function getTokenFromCookie(): Promise<string | null> {
  const encryptedToken = getCookie("auth_session");
  if (!encryptedToken) return null;

  try {
    // Import decrypt function dynamically
    const { decrypt } = await import("@/lib/encryption");
    const decryptedToken = await decrypt(encryptedToken);
    return decryptedToken;
  } catch (error) {
    console.error("Error decrypting token:", error);
    return null;
  }
}

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
    // Get token from cookie and add if exists
    const token = await getTokenFromCookie();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.baseURL && config.url) {
      console.log("Request backend:", {
        url: config.baseURL + config.url,
        method: config.method,
        data: config.data,
        headers: config.headers,
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
    console.log("Interceptors Error:", error);
    if (error.response?.status === 403) {
      // Clear cookie on client side
      if (typeof window !== "undefined") {
        // Delete the auth_session cookie
        document.cookie = "auth_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
        window.location.href = "/auth/login";
      }
    }
    return Promise.reject(error);
  }
);

export { API, axios };
