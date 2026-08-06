import { Module } from '@nestjs/common';
import { IncidentsController } from './incidents.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [IncidentsController],
})
export class IncidentsModule {}
