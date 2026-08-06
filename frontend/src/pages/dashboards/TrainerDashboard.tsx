import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Stethoscope, Users, BookOpen, ClipboardCheck } from 'lucide-react';
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
      <div className="glass-card" style={{
        padding: '32px',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(15, 23, 42, 0.9) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Stethoscope size={20} color="#10b981" />
          <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 700 }}>Trainer Dashboard</span>
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
          مرحباً، {user?.nameAr} 👋
        </h1>
        <p style={{ fontSize: '14px', color: '#cbd5e1', marginTop: '8px' }}>
          {user?.activeOrganization?.nameAr} — إدارة المتدربين المسندين والتقييمات والـ Logbook
        </p>
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <Button variant="contained" onClick={() => navigate('/org-members')}
            style={{ background: 'linear-gradient(135deg, #059669, #10b981)', fontWeight: 700 }}>
            متدربيّ المسندين
          </Button>
          <Button variant="outlined" onClick={() => navigate('/logbook')}
            style={{ borderColor: '#10b981', color: '#10b981', fontWeight: 700 }}>
            مراجعة الـ Logbook
          </Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>المتدربون المسندون</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#10b981' }}>{stats?.assignedTrainees ?? 0}</div>
        </div>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>تصحيحات حضور معلقة</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#f59e0b' }}>{stats?.pendingAttendance ?? 0}</div>
        </div>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>Logbook ينتظر اعتماد</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#ef4444' }}>{stats?.pendingLogbook ?? 0}</div>
        </div>
      </div>
    </div>
  );
};
