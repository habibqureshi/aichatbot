

// import Redis from "ioredis";
// import { ENV } from "@/app/utils/env";
// // console.log('redis service')
// // // Create a Redis instance
// let redis: Redis | null;

// const redisOptions = {
//     retryStrategy: (times: number) => {
//         return Math.min(times * 50, 2000);
//     },
//     maxRetriesPerRequest: 3
// };

// try {
//     // console.log('ENV.REDIS_URL', ENV.REDIS_URL)
//     if (!ENV.REDIS_URL) {
//         throw new Error('REDIS_URL is not defined');
//     }
//     redis = new Redis("redis://localhost:6379", redisOptions);

//     redis.on('error', (error) => {
//         console.error('Redis connection error:', error);
//     });

//     redis.on('connect', () => {
//         console.log('Successfully connected to Redis');
//     });
// } catch (error) {
//     console.error('Failed to initialize Redis:', error);
//     redis = null;
// }

// // // Set session with an expiration time (e.g., 1 hour)
// export async function setKey(key: string, data: object, ttlSeconds = 3600) {

//     redis && await redis.set(key, JSON.stringify(data), "EX", ttlSeconds);
// }

// // Get session data
// export async function getKey(key: string) {

//     const session = redis && await redis.get(key) || null;
//     return session ? JSON.parse(session) : null;
// }

// // Delete session
// export async function deleteKey(key: string) {

//     redis && await redis.del(key);
// }
// export default redis;

