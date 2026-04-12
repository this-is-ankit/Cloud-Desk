import { createClient } from "redis";
import { Emitter } from "@socket.io/redis-emitter";
import { ENV } from "./env.js";

// In-memory fallback for when Redis is unavailable
class MemoryRedis {
  constructor() {
    this.data = new Map();
  }
  async connect() { return this; }
  on() { return this; }
  async get(key) { return this.data.get(key) || null; }
  async set(key, value) { this.data.set(key, value); return "OK"; }
  async del(key) { this.data.delete(key); return 1; }
}

let redisClient;
let redisEmitter;

export const getRedisClient = async () => {
  if (!redisClient) {
    if (!ENV.REDIS_URL) {
      console.warn("REDIS_URL not set, falling back to in-memory store.");
      redisClient = new MemoryRedis();
      return redisClient;
    }

    try {
      const client = createClient({ url: ENV.REDIS_URL });
      client.on("error", (err) => console.error("Redis Client Error", err));
      await client.connect();
      redisClient = client;
    } catch (error) {
      console.error("Failed to connect to Redis, falling back to in-memory store:", error.message);
      redisClient = new MemoryRedis();
    }
  }
  return redisClient;
};

export const getRedisEmitter = async () => {
  if (!redisEmitter) {
    if (!ENV.REDIS_URL) {
      // Mock emitter if no redis
      return { to: () => ({ emit: () => {} }) };
    }
    try {
      const client = createClient({ url: ENV.REDIS_URL });
      await client.connect();
      redisEmitter = new Emitter(client);
    } catch (error) {
      return { to: () => ({ emit: () => {} }) };
    }
  }
  return redisEmitter;
};
