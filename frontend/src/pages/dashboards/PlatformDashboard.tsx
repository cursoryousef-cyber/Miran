import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts';
import {
  Activity, AlertTriangle, Building2, GitMerge, GraduationCap, Globe2, Key,
  LayoutDashboard, Network, Shield, Stethoscope, UserCog, Users,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  Badge, EmptyState, KpiCard, KpiGrid, ListRow, Metric, MetricRow, Panel,
  PanelGrid, PanelLink, PanelSkeleton, PageHeader, QuickActions, SplitGrid, colour, space,
} from '../../components/ui';

/**
 * National control centre.
 *
 * The platform owner governs the federation rather than running training, so
 * this board answers "is the national picture healthy": how many organisations
 * of each type exist, where trainees sit, and what needs administrative
 * attention. No per-trainee operational detail.
 */
export const PlatformDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: orgs, isLoading: orgsLoading } = useQuery({
    queryKey: ['pf-orgs'],
    queryFn: async () => {
      const res = await apiClient.get('/organizations', { params: { limit: 200 } }).catch(() => ({ data: { data: [] } }));
      return res.data?.data ?? [];
    },
  });

  // Same canonical source the organisation directory reads, so the national
  // totals and the directory totals can never disagree.
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['organization-statistics'],
    queryFn: async () => {
      const res = await apiClient.get('/organizations/statistics').catch(() => ({ data: { data: null } }));
      return res.data?.data ?? null;
    },
  });

  const { data: requests } = useQuery({
    queryKey: ['pf-requests'],
    queryFn: async () => {
      const res = await apiClient.get('/training-requests').catch(() => ({ data: { data: [] } }));
      return res.data?.data ?? [];
    },
  });

  const { data: audits } = useQuery({
    queryKey: ['pf-audits'],
    queryFn: async () => {
      const res = await apiClient.get('/audit-logs', { params: { limit: 8 } }).catch(() => ({ data: { data: [] } }));
      return res.data?.data ?? [];
    },
  });

  const byType = (code: string) => (orgs ?? []).filter((o: any) => o.organizationType?.code === code);
  const universities = byType('university');
  const clusters = byType('cluster');
  const hospitals = byType('hospital');
  const suspended = (orgs ?? []).filter((o: any) => o.status && o.status !== 'active');
  const pendingRequests = (requests ?? []).filter((r: any) => ['submitted', 'under_review'].includes(r.status));

  const typeChart = [
    { name: 'الجامعات', value: universities.length, fill: '#0284C7' },
    { name: 'التجمعات', value: clusters.length, fill: '#0F766E' },
    { name: 'المستشفيات', value: hospitals.length, fill: '#7C3AED' },
  ].filter((d) => d.value > 0);

  // Trainee distribution per region, the closest thing to a national map view
  // that the organisation data supports today.
  const regionChart = Object.entries(
    (orgs ?? []).reduce((acc: Record<string, number>, o: any) => {
      const region = o.regionAr || 'غير محدد';
      acc[region] = (acc[region] ?? 0) + (o._count?.traineeProfiles ?? 0);
      return acc;
    }, {}),
  )
    .map(([name, value]) => ({ name, value: value as number }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: space['2xl'] }}>
      <PageHeader
        eyebrow="NATIONAL CONTROL CENTRE"
        icon={LayoutDashboard}
        title={`مركز التحكم الوطني`}
        subtitle={`أهلاً ${user?.nameAr ?? ''} — حوكمة الجهات والتجمعات والمستشفيات على مستوى المملكة`}
      />

      <KpiGrid>
        <KpiCard label="إجمالي الجهات" value={stats?.totalOrganizations ?? 0} icon={Globe2} tone="primary"
          loading={statsLoading} onClick={() => navigate('/organizations')} />
        <KpiCard label="الجامعات" value={stats?.universities ?? 0} icon={GraduationCap} tone="info"
          loading={statsLoading} onClick={() => navigate('/organizations')} />
        <KpiCard label="التجمعات الصحية" value={stats?.clusters ?? 0} icon={Network} tone="primary"
          loading={statsLoading} onClick={() => navigate('/organizations')} />
        <KpiCard label="المستشفيات" value={stats?.hospitals ?? 0} icon={Stethoscope} tone="violet"
          loading={statsLoading} onClick={() => navigate('/organizations')} />
        <KpiCard label="المتدربون وطنياً" value={stats?.totalTrainees ?? 0} icon={Users} tone="success"
          hint={stats?.totalCapacity ? `من سعة ${stats.totalCapacity}` : undefined} loading={statsLoading} />
        <KpiCard label="الطلبات الوطنية" value={(requests ?? []).length} icon={GitMerge} tone="warning"
          hint={`${pendingRequests.length} بانتظار المعالجة`} />
      </KpiGrid>

      <SplitGrid>
        <Panel
          title="توزيع المتدربين حسب المنطقة"
          icon={Globe2}
          action={<PanelLink label="كل الجهات" onClick={() => navigate('/organizations')} />}
        >
          {regionChart.length === 0 ? (
            <EmptyState icon={Globe2} title="لا توجد بيانات توزيع بعد" hint="تظهر هنا أعداد المتدربين لكل منطقة فور إسنادهم." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={regionChart} margin={{ top: 4, right: 8, left: -18, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colour.border} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: colour.muted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: colour.muted }} axisLine={false} tickLine={false} allowDecimals={false} />
                <RTooltip
                  cursor={{ fill: colour.subtle }}
                  contentStyle={{ borderRadius: 12, border: `1px solid ${colour.border}`, fontSize: 12, fontFamily: 'inherit' }}
                />
                <Bar dataKey="value" name="متدربون" fill={colour.primary} radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title="تركيبة الجهات" icon={Building2} tone="violet">
          {typeChart.length === 0 ? (
            <EmptyState icon={Building2} title="لا توجد جهات مسجلة" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie data={typeChart} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={3}>
                    {typeChart.map((d) => <Cell key={d.name} fill={d.fill} />)}
                  </Pie>
                  <RTooltip contentStyle={{ borderRadius: 12, border: `1px solid ${colour.border}`, fontSize: 12, fontFamily: 'inherit' }} />
                </PieChart>
              </ResponsiveContainer>
              <MetricRow min={90}>
                <Metric label="جامعات" value={universities.length} tone="info" />
                <Metric label="تجمعات" value={clusters.length} tone="primary" />
                <Metric label="مستشفيات" value={hospitals.length} tone="violet" />
              </MetricRow>
            </>
          )}
        </Panel>
      </SplitGrid>

      <PanelGrid>
        <Panel title="التنبيهات الوطنية" icon={AlertTriangle} tone={suspended.length ? 'danger' : 'success'}>
          {suspended.length === 0 && pendingRequests.length === 0 ? (
            <EmptyState icon={Shield} title="لا توجد تنبيهات" hint="كل الجهات مفعّلة ولا توجد طلبات متأخرة." />
          ) : (
            <>
              {suspended.slice(0, 4).map((o: any) => (
                <ListRow
                  key={o.id}
                  title={o.nameAr}
                  meta={`جهة غير مفعّلة — ${o.organizationType?.nameAr ?? ''}`}
                  trailing={<Badge label={o.status} tone="danger" />}
                  onClick={() => navigate('/organizations')}
                />
              ))}
              {pendingRequests.slice(0, 3).map((r: any) => (
                <ListRow
                  key={r.id}
                  title={`طلب تدريب ${r.requestNumber}`}
                  meta={`${r.sourceOrg?.nameAr ?? ''} → ${r.targetOrg?.nameAr ?? ''}`}
                  trailing={<Badge label={r.status} tone="warning" />}
                />
              ))}
            </>
          )}
        </Panel>

        <Panel title="آخر النشاطات" icon={Activity} tone="info">
          {!audits ? <PanelSkeleton /> : audits.length === 0 ? (
            <EmptyState icon={Activity} title="لا توجد نشاطات مسجلة" />
          ) : (
            audits.slice(0, 6).map((a: any) => (
              <ListRow
                key={a.id}
                title={a.action}
                meta={`${a.entityType ?? ''} · ${new Date(a.createdAt).toLocaleString('ar-SA')}`}
              />
            ))
          )}
        </Panel>

        <Panel title="إجراءات سريعة" icon={Key} tone="neutral">
          <QuickActions
            items={[
              { label: 'إدارة الجهات', icon: Building2, onClick: () => navigate('/organizations'), hint: 'إنشاء وتعديل' },
              { label: 'المستخدمون', icon: Users, onClick: () => navigate('/users'), tone: 'info' },
              { label: 'الأدوار والصلاحيات', icon: Key, onClick: () => navigate('/roles-management'), tone: 'violet' },
              { label: 'سجلات التدقيق', icon: Shield, onClick: () => navigate('/audit-logs'), tone: 'warning' },
              { label: 'سلامة الخدمات', icon: Activity, onClick: () => navigate('/health-monitor'), tone: 'success' },
              { label: 'محرك سير العمل', icon: GitMerge, onClick: () => navigate('/workflows'), tone: 'neutral' },
            ]}
          />
        </Panel>
      </PanelGrid>
    </div>
  );
};

export default PlatformDashboard;
