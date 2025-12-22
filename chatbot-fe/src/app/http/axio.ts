import axios from "axios";
import { ENV } from "@/app/utils/env";

// Prevents multiple refresh requests and queues pending requests using a promise
let refreshingToken: Promise<string> | null = null;

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

async function getTokenFromCookie(): Promise<string | null> {
  const encryptedToken = getCookie("auth_session");
  if (!encryptedToken) return null;

  try {
    const { decrypt } = await import("@/lib/encryption");
    const decryptedToken = await decrypt(encryptedToken);
    return decryptedToken;
  } catch (error) {
    console.error("Error decrypting token:", error);
    return null;
  }
}

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
  headers: {
    "Content-Type": "application/json",
  },
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
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const isRefreshRequest = originalRequest?.url?.includes("/api/v1/auth/refresh");

    // Refresh token expired → logout immediately
    if (isRefreshRequest && error.response?.status === 401) {
      await clearSessionCookies();
      if (typeof window !== "undefined") {
        window.location.href = "/authentication";
      }
      return Promise.reject(error);
    }

    // Access token expired → try refresh ONCE
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!refreshingToken) {
        const refreshToken = await getRefreshTokenFromCookie();
        if (!refreshToken) {
          await clearSessionCookies();
          if (typeof window !== "undefined") {
            window.location.href = "/authentication";
          }
          return Promise.reject(error);
        }

        refreshingToken = axios
          .post(`${ENV.NEXT_PUBLIC_API_URL}/api/v1/auth/refresh`, {
            refresh_token: refreshToken,
          })
          .then(async (res) => {
            await updateAccessToken(res.data.access_token);
            if (res.data.refresh_token) {
              await updateRefreshToken(res.data.refresh_token);
            }
            return res.data.access_token;
          })
          .finally(() => {
            refreshingToken = null;
          });
      }

      try {
        const newToken = await refreshingToken;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return API(originalRequest);
      } catch {
        await clearSessionCookies();
        if (typeof window !== "undefined") {
          window.location.href = "/authentication";
        }
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export { API, axios };
