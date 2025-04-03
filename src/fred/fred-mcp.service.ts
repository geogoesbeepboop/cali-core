import { Injectable, Logger } from '@nestjs/common';
import { FredService, FredSeriesData } from './fred.service';
import { Cron, CronExpression } from '@nestjs/schedule';

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
  private cachedData: Map<string, FredSeriesData> = new Map();
  private lastUpdated: Date = new Date();

  constructor(private readonly fredService: FredService) {
    // Initialize cache on service start
    this.updateCache();
  }

  /**
   * Update the cache with fresh data from FRED API
   * Runs automatically every day at midnight
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async updateCache(): Promise<void> {
    try {
      this.logger.log('Updating FRED data cache...');
      const seriesData = await this.fredService.getAllDefaultSeriesData();
      
      // Update the cache with new data
      seriesData.forEach(series => {
        this.cachedData.set(series.id, series);
      });
      
      this.lastUpdated = new Date();
      this.logger.log(`FRED data cache updated successfully. ${this.cachedData.size} series cached.`);
    } catch (error) {
      this.logger.error(`Failed to update FRED data cache: ${error.message}`);
    }
  }

  /**
   * Force update the cache immediately
   */
  async forceUpdateCache(): Promise<void> {
    await this.updateCache();
  }

  /**
   * Get MCP context for a specific series
   * @param seriesId The FRED series identifier
   * @returns MCP context object
   */
  async getMcpContextForSeries(seriesId: string): Promise<McpContext | null> {
    try {
      // Check if we have cached data
      let seriesData = this.cachedData.get(seriesId);
      
      // If not in cache or cache is stale (older than 24 hours), fetch fresh data
      if (!seriesData || this.isCacheStale()) {
        seriesData = (await this.fredService.getMultipleSeriesData([seriesId]))[0];
        if (seriesData) {
          this.cachedData.set(seriesId, seriesData);
        }
      }
      
      if (!seriesData) {
        return null;
      }
      
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
      // If cache is stale, update it
      if (this.isCacheStale()) {
        await this.updateCache();
      }
      
      // Convert all cached data to MCP contexts
      const contexts: McpContext[] = [];
      for (const seriesData of this.cachedData.values()) {
        contexts.push(this.createMcpContext(seriesData));
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
  async getMcpContextsForSeries(seriesIds: string[]): Promise<McpContext[]> {
    try {
      const contexts: McpContext[] = [];
      
      // Check which series we need to fetch
      const seriesIdsToFetch: string[] = [];
      for (const seriesId of seriesIds) {
        if (!this.cachedData.has(seriesId) || this.isCacheStale()) {
          seriesIdsToFetch.push(seriesId);
        }
      }
      
      // Fetch any missing or stale data
      if (seriesIdsToFetch.length > 0) {
        const freshData = await this.fredService.getMultipleSeriesData(seriesIdsToFetch);
        for (const seriesData of freshData) {
          this.cachedData.set(seriesData.id, seriesData);
        }
      }
      
      // Create MCP contexts for requested series
      for (const seriesId of seriesIds) {
        const seriesData = this.cachedData.get(seriesId);
        if (seriesData) {
          contexts.push(this.createMcpContext(seriesData));
        }
      }
      
      return contexts;
    } catch (error) {
      this.logger.error(`Error getting MCP contexts for series ${seriesIds.join(', ')}: ${error.message}`);
      return [];
    }
  }

  /**
   * Add a new series to track
   * @param seriesId The FRED series identifier to add
   * @returns true if added successfully, false otherwise
   */
  async addSeries(seriesId: string): Promise<boolean> {
    try {
      // First check if the series exists in FRED by trying to fetch it
      const seriesData = await this.fredService.getMultipleSeriesData([seriesId]);
      
      if (seriesData.length > 0) {
        // Add to the default list in FredService
        this.fredService.addSeriesId(seriesId);
        
        // Add to our cache
        this.cachedData.set(seriesId, seriesData[0]);
        
        this.logger.log(`Added new series ${seriesId} to tracking`);
        return true;
      }
      
      return false;
    } catch (error) {
      this.logger.error(`Error adding series ${seriesId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Get the list of available series IDs
   * @returns Array of series IDs
   */
  getAvailableSeriesIds(): string[] {
    return this.fredService.getAvailableSeriesIds();
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
}
