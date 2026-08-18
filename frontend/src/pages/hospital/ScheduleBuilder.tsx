import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Card, CardContent, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Select, FormControl, InputLabel, CircularProgress, Chip, Alert,
  Grid, Typography, Step, Stepper, StepLabel, Checkbox, ListItemText, FormHelperText,
} from '@mui/material';
import {
  Calendar as CalendarIcon, Clock, Plus, RefreshCw, AlertTriangle, CheckCircle,
  Copy, Layers, ChevronRight, ChevronLeft, Filter, Search, UserCheck, ShieldAlert,
  Send, FileText, Settings,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

interface Session {
  id?: string;
  date: string;
  startTime: string;
  endTime: string;
  departmentId: string;
  trainerProfileId?: string;
  traineeProfileId?: string;
  sessionType?: string;
  shiftType?: string;
  location?: string;
  capacity?: number;
  notes?: string;
  department?: { nameAr: string };
  trainerProfile?: { person?: { nameAr: string } };
  traineeProfile?: { person?: { nameAr: string } };
}

interface Schedule {
  id: string;
  titleAr: string;
  titleEn?: string;
  startDate: string;
  endDate: string;
  status: string;
  totalHours: number;
  department?: { nameAr: string };
  participants?: Array<{ traineeProfileId: string; traineeProfile?: { person?: { nameAr: string } } }>;
  sessions?: Session[];
  revisions?: Array<{ revision: number; changeReason?: string; publishedAt: string }>;
}

export const ScheduleBuilder: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeView, setActiveView] = useState<'week' | 'day' | 'timeline'>('week');
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [activeConflicts, setActiveConflicts] = useState<any[]>([]);

  // Wizard State
  const [wizardStep, setWizardStep] = useState(0);
  const [wTitleAr, setWTitleAr] = useState('');
  const [wStartDate, setWStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [wEndDate, setWEndDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
  );
  const [wSelectedTrainees, setWSelectedTrainees] = useState<string[]>([]);
  const [wDepartmentId, setWDepartmentId] = useState('');
  const [wTrainerProfileId, setWTrainerProfileId] = useState('');
  const [wSessionType, setWSessionType] = useState('clinical_round');
  const [wShiftType, setWShiftType] = useState('morning');
  const [wDaysOfWeek, setWDaysOfWeek] = useState<number[]>([0, 1, 2, 3, 4]); // Sun-Thu
  const [wStartTime, setWStartTime] = useState('08:00');
  const [wEndTime, setWEndTime] = useState('16:00');
  const [wRecurrenceWeeks, setWRecurrenceWeeks] = useState(2);

  // Quick Session State
  const [qDate, setQDate] = useState(new Date().toISOString().slice(0, 10));
  const [qStartTime, setQStartTime] = useState('08:00');
  const [qEndTime, setQEndTime] = useState('16:00');
  const [qDeptId, setQDeptId] = useState('');
  const [qTrainerId, setQTrainerId] = useState('');
  const [qTraineeId, setQTraineeId] = useState('');
  const [qSessionType, setQSessionType] = useState('clinical_round');

  // Queries
  const { data: schedulesData, isLoading: loadingSchedules, refetch: refetchSchedules } = useQuery({
    queryKey: ['schedules-list'],
    queryFn: async () => {
      const res = await apiClient.get('/schedules');
      return res.data?.data ?? [];
    },
  });

  // Departments to build a schedule against.
  //
  // This derived the list from `/rotations`, i.e. only departments that already
  // happen to carry a rotation, and without de-duplicating: against the current
  // hospital that yields five entries which are all the *same* department, so
  // the picker repeated «قسم الباطنية العام» five times and the other thirteen
  // departments — Emergency, ICU, Surgery, Paediatrics — could not be scheduled
  // at all. It also fetched `/operations/analytics` and discarded the result,
  // paying for a seven-query aggregate on every mount for nothing.
  //
  // `/rotations/departments` is the hospital's own department catalogue: it
  // filters on the caller's `organizationId` server-side and the hospital
  // training administration already holds the capability it requires. No role,
  // permission or endpoint was changed.
  const { data: departments } = useQuery({
    queryKey: ['schedule-builder-departments'],
    queryFn: async () => {
      const res = await apiClient.get('/rotations/departments');
      return res.data?.data ?? [];
    },
  });

  // This screen belongs to the hospital training administration (the `/hospital`
  // route admits no trainer at all), so it must read the hospital-scoped trainee
  // list. It was calling `/operations/trainer/assigned-interns`, which answers a
  // different question — "the trainees assigned to *me as a trainer*" — and is
  // role-gated to `trainer`. The hospital training administration holds no
  // TrainerProfile and no rotation, so that route answered 403 and the trainee
  // picker came up empty for exactly the role that builds the schedules. The
  // hospital-scoped equivalent is `/trainees/incoming`, which resolves the
  // caller's organisation scope on the server. The role list below is the one
  // that endpoint already grants — no role was added to either side.
  const canReadHospitalTrainees = !!user?.roles?.some((r: string) =>
    ['hospital_training_admin', 'hospital_administrator', 'org_manager', 'platform_owner', 'cluster_administrator', 'cluster_manager', 'training_director'].includes(r),
  );

  const { data: trainees } = useQuery({
    queryKey: ['schedule-builder-trainees'],
    enabled: canReadHospitalTrainees,
    queryFn: async () => {
      const res = await apiClient.get('/trainees/incoming');
      return res.data?.data ?? [];
    },
  });

  const { data: trainers } = useQuery({
    queryKey: ['trainers-list'],
    queryFn: async () => {
      const res = await apiClient.get('/trainers');
      return res.data?.data ?? [];
    },
  });

  const { data: activeScheduleData, refetch: refetchActiveSchedule } = useQuery({
    queryKey: ['schedule-detail', selectedScheduleId],
    enabled: !!selectedScheduleId,
    queryFn: async () => {
      if (!selectedScheduleId) return null;
      const res = await apiClient.get(`/schedules/${selectedScheduleId}`);
      return res.data?.data as Schedule;
    },
  });

  useEffect(() => {
    if (schedulesData && schedulesData.length > 0 && !selectedScheduleId) {
      setSelectedScheduleId(schedulesData[0].id);
    }
  }, [schedulesData]);

  // Mutations
  const createScheduleMutation = useMutation({
    mutationFn: (dto: any) => apiClient.post('/schedules', dto),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['schedules-list'] });
      setWizardOpen(false);
      const newId = res.data?.data?.id;
      if (newId) setSelectedScheduleId(newId);
    },
    onError: (err: any) => {
      const conflicts = err.response?.data?.conflicts;
      if (conflicts && conflicts.length > 0) {
        setActiveConflicts(conflicts);
        setConflictModalOpen(true);
      } else {
        alert(err.response?.data?.message || 'فشل إنشاء الجدول التدريبي');
      }
    },
  });

  const publishMutation = useMutation({
    mutationFn: (scheduleId: string) =>
      apiClient.post(`/schedules/${scheduleId}/publish`, { changeReason: 'نشر اعتماد مدير التدريب' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules-list'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-detail', selectedScheduleId] });
      alert('تم نشر الجدول التدريبي بنجاح وتوليد الشيفتات للمتدربين!');
    },
    onError: (err: any) => {
      const conflicts = err.response?.data?.conflicts;
      if (conflicts && conflicts.length > 0) {
        setActiveConflicts(conflicts);
        setConflictModalOpen(true);
      } else {
        alert(err.response?.data?.message || 'تعذر نشر الجدول التدريبي');
      }
    },
  });

  const addSessionMutation = useMutation({
    mutationFn: (sessionDto: any) =>
      apiClient.patch(`/schedules/${selectedScheduleId}`, { sessions: [sessionDto] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-detail', selectedScheduleId] });
      setQuickAddOpen(false);
    },
    onError: (err: any) => {
      const conflicts = err.response?.data?.conflicts;
      if (conflicts && conflicts.length > 0) {
        setActiveConflicts(conflicts);
        setConflictModalOpen(true);
      } else {
        alert(err.response?.data?.message || 'تعذر إضافة الجلسة لوجود تعارض');
      }
    },
  });

  // Preview & Pre-conflict Check state in Wizard
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [wizardConflicts, setWizardConflicts] = useState<any[]>([]);

  // Filter trainees based on selected Department Rotation
  const departmentTrainees = (trainees || []).filter((t: any) => {
    if (!wDepartmentId) return true;
    const traineeRotations: any[] = t.rotations || [];
    return traineeRotations.some((r: any) =>
      r.departmentId === wDepartmentId && ['active', 'scheduled'].includes(r.status)
    );
  });

  // Filter trainers based on selected Department
  const departmentTrainers = (trainers || []).filter((tr: any) => {
    if (!wDepartmentId) return true;
    // Match either trainer department or department where trainer is assigned
    return tr.departmentId === wDepartmentId || !tr.departmentId;
  });

  // When Department is changed, auto-align start/end dates from relevant rotations if possible
  const handleDepartmentChange = (deptId: string) => {
    setWDepartmentId(deptId);
    setWSelectedTrainees([]);
    // Find eligible trainees for this department
    const eligible = (trainees || []).filter((t: any) =>
      (t.rotations || []).some((r: any) => r.departmentId === deptId && ['active', 'scheduled'].includes(r.status))
    );
    if (eligible.length > 0) {
      const activeRot = eligible[0].rotations?.find((r: any) => r.departmentId === deptId && ['active', 'scheduled'].includes(r.status));
      if (activeRot?.startDate && activeRot?.endDate) {
        setWStartDate(new Date(activeRot.startDate).toISOString().slice(0, 10));
        setWEndDate(new Date(activeRot.endDate).toISOString().slice(0, 10));
      }
    }
  };

  // Generate Wizard Sessions Preview
  const generateWizardSessions = () => {
    const sessions: any[] = [];
    const start = new Date(wStartDate);
    const end = new Date(wEndDate);
    const curr = new Date(start);

    while (curr <= end) {
      const dayOfWeek = curr.getDay(); // 0: Sun, 6: Sat
      if (wDaysOfWeek.includes(dayOfWeek)) {
        const dateStr = curr.toISOString().slice(0, 10);
        sessions.push({
          date: dateStr,
          startTime: wStartTime,
          endTime: wEndTime,
          departmentId: wDepartmentId,
          trainerProfileId: wTrainerProfileId || undefined,
          sessionType: wSessionType,
          shiftType: wShiftType,
        });
      }
      curr.setDate(curr.getDate() + 1);
    }
    return sessions;
  };

  // Check conflicts live when entering Step 3 (Preview)
  const handleNextStep = async (nextStep: number) => {
    if (nextStep === 3) {
      const sessions = generateWizardSessions();
      if (!sessions || sessions.length === 0) {
        alert('لم يتم توليد أي جلسات تدريبية وفق التواريخ والأيام المحددة. يرجى مراجعة التواريخ والأيام.');
        return;
      }
      setCheckingConflicts(true);
      try {
        const proposedSessions: any[] = sessions.map((s) => ({
          ...s,
          traineeProfileIds: wSelectedTrainees,
        }));
        const res = await apiClient.post('/schedules/check-conflicts', { sessions: proposedSessions });
        const data = res.data?.data;
        if (data?.hasConflict) {
          setWizardConflicts(data.conflicts || []);
        } else {
          setWizardConflicts([]);
        }
      } catch (err: any) {
        const conflicts = err.response?.data?.conflicts;
        if (conflicts) {
          setWizardConflicts(conflicts);
        }
      } finally {
        setCheckingConflicts(false);
      }
    }
    setWizardStep(nextStep);
  };

  const handleCreateWizardSubmit = () => {
    if (!wTitleAr) return alert('الرجاء إدخال عنوان الجدول التدريبي');
    if (wSelectedTrainees.length === 0) return alert('الرجاء اختيار متدرب واحد على الأقل');
    if (!wDepartmentId) return alert('الرجاء اختيار القسم التدريبي الرئيسي');

    const sessions = generateWizardSessions();
    if (!sessions || sessions.length === 0) {
      return alert('لم يتم توليد أي جلسات تدريبية وفق التواريخ والأيام المحددة.');
    }

    createScheduleMutation.mutate({
      titleAr: wTitleAr,
      startDate: wStartDate,
      endDate: wEndDate,
      departmentId: wDepartmentId,
      traineeProfileIds: wSelectedTrainees,
      sessions,
    });
  };

  const canPublish = user?.roles?.some((r) =>
    ['hospital_training_admin', 'org_manager', 'platform_owner'].includes(r),
  );

  const daysHeader = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  return (
    <Box sx={{ p: 2, dir: 'rtl' }}>
      {/* Header & Main Controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarIcon color="#2563eb" /> منشئ ومحرك الجدول التدريبي
          </Typography>
          <Typography variant="body2" color="text.secondary">
            إدارة وتوزيع المناوبات والشيفتات والجلسات السريرية مع محرك فحص التعارضات الفوري
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<Plus size={18} />}
            onClick={() => setQuickAddOpen(true)}
            disabled={!selectedScheduleId}
          >
            إضافة جلسة سريعة
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Layers size={18} />}
            onClick={() => setWizardOpen(true)}
            sx={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
          >
            معالج معمارية الجدول (Schedule Wizard)
          </Button>
        </Box>
      </Box>

      {/* Schedules Selector Bar & View Toggles */}
      <Card sx={{ mb: 3, p: 2, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>الجدول التدريبي الحالي</InputLabel>
              <Select
                value={selectedScheduleId || ''}
                label="الجدول التدريبي الحالي"
                onChange={(e) => setSelectedScheduleId(e.target.value)}
              >
                {schedulesData?.map((s: Schedule) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.titleAr} ({s.status === 'published' ? 'منشور' : 'مسودة'}) — {s.totalHours} ساعة
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
              <Button
                size="small"
                variant={activeView === 'week' ? 'contained' : 'outlined'}
                onClick={() => setActiveView('week')}
              >
                عرض أسبوعي (Week View)
              </Button>
              <Button
                size="small"
                variant={activeView === 'day' ? 'contained' : 'outlined'}
                onClick={() => setActiveView('day')}
              >
                عرض يومي (Day View)
              </Button>
              <Button
                size="small"
                variant={activeView === 'timeline' ? 'contained' : 'outlined'}
                onClick={() => setActiveView('timeline')}
              >
                الخط الزمني (Timeline)
              </Button>
            </Box>
          </Grid>

          <Grid item xs={12} md={4} sx={{ textAlign: 'left' }}>
            {activeScheduleData && (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
                <Chip
                  label={activeScheduleData.status === 'published' ? 'منشور معتمد' : 'مسودة قيد المراجعة'}
                  color={activeScheduleData.status === 'published' ? 'success' : 'warning'}
                  size="small"
                />
                {canPublish && activeScheduleData.status !== 'published' && (
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    startIcon={<Send size={16} />}
                    onClick={() => publishMutation.mutate(activeScheduleData.id)}
                  >
                    اعتماد ونشر الجدول النهائي
                  </Button>
                )}
              </Box>
            )}
          </Grid>
        </Grid>
      </Card>

      {/* Schedule Hours & Progress Bar */}
      {activeScheduleData && (
        <Card sx={{ mb: 3, p: 2, background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', borderRadius: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <Typography variant="body2" color="text.secondary">إجمالي الساعات المجدولة</Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1e293b' }}>
                {activeScheduleData.totalHours} ساعة تدريبية
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="body2" color="text.secondary">المتدربون المشاركون</Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#2563eb' }}>
                {activeScheduleData.participants?.length || 0} متدربين
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="body2" color="text.secondary">عدد الجلسات والشيفتات</Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#059669' }}>
                {activeScheduleData.sessions?.length || 0} جلسة
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="body2" color="text.secondary">الإصدار الحالي (Revision)</Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#7c3aed' }}>
                v{activeScheduleData.revisions?.[0]?.revision || 1} Snapshot
              </Typography>
            </Grid>
          </Grid>
        </Card>
      )}

      {/* Calendar Grid View (Week View Layout) */}
      {activeScheduleData ? (
        <Card sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
            {activeScheduleData.titleAr} — جدول الجلسات التدريبية
          </Typography>

          <Grid container spacing={1} sx={{ minWidth: 800 }}>
            {daysHeader.map((dayName, idx) => (
              <Grid item xs={12 / 7} key={idx}>
                <Box
                  sx={{
                    p: 1.5,
                    bgcolor: '#1e293b',
                    color: 'white',
                    borderRadius: 1,
                    textAlign: 'center',
                    fontWeight: 'bold',
                    mb: 1,
                  }}
                >
                  {dayName}
                </Box>
                <Box sx={{ minHeight: 400, bgcolor: '#f8fafc', p: 1, borderRadius: 1, border: '1px border #e2e8f0' }}>
                  {activeScheduleData.sessions
                    ?.filter((s) => new Date(s.date).getDay() === idx)
                    .map((sess, sIdx) => (
                      <Card
                        key={sIdx}
                        sx={{
                          p: 1.5,
                          mb: 1.5,
                          borderRadius: 1.5,
                          borderLeft: '4px solid #2563eb',
                          bgcolor: 'white',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        }}
                      >
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#1e293b' }}>
                          {sess.startTime} - {sess.endTime}
                        </Typography>
                        <Typography variant="caption" display="block" color="text.secondary">
                          القسم: {sess.department?.nameAr || 'القسم العام'}
                        </Typography>
                        {sess.trainerProfile && (
                          <Typography variant="caption" display="block" color="primary">
                            المدرب: {sess.trainerProfile.person?.nameAr}
                          </Typography>
                        )}
                        {sess.traineeProfile && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            المتدرب: {sess.traineeProfile.person?.nameAr}
                          </Typography>
                        )}
                        <Chip
                          label={sess.sessionType || 'مرور سريري'}
                          size="small"
                          sx={{ mt: 1, fontSize: '0.65rem', height: 20 }}
                        />
                      </Card>
                    ))}
                </Box>
              </Grid>
            ))}
          </Grid>
        </Card>
      ) : (
        <Alert severity="info">الرجاء اختيار أو إنشاء جدول تدريبي لعرض التفاصيل والجلسات</Alert>
      )}

      {/* Schedule Wizard Modal */}
      <Dialog open={wizardOpen} onClose={() => setWizardOpen(false)} maxWidth="md" fullWidth dir="rtl">
        <DialogTitle sx={{ fontWeight: 'bold' }}>معالج إنشاء وتوزيع الجدول التدريبي (Schedule Wizard)</DialogTitle>
        <DialogContent dividers>
          <Stepper activeStep={wizardStep} sx={{ mb: 3 }}>
            <Step><StepLabel>البيانات العامة</StepLabel></Step>
            <Step><StepLabel>اختيار المتدربين</StepLabel></Step>
            <Step><StepLabel>الأقسام والوقت</StepLabel></Step>
            <Step><StepLabel>فحص التعارضات والنشر</StepLabel></Step>
          </Stepper>

          {wizardStep === 0 && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="عنوان الجدول التدريبي"
                  value={wTitleAr}
                  onChange={(e) => setWTitleAr(e.target.value)}
                  placeholder="مثال: جدول تدريب مناوبات قسم الباطنة - الدفعة الأولى"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>القسم التدريبي المستهدف</InputLabel>
                  <Select
                    value={wDepartmentId}
                    label="القسم التدريبي المستهدف"
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                  >
                    {departments?.map((d: any) => (
                      <MenuItem key={d.id} value={d.id}>{d.nameAr}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>المدرب المشرف (اختياري)</InputLabel>
                  <Select
                    value={wTrainerProfileId}
                    label="المدرب المشرف (اختياري)"
                    onChange={(e) => setWTrainerProfileId(e.target.value)}
                  >
                    <MenuItem value="">بدون مدرب مخصص</MenuItem>
                    {departmentTrainers.map((tr: any) => (
                      <MenuItem key={tr.id} value={tr.id}>{tr.person?.nameAr}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="تاريخ بداية الجدول"
                  value={wStartDate}
                  onChange={(e) => setWStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="تاريخ نهاية الجدول"
                  value={wEndDate}
                  onChange={(e) => setWEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          )}

          {wizardStep === 1 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
                المتدربون المؤهلون في {departments?.find((d: any) => d.id === wDepartmentId)?.nameAr || 'القسم'}:
              </Typography>
              {departmentTrainees.length === 0 ? (
                <Alert severity="warning" sx={{ my: 2 }}>
                  لا يوجد متدربون مسندون حالياً بروتيشن في هذا القسم. اختر قسماً آخر أو أسند المتدربين للقسم أولاً.
                </Alert>
              ) : (
                <Grid container spacing={1}>
                  {departmentTrainees.map((t: any) => {
                    const activeRot = t.rotations?.find((r: any) => r.departmentId === wDepartmentId && ['active', 'scheduled'].includes(r.status));
                    const isSelected = wSelectedTrainees.includes(t.id);
                    return (
                      <Grid item xs={12} sm={6} key={t.id}>
                        <Box
                          onClick={() => {
                            if (isSelected) {
                              setWSelectedTrainees(wSelectedTrainees.filter((id) => id !== t.id));
                            } else {
                              setWSelectedTrainees([...wSelectedTrainees, t.id]);
                            }
                          }}
                          sx={{
                            p: 1.5,
                            border: '1px solid',
                            borderRadius: 1.5,
                            cursor: 'pointer',
                            bgcolor: isSelected ? '#eff6ff' : 'white',
                            borderColor: isSelected ? '#2563eb' : '#cbd5e1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {t.person?.nameAr || 'متدرب'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {t.traineeNumber || t.person?.nationalId || ''}
                              {activeRot?.startDate && activeRot?.endDate ? ` · روتيشن: ${new Date(activeRot.startDate).toLocaleDateString('ar-SA')} - ${new Date(activeRot.endDate).toLocaleDateString('ar-SA')}` : ''}
                            </Typography>
                          </Box>
                          {isSelected && <CheckCircle size={18} color="#2563eb" />}
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              )}
            </Box>
          )}

          {wizardStep === 2 && (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="time"
                  label="وقت بداية الجلسة"
                  value={wStartTime}
                  onChange={(e) => setWStartTime(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="time"
                  label="وقت نهاية الجلسة"
                  value={wEndTime}
                  onChange={(e) => setWEndTime(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>نوع الجلسة</InputLabel>
                  <Select value={wSessionType} label="نوع الجلسة" onChange={(e) => setWSessionType(e.target.value)}>
                    <MenuItem value="clinical_round">مرور سريري (Clinical Round)</MenuItem>
                    <MenuItem value="emergency_shift">مناوبة طوارئ (Emergency Shift)</MenuItem>
                    <MenuItem value="lecture">محاضرة / سيمنار (Lecture)</MenuItem>
                    <MenuItem value="workshop">ورشة عمل مهارية (Workshop)</MenuItem>
                    <MenuItem value="call">مناوبة واستدعاء On-Call</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>فترة الشيفت</InputLabel>
                  <Select value={wShiftType} label="فترة الشيفت" onChange={(e) => setWShiftType(e.target.value)}>
                    <MenuItem value="morning">صباحي (Morning)</MenuItem>
                    <MenuItem value="evening">مسائي (Evening)</MenuItem>
                    <MenuItem value="night">ليلي (Night)</MenuItem>
                    <MenuItem value="24h">مناوبة كاملة 24 ساعة</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          )}

          {wizardStep === 3 && (
            <Box sx={{ py: 1 }}>
              {checkingConflicts ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CircularProgress size={36} sx={{ color: '#2563eb', mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    جارٍ فحص التعارضات الزمانية والمكانية وسعة القسم عبر Conflict Engine...
                  </Typography>
                </Box>
              ) : wizardConflicts.length > 0 ? (
                <Box>
                  <Alert severity="error" sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                      تم اكتشاف {wizardConflicts.length} تعارض(ات) يمنع حفظ الجدول:
                    </Typography>
                    <Box component="ul" sx={{ pl: 2, mb: 0 }}>
                      {wizardConflicts.map((c: any, idx: number) => (
                        <li key={idx} style={{ fontSize: 13, marginTop: 4 }}>
                          {c.messageAr || c.type} ({c.details?.date || ''})
                        </li>
                      ))}
                    </Box>
                  </Alert>
                  <Typography variant="caption" color="text.secondary">
                    يرجى الرجوع للخطوات السابقة وتعديل التواريخ أو الأوقات لحل التعارض.
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <CheckCircle size={48} color="#059669" style={{ marginBottom: 12 }} />
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1, color: '#059669' }}>
                    تم التحقق بنجاح — لا توجد أي تعارضات
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    سيتم إنشاء {generateWizardSessions().length} جلسة تدريبية لـ {wSelectedTrainees.length} متدرب في {departments?.find((d: any) => d.id === wDepartmentId)?.nameAr}.
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button disabled={wizardStep === 0} onClick={() => setWizardStep(wizardStep - 1)}>
            السابق
          </Button>

          {wizardStep < 3 ? (
            <Button
              variant="contained"
              onClick={() => handleNextStep(wizardStep + 1)}
              disabled={(wizardStep === 0 && !wDepartmentId) || (wizardStep === 1 && wSelectedTrainees.length === 0)}
            >
              التالي
            </Button>
          ) : (
            <Button
              variant="contained"
              color="success"
              onClick={handleCreateWizardSubmit}
              disabled={createScheduleMutation.isPending || checkingConflicts || wizardConflicts.length > 0}
            >
              {createScheduleMutation.isPending ? <CircularProgress size={20} /> : 'حفظ الجدول التدريبي'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Quick Add Session Modal */}
      <Dialog open={quickAddOpen} onClose={() => setQuickAddOpen(false)} maxWidth="sm" fullWidth dir="rtl">
        <DialogTitle sx={{ fontWeight: 'bold' }}>إضافة جلسة / مناوبة تدريبية سريعة</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="date"
                label="التاريخ"
                value={qDate}
                onChange={(e) => setQDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="time"
                label="وقت البداية"
                value={qStartTime}
                onChange={(e) => setQStartTime(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="time"
                label="وقت النهاية"
                value={qEndTime}
                onChange={(e) => setQEndTime(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setQuickAddOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={() =>
              addSessionMutation.mutate({
                date: qDate,
                startTime: qStartTime,
                endTime: qEndTime,
                departmentId: qDeptId || activeScheduleData?.department?.nameAr || '',
                trainerProfileId: qTrainerId || undefined,
                traineeProfileId: qTraineeId || undefined,
                sessionType: qSessionType,
              })
            }
          >
            إضافة الجلسة
          </Button>
        </DialogActions>
      </Dialog>

      {/* Conflict Engine Modal Alert */}
      <Dialog open={conflictModalOpen} onClose={() => setConflictModalOpen(false)} maxWidth="sm" fullWidth dir="rtl">
        <DialogTitle sx={{ color: '#dc2626', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShieldAlert /> تم اكتشاف تعارض في الجدول (Conflict Detection)
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="error" sx={{ mb: 2 }}>
            محرك فحص التعارضات يمنع حفظ/نشر الأوقات المحددة للأسباب التالية:
          </Alert>
          {activeConflicts.map((conf, i) => (
            <Box key={i} sx={{ p: 1.5, mb: 1, bgcolor: '#fef2f2', borderRight: '4px solid #dc2626', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#991b1b' }}>
                {conf.messageAr}
              </Typography>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConflictModalOpen(false)}>حسناً، تعديل الأوقات</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
