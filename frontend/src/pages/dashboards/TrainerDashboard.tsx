import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Stethoscope, ClipboardCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export const TrainerDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ['trainer-operations-dashboard'],
    queryFn: async () => {
      const res = await apiClient.get('/operations/trainer/dashboard');
      return res.data?.data;
    },
    refetchInterval: 15000,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div style={{
        padding: '32px',
        background: 'linear-gradient(135deg, #0F766E 0%, #0D9488 100%)',
        borderRadius: '16px',
        color: '#FFFFFF',
        boxShadow: '0 4px 14px rgba(15, 118, 110, 0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Stethoscope size={20} color="#CCFBF1" />
          <span style={{ fontSize: '12px', color: '#CCFBF1', fontWeight: 700, letterSpacing: '1px' }}>
            TRAINER DASHBOARD
          </span>
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
          مرحباً، {user?.nameAr} 👋
        </h1>
        <p style={{ fontSize: '14px', color: '#F0FDF4', marginTop: '8px', opacity: 0.9 }}>
          {user?.activeOrganization?.nameAr} — إدارة المتدربين المسندين والتقييمات والـ Logbook
        </p>
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
          <Button variant="contained" onClick={() => navigate('/org-members')}
            style={{ background: '#FFFFFF', color: '#0F766E', fontWeight: 800, borderRadius: 12 }}>
            متدربيّ المسندين
          </Button>
          <Button variant="outlined" onClick={() => navigate('/logbook')}
            style={{ borderColor: '#CCFBF1', color: '#FFFFFF', fontWeight: 700, borderRadius: 12 }}>
            مراجعة الـ Logbook
          </Button>
          <Button variant="outlined" onClick={() => navigate('/hospital?tab=calls')}
            style={{ borderColor: '#CCFBF1', color: '#FFFFFF', fontWeight: 700, borderRadius: 12 }}>
            🔔 النداءات
          </Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, marginBottom: '8px' }}>المتدربون المسندون</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#0F766E' }}>{stats?.assignedTrainees ?? 0}</div>
        </div>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, marginBottom: '8px' }}>تصحيحات حضور معلقة</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#F59E0B' }}>{stats?.pendingAttendance ?? 0}</div>
        </div>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, marginBottom: '8px' }}>Logbook ينتظر اعتماد</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#EF4444' }}>{stats?.pendingLogbook ?? 0}</div>
        </div>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, marginBottom: '8px' }}>الروتيشنات النشطة</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#0891B2' }}>{stats?.activeRotations ?? 0}</div>
        </div>
        <div className="glass-card" style={{ padding: '24px', cursor: 'pointer', border: (stats?.openCalls ?? 0) > 0 ? '1px solid #0F766E' : undefined }}
          onClick={() => navigate('/hospital?tab=calls')}>
          <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, marginBottom: '8px' }}>نداءات مفتوحة</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#7E22CE' }}>{stats?.openCalls ?? 0}</div>
          <div style={{ fontSize: '11px', color: '#0F766E', marginTop: 4, fontWeight: 700 }}>← إدارة النداءات</div>
        </div>
      </div>

      {(stats?.pendingLogbook ?? 0) > 0 && (
        <div className="glass-card" style={{
          padding: '16px 20px', border: '1px solid #FEF3C7',
          background: '#FEF3C7', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12
        }}>
          <ClipboardCheck size={18} color="#B45309" />
          <span style={{ fontSize: 14, color: '#B45309', fontWeight: 700 }}>
            {stats.pendingLogbook} سجل سريري ينتظر اعتمادك — انتقل إلى الـ Logbook لإتمام التقييمات واجتماعات منتصف الدورة.
          </span>
        </div>
      )}
    </div>
  );
};

export default TrainerDashboard;
