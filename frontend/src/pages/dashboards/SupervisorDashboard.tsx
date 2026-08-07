import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, BookOpen, CalendarCheck, CheckSquare, ClipboardCheck,
  GraduationCap, TrendingDown, UserCog, Users,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  Badge, EmptyState, KpiCard, KpiGrid, ListRow, Panel, PanelGrid, PanelLink,
  PanelSkeleton, PageHeader, QuickActions, SplitGrid, StatBar, space,
} from '../../components/ui';

/**
 * Training supervisor.
 *
 * The supervisor sits between the hospital administration and the trainers:
 * they chase progress and sign-offs rather than manage capacity. This board is
 * therefore a follow-up queue — who is slipping, what is unsigned, who is due
 * an evaluation — and deliberately excludes the capacity and request panels the
 * hospital administrator owns.
 */
export const SupervisorDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: timeline, isLoading } = useQuery({
    queryKey: ['sv-timeline'],
    queryFn: async () => {
      const res = await apiClient
        .get('/timeline/dashboard', { params: { scope: 'hospital', limit: 200 } })
        .catch(() => ({ data: { data: null } }));
      return res.data?.data ?? null;
    },
  });

  const { data: trainers } = useQuery({
    queryKey: ['sv-trainers'],
    queryFn: async () => {
      const res = await apiClient.get('/trainers/workspace-cards').catch(() => ({ data: { data: [] } }));
      return res.data?.data ?? [];
    },
  });

  const { data: logbook } = useQuery({
    queryKey: ['sv-logbook'],
    queryFn: async () => {
      const res = await apiClient.get('/logbook/case-logs').catch(() => ({ data: { data: [] } }));
      return res.data?.data ?? [];
    },
  });

  const trainees = timeline?.trainees ?? [];
  const slipping = trainees
    .filter((t: any) => ['at_risk', 'off_track'].includes(t.readiness?.expectedGraduationStatus))
    .sort((a: any, b: any) => a.completionPercentage - b.completionPercentage);
  const pendingLogs = (logbook ?? []).filter((l: any) => ['submitted', 'trainer_approved'].includes(l.status));
  const pendingEvaluations = trainees.reduce(
    (s: number, t: any) => s + (t.readiness?.remaining?.evaluations ?? 0), 0);
  const lowAttendance = trainees
    .filter((t: any) => (t.readiness?.attendance?.rate ?? 100) < 80)
    .sort((a: any, b: any) => (a.readiness?.attendance?.rate ?? 0) - (b.readiness?.attendance?.rate ?? 0));
  const unqualified = (trainers ?? []).filter((t: any) => (t.qualifiedPrograms?.length ?? 0) === 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: space['2xl'] }}>
      <PageHeader
        eyebrow="TRAINING SUPERVISION"
        icon={CheckSquare}
        title="لوحة الإشراف التدريبي"
        subtitle={`${user?.activeOrganization?.nameAr ?? ''} — متابعة تقدم المتدربين والاعتمادات المعلقة`}
      />

      <KpiGrid>
        <KpiCard label="متدربون تحت الإشراف" value={trainees.length} icon={Users} tone="primary" loading={isLoading} />
        <KpiCard label="متعثرون" value={slipping.length} icon={TrendingDown}
          tone={slipping.length ? 'danger' : 'success'} loading={isLoading} />
        <KpiCard label="سجلات بانتظار الاعتماد" value={pendingLogs.length} icon={BookOpen} tone="warning"
          onClick={() => navigate('/logbook')} />
        <KpiCard label="تقييمات معلّقة" value={pendingEvaluations} icon={ClipboardCheck} tone="violet" loading={isLoading} />
        <KpiCard label="حضور منخفض" value={lowAttendance.length} icon={CalendarCheck}
          tone={lowAttendance.length ? 'warning' : 'success'} hint="أقل من 80%" loading={isLoading} />
        <KpiCard label="جاهزون للتخرج" value={timeline?.readyForGraduation ?? 0} icon={GraduationCap} tone="success"
          loading={isLoading} onClick={() => navigate('/hospital?tab=graduation')} />
      </KpiGrid>

      <SplitGrid>
        <Panel title="متدربون يحتاجون متابعة" icon={TrendingDown} tone="danger"
          action={<PanelLink label="مساحة العمل" onClick={() => navigate('/hospital')} />}>
          {isLoading ? <PanelSkeleton rows={5} /> : slipping.length === 0 ? (
            <EmptyState icon={CheckSquare} title="لا يوجد متعثرون" hint="جميع المتدربين ضمن المسار المتوقع." />
          ) : (
            slipping.slice(0, 8).map((t: any) => (
              <ListRow
                key={t.trainee.id}
                title={t.trainee.nameAr}
                meta={`الإنجاز ${t.completionPercentage}% · ${t.current?.departmentNameAr ?? 'بلا روتيشن'} · ${t.current?.trainerNameAr ?? ''}`}
                trailing={<Badge
                  label={t.readiness.expectedGraduationStatus === 'off_track' ? 'خارج المسار' : 'متأخر'}
                  tone={t.readiness.expectedGraduationStatus === 'off_track' ? 'danger' : 'warning'} />}
              />
            ))
          )}
        </Panel>

        <Panel title="الحضور المنخفض" icon={CalendarCheck} tone="warning">
          {lowAttendance.length === 0 ? (
            <EmptyState icon={CalendarCheck} title="الحضور منتظم" />
          ) : (
            lowAttendance.slice(0, 6).map((t: any) => (
              <StatBar key={t.trainee.id} label={t.trainee.nameAr}
                value={t.readiness.attendance.expectedDays - t.readiness.attendance.missingDays}
                max={t.readiness.attendance.expectedDays || 1} />
            ))
          )}
        </Panel>
      </SplitGrid>

      <PanelGrid>
        <Panel title="بانتظار اعتمادي" icon={BookOpen} tone="warning"
          action={<PanelLink label="السجل السريري" onClick={() => navigate('/logbook')} />}>
          {pendingLogs.length === 0 ? (
            <EmptyState icon={BookOpen} title="لا توجد سجلات معلقة" />
          ) : (
            pendingLogs.slice(0, 6).map((l: any) => (
              <ListRow key={l.id} title={l.diagnosis ?? 'سجل حالة'}
                meta={l.traineeProfile?.person?.nameAr ?? ''}
                trailing={<Badge label={l.status} tone="warning" />}
                onClick={() => navigate('/logbook')} />
            ))
          )}
        </Panel>

        <Panel title="تنبيهات المدربين" icon={UserCog} tone={unqualified.length ? 'danger' : 'success'}>
          {unqualified.length === 0 ? (
            <EmptyState icon={UserCog} title="جميع المدربين مؤهلون" hint="كل مدرب مرتبط ببرنامج تدريبي واحد على الأقل." />
          ) : (
            unqualified.slice(0, 6).map((t: any) => (
              <ListRow key={t.id} title={t.nameAr} meta={t.department?.nameAr ?? 'بدون قسم'}
                trailing={<Badge label="غير مؤهل" tone="danger" />}
                onClick={() => navigate('/hospital?tab=trainers')} />
            ))
          )}
        </Panel>

        <Panel title="إجراءات سريعة" icon={CheckSquare} tone="neutral">
          <QuickActions
            items={[
              { label: 'سلسلة القبول', icon: CheckSquare, onClick: () => navigate('/acceptance-chain'), tone: 'primary' },
              { label: 'السجل السريري', icon: BookOpen, onClick: () => navigate('/logbook'), tone: 'warning' },
              { label: 'المدربون', icon: UserCog, onClick: () => navigate('/hospital?tab=trainers'), tone: 'violet' },
              { label: 'البلاغات', icon: AlertTriangle, onClick: () => navigate('/incidents'), tone: 'danger' },
            ]}
          />
        </Panel>
      </PanelGrid>
    </div>
  );
};

export default SupervisorDashboard;
