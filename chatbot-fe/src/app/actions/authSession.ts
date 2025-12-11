"use client";

import Cookies from "js-cookie";
import { encrypt } from "@/lib/encryption";
import { AuthResponse } from "@/app/actions/auth";

export async function createSession(data: AuthResponse) {
  // Encrypt tokens
  const encryptedToken = await encrypt(data.access_token || "");
  const encryptedRefreshToken = await encrypt(data.refresh_token || "");

  // Store in cookies WITHOUT expiry for access token (session cookie)
  Cookies.set("auth_session", encryptedToken, { path: "/" });

  // You can still give refresh token a longer expiry (optional)
  Cookies.set("refresh_session", encryptedRefreshToken, { path: "/", expires: 30 });
}

export function clearSession() {
  Cookies.remove("auth_session");
  Cookies.remove("refresh_session");
}
