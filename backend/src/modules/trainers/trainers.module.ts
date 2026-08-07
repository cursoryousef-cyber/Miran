import { Module } from '@nestjs/common';
import { TrainersController } from './trainers.controller';
import { TrainerReassignmentService } from './trainer-reassignment.service';
import { TrainerLeaveService } from './trainer-leave.service';
import { TrainerQualificationService } from './trainer-qualification.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [PrismaModule, NotificationsModule, OrganizationsModule],
  controllers: [TrainersController],
  providers: [TrainerReassignmentService, TrainerLeaveService, TrainerQualificationService],
  exports: [TrainerReassignmentService, TrainerLeaveService, TrainerQualificationService],
})
export class TrainersModule {}
