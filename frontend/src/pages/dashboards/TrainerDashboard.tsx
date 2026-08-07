import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, BookOpen, CalendarCheck, CheckSquare, ClipboardCheck,
  PhoneCall, Stethoscope, UserCog, Users,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  Badge, EmptyState, KpiCard, KpiGrid, ListRow, Panel, PanelGrid, PanelLink,
  PanelSkeleton, PageHeader, QuickActions, SplitGrid, StatBar, colour, space,
} from '../../components/ui';

/**
 * Trainer's day.
 *
 * A trainer supervises a handful of trainees, so this board is a worklist, not
 * an analytics view: who is with me today, what have they got left, and what
 * needs my signature.
 */
export const TrainerDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: dash, isLoading } = useQuery({
    queryKey: ['tr-dashboard'],
    queryFn: async () => {
      const res = await apiClient.get('/operations/trainer/dashboard').catch(() => ({ data: { data: null } }));
      return res.data?.data ?? null;
    },
  });

  const { data: interns } = useQuery({
    queryKey: ['tr-interns'],
    queryFn: async () => {
      const res = await apiClient.get('/operations/trainer/assigned-interns').catch(() => ({ data: { data: [] } }));
      return res.data?.data ?? [];
    },
  });

  const { data: me } = useQuery({
    queryKey: ['tr-me'],
    queryFn: async () => {
      const res = await apiClient.get('/trainers/me').catch(() => ({ data: null }));
      return res.data?.data ?? res.data ?? null;
    },
  });

  const trainees = interns ?? [];
  const capacity = me?.maxTrainees ?? 0;
  const occupied = trainees.length;

  const pendingLogs = dash?.pendingCaseLogs ?? dash?.logbook?.pending ?? 0;
  const pendingEvals = dash?.pendingEvaluations ?? 0;
  const activeCalls = dash?.activeCalls ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: space['2xl'] }}>
      <PageHeader
        eyebrow="CLINICAL TRAINER"
        icon={UserCog}
        title={`يومك التدريبي`}
        subtitle={`${user?.nameAr ?? ''} — ${me?.department?.nameAr ?? user?.activeOrganization?.nameAr ?? ''}`}
      />

      <KpiGrid min={200}>
        <KpiCard label="طلابي اليوم" value={occupied} icon={Users} tone="primary"
          hint={capacity ? `من سعة ${capacity}` : undefined} loading={isLoading} />
        <KpiCard label="سجلات بانتظار الاعتماد" value={pendingLogs} icon={BookOpen} tone="warning"
          onClick={() => navigate('/logbook')} />
        <KpiCard label="تقييمات مطلوبة" value={pendingEvals} icon={ClipboardCheck} tone="violet"
          onClick={() => navigate('/logbook')} />
        <KpiCard label="نداءات نشطة" value={activeCalls} icon={PhoneCall}
          tone={activeCalls > 0 ? 'danger' : 'success'} />
      </KpiGrid>

      <SplitGrid>
        <Panel
          title="متدربيّ المسندون"
          icon={Users}
          action={<PanelLink label="عرض الكل" onClick={() => navigate('/org-members')} />}
        >
          {isLoading ? <PanelSkeleton rows={5} /> : trainees.length === 0 ? (
            <EmptyState icon={Users} title="لا يوجد متدربون مسندون" hint="سيظهر هنا كل متدرب يُسند إليك." />
          ) : (
            trainees.slice(0, 8).map((t: any) => (
              <ListRow
                key={t.id}
                title={t.person?.nameAr ?? t.nameAr ?? '—'}
                meta={`${t.traineeNumber ?? ''} · ${t.level ?? ''}`}
                trailing={<Badge label={t.applicationStatus ?? 'نشط'}
                  tone={t.applicationStatus === 'active' ? 'success' : 'neutral'} />}
                onClick={() => navigate('/org-members')}
              />
            ))
          )}
        </Panel>

        <Panel title="سعتي التدريبية" icon={Stethoscope} tone="info">
          <StatBar label="الإشغال الحالي" value={occupied} max={capacity || 1} />
          <div style={{ marginTop: space.lg, paddingTop: space.lg, borderTop: `1px solid ${colour.border}` }}>
            <QuickActions
              items={[
                { label: 'السجل السريري', icon: BookOpen, onClick: () => navigate('/logbook'), tone: 'primary' },
                { label: 'سلسلة القبول', icon: CheckSquare, onClick: () => navigate('/acceptance-chain'), tone: 'info' },
                { label: 'البلاغات', icon: AlertTriangle, onClick: () => navigate('/incidents'), tone: 'danger' },
              ]}
            />
          </div>
        </Panel>
      </SplitGrid>

      <PanelGrid>
        <Panel title="الحضور" icon={CalendarCheck} tone="violet">
          {dash?.attendanceToday ? (
            <StatBar label="حضور اليوم" value={dash.attendanceToday.present ?? 0} max={dash.attendanceToday.total || 1} />
          ) : (
            <EmptyState icon={CalendarCheck} title="لا توجد بيانات حضور اليوم" />
          )}
        </Panel>

        <Panel title="خطة التدريب" icon={ClipboardCheck} tone="primary">
          <EmptyState icon={ClipboardCheck} title="خطط المتدربين"
            hint="افتح ملف أي متدرب لعرض خطته التدريبية وتقدمه في الروتيشنات." />
        </Panel>

        <Panel title="آخر النشاطات" icon={BookOpen} tone="neutral">
          {dash?.recentLogs?.length ? (
            dash.recentLogs.slice(0, 5).map((l: any) => (
              <ListRow key={l.id} title={l.diagnosis ?? 'سجل حالة'} meta={l.status} />
            ))
          ) : (
            <EmptyState icon={BookOpen} title="لا توجد نشاطات حديثة" />
          )}
        </Panel>
      </PanelGrid>
    </div>
  );
};

export default TrainerDashboard;
