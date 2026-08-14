import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, CircularProgress } from '@mui/material';
import {
  BookOpen, CalendarCheck, CheckSquare, ClipboardCheck, GraduationCap,
  Stethoscope, Users, CreditCard, Zap, Clock, PhoneCall
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  Badge, EmptyState, KpiCard, KpiGrid, ListRow, Panel, PanelGrid, PanelLink,
  PanelSkeleton, PageHeader, QuickActions, SplitGrid, StatBar, colour, space,
} from '../../components/ui';

export const TraineeDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['tr-profile-me'],
    queryFn: async () => {
      const res = await apiClient.get('/trainees/me').catch(() => ({ data: null }));
      // This endpoint answers with the profile itself, not a { data } envelope;
      // reading only `data.data` left the dashboard with no profile at all.
      const body: any = res.data;
      return body?.data ?? (body?.id ? body : null);
    },
  });

  const { data: logbook, isLoading: logLoading } = useQuery({
    queryKey: ['tr-logbook-me'],
    queryFn: async () => {
      const res = await apiClient.get('/logbook/my-logs').catch(() => ({ data: { data: [] } }));
      return res.data?.data ?? [];
    },
  });

  const { data: timeline } = useQuery({
    queryKey: ['tr-timeline-me'],
    queryFn: async () => {
      // The trainee's own timeline, not the org-wide dashboard feed: that feed
      // is scoped by hospital/university/cluster and refuses a trainee (403),
      // which is correct — a trainee may only ever read their own journey.
      const res = await apiClient
        .get('/timeline/me')
        .catch(() => ({ data: { data: null } }));
      const own = res.data?.data ?? null;
      return own
        ? {
            averageCompletion: own.completionPercentage,
            averageGraduationProgress: own.graduationProgress,
          }
        : null;
    },
  });

  // Tasks/activities the trainer assigned. GET /operations/tasks is already
  // scoped to the caller's own account, and only the assignee may complete one.
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['tr-my-tasks'],
    queryFn: async () => {
      const res = await apiClient.get('/operations/tasks').catch(() => ({ data: { data: [] } }));
      return res.data?.data ?? [];
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: (taskId: string) => apiClient.patch(`/operations/tasks/${taskId}/complete`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tr-my-tasks'] }),
  });

  // Read-only clinical record for the trainee: their competency progress and the
  // evaluations their trainer has finalised. No editing controls are rendered.
  const { data: competencies } = useQuery({
    queryKey: ['tr-my-competencies'],
    queryFn: async () => {
      const res = await apiClient.get('/logbook/competencies').catch(() => ({ data: { data: [] } }));
      return res.data ?? { data: [] };
    },
  });

  const { data: myEvaluations } = useQuery({
    queryKey: ['tr-my-evaluations'],
    queryFn: async () => {
      const res = await apiClient.get('/operations/evaluations').catch(() => ({ data: { data: [] } }));
      const all = res.data?.data ?? [];
      return all.filter((e: any) => e.evaluatee?.person?.id === profile?.personId || e.evaluateeId);
    },
    enabled: !!profile,
  });

  const rotations: any[] = profile?.rotations ?? [];
  const activeRotation = rotations.find((r: any) => r.status === 'active');
  const completedRotations = rotations.filter((r: any) => r.status === 'completed');
  const logs: any[] = logbook ?? [];
  const pendingLogs = logs.filter((l: any) => l.status === 'pending' || l.status === 'submitted');
  const approvedLogs = logs.filter((l: any) => l.status === 'approved');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: space['2xl'], width: '100%' }}>
      {/* 1. HEADER */}
      <PageHeader
        eyebrow="رحلة طبيب الامتياز والمتدرب"
        icon={GraduationCap}
        title="لوحة طبيب الامتياز والمتدرب"
        subtitle={`${user?.nameAr ?? ''} — ${profile?.sponsorOrganization?.nameAr ?? user?.activeOrganization?.nameAr ?? 'الجامعة/المستشفى'}`}
      />

      {/* 2. KPI GRID */}
      <KpiGrid min={200}>
        <KpiCard label="الرقم الأكاديمي" value={profile?.traineeNumber ?? '—'} icon={CreditCard} tone="primary" loading={profileLoading} />
        <KpiCard label="الروتيشن الحالي" value={activeRotation?.department?.nameAr ?? 'غير معين'} icon={Stethoscope} tone="success" loading={profileLoading} />
        <KpiCard label="السجلات السريرية Logbook" value={logs.length} icon={BookOpen} tone="info" hint={`${approvedLogs.length} معتمد`} loading={logLoading} onClick={() => navigate('/logbook')} />
        <KpiCard label="الروتيشنات المنتهية" value={completedRotations.length} icon={GraduationCap} tone="violet" loading={profileLoading} />
      </KpiGrid>

      {/* 3. NEEDS ATTENTION */}
      {pendingLogs.length > 0 && (
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
              <Clock size={20} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#92400E' }}>
                متابعة السجلات السريرية: يوجد لديك {pendingLogs.length} سجل سريري بانتظار توقيع واعتماد المدرب
              </div>
              <div style={{ fontSize: '12px', color: '#B45309', marginTop: '2px' }}>
                تأكد من متابعة مدربك المباشر لإنهاء اعتماد الساعات والمهارات المكتسبة.
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
            عرض السجلات
          </button>
        </div>
      )}

      {/* 4. PRIMARY DATA (Current Active Rotation & Today's Schedule) */}
      <SplitGrid>
        <Panel
          title="الروتيشن السريري الحالي (Current Rotation)"
          icon={Stethoscope}
          tone="success"
          action={<PanelLink label="الجدول الكامل" onClick={() => navigate('/profile')} />}
        >
          {profileLoading ? (
            <PanelSkeleton rows={4} />
          ) : !activeRotation ? (
            <EmptyState icon={Stethoscope} title="لا يوجد روتيشن نشط حالياً" hint="سيتم تفعيل الروتيشن فور اعتماد جدول المستشفى." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: space.md }}>
              <div style={{ backgroundColor: '#F0FDFA', border: '1px solid #99F6E4', borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '16px', fontWeight: 800, color: '#0F766E' }}>{activeRotation.department?.nameAr || 'القسم السريري'}</span>
                  <Badge label="نشط الآن" tone="success" />
                </div>
                <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '6px' }}>
                  المستشفى: <strong>{activeRotation.organization?.nameAr || profile?.organization?.nameAr || 'المستشفى'}</strong>
                </div>
                <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '2px' }}>
                  المدرب السريري المباشر: <strong>{activeRotation.trainerProfile?.person?.nameAr || 'غير معين'}</strong>
                </div>
                <div style={{ fontSize: '12px', color: '#0F766E', marginTop: '10px', fontWeight: 700 }}>
                  الفترة التدريبية: {String(activeRotation.startDate).slice(0, 10)} إلى {String(activeRotation.endDate).slice(0, 10)}
                </div>
              </div>
            </div>
          )}
        </Panel>

        <Panel title="تقدم خطة التدريب والتخرج" icon={GraduationCap} tone="primary">
          {timeline?.averageCompletion !== undefined ? (
            <>
              <StatBar label="معدل إنجاز الروتيشنات السريرية" value={timeline.averageCompletion} max={100} tone="primary" />
              <StatBar label="نسبة الجاهزية للتخرج" value={timeline.averageGraduationProgress} max={100} tone="info" />
              <div style={{ marginTop: space.lg, paddingTop: space.md, borderTop: `1px solid ${colour.border}`, fontSize: '12px', color: colour.muted }}>
                حالة الخطة الأكاديمية: <strong style={{ color: colour.primary }}>{profile?.applicationStatus === 'active' ? 'نشط وفي المسار المعتمد' : 'تحت الإشراف'}</strong>
              </div>
            </>
          ) : (
            <EmptyState icon={GraduationCap} title="متابعة الخطة التدريبية" hint="يتم تحديث نسب الإنجاز تلقائياً بناءً على تقييمات الساعات." />
          )}
        </Panel>
        <Panel title="التقييمات والدرجات المعتمدة" icon={ClipboardCheck} tone="warning">
          {(myEvaluations ?? []).length ? (
            (myEvaluations ?? []).map((ev: any) => {
              // Read-only breakdown: each criterion the form declares, the mark
              // awarded against its maximum, then the stored total and percentage.
              const items: any[] = Array.isArray(ev.form?.items) ? ev.form.items : [];
              const scores = ev.scores ?? {};
              const maxTotal = scores._maxTotal ?? items.reduce((a: number, i: any) => a + Number(i.max ?? 0), 0);
              const percentage = scores._percentage
                ?? (maxTotal > 0 && ev.totalScore != null ? Math.round((Number(ev.totalScore) / maxTotal) * 100) : null);
              return (
                <div key={ev.id} style={{ borderBottom: `1px solid ${colour.border}`, padding: `${space.md} 0` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: space.md }}>
                    <span style={{ fontWeight: 800 }}>{ev.form?.nameAr ?? ev.evaluationType ?? 'تقييم'}</span>
                    <Badge tone="success" label="معتمد" />
                  </div>
                  <div style={{ fontSize: 11, color: colour.muted, marginBottom: space.sm }}>
                    {String(ev.submittedAt).slice(0, 10)}{ev.comments ? ` · ${ev.comments}` : ''}
                  </div>
                  {items.filter((i: any) => i?.code && scores[i.code] !== undefined).map((i: any) => (
                    <div key={i.code} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0' }}>
                      <span>{i.nameAr || i.code}</span>
                      <span style={{ fontWeight: 700 }}>{scores[i.code]} / {i.max ?? '—'}</span>
                    </div>
                  ))}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', fontWeight: 800,
                    marginTop: space.sm, paddingTop: space.sm, borderTop: `1px solid ${colour.border}`,
                  }}>
                    <span>المجموع</span>
                    <span style={{ color: colour.primary }}>
                      {ev.totalScore ?? '—'}{maxTotal ? ` / ${maxTotal}` : ''}{percentage != null ? ` · ${percentage}%` : ''}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <EmptyState icon={ClipboardCheck} title="لا توجد تقييمات معتمدة بعد" hint="تظهر الدرجة هنا فور اعتماد مدربك للتقييم." />
          )}
          {competencies?.data?.length ? (
            <div style={{ marginTop: space.lg, paddingTop: space.md, borderTop: `1px solid ${colour.border}` }}>
              <StatBar label="نسبة إنجاز الكفاءات السريرية" value={competencies.overallPercentage ?? 0} max={100} tone="violet" />
            </div>
          ) : null}
        </Panel>

        <Panel title="المهام والأنشطة المسندة من المدرب" icon={CheckSquare} tone="info">
          {tasksLoading ? (
            <PanelSkeleton rows={2} />
          ) : (tasks ?? []).length ? (
            (tasks ?? []).map((t: any) => (
              <ListRow
                key={t.id}
                title={t.titleAr}
                meta={`${t.status === 'completed' ? 'مكتملة' : 'قيد التنفيذ'}${t.dueDate ? ` · تستحق ${String(t.dueDate).slice(0, 10)}` : ''}`}
                trailing={t.status === 'completed' ? (
                  <Badge tone="success" label="مكتملة" />
                ) : (
                  <Button
                    size="small"
                    variant="contained"
                    disabled={completeTaskMutation.isPending}
                    onClick={() => completeTaskMutation.mutate(t.id)}
                  >
                    {completeTaskMutation.isPending ? <CircularProgress size={14} /> : 'إنهاء المهمة'}
                  </Button>
                )}
              />
            ))
          ) : (
            <EmptyState icon={CheckSquare} title="لا توجد مهام مسندة حالياً" hint="تظهر هنا المهام والأنشطة السريرية فور إسنادها من مدربك." />
          )}
        </Panel>
      </SplitGrid>

      {/* 5. QUICK ACTIONS */}
      <Panel title="الإجراءات السريعة والخدمات اليومية" icon={Zap} tone="primary">
        <QuickActions
          items={[
            { label: 'تسجيل حالة سريرية Logbook', icon: BookOpen, onClick: () => navigate('/logbook'), tone: 'primary', hint: 'إضافة مهارة سريرية جديدة' },
            { label: 'الملف الشخصي والبطاقة', icon: CreditCard, onClick: () => navigate('/profile'), tone: 'info', hint: 'عرض البطاقة الرقمية' },
            { label: 'نداءات المدرب M-CALL', icon: PhoneCall, onClick: () => navigate('/calls'), tone: 'danger', hint: 'الرد على نداءات مدربك' },
          ]}
        />
      </Panel>

      {/* 6. SECONDARY DATA (My Logbook Entries & Digital ID Card) */}
      <PanelGrid>
        <Panel
          title="آخر السجلات السريرية المسجلة (Logbook)"
          icon={BookOpen}
          action={<PanelLink label="السجل الكامل" onClick={() => navigate('/logbook')} />}
        >
          {logLoading ? (
            <PanelSkeleton rows={4} />
          ) : logs.length === 0 ? (
            <EmptyState icon={BookOpen} title="لم تسجل أي حالات سريرية بعد" hint="اضغط على تسجيل حالة جديدة لإضافة مهاراتك." />
          ) : (
            logs.slice(0, 5).map((l: any) => (
              <ListRow
                key={l.id}
                title={l.diagnosis || 'إجراء سريري'}
                meta={`القسم: ${l.department?.nameAr || 'عام'} · التاريخ: ${String(l.createdAt).slice(0, 10)}`}
                trailing={
                  <Badge
                    label={l.status === 'approved' ? 'معتمد' : 'قيد المراجعة'}
                    tone={l.status === 'approved' ? 'success' : 'warning'}
                  />
                }
                onClick={() => navigate('/logbook')}
              />
            ))
          )}
        </Panel>

        <Panel title="البطاقة الرقمية والهوية الأكاديمية" icon={CreditCard} tone="violet">
          <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '16px' }}>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>{user?.nameAr}</div>
            <div style={{ fontSize: '12px', color: '#64748B', fontFamily: 'monospace', marginTop: '2px' }}>
              الرقم الأكاديمي: {profile?.traineeNumber || '—'}
            </div>
            <div style={{ fontSize: '12px', color: '#0F766E', marginTop: '8px', fontWeight: 700 }}>
              الجامعة الموفدة: {profile?.sponsorOrganization?.nameAr || 'الجامعة'}
            </div>
            <div style={{ fontSize: '12px', color: '#0284C7', marginTop: '2px', fontWeight: 700 }}>
              المستشفى الحالي: {profile?.organization?.nameAr || 'المستشفى'}
            </div>
          </div>
        </Panel>
      </PanelGrid>
    </div>
  );
};

export default TraineeDashboard;
