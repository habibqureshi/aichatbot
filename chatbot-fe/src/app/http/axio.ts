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

    // Handle 403 authentication errors
    if (error.response?.status === 403) {
      // Clear cookie on client side
      if (typeof window !== "undefined") {
        // Delete the auth_session cookie
        document.cookie = "auth_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
        window.location.href = "/auth/login";
      }
    }

    // Parse and format error messages uniformly
    if (error.response?.data) {
      const responseData = error.response.data;

      // Handle ArrayBuffer responses (from responseType: "arraybuffer")
      if (responseData instanceof ArrayBuffer) {
        try {
          const decoder = new TextDecoder();
          const text = decoder.decode(responseData);
          const parsed = JSON.parse(text);

          // Replace the ArrayBuffer with parsed JSON for easier handling
          error.response.data = parsed;

          // Format the error message
          if (parsed.detail) {
            error.message = parsed.detail;
          } else if (parsed.details && Array.isArray(parsed.details)) {
            error.message = parsed.details.map((d: { message?: string }) => d.message).join(", ");
          } else if (parsed.error) {
            error.message = parsed.error;
          }
        } catch (e) {
          console.error("Error parsing ArrayBuffer error response:", e);
        }
      }
      // Handle JSON responses
      else if (typeof responseData === "object") {
        // Format validation errors (422 or 400)
        if (error.response?.status === 422 || error.response?.status === 400) {
          if (
            responseData.details &&
            Array.isArray(responseData.details) &&
            responseData.details.length > 0
          ) {
            error.message = responseData.details
              .map((detail: { message?: string }) => detail.message)
              .join(", ");
          } else if (responseData.detail) {
            error.message = responseData.detail;
          } else if (responseData.error) {
            error.message = responseData.error;
          }
        }
        // Handle other error formats
        else if (responseData.detail) {
          error.message = responseData.detail;
        } else if (responseData.error) {
          error.message = responseData.error;
        } else if (responseData.message) {
          error.message = responseData.message;
        }
      }
    }

    return Promise.reject(error);
  }
);

export { API, axios };
