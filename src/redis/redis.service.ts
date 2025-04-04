import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private redisClient: Redis;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    try {
      // Default to localhost:6379 if not configured
      const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
      
      this.redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      this.redisClient.on('error', (err) => {
        this.logger.error(`Redis error: ${err.message}`);
      });

      this.redisClient.on('connect', () => {
        this.logger.log('Connected to Redis');
      });

      await this.redisClient.ping();
      this.logger.log('Redis connection established');
    } catch (error) {
      this.logger.error(`Failed to connect to Redis: ${error.message}`);
      // Continue without Redis if connection fails
    }
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      await this.redisClient.quit();
      this.logger.log('Redis connection closed');
    }
  }

  /**
   * Get a value from Redis
   * @param key The key to get
   * @returns The value or null if not found
   */
  async get(key: string): Promise<string | null> {
    try {
      return await this.redisClient.get(key);
    } catch (error) {
      this.logger.error(`Error getting key ${key} from Redis: ${error.message}`);
      return null;
    }
  }

  /**
   * Set a value in Redis with optional expiration
   * @param key The key to set
   * @param value The value to set
   * @param ttlSeconds Time to live in seconds (optional)
   * @returns true if successful, false otherwise
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    try {
      if (ttlSeconds) {
        await this.redisClient.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.redisClient.set(key, value);
      }
      return true;
    } catch (error) {
      this.logger.error(`Error setting key ${key} in Redis: ${error.message}`);
      return false;
    }
  }

  /**
   * Delete a key from Redis
   * @param key The key to delete
   * @returns true if successful, false otherwise
   */
  async del(key: string): Promise<boolean> {
    try {
      await this.redisClient.del(key);
      return true;
    } catch (error) {
      this.logger.error(`Error deleting key ${key} from Redis: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if a key exists in Redis
   * @param key The key to check
   * @returns true if exists, false otherwise
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redisClient.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Error checking if key ${key} exists in Redis: ${error.message}`);
      return false;
    }
  }

  /**
   * Set expiration time for a key
   * @param key The key to set expiration for
   * @param ttlSeconds Time to live in seconds
   * @returns true if successful, false otherwise
   */
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    try {
      await this.redisClient.expire(key, ttlSeconds);
      return true;
    } catch (error) {
      this.logger.error(`Error setting expiration for key ${key} in Redis: ${error.message}`);
      return false;
    }
  }
}
