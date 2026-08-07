import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Stethoscope, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { Button, IconButton, Tooltip } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export const HospitalDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: members, refetch: refetchMembers } = useQuery({
    queryKey: ['hosp-members'],
    queryFn: async () => {
      const res = await apiClient.get('/org-members').catch(() => ({ data: { data: [] } }));
      return res.data?.data || [];
    },
  });

  const { data: rotations } = useQuery({
    queryKey: ['hosp-rotations'],
    queryFn: async () => {
      const res = await apiClient.get('/rotations').catch(() => ({ data: { data: [] } }));
      return res.data?.data || [];
    },
  });

  const { data: departments } = useQuery({
    queryKey: ['hosp-departments'],
    queryFn: async () => {
      const res = await apiClient.get('/org-members/departments').catch(() => ({ data: { data: [] } }));
      return res.data?.data || [];
    },
  });

  const trainers = members?.filter((m: any) => m.roles?.some((r: any) => r.code === 'trainer')) || [];
  const trainees = members?.filter((m: any) => m.roles?.some((r: any) => r.code === 'trainee')) || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div style={{
        padding: '32px',
        background: 'linear-gradient(135deg, #0F766E 0%, #0D9488 100%)',
        borderRadius: '16px',
        color: '#FFFFFF',
        boxShadow: '0 4px 14px rgba(15, 118, 110, 0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Stethoscope size={20} color="#CCFBF1" />
              <span style={{ fontSize: '12px', color: '#CCFBF1', fontWeight: 700, letterSpacing: '1px' }}>
                HOSPITAL SUPERVISOR DASHBOARD
              </span>
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
              مرحباً، {user?.nameAr} 👋
            </h1>
            <p style={{ fontSize: '14px', color: '#F0FDF4', marginTop: '8px', opacity: 0.9 }}>
              {user?.activeOrganization?.nameAr} — الإشراف السريري وتوزيع الروتيشنات والمدربين
            </p>
          </div>
          <Tooltip title="تحديث">
            <IconButton onClick={() => refetchMembers()} style={{ color: '#FFFFFF', backgroundColor: 'rgba(255,255,255,0.15)' }}>
              <RefreshCw size={18} />
            </IconButton>
          </Tooltip>
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
          <Button variant="contained" onClick={() => navigate('/hospital')}
            style={{ background: '#FFFFFF', color: '#0F766E', fontWeight: 800, borderRadius: 12 }}>
            مساحة عمل المستشفى الشاملة
          </Button>
          <Button variant="outlined" onClick={() => navigate('/intakes')}
            style={{ borderColor: '#CCFBF1', color: '#FFFFFF', fontWeight: 700, borderRadius: 12 }}>
            إدارة الروتيشنات الأكاديمية
          </Button>
          <Button variant="outlined" onClick={() => navigate('/org-members')}
            style={{ borderColor: '#CCFBF1', color: '#FFFFFF', fontWeight: 700, borderRadius: 12 }}>
            المتدربون والمدربون
          </Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, marginBottom: '8px' }}>الأطباء المتدربون</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#0F766E' }}>{trainees.length}</div>
        </div>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, marginBottom: '8px' }}>المدربون السريريون</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#0891B2' }}>{trainers.length}</div>
        </div>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, marginBottom: '8px' }}>الأقسام المفعّلة</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#F59E0B' }}>{departments?.length || 0}</div>
        </div>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, marginBottom: '8px' }}>الروتيشنات النشطة</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#7E22CE' }}>{rotations?.length || 0}</div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginBottom: '16px' }}>🏥 الأقسام السريرية المسجلة</h3>
        {departments && departments.length > 0 ? departments.map((d: any) => (
          <div key={d.id} style={{ padding: '12px 16px', backgroundColor: '#F8FAFC', borderRadius: '12px', marginBottom: '8px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>{d.nameAr}</div>
            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>{d.code || 'DEPT'}</span>
          </div>
        )) : <div style={{ color: '#64748B', fontSize: '13px', padding: '16px', textAlign: 'center' }}>لا توجد أقسام مفعّلة حالياً</div>}
      </div>
    </div>
  );
};

export default HospitalDashboard;
