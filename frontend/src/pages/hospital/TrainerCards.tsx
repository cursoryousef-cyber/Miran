import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { CircularProgress, Collapse, Dialog, DialogContent, DialogTitle, MenuItem, TextField } from '@mui/material';
import { CardGrid, DataPageShell, EmptyState, EntityCard } from '../../components/ui';
import { colour, font, radius, space } from '../../components/ui/tokens';
import {
  ArrowRightLeft, CalendarOff, Eye, Search,
  UserCheck, UserCog, UserPlus, Users,
} from 'lucide-react';

const LEAVE_LABELS: Record<string, string> = {
  annual_leave: 'إجازة سنوية',
  emergency_leave: 'إجازة اضطرارية',
  sick_leave: 'إجازة مرضية',
  maternity_leave: 'إجازة أمومة',
  training_course: 'دورة تدريبية',
  conference: 'مؤتمر',
  temporary_assignment: 'انتداب مؤقت',
  transfer: 'نقل',
  retirement: 'تقاعد',
  resignation: 'استقالة',
};

export const TrainerCards: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [profile, setProfile] = useState<any | null>(null);

  const { data: trainers, isLoading } = useQuery({
    queryKey: ['trainer-cards'],
    queryFn: async () => {
      const res = await apiClient.get('/trainers/workspace-cards').catch(() => ({ data: { data: [] } }));
      return res.data?.data ?? [];
    },
  });

  const departments = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of trainers ?? []) if (t.department) map.set(t.department.id, t.department.nameAr);
    return [...map.entries()];
  }, [trainers]);

  const visible = useMemo(() => {
    const needle = search.trim();
    return (trainers ?? []).filter((t: any) => {
      const matchesDept = deptFilter === 'all' || t.department?.id === deptFilter;
      const matchesName = !needle || `${t.nameAr ?? ''} ${t.nameEn ?? ''}`.includes(needle);
      return matchesDept && matchesName;
    });
  }, [trainers, search, deptFilter]);

  const totalTrainers = (trainers ?? []).length;
  const onLeaveCount = (trainers ?? []).filter((t: any) => t.onLeave).length;
  const totalOccupied = (trainers ?? []).reduce((acc: number, t: any) => acc + (t.occupied ?? 0), 0);
  const totalAvailable = (trainers ?? []).reduce((acc: number, t: any) => acc + (t.available ?? 0), 0);

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><CircularProgress /></div>;
  }

  return (
    <DataPageShell
      eyebrow="HOSPITAL TRAINERS"
      icon={UserCog}
      title="بطاقات المدربين"
      subtitle="استعراض شامل لطاقة الكادر التدريبي بالمستشفى والسعة الاستيعابية والإجازات والإسناد"
      stats={[
        { label: 'إجمالي المدربين', value: totalTrainers, icon: UserCog, tone: 'primary' },
        { label: 'على رأس العمل', value: totalTrainers - onLeaveCount, icon: UserCheck, tone: 'success' },
        { label: 'في إجازة', value: onLeaveCount, icon: CalendarOff, tone: onLeaveCount ? 'warning' : 'neutral' },
        { label: 'إجمالي الإشغال', value: totalOccupied, icon: Users, tone: 'info' },
        { label: 'المقاعد المتاحة', value: totalAvailable, icon: UserPlus, tone: totalAvailable === 0 ? 'danger' : 'success' },
      ]}
      toolbar={
        <>
          <TextField
            size="small" placeholder="بحث باسم المدرب..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <Search size={16} style={{ marginLeft: 8, color: colour.muted }} /> }}
            sx={{ minWidth: 240 }}
          />
          <TextField
            size="small" select label="القسم السريري" value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)} sx={{ minWidth: 200 }}
          >
            <MenuItem value="all">كل الأقسام</MenuItem>
            {departments.map(([id, name]) => <MenuItem key={id} value={id}>{name}</MenuItem>)}
          </TextField>
          <div style={{ marginRight: 'auto', fontSize: font.caption, color: colour.muted, fontWeight: 700 }}>
            {visible.length} مدرب متاح
          </div>
        </>
      }
    >
      {visible.length === 0 && (
        <EmptyState icon={UserCog} title="لا يوجد مدربون مطابقون" hint="جرّب تغيير البحث أو القسم." />
      )}

      <CardGrid min={340}>
        {visible.map((t: any) => (
          <EntityCard
            key={t.id}
            icon={UserCog}
            tone={t.onLeave ? 'warning' : 'violet'}
            title={t.nameAr}
            subtitle={`${t.department?.nameAr ?? 'بدون قسم'}${t.titleAr ? ` — ${t.titleAr}` : ''}`}
            badges={[
              ...(t.onLeave ? [{ label: 'في إجازة', tone: 'warning' as const }] : []),
              ...(t.qualifiedPrograms.length === 0
                ? [{ label: 'غير مؤهل لأي برنامج', tone: 'danger' as const }]
                : t.qualifiedPrograms.map((p: any) => ({ label: p.nameAr, tone: 'info' as const }))),
            ]}
            progress={{ value: t.occupied, max: t.maxTrainees || 1 }}
            metrics={[
              { label: 'روتيشنات', value: t.rotationCount, tone: 'neutral' },
              { label: 'متدربون', value: t.currentTrainees.length, tone: 'success' },
              { label: 'مقاعد متاحة', value: t.available, tone: t.available === 0 ? 'danger' : 'info' },
            ]}
            footnote={t.leave
              ? `${LEAVE_LABELS[t.leave.leaveType] ?? t.leave.leaveType} · البديل: ${t.leave.replacementTrainerNameAr ?? 'غير محدد'}`
              : 'على رأس العمل'}
            actions={[
              { label: 'عرض الملف', icon: Eye, tone: 'info', onClick: () => setProfile(t) },
              { label: 'المتدربون الحاليون', icon: Users, tone: 'success',
                onClick: () => setExpanded(expanded === t.id ? null : t.id) },
              { label: 'إسناد متدرب', icon: UserPlus, tone: 'warning', onClick: () => onNavigate('requests') },
              { label: 'إعادة إسناد', icon: ArrowRightLeft, tone: 'violet', onClick: () => onNavigate('reassignment') },
              { label: 'الإجازات', icon: CalendarOff, tone: 'warning', onClick: () => onNavigate('leaves') },
            ]}
          >
            <Collapse in={expanded === t.id}>
              <div style={{ marginTop: space.md, borderTop: `1px solid ${colour.border}`, paddingTop: space.md }}>
                {t.currentTrainees.length === 0 ? (
                  <div style={{ fontSize: font.caption, color: colour.muted }}>لا يوجد متدربون حالياً</div>
                ) : t.currentTrainees.map((c: any) => (
                  <div key={c.rotationId} style={{ padding: `${space.xs}px ${space.sm}px`, marginBottom: space.xs, borderRadius: radius.sm, background: colour.canvas, border: `1px solid ${colour.border}` }}>
                    <div style={{ fontSize: font.caption, fontWeight: 700, color: colour.text }}>{c.nameAr ?? '—'}</div>
                    <div style={{ fontSize: 11, color: colour.muted }}>
                      {c.departmentNameAr} · {String(c.startDate).slice(0, 10)} → {String(c.endDate).slice(0, 10)}
                    </div>
                  </div>
                ))}
              </div>
            </Collapse>
          </EntityCard>
        ))}
      </CardGrid>

      <Dialog open={Boolean(profile)} onClose={() => setProfile(null)} maxWidth="sm" fullWidth>
        <DialogTitle>ملف المدرب — {profile?.nameAr}</DialogTitle>
        <DialogContent dividers>
          {profile && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: space.sm, fontSize: font.body }}>
              <div><strong>القسم:</strong> {profile.department?.nameAr ?? '—'}</div>
              <div><strong>المسمى:</strong> {profile.titleAr ?? '—'}</div>
              <div><strong>الجوال:</strong> {profile.phone ?? '—'}</div>
              <div><strong>البريد:</strong> {profile.email ?? '—'}</div>
              <div><strong>السعة القصوى:</strong> {profile.maxTrainees}</div>
              <div><strong>الإشغال الحالي:</strong> {profile.occupied} ({profile.occupancyPercentage}%)</div>
              <div><strong>المقاعد المتاحة:</strong> {profile.available}</div>
              <div><strong>عدد الروتيشنات:</strong> {profile.rotationCount}</div>
              <div>
                <strong>البرامج المؤهل لها:</strong>{' '}
                {profile.qualifiedPrograms.length
                  ? profile.qualifiedPrograms.map((p: any) => p.nameAr).join('، ')
                  : 'لا يوجد'}
              </div>
              <div>
                <strong>حالة الإجازة:</strong>{' '}
                {profile.leave
                  ? `${LEAVE_LABELS[profile.leave.leaveType] ?? profile.leave.leaveType} (${profile.leave.status})`
                  : 'على رأس العمل'}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DataPageShell>
  );
};

export default TrainerCards;

