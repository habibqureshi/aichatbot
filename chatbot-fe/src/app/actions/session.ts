"use server";

import { cookies } from "next/headers";
import { AuthResponse } from "./auth";
import { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";
import { decrypt, encrypt } from "@/lib/encryption";
const SESSION_COOKIE = "auth_session";

export async function getSession() {
  const cookiesList = await cookies();
  const sessionId = cookiesList.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;
  const decryptedSessionId = await decrypt(sessionId);
  if (!decryptedSessionId) return null;

  // Decode JWT token parts
  const decodedPayload = decodePayload(decryptedSessionId);

  const authResponse: AuthResponse = {
    token: decryptedSessionId || "",
    user: getCurrentUserInfoFromJwtPayload(decodedPayload),
  };
  return authResponse;
}

type userJwtPayload = {
  userId: number;
  sub: string;
  username: string;
  permissions: string[];
};

const getCurrentUserInfoFromJwtPayload = (payload: userJwtPayload) => {
  return {
    id: payload.userId,
    email: payload.sub,
    username: payload.username,
    permissions: payload.permissions,
  };
};

const decodePayload = (token: string) => {
  const [payload] = token.split(".");
  return JSON.parse(
    Buffer.from(payload, "base64url").toString()
  ) as userJwtPayload;
};

export async function createSession(
  authData: AuthResponse,
  cookieMaxAge: number = 3600
) {
  const sessionId = authData.token || "";
  const encryptedSessionId = await encrypt(sessionId);
  const cookie: ResponseCookie = {
    name: SESSION_COOKIE,
    value: encryptedSessionId,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: cookieMaxAge,
  };

  const cookieStore = await cookies();
  cookieStore.set(cookie);
  return sessionId;
}

export async function clearSession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    cookieStore.delete(SESSION_COOKIE);
  }
}
