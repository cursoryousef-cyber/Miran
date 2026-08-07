import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { LinearProgress, CircularProgress, Chip } from '@mui/material';
import {
  Activity, AlertTriangle, BedDouble, CalendarCheck, ClipboardCheck,
  GraduationCap, Layers, Stethoscope, UserCog,
} from 'lucide-react';

interface Occupancy {
  capacity: number;
  occupied: number;
  available: number;
  occupancyPercentage: number;
}

const barColour = (pct: number) => (pct >= 90 ? '#DC2626' : pct >= 70 ? '#D97706' : '#0F766E');

const StatTile: React.FC<{
  label: string; value: React.ReactNode; icon: any; colour: string; hint?: string;
}> = ({ label, value, icon: Icon, colour, hint }) => (
  <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>{label}</span>
        <div style={{ padding: 8, borderRadius: 10, backgroundColor: `${colour}12` }}>
          <Icon size={18} color={colour} />
        </div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>{value}</div>
    </div>
    {hint && <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 10, fontWeight: 500 }}>{hint}</div>}
  </div>
);

const OccupancyRow: React.FC<{ label: string; sub?: string; occ: Occupancy }> = ({ label, sub, occ }) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
      <div>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>{label}</span>
        {sub && <span style={{ fontSize: 11.5, color: '#64748B', marginRight: 8 }}> — {sub}</span>}
      </div>
      <span style={{ fontSize: 12.5, color: '#475569', fontWeight: 700 }}>
        {occ.occupied}/{occ.capacity} ({occ.occupancyPercentage}%)
      </span>
    </div>
    <LinearProgress
      variant="determinate"
      value={Math.min(100, occ.occupancyPercentage)}
      sx={{
        height: 8, borderRadius: 4, backgroundColor: '#F1F5F9',
        '& .MuiLinearProgress-bar': { backgroundColor: barColour(occ.occupancyPercentage), borderRadius: 4 },
      }}
    />
  </div>
);

const Panel: React.FC<{ title: string; icon: any; children: React.ReactNode }> = ({ title, icon: Icon, children }) => (
  <div className="glass-card" style={{ padding: 24 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
      <div style={{ padding: 8, borderRadius: 10, backgroundColor: '#F0FDF4' }}>
        <Icon size={18} color="#0F766E" />
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>{title}</h3>
    </div>
    {children}
  </div>
);

export const WorkspaceOverview: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const { user } = useAuth();
  const orgId = user?.activeOrganization?.id;

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
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><CircularProgress style={{ color: '#0F766E' }} /></div>;
  }

  const today = new Date().toISOString().slice(0, 10);
  const todayAttendance = (attendance ?? []).filter((a: any) => String(a.date).slice(0, 10) === today);
  const presentToday = todayAttendance.filter((a: any) => ['present', 'late'].includes(a.status)).length;

  const activeRotations =
    (analytics?.rotations ?? []).find((r: any) => r.status === 'active')?._count ?? 0;
  const openIncidents = (analytics?.incidents ?? []).filter?.((i: any) => i.status !== 'resolved')?.length ?? 0;

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
      {/* Normalized KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <StatTile label="الروتيشنات النشطة" value={activeRotations} icon={Activity} colour="#0F766E" />
        <StatTile label="المتدربون الحاليون" value={timeline?.traineeCount ?? 0} icon={Stethoscope} colour="#059669"
          hint={`متوسط الإنجاز ${timeline?.averageCompletion ?? 0}%`} />
        <StatTile label="حضور اليوم" value={`${presentToday}/${todayAttendance.length}`} icon={CalendarCheck} colour="#7C3AED" />
        <StatTile label="تقييمات معلّقة" value={pendingEvaluations} icon={ClipboardCheck} colour="#D97706" />
        <StatTile label="جاهزون للتخرج" value={timeline?.readyForGraduation ?? 0} icon={GraduationCap} colour="#0F766E"
          hint={`متعثرون: ${(timeline?.atRisk ?? 0) + (timeline?.offTrack ?? 0)}`} />
        <StatTile label="بلاغات مفتوحة" value={openIncidents} icon={AlertTriangle}
          colour={openIncidents > 0 ? '#DC2626' : '#059669'} />
      </div>

      {/* Panels Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
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
            <div style={{ color: '#64748B', fontSize: 13 }}>
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
            <div style={{ color: '#64748B', fontSize: 13 }}>لا توجد أقسام مفعّلة</div>
          )}
        </Panel>

        <Panel title="إشغال المدربين" icon={UserCog}>
          <OccupancyRow label="الإجمالي" occ={trainerOccupancy} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
            <Chip size="small" label={`مدربون: ${(trainers ?? []).length}`} sx={{ background: '#F3E8FF', color: '#7E22CE', fontWeight: 700 }} />
            <Chip size="small" label={`في إجازة: ${(trainers ?? []).filter((t: any) => t.onLeave).length}`}
              sx={{ background: '#FEF3C7', color: '#B45309', fontWeight: 700 }} />
            <Chip size="small" label={`مقاعد متاحة: ${trainerOccupancy.available}`}
              sx={{ background: '#DCFCE7', color: '#15803D', fontWeight: 700 }} />
          </div>
          <button
            onClick={() => onNavigate('trainers')}
            style={{
              marginTop: 20, width: '100%', padding: '10px', borderRadius: 12, cursor: 'pointer',
              background: '#CCFBF1', border: '1px solid #99F6E4',
              color: '#0F766E', fontWeight: 700, fontSize: 13.5,
              transition: 'background-color 0.2s',
            }}
          >
            عرض بطاقات المدربين ←
          </button>
        </Panel>

        <Panel title="جاهزية التخرج" icon={GraduationCap}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {[
              { label: 'في المسار', value: timeline?.onTrack ?? 0, colour: '#059669', bg: '#DCFCE7' },
              { label: 'جاهز', value: timeline?.readyForGraduation ?? 0, colour: '#0F766E', bg: '#CCFBF1' },
              { label: 'متأخر', value: timeline?.atRisk ?? 0, colour: '#D97706', bg: '#FEF3C7' },
              { label: 'خارج المسار', value: timeline?.offTrack ?? 0, colour: '#DC2626', bg: '#FEE2E2' },
            ].map((s) => (
              <div key={s.label} style={{ padding: 14, background: s.bg, borderRadius: 12 }}>
                <div style={{ fontSize: 11.5, color: '#475569', fontWeight: 600 }}>{s.label}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: s.colour, marginTop: 4 }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, fontSize: 12.5, color: '#64748B' }}>
            متوسط تقدم التخرج: <strong style={{ color: '#0F172A' }}>{timeline?.averageGraduationProgress ?? 0}%</strong>
          </div>
        </Panel>
      </div>
    </div>
  );
};

export default WorkspaceOverview;
