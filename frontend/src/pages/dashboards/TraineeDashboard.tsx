import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, Clock, Activity, CheckCircle2, QrCode, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { Button, LinearProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export const TraineeDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: summary } = useQuery({
    queryKey: ['trainee-summary'],
    queryFn: async () => {
      const res = await apiClient.get('/trainees/dashboard-summary').catch(() => ({ data: null }));
      return res.data;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ['trainee-profile'],
    queryFn: async () => {
      const res = await apiClient.get('/trainees/me').catch(() => ({ data: null }));
      return res.data;
    },
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div className="glass-card" style={{
        padding: '32px',
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(15, 23, 42, 0.9) 100%)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <BookOpen size={20} color="#3b82f6" />
          <span style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 700 }}>Trainee Dashboard — طبيب امتياز</span>
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
          مرحباً، {user?.nameAr} 👋
        </h1>
        <p style={{ fontSize: '14px', color: '#cbd5e1', marginTop: '8px' }}>
          {user?.activeOrganization?.nameAr} — متابعة الروتيشن والمهام والسجل السريري
        </p>
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <Button variant="contained" onClick={() => navigate('/logbook')}
            style={{ background: 'linear-gradient(135deg, #2563eb, #3b82f6)', fontWeight: 700 }}>
            السجل السريري (Logbook)
          </Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>أيام الروتيشن المتبقية</span>
            <Clock size={20} color="#10b981" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#10b981', marginTop: '8px' }}>{summary?.remainingDays ?? '—'} يوماً</div>
          <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px' }}>القسم: {summary?.activeRotation?.departmentName || '—'}</div>
          <LinearProgress variant="determinate" value={summary?.activeRotation?.progressPercentage || 0} style={{ borderRadius: '6px', height: '8px', backgroundColor: 'rgba(255,255,255,0.1)', marginTop: '12px' }} />
        </div>

        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>الوردية الحالية</span>
            <Calendar size={20} color="#06b6d4" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#06b6d4', marginTop: '8px' }}>{summary?.currentShift?.shiftType || '—'}</div>
          <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px' }}>{summary?.currentShift?.startTime || ''} - {summary?.currentShift?.endTime || ''}</div>
        </div>

        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>إنجاز الأهداف</span>
            <CheckCircle2 size={20} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#8b5cf6', marginTop: '8px' }}>{summary?.objectivePercentage ?? 0}%</div>
        </div>
      </div>

      {/* Digital ID Card */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', marginBottom: '16px' }}>🪪 البطاقة الرقمية</h3>
        <div style={{ padding: '16px', background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderRadius: '14px', border: '1px solid rgba(16,185,129,0.4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>{profile?.person?.nameAr || user?.nameAr}</div>
              <div style={{ fontSize: '12px', color: '#10b981' }}>رقم المتدرب: {profile?.traineeNumber || '—'}</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>المستوى: {profile?.level === 'intern' ? 'طبيب امتياز' : profile?.level || '—'}</div>
            </div>
            <QrCode size={48} color="#10b981" />
          </div>
        </div>
      </div>
    </div>
  );
};
