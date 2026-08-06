import { Module } from '@nestjs/common';
import { TraineesController } from './trainees.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [PrismaModule, NotificationsModule, OrganizationsModule],
  controllers: [TraineesController],
})
export class TraineesModule {}
