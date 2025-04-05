import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom, of } from 'rxjs';
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

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('FRED_API_KEY');
    if (!this.apiKey) {
      this.logger.warn('FRED_API_KEY is not set. FRED API calls will fail.');
      throw new Error('FRED_API_KEY is not set');
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
            this.logger.error(`Error fetching series info for ${seriesId}: ${error.response.data['error_message'] || error.message}`);
            return of(null);
          }),
        ),
      );
      return data;
    } catch (error) {
      this.logger.error(`Failed to fetch series info for ${seriesId}`);
      return null;
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
            this.logger.error(`Error fetching observations for ${seriesId}: ${error.response.data['error_message'] || error.message}`);
            return of(null);
          }),
        ),
      );
      return data;
    } catch (error) {
      this.logger.error(`Failed to fetch observations for ${seriesId}`);
      return null;
    }
  }

  /**
   * Get data for multiple series
   * @param seriesIds Array of series identifiers
   * @param limit Optional limit on number of observations per series
   * @param startDate Optional start date for observations
   * @param endDate Optional end date for observations
   * @returns Array of series data
   */
  async getMultipleSeriesData(seriesIds: string[], limit?: number, startDate?: string, endDate?: string): Promise<FredSeriesData[]> {
    const results: FredSeriesData[] = [];
    
    for (const seriesId of seriesIds) {
      const seriesData = await this.getSeriesData(seriesId, limit, startDate, endDate);
      if (seriesData) {
        results.push(seriesData);
      }
    }
    return results;
  }

  /**
   * Get data for a single series
   * @param seriesId The FRED series identifier
   * @param limit Optional limit on number of observations
   * @param startDate Optional start date for observations
   * @param endDate Optional end date for observations
   * @returns Series data object
   */
  async getSeriesData(seriesId: string, limit?: number | 100, startDate?: string, endDate?: string): Promise<FredSeriesData> {
    try {
      const seriesInfo = await this.getSeriesInfo(seriesId);
      const observationsData = await this.getSeriesObservations(seriesId, startDate, endDate, limit);
      
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
        
        return seriesData;
      }
    } catch (error) {
      this.logger.error(`Error processing series ${seriesId}: ${error.message}`);
      return null;
    }
  }
}
