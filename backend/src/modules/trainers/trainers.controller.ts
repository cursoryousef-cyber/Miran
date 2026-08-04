import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';
import { IAuthenticatedUser } from '../../common/interfaces';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Trainers (المدربون)')
@Controller('trainers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class TrainersController {
  constructor(private prisma: PrismaService) {}

  @Get('me')
  async getMyProfile(@CurrentUser() user: IAuthenticatedUser) {
    const profile = await this.prisma.trainerProfile.findFirst({
      where: { person: { userAccounts: { some: { id: user.accountId } } } },
      include: { person: true, organization: true, department: true },
    });
    if (!profile) return { message: 'لا يوجد ملف مدرب لهذا الحساب' };
    return profile;
  }

  @Get()
  async findAll(@CurrentUser() user: IAuthenticatedUser) {
    const trainers = await this.prisma.trainerProfile.findMany({
      where: { organizationId: user.organizationId },
      include: { person: true, department: true },
    });
    return { data: trainers };
  }
}
