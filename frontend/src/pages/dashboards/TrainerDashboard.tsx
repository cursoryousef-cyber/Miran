import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogTitle, DialogContent, CircularProgress, Button } from '@mui/material';
import {
  AlertTriangle, BookOpen, CalendarCheck, CheckSquare, ClipboardCheck,
  PhoneCall, Stethoscope, UserCog, Users, Inbox, LayoutGrid, UserPlus,
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

  const [selectedTraineeId, setSelectedTraineeId] = useState<string | null>(null);

  const { data: recentLogs } = useQuery({
    queryKey: ['tr-recent-logs'],
    queryFn: async () => {
      const res = await apiClient.get('/logbook/my-logs').catch(() => ({ data: { data: [] } }));
      return res.data?.data ?? [];
    },
  });

  const { data: groups } = useQuery({
    queryKey: ['tr-groups'],
    queryFn: async () => {
      const res = await apiClient.get('/operations/trainer/groups').catch(() => ({ data: { data: [] } }));
      return res.data?.data ?? [];
    },
  });

  const { data: incoming } = useQuery({
    queryKey: ['tr-incoming'],
    queryFn: async () => {
      const res = await apiClient.get('/operations/trainer/incoming-requests').catch(() => ({ data: { data: null } }));
      return res.data?.data ?? null;
    },
  });

  const queryClient = useQueryClient();
  const { data: assignmentRequests } = useQuery({
    queryKey: ['tr-assignment-requests'],
    queryFn: async () => {
      const res = await apiClient.get('/operations/trainer/assignment-requests').catch(() => ({ data: { data: [] } }));
      return res.data?.data ?? [];
    },
  });

  const acceptMutation = useMutation({
    mutationFn: (rotationId: string) => apiClient.post(`/operations/trainer/assignment-requests/${rotationId}/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tr-assignment-requests'] });
      queryClient.invalidateQueries({ queryKey: ['tr-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['tr-interns'] });
    },
  });
  const rejectMutation = useMutation({
    mutationFn: ({ rotationId, reason }: { rotationId: string; reason: string }) =>
      apiClient.post(`/operations/trainer/assignment-requests/${rotationId}/reject`, { reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tr-assignment-requests'] }),
  });

  const { data: traineeDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['tr-trainee-detail', selectedTraineeId],
    queryFn: async () => {
      const res = await apiClient.get(`/operations/trainer/trainee/${selectedTraineeId}`).catch(() => ({ data: { data: null } }));
      return res.data?.data ?? null;
    },
    enabled: !!selectedTraineeId,
  });

  const trainees = interns ?? [];
  const capacity = me?.maxTrainees ?? 0;
  const occupied = trainees.length;

  const pendingLogs = dash?.pendingLogbook ?? 0;
  const pendingEvals = dash?.pendingEvaluations ?? 0;
  const activeCalls = dash?.openCalls ?? 0;
  const presentToday = dash?.presentToday ?? 0;
  const notCheckedIn = dash?.absentOrNotCheckedIn ?? 0;

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
                onClick={() => setSelectedTraineeId(t.id)}
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

      <Panel title="طلبات إسناد المتدربين" icon={UserPlus} tone="warning">
        {assignmentRequests?.length ? (
          assignmentRequests.map((r: any) => (
            <ListRow
              key={r.id}
              title={r.traineeProfile?.person?.nameAr ?? '—'}
              meta={`${r.traineeProfile?.program?.nameAr ?? ''} · ${r.traineeProfile?.sponsorOrganization?.nameAr ?? ''} · ${r.organization?.nameAr ?? ''} · ${r.department?.nameAr ?? ''} · ${String(r.startDate).slice(0, 10)} → ${String(r.endDate).slice(0, 10)}`}
              trailing={
                <div style={{ display: 'flex', gap: space.sm }}>
                  <Button size="small" variant="contained" color="success"
                    disabled={acceptMutation.isPending}
                    onClick={() => acceptMutation.mutate(r.id)}>
                    قبول
                  </Button>
                  <Button size="small" variant="outlined" color="error"
                    disabled={rejectMutation.isPending}
                    onClick={() => {
                      const reason = window.prompt('سبب الرفض (إلزامي):');
                      if (reason?.trim()) rejectMutation.mutate({ rotationId: r.id, reason: reason.trim() });
                    }}>
                    رفض
                  </Button>
                </div>
              }
            />
          ))
        ) : (
          <EmptyState icon={UserPlus} title="لا توجد طلبات إسناد بانتظار قرارك" />
        )}
      </Panel>

      <PanelGrid>
        <Panel title="الحضور" icon={CalendarCheck} tone="violet">
          {occupied > 0 ? (
            <>
              <StatBar label="حاضر اليوم" value={presentToday} max={occupied || 1} />
              <div style={{ marginTop: space.sm, fontSize: 12.5, color: colour.muted }}>
                لم يسجل / غائب: {notCheckedIn}
              </div>
            </>
          ) : (
            <EmptyState icon={CalendarCheck} title="لا توجد بيانات حضور اليوم" />
          )}
        </Panel>

        <Panel title="خطة التدريب" icon={ClipboardCheck} tone="primary">
          <EmptyState icon={ClipboardCheck} title="خطط المتدربين"
            hint="افتح ملف أي متدرب لعرض خطته التدريبية وتقدمه في الروتيشنات." />
        </Panel>

        <Panel title="آخر النشاطات" icon={BookOpen} tone="neutral">
          {recentLogs?.length ? (
            recentLogs.slice(0, 5).map((l: any) => (
              <ListRow key={l.id} title={l.diagnosis ?? 'سجل حالة'}
                meta={`${l.traineeProfile?.person?.nameAr ?? ''} · ${l.status}`} />
            ))
          ) : (
            <EmptyState icon={BookOpen} title="لا توجد نشاطات حديثة" />
          )}
        </Panel>
      </PanelGrid>

      <PanelGrid>
        <Panel title="مجموعات المتدربين" icon={LayoutGrid} tone="info">
          {groups?.length ? (
            groups.map((g: any) => (
              <ListRow key={g.departmentId} title={g.departmentNameAr}
                meta={`${g.trainees.length} متدرب`} />
            ))
          ) : (
            <EmptyState icon={LayoutGrid} title="لا توجد مجموعات حالياً" />
          )}
        </Panel>

        <Panel title="الطلبات الواردة" icon={Inbox} tone="warning">
          {incoming && (incoming.evaluations?.length || incoming.clinicalLogs?.length) ? (
            <>
              {incoming.evaluations?.map((e: any) => (
                <ListRow key={`ev-${e.id}`} title="تقييم مطلوب" meta={e.rotationId ?? ''} trailing={<Badge label="تقييم" tone="violet" />} />
              ))}
              {incoming.clinicalLogs?.map((l: any) => (
                <ListRow key={`log-${l.id}`} title={l.traineeProfile?.person?.nameAr ?? 'سجل سريري'}
                  meta={l.diagnosis} trailing={<Badge label="اعتماد سجل" tone="warning" />}
                  onClick={() => navigate('/logbook')} />
              ))}
            </>
          ) : (
            <EmptyState icon={Inbox} title="لا توجد طلبات بانتظار إجراءك" />
          )}
        </Panel>
      </PanelGrid>

      <Dialog open={!!selectedTraineeId} onClose={() => setSelectedTraineeId(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{traineeDetail?.profile?.person?.nameAr ?? 'ملف المتدرب'}</DialogTitle>
        <DialogContent>
          {detailLoading ? (
            <div style={{ display: 'grid', placeItems: 'center', padding: 40 }}><CircularProgress size={28} /></div>
          ) : traineeDetail ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: space.lg, paddingBottom: space.lg }}>
              <div style={{ fontSize: 13, color: colour.muted }}>
                {traineeDetail.profile.traineeNumber} · {traineeDetail.profile.organization?.nameAr}
              </div>
              <StatBar label="نسبة الحضور" value={traineeDetail.attendanceRate ?? 0} max={100} />
              <Panel title="الروتيشن" icon={Stethoscope} tone="primary">
                {traineeDetail.rotation ? (
                  <ListRow title={traineeDetail.rotation.department?.nameAr}
                    meta={`${String(traineeDetail.rotation.startDate).slice(0, 10)} → ${String(traineeDetail.rotation.endDate).slice(0, 10)}`} />
                ) : <EmptyState icon={Stethoscope} title="لا يوجد روتيشن نشط" />}
              </Panel>
              <Panel title="المهام" icon={CheckSquare} tone="warning">
                {traineeDetail.tasks?.length ? traineeDetail.tasks.slice(0, 5).map((t: any) => (
                  <ListRow key={t.id} title={t.titleAr} meta={t.status} />
                )) : <EmptyState icon={CheckSquare} title="لا توجد مهام" />}
              </Panel>
              <Panel title="السجل السريري" icon={BookOpen} tone="info">
                {traineeDetail.clinicalLogs?.length ? traineeDetail.clinicalLogs.slice(0, 5).map((l: any) => (
                  <ListRow key={l.id} title={l.diagnosis} meta={l.status} />
                )) : <EmptyState icon={BookOpen} title="لا توجد سجلات" />}
              </Panel>
            </div>
          ) : (
            <EmptyState icon={Users} title="تعذر تحميل بيانات المتدرب" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TrainerDashboard;
