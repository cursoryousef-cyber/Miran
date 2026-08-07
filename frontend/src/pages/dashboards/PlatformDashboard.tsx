import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Building2, Users, GraduationCap, Shield, Stethoscope, FileCheck, Network } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

const StatCard: React.FC<{ label: string; value: string | number; icon: any; color: string }> = ({ label, value, icon: Icon, color }) => (
  <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>{label}</span>
      <div style={{ padding: 8, borderRadius: 10, backgroundColor: `${color}12` }}>
        <Icon size={18} color={color} />
      </div>
    </div>
    <div style={{ fontSize: '30px', fontWeight: 800, color: '#0F172A' }}>{value}</div>
  </div>
);

export const PlatformDashboard: React.FC = () => {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: async () => {
      const [orgs, users] = await Promise.all([
        apiClient.get('/organizations').catch(() => ({ data: { data: [], meta: { total: 0 } } })),
        apiClient.get('/user-accounts').catch(() => ({ data: { data: [], meta: { total: 0 } } })),
      ]);
      return {
        orgsCount: orgs.data?.meta?.total || orgs.data?.data?.length || 0,
        usersCount: users.data?.meta?.total || users.data?.data?.length || 0,
        orgs: orgs.data?.data || [],
      };
    },
  });

  const orgList = stats?.orgs || [];
  const clusters = orgList.filter((o: any) => o.organizationType?.code === 'cluster');
  const hospitals = orgList.filter((o: any) => o.organizationType?.code === 'hospital');
  const universities = orgList.filter((o: any) => o.organizationType?.code === 'university');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Banner */}
      <div style={{
        padding: '32px',
        background: 'linear-gradient(135deg, #0F766E 0%, #0D9488 100%)',
        borderRadius: '16px',
        color: '#FFFFFF',
        boxShadow: '0 4px 14px rgba(15, 118, 110, 0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Shield size={20} color="#CCFBF1" />
          <span style={{ fontSize: '12px', color: '#CCFBF1', fontWeight: 700, letterSpacing: '1px' }}>
            مركز التحكم الوطني — {user?.roles?.[0] === 'platform_owner' ? 'Platform Owner' : 'System Admin'}
          </span>
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
          مرحباً بك، {user?.nameAr} 👋
        </h1>
        <p style={{ fontSize: '14px', color: '#F0FDF4', marginTop: '8px', opacity: 0.9 }}>
          لوحة الإشراف الوطنية — إحصائيات شاملة لجميع الجهات والتجمعات والمستشفيات والجامعات
        </p>
      </div>

      {/* National KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <StatCard label="إجمالي الجهات المسجلة" value={stats?.orgsCount || 0} icon={Building2} color="#0F766E" />
        <StatCard label="التجمعات الصحية" value={clusters.length} icon={Network} color="#0891B2" />
        <StatCard label="المستشفيات والمراكز" value={hospitals.length} icon={Stethoscope} color="#F59E0B" />
        <StatCard label="الجامعات الصحية" value={universities.length} icon={GraduationCap} color="#7E22CE" />
        <StatCard label="إجمالي المستخدمين" value={stats?.usersCount || 0} icon={Users} color="#DB2777" />
        <StatCard label="سجلات التدقيق" value="Active" icon={FileCheck} color="#16A34A" />
      </div>

      {/* Organizations List */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginBottom: '16px' }}>
          🏛️ الجهات المسجلة في المنصة
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {isLoading ? (
            <div style={{ color: '#64748B', fontSize: '13px', padding: '16px', textAlign: 'center' }}>جاري التحميل...</div>
          ) : orgList.length === 0 ? (
            <div style={{ color: '#64748B', fontSize: '13px', padding: '16px', textAlign: 'center' }}>لا توجد جهات مسجلة حالياً</div>
          ) : (
            orgList.slice(0, 10).map((org: any) => (
              <div key={org.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', backgroundColor: '#F8FAFC', borderRadius: '12px',
                border: '1px solid #E2E8F0',
              }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>{org.nameAr}</div>
                  <div style={{ fontSize: '11.5px', color: '#64748B' }}>{org.nameEn} • {org.code}</div>
                </div>
                <span style={{
                  fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '8px',
                  backgroundColor: org.status === 'active' ? '#DCFCE7' : '#FEF3C7',
                  color: org.status === 'active' ? '#15803D' : '#B45309',
                }}>{org.status === 'active' ? 'نشط' : org.status}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PlatformDashboard;
