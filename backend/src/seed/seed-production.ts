// seed-production.ts — Seed البيانات التشغيلية الكاملة للإنتاج الفعلي (Production Seed)
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Full Production Seed Data for Miran Platform...\n');

  const passwordHash = await bcrypt.hash('Miran@Admin2024!', 10);

  // 1. Types & Roles Foundations
  console.log('1️⃣ Ensuring Roles & Organization Types...');
  const allPermissions = [
    { code: 'manage_platform',      nameAr: 'إدارة المنصة بالكامل',   nameEn: 'Manage Platform',      module: 'system' },
    { code: 'manage_organizations', nameAr: 'إدارة الجهات',          nameEn: 'Manage Organizations', module: 'organizations' },
    { code: 'manage_accounts',       nameAr: 'إدارة الحسابات',         nameEn: 'Manage Accounts',      module: 'users' },
    { code: 'manage_supervisors',    nameAr: 'إدارة المشرفين',         nameEn: 'Manage Supervisors',    module: 'users' },
    { code: 'manage_trainers',       nameAr: 'إدارة المدربين',         nameEn: 'Manage Trainers',       module: 'users' },
    { code: 'manage_trainees',       nameAr: 'إدارة المتدربين',        nameEn: 'Manage Trainees',       module: 'trainees' },
    { code: 'approve_rotations',     nameAr: 'اعتماد الروتيشنات',      nameEn: 'Approve Rotations',     module: 'rotations' },
    { code: 'assign_rotations',      nameAr: 'توزيع الروتيشنات',       nameEn: 'Assign Rotations',      module: 'rotations' },
    { code: 'view_rotations',        nameAr: 'عرض الروتيشنات',         nameEn: 'View Rotations',        module: 'rotations' },
    { code: 'view_reports',          nameAr: 'عرض التقارير',           nameEn: 'View Reports',          module: 'reports' },
    { code: 'approve_declarations',  nameAr: 'اعتماد الإقرارات',       nameEn: 'Approve Declarations',  module: 'declarations' },
    { code: 'track_attendance',      nameAr: 'متابعة الحضور',          nameEn: 'Track Attendance',      module: 'attendance' },
    { code: 'send_notifications',    nameAr: 'إرسال الإشعارات',        nameEn: 'Send Notifications',    module: 'notifications' },
    { code: 'receive_notifications', nameAr: 'استقبال الإشعارات',      nameEn: 'Receive Notifications', module: 'notifications' },
    { code: 'submit_evaluations',    nameAr: 'إرسال التقييمات',        nameEn: 'Submit Evaluations',    module: 'evaluations' },
    { code: 'view_evaluations',      nameAr: 'عرض التقييمات',          nameEn: 'View Evaluations',      module: 'evaluations' },
    { code: 'launch_calls',          nameAr: 'إطلاق النداءات',         nameEn: 'Launch Calls',          module: 'calls' },
    { code: 'view_active_calls',     nameAr: 'عرض النداءات النشطة',     nameEn: 'View Active Calls',     module: 'calls' },
    { code: 'track_call_responses',  nameAr: 'متابعة استجابات النداء',  nameEn: 'Track Call Responses',  module: 'calls' },
    { code: 'respond_to_calls',      nameAr: 'الرد على النداءات',       nameEn: 'Respond to Calls',      module: 'calls' },
    { code: 'view_own_data',         nameAr: 'عرض بياناتي الشخصية',    nameEn: 'View Own Data',         module: 'profile' },
    { code: 'view_own_trainees',     nameAr: 'عرض متدربيّ فقط',        nameEn: 'View Own Trainees',     module: 'trainees' },
  ];

  for (const perm of allPermissions) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      create: { code: perm.code, nameAr: perm.nameAr, nameEn: perm.nameEn, module: perm.module },
      update: { nameAr: perm.nameAr, nameEn: perm.nameEn },
    });
  }

  const roles = [
    { code: 'platform_owner', nameAr: 'مدير المنصة الوطنية', hierarchyLevel: 100 },
    { code: 'cluster_manager', nameAr: 'مدير التجمع الصحي', hierarchyLevel: 20 },
    { code: 'org_manager', nameAr: 'مدير مستشفى / جهة', hierarchyLevel: 10 },
    { code: 'academic_supervisor', nameAr: 'مشرف أكاديمي / مشرف امتياز', hierarchyLevel: 7 },
    { code: 'training_supervisor', nameAr: 'مشرف تدريب', hierarchyLevel: 6 },
    { code: 'trainer', nameAr: 'مدرب سريري', hierarchyLevel: 5 },
    { code: 'trainee', nameAr: 'متدرب / طبيب امتياز', hierarchyLevel: 1 },
  ];

  for (const r of roles) {
    await prisma.role.upsert({
      where: { code: r.code },
      create: { code: r.code, nameAr: r.nameAr, nameEn: r.code, hierarchyLevel: r.hierarchyLevel, isSystem: true },
      update: { nameAr: r.nameAr, hierarchyLevel: r.hierarchyLevel },
    });
  }

  // Org Types
  const clusterType = await prisma.organizationType.upsert({
    where: { code: 'cluster' },
    create: { code: 'cluster', nameAr: 'تجمع صحي', nameEn: 'Health Cluster' },
    update: {},
  });
  const hospitalType = await prisma.organizationType.upsert({
    where: { code: 'hospital' },
    create: { code: 'hospital', nameAr: 'مستشفى / برج طبي', nameEn: 'Hospital' },
    update: {},
  });
  const uniType = await prisma.organizationType.upsert({
    where: { code: 'university' },
    create: { code: 'university', nameAr: 'جامعة', nameEn: 'University' },
    update: {},
  });

  // 2. Creating Main Organizations
  console.log('2️⃣ Seeding Production Organizations...');

  // التجمع الصحي بالحدود الشمالية
  const nbCluster = await prisma.organization.upsert({
    where: { code: 'NB-CLUSTER-PROD' },
    create: {
      organizationTypeId: clusterType.id,
      code: 'NB-CLUSTER-PROD',
      nameAr: 'التجمع الصحي بالحدود الشمالية',
      nameEn: 'Northern Borders Health Cluster',
      status: 'active',
      cityAr: 'عرعر',
      regionAr: 'الحدود الشمالية',
      contactEmail: 'cluster@nbhc.health.sa',
    },
    update: { nameAr: 'التجمع الصحي بالحدود الشمالية' },
  });

  // جامعة الحدود الشمالية
  const nbuUni = await prisma.organization.upsert({
    where: { code: 'NBU-UNI-PROD' },
    create: {
      organizationTypeId: uniType.id,
      code: 'NBU-UNI-PROD',
      nameAr: 'جامعة الحدود الشمالية',
      nameEn: 'Northern Borders University',
      status: 'active',
      cityAr: 'عرعر',
      regionAr: 'الحدود الشمالية',
      contactEmail: 'info@nbu.edu.sa',
    },
    update: { nameAr: 'جامعة الحدود الشمالية' },
  });

  // مستشفى برج الشمال الطبي
  const northTowerHosp = await prisma.organization.upsert({
    where: { code: 'HOSP-NORTH-TOWER' },
    create: {
      organizationTypeId: hospitalType.id,
      parentId: nbCluster.id,
      code: 'HOSP-NORTH-TOWER',
      nameAr: 'مستشفى برج الشمال الطبي',
      nameEn: 'North Tower Medical Hospital',
      status: 'active',
      cityAr: 'عرعر',
      regionAr: 'الحدود الشمالية',
      contactEmail: 'northtower@nbhc.health.sa',
    },
    update: { nameAr: 'مستشفى برج الشمال الطبي' },
  });

  // 3. Creating Departments
  console.log('3️⃣ Seeding Departments for Hospital & Administrative Entities...');
  const hospitalDepts = [
    { code: 'EMERGENCY', nameAr: 'قسم الطوارئ والإصابات', nameEn: 'Emergency & Trauma' },
    { code: 'INTERNAL_MED', nameAr: 'قسم الباطنية العام', nameEn: 'Internal Medicine' },
    { code: 'SURGERY', nameAr: 'قسم الجراحة العامة', nameEn: 'General Surgery' },
    { code: 'PEDIATRICS', nameAr: 'قسم طب الأطفال', nameEn: 'Pediatrics' },
    { code: 'OBGYN', nameAr: 'قسم النساء والولادة', nameEn: 'Obstetrics & Gynecology' },
    { code: 'ICU', nameAr: 'قسم العناية المركزة', nameEn: 'Intensive Care Unit' },
    { code: 'OR', nameAr: 'قسم غرف العمليات', nameEn: 'Operating Rooms' },
    { code: 'LAB', nameAr: 'قسم المختبر وبنك الدم', nameEn: 'Laboratory & Blood Bank' },
    { code: 'RADIOLOGY', nameAr: 'قسم الأشعة والتصوير الطبي', nameEn: 'Radiology' },
    { code: 'PHARMACY', nameAr: 'قسم الصيدلية السريرية', nameEn: 'Pharmacy' },
    { code: 'ACADEMIC_AFF', nameAr: 'إدارة الشؤون الأكاديمية والتدريب', nameEn: 'Academic Affairs & Training' },
    { code: 'HR', nameAr: 'إدارة الموارد البشرية', nameEn: 'Human Resources' },
    { code: 'QUALITY', nameAr: 'إدارة الجودة وسعادة المتدربين', nameEn: 'Quality & Trainee Happiness' },
    { code: 'IT', nameAr: 'إدارة تقنية المعلومات والتحول الرقمي', nameEn: 'IT & Digital Transformation' },
  ];

  const createdDepts: Record<string, any> = {};
  for (const d of hospitalDepts) {
    let dept = await prisma.department.findFirst({
      where: { organizationId: northTowerHosp.id, code: d.code },
    });
    if (!dept) {
      dept = await prisma.department.create({
        data: {
          organizationId: northTowerHosp.id,
          code: d.code,
          nameAr: d.nameAr,
          nameEn: d.nameEn,
          capacity: 20,
        },
      });
    }
    createdDepts[d.code] = dept;
  }

  // 4. Accounts Creation & Role Assignment
  console.log('4️⃣ Seeding Official Production User Accounts...');

  const accountsDef = [
    {
      email: 'platform@miran.health',
      nameAr: 'مدير المنصة الوطنية',
      nationalId: '1099999999',
      roleCode: 'platform_owner',
      orgId: northTowerHosp.id,
    },
    {
      email: 'cluster.manager@miran.health',
      nameAr: 'د. خالد الشمالي — مدير التجمع الصحي',
      nationalId: '1011111111',
      roleCode: 'cluster_manager',
      orgId: nbCluster.id,
    },
    {
      email: 'hospital.manager@miran.health',
      nameAr: 'د. أحمد العنزي — مدير مستشفى برج الشمال',
      nationalId: '1022222222',
      roleCode: 'org_manager',
      orgId: northTowerHosp.id,
    },
    {
      email: 'academic.manager@miran.health',
      nameAr: 'د. نورة العمري — مدير الشؤون الأكاديمية',
      nationalId: '1033333333',
      roleCode: 'academic_supervisor',
      orgId: northTowerHosp.id,
    },
    {
      email: 'uni.supervisor@miran.health',
      nameAr: 'د. سعود الحربي — مشرف الامتياز (جامعة الحدود الشمالية)',
      nationalId: '1044444444',
      roleCode: 'academic_supervisor',
      orgId: nbuUni.id,
    },
    {
      email: 'training.supervisor@miran.health',
      nameAr: 'د. فهد المطيري — مشرف التدريب السريري',
      nationalId: '1055555555',
      roleCode: 'training_supervisor',
      orgId: northTowerHosp.id,
    },
    {
      email: 'salem@miran.health',
      nameAr: 'د. سالم العتيبي — استشاري ومدرب سريري',
      nationalId: '1066666666',
      roleCode: 'trainer',
      orgId: northTowerHosp.id,
      deptCode: 'INTERNAL_MED',
    },
  ];

  for (const acc of accountsDef) {
    const person = await prisma.person.upsert({
      where: { nationalId: acc.nationalId },
      create: {
        nationalId: acc.nationalId,
        nameAr: acc.nameAr,
        email: acc.email,
        phone: '+96650000000',
      },
      update: { nameAr: acc.nameAr, email: acc.email },
    });

    const userAcc = await prisma.userAccount.upsert({
      where: { email: acc.email },
      create: {
        personId: person.id,
        email: acc.email,
        username: acc.email.split('@')[0],
        passwordHash,
        isEmailVerified: true,
        isActive: true,
      },
      update: { isActive: true },
    });

    const role = await prisma.role.findUnique({ where: { code: acc.roleCode } });
    if (role) {
      await prisma.userRole.upsert({
        where: {
          userAccountId_roleId_organizationId: {
            userAccountId: userAcc.id,
            roleId: role.id,
            organizationId: acc.orgId,
          },
        },
        create: { userAccountId: userAcc.id, roleId: role.id, organizationId: acc.orgId },
        update: {},
      });
    }

    await prisma.userOrganization.upsert({
      where: { userAccountId_organizationId: { userAccountId: userAcc.id, organizationId: acc.orgId } },
      create: { userAccountId: userAcc.id, organizationId: acc.orgId, isPrimary: true },
      update: {},
    });

    if (acc.roleCode === 'trainer') {
      await prisma.trainerProfile.upsert({
        where: { personId: person.id },
        create: {
          personId: person.id,
          organizationId: acc.orgId,
          departmentId: createdDepts[acc.deptCode || 'INTERNAL_MED']?.id,
          titleAr: 'استشاري ومدرب باطنية',
          maxTrainees: 10,
        },
        update: {},
      });
    }
  }

  // 5. Seeding Production Trainees & Rotations
  console.log('5️⃣ Seeding Official Trainees group & Clinical Rotations...');
  const traineesList = [
    { natId: '1070000001', nameAr: 'عبدالله محمد الشمري', email: 'abdullah@miran.health', num: '11023', level: 'intern', spec: 'طب وجراحة البشرية' },
    { natId: '1070000002', nameAr: 'فاطمة علي الرويلي', email: 'fatima@miran.health', num: '11024', level: 'intern', spec: 'طب وجراحة البشرية' },
    { natId: '1070000003', nameAr: 'خالد سعود العنزي', email: 'khalid@miran.health', num: '11025', level: 'intern', spec: 'طب وجراحة البشرية' },
    { natId: '1070000004', nameAr: 'سارة محمد الرشيد', email: 'sara@miran.health', num: '11026', level: 'resident', spec: 'طب الأسرة — سنة ٢' },
    { natId: '1070000005', nameAr: 'فيصل عبدالرحمن الحميد', email: 'faisal@miran.health', num: '11027', level: 'resident', spec: 'طب الباطنية — سنة ١' },
  ];

  const traineeRole = await prisma.role.findUnique({ where: { code: 'trainee' } });
  const salemProfile = await prisma.trainerProfile.findFirst();

  for (const t of traineesList) {
    const p = await prisma.person.upsert({
      where: { nationalId: t.natId },
      create: { nationalId: t.natId, nameAr: t.nameAr, email: t.email, phone: `+9665${t.num}0` },
      update: { nameAr: t.nameAr },
    });

    const userAcc = await prisma.userAccount.upsert({
      where: { email: t.email },
      create: {
        personId: p.id,
        email: t.email,
        username: t.email.split('@')[0],
        passwordHash,
        isEmailVerified: true,
        isActive: true,
      },
      update: {},
    });

    if (traineeRole) {
      await prisma.userRole.upsert({
        where: {
          userAccountId_roleId_organizationId: {
            userAccountId: userAcc.id,
            roleId: traineeRole.id,
            organizationId: northTowerHosp.id,
          },
        },
        create: { userAccountId: userAcc.id, roleId: traineeRole.id, organizationId: northTowerHosp.id },
        update: {},
      });
    }

    await prisma.userOrganization.upsert({
      where: { userAccountId_organizationId: { userAccountId: userAcc.id, organizationId: northTowerHosp.id } },
      create: { userAccountId: userAcc.id, organizationId: northTowerHosp.id, isPrimary: true },
      update: {},
    });

    let tp = await prisma.traineeProfile.findUnique({ where: { personId: p.id } });
    if (!tp) {
      tp = await prisma.traineeProfile.create({
        data: {
          personId: p.id,
          organizationId: northTowerHosp.id,
          traineeNumber: `NT-${t.num}`,
          level: t.level,
          specialtyAr: t.spec,
          applicationStatus: 'approved',
          cardStatus: 'active',
          cardUuid: `CARD-NT-${t.num}`,
          photoApproved: true,
        },
      });
    }

    // Create Active Rotation
    if (salemProfile && createdDepts['INTERNAL_MED']) {
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      const existingRot = await prisma.rotation.findFirst({
        where: { traineeProfileId: tp.id, departmentId: createdDepts['INTERNAL_MED'].id },
      });
      if (!existingRot) {
        await prisma.rotation.create({
          data: {
            organizationId: northTowerHosp.id,
            traineeProfileId: tp.id,
            departmentId: createdDepts['INTERNAL_MED'].id,
            trainerProfileId: salemProfile.id,
            startDate,
            endDate,
            status: 'active',
            midpointMeetingDone: true,
          },
        });
      }
    }
  }

  // 6. Final Report & Counts
  console.log('\n📊 Production Database Build & Seed Summary:');
  console.log(`  Organizations: ${await prisma.organization.count()}`);
  console.log(`  Departments: ${await prisma.department.count()}`);
  console.log(`  User Accounts: ${await prisma.userAccount.count()}`);
  console.log(`  Trainee Profiles: ${await prisma.traineeProfile.count()}`);
  console.log(`  Trainer Profiles: ${await prisma.trainerProfile.count()}`);
  console.log(`  Rotations: ${await prisma.rotation.count()}`);
  console.log(`  Roles: ${await prisma.role.count()}`);
  console.log(`  Permissions: ${await prisma.permission.count()}`);

  console.log('\n✨ Production Seed Successfully Completed!\n');
}

main()
  .catch((e) => {
    console.error('❌ Production Seed Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
