import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import {
  Alert, Box, Button, CircularProgress, Collapse, Dialog, DialogActions,
  DialogContent, DialogTitle, MenuItem, TextField,
} from '@mui/material';
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
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [profile, setProfile] = useState<any | null>(null);

  const [openAddTrainerDialog, setOpenAddTrainerDialog] = useState(false);
  const [addTrainerForm, setAddTrainerForm] = useState({
    nationalId: '',
    nameAr: '',
    titleAr: '',
    departmentId: '',
  });
  const [trainerFormError, setTrainerFormError] = useState<string | null>(null);

  const { data: trainers, isLoading } = useQuery({
    queryKey: ['trainer-cards'],
    queryFn: async () => {
      const res = await apiClient.get('/trainers/workspace-cards').catch(() => ({ data: { data: [] } }));
      return res.data?.data ?? [];
    },
  });

  const { data: deptResponse } = useQuery({
    queryKey: ['rotations-departments'],
    queryFn: async () => {
      const res = await apiClient.get('/rotations/departments').catch(() => ({ data: { data: [] } }));
      return res.data?.data ?? [];
    },
  });

  const allDepartments = useMemo(() => {
    const map = new Map<string, { id: string; nameAr: string }>();
    for (const d of deptResponse ?? []) {
      if (d.id && d.nameAr) map.set(d.id, { id: d.id, nameAr: d.nameAr });
    }
    for (const t of trainers ?? []) {
      if (t.department?.id && t.department?.nameAr) {
        map.set(t.department.id, { id: t.department.id, nameAr: t.department.nameAr });
      }
    }
    return [...map.values()];
  }, [deptResponse, trainers]);

  const visible = useMemo(() => {
    const needle = search.trim();
    return (trainers ?? []).filter((t: any) => {
      const matchesDept = deptFilter === 'all' || t.department?.id === deptFilter;
      const matchesName = !needle || `${t.nameAr ?? ''} ${t.nameEn ?? ''} ${t.nationalId ?? ''}`.includes(needle);
      return matchesDept && matchesName;
    });
  }, [trainers, search, deptFilter]);

  const createTrainerMutation = useMutation({
    mutationFn: async (payload: { nationalId: string; nameAr: string; titleAr: string; departmentId: string; roleCode: string; email: string }) => {
      const res = await apiClient.post('/org-members', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainer-cards'] });
      queryClient.invalidateQueries({ queryKey: ['org-members'] });
      setOpenAddTrainerDialog(false);
      setAddTrainerForm({ nationalId: '', nameAr: '', titleAr: '', departmentId: '' });
      setTrainerFormError(null);
    },
    onError: (err: any) => {
      setTrainerFormError(err?.response?.data?.message || 'حدث خطأ أثناء حفظ بيانات المدرب');
    },
  });

  const handleSaveTrainer = () => {
    setTrainerFormError(null);
    const nationalId = addTrainerForm.nationalId.trim();
    const nameAr = addTrainerForm.nameAr.trim();
    const titleAr = addTrainerForm.titleAr.trim();
    const departmentId = addTrainerForm.departmentId;

    if (!nationalId) {
      setTrainerFormError('الرقم الوظيفي مطلوب');
      return;
    }
    if (!nameAr) {
      setTrainerFormError('اسم المدرب مطلوب');
      return;
    }
    if (!titleAr) {
      setTrainerFormError('المسمى الوظيفي مطلوب');
      return;
    }
    if (!departmentId) {
      setTrainerFormError('يرجى اختيار القسم السريري');
      return;
    }

    // Check duplicate employee ID locally
    const duplicate = (trainers ?? []).some(
      (t: any) => (t.nationalId && t.nationalId === nationalId) || (t.person?.nationalId && t.person?.nationalId === nationalId)
    );
    if (duplicate) {
      setTrainerFormError('الرقم الوظيفي (رقم الهوية/الإقامة) مُدخل مسبقاً لمدرب آخر');
      return;
    }

    createTrainerMutation.mutate({
      nationalId,
      nameAr,
      titleAr,
      departmentId,
      roleCode: 'trainer',
      email: `trainer.${nationalId}@miran.sa`,
    });
  };

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
            size="small" placeholder="بحث باسم المدرب أو الرقم الوظيفي..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <Search size={16} style={{ marginLeft: 8, color: colour.muted }} /> }}
            sx={{ minWidth: 240 }}
          />
          <TextField
            size="small" select label="القسم السريري" value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)} sx={{ minWidth: 200 }}
          >
            <MenuItem value="all">كل الأقسام</MenuItem>
            {allDepartments.map((d: any) => <MenuItem key={d.id} value={d.id}>{d.nameAr}</MenuItem>)}
          </TextField>
          <Button
            variant="contained"
            size="small"
            startIcon={<UserPlus size={16} />}
            onClick={() => setOpenAddTrainerDialog(true)}
            sx={{ backgroundColor: '#0F766E', '&:hover': { backgroundColor: '#0D655E' }, whiteSpace: 'nowrap' }}
          >
            إضافة مدرب جديد
          </Button>
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
            subtitle={`${t.department?.nameAr ?? 'بدون قسم'}${t.titleAr ? ` — ${t.titleAr}` : ''}${t.nationalId ? ` (${t.nationalId})` : ''}`}
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
              {profile.nationalId && <div><strong>الرقم الوظيفي:</strong> {profile.nationalId}</div>}
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

      {/* دايالوج إضافة مدرب جديد */}
      <Dialog open={openAddTrainerDialog} onClose={() => setOpenAddTrainerDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, borderBottom: '1px solid #E2E8F0', pb: 1.5 }}>
          إضافة مدرب جديد
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          {trainerFormError && <Alert severity="error" sx={{ mb: 2 }}>{trainerFormError}</Alert>}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="الرقم الوظيفي"
              placeholder="مثال: 1029384756"
              size="small"
              fullWidth
              required
              value={addTrainerForm.nationalId}
              onChange={(e) => setAddTrainerForm({ ...addTrainerForm, nationalId: e.target.value })}
            />

            <TextField
              label="اسم المدرب"
              placeholder="مثال: د. محمد العتيبي"
              size="small"
              fullWidth
              required
              value={addTrainerForm.nameAr}
              onChange={(e) => setAddTrainerForm({ ...addTrainerForm, nameAr: e.target.value })}
            />

            <TextField
              label="المسمى الوظيفي"
              placeholder="مثال: استشاري طب باطني / مدرب سريري"
              size="small"
              fullWidth
              required
              value={addTrainerForm.titleAr}
              onChange={(e) => setAddTrainerForm({ ...addTrainerForm, titleAr: e.target.value })}
            />

            <TextField
              select
              label="القسم السريري"
              size="small"
              fullWidth
              required
              value={addTrainerForm.departmentId}
              onChange={(e) => setAddTrainerForm({ ...addTrainerForm, departmentId: e.target.value })}
            >
              <MenuItem value="" disabled>-- اختر القسم --</MenuItem>
              {allDepartments.map((d: any) => (
                <MenuItem key={d.id} value={d.id}>{d.nameAr}</MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, borderTop: '1px solid #E2E8F0', pt: 1.5 }}>
          <Button onClick={() => setOpenAddTrainerDialog(false)} color="inherit">
            إلغاء
          </Button>
          <Button
            variant="contained"
            onClick={() => handleSaveTrainer()}
            disabled={createTrainerMutation.isPending}
            sx={{ backgroundColor: '#0F766E', '&:hover': { backgroundColor: '#0D655E' } }}
          >
            {createTrainerMutation.isPending ? <CircularProgress size={20} color="inherit" /> : 'حفظ'}
          </Button>
        </DialogActions>
      </Dialog>
    </DataPageShell>
  );
};

export default TrainerCards;

