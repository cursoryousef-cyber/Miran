import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, ClipboardList, FolderGit2, GraduationCap, Inbox,
  RotateCcw, Send, Users,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  Badge, EmptyState, KpiCard, KpiGrid, ListRow, Panel, PanelGrid, PanelLink,
  PanelSkeleton, PageHeader, QuickActions, SplitGrid, StatBar, colour, space,
} from '../../components/ui';

/**
 * University sponsor board.
 *
 * A university submits cohorts and then tracks them, so this board follows the
 * request lifecycle — drafted, submitted, returned for correction, placed — and
 * the progress of students already training.
 */
export const UniversityDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: requests, isLoading } = useQuery({
    queryKey: ['un-requests'],
    queryFn: async () => {
      const res = await apiClient.get('/training-requests').catch(() => ({ data: { data: [] } }));
      return res.data?.data ?? [];
    },
  });

  const { data: returned } = useQuery({
    queryKey: ['un-returned'],
    queryFn: async () => {
      const res = await apiClient.get('/training-requests/trainees/returned').catch(() => ({ data: { data: [] } }));
      return res.data?.data ?? [];
    },
  });

  const { data: timeline } = useQuery({
    queryKey: ['un-timeline'],
    queryFn: async () => {
      const res = await apiClient
        .get('/timeline/dashboard', { params: { scope: 'university', limit: 200 } })
        .catch(() => ({ data: { data: null } }));
      return res.data?.data ?? null;
    },
  });

  const all = requests ?? [];
  const byStatus = (list: string[]) => all.filter((r: any) => list.includes(r.status));
  const drafts = byStatus(['draft']);
  const submitted = byStatus(['submitted', 'under_review']);
  const placed = byStatus(['allocated', 'auto_allocated', 'active']);
  const totalStudents = all.reduce((s: number, r: any) => s + (r.studentCount ?? 0), 0);
  const corrections = returned ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: space['2xl'] }}>
      <PageHeader
        eyebrow="UNIVERSITY SPONSOR"
        icon={GraduationCap}
        title="لوحة الجامعة"
        subtitle={`${user?.activeOrganization?.nameAr ?? ''} — إيفاد المتدربين ومتابعة مسارهم التدريبي`}
      />

      <KpiGrid>
        <KpiCard label="إجمالي الطلبات" value={all.length} icon={FolderGit2} tone="primary"
          loading={isLoading} onClick={() => navigate('/affiliations')} />
        <KpiCard label="مسودات" value={drafts.length} icon={ClipboardList} tone="neutral" loading={isLoading} />
        <KpiCard label="قيد المراجعة" value={submitted.length} icon={Send} tone="warning" loading={isLoading} />
        <KpiCard label="تم توزيعهم" value={placed.length} icon={Users} tone="success" loading={isLoading} />
        <KpiCard label="طلاب موفدون" value={totalStudents} icon={GraduationCap} tone="info" loading={isLoading} />
        <KpiCard label="تصحيحات مطلوبة" value={corrections.length} icon={RotateCcw}
          tone={corrections.length ? 'danger' : 'success'} onClick={() => navigate('/corrections')} />
      </KpiGrid>

      <SplitGrid>
        <Panel title="طلبات التدريب" icon={FolderGit2}
          action={<PanelLink label="كل الطلبات" onClick={() => navigate('/affiliations')} />}>
          {isLoading ? <PanelSkeleton rows={5} /> : all.length === 0 ? (
            <EmptyState icon={FolderGit2} title="لا توجد طلبات" hint="ابدأ بإنشاء طلب تدريب جديد للتجمع الصحي." />
          ) : (
            all.slice(0, 7).map((r: any) => (
              <ListRow
                key={r.id}
                title={`طلب ${r.requestNumber}`}
                meta={`${r.targetOrg?.nameAr ?? ''} · ${r.studentCount ?? 0} متدرب · ${r.program?.nameAr ?? 'بلا برنامج'}`}
                trailing={<Badge label={r.status}
                  tone={placed.includes(r) ? 'success' : submitted.includes(r) ? 'warning' : 'neutral'} />}
                onClick={() => navigate('/affiliations')}
              />
            ))
          )}
        </Panel>

        <Panel title="تقدم الطلاب" icon={GraduationCap} tone="success">
          {timeline?.traineeCount ? (
            <>
              <StatBar label="متوسط الإنجاز" value={timeline.averageCompletion} max={100} tone="primary" />
              <StatBar label="تقدم التخرج" value={timeline.averageGraduationProgress} max={100} tone="info" />
              <div style={{ display: 'flex', gap: space.sm, flexWrap: 'wrap', marginTop: space.lg }}>
                <Badge label={`${timeline.traineeCount} متدرب`} tone="primary" />
                <Badge label={`${timeline.readyForGraduation} جاهز`} tone="success" />
                <Badge label={`${timeline.atRisk + timeline.offTrack} متعثر`}
                  tone={timeline.atRisk + timeline.offTrack ? 'danger' : 'neutral'} />
              </div>
            </>
          ) : (
            <EmptyState icon={GraduationCap} title="لا يوجد طلاب قيد التدريب"
              hint="تظهر مؤشرات التقدم فور تفعيل تدريب الطلاب." />
          )}
        </Panel>
      </SplitGrid>

      <PanelGrid>
        <Panel title="الأعمال المعلقة" icon={Inbox} tone={corrections.length ? 'danger' : 'success'}
          action={<PanelLink label="التصحيحات" onClick={() => navigate('/corrections')} />}>
          {corrections.length === 0 ? (
            <EmptyState icon={Inbox} title="لا توجد أعمال معلقة" hint="لا توجد صفوف مُعادة للتصحيح." />
          ) : (
            corrections.slice(0, 6).map((c: any) => (
              <ListRow key={c.id} title={c.nameAr}
                meta={`${c.academicNumber ?? ''} · ${c.returnReason ?? 'بحاجة لتصحيح'}`}
                trailing={<Badge label="تصحيح" tone="danger" />}
                onClick={() => navigate('/corrections')} />
            ))
          )}
        </Panel>

        <Panel title="تنبيهات" icon={AlertTriangle} tone="warning">
          {drafts.length === 0 && submitted.length === 0 ? (
            <EmptyState icon={AlertTriangle} title="لا توجد تنبيهات" />
          ) : (
            <>
              {drafts.slice(0, 3).map((r: any) => (
                <ListRow key={r.id} title={`مسودة ${r.requestNumber}`} meta="لم تُرسل بعد"
                  trailing={<Badge label="مسودة" tone="neutral" />} onClick={() => navigate('/affiliations')} />
              ))}
              {submitted.slice(0, 3).map((r: any) => (
                <ListRow key={r.id} title={`طلب ${r.requestNumber}`} meta="بانتظار رد التجمع"
                  trailing={<Badge label="مراجعة" tone="warning" />} onClick={() => navigate('/affiliations')} />
              ))}
            </>
          )}
        </Panel>

        <Panel title="إجراءات سريعة" icon={Send} tone="neutral">
          <QuickActions
            items={[
              { label: 'طلبات التدريب', icon: FolderGit2, onClick: () => navigate('/affiliations'), tone: 'primary' },
              { label: 'الدفعات الأكاديمية', icon: ClipboardList, onClick: () => navigate('/intakes'), tone: 'info' },
              { label: 'التصحيحات المُعادة', icon: RotateCcw, onClick: () => navigate('/corrections'), tone: 'warning' },
              { label: 'أعضاء الجامعة', icon: Users, onClick: () => navigate('/org-members'), tone: 'violet' },
            ]}
          />
        </Panel>
      </PanelGrid>
    </div>
  );
};

export default UniversityDashboard;
