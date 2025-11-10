// env.ts
export const ENV = {
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://192.168.1.16:8001",
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || "My Next.js App",
  REDIS_URL: process.env.NEXT_PUBLIC_REDIS_URL || "redis://localhost:6379",
  COOKIE_ENCRYPTION_KEY: process.env.COOKIE_ENCRYPTION_KEY || "your-secret-key-here",
};
