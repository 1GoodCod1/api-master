import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { AppService } from './app.service';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Get application status' })
  @ApiResponse({ status: 200, description: 'All systems operational' })
  @ApiResponse({ status: 206, description: 'Systems partially operational' })
  @ApiResponse({ status: 503, description: 'Service unavailable' })
  async getStatus(@Res() res: Response) {
    const status = await this.appService.getStatus();
    return res.status(status.code).json(status);
  }

  @Get('favicon.ico')
  @ApiOperation({ summary: 'Favicon endpoint' })
  getFavicon(@Res() res: Response) {
    return res.status(HttpStatus.NO_CONTENT).send();
  }

  @Get('ping')
  @ApiOperation({ summary: 'Simple ping endpoint' })
  async ping() {
    const health = await this.appService.getHealth();
    return {
      success: health.status === 'healthy',
      code: health.status === 'healthy' ? 200 : 503,
      message: health.status === 'healthy' ? 'Pong!' : 'Service unavailable',
      timestamp: health.timestamp,
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  async health() {
    return this.appService.getHealth();
  }

  @Get('version')
  @ApiOperation({ summary: 'Get application version' })
  version() {
    return this.appService.getVersion();
  }

  @Get('readiness')
  @ApiOperation({ summary: 'Readiness probe for Kubernetes' })
  async readiness(@Res() res: Response) {
    const status = await this.appService.getStatus();

    if (status.success) {
      return res.status(200).json({
        status: 'ready',
        timestamp: status.timestamp,
      });
    } else {
      return res.status(503).json({
        status: 'not ready',
        timestamp: status.timestamp,
        errors: status.services
          .filter((s) => s.status !== 'up')
          .map((s) => `${s.name}: ${s.message}`),
      });
    }
  }

  @Get('liveness')
  @ApiOperation({ summary: 'Liveness probe for Kubernetes' })
  async liveness() {
    return Promise.resolve({
      status: 'alive',
      timestamp: new Date().toISOString(),
    });
  }
}
