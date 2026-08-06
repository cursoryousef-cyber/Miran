import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { OperationsController } from './operations.controller';

@Module({
  imports: [PrismaModule],
  controllers: [OperationsController],
})
export class OperationsModule {}
