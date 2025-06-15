// src/fred/rdsdatabase/economicdatatask.task.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { RdsDatabaseService } from './rdsdatabase.service';
import { FredService } from '../fred.service';
import { TOP_SERIES_IDS } from '../constants';

@Injectable()
export class EconomicDataTask implements OnModuleInit {
  private readonly logger = new Logger(EconomicDataTask.name);
  private readonly TOP_SERIES_IDS = TOP_SERIES_IDS;

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly rdsDatabaseService: RdsDatabaseService,
    private readonly fredService: FredService,
  ) {}

  async onModuleInit() {
    // Only schedule the job if we have series IDs to fetch
    if (this.TOP_SERIES_IDS.length > 0) {
      // Run every 12 hours
      const job = new CronJob('0 */12 * * *', () => this.refreshEconomicData());
      this.schedulerRegistry.addCronJob('economicDataRefresh', job);
      job.start();

      // Initial data load
      await this.refreshEconomicData().catch(error => {
        this.logger.error('Initial economic data refresh failed', error);
      });
    } else {
      this.logger.warn('No series IDs configured for economic data refresh');
    }
  }

  async refreshEconomicData(): Promise<void> {
    this.logger.log('Starting economic data refresh...');
    const refreshStartTime = Date.now();
    let successCount = 0;
    let errorCount = 0;

    try {
      // Process each series ID in sequence to avoid rate limiting
      for (const seriesId of this.TOP_SERIES_IDS) {
        try {
          this.logger.debug(`Fetching data for series: ${seriesId}`);
          const seriesData = await this.fredService.getSeriesData(seriesId);
          
          if (seriesData?.observations?.length > 0) {
            await this.rdsDatabaseService.saveSeriesData(seriesData);
            successCount++;
            this.logger.debug(`Successfully saved ${seriesData.observations.length} observations for ${seriesId}`);
          } else {
            this.logger.warn(`No observations found for series: ${seriesId}`);
          }
        } catch (error) {
          errorCount++;
          this.logger.error(`Error processing series ${seriesId}:`, error);
          // Continue with next series even if one fails
          continue;
        }
      }

      const duration = Date.now() - refreshStartTime;
      this.logger.log(
        `Economic data refresh completed in ${duration}ms. ` +
        `Success: ${successCount}, Failed: ${errorCount}`
      );
    } catch (error) {
      this.logger.error('Unexpected error during economic data refresh:', error);
      throw error;
    }
  }
}