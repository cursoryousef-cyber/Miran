import { Module } from '@nestjs/common';
import { TrainingRequestsController } from './training-requests.controller';
import { TrainingRequestsService } from './training-requests.service';
import { TrainingRequestTraineesService } from './training-request-trainees.service';
import { ValidationEngineService } from './validation-engine.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [PrismaModule, NotificationsModule, OrganizationsModule],
  controllers: [TrainingRequestsController],
  providers: [TrainingRequestsService, TrainingRequestTraineesService, ValidationEngineService],
  exports: [TrainingRequestsService, TrainingRequestTraineesService, ValidationEngineService],
})
export class TrainingRequestsModule {}
