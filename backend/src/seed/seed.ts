// ============================================================================
// مِران (Miran) — System Seed Script
// Bootstraps OrganizationTypes, Roles, Permissions, Default Policies,
// Default Workflows, Platform Owner, and Northern Borders Demo Data
// ============================================================================

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Miran Platform seed...');

  // --------------------------------------------------------------------------
  // 1. ORGANIZATION TYPES (أنواع الجهات الديناميكية)
  // --------------------------------------------------------------------------
  console.log('📦 Seeding OrganizationTypes...');

  const orgTypes = [
    {
      code: 'holding',
      nameAr: 'شركة الصحة القابضة',
      nameEn: 'Health Holding Company',
      icon: 'domain',
      sortOrder: 1,
      canHaveChildren: true,
      allowedChildTypes: ['cluster', 'university'],
      autoCreateRole: 'holding_administrator',
    },
    {
      code: 'cluster',
      nameAr: 'تجمع صحي',
      nameEn: 'Health Cluster',
      icon: 'account_tree',
      sortOrder: 2,
      canHaveChildren: true,
      allowedChildTypes: ['hospital', 'specialty_center', 'phc'],
      autoCreateRole: 'cluster_administrator',
    },
    {
      code: 'hospital',
      nameAr: 'مستشفى',
      nameEn: 'Hospital',
      icon: 'local_hospital',
      sortOrder: 3,
      canHaveChildren: true,
      allowedChildTypes: ['department'],
      autoCreateRole: 'hospital_administrator',
    },
    {
      code: 'university',
      nameAr: 'جامعة',
      nameEn: 'University',
      icon: 'school',
      sortOrder: 4,
      canHaveChildren: true,
      allowedChildTypes: ['college'],
      autoCreateRole: 'university_administrator',
    },
    {
      code: 'college',
      nameAr: 'كلية صحية',
      nameEn: 'Health College',
      icon: 'menu_book',
      sortOrder: 5,
      canHaveChildren: true,
      allowedChildTypes: ['department'],
      autoCreateRole: 'academic_affairs',
    },
    {
      code: 'specialty_center',
      nameAr: 'مركز تخصصي',
      nameEn: 'Specialty Center',
      icon: 'medical_services',
      sortOrder: 6,
      canHaveChildren: true,
      allowedChildTypes: ['department'],
      autoCreateRole: 'hospital_administrator',
    },
    {
      code: 'phc',
      nameAr: 'مركز رعاية صحية أولية',
      nameEn: 'Primary Health Care Center',
      icon: 'health_and_safety',
      sortOrder: 7,
      canHaveChildren: false,
      allowedChildTypes: [],
      autoCreateRole: 'hospital_administrator',
    },
    {
      code: 'training_center',
      nameAr: 'مركز تدريب مستقل',
      nameEn: 'Training Center',
      icon: 'psychology',
      sortOrder: 8,
      canHaveChildren: true,
      allowedChildTypes: ['department'],
      autoCreateRole: 'training_director',
    },
    {
      code: 'department',
      nameAr: 'قسم ألماني / سريري',
      nameEn: 'Department',
      icon: 'corporate_fare',
      sortOrder: 9,
      canHaveChildren: false,
      allowedChildTypes: [],
      autoCreateRole: 'department_head',
    },
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
  // 2. ROLES (الأدوار الـ 13)
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
    { code: 'department_head', nameAr: 'رئيس القسم / مشرف التخصص', nameEn: 'Department Head', hierarchyLevel: 50, isSystem: true },
    { code: 'trainer', nameAr: 'مدرب / استشاري', nameEn: 'Trainer / Consultant', hierarchyLevel: 40, isSystem: true },
    { code: 'trainee', nameAr: 'متدرب (طبيب امتياز/مقيم/طالب)', nameEn: 'Trainee', hierarchyLevel: 10, isSystem: true },
    { code: 'auditor', nameAr: 'مدقق ومراجع الجودة', nameEn: 'Auditor', hierarchyLevel: 50, isSystem: true },
    { code: 'reviewer', nameAr: 'مراجع طلبات معتمد', nameEn: 'Reviewer', hierarchyLevel: 50, isSystem: true },
    { code: 'external_system', nameAr: 'نظام خارجي مرتبط', nameEn: 'External Integrated System', hierarchyLevel: 10, isSystem: true },
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

  // --------------------------------------------------------------------------
  // 3. PERMISSIONS (الصلاحيات الـ 19+)
  // --------------------------------------------------------------------------
  console.log('🔑 Seeding Permissions...');

  const permissions = [
    { code: 'view_organizations', nameAr: 'عرض الجهات', nameEn: 'View Organizations', module: 'organizations' },
    { code: 'manage_organizations', nameAr: 'إدارة الجهات والمعالج الآلي', nameEn: 'Manage Organizations', module: 'organizations' },
    { code: 'view_users', nameAr: 'عرض المستخدمين', nameEn: 'View Users', module: 'users' },
    { code: 'manage_users', nameAr: 'إدارة المستخدمين والحسابات', nameEn: 'Manage Users', module: 'users' },
    { code: 'manage_roles', nameAr: 'إدارة الأدوار والصلاحيات والسياسات', nameEn: 'Manage Roles & Policies', module: 'rbac' },
    { code: 'view_trainees', nameAr: 'عرض المتدربين والدفعات', nameEn: 'View Trainees', module: 'training' },
    { code: 'manage_trainees', nameAr: 'إدارة المتدربين والبطاقات', nameEn: 'Manage Trainees', module: 'training' },
    { code: 'view_rotations', nameAr: 'عرض الروتيشنات والجدول', nameEn: 'View Rotations', module: 'training' },
    { code: 'manage_rotations', nameAr: 'إدارة وتوزيع الروتيشنات', nameEn: 'Manage Rotations', module: 'training' },
    { code: 'launch_call', nameAr: 'إطلاق ندائات المدربين', nameEn: 'Launch Call', module: 'calls' },
    { code: 'respond_call', nameAr: 'استجابة وتأكيد النداءات', nameEn: 'Respond Call', module: 'calls' },
    { code: 'submit_evaluation', nameAr: 'تقديم التقييمات', nameEn: 'Submit Evaluation', module: 'evaluations' },
    { code: 'view_evaluations', nameAr: 'عرض التقييمات ومؤشر الانضباط', nameEn: 'View Evaluations', module: 'evaluations' },
    { code: 'manage_documents', nameAr: 'إدارة وتدقيق المستندات', nameEn: 'Manage Documents', module: 'documents' },
    { code: 'view_reports', nameAr: 'عرض وتوليد التقارير', nameEn: 'View Reports', module: 'reports' },
    { code: 'view_audit_logs', nameAr: 'عرض سجلات التدقيق', nameEn: 'View Audit Logs', module: 'audit' },
  ];

  for (const p of permissions) {
    await prisma.permission.upsert({
      where: { code: p.code },
      create: p,
      update: p,
    });
  }

  // --------------------------------------------------------------------------
  // 4. PLATFORM OWNER BOOTSTRAP (مدير المنصة الأول)
  // --------------------------------------------------------------------------
  console.log('👤 Bootstrapping Platform Owner...');

  const rootPerson = await prisma.person.upsert({
    where: { nationalId: '1000000000' },
    create: {
      nationalId: '1000000000',
      nameAr: 'مدير المنصة الوطنية',
      nameEn: 'Platform Owner Admin',
      email: 'admin@miran.health',
      phone: '+966500000000',
    },
    update: {},
  });

  const rootPasswordHash = await bcrypt.hash('Miran@Admin2024!', 10);
  const rootAccount = await prisma.userAccount.upsert({
    where: { email: 'admin@miran.health' },
    create: {
      personId: rootPerson.id,
      email: 'admin@miran.health',
      username: 'admin',
      passwordHash: rootPasswordHash,
      isEmailVerified: true,
      isActive: true,
    },
    update: {},
  });

  // --------------------------------------------------------------------------
  // 5. DEMO DATA: HEALTH HOLDING + NORTHERN BORDERS CLUSTER
  // --------------------------------------------------------------------------
  console.log('🏰 Creating Northern Borders Cluster Demo Data...');

  // Top Level: Health Holding Company (الصحة القابضة)
  const holdingOrg = await prisma.organization.upsert({
    where: { code: 'HEALTH-HOLDING' },
    create: {
      organizationTypeId: createdTypes['holding'],
      code: 'HEALTH-HOLDING',
      nameAr: 'شركة الصحة القابضة',
      nameEn: 'Health Holding Company',
      status: 'active',
      cityAr: 'الرياض',
      cityEn: 'Riyadh',
      regionAr: 'الرياض',
      regionEn: 'Riyadh',
      contactEmail: 'info@healthholding.sa',
    },
    update: {},
  });

  // Child: Northern Borders Health Cluster (تجمع الحدود الشمالية الصحي)
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
      cityEn: 'Arar',
      regionAr: 'الحدود الشمالية',
      regionEn: 'Northern Borders',
      contactEmail: 'info@nbhc.health.sa',
    },
    update: {},
  });

  // Child Hospital 1: Prince Abdulaziz bin Musaed Hospital
  const hosp1 = await prisma.organization.upsert({
    where: { code: 'HOSP-PABMH' },
    create: {
      organizationTypeId: createdTypes['hospital'],
      parentId: clusterOrg.id,
      code: 'HOSP-PABMH',
      nameAr: 'مستشفى الأمير عبدالعزيز بن مساعد',
      nameEn: 'Prince Abdulaziz bin Musaed Hospital',
      status: 'active',
      cityAr: 'عرعر',
      cityEn: 'Arar',
      regionAr: 'الحدود الشمالية',
    },
    update: {},
  });

  // Child Hospital 2: Arar Central Hospital
  const hosp2 = await prisma.organization.upsert({
    where: { code: 'HOSP-ACH' },
    create: {
      organizationTypeId: createdTypes['hospital'],
      parentId: clusterOrg.id,
      code: 'HOSP-ACH',
      nameAr: 'مستشفى عرعر المركزي',
      nameEn: 'Arar Central Hospital',
      status: 'active',
      cityAr: 'عرعر',
      cityEn: 'Arar',
      regionAr: 'الحدود الشمالية',
    },
    update: {},
  });

  // University: Northern Borders University (جامعة الحدود الشمالية)
  const uniOrg = await prisma.organization.upsert({
    where: { code: 'NBU-UNIVERSITY' },
    create: {
      organizationTypeId: createdTypes['university'],
      code: 'NBU-UNIVERSITY',
      nameAr: 'جامعة الحدود الشمالية',
      nameEn: 'Northern Borders University',
      status: 'active',
      cityAr: 'عرعر',
      cityEn: 'Arar',
      regionAr: 'الحدود الشمالية',
      contactEmail: 'info@nbu.edu.sa',
    },
    update: {},
  });

  // Link Root User to Holding Org as platform_owner
  await prisma.userOrganization.upsert({
    where: {
      userAccountId_organizationId: {
        userAccountId: rootAccount.id,
        organizationId: holdingOrg.id,
      },
    },
    create: {
      userAccountId: rootAccount.id,
      organizationId: holdingOrg.id,
      isPrimary: true,
    },
    update: {},
  });

  await prisma.userRole.upsert({
    where: {
      userAccountId_roleId_organizationId: {
        userAccountId: rootAccount.id,
        roleId: createdRoles['platform_owner'],
        organizationId: holdingOrg.id,
      },
    },
    create: {
      userAccountId: rootAccount.id,
      roleId: createdRoles['platform_owner'],
      organizationId: holdingOrg.id,
    },
    update: {},
  });

  // Create Training Agreement (Affiliation) between NBU and Cluster
  await prisma.organizationAffiliation.upsert({
    where: {
      sourceOrgId_targetOrgId_affiliationType: {
        sourceOrgId: uniOrg.id,
        targetOrgId: clusterOrg.id,
        affiliationType: 'training_agreement',
      },
    },
    create: {
      sourceOrgId: uniOrg.id,
      targetOrgId: clusterOrg.id,
      affiliationType: 'training_agreement',
      nameAr: 'اتفاقية تدريب طلاب الكليات الصحية بجميع مستشفيات التجمع',
      agreementRef: 'MOU-NBU-NBHC-2024',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2028-12-31'),
      status: 'active',
    },
    update: {},
  });

  console.log('✅ Seed completed successfully!');
  console.log('---------------------------------------------------------');
  console.log('👑 Platform Owner Admin Credentials:');
  console.log('   Email: admin@miran.health');
  console.log('   Password: Miran@Admin2024!');
  console.log('   Active Organization: شركة الصحة القابضة (HEALTH-HOLDING)');
  console.log('---------------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
