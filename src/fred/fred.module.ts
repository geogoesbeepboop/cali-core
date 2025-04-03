import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { FredService } from './fred.service';
import { FredController } from './fred.controller';
import { FredMcpService } from './fred-mcp.service';
@Module({
  imports: [
    HttpModule,
    ConfigModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [FredController],
  providers: [FredService, FredMcpService],
  exports: [FredService, FredMcpService],
})
export class FredModule {}
