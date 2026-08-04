import { Module } from '@nestjs/common';
import { TrainersController } from './trainers.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TrainersController],
})
export class TrainersModule {}
