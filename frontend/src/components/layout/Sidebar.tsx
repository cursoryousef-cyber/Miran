import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Building2,
  Users,
  GraduationCap,
  GitMerge,
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
  AlertTriangle,
  CheckSquare,
} from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: any;
}

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

const universityNav: NavItem[] = [
  { name: 'لوحة الجامعة', path: '/', icon: GraduationCap },
  { name: 'البرامج والدفعات الأكاديمية', path: '/intakes', icon: ClipboardList },
  { name: 'طلبات التدريب للتجمعات', path: '/affiliations', icon: FolderGit2 },
  { name: 'تصحيحات المتدربين المُعادة', path: '/corrections', icon: RotateCcw },
  { name: 'أعضاء الجامعة والطلاب', path: '/org-members', icon: Users },
];

const clusterNav: NavItem[] = [
  { name: 'لوحة التجمع الصحي', path: '/', icon: Network },
  { name: 'طلبات التدريب الواردة', path: '/affiliations', icon: FolderGit2 },
  { name: 'متدربو الامتياز الواردون (Excel)', path: '/cluster-trainees', icon: FileSpreadsheet },
  { name: 'المستشفيات والسعة', path: '/organizations', icon: Building2 },
  { name: 'توزيع المتدربين', path: '/intakes', icon: GraduationCap },
];

const hospitalNav: NavItem[] = [
  { name: 'لوحة المستشفى', path: '/', icon: Stethoscope },
  { name: 'مساحة عمل المستشفى', path: '/hospital', icon: BedDouble },
  { name: 'الروتيشنات والأقسام', path: '/intakes', icon: ClipboardList },
  { name: 'المتدربون والمدربون', path: '/org-members', icon: UserCog },
];

const trainerNav: NavItem[] = [
  { name: 'لوحة المدرب', path: '/', icon: Stethoscope },
  { name: 'سلسلة القبول', path: '/acceptance-chain', icon: CheckSquare },
  { name: 'متدربيّ المسندين', path: '/org-members', icon: UserCog },
  { name: 'Logbook والتقييمات', path: '/logbook', icon: BookOpen },
  { name: 'البلاغات والحوادث', path: '/incidents', icon: AlertTriangle },
  { name: 'إدارة التخرج', path: '/graduation', icon: GraduationCap },
];

const traineeNav: NavItem[] = [
  { name: 'لوحة طبيب الامتياز', path: '/', icon: LayoutDashboard },
  { name: 'السجل السريري (Logbook)', path: '/logbook', icon: BookOpen },
  { name: 'الإقرارات والبطاقة الرقمية', path: '/declarations', icon: FileSignature },
  { name: 'البلاغات والحوادث', path: '/incidents', icon: AlertTriangle },
];

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

export const SidebarContent: React.FC<{ onItemClick?: () => void }> = ({ onItemClick }) => {
  const { user, primaryRole } = useAuth();
  const navItems = getNavForRole(primaryRole);

  return (
    <div style={{
      width: '280px',
      backgroundColor: '#FFFFFF',
      borderLeft: '1px solid #E2E8F0',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: '100vh',
      padding: '24px 16px',
    }}>
      {/* Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 8px 20px 8px', borderBottom: '1px solid #F1F5F9' }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(15, 118, 110, 0.25)',
        }}>
          <span style={{ fontWeight: 900, fontSize: '20px', color: '#fff' }}>مِ</span>
        </div>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0, lineHeight: 1.2 }}>مِران (Miran)</h1>
          <span style={{ fontSize: '11px', color: '#0F766E', fontWeight: 700 }}>منصة التدريب الصحي الوطنية</span>
        </div>
      </div>

      {/* Role Badge */}
      <div style={{
        margin: '16px 4px 12px 4px',
        padding: '12px 14px',
        backgroundColor: '#F0FDF4',
        borderRadius: '12px',
        border: '1px solid #DCFCE7',
      }}>
        <div style={{ fontSize: '11px', color: '#166534', fontWeight: 600, marginBottom: '2px' }}>الدور الحالي</div>
        <div style={{ fontSize: '13px', color: '#0F766E', fontWeight: 800 }}>{getRoleLabelAr(primaryRole)}</div>
        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user?.activeOrganization?.nameAr}
        </div>
      </div>

      {/* Navigation Menu */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px', flex: 1 }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path + item.name}
              to={item.path}
              end={item.path === '/'}
              onClick={onItemClick}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: '12px',
                color: isActive ? '#0F766E' : '#475569',
                backgroundColor: isActive ? '#F0FDF4' : 'transparent',
                border: isActive ? '1px solid #CCFBF1' : '1px solid transparent',
                textDecoration: 'none',
                fontSize: '13.5px',
                fontWeight: isActive ? 700 : 600,
                transition: 'all 0.15s ease',
              })}
            >
              <Icon size={18} style={{ color: '#0F766E' }} />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

export const Sidebar: React.FC = () => {
  return <SidebarContent />;
};
