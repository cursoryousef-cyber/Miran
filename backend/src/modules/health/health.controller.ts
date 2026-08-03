import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  HealthCheckService,
  HealthCheck,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { Public } from '../../common/decorators';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Observability & Health Checks (مراقبة السلامة والجاهزية)')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private prisma: PrismaService,
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'فحص جاهزية وسلامة الخدمات والنظام (Liveness & Readiness Probe)' })
  check() {
    return this.health.check([
      // Database check
      async () => {
        try {
          await this.prisma.$queryRaw`SELECT 1`;
          return { database: { status: 'up' } };
        } catch {
          return { database: { status: 'down' } };
        }
      },

      // Heap Memory check (max 500MB)
      () => this.memory.checkHeap('memory_heap', 500 * 1024 * 1024),

      // Storage Disk check
      () => this.disk.checkStorage('storage_disk', { path: '/', thresholdPercent: 0.9 }),
    ]);
  }
}
