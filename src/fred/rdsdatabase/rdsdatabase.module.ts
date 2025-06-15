// src/database/database.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EconomicData } from './EconomicData.entity';
import { FredModule } from '../fred.module';
import { RdsDatabaseService } from './rdsdatabase.service';
import { EconomicDataTask } from './economicdatatask.task';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule, FredModule],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT') || 5432,
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        entities: [EconomicData],
        synchronize: configService.get('NODE_ENV') !== 'production',
        logging: process.env.NODE_ENV === 'development', // Enable query logging in development
        ssl: process.env.NODE_ENV === 'production' ? {
          rejectUnauthorized: false,
          ca: configService.get('DB_SSL_CA'),
        } : false,  
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([EconomicData]),
  ],
  providers: [
    RdsDatabaseService,
    EconomicDataTask,
  ],
  exports: [TypeOrmModule, RdsDatabaseService],
})
export class DatabaseModule {}