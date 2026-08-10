import {
  Award, GraduationCap, LayoutDashboard, Network, Stethoscope, UserCog, Users,
  Building2, ClipboardList, FolderGit2, FileSpreadsheet, RotateCcw, BedDouble,
  CheckSquare, BookOpen, AlertTriangle, Shield, Key, Activity, GitMerge, Settings,
  FileSignature, BellRing, UsersRound, Route, PhoneCall, Inbox, Send,
} from 'lucide-react';

/**
 * Role identity.
 *
 * Each role gets its own accent, label, landing route and grouped navigation, so
 * the console reads as a different product per role rather than one shell with
 * different numbers in it. The accent drives the sidebar, the page eyebrow and
 * the role badge — enough signal to tell who is logged in from the chrome alone.
 */

export interface NavItem {
  name: string;
  path: string;
  icon: any;
  /**
   * Capabilities that make this destination usable. The item renders only when
   * the session holds at least one of them, so the menu reflects what the API
   * will actually allow rather than a role name that may or may not still map to
   * that authority. Omitted means "available to anyone who reached this nav".
   */
  requires?: string[];
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export interface RoleIdentity {
  key: string;
  /** Arabic role label shown in the sidebar identity block. */
  label: string;
  /** Latin eyebrow used on page headers. */
  eyebrow: string;
  /** One-line description of the role's remit. */
  tagline: string;
  icon: any;
  accent: string;
  accentSoft: string;
  /** Where "home" goes for this role. */
  landing: string;
  nav: NavSection[];
}

const PLATFORM_NAV: NavSection[] = [
  {
    title: 'الحوكمة الوطنية',
    items: [
      { name: 'مركز التحكم الوطني', path: '/', icon: LayoutDashboard },
      { name: 'الجهات والتجمعات', path: '/organizations', icon: Building2 },
    ],
  },
  {
    title: 'الهوية والصلاحيات',
    items: [
      { name: 'المستخدمون والحسابات', path: '/users', icon: Users },
      { name: 'الأدوار والصلاحيات', path: '/roles-management', icon: Key },
      { name: 'سجلات التدقيق', path: '/audit-logs', icon: Shield },
    ],
  },
  {
    title: 'تشغيل المنصة',
    items: [
      { name: 'سلامة الخدمات', path: '/health-monitor', icon: Activity },
      { name: 'محرك سير العمل', path: '/workflows', icon: GitMerge },
      { name: 'السياسات', path: '/policies', icon: FileSignature },
      { name: 'التكاملات', path: '/integrations', icon: GitMerge },
      { name: 'الإعدادات', path: '/settings', icon: Settings },
    ],
  },
];

/**
 * Cluster training management.
 *
 * The three stages are now three destinations, in workflow order. Previously
 * "توزيع المتدربين" pointed at /intakes — the academic-batches screen, which also
 * carried a "send a new training request" button — so the distribution stage, the
 * batch stage and request creation were one page wearing three names.
 */
const CLUSTER_NAV: NavSection[] = [
  {
    title: 'دورة التدريب',
    items: [
      { name: 'لوحة التجمع', path: '/', icon: Network },
      {
        name: 'الطلبات الواردة', path: '/affiliations?tab=incoming', icon: FolderGit2,
        requires: ['training_request.review'],
      },
      {
        name: 'الطلبات المرسلة للمستشفيات', path: '/affiliations?tab=sent', icon: Send,
        requires: ['training_request.review'],
      },
      {
        name: 'الدفعات الأكاديمية', path: '/intakes', icon: ClipboardList,
        requires: ['academic_batch.manage'],
      },
      {
        name: 'توزيع المتدربين', path: '/cluster-trainees', icon: GraduationCap,
        requires: ['allocation.cluster.auto', 'allocation.cluster.manual'],
      },
    ],
  },
  {
    title: 'الشبكة والسعة',
    items: [
      { name: 'المستشفيات والسعة', path: '/organizations', icon: Building2, requires: ['capacity.view'] },
    ],
  },
  {
    title: 'المتابعة',
    items: [
      { name: 'البلاغات والحوادث', path: '/incidents', icon: AlertTriangle, requires: ['incident.view'] },
      { name: 'التقارير', path: '/reports', icon: FileSpreadsheet, requires: ['report.view'] },
    ],
  },
];

/**
 * Hospital TRAINING management — the operational owner of training inside the
 * hospital: departments, capacity, trainers, and the trainees allocated to it.
 */
const HOSPITAL_TRAINING_NAV: NavSection[] = [
  {
    title: 'العمليات التدريبية',
    items: [
      { name: 'لوحة التدريب بالمستشفى', path: '/', icon: Stethoscope },
      { name: 'مساحة عمل المستشفى', path: '/hospital', icon: BedDouble, requires: ['training.operate'] },
    ],
  },
  {
    title: 'الأقسام والطاقة الاستيعابية',
    items: [
      {
        name: 'الأقسام والسعة', path: '/hospital?tab=capacity', icon: ClipboardList,
        requires: ['capacity.manage'],
      },
      {
        name: 'بطاقات المدربين', path: '/hospital?tab=trainers', icon: UsersRound,
        requires: ['trainer.manage'],
      },
    ],
  },
  {
    title: 'المتدربون',
    items: [
      {
        name: 'طلبات التدريب الواردة', path: '/hospital?tab=requests', icon: Inbox,
        requires: ['trainee.view.hospital'],
      },
      { name: 'البلاغات', path: '/incidents', icon: AlertTriangle, requires: ['incident.view'] },
    ],
  },
];

/**
 * Hospital GENERAL administration — deliberately carries no training destination.
 * The hospital director administers the hospital; training is run by the hospital
 * training administration and appears in its console, not this one.
 */
const HOSPITAL_ADMIN_NAV: NavSection[] = [
  {
    title: 'إدارة المستشفى',
    items: [
      { name: 'لوحة المستشفى', path: '/', icon: Stethoscope },
      { name: 'أعضاء الجهة', path: '/org-members', icon: UsersRound, requires: ['org_member.view'] },
    ],
  },
  {
    title: 'المتابعة',
    items: [
      { name: 'البلاغات والحوادث', path: '/incidents', icon: AlertTriangle, requires: ['incident.view'] },
      { name: 'التقارير', path: '/reports', icon: FileSpreadsheet, requires: ['report.view'] },
    ],
  },
];

/** Department head — their own department, nothing wider. */
const DEPARTMENT_NAV: NavSection[] = [
  {
    title: 'نطاق القسم',
    items: [
      { name: 'لوحة القسم', path: '/', icon: Stethoscope },
      {
        name: 'متدربو القسم', path: '/org-members', icon: UsersRound,
        requires: ['trainee.view.department'],
      },
      { name: 'السجل السريري', path: '/logbook', icon: BookOpen, requires: ['logbook.view'] },
      { name: 'البلاغات', path: '/incidents', icon: AlertTriangle, requires: ['incident.view'] },
    ],
  },
];

const SUPERVISOR_NAV: NavSection[] = [
  {
    title: 'الإشراف التدريبي',
    items: [
      { name: 'لوحة الإشراف', path: '/', icon: CheckSquare },
      { name: 'مساحة عمل المستشفى', path: '/hospital', icon: BedDouble },
      { name: 'سلسلة القبول', path: '/acceptance-chain', icon: CheckSquare },
    ],
  },
  {
    title: 'المتابعة',
    items: [
      { name: 'السجل السريري', path: '/logbook', icon: BookOpen },
      { name: 'المتدربون والمدربون', path: '/org-members', icon: UsersRound },
      { name: 'البلاغات', path: '/incidents', icon: AlertTriangle },
    ],
  },
];

const UNIVERSITY_NAV: NavSection[] = [
  {
    title: 'الإيفاد',
    items: [
      { name: 'لوحة الجامعة', path: '/', icon: GraduationCap },
      {
        name: 'طلبات التدريب', path: '/affiliations', icon: FolderGit2,
        requires: ['training_request.create', 'training_request.view'],
      },
      { name: 'الدفعات الأكاديمية', path: '/intakes', icon: ClipboardList },
    ],
  },
  {
    title: 'المتابعة',
    items: [
      { name: 'التصحيحات المُعادة', path: '/corrections', icon: RotateCcw },
      { name: 'أعضاء الجامعة', path: '/org-members', icon: UsersRound },
    ],
  },
];

const ACADEMIC_NAV: NavSection[] = [
  {
    title: 'الاعتماد الأكاديمي',
    items: [
      { name: 'لوحة الإشراف الأكاديمي', path: '/', icon: Award },
      { name: 'إدارة التخرج', path: '/graduation', icon: GraduationCap },
      { name: 'السجل السريري', path: '/logbook', icon: BookOpen },
    ],
  },
  {
    title: 'التقارير',
    items: [
      { name: 'التقارير والنتائج', path: '/reports', icon: FileSpreadsheet },
      { name: 'الدفعات الأكاديمية', path: '/intakes', icon: ClipboardList },
    ],
  },
];

const TRAINER_NAV: NavSection[] = [
  {
    title: 'يومي',
    items: [
      { name: 'لوحة المدرب', path: '/', icon: UserCog },
      { name: 'متدربيّ', path: '/org-members', icon: UsersRound },
      { name: 'سلسلة القبول', path: '/acceptance-chain', icon: CheckSquare },
      { name: 'النداءات والإشعارات', path: '/notifications', icon: BellRing },
    ],
  },
  {
    title: 'التوثيق',
    items: [
      { name: 'السجل السريري', path: '/logbook', icon: BookOpen },
      { name: 'البلاغات', path: '/incidents', icon: AlertTriangle },
    ],
  },
];

const TRAINEE_NAV: NavSection[] = [
  {
    title: 'رحلتي التدريبية',
    items: [
      { name: 'لوحتي', path: '/', icon: Route },
      { name: 'السجل السريري', path: '/logbook', icon: BookOpen },
      { name: 'النداءات والإشعارات', path: '/notifications', icon: BellRing },
    ],
  },
  {
    title: 'مستنداتي',
    items: [
      { name: 'الإقرارات والبطاقة', path: '/declarations', icon: FileSignature },
      { name: 'البلاغات', path: '/incidents', icon: BellRing },
    ],
  },
];

const IDENTITIES: Record<string, RoleIdentity> = {
  platform: {
    key: 'platform', label: 'مدير المنصة الإلكترونية', eyebrow: 'NATIONAL CONTROL CENTRE',
    tagline: 'حوكمة الجهات والتجمعات على مستوى المملكة',
    icon: LayoutDashboard, accent: '#0F766E', accentSoft: '#F0FDFA',
    landing: '/', nav: PLATFORM_NAV,
  },
  cluster: {
    key: 'cluster', label: 'إدارة التجمع الصحي', eyebrow: 'CLUSTER ADMINISTRATION',
    tagline: 'توزيع المتدربين ومتابعة السعة عبر المستشفيات',
    icon: Network, accent: '#0284C7', accentSoft: '#F0F9FF',
    landing: '/', nav: CLUSTER_NAV,
  },
  // Two distinct consoles, not one console with a different label. The training
  // administration runs training; the hospital director administers the hospital.
  hospitalTraining: {
    key: 'hospitalTraining', label: 'إدارة التدريب بالمستشفى',
    eyebrow: 'HOSPITAL TRAINING MANAGEMENT',
    tagline: 'الأقسام والسعة والمدربون والمتدربون المسندون للمستشفى',
    icon: Stethoscope, accent: '#7C3AED', accentSoft: '#F5F3FF',
    landing: '/', nav: HOSPITAL_TRAINING_NAV,
  },
  hospitalAdmin: {
    key: 'hospitalAdmin', label: 'إدارة المستشفى', eyebrow: 'HOSPITAL ADMINISTRATION',
    tagline: 'الإدارة العامة للمستشفى — خارج دورة التدريب',
    icon: Building2, accent: '#475569', accentSoft: '#F8FAFC',
    landing: '/', nav: HOSPITAL_ADMIN_NAV,
  },
  department: {
    key: 'department', label: 'رئيس القسم', eyebrow: 'DEPARTMENT SCOPE',
    tagline: 'متدربو ومدربو القسم ضمن نطاقه',
    icon: ClipboardList, accent: '#7C3AED', accentSoft: '#F5F3FF',
    landing: '/', nav: DEPARTMENT_NAV,
  },
  supervisor: {
    key: 'supervisor', label: 'مشرف التدريب', eyebrow: 'TRAINING SUPERVISION',
    tagline: 'متابعة المتدربين وسلسلة القبول والتقييمات',
    icon: CheckSquare, accent: '#0891B2', accentSoft: '#ECFEFF',
    landing: '/', nav: SUPERVISOR_NAV,
  },
  university: {
    key: 'university', label: 'منسق الجامعة', eyebrow: 'UNIVERSITY SPONSOR',
    tagline: 'إيفاد المتدربين ومتابعة مسارهم التدريبي',
    icon: GraduationCap, accent: '#B45309', accentSoft: '#FFFBEB',
    landing: '/', nav: UNIVERSITY_NAV,
  },
  academic: {
    key: 'academic', label: 'المشرف الأكاديمي', eyebrow: 'ACADEMIC SUPERVISION',
    tagline: 'مراجعة واعتماد نتائج البرامج التدريبية',
    icon: Award, accent: '#9333EA', accentSoft: '#FAF5FF',
    landing: '/', nav: ACADEMIC_NAV,
  },
  trainer: {
    key: 'trainer', label: 'مدرب سريري', eyebrow: 'CLINICAL TRAINER',
    tagline: 'متابعة المتدربين المسندين وتوثيق التدريب',
    icon: UserCog, accent: '#059669', accentSoft: '#ECFDF5',
    landing: '/', nav: TRAINER_NAV,
  },
  trainee: {
    key: 'trainee', label: 'طبيب امتياز', eyebrow: 'MY TRAINING JOURNEY',
    tagline: 'رحلتك التدريبية وتقدمك نحو التخرج',
    icon: Route, accent: '#0D9488', accentSoft: '#F0FDFA',
    landing: '/', nav: TRAINEE_NAV,
  },
};

/** Maps a backend role code onto its console identity. */
export function roleIdentity(role?: string | null): RoleIdentity {
  switch (role) {
    case 'platform_owner':
    case 'system_admin':
    case 'holding_administrator':
    case 'org_manager':
      return IDENTITIES.platform;
    case 'cluster_administrator':
    case 'cluster_manager':
    case 'training_director':
      return IDENTITIES.cluster;
    case 'hospital_training_admin':
    case 'hospital_administrator':
    case 'hospitalAdmin':
      return IDENTITIES.hospitalTraining;
    case 'department_head':
      return IDENTITIES.department;
    case 'training_supervisor':
      return IDENTITIES.supervisor;
    case 'university_administrator':
    case 'academic_affairs':
      return IDENTITIES.university;
    case 'academic_supervisor':
      return IDENTITIES.academic;
    case 'trainer':
      return IDENTITIES.trainer;
    case 'trainee':
      return IDENTITIES.trainee;
    default:
      return IDENTITIES.trainee;
  }
}

export { PhoneCall, Users };
