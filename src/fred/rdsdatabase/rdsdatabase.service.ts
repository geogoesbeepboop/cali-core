// src/fred/rdsdatabase/rdsdatabase.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EconomicData } from './EconomicData.entity';
import { FredSeriesData } from '../../fred/fred.service';

@Injectable()
export class RdsDatabaseService {
  constructor(
    @InjectRepository(EconomicData)
    private readonly economicDataRepository: Repository<EconomicData>,
  ) {}

  async saveSeriesData(seriesData: FredSeriesData): Promise<void> {
    const { id: seriesId, title, observations, frequency, units, lastUpdated } = seriesData;
    
    const entities = observations
      .filter(obs => obs.value !== '.') // Filter out missing values
      .map(obs => {
        const entity = new EconomicData();
        entity.seriesId = seriesId;
        entity.title = title;
        entity.date = new Date(obs.date);
        entity.value = typeof obs.value === 'string' ? parseFloat(obs.value) : obs.value;
        entity.frequency = frequency;
        entity.units = units;
        entity.lastUpdated = new Date(lastUpdated);
        return entity;
      });

    if (entities.length > 0) {
      await this.economicDataRepository.upsert(entities, {
        conflictPaths: ['seriesId', 'date'],
        skipUpdateIfNoValuesChanged: true,
      });
    }
  }

  async getSeriesData(seriesId: string, startDate?: Date, endDate?: Date): Promise<EconomicData[]> {
    const query = this.economicDataRepository
      .createQueryBuilder('data')
      .where('data.seriesId = :seriesId', { seriesId })
      .orderBy('data.date', 'ASC');

    if (startDate) {
      query.andWhere('data.date >= :startDate', { startDate });
    }
    if (endDate) {
      query.andWhere('data.date <= :endDate', { endDate });
    }

    return query.getMany();
  }
}