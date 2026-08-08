import { Module, forwardRef } from '@nestjs/common';
import { TraineesController } from './trainees.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { TrainingRequestsModule } from '../training-requests/training-requests.module';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    OrganizationsModule,
    // Reallocation delegates to TraineeAllocationService — the single sanctioned
    // way to change where a trainee is placed.
    forwardRef(() => TrainingRequestsModule),
  ],
  controllers: [TraineesController],
})
export class TraineesModule {}
