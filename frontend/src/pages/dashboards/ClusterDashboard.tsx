import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts';
import {
  AlertTriangle, BedDouble, Building2, FileSpreadsheet, FolderGit2, Gauge,
  Inbox, Network, Sparkles, Stethoscope, TrendingUp, Users,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  Badge, EmptyState, KpiCard, KpiGrid, ListRow, Panel, PanelGrid, PanelLink,
  PanelSkeleton, PageHeader, QuickActions, SplitGrid, StatBar, colour, space,
} from '../../components/ui';

/**
 * Cluster training administration.
 *
 * The cluster's job is placing trainees across its hospitals, so this board is
 * built around pressure and flow: which hospitals are near capacity, what is
 * waiting to be allocated, and where the bottlenecks are.
 */
export const ClusterDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: orgs, isLoading: orgsLoading } = useQuery({
    queryKey: ['cl-orgs'],
    queryFn: async () => {
      const res = await apiClient.get('/organizations', { params: { limit: 100 } }).catch(() => ({ data: { data: [] } }));
      return res.data?.data ?? [];
    },
  });

  const { data: requests, isLoading: reqLoading } = useQuery({
    queryKey: ['cl-requests'],
    queryFn: async () => {
      const res = await apiClient.get('/training-requests').catch(() => ({ data: { data: [] } }));
      return res.data?.data ?? [];
    },
  });

  // Scoped to this cluster, from the same canonical source the directory uses.
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['organization-statistics', user?.activeOrganization?.id],
    enabled: Boolean(user?.activeOrganization?.id),
    queryFn: async () => {
      const res = await apiClient
        .get('/organizations/statistics', { params: { organizationId: user?.activeOrganization?.id } })
        .catch(() => ({ data: { data: null } }));
      return res.data?.data ?? null;
    },
  });

  const { data: timeline } = useQuery({
    queryKey: ['cl-timeline'],
    queryFn: async () => {
      const res = await apiClient
        .get('/timeline/dashboard', { params: { scope: 'cluster', limit: 200 } })
        .catch(() => ({ data: { data: null } }));
      return res.data?.data ?? null;
    },
  });

  const hospitals = (orgs ?? []).filter((o: any) => o.organizationType?.code === 'hospital');

  const withLoad = hospitals
    .map((h: any) => {
      const capacity = h.capacity ?? 0;
      const occupied = h._count?.traineeProfiles ?? 0;
      return {
        ...h,
        capacity,
        occupied,
        pct: capacity > 0 ? Math.min(100, Math.round((occupied / capacity) * 100)) : 0,
      };
    })
    .sort((a: any, b: any) => b.pct - a.pct);

  // Capacity figures come from the shared statistics endpoint so the cluster
  // board, the directory and the national board all quote the same numbers.
  const totalCapacity = stats?.totalCapacity ?? 0;
  const totalOccupied = stats?.hospitalTrainees ?? 0;
  const occupancy = stats?.occupancyPercentage ?? 0;
  const remaining = stats?.availableSeats ?? 0;

  const pending = (requests ?? []).filter((r: any) => ['submitted', 'under_review'].includes(r.status));
  const awaitingAllocation = (requests ?? []).filter((r: any) => ['approved', 'cluster_approved'].includes(r.status));
  const pressured = withLoad.filter((h: any) => h.pct >= 80);
  const noCapacity = withLoad.filter((h: any) => h.capacity === 0);

  const chart = withLoad.slice(0, 7).map((h: any) => ({
    name: (h.nameAr ?? '').replace(/^مستشفى\s+/, '').slice(0, 14),
    occupied: h.occupied,
    available: Math.max(0, h.capacity - h.occupied),
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: space['2xl'] }}>
      <PageHeader
        eyebrow="CLUSTER TRAINING ADMINISTRATION"
        icon={Network}
        title="لوحة التجمع الصحي"
        subtitle={`${user?.activeOrganization?.nameAr ?? ''} — توزيع المتدربين ومتابعة السعة عبر المستشفيات`}
      />

      <KpiGrid>
        <KpiCard label="مستشفيات التجمع" value={stats?.hospitals ?? hospitals.length} icon={Stethoscope} tone="primary"
          loading={statsLoading} onClick={() => navigate('/organizations')} />
        <KpiCard label="السعة الإجمالية" value={totalCapacity} icon={BedDouble} tone="info" loading={statsLoading} />
        <KpiCard label="نسبة الإشغال" value={`${occupancy}%`} icon={Gauge}
          tone={occupancy >= 90 ? 'danger' : occupancy >= 70 ? 'warning' : 'success'}
          hint={`${remaining} مقعد متاح`} loading={statsLoading} />
        <KpiCard label="المتدربون الحاليون" value={totalOccupied} icon={Users} tone="success" loading={statsLoading} />
        <KpiCard label="الطلبات الواردة" value={pending.length} icon={Inbox} tone="warning"
          hint="بانتظار المراجعة" loading={reqLoading} onClick={() => navigate('/affiliations')} />
        <KpiCard label="بانتظار التوزيع" value={awaitingAllocation.length} icon={Sparkles} tone="violet"
          hint="جاهزة للتوزيع الذكي" loading={reqLoading} />
      </KpiGrid>

      <SplitGrid>
        <Panel
          title="الإشغال حسب المستشفى"
          icon={TrendingUp}
          action={<PanelLink label="إدارة المستشفيات" onClick={() => navigate('/organizations')} />}
        >
          {chart.length === 0 ? (
            <EmptyState icon={Stethoscope} title="لا توجد مستشفيات مسجلة" hint="أضف مستشفيات التجمع لعرض توزيع السعة." />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chart} margin={{ top: 4, right: 8, left: -18, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colour.border} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: colour.muted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: colour.muted }} axisLine={false} tickLine={false} allowDecimals={false} />
                <RTooltip
                  cursor={{ fill: colour.subtle }}
                  contentStyle={{ borderRadius: 12, border: `1px solid ${colour.border}`, fontSize: 12, fontFamily: 'inherit' }}
                />
                <Bar dataKey="occupied" stackId="a" name="مشغول" fill={colour.primary} radius={[0, 0, 0, 0]} maxBarSize={44} />
                <Bar dataKey="available" stackId="a" name="متاح" fill="#CBD5E1" radius={[6, 6, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title="أكثر المستشفيات ضغطاً" icon={Gauge} tone="warning">
          {withLoad.length === 0 ? (
            <EmptyState icon={Gauge} title="لا توجد بيانات سعة" />
          ) : (
            withLoad.slice(0, 6).map((h: any) => (
              <StatBar key={h.id} label={h.nameAr} value={h.occupied} max={h.capacity || 1} />
            ))
          )}
        </Panel>
      </SplitGrid>

      <PanelGrid>
        <Panel title="الأعمال المعلقة" icon={Inbox} tone={pending.length ? 'warning' : 'success'}
          action={<PanelLink label="كل الطلبات" onClick={() => navigate('/affiliations')} />}>
          {reqLoading ? <PanelSkeleton /> : pending.length === 0 && awaitingAllocation.length === 0 ? (
            <EmptyState icon={Inbox} title="لا توجد أعمال معلقة" hint="كل الطلبات الواردة تمت معالجتها." />
          ) : (
            <>
              {pending.slice(0, 4).map((r: any) => (
                <ListRow
                  key={r.id}
                  title={`طلب ${r.requestNumber}`}
                  meta={`${r.sourceOrg?.nameAr ?? 'جامعة'} · ${r.studentCount ?? 0} متدرب`}
                  trailing={<Badge label="مراجعة" tone="warning" />}
                  onClick={() => navigate('/affiliations')}
                />
              ))}
              {awaitingAllocation.slice(0, 3).map((r: any) => (
                <ListRow
                  key={r.id}
                  title={`طلب ${r.requestNumber}`}
                  meta={`${r.sourceOrg?.nameAr ?? ''} · جاهز للتوزيع`}
                  trailing={<Badge label="توزيع" tone="violet" />}
                  onClick={() => navigate('/intakes')}
                />
              ))}
            </>
          )}
        </Panel>

        <Panel title="المشاكل الحالية" icon={AlertTriangle} tone={pressured.length || noCapacity.length ? 'danger' : 'success'}>
          {pressured.length === 0 && noCapacity.length === 0 ? (
            <EmptyState icon={AlertTriangle} title="لا توجد مشاكل" hint="لا توجد مستشفيات قاربت على الامتلاء." />
          ) : (
            <>
              {noCapacity.slice(0, 3).map((h: any) => (
                <ListRow key={h.id} title={h.nameAr} meta="لم تُحدَّد طاقة استيعابية"
                  trailing={<Badge label="بلا سعة" tone="danger" />} onClick={() => navigate('/organizations')} />
              ))}
              {pressured.slice(0, 4).map((h: any) => (
                <ListRow key={h.id} title={h.nameAr} meta={`${h.occupied}/${h.capacity} مقعد`}
                  trailing={<Badge label={`${h.pct}%`} tone={h.pct >= 90 ? 'danger' : 'warning'} />}
                  onClick={() => navigate('/organizations')} />
              ))}
            </>
          )}
        </Panel>

        <Panel title="التوزيع الذكي وإجراءات سريعة" icon={Sparkles} tone="violet">
          <QuickActions
            items={[
              { label: 'الطلبات الواردة', icon: FolderGit2, onClick: () => navigate('/affiliations'), tone: 'warning', hint: `${pending.length} معلّق` },
              { label: 'التوزيع الذكي', icon: Sparkles, onClick: () => navigate('/intakes'), tone: 'violet' },
              { label: 'استيراد متدربين', icon: FileSpreadsheet, onClick: () => navigate('/cluster-trainees'), tone: 'info' },
              { label: 'المستشفيات والسعة', icon: Building2, onClick: () => navigate('/organizations'), tone: 'primary' },
            ]}
          />
          {timeline && (
            <div style={{
              marginTop: space.xl, paddingTop: space.lg, borderTop: `1px solid ${colour.border}`,
              display: 'flex', gap: space.lg, flexWrap: 'wrap', fontSize: 12.5, color: colour.muted,
            }}>
              <span>متوسط الإنجاز: <strong style={{ color: colour.text }}>{timeline.averageCompletion}%</strong></span>
              <span>جاهز للتخرج: <strong style={{ color: colour.text }}>{timeline.readyForGraduation}</strong></span>
              <span>متعثر: <strong style={{ color: colour.text }}>{timeline.atRisk + timeline.offTrack}</strong></span>
            </div>
          )}
        </Panel>
      </PanelGrid>
    </div>
  );
};

export default ClusterDashboard;
