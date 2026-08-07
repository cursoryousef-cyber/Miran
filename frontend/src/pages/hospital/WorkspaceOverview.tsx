import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { LinearProgress, CircularProgress, Chip } from '@mui/material';
import {
  Activity, AlertTriangle, BedDouble, CalendarCheck, ClipboardCheck,
  GraduationCap, Layers, Stethoscope, UserCog,
} from 'lucide-react';

/**
 * The hospital's operational summary.
 *
 * Every progress figure here comes from the timeline dashboard endpoint and
 * every capacity figure from the capacity breakdown — the widgets format
 * numbers, they never recompute them.
 */

interface Occupancy {
  capacity: number;
  occupied: number;
  available: number;
  occupancyPercentage: number;
}

const barColour = (pct: number) => (pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#10b981');

const StatTile: React.FC<{
  label: string; value: React.ReactNode; icon: any; colour: string; hint?: string;
}> = ({ label, value, icon: Icon, colour, hint }) => (
  <div className="glass-card" style={{ padding: '20px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <Icon size={16} color={colour} />
      <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{label}</span>
    </div>
    <div style={{ fontSize: 30, fontWeight: 800, color: colour, lineHeight: 1.1 }}>{value}</div>
    {hint && <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>{hint}</div>}
  </div>
);

const OccupancyRow: React.FC<{ label: string; sub?: string; occ: Occupancy }> = ({ label, sub, occ }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
      <div>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>{label}</span>
        {sub && <span style={{ fontSize: 11, color: '#64748b', marginRight: 8 }}> — {sub}</span>}
      </div>
      <span style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 700 }}>
        {occ.occupied}/{occ.capacity} ({occ.occupancyPercentage}%)
      </span>
    </div>
    <LinearProgress
      variant="determinate"
      value={Math.min(100, occ.occupancyPercentage)}
      sx={{
        height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.07)',
        '& .MuiLinearProgress-bar': { backgroundColor: barColour(occ.occupancyPercentage), borderRadius: 4 },
      }}
    />
  </div>
);

