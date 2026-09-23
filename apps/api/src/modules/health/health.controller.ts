import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../core/database/prisma.service';
import { RedisService } from '../../core/redis/redis.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'System and dependencies health check' })
  async checkHealth() {
    let dbStatus = 'healthy';
    let redisStatus = 'healthy';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (e: any) {
      dbStatus = `unhealthy: ${e.message}`;
    }

    try {
      const client = this.redis.getClient();
      if (client && client.status === 'ready') {
        redisStatus = 'healthy';
      } else {
        redisStatus = 'standby';
      }
    } catch (e: any) {
      redisStatus = `unhealthy: ${e.message}`;
    }

    return {
      status: 'operational',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      checks: {
        database: dbStatus,
        redis: redisStatus,
      },
    };
  }

  @Public()
  @Get('live')
  @ApiOperation({ summary: 'Liveness probe (process is running)' })
  checkLive() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe (dependencies available)' })
  async checkReady() {
    let dbReady = false;
    let redisReady = false;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbReady = true;
    } catch (e: any) {
      dbReady = false;
    }

    try {
      const client = this.redis.getClient();
      redisReady = !client || client.status === 'ready' || client.status === 'connect';
    } catch (e: any) {
      redisReady = false;
    }

    if (!dbReady) {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        checks: { database: 'unhealthy', redis: redisReady ? 'healthy' : 'unhealthy' },
      });
    }

    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'healthy',
        redis: redisReady ? 'healthy' : 'standby',
      },
    };
  }
}
