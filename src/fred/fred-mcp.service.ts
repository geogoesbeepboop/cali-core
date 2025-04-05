import { Injectable, Logger } from '@nestjs/common';
import { FredService, FredSeriesData } from './fred.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisService } from '../redis/redis.service';

// Define the MCP Context structure
export interface McpContext {
  contextId: string;
  type: string;
  content: any;
  metadata: {
    source: string;
    timestamp: string;
    seriesId?: string;
    title?: string;
    frequency?: string;
    units?: string;
    lastUpdated?: string;
  };
}

@Injectable()
export class FredMcpService {
  private readonly logger = new Logger(FredMcpService.name);
  private lastUpdated: Date = new Date();
  private readonly CACHE_TTL = 24 * 60 * 60; // 24 hours in seconds
  private readonly SERIES_PREFIX = 'fred:series:';
  private readonly METADATA_PREFIX = 'fred:metadata:';

  constructor(
    private readonly fredService: FredService,
    private readonly redisService: RedisService,
  ) {
    // Initialize cache on service start
    this.initializeCache();
  }

  /**
   * Initialize cache on service start
   */
  private async initializeCache(): Promise<void> {
    try {
      this.logger.log('Initializing FRED data cache');
      // We could pre-populate cache with commonly used series here if needed
    } catch (error) {
      this.logger.error(`Error initializing cache: ${error.message}`);
    }
  }

  /**
   * Get MCP context for a specific series
   * @param seriesId The FRED series identifier
   * @returns MCP context object
   */
  async getMcpContextForSeries(seriesId: string): Promise<McpContext | null> {
    try {
      // Check cache first
      const cachedData = await this.getSeriesFromCache(seriesId);
      
      if (cachedData) {
        this.logger.log(`Retrieved series ${seriesId} from cache`);
        return this.createMcpContext(cachedData);
      }
      
      // Fetch from API if not in cache
      let seriesData = (await this.fredService.getMultipleSeriesData([seriesId]))[0];
      
      if (!seriesData) {
        this.logger.warn(`Series ${seriesId} not found in FRED`);
        return null;
      }
      
      // Cache the data
      await this.cacheSeriesData(seriesId, seriesData);
      
      // Create MCP context from series data
      return this.createMcpContext(seriesData);
    } catch (error) {
      this.logger.error(`Error getting MCP context for series ${seriesId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get MCP contexts for all available series
   * @returns Array of MCP context objects
   */
  async getAllMcpContexts(): Promise<McpContext[]> {
    try {      
      const contexts: McpContext[] = [];
      const cachedSeriesData = await this.redisService.getAllCachedFredObjects();
      for (const seriesData of cachedSeriesData) {
        contexts.push(this.createMcpContext(JSON.parse(seriesData) as FredSeriesData));
      }
      return contexts;
    } catch (error) {
      this.logger.error(`Error getting all MCP contexts: ${error.message}`);
      return [];
    }
  }

  /**
   * Get MCP contexts for specific series IDs
   * @param seriesIds Array of FRED series identifiers
   * @returns Array of MCP context objects
   */
  async getMcpContextsForSeries(seriesIds: string[], limit?: number, startDate?: string, endDate?: string): Promise<McpContext[]> {
    try {
      const contexts: McpContext[] = [];
      
      // Check which series we need to fetch
      const seriesIdsToFetch: string[] = [];
      const cachedSeriesData: Map<string, FredSeriesData> = new Map();
      
      // Try to get data from cache first
      for (const seriesId of seriesIds) {
        const cachedData = await this.getSeriesFromCache(seriesId);
        
        if (cachedData) {
          this.logger.log(`Retrieved series ${seriesId} from cache`);
          cachedSeriesData.set(seriesId, cachedData);
        } else {
          seriesIdsToFetch.push(seriesId);
        }
      }
      
      // Fetch fresh data for series not in cache
      let freshData: FredSeriesData[] = [];
      if (seriesIdsToFetch.length > 0) {
        freshData = await this.fredService.getMultipleSeriesData(seriesIdsToFetch, limit, startDate, endDate);
        
        // Cache the fresh data
        for (const data of freshData) {
          await this.cacheSeriesData(data.id, data);
        }
      }
      
      // Create MCP contexts from cached data
      for (const [_, data] of cachedSeriesData.entries()) {
        contexts.push(this.createMcpContext(data));
      }
      
      // Create MCP contexts from fresh data
      for (const data of freshData) {
        contexts.push(this.createMcpContext(data));
      }
      
      return contexts;
    } catch (error) {
      this.logger.error(`Error getting MCP contexts for series ${seriesIds.join(', ')}: ${error.message}`);
      return [];
    }
  }

  /**
   * Cache series data in Redis
   * @param seriesId The series ID
   * @param data The series data to cache
   */
  private async cacheSeriesData(seriesId: string, data: FredSeriesData): Promise<void> {
    try {
      const key = this.SERIES_PREFIX + seriesId;
      await this.redisService.set(key, JSON.stringify(data), this.CACHE_TTL);
      this.logger.log(`Cached series ${seriesId} data`);
    } catch (error) {
      this.logger.error(`Error caching series ${seriesId} data: ${error.message}`);
    }
  }

  /**
   * Get series data from Redis cache
   * @param seriesId The series ID
   * @returns The series data or null if not in cache
   */
  private async getSeriesFromCache(seriesId: string): Promise<FredSeriesData | null> {
    try {
      const key = this.SERIES_PREFIX + seriesId;
      const cachedData = await this.redisService.get(key);
      
      if (!cachedData) {
        return null;
      }
      
      return JSON.parse(cachedData) as FredSeriesData;
    } catch (error) {
      this.logger.error(`Error getting series ${seriesId} from cache: ${error.message}`);
      return null;
    }
  }

  /**
   * Check if the cache is stale (older than 24 hours)
   * @returns true if cache is stale, false otherwise
   */
  private isCacheStale(): boolean {
    const now = new Date();
    const diffHours = (now.getTime() - this.lastUpdated.getTime()) / (1000 * 60 * 60);
    return diffHours > 24;
  }

  /**
   * Create an MCP context object from series data
   * @param seriesData The FRED series data
   * @returns MCP context object
   */
  private createMcpContext(seriesData: FredSeriesData): McpContext {
    return {
      contextId: `fred-${seriesData.id}-${Date.now()}`,
      type: 'economic_data',
      content: {
        seriesId: seriesData.id,
        title: seriesData.title,
        observations: seriesData.observations,
      },
      metadata: {
        source: 'FRED',
        timestamp: new Date().toISOString(),
        seriesId: seriesData.id,
        title: seriesData.title,
        frequency: seriesData.frequency,
        units: seriesData.units,
        lastUpdated: seriesData.lastUpdated,
      },
    };
  }

  /**
   * Update cache daily at midnight
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async updateCache() {
    this.logger.log('Running scheduled Fred cache update');
    const cachedFredKeys = await this.redisService.getAllCachedFredKeys();
    const seriesIds = cachedFredKeys.map(key => key.split(':')[2]);
    const freshData = await this.fredService.getMultipleSeriesData(seriesIds);
    for (const seriesData of freshData) {
      this.cacheSeriesData(seriesData.id, seriesData);
    }
    this.lastUpdated = new Date();
  }
}
