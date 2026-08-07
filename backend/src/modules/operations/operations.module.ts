import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { OperationsController } from './operations.controller';
import { TimelineModule } from '../timeline/timeline.module';

@Module({
  imports: [PrismaModule, TimelineModule],
  controllers: [OperationsController],
})
export class OperationsModule {}
