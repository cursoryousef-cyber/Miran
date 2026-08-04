import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CurrentUser, RequireRoles } from '../../common/decorators';
import { IAuthenticatedUser } from '../../common/interfaces';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Trainees (المتدربون)')
@Controller('trainees')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class TraineesController {
  constructor(private prisma: PrismaService) {}

  // ─── بيانات المتدرب الخاصة ────────────────────────────────────────────────
  @Get('me')
  @RequireRoles('trainee')
  @ApiOperation({ summary: 'بيانات المتدرب الحالي — للمتدرب فقط' })
  async getMyProfile(@CurrentUser() user: IAuthenticatedUser) {
    const profile = await this.prisma.traineeProfile.findFirst({
      where: { person: { userAccounts: { some: { id: user.accountId } } } },
      include: { person: true, organization: true },
    });
    if (!profile) return { message: 'لا يوجد ملف متدرب لهذا الحساب' };
    return profile;
  }

  // ─── قائمة المتدربين — حسب الدور ─────────────────────────────────────────
  @Get()
  @RequireRoles('org_manager', 'academic_supervisor', 'trainer')
  @ApiOperation({ summary: 'قائمة المتدربين — للمدرب والمشرف ومدير الجهة' })
  async findAll(@CurrentUser() user: IAuthenticatedUser, @Query('trainerId') trainerId?: string) {
    // المدرب يرى متدربيه فقط عبر الروتيشنات
    const isTrainerOnly = user.roles.includes('trainer') &&
      !user.roles.includes('org_manager') &&
      !user.roles.includes('academic_supervisor');

    if (isTrainerOnly) {
      // جلب المتدربين عبر الروتيشنات المرتبطة بالمدرب
      const trainerProfile = await this.prisma.trainerProfile.findFirst({
        where: { person: { userAccounts: { some: { id: user.accountId } } } },
      });
      if (!trainerProfile) return { data: [] };

      const rotations = await this.prisma.rotation.findMany({
        where: { trainerProfileId: trainerProfile.id, organizationId: user.organizationId },
        include: { traineeProfile: { include: { person: true } } },
        distinct: ['traineeProfileId'],
      });
      return { data: rotations.map((r) => r.traineeProfile) };
    }

    // المشرف الأكاديمي ومدير الجهة — يرون الكل
    const trainees = await this.prisma.traineeProfile.findMany({
      where: { organizationId: user.organizationId },
      include: { person: true, organization: true },
    });
    return { data: trainees };
  }
}
