// services/redisClient.ts
import Redis from "ioredis";

/**
 * Singleton class that provides a shared Redis client instance
 */
export class RedisClient {
  private static instance: Redis | null = null;
  private static isConnecting: boolean = false;
  
  /**
   * Get the shared Redis client instance
   * @param redisUrl Redis connection URL (defaults to environment variable)
   * @returns A connected Redis client instance
   */
  public static getInstance(redisUrl?: string): Redis {
    if (!this.instance) {
      this.instance = new Redis(
        redisUrl || process.env.REDIS_URL || "redis://localhost:6379",
        {
          maxRetriesPerRequest: 3,
          retryStrategy: (times: number) => {
            // Exponential backoff with max 5 second delay
            return Math.min(times * 100, 5000);
          }
        }
      );
      
      this.setupEventHandlers();
      this.connect();
    }
    
    return this.instance;
  }
  
  /**
   * Set up event handlers for the Redis client
   */
  private static setupEventHandlers(): void {
    if (!this.instance) return;
    
    this.instance.on("error", (err: any) => {
      console.error("Redis client error:", err);
    });
    
    this.instance.on("connect", () => {
      console.log("Connected to Redis");
    });
    
    this.instance.on("reconnecting", () => {
      console.log("Reconnecting to Redis...");
    });
    
    this.instance.on("end", () => {
      console.log("Redis connection ended");
    });
  }
  
  /**
   * Connect to Redis if not already connected
   */
  private static connect(): void {
    if (!this.instance || this.isConnecting) return;
    
    try {
      this.isConnecting = true;
      
      if (this.instance.status !== "ready") {
        this.instance.connect().catch((err) => {
          console.error("Failed to connect to Redis:", err);
          this.isConnecting = false;
        });
      }
      
      this.isConnecting = false;
    } catch (error) {
      console.error("Error connecting to Redis:", error);
      this.isConnecting = false;
    }
  }
  
  /**
   * Closes the Redis connection
   */
  public static async close(): Promise<void> {
    if (this.instance) {
      try {
        await this.instance.quit();
        this.instance = null;
        console.log("Redis connection closed");
      } catch (error) {
        console.error("Error closing Redis connection:", error);
      }
    }
  }
}
