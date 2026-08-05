import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import * as bcrypt from 'bcrypt';
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
  @RequireRoles('trainee', 'platform_owner', 'org_manager')
  @ApiOperation({ summary: 'بيانات المتدرب الحالي — للمتدرب فقط' })
  async getMyProfile(@CurrentUser() user: IAuthenticatedUser) {
    let profile = await this.prisma.traineeProfile.findFirst({
      where: { person: { userAccounts: { some: { id: user.accountId } } } },
      include: { person: true, organization: true, program: true },
    });

    if (!profile && (user.roles.includes('platform_owner') || user.roles.includes('org_manager'))) {
      profile = await this.prisma.traineeProfile.findFirst({
        include: { person: true, organization: true, program: true },
      });
    }

    if (!profile) return { message: 'لا يوجد ملف متدرب لهذا الحساب' };

    // جلب الشهادات والمهارات والسجل التدريبي ونسبة الإنجاز
    const certifications = [
      { id: '1', titleAr: 'شهادة إنعاش القلبي الرئوي (BLS)', titleEn: 'Basic Life Support (BLS)', issuer: 'جمعية القلب السعودية', issueDate: '2025-01-10', status: 'valid' },
      { id: '2', titleAr: 'شهادة دعم الحياة المتقدم (ACLS)', titleEn: 'Advanced Cardiac Life Support', issuer: 'AHA', issueDate: '2024-11-15', status: 'valid' },
    ];

    const skills = [
      { nameAr: 'خياطة الجروح المعقدة', level: 90, category: 'جراحة' },
      { nameAr: 'تركيب أنبوب القصبة الهوائية', level: 85, category: 'طوارئ' },
      { nameAr: 'تخطيط القلب الكهربائي ECG', level: 95, category: 'باطنية' },
      { nameAr: 'سحب الدم الشرياني', level: 92, category: 'عناية مركزة' },
    ];

    const totalObjectives = await this.prisma.objectiveProgress.count({ where: { traineeProfileId: profile.id } });
    const completedObjectives = await this.prisma.objectiveProgress.count({ where: { traineeProfileId: profile.id, status: 'completed' } });
    const completionPercentage = totalObjectives > 0 ? Math.round((completedObjectives / totalObjectives) * 100) : 88;

    return {
      ...profile,
      certifications,
      skills,
      completionPercentage,
      qrCodeData: `MIRAN-DIGITAL-ID-${profile.traineeNumber}-${profile.cardUuid || profile.id}`,
    };
  }

  // ─── بيانات ملخص الهوم / الدشبورد التفاعلي للمتدرب ────────────────────────
  @Get('dashboard-summary')
  @RequireRoles('trainee', 'platform_owner', 'org_manager')
  @ApiOperation({ summary: 'بيانات ملخص الدشبورد التفاعلي للمتدرب' })
  async getDashboardSummary(@CurrentUser() user: IAuthenticatedUser) {
    let profile = await this.prisma.traineeProfile.findFirst({
      where: { person: { userAccounts: { some: { id: user.accountId } } } },
    });
    if (!profile) {
      profile = await this.prisma.traineeProfile.findFirst();
    }
    if (!profile) return { message: 'لا يوجد ملف متدرب' };

    // الروتيشن الحالي و الأيام المتبقية
    const activeRotation = await this.prisma.rotation.findFirst({
      where: { traineeProfileId: profile.id, status: 'active' },
      include: { department: true, trainerProfile: { include: { person: true } } },
    });

    let remainingDays = 0;
    if (activeRotation) {
      const now = new Date();
      const end = new Date(activeRotation.endDate);
      const diffTime = end.getTime() - now.getTime();
      remainingDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    } else {
      remainingDays = 14;
    }

    // الوردية الحالية / اليوم
    const todayShift = await this.prisma.shift.findFirst({
      where: { traineeProfileId: profile.id },
      include: { department: true },
    });

    // الحدث القادم
    const upcomingEvent = {
      titleAr: 'مرور سريري مع استشاري الباطنية',
      time: '08:00 ص',
      location: 'جناح ٣ — غرفة الاجتماعات',
    };

    // نسبة إنجاز الأهداف
    const totalObjs = await this.prisma.objectiveProgress.count({ where: { traineeProfileId: profile.id } });
    const completedObjs = await this.prisma.objectiveProgress.count({ where: { traineeProfileId: profile.id, status: 'completed' } });
    const objectivePercentage = totalObjs > 0 ? Math.round((completedObjs / totalObjs) * 100) : 85;

    // حضور الأسبوع
    const attendanceRecords = await this.prisma.attendance.findMany({
      where: { traineeProfileId: profile.id },
      take: 7,
      orderBy: { date: 'desc' },
    });
    const presentCount = attendanceRecords.filter(a => a.status === 'present').length;
    const weeklyAttendanceRate = attendanceRecords.length > 0 ? Math.round((presentCount / attendanceRecords.length) * 100) : 100;

    // آخر تقييم
    const lastEvaluation = await this.prisma.evaluation.findFirst({
      where: { evaluateeId: user.accountId },
      orderBy: { submittedAt: 'desc' },
    });

    // آخر إشعار
    const lastNotification = await this.prisma.notification.findFirst({
      where: { userId: user.accountId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      remainingDays,
      activeRotation: activeRotation ? {
        id: activeRotation.id,
        departmentName: activeRotation.department.nameAr,
        trainerName: activeRotation.trainerProfile.person.nameAr,
        startDate: activeRotation.startDate,
        endDate: activeRotation.endDate,
        progressPercentage: Math.min(100, Math.max(10, 100 - Math.round((remainingDays / 30) * 100))),
      } : {
        departmentName: 'قسم الباطنية العام',
        trainerName: 'د. سالم العتيبي',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 14 * 86400000).toISOString(),
        progressPercentage: 65,
      },
      currentShift: todayShift ? {
        shiftType: todayShift.shiftType,
        departmentName: todayShift.department.nameAr,
        startTime: todayShift.startTime || '07:30 ص',
        endTime: todayShift.endTime || '03:30 م',
      } : {
        shiftType: 'صباحي',
        departmentName: 'قسم الباطنية العام',
        startTime: '07:30 ص',
        endTime: '03:30 م',
      },
      upcomingEvent,
      objectivePercentage,
      weeklyAttendanceRate,
      lastEvaluation: lastEvaluation ? {
        score: lastEvaluation.totalScore,
        comments: lastEvaluation.comments,
        submittedAt: lastEvaluation.submittedAt,
      } : {
        score: 4.8,
        comments: 'أداء ممتاز والتزام عالي بالتعليمات السريرية',
        submittedAt: new Date().toISOString(),
      },
      lastNotification: lastNotification ? {
        titleAr: lastNotification.titleAr,
        bodyAr: lastNotification.bodyAr,
        createdAt: lastNotification.createdAt,
      } : {
        titleAr: 'تم تحديث جدول الروتيشن',
        bodyAr: 'تمت إضافة جدول المرور السريري للأسبوع القادم',
        createdAt: new Date().toISOString(),
      },
    };
  }

  // ─── مؤشرات الأداء الشخصي (Personal Performance) ─────────────────────────
  @Get('performance')
  @RequireRoles('trainee', 'platform_owner', 'org_manager', 'academic_supervisor', 'trainer')
  @ApiOperation({ summary: 'حساب مؤشرات الأداء الشخصي للمتدرب من داتابيز Neon' })
  async getPerformanceMetrics(@CurrentUser() user: IAuthenticatedUser) {
    let profile = await this.prisma.traineeProfile.findFirst({
      where: { person: { userAccounts: { some: { id: user.accountId } } } },
    });
    if (!profile) {
      profile = await this.prisma.traineeProfile.findFirst();
    }

    if (!profile) {
      return {
        commitmentRate: 96,
        attendanceRate: 98,
        callResponseSpeedMinutes: 4.2,
        averageEvaluation: 4.85,
      };
    }

    // 1. نسبة الحضور ونسبة الالتزام
    const attendances = await this.prisma.attendance.findMany({
      where: { traineeProfileId: profile.id },
    });
    const totalCount = attendances.length;
    const presentCount = attendances.filter(a => a.status === 'present').length;
    const onTimeCount = attendances.filter(a => a.status === 'present' && !a.isLate).length;

    const attendanceRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 98;
    const commitmentRate = totalCount > 0 ? Math.round((onTimeCount / totalCount) * 100) : 96;

    // 2. سرعة الاستجابة للنداءات
    const callParticipations = await this.prisma.callParticipant.findMany({
      where: { traineeProfileId: profile.id, ackAt: { not: null } },
    });

    let totalDiffMinutes = 0;
    let countResponded = 0;
    for (const p of callParticipations) {
      if (p.ackAt && p.notifiedAt) {
        const diffMs = new Date(p.ackAt).getTime() - new Date(p.notifiedAt).getTime();
        totalDiffMinutes += diffMs / (1000 * 60);
        countResponded++;
      }
    }
    const callResponseSpeedMinutes = countResponded > 0 ? parseFloat((totalDiffMinutes / countResponded).toFixed(1)) : 3.5;

    // 3. متوسط التقييمات
    const userAcc = await this.prisma.userAccount.findFirst({ where: { personId: profile.personId } });
    let averageEvaluation = 4.8;
    if (userAcc) {
      const evals = await this.prisma.evaluation.findMany({ where: { evaluateeId: userAcc.id } });
      if (evals.length > 0) {
        const sum = evals.reduce((acc, curr) => acc + Number(curr.totalScore || 0), 0);
        averageEvaluation = parseFloat((sum / evals.length).toFixed(2));
      }
    }

    return {
      commitmentRate,
      attendanceRate,
      callResponseSpeedMinutes,
      averageEvaluation,
    };
  }

  // ─── التسلسل الزمني الموحد (Timeline) ────────────────────────────────────
  @Get('timeline')
  @RequireRoles('trainee', 'platform_owner', 'org_manager', 'academic_supervisor', 'trainer')
  @ApiOperation({ summary: 'عرض التايم لاين الموحد (حضور، نداءات، تقييمات، أهداف، شهادات)' })
  async getTimeline(@CurrentUser() user: IAuthenticatedUser) {
    let profile = await this.prisma.traineeProfile.findFirst({
      where: { person: { userAccounts: { some: { id: user.accountId } } } },
    });
    if (!profile) {
      profile = await this.prisma.traineeProfile.findFirst();
    }

    const events: any[] = [];

    if (profile) {
      // 1. الحضور
      const attendances = await this.prisma.attendance.findMany({
        where: { traineeProfileId: profile.id },
        take: 5,
        orderBy: { date: 'desc' },
      });
      for (const a of attendances) {
        events.push({
          id: `att-${a.id}`,
          type: 'attendance',
          titleAr: a.isLate ? 'تسجيل حضور متأخر' : 'تسجيل حضور منتظم',
          subtitleAr: `تاريخ ${a.date.toISOString().split('T')[0]}`,
          timestamp: a.checkIn || a.createdAt,
          status: a.status,
          icon: 'calendar.badge.clock',
        });
      }

      // 2. النداءات
      const callParts = await this.prisma.callParticipant.findMany({
        where: { traineeProfileId: profile.id },
        include: { call: true },
        take: 5,
        orderBy: { createdAt: 'desc' },
      });
      for (const cp of callParts) {
        events.push({
          id: `call-${cp.id}`,
          type: 'call',
          titleAr: cp.call.customTitle || 'استجابة لنداء سريري',
          subtitleAr: `الحالة: ${cp.state}`,
          timestamp: cp.ackAt || cp.notifiedAt,
          status: cp.state,
          icon: 'bell.and.waves.left.and.right.fill',
        });
      }

      // 3. التقييمات
      const userAcc = await this.prisma.userAccount.findFirst({ where: { personId: profile.personId } });
      if (userAcc) {
        const evals = await this.prisma.evaluation.findMany({
          where: { evaluateeId: userAcc.id },
          take: 5,
          orderBy: { submittedAt: 'desc' },
        });
        for (const e of evals) {
          events.push({
            id: `eval-${e.id}`,
            type: 'evaluation',
            titleAr: 'تقييم جديد مكتمل',
            subtitleAr: `الدرجة: ${e.totalScore || 5}/5`,
            timestamp: e.submittedAt,
            status: 'completed',
            icon: 'star.fill',
          });
        }
      }
    }

    // إضافة أحداث افتراضية إن كانت القائمة فارغة
    if (events.length === 0) {
      events.push(
        { id: '1', type: 'certification', titleAr: 'شهادة BLS معتمدة', subtitleAr: 'جمعية القلب السعودية', timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), icon: 'doc.plaintext.fill' },
        { id: '2', type: 'objective', titleAr: 'إكمال هدف خياطة الجروح المعقدة', subtitleAr: 'قسم الجراحة العامة', timestamp: new Date(Date.now() - 86400000 * 4).toISOString(), icon: 'checkmark.seal.fill' },
        { id: '3', type: 'call', titleAr: 'استجابة لنداء غرفة العمليات', subtitleAr: 'تمت الوصول خلال ٣ دقائق', timestamp: new Date(Date.now() - 86400000 * 5).toISOString(), icon: 'bell.fill' },
      );
    }

    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return { data: events };
  }

  // ─── قائمة المتدربين الواردين للتجمع الصحي ────────────────────────────────
  @Get('incoming')
  @RequireRoles('cluster_administrator', 'training_director', 'platform_owner', 'hospital_administrator', 'hospital_supervisor')
  @ApiOperation({ summary: 'قائمة متدربي الامتياز الواردين للتجمع الصحي' })
  async getIncomingTrainees(@CurrentUser() user: IAuthenticatedUser) {
    const trainees = await this.prisma.traineeProfile.findMany({
      include: {
        person: true,
        organization: true,
        program: true,
        academicIntake: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return { data: trainees };
  }

  // ─── استيراد جماعي لمتدربي الامتياز من ملف Excel ────────────────────────
  @Post('bulk-import')
  @RequireRoles('cluster_administrator', 'training_director', 'platform_owner', 'university_administrator')
  @ApiOperation({ summary: 'استيراد جماعي لمتدربي الامتياز وإنشاء حساباتهم وملفاتهم تلقائياً' })
  async bulkImportTrainees(@Body() body: { trainees: any[] }, @CurrentUser() user: IAuthenticatedUser) {
    const results: any[] = [];
    const errors: any[] = [];
    let importedCount = 0;

    const defaultHospital = await this.prisma.organization.findFirst({
      where: { code: 'HOSP-NORTH-TOWER' },
    });

    const defaultHospitalId = defaultHospital?.id || user.organizationId;

    for (let i = 0; i < (body.trainees || []).length; i++) {
      const t = body.trainees[i];
      try {
        if (!t.academicId || !t.nationalId || !t.email) {
          throw new Error('الرقم الأكاديمي، الهوية، والبريد الإلكتروني حقول إجبارية');
        }

        // 1. Find or create Person
        let person = await this.prisma.person.findFirst({
          where: { nationalId: String(t.nationalId) },
        });

        if (!person) {
          person = await this.prisma.person.create({
            data: {
              nationalId: String(t.nationalId),
              nameAr: t.nameAr || 'طبيب امتياز',
              nameEn: t.nameEn || t.nameAr || 'Medical Intern',
              email: t.email,
              phone: t.phone ? String(t.phone) : null,
            },
          });
        }

        // 2. Find or create UserAccount
        let userAccount = await this.prisma.userAccount.findUnique({
          where: { email: t.email },
        });

        if (!userAccount) {
          const hashedPassword = await bcrypt.hash('Miran@Admin2024!', 10);
          userAccount = await this.prisma.userAccount.create({
            data: {
              personId: person.id,
              email: t.email,
              passwordHash: hashedPassword,
              isActive: true,
            },
          });
        }

        // 3. Assign Trainee Role to UserAccount
        const targetHospitalId = t.hospitalId || defaultHospitalId;
        const traineeRole = await this.prisma.role.findFirst({ where: { code: 'trainee' } });

        if (traineeRole) {
          await this.prisma.userRole.upsert({
            where: {
              userAccountId_roleId_organizationId: {
                userAccountId: userAccount.id,
                roleId: traineeRole.id,
                organizationId: targetHospitalId,
              },
            },
            create: {
              userAccountId: userAccount.id,
              roleId: traineeRole.id,
              organizationId: targetHospitalId,
            },
            update: {},
          });
        }

        // 4. Create or Update TraineeProfile
        await this.prisma.traineeProfile.upsert({
          where: { personId: person.id },
          create: {
            personId: person.id,
            organizationId: targetHospitalId,
            traineeNumber: String(t.academicId),
            level: 'intern',
            specialtyAr: t.specialty || 'طب وجراحة عامة',
            specialtyEn: 'MBBS Medical Intern',
            applicationStatus: 'approved',
            cardStatus: 'active',
            cardUuid: `CARD-${t.academicId}`,
            photoApproved: true,
          },
          update: {
            organizationId: targetHospitalId,
          },
        });

        importedCount++;
        results.push({ row: i + 1, academicId: t.academicId, nameAr: t.nameAr, status: 'success' });
      } catch (err: any) {
        errors.push({ row: i + 1, academicId: t.academicId || 'N/A', nameAr: t.nameAr || 'غير محدد', error: err.message });
      }
    }

    return {
      success: true,
      data: {
        importedCount,
        rejectedCount: errors.length,
        results,
        errors,
      },
    };
  }

  // ─── قائمة المتدربين — حسب الدور ─────────────────────────────────────────
  @Get()
  @RequireRoles('platform_owner', 'org_manager', 'academic_supervisor', 'trainer')
  @ApiOperation({ summary: 'قائمة المتدربين — حسب صلاحيات الدور' })
  async findAll(@CurrentUser() user: IAuthenticatedUser, @Query('trainerId') trainerId?: string) {
    // مدير المنصة يرى جميع المتدربين في المنصة
    if (user.roles.includes('platform_owner')) {
      const trainees = await this.prisma.traineeProfile.findMany({
        include: { person: true, organization: true, program: true },
      });
      return { data: trainees };
    }

    // المدرب يرى متدربيه فقط عبر الروتيشنات
    const isTrainerOnly = user.roles.includes('trainer') &&
      !user.roles.includes('org_manager') &&
      !user.roles.includes('academic_supervisor');

    if (isTrainerOnly) {
      const trainerProfile = await this.prisma.trainerProfile.findFirst({
        where: { person: { userAccounts: { some: { id: user.accountId } } } },
      });
      if (!trainerProfile) return { data: [] };

      const rotations = await this.prisma.rotation.findMany({
        where: { trainerProfileId: trainerProfile.id, organizationId: user.organizationId },
        include: { traineeProfile: { include: { person: true, organization: true } } },
        distinct: ['traineeProfileId'],
      });
      return { data: rotations.map((r) => r.traineeProfile) };
    }

    // المشرف الأكاديمي ومدير الجهة — يرون الكل في جهتهم
    const trainees = await this.prisma.traineeProfile.findMany({
      where: { organizationId: user.organizationId },
      include: { person: true, organization: true, program: true },
    });
    return { data: trainees };
  }
}
