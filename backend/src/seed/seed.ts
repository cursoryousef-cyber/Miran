// ============================================================================
// مِران (Miran) — Production-like System Seed Script (v3.5)
// Real-world demo data centered on:
// 1. تجمع الحدود الشمالية الصحي (Northern Borders Health Cluster)
// 2. جامعة الحدود الشمالية (Northern Border University)
// 3. مستشفى برج الشمال الطبي (North Tower Medical Complex)
// ============================================================================

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Miran Platform Production-like Seed...');

  // --------------------------------------------------------------------------
  // 1. ORGANIZATION TYPES (أنواع الجهات)
  // --------------------------------------------------------------------------
  console.log('📦 Seeding OrganizationTypes...');

  const orgTypes = [
    { code: 'holding', nameAr: 'شركة الصحة القابضة', nameEn: 'Health Holding Company', icon: 'domain', sortOrder: 1, canHaveChildren: true, allowedChildTypes: ['cluster', 'university'], autoCreateRole: 'holding_administrator' },
    { code: 'cluster', nameAr: 'تجمع صحي', nameEn: 'Health Cluster', icon: 'account_tree', sortOrder: 2, canHaveChildren: true, allowedChildTypes: ['hospital', 'specialty_center', 'phc'], autoCreateRole: 'cluster_administrator' },
    { code: 'hospital', nameAr: 'مستشفى / مجمع طبي', nameEn: 'Hospital / Medical Complex', icon: 'local_hospital', sortOrder: 3, canHaveChildren: true, allowedChildTypes: ['department'], autoCreateRole: 'hospital_administrator' },
    { code: 'university', nameAr: 'جامعة', nameEn: 'University', icon: 'school', sortOrder: 4, canHaveChildren: true, allowedChildTypes: ['college'], autoCreateRole: 'university_administrator' },
    { code: 'college', nameAr: 'كلية صحية', nameEn: 'Health College', icon: 'menu_book', sortOrder: 5, canHaveChildren: true, allowedChildTypes: ['department'], autoCreateRole: 'academic_affairs' },
    { code: 'specialty_center', nameAr: 'مركز تخصصي', nameEn: 'Specialty Center', icon: 'medical_services', sortOrder: 6, canHaveChildren: true, allowedChildTypes: ['department'], autoCreateRole: 'hospital_administrator' },
    { code: 'department', nameAr: 'قسم سريري / إداري', nameEn: 'Department', icon: 'corporate_fare', sortOrder: 9, canHaveChildren: false, allowedChildTypes: [], autoCreateRole: 'department_head' },
  ];

  const createdTypes: Record<string, string> = {};
  for (const ot of orgTypes) {
    const record = await prisma.organizationType.upsert({
      where: { code: ot.code },
      create: ot,
      update: ot,
    });
    createdTypes[ot.code] = record.id;
  }

  // --------------------------------------------------------------------------
  // 2. ROLES (الأدوار الموحدة بالنظام)
  // --------------------------------------------------------------------------
  console.log('🎭 Seeding Roles...');

  const roles = [
    { code: 'platform_owner', nameAr: 'مدير المنصة الوطنية', nameEn: 'Platform Owner', hierarchyLevel: 100, isSystem: true },
    { code: 'holding_administrator', nameAr: 'مدير الصحة القابضة', nameEn: 'Holding Administrator', hierarchyLevel: 90, isSystem: true },
    { code: 'cluster_administrator', nameAr: 'مدير التجمع الصحي', nameEn: 'Cluster Administrator', hierarchyLevel: 80, isSystem: true },
    { code: 'hospital_administrator', nameAr: 'مدير المستشفى / المركز', nameEn: 'Hospital Administrator', hierarchyLevel: 70, isSystem: true },
    { code: 'university_administrator', nameAr: 'مدير الجامعة', nameEn: 'University Administrator', hierarchyLevel: 70, isSystem: true },
    { code: 'academic_affairs', nameAr: 'مشرف الشؤون الأكاديمية', nameEn: 'Academic Affairs Supervisor', hierarchyLevel: 60, isSystem: true },
    { code: 'training_director', nameAr: 'مدير الشؤون التدريبية', nameEn: 'Training Director', hierarchyLevel: 60, isSystem: true },
    { code: 'department_head', nameAr: 'رئيس القسم السريري', nameEn: 'Department Head', hierarchyLevel: 50, isSystem: true },
    { code: 'academic_supervisor', nameAr: 'مشرف أكاديمي', nameEn: 'Academic Supervisor', hierarchyLevel: 40, isSystem: true },
    { code: 'training_supervisor', nameAr: 'مشرف تدريب ميداني', nameEn: 'Training Supervisor', hierarchyLevel: 40, isSystem: true },
    { code: 'trainer', nameAr: 'مدرب ميداني', nameEn: 'Trainer', hierarchyLevel: 30, isSystem: true },
    { code: 'trainee', nameAr: 'متدرب / طبيب امتياز', nameEn: 'Trainee / Intern', hierarchyLevel: 10, isSystem: true },
    { code: 'org_manager', nameAr: 'مدير الجهة', nameEn: 'Organization Manager', hierarchyLevel: 75, isSystem: true },
  ];

  const createdRoles: Record<string, string> = {};
  for (const r of roles) {
    const record = await prisma.role.upsert({
      where: { code: r.code },
      create: r,
      update: r,
    });
    createdRoles[r.code] = record.id;
  }

  const defaultPasswordHash = await bcrypt.hash('Miran@Admin2024!', 10);

  // --------------------------------------------------------------------------
  // 3. ORGANIZATIONS (تجمع الحدود الشمالية + جامعة الحدود الشمالية + برج الشمال)
  // --------------------------------------------------------------------------
  console.log('🏰 Seeding Real Organizations...');

  // Health Holding Company
  const holdingOrg = await prisma.organization.upsert({
    where: { code: 'HEALTH-HOLDING' },
    create: {
      organizationTypeId: createdTypes['holding'],
      code: 'HEALTH-HOLDING',
      nameAr: 'شركة الصحة القابضة',
      nameEn: 'Health Holding Company',
      status: 'active',
      cityAr: 'الرياض',
      regionAr: 'الرياض',
      contactEmail: 'info@healthholding.sa',
    },
    update: {},
  });

  // Northern Borders Health Cluster (تجمع الحدود الشمالية الصحي)
  const clusterOrg = await prisma.organization.upsert({
    where: { code: 'NB-CLUSTER' },
    create: {
      organizationTypeId: createdTypes['cluster'],
      parentId: holdingOrg.id,
      code: 'NB-CLUSTER',
      nameAr: 'تجمع الحدود الشمالية الصحي',
      nameEn: 'Northern Borders Health Cluster',
      status: 'active',
      cityAr: 'عرعر',
      regionAr: 'الحدود الشمالية',
      contactEmail: 'contact@nbhc.health.sa',
      contactPhone: '+966146620000',
    },
    update: {},
  });

  // North Tower Medical Complex (مستشفى برج الشمال الطبي)
  const northTowerHosp = await prisma.organization.upsert({
    where: { code: 'HOSP-NORTH-TOWER' },
    create: {
      organizationTypeId: createdTypes['hospital'],
      parentId: clusterOrg.id,
      code: 'HOSP-NORTH-TOWER',
      nameAr: 'مستشفى برج الشمال الطبي',
      nameEn: 'North Tower Medical Complex',
      status: 'active',
      cityAr: 'عرعر',
      regionAr: 'الحدود الشمالية',
      contactEmail: 'northtower@nbhc.health.sa',
      contactPhone: '+966146621111',
    },
    update: {},
  });

  // Northern Border University (جامعة الحدود الشمالية)
  const uniOrg = await prisma.organization.upsert({
    where: { code: 'NBU-UNIVERSITY' },
    create: {
      organizationTypeId: createdTypes['university'],
      code: 'NBU-UNIVERSITY',
      nameAr: 'جامعة الحدود الشمالية',
      nameEn: 'Northern Border University',
      status: 'active',
      cityAr: 'عرعر',
      regionAr: 'الحدود الشمالية',
      contactEmail: 'info@nbu.edu.sa',
      contactPhone: '+966146614444',
    },
    update: {},
  });

  // --------------------------------------------------------------------------
  // 4. CLINICAL DEPARTMENTS (الأقسام السريرية بمستشفى برج الشمال الطبي)
  // --------------------------------------------------------------------------
  console.log('🩺 Seeding Clinical Departments at North Tower Complex...');

  const deptInternal = await prisma.department.upsert({
    where: { id: 'dept-nb-internal-med-01' },
    create: {
      id: 'dept-nb-internal-med-01',
      organizationId: northTowerHosp.id,
      nameAr: 'قسم الباطنة العامة — برج الشمال',
      nameEn: 'General Internal Medicine Department',
      code: 'NT-INT-MED',
      capacity: 25,
      roundLocation: 'برج الشمال — البرج الطبي الدور الرابع',
      roundTime: '08:00',
      meetingRoom: 'قاعة الأطباء المقيمين ٤٠١',
    },
    update: {},
  });

  const deptSurgery = await prisma.department.upsert({
    where: { id: 'dept-nb-surgery-02' },
    create: {
      id: 'dept-nb-surgery-02',
      organizationId: northTowerHosp.id,
      nameAr: 'قسم الجراحة العامة وجراحة اليوم الواحد',
      nameEn: 'General Surgery & Day Surgery Department',
      code: 'NT-SURGERY',
      capacity: 20,
      roundLocation: 'برج الشمال — جناح الجراحة الدور الخامس',
      roundTime: '06:30',
      meetingRoom: 'غرفة مناقشة الحالات الجراحية',
    },
    update: {},
  });

  const deptER = await prisma.department.upsert({
    where: { id: 'dept-nb-er-03' },
    create: {
      id: 'dept-nb-er-03',
      organizationId: northTowerHosp.id,
      nameAr: 'قسم الطوارئ والحوادث المتقدمة',
      nameEn: 'Advanced Emergency & Trauma Department',
      code: 'NT-ER',
      capacity: 30,
      roundLocation: 'برج الشمال — الدور الأرضي مدخل الطوارئ',
      roundTime: '07:00',
      meetingRoom: 'غرفة تسليم الشيفتات العاجلة',
    },
    update: {},
  });

  // --------------------------------------------------------------------------
  // 5. USER ACCOUNTS FOR ALL 6 PRIMARY ROLES
  // --------------------------------------------------------------------------
  console.log('👥 Seeding Comprehensive User Accounts for All Roles...');

  const accountsSeedConfig = [
    {
      natId: '1000000000',
      nameAr: 'مدير المنصة الوطنية',
      email: 'platform@miran.health',
      username: 'platform',
      roleCode: 'platform_owner',
      orgId: holdingOrg.id,
    },
    {
      natId: '1000000099',
      nameAr: 'مدير النظام التنفيذي',
      email: 'admin@miran.health',
      username: 'sysadmin',
      roleCode: 'system_admin',
      orgId: holdingOrg.id,
    },
    {
      natId: '1000000001',
      nameAr: 'مدير تجمع الحدود الشمالية',
      email: 'cluster.manager@miran.health',
      username: 'clustermanager',
      roleCode: 'org_manager',
      orgId: clusterOrg.id,
    },
    {
      natId: '1000000002',
      nameAr: 'د. خالد الأكاديمي — جامعة الحدود الشمالية',
      email: 'academic.manager@miran.health',
      username: 'academicmanager',
      roleCode: 'academic_supervisor',
      orgId: uniOrg.id,
    },
    {
      natId: '1000000003',
      nameAr: 'د. فهد المشرف — مستشفى برج الشمال',
      email: 'training.supervisor@miran.health',
      username: 'trainingsupervisor',
      roleCode: 'training_supervisor',
      orgId: northTowerHosp.id,
    },
    {
      natId: '1011111111',
      nameAr: 'د. سالم العتيبي (مدرب الباطنية الميداني)',
      email: 'salem@miran.health',
      username: 'drsalem',
      roleCode: 'trainer',
      orgId: northTowerHosp.id,
    },
    {
      natId: '1022222222',
      nameAr: 'طبيب امتياز عبدالله المطيري',
      email: 'abdullah@miran.health',
      username: 'abdullah',
      roleCode: 'trainee',
      orgId: northTowerHosp.id,
    },
  ];

  const createdUserMap: Record<string, any> = {};

  for (const cfg of accountsSeedConfig) {
    const person = await prisma.person.upsert({
      where: { nationalId: cfg.natId },
      create: {
        nationalId: cfg.natId,
        nameAr: cfg.nameAr,
        email: cfg.email,
        phone: `+9665${cfg.natId.slice(2, 9)}`,
      },
      update: {},
    });

    const userAccount = await prisma.userAccount.upsert({
      where: { email: cfg.email },
      create: {
        personId: person.id,
        email: cfg.email,
        username: cfg.username,
        passwordHash: defaultPasswordHash,
        isEmailVerified: true,
        isActive: true,
      },
      update: {},
    });

    await prisma.userOrganization.upsert({
      where: {
        userAccountId_organizationId: {
          userAccountId: userAccount.id,
          organizationId: cfg.orgId,
        },
      },
      create: {
        userAccountId: userAccount.id,
        organizationId: cfg.orgId,
        isPrimary: true,
      },
      update: {},
    });

    await prisma.userRole.upsert({
      where: {
        userAccountId_roleId_organizationId: {
          userAccountId: userAccount.id,
          roleId: createdRoles[cfg.roleCode],
          organizationId: cfg.orgId,
        },
      },
      create: {
        userAccountId: userAccount.id,
        roleId: createdRoles[cfg.roleCode],
        organizationId: cfg.orgId,
      },
      update: {},
    });

    createdUserMap[cfg.roleCode] = { person, userAccount };
  }

  // --------------------------------------------------------------------------
  // 6. PROFILES (TRAINER & TRAINEE PROFILES)
  // --------------------------------------------------------------------------
  console.log('🩺 Seeding Trainer & Trainee Profiles...');

  const trainerProfile = await prisma.trainerProfile.upsert({
    where: { personId: createdUserMap['trainer'].person.id },
    create: {
      personId: createdUserMap['trainer'].person.id,
      organizationId: northTowerHosp.id,
      departmentId: deptInternal.id,
      titleAr: 'استشاري ورئيس قسم الباطنية — برج الشمال',
      titleEn: 'Consultant & Head of Internal Medicine',
      extensionNumber: '7011',
      maxTrainees: 8,
      specialization: 'Internal Medicine & Critical Care',
    },
    update: {},
  });

  const traineeProfile = await prisma.traineeProfile.upsert({
    where: { personId: createdUserMap['trainee'].person.id },
    create: {
      personId: createdUserMap['trainee'].person.id,
      organizationId: northTowerHosp.id,
      traineeNumber: 'NBU-INT-2026-091',
      level: 'intern',
      specialtyAr: 'طبيب امتياز — طب وجراحة عامة',
      specialtyEn: 'MBBS Medical Intern',
      applicationStatus: 'approved',
      cardStatus: 'active',
      cardUuid: 'CARD-NBU-NT-9901',
      photoApproved: true,
    },
    update: {},
  });

  // --------------------------------------------------------------------------
  // 7. ROTATIONS & SCHEDULES
  // --------------------------------------------------------------------------
  console.log('🔄 Seeding Active Rotations...');

  const now = new Date();
  const startDate = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);
  const endDate = new Date(now.getTime() + 40 * 24 * 60 * 60 * 1000);

  await prisma.rotation.create({
    data: {
      organizationId: northTowerHosp.id,
      traineeProfileId: traineeProfile.id,
      departmentId: deptInternal.id,
      trainerProfileId: trainerProfile.id,
      startDate: startDate,
      endDate: endDate,
      status: 'active',
      midpointMeetingDone: true,
    },
  });

  // --------------------------------------------------------------------------
  // 8. EMERGENCY CALLS & ALERT CENTER
  // --------------------------------------------------------------------------
  console.log('🚨 Seeding M-CALL Field Emergency Call...');

  const emergencyCall = await prisma.trainerCall.create({
    data: {
      organizationId: northTowerHosp.id,
      departmentId: deptInternal.id,
      trainerProfileId: trainerProfile.id,
      callType: 'urgent',
      customTitle: 'نداء طوارئ سريري — العناية المركزة برج الشمال',
      note: 'حالة انخفاض أكسجين حادة بالطوارئ، يلزم تواجد المتدربين فوراً',
      location: 'مستشفى برج الشمال — الدور الرابع العناية المركزة غرفة ٤٠٢',
      expectedMinutes: 15,
      launchedAt: new Date(),
      status: 'active',
    },
  });

  await prisma.callParticipant.create({
    data: {
      callId: emergencyCall.id,
      traineeProfileId: traineeProfile.id,
      state: 'notified',
      notifiedAt: new Date(),
    },
  });

  // --------------------------------------------------------------------------
  // 9. AUDIT LOGS
  // --------------------------------------------------------------------------
  console.log('📜 Seeding System Audit Trail...');

  await prisma.auditLog.create({
    data: {
      organizationId: northTowerHosp.id,
      userAccountId: createdUserMap['platform_owner'].userAccount.id,
      action: 'SYSTEM_BOOTSTRAP_COMPLETE',
      entityType: 'PLATFORM',
      entityId: holdingOrg.id,
      details: JSON.stringify({ message: 'تم اعتماد وتجهيز بيئة تجمع الحدود الشمالية الصحي ومستشفى برج الشمال الطبي بالكامل.' }),
    },
  });

  console.log('✅ Production-like Seed successfully completed!');
  console.log('========================================================================');
  console.log('📌 1. Platform Owner: platform@miran.health | Pass: Miran@Admin2024!');
  console.log('📌 2. Org Manager: cluster.manager@miran.health | Pass: Miran@Admin2024!');
  console.log('📌 3. Academic Supervisor: academic.manager@miran.health | Pass: Miran@Admin2024!');
  console.log('📌 4. Training Supervisor: training.supervisor@miran.health | Pass: Miran@Admin2024!');
  console.log('📌 5. Trainer: salem@miran.health | Pass: Miran@Admin2024!');
  console.log('📌 6. Trainee: abdullah@miran.health | Pass: Miran@Admin2024!');
  console.log('========================================================================');
}

main()
  .catch((e) => {
    console.error('❌ Seed execution failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
