import { Controller, Get, Post, Body, Param, Query, Logger } from '@nestjs/common';
import { FredService } from './fred.service';
import { FredMcpService } from './fred-mcp.service';

@Controller('fred')
export class FredController {
  private readonly logger = new Logger(FredController.name);

  constructor(
    private readonly fredService: FredService,
    private readonly fredMcpService: FredMcpService,
  ) {}

  @Get('series/:id')
  async getSeriesData(@Param('id') id: string, @Query('limit') limit?: number, @Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    const parsedLimit = limit ? parseInt(limit.toString(), 10) : 100;
    const data = await this.fredService.getMultipleSeriesData([id], parsedLimit, startDate, endDate);
    return data[0] || { error: 'Error fetching series: ' + id };
  }

  @Get('mcp/contexts')
  async getAllMcpContexts() {
    const contexts = await this.fredMcpService.getAllMcpContexts();
    return { contexts };
  }

  @Get('mcp/contexts/:seriesId')
  async getMcpContextForSeries(@Param('seriesId') seriesId: string) {
    const context = await this.fredMcpService.getMcpContextForSeries(seriesId);
    if (!context) {
      return { error: 'Context not found for series' };
    }
    return { context };
  }

  @Post('mcp/contexts')
  async getMcpContextsForSeries(@Body() body: { seriesIds: string[] }) {
    if (!body.seriesIds || !Array.isArray(body.seriesIds)) {
      return { error: 'Invalid request. seriesIds must be an array.' };
    }
    
    const contexts = await this.fredMcpService.getMcpContextsForSeries(body.seriesIds);
    return { contexts };
  }
}
