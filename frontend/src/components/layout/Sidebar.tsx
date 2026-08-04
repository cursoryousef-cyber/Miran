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
  Wand2,
  FolderGit2,
  FileSignature,
  Activity,
  Shield,
  Key,
} from 'lucide-react';

const navigationItems = [
  { name: 'لوحة التحكم الرئيسيّة', path: '/', icon: LayoutDashboard },
  { name: 'مراقبة سلامة الخدمات (Health)', path: '/health-monitor', icon: Activity },
  { name: 'الجهات والتجمعات الصحية', path: '/organizations', icon: Building2 },
  { name: 'معالج إنشاء الجهات آلياً', path: '/organizations/wizard', icon: Wand2 },
  { name: 'اتفاقيات الشراكة والتدريب', path: '/affiliations', icon: FolderGit2 },
  { name: 'الدفعات الأكاديمية (Intakes)', path: '/intakes', icon: GraduationCap },
  { name: 'إدارة الأشخاص والحسابات', path: '/users', icon: Users },
  { name: 'إدارة أعضاء الجهة (RBAC)', path: '/org-members', icon: UserCog },
  { name: 'إدارة الأدوار والصلاحيات', path: '/roles-management', icon: Key },
  { name: 'سجلات التدقيق والمراقبة', path: '/audit-logs', icon: Shield },
  { name: 'الإقرارات والتعهدات الوطنية', path: '/declarations', icon: FileSignature },
  { name: 'محرك سير العمل (Workflows)', path: '/workflows', icon: GitMerge },
  { name: 'سياسات الوصول (Policy Engine)', path: '/policies', icon: ShieldCheck },
  { name: 'مركز الربط والـ Webhooks', path: '/integrations', icon: Zap },
  { name: 'خدمة التقارير والتحليلات', path: '/reports', icon: FileSpreadsheet },
  { name: 'إعدادات المنصة والترخيص', path: '/settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
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
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '20px', flex: 1 }}>
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '10px',
                color: isActive ? '#34d399' : '#94a3b8',
                backgroundColor: isActive ? 'rgba(5, 150, 105, 0.15)' : 'transparent',
                border: isActive ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent',
                textDecoration: 'none',
                fontWeight: isActive ? 700 : 500,
                fontSize: '14px',
                transition: 'all 0.2s ease',
              })}
            >
              <Icon size={18} />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Version Tag */}
      <div style={{ padding: '12px', textAlign: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.08)', fontSize: '11px', color: '#64748b' }}>
        الإصدار المؤسسي v3.0 Enterprise
      </div>
    </aside>
  );
};
