import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

export interface FredSeriesData {
  id: string;
  title: string;
  observations: {
    date: string;
    value: string | number;
  }[];
  frequency: string;
  units: string;
  lastUpdated: string;
}

@Injectable()
export class FredService {
  private readonly logger = new Logger(FredService.name);
  private readonly baseUrl = 'https://api.stlouisfed.org/fred';
  private readonly apiKey: string;
  private readonly defaultSeriesIds = [
    'CPIAUCSL',  // Consumer Price Index
    'UNRATE',    // Unemployment Rate
    'GDP',       // Gross Domestic Product
    'DGS10',     // 10-Year Treasury Constant Maturity Rate
    'DGS2',      // 2-Year Treasury Constant Maturity Rate
    'FEDFUNDS',  // Federal Funds Effective Rate
    'UMCSENT',   // University of Michigan: Consumer Sentiment
    'HOUST',     // Housing Starts
    'RSAFS',     // Retail Sales
    'CP',        // Corporate Profits
    'M2SL',      // M2 Money Stock
  ];

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('FRED_API_KEY');
    if (!this.apiKey) {
      this.logger.warn('FRED_API_KEY is not set. FRED API calls will fail.');
    }
  }

  /**
   * Fetch series information from FRED API
   * @param seriesId The FRED series identifier
   * @returns Series information
   */
  async getSeriesInfo(seriesId: string): Promise<any> {
    const url = `${this.baseUrl}/series?series_id=${seriesId}&api_key=${this.apiKey}&file_type=json`;
    
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(url).pipe(
          catchError((error: AxiosError) => {
            this.logger.error(`Error fetching series info for ${seriesId}: ${error.message}`);
            throw error;
          }),
        ),
      );
      return data;
    } catch (error) {
      this.logger.error(`Failed to fetch series info for ${seriesId}`);
      throw error;
    }
  }

  /**
   * Fetch observations for a specific series
   * @param seriesId The FRED series identifier
   * @param startDate Optional start date in YYYY-MM-DD format
   * @param endDate Optional end date in YYYY-MM-DD format
   * @param limit Optional limit on number of observations
   * @returns Series observations
   */
  async getSeriesObservations(
    seriesId: string, 
    startDate?: string, 
    endDate?: string,
    limit?: number
  ): Promise<any> {
    let url = `${this.baseUrl}/series/observations?series_id=${seriesId}&api_key=${this.apiKey}&file_type=json`;
    
    if (startDate) {
      url += `&observation_start=${startDate}`;
    }
    
    if (endDate) {
      url += `&observation_end=${endDate}`;
    }
    
    if (limit) {
      url += `&limit=${limit}&sort_order=desc`;
    }
    
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(url).pipe(
          catchError((error: AxiosError) => {
            this.logger.error(`Error fetching observations for ${seriesId}: ${error.message}`);
            throw error;
          }),
        ),
      );
      return data;
    } catch (error) {
      this.logger.error(`Failed to fetch observations for ${seriesId}`);
      throw error;
    }
  }

  /**
   * Get all default series data
   * @param limit Optional limit on number of observations per series
   * @returns Array of series data
   */
  async getAllDefaultSeriesData(limit?: number): Promise<FredSeriesData[]> {
    return this.getMultipleSeriesData(this.defaultSeriesIds, limit);
  }

  /**
   * Get data for multiple series
   * @param seriesIds Array of series identifiers
   * @param limit Optional limit on number of observations per series
   * @returns Array of series data
   */
  async getMultipleSeriesData(seriesIds: string[], limit = 100): Promise<FredSeriesData[]> {
    const results: FredSeriesData[] = [];
    
    for (const seriesId of seriesIds) {
      try {
        const seriesInfo = await this.getSeriesInfo(seriesId);
        const observationsData = await this.getSeriesObservations(seriesId, undefined, undefined, limit);
        
        if (seriesInfo && observationsData && observationsData.observations) {
          const seriesData: FredSeriesData = {
            id: seriesId,
            title: seriesInfo.seriess[0]?.title || 'Unknown',
            frequency: seriesInfo.seriess[0]?.frequency_short || 'Unknown',
            units: seriesInfo.seriess[0]?.units_short || 'Unknown',
            lastUpdated: seriesInfo.seriess[0]?.last_updated || new Date().toISOString(),
            observations: observationsData.observations.map(obs => ({
              date: obs.date,
              value: isNaN(parseFloat(obs.value)) ? obs.value : parseFloat(obs.value)
            }))
          };
          
          results.push(seriesData);
        }
      } catch (error) {
        this.logger.error(`Error processing series ${seriesId}: ${error.message}`);
        // Continue with other series even if one fails
      }
    }
    
    return results;
  }

  /**
   * Get a list of all available series IDs
   * @returns The list of default series IDs
   */
  getAvailableSeriesIds(): string[] {
    return [...this.defaultSeriesIds];
  }

  /**
   * Add a new series ID to the list of default series
   * @param seriesId The FRED series identifier to add
   * @returns true if added, false if already exists
   */
  addSeriesId(seriesId: string): boolean {
    if (!this.defaultSeriesIds.includes(seriesId)) {
      this.defaultSeriesIds.push(seriesId);
      return true;
    }
    return false;
  }
}
