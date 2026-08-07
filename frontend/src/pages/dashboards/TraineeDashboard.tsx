import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CircularProgress } from '@mui/material';
import {
  BellRing, BookOpen, CalendarCheck, CheckCircle2, ClipboardCheck, FileSignature,
  GraduationCap, MapPin, Route, Target,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  Badge, EmptyState, KpiCard, KpiGrid, ListRow, Metric, MetricRow, Panel,
  PanelGrid, PanelLink, PageHeader, QuickActions, SplitGrid, StatBar,
  colour, font, radius, space, toneColour,
} from '../../components/ui';

/**
 * The trainee's own journey.
 *
 * This is the only board built around a single person, so it leads with where
 * they are in the plan and what is left, using the timeline as the source for
 * every progress figure.
 */
export const TraineeDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: timeline, isLoading } = useQuery({
    queryKey: ['te-timeline'],
    queryFn: async () => {
      const res = await apiClient.get('/timeline/me').catch(() => ({ data: { data: null } }));
      return res.data?.data ?? null;
    },
  });

  const { data: dash } = useQuery({
    queryKey: ['te-dashboard'],
    queryFn: async () => {
      const res = await apiClient.get('/operations/trainee/dashboard').catch(() => ({ data: { data: null } }));
      return res.data?.data ?? null;
    },
  });

  if (isLoading) {
    return <div style={{ display: 'grid', placeItems: 'center', padding: 80 }}><CircularProgress sx={{ color: colour.primary }} /></div>;
  }

  const current = timeline?.current;
  const readiness = timeline?.readiness;
  const rotations = timeline?.rotations ?? [];
  const completion = timeline?.completionPercentage ?? 0;

  const statusTone = (s?: string) =>
    s === 'completed' ? 'success' : s === 'active' ? 'primary'
      : s === 'cancelled' || s === 'skipped' ? 'danger' : 'neutral';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: space['2xl'] }}>
      <PageHeader
        eyebrow="MY TRAINING JOURNEY"
        icon={GraduationCap}
        title={`مرحباً، ${user?.nameAr ?? ''}`}
        subtitle={
          timeline?.program?.nameAr
            ? `${timeline.program.nameAr}${timeline?.trainingPlanVersion ? ` — ${timeline.trainingPlanVersion.label ?? ''}` : ''}`
            : 'برنامج التدريب'
        }
      />

      {/* Progress hero — the single most important thing for a trainee. */}
      <div className="glass-card" style={{ padding: space['2xl'] }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: space['2xl'], flexWrap: 'wrap',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: space.xl, minWidth: 0 }}>
            <div style={{ position: 'relative', width: 92, height: 92, flexShrink: 0 }}>
              <CircularProgress variant="determinate" value={100} size={92} thickness={4}
                sx={{ color: colour.subtle, position: 'absolute' }} />
              <CircularProgress variant="determinate" value={completion} size={92} thickness={4}
                sx={{ color: colour.primary, position: 'absolute' }} />
              <div style={{
                position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
                fontSize: 20, fontWeight: 800, color: colour.text,
              }}>
                {completion}%
              </div>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: font.label, color: colour.muted, fontWeight: 600 }}>نسبة الإنجاز الكلية</div>
              <div style={{ fontSize: font.sectionTitle, fontWeight: 800, color: colour.text, marginTop: 2 }}>
                {current ? current.departmentNameAr : 'لا يوجد روتيشن نشط'}
              </div>
              {current && (
                <div style={{ fontSize: font.caption, color: colour.muted, marginTop: 4 }}>
                  المدرب: {current.trainerNameAr ?? '—'} · متبقٍ {current.remainingDays} يوم
                </div>
              )}
            </div>
          </div>
          <MetricRow min={104}>
            <Metric label="مكتملة" value={timeline?.rotationSummary?.completed ?? 0} tone="success" />
            <Metric label="متبقية" value={timeline?.rotationSummary?.remaining ?? 0} tone="info" />
            <Metric label="تقدم التخرج" value={`${timeline?.graduationProgress ?? 0}%`} tone="primary" />
          </MetricRow>
        </div>
      </div>

      <KpiGrid min={200}>
        <KpiCard label="الحضور" value={`${readiness?.attendance?.rate ?? 0}%`} icon={CalendarCheck} tone="violet"
          hint={readiness?.attendance ? `${readiness.attendance.missingDays} يوم غياب` : undefined} />
        <KpiCard label="السجل السريري" value={dash?.logbook?.approved ?? 0} icon={BookOpen} tone="primary"
          hint={dash?.logbook ? `${dash.logbook.pending} بانتظار الاعتماد` : undefined}
          onClick={() => navigate('/logbook')} />
        <KpiCard label="تقييمات متبقية" value={readiness?.remaining?.evaluations ?? 0} icon={ClipboardCheck} tone="warning" />
        <KpiCard label="إجراءات متبقية" value={readiness?.remaining?.procedures ?? 0} icon={Target} tone="info" />
      </KpiGrid>

      <SplitGrid>
        <Panel title="جدولي التدريبي" icon={Route}
          action={<PanelLink label="السجل السريري" onClick={() => navigate('/logbook')} />}>
          {rotations.length === 0 ? (
            <EmptyState icon={Route} title="لم يبدأ جدولك بعد" hint="سيظهر جدول الروتيشنات فور تفعيل تدريبك." />
          ) : (
            rotations.map((r: any) => {
              const tone = statusTone(r.status);
              const c = toneColour(tone as any);
              return (
                <ListRow
                  key={r.rotationId}
                  leading={
                    <div style={{
                      width: 28, height: 28, borderRadius: radius.sm, background: c.bg, color: c.fg,
                      display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0,
                    }}>
                      {r.sequenceOrder ?? '•'}
                    </div>
                  }
                  title={r.departmentNameAr}
                  meta={`${String(r.startDate).slice(0, 10)} → ${String(r.endDate).slice(0, 10)} · ${r.trainerNameAr ?? ''}`}
                  trailing={<Badge label={`${r.progressPercentage}%`} tone={tone as any} />}
                />
              );
            })
          )}
        </Panel>

        <Panel title="ما تبقى للتخرج" icon={CheckCircle2} tone={readiness?.readyForGraduation ? 'success' : 'warning'}>
          {readiness?.readyForGraduation ? (
            <EmptyState icon={CheckCircle2} title="استوفيت جميع المتطلبات" hint="ملفك جاهز لاعتماد التخرج." />
          ) : readiness?.remainingRequirements?.length ? (
            readiness.remainingRequirements.map((req: string, i: number) => (
              <ListRow key={i} title={req} />
            ))
          ) : (
            <EmptyState icon={Target} title="لا توجد متطلبات مسجلة" />
          )}
        </Panel>
      </SplitGrid>

      <PanelGrid>
        <Panel title="مهامي" icon={ClipboardCheck} tone="warning">
          {dash?.tasks?.length ? (
            dash.tasks.slice(0, 5).map((t: any) => (
              <ListRow key={t.id} title={t.titleAr}
                meta={t.dueDate ? `الاستحقاق: ${String(t.dueDate).slice(0, 10)}` : undefined} />
            ))
          ) : (
            <EmptyState icon={ClipboardCheck} title="لا توجد مهام معلقة" />
          )}
        </Panel>

        <Panel title="التنبيهات" icon={BellRing} tone="info">
          {dash?.notifications?.length ? (
            dash.notifications.slice(0, 5).map((n: any) => (
              <ListRow key={n.id} title={n.titleAr}
                meta={new Date(n.createdAt).toLocaleDateString('ar-SA')} />
            ))
          ) : (
            <EmptyState icon={BellRing} title="لا توجد تنبيهات" />
          )}
        </Panel>

        <Panel title="روابط سريعة" icon={MapPin} tone="neutral">
          <QuickActions
            items={[
              { label: 'السجل السريري', icon: BookOpen, onClick: () => navigate('/logbook'), tone: 'primary' },
              { label: 'الإقرارات', icon: FileSignature, onClick: () => navigate('/declarations'), tone: 'info' },
              { label: 'البلاغات', icon: BellRing, onClick: () => navigate('/incidents'), tone: 'danger' },
            ]}
          />
        </Panel>
      </PanelGrid>
    </div>
  );
};

export default TraineeDashboard;
