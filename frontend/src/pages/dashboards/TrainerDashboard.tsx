import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogTitle, DialogContent, CircularProgress, Button } from '@mui/material';
import {
  AlertTriangle, BookOpen, CalendarCheck, CheckSquare, ClipboardCheck,
  PhoneCall, Stethoscope, UserCog, Users, Inbox, LayoutGrid, UserPlus, Zap
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  Badge, EmptyState, KpiCard, KpiGrid, ListRow, Panel, PanelGrid, PanelLink,
  PanelSkeleton, PageHeader, QuickActions, SplitGrid, StatBar, colour, space,
} from '../../components/ui';

export const TrainerDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: dash, isLoading, error: dashError, refetch: refetchDash } = useQuery({
    queryKey: ['tr-dashboard'],
    queryFn: async () => {
      const res = await apiClient.get('/operations/trainer/dashboard');
      return res.data?.data ?? null;
    },
  });

  const { data: interns, error: internsError, refetch: refetchInterns } = useQuery({
    queryKey: ['tr-interns'],
    queryFn: async () => {
      const res = await apiClient.get('/operations/trainer/assigned-interns');
      return res.data?.data ?? [];
    },
  });

  const { data: me, error: meError, refetch: refetchMe } = useQuery({
    queryKey: ['tr-me'],
    queryFn: async () => {
      const res = await apiClient.get('/trainers/me');
      return res.data?.data ?? res.data ?? null;
    },
  });

  const [selectedTraineeId, setSelectedTraineeId] = useState<string | null>(null);

  const { data: recentLogs } = useQuery({
    queryKey: ['tr-recent-logs'],
    queryFn: async () => {
      const res = await apiClient.get('/logbook/my-logs');
      return res.data?.data ?? [];
    },
  });

  const { data: groups } = useQuery({
    queryKey: ['tr-groups'],
    queryFn: async () => {
      const res = await apiClient.get('/operations/trainer/groups');
      return res.data?.data ?? [];
    },
  });

  const { data: incoming } = useQuery({
    queryKey: ['tr-incoming'],
    queryFn: async () => {
      const res = await apiClient.get('/operations/trainer/incoming-requests');
      return res.data?.data ?? null;
    },
  });

  const queryClient = useQueryClient();
  const { data: assignmentRequests, error: assignmentError, refetch: refetchAssignments } = useQuery({
    queryKey: ['tr-assignment-requests'],
    queryFn: async () => {
      const res = await apiClient.get('/operations/trainer/assignment-requests');
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

  const { data: traineeDetail, isLoading: detailLoading, refetch: refetchTraineeDetail } = useQuery({
    queryKey: ['tr-trainee-detail', selectedTraineeId],
    queryFn: async () => {
      const res = await apiClient.get(`/operations/trainer/trainee/${selectedTraineeId}`);
      return res.data?.data ?? null;
    },
    enabled: !!selectedTraineeId,
  });

  const trainees: any[] = interns ?? [];
  const capacity = me?.maxTrainees ?? 0;
  const occupied = trainees.length;

  const pendingLogs = dash?.pendingLogbook ?? 0;
  const pendingEvals = dash?.pendingEvaluations ?? 0;
  const activeCalls = dash?.openCalls ?? 0;
  const presentToday = dash?.presentToday ?? 0;
  const notCheckedIn = dash?.absentOrNotCheckedIn ?? 0;

  const hasError = dashError || internsError || meError;
  if (hasError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: space['2xl'], width: '100%' }}>
        <PageHeader
          eyebrow="المدرب السريري الميداني"
          icon={UserCog}
          title="يومك التدريبي الميداني"
          subtitle={user?.nameAr ?? ''}
        />
        <div className="glass-card" style={{ padding: space['2xl'], textAlign: 'center' }}>
          <EmptyState
            icon={AlertTriangle}
            title="تعذر تحميل بيانات المدرب"
            hint="تحقق من اتصالك بالشبكة وأعد المحاولة"
          />
          <div style={{ display: 'flex', gap: space.md, justifyContent: 'center', marginTop: space.lg }}>
            <Button variant="contained" onClick={() => { refetchDash(); refetchInterns(); refetchMe(); refetchAssignments(); }}>
              إعادة التحميل
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: space['2xl'], width: '100%' }}>
      {/* 1. HEADER */}
      <PageHeader
        eyebrow="المدرب السريري الميداني"
        icon={UserCog}
        title="لوحة المدرب السريري"
        subtitle={`${user?.nameAr ?? ''} — ${me?.department?.nameAr ?? user?.activeOrganization?.nameAr ?? 'القسم السريري'}`}
      />

      {/* 2. KPI GRID */}
      <KpiGrid min={200}>
        <KpiCard label="أطباء الامتياز المسندون" value={occupied} icon={Users} tone="primary" hint={capacity ? `السعة القصوى: ${capacity}` : undefined} loading={isLoading} />
        <KpiCard label="سجلات بانتظار الاعتماد" value={pendingLogs} icon={BookOpen} tone="warning" onClick={() => navigate('/logbook')} />
        <KpiCard label="تقييمات سريرية مطلوبة" value={pendingEvals} icon={ClipboardCheck} tone="violet" onClick={() => navigate('/logbook')} />
        <KpiCard label="نداءات M-CALL النشطة" value={activeCalls} icon={PhoneCall} tone={activeCalls > 0 ? 'danger' : 'success'} />
      </KpiGrid>

      {/* 3. NEEDS ATTENTION */}
      {(assignmentRequests?.length > 0 || pendingLogs > 0) && (
        <div
          style={{
            backgroundColor: '#FFFBEB',
            border: '1px solid #FCD34D',
            borderRadius: '14px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: '#FEF3C7', color: '#D97706' }}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#92400E' }}>
                يتطلب الإنتباه: {assignmentRequests?.length ? `يوجد ${assignmentRequests.length} طلبات إسناد متدربين جدد بانتظار موافقتك` : `يوجد ${pendingLogs} سجلات سريرية بانتظار التوقيع والاعتماد`}
              </div>
              <div style={{ fontSize: '12px', color: '#B45309', marginTop: '2px' }}>
                مراجعة السجلات الميدانية تضمن توثيق مهارات أطباء الامتياز في الوقت المحدد.
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/logbook')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: '#D97706',
              color: '#fff',
              border: 'none',
              fontWeight: 800,
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            اعتماد ومراجعة الآن
          </button>
        </div>
      )}

      {/* 4. PRIMARY DATA (My Trainees & Today's Schedule/Presence) */}
      <SplitGrid>
        <Panel
          title="أطباء الامتياز تحت إشرافي (My Trainees)"
          icon={Users}
          action={<PanelLink label="جميع المتدربين" onClick={() => navigate('/org-members')} />}
        >
          {isLoading ? (
            <PanelSkeleton rows={5} />
          ) : trainees.length === 0 ? (
            <EmptyState icon={Users} title="لا يوجد متدربون مسندون حالياً" hint="سيظهر هنا المتدربون فور قبول طلب الإسناد." />
          ) : (
            trainees.slice(0, 8).map((t: any) => (
              <ListRow
                key={t.id}
                title={t.person?.nameAr ?? t.nameAr ?? 'طبيب امتياز'}
                meta={`الرقم: ${t.traineeNumber ?? '—'} · التخصص: ${t.specialtyAr ?? 'طب عام'}`}
                trailing={<Badge label={t.applicationStatus === 'active' ? 'نشط' : 'تحت الإشراف'} tone={t.applicationStatus === 'active' ? 'success' : 'primary'} />}
                onClick={() => setSelectedTraineeId(t.id)}
              />
            ))
          )}
        </Panel>

        <Panel title="الحضور والجدول السريري اليوم" icon={CalendarCheck} tone="violet">
          {occupied > 0 ? (
            <>
              <StatBar label="حضور المتدربين اليوم" value={presentToday} max={occupied || 1} />
              <div style={{ marginTop: space.sm, fontSize: 12.5, color: colour.muted }}>
                لم يسجل / غائب اليوم: <strong>{notCheckedIn}</strong> متدرب
              </div>
              <div style={{ marginTop: space.lg, paddingTop: space.md, borderTop: `1px solid ${colour.border}` }}>
                <StatBar label="معدل إشغال الطاقة الإشرافية" value={occupied} max={capacity || 1} tone="primary" />
              </div>
            </>
          ) : (
            <EmptyState icon={CalendarCheck} title="لا توجد بيانات حضور اليوم" />
          )}
        </Panel>
      </SplitGrid>

      {/* 5. QUICK ACTIONS */}
      <Panel title="الإجراءات والمهام الميدانية السريعة" icon={Zap} tone="primary">
        <QuickActions
          items={[
            { label: 'اعتماد السجل السريري Logbook', icon: BookOpen, onClick: () => navigate('/logbook'), tone: 'primary', hint: `${pendingLogs} سجل معلق` },
            { label: 'سلسلة موافقات الإسناد', icon: CheckSquare, onClick: () => navigate('/acceptance-chain'), tone: 'info', hint: 'متابعة الطلبات' },
            { label: 'نداءات الطوارئ M-CALL', icon: PhoneCall, onClick: () => navigate('/incidents'), tone: 'danger', hint: `${activeCalls} نداءات نشطة` },
          ]}
        />
      </Panel>

      {/* 6. SECONDARY DATA (Pending Assignment Requests & Logbook Activity) */}
      <Panel title="طلبات إسناد المتدربين الجدد" icon={UserPlus} tone="warning">
        {assignmentRequests?.length ? (
          assignmentRequests.map((r: any) => (
            <ListRow
              key={r.id}
              title={r.traineeProfile?.person?.nameAr ?? 'طبيب امتياز جديد'}
              meta={`${r.traineeProfile?.program?.nameAr ?? ''} · ${r.department?.nameAr ?? 'القسم السريري'} · الفترة: ${String(r.startDate).slice(0, 10)} إلى ${String(r.endDate).slice(0, 10)}`}
              trailing={
                <div style={{ display: 'flex', gap: space.sm }}>
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    disabled={acceptMutation.isPending}
                    onClick={() => acceptMutation.mutate(r.id)}
                    style={{ fontWeight: 700 }}
                  >
                    قبول الإسناد
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    disabled={rejectMutation.isPending}
                    onClick={() => {
                      const reason = window.prompt('سبب عدم القبول:');
                      if (reason?.trim()) rejectMutation.mutate({ rotationId: r.id, reason: reason.trim() });
                    }}
                    style={{ fontWeight: 700 }}
                  >
                    رفض
                  </Button>
                </div>
              }
            />
          ))
        ) : (
          <EmptyState icon={UserPlus} title="لا توجد طلبات إسناد بانتظار قرارك" hint="تظهر الطلبات الجديدة فور توجيهها من إدارة المستشفى." />
        )}
      </Panel>

      <PanelGrid>
        <Panel title="آخر السجلات السريرية المرفوعة" icon={BookOpen} tone="neutral">
          {recentLogs?.length ? (
            recentLogs.slice(0, 5).map((l: any) => (
              <ListRow
                key={l.id}
                title={l.diagnosis ?? 'سجل إجراء سريري'}
                meta={`${l.traineeProfile?.person?.nameAr ?? ''} · الحالة: ${l.status === 'approved' ? 'معتمد' : 'قيد المراجعة'}`}
                onClick={() => navigate('/logbook')}
              />
            ))
          ) : (
            <EmptyState icon={BookOpen} title="لا توجد نشاطات حديثة" />
          )}
        </Panel>

        <Panel title="مجموعات المتدربين بالأقسام" icon={LayoutGrid} tone="info">
          {groups?.length ? (
            groups.map((g: any) => (
              <ListRow
                key={g.departmentId}
                title={g.departmentNameAr || 'قسم سريري'}
                meta={`عدد أطباء الامتياز: ${g.trainees?.length || 0}`}
              />
            ))
          ) : (
            <EmptyState icon={LayoutGrid} title="لا توجد مجموعات حالياً" />
          )}
        </Panel>
      </PanelGrid>

      {/* Trainee Detail Dialog */}
      <Dialog open={!!selectedTraineeId} onClose={() => setSelectedTraineeId(null)} maxWidth="sm" fullWidth>
        <DialogTitle style={{ fontWeight: 800 }}>{traineeDetail?.profile?.person?.nameAr ?? 'ملف طبيب الامتياز'}</DialogTitle>
        <DialogContent>
          {detailLoading ? (
            <div style={{ display: 'grid', placeItems: 'center', padding: 40 }}><CircularProgress size={28} /></div>
          ) : traineeDetail ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: space.lg, paddingBottom: space.lg, paddingTop: space.md }}>
              <div style={{ fontSize: 13, color: colour.muted }}>
                الرقم الأكاديمي: <strong>{traineeDetail.profile.traineeNumber}</strong> · الجهة: {traineeDetail.profile.organization?.nameAr}
              </div>
              <StatBar label="نسبة الحضور الميداني" value={traineeDetail.attendanceRate ?? 0} max={100} />
              <Panel title="الروتيشن الحالي" icon={Stethoscope} tone="primary">
                {traineeDetail.rotation ? (
                  <ListRow
                    title={traineeDetail.rotation.department?.nameAr}
                    meta={`الفترة: ${String(traineeDetail.rotation.startDate).slice(0, 10)} إلى ${String(traineeDetail.rotation.endDate).slice(0, 10)}`}
                  />
                ) : <EmptyState icon={Stethoscope} title="لا يوجد روتيشن نشط حالياً" />}
              </Panel>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <EmptyState icon={Users} title="تعذر تحميل بيانات المتدرب" />
              <Button variant="outlined" size="small" sx={{ marginTop: space.lg }} onClick={() => refetchTraineeDetail()}>
                إعادة المحاولة
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TrainerDashboard;

