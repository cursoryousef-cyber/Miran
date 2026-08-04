import { Module } from '@nestjs/common';
import { TraineesController } from './trainees.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TraineesController],
})
export class TraineesModule {}
