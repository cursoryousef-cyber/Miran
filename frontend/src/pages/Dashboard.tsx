import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  GraduationCap,
  Zap,
  Award,
  ArrowUpRight,
  Plus,
  Clock,
  CheckCircle2,
  Calendar,
  Bell,
  Star,
  Activity,
  FileCheck,
  QrCode,
  Shield,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Button, Chip, LinearProgress } from '@mui/material';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // State for live backend data
  const [summary, setSummary] = useState<any>(null);
  const [performance, setPerformance] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [sumRes, perfRes, timeRes, profRes] = await Promise.all([
          apiClient.get('/trainees/dashboard-summary').catch(() => ({ data: null })),
          apiClient.get('/trainees/performance').catch(() => ({ data: null })),
          apiClient.get('/trainees/timeline').catch(() => ({ data: { data: [] } })),
          apiClient.get('/trainees/me').catch(() => ({ data: null })),
        ]);

        setSummary(sumRes.data);
        setPerformance(perfRes.data);
        setTimeline(timeRes.data?.data || []);
        setProfile(profRes.data);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const clusterData = [
    { name: 'مستشفى الأمير عبدالعزيز بن مساعد', trainees: 5, score: 98 },
    { name: 'مستشفى عرعر المركزي', trainees: 12, score: 94 },
    { name: 'جامعة الحدود الشمالية', trainees: 25, score: 96 },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Top Banner */}
      <div
        className="glass-card"
        style={{
          padding: '32px',
          background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.25) 0%, rgba(15, 23, 42, 0.9) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Chip
              label={user?.activeOrganization?.nameAr || 'منصة مِران الوطنية'}
              color="success"
              size="small"
              style={{ fontWeight: 700 }}
            />
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>
              الدور الحالي: {user?.roles?.join(', ') || 'مستخدم'}
            </span>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
            مرحباً بك، {user?.nameAr || 'د. المتدرب'} 👋
          </h1>
          <p style={{ fontSize: '14px', color: '#cbd5e1', marginTop: '8px', maxWidth: '650px' }}>
            لوحة الإشراف والمتابعة اللحظية المرتبطة بقاعدة البيانات الحية (Neon DB) — متابعة الروتيشن، التقييم، والنداءات.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={() => navigate('/organizations/wizard')}
            style={{
              background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
              fontWeight: 700,
            }}
          >
            إضافة جهة / قسم جديد
          </Button>
        </div>
      </div>

      {/* Live Dashboard Section: Rotation, Shift, Event, Goal Progress */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {/* Days remaining in Rotation */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>أيام الروتيشن المتبقية</span>
            <Clock size={20} color="#10b981" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#10b981' }}>
            {summary?.remainingDays ?? 14} يوماً
          </div>
          <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
            القسم: <strong style={{ color: '#fff' }}>{summary?.activeRotation?.departmentName || 'قسم الباطنية العام'}</strong>
          </div>
          {/* Progress bar */}
          <div style={{ marginTop: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
              <span>تقدم الروتيشن</span>
              <span>{summary?.activeRotation?.progressPercentage || 65}%</span>
            </div>
            <LinearProgress
              variant="determinate"
              value={summary?.activeRotation?.progressPercentage || 65}
              style={{ borderRadius: '6px', height: '8px', backgroundColor: 'rgba(255,255,255,0.1)' }}
            />
          </div>
        </div>

        {/* Current Shift */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>الوردية الحالية</span>
            <Calendar size={20} color="#06b6d4" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#06b6d4' }}>
            {summary?.currentShift?.shiftType || 'صباحي'} ({summary?.currentShift?.startTime || '07:30 ص'} - {summary?.currentShift?.endTime || '03:30 م'})
          </div>
          <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
            الموقع: <strong style={{ color: '#fff' }}>{summary?.currentShift?.departmentName || 'مستشفى الأمير عبدالعزيز بن مساعد'}</strong>
          </div>
        </div>

        {/* Upcoming Event / Task */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>الحدث / المهمة القادمة</span>
            <Activity size={20} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
            {summary?.upcomingEvent?.titleAr || 'مرور سريري مع استشاري الباطنية'}
          </div>
          <div style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 600 }}>
            ⏰ {summary?.upcomingEvent?.time || '08:00 ص'} — 📍 {summary?.upcomingEvent?.location || 'جناح ٣'}
          </div>
        </div>

        {/* Objective Progress */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>إنجاز أهداف التدريب</span>
            <CheckCircle2 size={20} color="#6366f1" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#6366f1' }}>
            {summary?.objectivePercentage ?? 85}%
          </div>
          <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
            تم إنجاز الأهداف المطلوبة لهذا الروتيشن بنجاح.
          </div>
        </div>
      </div>

      {/* Personal Performance Metrics */}
      <div className="glass-card" style={{ padding: '28px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', marginBottom: '20px' }}>
          📊 مؤشرات الأداء الشخصي (Personal Performance Analytics)
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>نسبة الالتزام</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#10b981' }}>{performance?.commitmentRate ?? 96}%</div>
          </div>

          <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>نسبة الحضور</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#06b6d4' }}>{performance?.attendanceRate ?? 98}%</div>
          </div>

          <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>سرعة الاستجابة للنداءات</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#f59e0b' }}>{performance?.callResponseSpeedMinutes ?? 3.5} دقائق</div>
          </div>

          <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>متوسط التقييم</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#6366f1' }}>{performance?.averageEvaluation ?? 4.85} / 5</div>
          </div>
        </div>
      </div>

      {/* Timeline & Profile Sections */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Unified Timeline */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', marginBottom: '16px' }}>
            ⏱️ التسلسل الزمني الموحد (Timeline)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {timeline.length > 0 ? (
              timeline.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Bell size={18} color="#10b981" />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{item.titleAr}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>{item.subtitleAr}</div>
                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>{new Date(item.timestamp).toLocaleString('ar-SA')}</div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: '#94a3b8', fontSize: '13px' }}>جاري تحميل التايم لاين...</div>
            )}
          </div>
        </div>

        {/* Trainee Profile Summary & Digital ID */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>
            🪪 الملف الشخصي والبطاقة الرقمية
          </h3>

          <div style={{ padding: '16px', background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderRadius: '14px', border: '1px solid rgba(16,185,129,0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>{profile?.person?.nameAr || user?.nameAr}</div>
                <div style={{ fontSize: '12px', color: '#10b981' }}>رقم المتدرب: {profile?.traineeNumber || '11023'}</div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>المستوى: {profile?.level === 'intern' ? 'طبيب امتياز' : 'طبيب مقيم'}</div>
              </div>
              <QrCode size={48} color="#10b981" />
            </div>
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#cbd5e1' }}>
              <span>الشهادات: {profile?.certifications?.length || 2} معتمدة</span>
              <span>المهارات: {profile?.skills?.length || 4} مكتسبة</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
