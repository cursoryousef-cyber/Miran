import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  UserCog,
  GraduationCap,
  GitMerge,
  ShieldCheck,
  Zap,
  FileSpreadsheet,
  Settings,
  FolderGit2,
  FileSignature,
  Activity,
  Shield,
  Key,
  BookOpen,
  Award
} from 'lucide-react';

interface NavigationItem {
  name: string;
  path: string;
  icon: any;
  allowedRoles: string[];
}

const navigationItems: NavigationItem[] = [
  // 1. Platform Owner / System Admin Central Navigation
  { name: 'مركز التحكم الوطني (Control Center)', path: '/', icon: LayoutDashboard, allowedRoles: ['platform_owner', 'system_admin'] },
  { name: 'الجهات والتجمعات الصحية', path: '/organizations', icon: Building2, allowedRoles: ['platform_owner', 'system_admin', 'cluster_manager', 'org_manager'] },
  { name: 'إدارة الأشخاص والحسابات', path: '/users', icon: Users, allowedRoles: ['platform_owner', 'system_admin'] },
  { name: 'إدارة الأدوار والصلاحيات (RBAC)', path: '/roles-management', icon: Key, allowedRoles: ['platform_owner', 'system_admin'] },
  { name: 'سجلات التدقيق والرقابة (Audit)', path: '/audit-logs', icon: Shield, allowedRoles: ['platform_owner', 'system_admin'] },
  { name: 'مراقبة سلامة الخدمات (Health)', path: '/health-monitor', icon: Activity, allowedRoles: ['platform_owner', 'system_admin'] },
  { name: 'محرك سير العمل (Workflows)', path: '/workflows', icon: GitMerge, allowedRoles: ['platform_owner', 'system_admin'] },
  { name: 'سياسات الوصول والترخيص', path: '/settings', icon: Settings, allowedRoles: ['platform_owner', 'system_admin'] },

  // 2. University Navigation
  { name: 'لوحة الجامعة والبرامج', path: '/', icon: GraduationCap, allowedRoles: ['university_admin'] },
  { name: 'رفع خطط طلاب الامتياز', path: '/intakes', icon: GraduationCap, allowedRoles: ['university_admin', 'org_manager'] },
  { name: 'تقديم طلبات التدريب للتجمع', path: '/affiliations', icon: FolderGit2, allowedRoles: ['university_admin', 'org_manager'] },

  // 3. Cluster Training Admin Navigation
  { name: 'لوحة التدريب بالتجمع', path: '/', icon: LayoutDashboard, allowedRoles: ['cluster_manager', 'training_manager'] },
  { name: 'طلبات التدريب الواردة', path: '/affiliations', icon: FolderGit2, allowedRoles: ['cluster_manager', 'training_manager'] },
  { name: 'توزيع الطلاب على المستشفيات', path: '/organizations', icon: Building2, allowedRoles: ['cluster_manager', 'training_manager'] },

  // 4. Hospital Supervisor Navigation
  { name: 'لوحة مشرف امتياز المستشفى', path: '/', icon: LayoutDashboard, allowedRoles: ['hospital_supervisor', 'training_supervisor'] },
  { name: 'طلاب المستشفى والأقسام', path: '/org-members', icon: UserCog, allowedRoles: ['hospital_supervisor', 'training_supervisor'] },
  { name: 'إسناد المدرب والتوزيع الميداني', path: '/intakes', icon: GraduationCap, allowedRoles: ['hospital_supervisor', 'training_supervisor'] },

  // 5. Trainer Navigation
  { name: 'لوحة الاستشاري والمدرب', path: '/', icon: LayoutDashboard, allowedRoles: ['trainer'] },
  { name: 'متدربيي المسندين والتقييمات', path: '/org-members', icon: UserCog, allowedRoles: ['trainer'] },
  { name: 'مراجعة واعتماد الـ Logbook', path: '/logbook', icon: BookOpen, allowedRoles: ['trainer'] },

  // 6. Trainee Navigation
  { name: 'لوحة طبيب الامتياز', path: '/', icon: LayoutDashboard, allowedRoles: ['trainee'] },
  { name: 'جدولي والـ Logbook والمهام', path: '/logbook', icon: BookOpen, allowedRoles: ['trainee'] },
  { name: 'الإقرارات والبطاقة الرقمية', path: '/declarations', icon: FileSignature, allowedRoles: ['trainee'] },

  // 7. Academic Supervisor (MVP - No Daily Operations)
  { name: 'لوحة الاعتماد النهائي للجامعة', path: '/', icon: Award, allowedRoles: ['academic_supervisor'] },
  { name: 'اعتماد نتائج وحصيلة البرنامج', path: '/reports', icon: FileSpreadsheet, allowedRoles: ['academic_supervisor'] }
];

export const Sidebar: React.FC = () => {
  const storedUserRaw = localStorage.getItem('miran_user_profile');
  let userRole = 'platform_owner';
  if (storedUserRaw) {
    try {
      const parsed = JSON.parse(storedUserRaw);
      if (parsed?.primaryRole) {
        userRole = parsed.primaryRole;
      } else if (Array.isArray(parsed?.roles) && parsed.roles.length > 0) {
        userRole = parsed.roles[0];
      }
    } catch {
      // Fallback
    }
  }

  // Handle role alias mappings
  if (userRole === 'org_manager') userRole = 'cluster_manager';

  const visibleItems = navigationItems.filter((item) =>
    item.allowedRoles.includes(userRole)
  );

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
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 12px 28px 12px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
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

      {/* Navigation Menu */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '24px' }}>
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path + item.name}
              to={item.path}
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