const Panel: React.FC<{ title: string; icon: any; children: React.ReactNode }> = ({ title, icon: Icon, children }) => (
  <div className="glass-card" style={{ padding: 24 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      <Icon size={18} color="#f59e0b" />
      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', margin: 0 }}>{title}</h3>
    </div>
    {children}
  </div>
);

export const WorkspaceOverview: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const { user } = useAuth();
  const orgId = user?.activeOrganization?.id;

  // Progress and graduation readiness — the single timeline source.
  const { data: timeline, isLoading: timelineLoading } = useQuery({
    queryKey: ['ws-timeline', orgId],
    queryFn: async () => {
      const res = await apiClient
        .get('/timeline/dashboard', { params: { scope: 'hospital', limit: 200 } })
        .catch(() => ({ data: { data: null } }));
      return res.data?.data ?? null;
    },
  });

  const { data: capacity, isLoading: capacityLoading } = useQuery({
    queryKey: ['ws-capacity', orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const res = await apiClient.get(`/organizations/${orgId}/capacity`).catch(() => ({ data: null }));
      return res.data ?? null;
    },
  });

  const { data: trainers } = useQuery({
    queryKey: ['ws-trainer-cards', orgId],
    queryFn: async () => {
      const res = await apiClient.get('/trainers/workspace-cards').catch(() => ({ data: { data: [] } }));
      return res.data?.data ?? [];
    },
  });

  const { data: analytics } = useQuery({
    queryKey: ['ws-analytics', orgId],
    queryFn: async () => {
      const res = await apiClient.get('/operations/analytics').catch(() => ({ data: { data: null } }));
      return res.data?.data ?? null;
    },
  });

  const { data: attendance } = useQuery({
    queryKey: ['ws-attendance-today', orgId],
    queryFn: async () => {
      const res = await apiClient.get('/operations/attendance').catch(() => ({ data: { data: [] } }));
      return res.data?.data ?? [];
    },
  });

  if (timelineLoading || capacityLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><CircularProgress /></div>;
  }

  const today = new Date().toISOString().slice(0, 10);
  const todayAttendance = (attendance ?? []).filter((a: any) => String(a.date).slice(0, 10) === today);
  const presentToday = todayAttendance.filter((a: any) => ['present', 'late'].includes(a.status)).length;

  const activeRotations =
    (analytics?.rotations ?? []).find((r: any) => r.status === 'active')?._count ?? 0;
  const openIncidents = (analytics?.incidents ?? []).filter?.((i: any) => i.status !== 'resolved')?.length ?? 0;

  // Pending evaluations are the outstanding evaluation requirements the
  // timeline already computed per trainee.
  const pendingEvaluations = (timeline?.trainees ?? []).reduce(
    (sum: number, t: any) => sum + (t.readiness?.remaining?.evaluations ?? 0), 0,
  );

  const trainerOccupancy: Occupancy = (trainers ?? []).reduce(
    (acc: Occupancy, t: any) => ({
      capacity: acc.capacity + (t.maxTrainees ?? 0),
      occupied: acc.occupied + (t.occupied ?? 0),
      available: 0, occupancyPercentage: 0,
    }),
    { capacity: 0, occupied: 0, available: 0, occupancyPercentage: 0 },
  );
  trainerOccupancy.available = Math.max(0, trainerOccupancy.capacity - trainerOccupancy.occupied);
  trainerOccupancy.occupancyPercentage = trainerOccupancy.capacity
    ? Math.round((trainerOccupancy.occupied / trainerOccupancy.capacity) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16 }}>
        <StatTile label="الروتيشنات النشطة" value={activeRotations} icon={Activity} colour="#06b6d4" />
        <StatTile label="المتدربون الحاليون" value={timeline?.traineeCount ?? 0} icon={Stethoscope} colour="#10b981"
          hint={`متوسط الإنجاز ${timeline?.averageCompletion ?? 0}%`} />
        <StatTile label="حضور اليوم" value={`${presentToday}/${todayAttendance.length}`} icon={CalendarCheck} colour="#8b5cf6" />
        <StatTile label="تقييمات معلّقة" value={pendingEvaluations} icon={ClipboardCheck} colour="#f59e0b" />
        <StatTile label="جاهزون للتخرج" value={timeline?.readyForGraduation ?? 0} icon={GraduationCap} colour="#10b981"
          hint={`متعثرون: ${(timeline?.atRisk ?? 0) + (timeline?.offTrack ?? 0)}`} />
        <StatTile label="بلاغات مفتوحة" value={openIncidents} icon={AlertTriangle}
          colour={openIncidents > 0 ? '#ef4444' : '#10b981'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
        <Panel title="إشغال البرامج التدريبية" icon={Layers}>
          {capacity?.programs?.length ? (
            capacity.programs.map((p: any) => (
              <OccupancyRow
                key={p.allocation.id}
                label={p.program?.nameAr ?? 'برنامج غير معروف'}
                sub={p.program?.code}
                occ={p.occupancy}
              />
            ))
          ) : (
            <div style={{ color: '#94a3b8', fontSize: 13 }}>
              لم يُحدَّد أي برنامج تدريبي بعد — يمكن تحديد سعة البرامج من قسم «الطاقة الاستيعابية».
            </div>
          )}
        </Panel>

        <Panel title="إشغال الأقسام السريرية" icon={BedDouble}>
          {capacity?.departments?.length ? (
            capacity.departments.map((d: any) => (
              <OccupancyRow key={d.id} label={d.nameAr} sub={d.code ?? undefined} occ={d.occupancy} />
            ))
          ) : (
            <div style={{ color: '#94a3b8', fontSize: 13 }}>لا توجد أقسام مفعّلة</div>
          )}
        </Panel>

        <Panel title="إشغال المدربين" icon={UserCog}>
          <OccupancyRow label="الإجمالي" occ={trainerOccupancy} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            <Chip size="small" label={`مدربون: ${(trainers ?? []).length}`} sx={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa' }} />
            <Chip size="small" label={`في إجازة: ${(trainers ?? []).filter((t: any) => t.onLeave).length}`}
              sx={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24' }} />
            <Chip size="small" label={`مقاعد متاحة: ${trainerOccupancy.available}`}
              sx={{ background: 'rgba(16,185,129,0.15)', color: '#34d399' }} />
          </div>
          <button
            onClick={() => onNavigate('trainers')}
            style={{
              marginTop: 16, width: '100%', padding: '10px', borderRadius: 8, cursor: 'pointer',
              background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)',
              color: '#fbbf24', fontWeight: 700, fontSize: 13,
            }}
          >
            عرض بطاقات المدربين
          </button>
        </Panel>

        <Panel title="جاهزية التخرج" icon={GraduationCap}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {[
              { label: 'في المسار', value: timeline?.onTrack ?? 0, colour: '#10b981' },
              { label: 'جاهز', value: timeline?.readyForGraduation ?? 0, colour: '#06b6d4' },
              { label: 'متأخر', value: timeline?.atRisk ?? 0, colour: '#f59e0b' },
              { label: 'خارج المسار', value: timeline?.offTrack ?? 0, colour: '#ef4444' },
            ].map((s) => (
              <div key={s.label} style={{ padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.colour }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, fontSize: 12, color: '#64748b' }}>
            متوسط تقدم التخرج: <strong style={{ color: '#cbd5e1' }}>{timeline?.averageGraduationProgress ?? 0}%</strong>
          </div>
        </Panel>
      </div>
    </div>
  );
};

export default WorkspaceOverview;
