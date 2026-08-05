import { Module } from '@nestjs/common';
import { TrainingRequestsController } from './training-requests.controller';
import { TrainingRequestsService } from './training-requests.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TrainingRequestsController],
  providers: [TrainingRequestsService],
  exports: [TrainingRequestsService],
})
export class TrainingRequestsModule {}
