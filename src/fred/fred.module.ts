import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { FredService } from './fred.service';
import { FredController } from './fred.controller';
import { FredMcpService } from './fred-mcp.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    HttpModule,
    ScheduleModule.forRoot(),
    RedisModule,
  ],
  controllers: [FredController],
  providers: [FredService, FredMcpService],
  exports: [FredService, FredMcpService],
})
export class FredModule {}
