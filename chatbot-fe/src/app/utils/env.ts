// env.ts
export const ENV = {
  NEXT_PUBLIC_API_URL:
    process.env.NEXT_PUBLIC_API_URL ||
    "https://chatbot-test-652968847102.europe-west1.run.app",
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || "My Next.js App",
  REDIS_URL: process.env.NEXT_PUBLIC_REDIS_URL || "redis://localhost:6379",
  COOKIE_ENCRYPTION_KEY:
    process.env.COOKIE_ENCRYPTION_KEY || "your-secret-key-here",
};
