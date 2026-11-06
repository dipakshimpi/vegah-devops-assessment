import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import type { Response } from 'express';

@Controller('health')
export class HealthController {
  private redisClient: Redis | null = null;

  constructor(private readonly dataSource: DataSource) {}

  private getRedisClient(): Redis {
    if (!this.redisClient) {
      const host = process.env.REDIS_HOST || 'localhost';
      const port = parseInt(process.env.REDIS_PORT || '6379', 10);
      this.redisClient = new Redis({
        host,
        port,
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        lazyConnect: false,
      });
    }
    return this.redisClient;
  }

  @Get()
  async check(@Res() res: Response) {
    let postgresStatus = 'down';
    let redisStatus = 'down';

    // 1. Check PostgreSQL
    try {
      if (this.dataSource.isInitialized) {
        await this.dataSource.query('SELECT 1');
        postgresStatus = 'up';
      }
    } catch {
      postgresStatus = 'down';
    }

    // 2. Check Redis
    try {
      const redis = this.getRedisClient();
      const pingRes = await redis.ping();
      if (pingRes === 'PONG') {
        redisStatus = 'up';
      }
    } catch {
      redisStatus = 'down';
    }

    const isHealthy = postgresStatus === 'up' && redisStatus === 'up';
    const status = isHealthy ? 'ok' : 'degraded';
    const statusCode = isHealthy
      ? HttpStatus.OK
      : HttpStatus.SERVICE_UNAVAILABLE;

    return res.status(statusCode).json({
      status,
      timestamp: new Date().toISOString(),
      services: {
        postgres: postgresStatus,
        redis: redisStatus,
      },
    });
  }
}

