import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Building2, Users, GraduationCap, Activity, Shield, Stethoscope, FileCheck, Network } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

const StatCard: React.FC<{ label: string; value: string | number; icon: any; color: string }> = ({ label, value, icon: Icon, color }) => (
  <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>{label}</span>
      <Icon size={20} color={color} />
    </div>
    <div style={{ fontSize: '32px', fontWeight: 800, color }}>{value}</div>
  </div>
);

export const PlatformDashboard: React.FC = () => {
  const { user } = useAuth();

  const { data: stats } = useQuery({
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
      <div className="glass-card" style={{
        padding: '32px',
        background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.25) 0%, rgba(15, 23, 42, 0.9) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Shield size={20} color="#10b981" />
          <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 700, letterSpacing: '1px' }}>
            مركز التحكم الوطني — {user?.roles?.[0] === 'platform_owner' ? 'Platform Owner' : 'System Admin'}
          </span>
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
          مرحباً بك، {user?.nameAr} 👋
        </h1>
        <p style={{ fontSize: '14px', color: '#cbd5e1', marginTop: '8px' }}>
          لوحة الإشراف الوطنية — إحصائيات شاملة لجميع الجهات والتجمعات والمستشفيات والجامعات
        </p>
      </div>

      {/* National KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        <StatCard label="إجمالي الجهات المسجلة" value={stats?.orgsCount || 0} icon={Building2} color="#10b981" />
        <StatCard label="التجمعات الصحية" value={clusters.length} icon={Network} color="#06b6d4" />
        <StatCard label="المستشفيات والمراكز" value={hospitals.length} icon={Stethoscope} color="#f59e0b" />
        <StatCard label="الجامعات الصحية" value={universities.length} icon={GraduationCap} color="#8b5cf6" />
        <StatCard label="إجمالي المستخدمين" value={stats?.usersCount || 0} icon={Users} color="#ec4899" />
        <StatCard label="سجلات التدقيق" value="Active" icon={FileCheck} color="#22c55e" />
      </div>

      {/* Organizations List */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', marginBottom: '16px' }}>
          🏛️ الجهات المسجلة في المنصة
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {orgList.length === 0 ? (
            <div style={{ color: '#94a3b8', fontSize: '13px' }}>جاري التحميل...</div>
          ) : (
            orgList.slice(0, 10).map((org: any) => (
              <div key={org.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>{org.nameAr}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{org.nameEn} • {org.code}</div>
                </div>
                <span style={{
                  fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '6px',
                  backgroundColor: org.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                  color: org.status === 'active' ? '#10b981' : '#f59e0b',
                }}>{org.status === 'active' ? 'نشط' : org.status}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
