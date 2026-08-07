import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity, AlertTriangle, BedDouble, CalendarCheck, ClipboardCheck, GraduationCap,
  Inbox, Layers, PhoneCall, Stethoscope, UserCog, Users,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  Badge, EmptyState, KpiCard, KpiGrid, ListRow, Panel, PanelGrid, PanelLink,
  PanelSkeleton, PageHeader, QuickActions, SplitGrid, StatBar, colour, space,
} from '../../components/ui';

/**
 * Hospital operations landing board.
 *
 * The hospital runs training day to day, so this board is about today: who is
 * present, which departments are tight, what needs review, and who is falling
 * behind. Depth lives in the workspace — every panel links into the section
 * that owns it rather than repeating it here.
 */
export const HospitalDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const orgId = user?.activeOrganization?.id;

  const { data: timeline, isLoading: tlLoading } = useQuery({
    queryKey: ['hd-timeline', orgId],
    queryFn: async () => {
      const res = await apiClient
        .get('/timeline/dashboard', { params: { scope: 'hospital', limit: 200 } })
        .catch(() => ({ data: { data: null } }));
      return res.data?.data ?? null;
    },
  });

  const { data: capacity } = useQuery({
    queryKey: ['hd-capacity', orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const res = await apiClient.get(`/organizations/${orgId}/capacity`).catch(() => ({ data: null }));
      return res.data ?? null;
    },
  });

  const { data: trainers } = useQuery({
    queryKey: ['hd-trainers', orgId],
    queryFn: async () => {
      const res = await apiClient.get('/trainers/workspace-cards').catch(() => ({ data: { data: [] } }));
      return res.data?.data ?? [];
    },
  });

  const { data: analytics } = useQuery({
    queryKey: ['hd-analytics', orgId],
    queryFn: async () => {
      const res = await apiClient.get('/operations/analytics').catch(() => ({ data: { data: null } }));
      return res.data?.data ?? null;
    },
  });

  const { data: attendance } = useQuery({
    queryKey: ['hd-attendance', orgId],
    queryFn: async () => {
      const res = await apiClient.get('/operations/attendance').catch(() => ({ data: { data: [] } }));
      return res.data?.data ?? [];
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const todayRows = (attendance ?? []).filter((a: any) => String(a.date).slice(0, 10) === today);
  const present = todayRows.filter((a: any) => ['present', 'late'].includes(a.status)).length;

  const activeRotations = (analytics?.rotations ?? []).find((r: any) => r.status === 'active')?._count ?? 0;
  const openIncidents = Array.isArray(analytics?.incidents)
    ? analytics.incidents.filter((i: any) => i.status !== 'resolved').length : 0;

  const pendingEvaluations = (timeline?.trainees ?? [])
    .reduce((s: number, t: any) => s + (t.readiness?.remaining?.evaluations ?? 0), 0);

  const onLeave = (trainers ?? []).filter((t: any) => t.onLeave);
  const fullTrainers = (trainers ?? []).filter((t: any) => t.available === 0 && t.maxTrainees > 0);
  const behind = (timeline?.trainees ?? [])
    .filter((t: any) => ['at_risk', 'off_track'].includes(t.readiness?.expectedGraduationStatus))
    .slice(0, 5);

  const departments = (capacity?.departments ?? [])
    .map((d: any) => ({ ...d, pct: d.occupancy?.occupancyPercentage ?? 0 }))
    .sort((a: any, b: any) => b.pct - a.pct);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: space['2xl'] }}>
      <PageHeader
        eyebrow="HOSPITAL OPERATIONS"
        icon={Stethoscope}
        title="لوحة المستشفى"
        subtitle={`${user?.activeOrganization?.nameAr ?? ''} — العمليات اليومية للتدريب`}
        actions={
          <button
            onClick={() => navigate('/hospital')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px',
              borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              background: colour.primary, color: '#fff', fontWeight: 700, fontSize: 13,
            }}
          >
            <BedDouble size={16} /> فتح مساحة العمل
          </button>
        }
      />

      <KpiGrid>
        <KpiCard label="الروتيشنات النشطة" value={activeRotations} icon={Activity} tone="primary"
          onClick={() => navigate('/hospital?tab=overview')} />
        <KpiCard label="المتدربون الحاليون" value={timeline?.traineeCount ?? 0} icon={Users} tone="success"
          hint={`متوسط الإنجاز ${timeline?.averageCompletion ?? 0}%`} loading={tlLoading} />
        <KpiCard label="حضور اليوم" value={`${present}/${todayRows.length}`} icon={CalendarCheck} tone="violet" />
        <KpiCard label="تقييمات معلّقة" value={pendingEvaluations} icon={ClipboardCheck} tone="warning"
          loading={tlLoading} />
        <KpiCard label="جاهزون للتخرج" value={timeline?.readyForGraduation ?? 0} icon={GraduationCap} tone="success"
          hint={`متعثرون: ${(timeline?.atRisk ?? 0) + (timeline?.offTrack ?? 0)}`} loading={tlLoading}
          onClick={() => navigate('/hospital?tab=graduation')} />
        <KpiCard label="بلاغات مفتوحة" value={openIncidents} icon={AlertTriangle}
          tone={openIncidents > 0 ? 'danger' : 'success'} onClick={() => navigate('/hospital?tab=incidents')} />
      </KpiGrid>

      <SplitGrid>
        <Panel
          title="السعة اليومية للأقسام"
          icon={BedDouble}
          action={<PanelLink label="الطاقة الاستيعابية" onClick={() => navigate('/hospital?tab=capacity')} />}
        >
          {departments.length === 0 ? (
            <EmptyState icon={BedDouble} title="لا توجد أقسام مفعّلة" hint="فعّل الأقسام السريرية لعرض السعة." />
          ) : (
            departments.slice(0, 7).map((d: any) => (
              <StatBar key={d.id} label={d.nameAr} value={d.occupancy?.occupied ?? 0} max={d.occupancy?.capacity || 1} />
            ))
          )}
        </Panel>

        <Panel
          title="المدربون"
          icon={UserCog}
          tone="violet"
          action={<PanelLink label="بطاقات المدربين" onClick={() => navigate('/hospital?tab=trainers')} />}
        >
          {!trainers ? <PanelSkeleton rows={3} /> : trainers.length === 0 ? (
            <EmptyState icon={UserCog} title="لا يوجد مدربون" />
          ) : (
            <>
              <div style={{ display: 'flex', gap: space.sm, flexWrap: 'wrap', marginBottom: space.lg }}>
                <Badge label={`${trainers.length} مدرب`} tone="violet" />
                <Badge label={`${onLeave.length} في إجازة`} tone={onLeave.length ? 'warning' : 'neutral'} />
                <Badge label={`${fullTrainers.length} مكتمل`} tone={fullTrainers.length ? 'danger' : 'neutral'} />
              </div>
              {trainers.slice(0, 5).map((t: any) => (
                <ListRow
                  key={t.id}
                  title={t.nameAr}
                  meta={`${t.department?.nameAr ?? 'بدون قسم'} · ${t.occupied}/${t.maxTrainees}`}
                  trailing={t.onLeave ? <Badge label="إجازة" tone="warning" /> : undefined}
                  onClick={() => navigate('/hospital?tab=trainers')}
                />
              ))}
            </>
          )}
        </Panel>
      </SplitGrid>

      <PanelGrid>
        <Panel title="الحالات المتأخرة" icon={AlertTriangle} tone={behind.length ? 'danger' : 'success'}
          action={<PanelLink label="التخرج" onClick={() => navigate('/hospital?tab=graduation')} />}>
          {tlLoading ? <PanelSkeleton /> : behind.length === 0 ? (
            <EmptyState icon={GraduationCap} title="لا توجد حالات متأخرة" hint="جميع المتدربين ضمن المسار المتوقع." />
          ) : (
            behind.map((t: any) => (
              <ListRow
                key={t.trainee.id}
                title={t.trainee.nameAr}
                meta={`الإنجاز ${t.completionPercentage}% · ${t.current?.departmentNameAr ?? 'بلا روتيشن'}`}
                trailing={<Badge label={t.readiness.expectedGraduationStatus === 'off_track' ? 'خارج المسار' : 'متأخر'}
                  tone={t.readiness.expectedGraduationStatus === 'off_track' ? 'danger' : 'warning'} />}
              />
            ))
          )}
        </Panel>

        <Panel title="الأعمال المعلقة" icon={Inbox} tone="warning">
          <QuickActions
            items={[
              { label: 'الطلبات الواردة', icon: Inbox, onClick: () => navigate('/hospital?tab=requests'), tone: 'warning' },
              { label: 'سلسلة القبول', icon: ClipboardCheck, onClick: () => navigate('/hospital?tab=acceptance'), tone: 'info' },
              { label: 'النداءات', icon: PhoneCall, onClick: () => navigate('/hospital?tab=calls'), tone: 'danger' },
              { label: 'التقييمات', icon: ClipboardCheck, onClick: () => navigate('/hospital?tab=logbook'), tone: 'violet' },
            ]}
          />
        </Panel>

        <Panel title="إشغال البرامج التدريبية" icon={Layers} tone="info"
          action={<PanelLink label="التفاصيل" onClick={() => navigate('/hospital?tab=capacity')} />}>
          {capacity?.programs?.length ? (
            capacity.programs.slice(0, 5).map((p: any) => (
              <StatBar key={p.allocation.id} label={p.program?.nameAr ?? 'برنامج'}
                value={p.occupancy.occupied} max={p.occupancy.capacity || 1} />
            ))
          ) : (
            <EmptyState icon={Layers} title="لم تُحدَّد سعة برامج" hint="حدّد سعة البرامج من قسم الطاقة الاستيعابية." />
          )}
        </Panel>
      </PanelGrid>
    </div>
  );
};

export default HospitalDashboard;
