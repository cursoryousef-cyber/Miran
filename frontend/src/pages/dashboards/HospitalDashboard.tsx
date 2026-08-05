import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Stethoscope, Users, ClipboardList, BookOpen } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export const HospitalDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: members } = useQuery({
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div className="glass-card" style={{
        padding: '32px',
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(15, 23, 42, 0.9) 100%)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Stethoscope size={20} color="#f59e0b" />
          <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 700 }}>Hospital Supervisor Dashboard</span>
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
          مرحباً، {user?.nameAr} 👋
        </h1>
        <p style={{ fontSize: '14px', color: '#cbd5e1', marginTop: '8px' }}>
          {user?.activeOrganization?.nameAr} — إدارة الروتيشنات والمتدربين والمدربين
        </p>
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <Button variant="contained" onClick={() => navigate('/intakes')}
            style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)', fontWeight: 700 }}>
            إدارة الروتيشنات
          </Button>
          <Button variant="outlined" onClick={() => navigate('/org-members')}
            style={{ borderColor: '#f59e0b', color: '#f59e0b', fontWeight: 700 }}>
            المتدربون والمدربون
          </Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>الروتيشنات النشطة</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#f59e0b' }}>{rotations?.length || 0}</div>
        </div>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>المتدربون الحاليون</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#10b981' }}>{members?.length || 0}</div>
        </div>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>الأقسام السريرية</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#8b5cf6' }}>4</div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', marginBottom: '16px' }}>🔄 الروتيشنات الجارية</h3>
        {rotations && rotations.length > 0 ? rotations.map((r: any) => (
          <div key={r.id} style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', marginBottom: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>{r.department?.nameAr || 'روتيشن نشط'}</div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>الحالة: {r.status} • {r.traineeProfile?.person?.nameAr || ''}</div>
          </div>
        )) : <div style={{ color: '#94a3b8', fontSize: '13px' }}>لا توجد روتيشنات حالياً</div>}
      </div>
    </div>
  );
};
