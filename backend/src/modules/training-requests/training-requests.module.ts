import { Module } from '@nestjs/common';
import { TrainingRequestsController } from './training-requests.controller';
import { TrainingRequestsService } from './training-requests.service';
import { TrainingRequestTraineesService } from './training-request-trainees.service';
import { ValidationEngineService } from './validation-engine.service';
import { AllocationEngineService } from './allocation-engine.service';
import { ActivationService } from './activation.service';
import { GraduationService } from './graduation.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { TrainingPlansModule } from '../training-plans/training-plans.module';
import { TimelineModule } from '../timeline/timeline.module';

@Module({
  imports: [PrismaModule, NotificationsModule, OrganizationsModule, TrainingPlansModule, TimelineModule],
  controllers: [TrainingRequestsController],
  providers: [
    TrainingRequestsService,
    TrainingRequestTraineesService,
    ValidationEngineService,
    AllocationEngineService,
    ActivationService,
    GraduationService,
  ],
  exports: [
    TrainingRequestsService,
    TrainingRequestTraineesService,
    ValidationEngineService,
    AllocationEngineService,
    ActivationService,
    GraduationService,
  ],
})
export class TrainingRequestsModule {}
