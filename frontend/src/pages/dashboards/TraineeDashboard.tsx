import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, Clock, CheckCircle2, QrCode, Calendar, ClipboardList, Radio, MapPin } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { Button, Chip, LinearProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const CALL_TYPE_LABELS: Record<string, { label: string; icon: string; accent: string }> = {
  urgent:           { label: 'حالة عاجلة',            icon: '🚨', accent: '#DC2626' },
  interesting_case: { label: 'حالة مثيرة للاهتمام',  icon: '🔬', accent: '#B45309' },
  skill_training:   { label: 'تدريب على مهارة',      icon: '🩺', accent: '#0891B2' },
  teaching_round:   { label: 'راوند تعليمي',         icon: '📚', accent: '#7E22CE' },
  general:          { label: 'عام',                   icon: '📢', accent: '#0F766E' },
};

const STATE_LABELS: Record<string, string> = {
  notified: 'مُبلَّغ', acknowledged: 'أكّد الاستلام',
  self_arrived: 'في الطريق', confirmed_arrived: 'وصل ✓', no_show: 'لم يحضر',
};

export const TraineeDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: summary } = useQuery({
    queryKey: ['trainee-summary'],
    queryFn: async () => {
      const res = await apiClient.get('/operations/trainee/dashboard');
      return res.data?.data;
    },
    refetchInterval: 15000,
  });

  const { data: profile } = useQuery({
    queryKey: ['trainee-profile'],
    queryFn: async () => {
      const res = await apiClient.get('/trainees/me').catch(() => ({ data: null }));
      return res.data;
    },
  });

  const { data: pendingEvals } = useQuery({
    queryKey: ['my-pending-evals-dashboard'],
    queryFn: async () => {
      const res = await apiClient.get('/operations/evaluations/my-pending').catch(() => ({ data: { data: null } }));
      return res.data?.data ?? null;
    },
    refetchInterval: 30000,
  });

  const qc = useQueryClient();
  const { data: incomingData, refetch: refetchCalls } = useQuery({
    queryKey: ['my-incoming-calls-dashboard'],
    queryFn: async () => {
      const res = await apiClient.get('/calls/my-incoming').catch(() => ({ data: { data: [] } }));
      return res.data?.data ?? [];
    },
    refetchInterval: 10000,
  });

  const activeCall = (incomingData ?? []).find((p: any) => p.call?.status === 'active');

  const handleCallAction = async (callId: string, action: 'ack' | 'on-way' | 'arrived') => {
    try {
      await apiClient.post(`/calls/${callId}/${action}`, {});
      refetchCalls();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'خطأ');
    }
  };

  const pendingDeptCount = pendingEvals?.pendingDepartmentEvals?.length ?? 0;

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
          <BookOpen size={20} color="#CCFBF1" />
          <span style={{ fontSize: '12px', color: '#CCFBF1', fontWeight: 700, letterSpacing: '1px' }}>
            TRAINEE DASHBOARD — طبيب امتياز
          </span>
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
          مرحباً، {user?.nameAr} 👋
        </h1>
        <p style={{ fontSize: '14px', color: '#F0FDF4', marginTop: '8px', opacity: 0.9 }}>
          {user?.activeOrganization?.nameAr} — متابعة الروتيشن والمهام والسجل السريري
        </p>
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
          <Button variant="contained" onClick={() => navigate('/logbook')}
            style={{ background: '#FFFFFF', color: '#0F766E', fontWeight: 800, borderRadius: 12 }}>
            السجل السريري (Logbook)
          </Button>
        </div>
      </div>

      {activeCall && (() => {
        const meta = CALL_TYPE_LABELS[activeCall.call?.callType] ?? CALL_TYPE_LABELS.general;
        return (
          <div className="glass-card" style={{
            padding: '20px 24px',
            border: `2px solid ${meta.accent}`,
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <Radio size={20} color={meta.accent} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
                {meta.icon} {activeCall.call?.customTitle ?? meta.label}
              </span>
              <Chip label="نداء نشط" size="small" sx={{ background: '#FEF3C7', color: '#B45309', fontWeight: 700, ml: 'auto' }} />
            </div>
            {activeCall.call?.note && (
              <p style={{ margin: '0 0 8px', fontSize: 13, color: '#475569' }}>{activeCall.call.note}</p>
            )}
            {activeCall.call?.location && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748B', marginBottom: 12 }}>
                <MapPin size={12} color="#0F766E" /> {activeCall.call.location}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              {activeCall.state === 'notified' && (
                <Button variant="contained" size="small"
                  onClick={() => handleCallAction(activeCall.call.id, 'ack')}
                  style={{ background: '#0F766E', fontWeight: 700, borderRadius: 10 }}>✅ تأكيد الاستلام</Button>
              )}
              {activeCall.state === 'acknowledged' && (
                <Button variant="contained" size="small"
                  onClick={() => handleCallAction(activeCall.call.id, 'on-way')}
                  style={{ background: '#0891B2', fontWeight: 700, borderRadius: 10 }}>🚶 أنا في الطريق</Button>
              )}
              {activeCall.state === 'self_arrived' && (
                <Button variant="contained" size="small"
                  onClick={() => handleCallAction(activeCall.call.id, 'arrived')}
                  style={{ background: '#10B981', fontWeight: 700, borderRadius: 10 }}>📍 وصلت</Button>
              )}
              {activeCall.state === 'confirmed_arrived' && (
                <Chip label="✓ تم تأكيد وصولك من المدرب" sx={{ background: '#CCFBF1', color: '#0F766E', fontWeight: 700 }} />
              )}
              <span style={{ fontSize: 12, color: '#64748B', marginRight: 'auto' }}>
                حالتك: <strong style={{ color: meta.accent }}>{STATE_LABELS[activeCall.state] ?? activeCall.state}</strong>
              </span>
            </div>
          </div>
        );
      })()}

      {pendingDeptCount > 0 && (
        <div className="glass-card" style={{
          padding: '16px 20px',
          border: '1px solid #FEF3C7',
          background: '#FEF3C7',
          borderRadius: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ClipboardList size={18} color="#B45309" />
            <span style={{ fontSize: 14, color: '#B45309', fontWeight: 700 }}>
              لديك {pendingDeptCount} قسم بحاجة لتقييمك — تقييم القسم شرط للقفل المتبادل وإتمام التخرج.
            </span>
          </div>
          <Button size="small" variant="outlined"
            onClick={() => navigate('/logbook')}
            style={{ borderColor: '#B45309', color: '#B45309', fontWeight: 700, whiteSpace: 'nowrap', borderRadius: 8 }}>
            تقييم الآن
          </Button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>أيام الروتيشن المتبقية</span>
            <Clock size={20} color="#0F766E" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#0F766E', marginTop: '8px' }}>{summary?.rotation ? Math.max(0, Math.ceil((new Date(summary.rotation.endDate).getTime() - Date.now()) / 86400000)) : '—'} يوماً</div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>القسم: {summary?.rotation?.department?.nameAr || '—'}</div>
          <LinearProgress variant="determinate" value={summary?.competencies?.percentage || 0} style={{ borderRadius: '6px', height: '8px', backgroundColor: '#E2E8F0', marginTop: '12px' }} />
        </div>

        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>نسبة الحضور</span>
            <Calendar size={20} color="#0891B2" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#0891B2', marginTop: '8px' }}>{summary?.attendanceRate ?? 0}%</div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>نسبة الحضور الشهرية</div>
        </div>

        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>إنجاز الأهداف</span>
            <CheckCircle2 size={20} color="#7E22CE" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#7E22CE', marginTop: '8px' }}>{summary?.competencies?.percentage ?? 0}%</div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginBottom: '16px' }}>🪪 البطاقة الرقمية</h3>
        <div style={{ padding: '20px', background: 'linear-gradient(135deg, #0F766E 0%, #0D9488 100%)', borderRadius: '16px', color: '#FFFFFF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF' }}>{profile?.person?.nameAr || user?.nameAr}</div>
              <div style={{ fontSize: '13px', color: '#CCFBF1', marginTop: '4px', fontWeight: 700 }}>رقم المتدرب: {profile?.traineeNumber || '—'}</div>
              <div style={{ fontSize: '12px', color: '#F0FDF4', marginTop: '2px', opacity: 0.9 }}>المستوى: {profile?.level === 'intern' ? 'طبيب امتياز' : profile?.level || '—'}</div>
            </div>
            <QrCode size={52} color="#FFFFFF" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TraineeDashboard;
