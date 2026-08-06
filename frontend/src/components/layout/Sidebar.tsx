import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Building2,
  Users,
  GraduationCap,
  GitMerge,
  ShieldCheck,
  FileSpreadsheet,
  Settings,
  FolderGit2,
  Activity,
  Shield,
  Key,
  BookOpen,
  Award,
  UserCog,
  Stethoscope,
  ClipboardList,
  FileSignature,
  Network,
  RotateCcw,
  BedDouble,
} from 'lucide-react';

// ─── Navigation definitions per role ───────────────────────────────────────
interface NavItem {
  name: string;
  path: string;
  icon: any;
}

// Platform Owner / System Admin / Holding Admin
const platformNav: NavItem[] = [
  { name: 'مركز التحكم الوطني', path: '/', icon: LayoutDashboard },
  { name: 'الجهات والتجمعات الصحية', path: '/organizations', icon: Building2 },
  { name: 'إدارة المستخدمين والحسابات', path: '/users', icon: Users },
  { name: 'الأدوار والصلاحيات (RBAC)', path: '/roles-management', icon: Key },
  { name: 'سجلات التدقيق الأمني', path: '/audit-logs', icon: Shield },
  { name: 'مراقبة سلامة الخدمات', path: '/health-monitor', icon: Activity },
  { name: 'محرك سير العمل', path: '/workflows', icon: GitMerge },
  { name: 'إعدادات المنصة', path: '/settings', icon: Settings },
];

// University Admin
const universityNav: NavItem[] = [
  { name: 'لوحة الجامعة', path: '/', icon: GraduationCap },
  { name: 'البرامج والدفعات الأكاديمية', path: '/intakes', icon: ClipboardList },
  { name: 'طلبات التدريب للتجمعات', path: '/affiliations', icon: FolderGit2 },
  { name: 'تصحيحات المتدربين المُعادة', path: '/corrections', icon: RotateCcw },
  { name: 'أعضاء الجامعة والطلاب', path: '/org-members', icon: Users },
];

// Cluster Training Admin
const clusterNav: NavItem[] = [
  { name: 'لوحة التجمع الصحي', path: '/', icon: Network },
  { name: 'طلبات التدريب الواردة', path: '/affiliations', icon: FolderGit2 },
  { name: 'متدربو الامتياز الواردون (Excel)', path: '/cluster-trainees', icon: FileSpreadsheet },
  { name: 'المستشفيات والسعة', path: '/organizations', icon: Building2 },
  { name: 'توزيع المتدربين', path: '/intakes', icon: GraduationCap },
];

// Hospital Supervisor / Director
const hospitalNav: NavItem[] = [
  { name: 'لوحة المستشفى', path: '/', icon: Stethoscope },
  { name: 'الطاقة الاستيعابية', path: '/hospital-capacity', icon: BedDouble },
  { name: 'الروتيشنات والأقسام', path: '/intakes', icon: ClipboardList },
  { name: 'المتدربون والمدربون', path: '/org-members', icon: UserCog },
  { name: 'السجل السريري (Logbook)', path: '/logbook', icon: BookOpen },
];

// Trainer
const trainerNav: NavItem[] = [
  { name: 'لوحة المدرب', path: '/', icon: Stethoscope },
  { name: 'متدربيّ المسندين', path: '/org-members', icon: UserCog },
  { name: 'Logbook والتقييمات', path: '/logbook', icon: BookOpen },
];

// Trainee
const traineeNav: NavItem[] = [
  { name: 'لوحة طبيب الامتياز', path: '/', icon: LayoutDashboard },
  { name: 'السجل السريري (Logbook)', path: '/logbook', icon: BookOpen },
  { name: 'الإقرارات والبطاقة الرقمية', path: '/declarations', icon: FileSignature },
];

// Academic Supervisor
const academicNav: NavItem[] = [
  { name: 'لوحة الاعتماد الأكاديمي', path: '/', icon: Award },
  { name: 'اعتماد النتائج النهائية', path: '/reports', icon: FileSpreadsheet },
  { name: 'متابعة البرامج المكتملة', path: '/intakes', icon: ClipboardList },
];

function getNavForRole(role: string): NavItem[] {
  switch (role) {
    case 'platform_owner':
    case 'system_admin':
    case 'holding_administrator':
      return platformNav;
    case 'university_administrator':
    case 'academic_affairs':
      return universityNav;
    case 'cluster_administrator':
    case 'training_director':
      return clusterNav;
    case 'hospital_administrator':
    case 'department_head':
    case 'training_supervisor':
      return hospitalNav;
    case 'trainer':
      return trainerNav;
    case 'trainee':
      return traineeNav;
    case 'academic_supervisor':
      return academicNav;
    default:
      return traineeNav;
  }
}

function getRoleLabelAr(role: string): string {
  const map: Record<string, string> = {
    platform_owner: 'مدير المنصة الوطنية',
    system_admin: 'مدير النظام',
    holding_administrator: 'مدير الصحة القابضة',
    cluster_administrator: 'مدير التجمع الصحي',
    university_administrator: 'مدير الجامعة',
    hospital_administrator: 'مشرف المستشفى',
    training_director: 'مدير التدريب',
    department_head: 'رئيس القسم',
    academic_supervisor: 'مشرف أكاديمي',
    training_supervisor: 'مشرف تدريب ميداني',
    trainer: 'مدرب سريري',
    trainee: 'طبيب امتياز',
    academic_affairs: 'الشؤون الأكاديمية',
    org_manager: 'مدير جهة',
  };
  return map[role] || role;
}

export const Sidebar: React.FC = () => {
  const { user, primaryRole } = useAuth();
  const navItems = getNavForRole(primaryRole);

  return (
    <aside style={{
      width: '280px',
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      backdropFilter: 'blur(16px)',
      borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      padding: '24px 16px',
    }}>
      {/* Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 12px 20px 12px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #059669 0%, #06b6d4 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(5, 150, 105, 0.3)',
        }}>
          <span style={{ fontWeight: 900, fontSize: '22px', color: '#fff' }}>مِ</span>
        </div>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#f8fafc', margin: 0, lineHeight: 1.2 }}>مِران (Miran)</h1>
          <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600, letterSpacing: '0.5px' }}>منصة التدريب الصحي الوطنية</span>
        </div>
      </div>

      {/* Role Badge */}
      <div style={{
        margin: '16px 12px 8px 12px',
        padding: '10px 14px',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 182, 212, 0.1))',
        borderRadius: '10px',
        border: '1px solid rgba(16, 185, 129, 0.25)',
      }}>
        <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, marginBottom: '2px' }}>الدور الحالي</div>
        <div style={{ fontSize: '13px', color: '#34d399', fontWeight: 700 }}>{getRoleLabelAr(primaryRole)}</div>
        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{user?.activeOrganization?.nameAr}</div>
      </div>

      {/* Navigation Menu */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '16px' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path + item.name}
              to={item.path}
              end={item.path === '/'}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                borderRadius: '10px',
                color: isActive ? '#fff' : '#94a3b8',
                backgroundColor: isActive ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                border: isActive ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: isActive ? 700 : 500,
                transition: 'all 0.2s ease',
              })}
            >
              <Icon size={18} style={{ color: '#10b981' }} />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};
