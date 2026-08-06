import { Module } from '@nestjs/common';
import { TraineesController } from './trainees.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [TraineesController],
})
export class TraineesModule {}
