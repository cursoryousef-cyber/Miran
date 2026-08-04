import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';
import { IAuthenticatedUser } from '../../common/interfaces';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Rotations (الروتيشنات)')
@Controller('rotations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class RotationsController {
  constructor(private prisma: PrismaService) {}

  @Get('my')
  async getMyRotations(@CurrentUser() user: IAuthenticatedUser) {
    const traineeProfile = await this.prisma.traineeProfile.findFirst({
      where: { person: { userAccounts: { some: { id: user.accountId } } } },
    });
    if (!traineeProfile) return { data: [] };
    const rotations = await this.prisma.rotation.findMany({
      where: { traineeProfileId: traineeProfile.id },
      include: { department: true, trainerProfile: { include: { person: true } } },
      orderBy: { startDate: 'asc' },
    });
    return { data: rotations };
  }

  @Get()
  async findAll(@CurrentUser() user: IAuthenticatedUser) {
    const rotations = await this.prisma.rotation.findMany({
      where: { organizationId: user.organizationId },
      include: {
        department: true,
        traineeProfile: { include: { person: true } },
        trainerProfile: { include: { person: true } },
      },
      orderBy: { startDate: 'asc' },
    });
    return { data: rotations };
  }
}
