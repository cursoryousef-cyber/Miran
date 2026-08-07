import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Award, BookOpen, CheckCircle2, ClipboardCheck, FileSpreadsheet,
  GraduationCap, TrendingUp, Users,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  Badge, EmptyState, KpiCard, KpiGrid, ListRow, Panel, PanelGrid, PanelLink,
  PanelSkeleton, PageHeader, QuickActions, SplitGrid, StatBar, space,
} from '../../components/ui';

/**
 * Academic supervision board.
 *
 * The academic supervisor signs off outcomes rather than running rotations, so
 * this board is an approval queue: who has finished, who is close, and what is
 * still unverified. Figures come from the timeline so they agree with what the
 * hospital and university see.
 */
export const AcademicDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: timeline, isLoading } = useQuery({
    queryKey: ['ac-timeline'],
    queryFn: async () => {
      const res = await apiClient
        .get('/timeline/dashboard', { params: { scope: 'hospital', limit: 200 } })
        .catch(() => ({ data: { data: null } }));
      return res.data?.data ?? null;
    },
  });

  const { data: logbook } = useQuery({
    queryKey: ['ac-logbook'],
    queryFn: async () => {
      const res = await apiClient.get('/logbook/case-logs').catch(() => ({ data: { data: [] } }));
      return res.data?.data ?? [];
    },
  });

  const trainees = timeline?.trainees ?? [];
  const ready = trainees.filter((t: any) => t.readiness?.readyForGraduation);
  const nearlyDone = trainees
    .filter((t: any) => !t.readiness?.readyForGraduation && t.graduationProgress >= 70)
    .sort((a: any, b: any) => b.graduationProgress - a.graduationProgress);
  const graduated = trainees.filter((t: any) => t.readiness?.expectedGraduationStatus === 'graduated');

  const pendingLogs = (logbook ?? []).filter((l: any) =>
    ['submitted', 'trainer_approved'].includes(l.status));
  const pendingEvaluations = trainees.reduce(
    (s: number, t: any) => s + (t.readiness?.remaining?.evaluations ?? 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: space['2xl'] }}>
      <PageHeader
        eyebrow="ACADEMIC SUPERVISION"
        icon={Award}
        title="لوحة الإشراف الأكاديمي"
        subtitle={`${user?.nameAr ?? ''} — مراجعة واعتماد نتائج البرامج التدريبية`}
      />

      <KpiGrid>
        <KpiCard label="متدربون تحت الإشراف" value={trainees.length} icon={Users} tone="primary" loading={isLoading} />
        <KpiCard label="جاهزون للاعتماد" value={ready.length} icon={CheckCircle2} tone="success"
          loading={isLoading} onClick={() => navigate('/graduation')} />
        <KpiCard label="قاربوا الإنجاز" value={nearlyDone.length} icon={TrendingUp} tone="info"
          hint="70% فأكثر" loading={isLoading} />
        <KpiCard label="سجلات بانتظار الاعتماد" value={pendingLogs.length} icon={BookOpen} tone="warning"
          onClick={() => navigate('/logbook')} />
        <KpiCard label="تقييمات نهائية معلقة" value={pendingEvaluations} icon={ClipboardCheck} tone="violet"
          loading={isLoading} />
        <KpiCard label="متخرجون" value={graduated.length} icon={GraduationCap} tone="success" loading={isLoading} />
      </KpiGrid>

      <SplitGrid>
        <Panel title="بانتظار اعتماد التخرج" icon={CheckCircle2} tone="success"
          action={<PanelLink label="إدارة التخرج" onClick={() => navigate('/graduation')} />}>
          {isLoading ? <PanelSkeleton rows={5} /> : ready.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="لا يوجد متدربون جاهزون"
              hint="يظهر هنا كل متدرب استوفى متطلبات خطته التدريبية." />
          ) : (
            ready.slice(0, 8).map((t: any) => (
              <ListRow
                key={t.trainee.id}
                title={t.trainee.nameAr}
                meta={`${t.trainee.traineeNumber ?? ''} · ${t.program?.nameAr ?? ''}`}
                trailing={<Badge label="جاهز" tone="success" />}
                onClick={() => navigate('/graduation')}
              />
            ))
          )}
        </Panel>

        <Panel title="مؤشرات الإنجاز" icon={TrendingUp} tone="info">
          {trainees.length === 0 ? (
            <EmptyState icon={TrendingUp} title="لا توجد بيانات" />
          ) : (
            <>
              <StatBar label="متوسط الإنجاز" value={timeline?.averageCompletion ?? 0} max={100} tone="primary" />
              <StatBar label="متوسط تقدم التخرج" value={timeline?.averageGraduationProgress ?? 0} max={100} tone="info" />
              <div style={{ display: 'flex', gap: space.sm, flexWrap: 'wrap', marginTop: space.lg }}>
                <Badge label={`${timeline?.onTrack ?? 0} في المسار`} tone="success" />
                <Badge label={`${timeline?.atRisk ?? 0} متأخر`} tone="warning" />
                <Badge label={`${timeline?.offTrack ?? 0} خارج المسار`} tone="danger" />
              </div>
            </>
          )}
        </Panel>
      </SplitGrid>

      <PanelGrid>
        <Panel title="قاربوا على الإنجاز" icon={TrendingUp} tone="info">
          {nearlyDone.length === 0 ? (
            <EmptyState icon={TrendingUp} title="لا يوجد متدربون قاربوا الإنجاز" />
          ) : (
            nearlyDone.slice(0, 6).map((t: any) => (
              <ListRow key={t.trainee.id} title={t.trainee.nameAr}
                meta={`متبقٍ: ${t.readiness?.remainingRequirements?.[0] ?? '—'}`}
                trailing={<Badge label={`${t.graduationProgress}%`} tone="info" />} />
            ))
          )}
        </Panel>

        <Panel title="السجلات بانتظار الاعتماد" icon={BookOpen} tone="warning"
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

        <Panel title="إجراءات سريعة" icon={Award} tone="neutral">
          <QuickActions
            items={[
              { label: 'إدارة التخرج', icon: GraduationCap, onClick: () => navigate('/graduation'), tone: 'success' },
              { label: 'السجل السريري', icon: BookOpen, onClick: () => navigate('/logbook'), tone: 'primary' },
              { label: 'التقارير', icon: FileSpreadsheet, onClick: () => navigate('/reports'), tone: 'info' },
              { label: 'الدفعات الأكاديمية', icon: ClipboardCheck, onClick: () => navigate('/intakes'), tone: 'violet' },
            ]}
          />
        </Panel>
      </PanelGrid>
    </div>
  );
};

export default AcademicDashboard;
