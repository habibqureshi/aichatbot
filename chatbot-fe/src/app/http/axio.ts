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

// Helper function to get refresh token from cookie
async function getRefreshTokenFromCookie(): Promise<string | null> {
  const encryptedRefreshToken = getCookie("refresh_session");
  if (!encryptedRefreshToken) return null;

  try {
    const { decrypt } = await import("@/lib/encryption");
    const decryptedRefreshToken = await decrypt(encryptedRefreshToken);
    return decryptedRefreshToken;
  } catch (error) {
    console.error("Error decrypting refresh token:", error);
    return null;
  }
}

// Helper function to update access token in cookies
async function updateAccessToken(newAccessToken: string): Promise<void> {
  try {
    const { encrypt } = await import("@/lib/encryption");
    const encryptedToken = await encrypt(newAccessToken);
    const Cookies = await import("js-cookie").then((m) => m.default);
    Cookies.set("auth_session", encryptedToken, { path: "/" });
  } catch (error) {
    console.error("Error updating access token:", error);
  }
}

// Helper function to update refresh token in cookies
async function updateRefreshToken(newRefreshToken: string): Promise<void> {
  try {
    const { encrypt } = await import("@/lib/encryption");
    const encryptedRefreshToken = await encrypt(newRefreshToken);
    const Cookies = await import("js-cookie").then((m) => m.default);
    Cookies.set("refresh_session", encryptedRefreshToken, { path: "/", expires: 30 });
  } catch (error) {
    console.error("Error updating refresh token:", error);
  }
}

// Helper function to clear session
async function clearSessionCookies(): Promise<void> {
  try {
    const Cookies = await import("js-cookie").then((m) => m.default);
    Cookies.remove("auth_session");
    Cookies.remove("refresh_session");
  } catch (error) {
    console.error("Error clearing session:", error);
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
      // console.log("Request backend:", {
      //   url: config.baseURL + config.url,
      //   method: config.method,
      //   data: config.data,
      //   headers: config.headers,
      // });
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
    const originalRequest = error.config;
    console.log("Interceptors Error:", error);

    // Handle 401 - Token expired, try to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Get refresh token
        const refreshToken = await getRefreshTokenFromCookie();
        if (!refreshToken) {
          // No refresh token available, redirect to login
          if (typeof window !== "undefined") {
            window.location.href = "/authentication";
          }
          return Promise.reject(error);
        }

        // Call refresh endpoint
        const refreshResponse = await axios.post(`${ENV.NEXT_PUBLIC_API_URL}/api/v1/auth/refresh`, {
          refresh_token: refreshToken,
        });

        // Update access token in cookies
        if (refreshResponse.data.access_token) {
          await updateAccessToken(refreshResponse.data.access_token);

          // Update refresh token if provided
          if (refreshResponse.data.refresh_token) {
            await updateRefreshToken(refreshResponse.data.refresh_token);
          }

          // Retry original request with new token
          const newToken = refreshResponse.data.access_token;
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return API(originalRequest);
        }
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);
        // Refresh failed, redirect to login
        if (typeof window !== "undefined") {
          window.location.href = "/authentication";
        }
        return Promise.reject(error);
      }
    }

    // Handle 403 authentication errors
    if (error.response?.status === 403) {
      // Clear session cookies
      await clearSessionCookies();
      if (typeof window !== "undefined") {
        window.location.href = "/authentication";
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
