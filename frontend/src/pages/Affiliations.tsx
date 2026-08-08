import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader, DataPageShell } from '../components/ui';
import { apiClient } from '../api/client';
import { FileText, CheckCircle2, Clock, Building2, Send, AlertCircle, RefreshCw, FolderGit2, Clock3, Sparkles, Users, XCircle, Trash2 } from 'lucide-react';
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';

export const Affiliations: React.FC = () => {
  const { user, hasAnyRole } = useAuth();
  const queryClient = useQueryClient();

  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [openAllocateModal, setOpenAllocateModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [clusterNotes, setClusterNotes] = useState('تمت المراجعة واعتماد التوزيع على المستشفيات وفق السعة المتاحة');

  // Hospital seat allocations — dynamic
  const [allocations, setAllocations] = useState<Record<string, number>>({});

  // University Create Request Modal State
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [reqTargetOrgId, setReqTargetOrgId] = useState('');
  const [reqProgramId, setReqProgramId] = useState('');
  // Must be a code that exists in the specialty lookup table (see
  // HospitalCapacity.tsx for the same convention) — free Arabic text like
  // "طب بشري" is not a specialty code and every trainee row would fail
  // validation the moment the roster is submitted.
  const [reqSpecialty, setReqSpecialty] = useState('internal_medicine');
  const [reqDurationMonths, setReqDurationMonths] = useState(12);
  const [reqStartDate, setReqStartDate] = useState('2026-09-01');
  const [reqEndDate, setReqEndDate] = useState('2027-08-31');
  const [reqRotations, setReqRotations] = useState<Array<{ departmentNameAr: string; durationWeeks: number }>>([
    { departmentNameAr: 'الباطنة العامة', durationWeeks: 8 },
    { departmentNameAr: 'الأطفال', durationWeeks: 8 },
    { departmentNameAr: 'الجراحة العامة', durationWeeks: 8 },
    { departmentNameAr: 'النساء والتوليد', durationWeeks: 8 },
    { departmentNameAr: 'الطوارئ', durationWeeks: 8 },
    { departmentNameAr: 'طب الأسرة / اختيارية', durationWeeks: 8 },
  ]);
  const [reqTrainees, setReqTrainees] = useState<Array<{ academicNumber: string; nationalId: string; nameAr: string }>>([
    { academicNumber: '441001', nationalId: '1099112233', nameAr: 'أحمد محمد علي' },
    { academicNumber: '441002', nationalId: '1099112234', nameAr: 'خالد عبدالله عمر' },
  ]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['training-requests'],
    queryFn: async () => {
      const res = await apiClient.get('/training-requests');
      return res.data;
    },
  });

  const { data: clustersData } = useQuery({
    queryKey: ['clusters-list'],
    queryFn: async () => {
      const res = await apiClient.get('/organizations').catch(() => ({ data: [] }));
      const all = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      return all.filter((o: any) => o.organizationType?.code === 'cluster' || o.type === 'cluster' || o.code?.includes('CLUSTER'));
    },
  });
  const clusters = clustersData || [];

  // The program the request runs on. Required: the rotation breakdown below
  // becomes a request-scoped TrainingPlan tied to this program, and the
  // program's catalog duration is what the backend checks the training window
  // against — without it there is nothing to validate the plan/window against.
  const { data: programsData } = useQuery({
    queryKey: ['programs-list'],
    queryFn: async () => {
      const res = await apiClient.get('/programs').catch(() => ({ data: { data: [] } }));
      return res.data?.data ?? res.data ?? [];
    },
  });
  const programs = programsData || [];

  const createRequestMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/training-requests', {
        targetOrgId: reqTargetOrgId,
        programId: reqProgramId,
        specialty: reqSpecialty,
        durationMonths: reqDurationMonths,
        trainingStartDate: reqStartDate,
        trainingEndDate: reqEndDate,
        studentCount: reqTrainees.length,
        rotations: reqRotations.map((r) => ({
          departmentNameAr: r.departmentNameAr,
          durationWeeks: Number(r.durationWeeks),
        })),
        trainees: reqTrainees.map((t) => ({
          academicNumber: t.academicNumber,
          nationalId: t.nationalId,
          nameAr: t.nameAr,
          startDate: reqStartDate,
          endDate: reqEndDate,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-requests'] });
      setOpenCreateModal(false);
      setSuccessMsg('تم تقديم طلب التدريب وقائمة المتدربين والروتيشنات إلى التجمع الصحي بنجاح!');
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || err.message || 'فشل تقديم طلب التدريب — يرجى التثبت من البيانات');
    },
  });

  // Fetch hospitals for allocation
  // Capacity, occupancy and availability come from the hospital-cards endpoint,
  // which derives them through CapacityService. Recomputing
  // `capacity - traineeProfiles` here produced a second, subtly different
  // definition of "available seats" than the one the allocation engine enforces.
  const { data: hospitalsData } = useQuery({
    queryKey: ['hospitals-for-allocation'],
    queryFn: async () => {
      const res = await apiClient.get('/organizations/hospitals-cards').catch(() => ({ data: [] }));
      return Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
    },
  });

  const hospitals = hospitalsData || [];

  const allocateMutation = useMutation({
    mutationFn: async () => {
      const allocationsList = Object.entries(allocations)
        .filter(([_, seats]) => seats > 0)
        .map(([hospitalId, seats]) => {
          const hospital = hospitals.find((h: any) => h.id === hospitalId);
          return {
            hospitalId,
            hospitalName: hospital?.nameAr || '',
            hospitalCode: hospital?.code || '',
            seats,
          };
        });

      // 'auto_allocated' is the correct transition from 'submitted' per the state machine.
      // 'allocated' was a legacy status that is NOT reachable from 'submitted'.
      return apiClient.patch(`/training-requests/${selectedReq?.id}`, {
        status: 'auto_allocated',
        notes: clusterNotes,
        allocations: allocationsList,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-requests'] });
      queryClient.invalidateQueries({ queryKey: ['cluster-orgs'] });
      queryClient.invalidateQueries({ queryKey: ['hospitals-for-allocation'] });
      setOpenAllocateModal(false);
      setAllocations({});
      const totalAllocated = Object.values(allocations).reduce((s, v) => s + v, 0);
      setSuccessMsg(`تمت مراجعة واعتماد طلب التدريب وتوزيع ${totalAllocated} مقعد على مستشفيات التجمع بنجاح!`);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || err.message || 'فشل حفظ التوزيع — يرجى التحقق من حالة الطلب والمحاولة مجدداً');
    },
  });

  const getStatusChip = (status: string) => {
    const statusMap: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
      draft: { label: 'مسودة', color: 'default' },
      submitted: { label: 'مرسل', color: 'info' },
      under_cluster_review: { label: 'قيد المراجعة', color: 'warning' },
      under_review: { label: 'قيد المراجعة', color: 'warning' },
      returned_to_university: { label: 'مُعاد للجامعة', color: 'warning' },
      resubmitted: { label: 'مُعاد الإرسال', color: 'info' },
      auto_allocated: { label: 'موزع (آلي)', color: 'success' },
      manually_reallocated: { label: 'موزع (يدوي)', color: 'success' },
      approved: { label: 'مُعتمد — بانتظار المستشفى', color: 'success' },
      allocated: { label: 'موزع', color: 'success' },
      rejected: { label: 'مرفوض', color: 'error' },
      active: { label: 'نشط', color: 'success' },
      hospital_administrator_accepted: { label: 'قبِل المستشفى — بانتظار المشرف', color: 'info' },
      hospital_accepted: { label: 'قبِل المستشفى', color: 'info' },
      training_supervisor_accepted: { label: 'قبِل المشرف — بانتظار المدرب', color: 'info' },
      trainer_accepted: { label: 'قبِل المدرب', color: 'info' },
      hospital_returned_to_cluster: { label: 'أُعيد للتجمع من المستشفى', color: 'warning' },
    };
    const s = statusMap[status] || { label: status, color: 'default' as const };
    return <Chip label={s.label} color={s.color} size="small" />;
  };

  const openAllocationDialog = (req: any) => {
    setSelectedReq(req);
    // Initialize allocations with empty values
    const initialAllocations: Record<string, number> = {};
    hospitals.forEach((h: any) => { initialAllocations[h.id] = 0; });
    setAllocations(initialAllocations);
    setOpenAllocateModal(true);
  };

  const totalAllocated = Object.values(allocations).reduce((s, v) => s + v, 0);

  const reqRows: any[] = data?.data ?? [];
  const submitted = reqRows.filter((r: any) => ['submitted', 'under_review'].includes(r.status)).length;
  const allocatedReq = reqRows.filter((r: any) => ['allocated', 'auto_allocated'].includes(r.status)).length;
  const activeReq = reqRows.filter((r: any) => r.status === 'active').length;
  const totalStudents = reqRows.reduce((s: number, r: any) => s + (r.studentCount ?? 0), 0);
  const rejectedReq = reqRows.filter((r: any) => ['rejected', 'returned'].includes(r.status)).length;

  return (
    <DataPageShell
        title="طلبات التدريب الواردة للتجمع الصحي (Incoming Training Requests Queue)"
        subtitle={<>{user?.activeOrganization?.nameAr} — مراجعة الطلبات التشغيلية الواردة من الجامعات وتوزيع المتدربين على المستشفيات</>}
        actions={<>
          {hasAnyRole(['university_administrator', 'academic_affairs', 'platform_owner']) && (
            <Button
              variant="contained"
              startIcon={<Send size={16} />}
              onClick={() => {
                if (clusters.length > 0 && !reqTargetOrgId) setReqTargetOrgId(clusters[0].id);
                if (programs.length > 0 && !reqProgramId) setReqProgramId(programs[0].id);
                setOpenCreateModal(true);
                setErrorMsg(null);
              }}
              style={{ background: 'linear-gradient(135deg, #059669 0%, #0D9488 100%)', fontWeight: 700 }}
            >
              إرسال طلب تدريب جديد
            </Button>
          )}
          <Tooltip title="تحديث البيانات">
            <IconButton onClick={() => refetch()} style={{ color: '#059669', border: '1px solid rgba(16,185,129,0.3)' }}>
              <RefreshCw size={18} />
            </IconButton>
          </Tooltip>
        </>}
        loading={isLoading}
        stats={[
          { label: 'إجمالي الطلبات', value: reqRows.length, icon: FolderGit2, tone: 'primary' },
          { label: 'بانتظار المراجعة', value: submitted, icon: Clock3, tone: submitted ? 'warning' : 'success' },
          { label: 'تم توزيعها', value: allocatedReq, icon: Sparkles, tone: 'violet' },
          { label: 'نشطة', value: activeReq, icon: CheckCircle2, tone: 'success' },
          { label: 'إجمالي المتدربين', value: totalStudents, icon: Users, tone: 'info' },
          { label: 'مرفوضة/مُعادة', value: rejectedReq, icon: XCircle, tone: rejectedReq ? 'danger' : 'neutral' },
        ]}
    >

      {successMsg && (
        <Alert severity="success" onClose={() => setSuccessMsg(null)} style={{ borderRadius: '10px' }}>
          {successMsg}
        </Alert>
      )}

      {errorMsg && (
        <Alert severity="error" onClose={() => setErrorMsg(null)} style={{ borderRadius: '10px' }}>
          {errorMsg}
        </Alert>
      )}

      <TableContainer component={Paper} className="glass-card">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>رقم الطلب</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>الجامعة الموفدة</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>البرنامج والأفواج</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>عدد المتدربين</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>الأولوية</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>تاريخ الإرسال</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>الحالة</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700, textAlign: 'center' }}>الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} align="center"><CircularProgress size={24} /></TableCell>
              </TableRow>
            ) : data?.data?.length > 0 ? (
              data.data.map((req: any) => (
                <TableRow key={req.id}>
                  <TableCell style={{ fontFamily: 'monospace', color: '#0891B2', fontWeight: 700 }}>
                    {req.requestNumber}
                  </TableCell>
                  <TableCell style={{ color: '#0F172A', fontWeight: 700 }}>
                    {req.sourceOrg?.nameAr || '—'}
                  </TableCell>
                  <TableCell style={{ color: '#047857' }}>
                    {req.program?.nameAr || '—'}
                  </TableCell>
                  <TableCell style={{ fontWeight: 800, color: '#D97706' }}>
                    {req.studentCount} متدرب
                  </TableCell>
                  <TableCell>
                    <Chip label={req.priority === 'urgent' ? 'عاجل' : 'عادي'} size="small" color={req.priority === 'urgent' ? 'error' : 'default'} />
                  </TableCell>
                  <TableCell style={{ fontSize: '12px', color: '#64748B' }}>
                    {new Date(req.createdAt).toLocaleDateString('ar-SA')}
                  </TableCell>
                  <TableCell>
                    {getStatusChip(req.status)}
                  </TableCell>
                  <TableCell style={{ textAlign: 'center' }}>
                    {hasAnyRole(['cluster_administrator', 'training_director', 'platform_owner']) && (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => openAllocationDialog(req)}
                        style={{
                          background: req.status === 'allocated'
                            ? '#059669'
                            : 'linear-gradient(135deg, #0891b2, #0891B2)',
                          fontWeight: 700,
                          fontSize: '11px',
                        }}
                      >
                        {req.status === 'allocated' ? 'عرض التوزيع' : 'مراجعة وتوزيع'}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} align="center" style={{ color: '#64748B' }}>لا توجد طلبات تدريب تشغيلية حالياً</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Allocate Modal — Dynamic Hospitals */}
      <Dialog open={openAllocateModal} onClose={() => setOpenAllocateModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle style={{ fontWeight: 800 }}>مراجعة وتوزيع مقاعد طلب التدريب ({selectedReq?.requestNumber})</DialogTitle>
        <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '16px' }}>
          <Alert severity="info">
            المستفيد: {selectedReq?.sourceOrg?.nameAr || '—'} — عدد المتدربين المطلوب: <strong>{selectedReq?.studentCount}</strong> متدرب
          </Alert>

          {/* Show existing allocations if already allocated */}
          {selectedReq?.status === 'allocated' && selectedReq?.allocations && (
            <Alert severity="success">
              تم التوزيع مسبقاً: {(selectedReq.allocations as any[]).map((a: any) => `${a.hospitalName} (${a.seats})`).join(' • ')}
            </Alert>
          )}

          {hospitals.map((h: any) => {
            const remaining = h.available ?? 0;
            return (
              <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <TextField
                  label={`${h.nameAr} — متاح ${remaining} من ${h.capacity ?? 0} (إشغال ${h.occupancyPercentage ?? 0}%)`}
                  type="number"
                  value={allocations[h.id] || 0}
                  onChange={(e) => setAllocations({ ...allocations, [h.id]: Number(e.target.value) })}
                  fullWidth
                  inputProps={{ min: 0, max: remaining }}
                />
              </div>
            );
          })}

          {selectedReq && (
            <Alert severity={totalAllocated === selectedReq.studentCount ? 'success' : totalAllocated > selectedReq.studentCount ? 'error' : 'warning'}>
              الإجمالي الموزع: <strong>{totalAllocated}</strong> / {selectedReq.studentCount} متدرب
              {totalAllocated === selectedReq.studentCount ? ' ✅ مطابق' : totalAllocated > selectedReq.studentCount ? ' ⚠️ يتجاوز العدد المطلوب' : ' ⚠️ أقل من العدد المطلوب'}
            </Alert>
          )}

          <TextField label="ملاحظات مدير التجمع الصحي" multiline rows={2} value={clusterNotes} onChange={(e) => setClusterNotes(e.target.value)} fullWidth />

          {allocateMutation.isError && (
            <Alert severity="error">
              {(allocateMutation.error as any)?.response?.data?.message || (allocateMutation.error as any)?.message || 'فشل حفظ التوزيع'}
            </Alert>
          )}
        </DialogContent>
        <DialogActions style={{ padding: '16px 24px' }}>
          <Button onClick={() => { setOpenAllocateModal(false); allocateMutation.reset(); }}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={() => { setErrorMsg(null); allocateMutation.mutate(); }}
            disabled={allocateMutation.isPending || totalAllocated === 0}
            style={{ background: '#059669', fontWeight: 700 }}
          >
            {allocateMutation.isPending ? <CircularProgress size={20} /> : 'اعتماد التوزيع وإرساله للمستشفيات (Approve & Allocate)'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* University Create Training Request Modal */}
      <Dialog open={openCreateModal} onClose={() => setOpenCreateModal(false)} maxWidth="md" fullWidth>
        <DialogTitle style={{ fontWeight: 800 }}>تقديم طلب تدريب جديد من الجامعة إلى التجمع الصحي</DialogTitle>
        <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingTop: '16px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <FormControl fullWidth required>
              <InputLabel>التجمع الصحي المستقبل</InputLabel>
              <Select
                value={reqTargetOrgId}
                label="التجمع الصحي المستقبل"
                onChange={(e) => setReqTargetOrgId(e.target.value)}
              >
                {clusters.map((c: any) => (
                  <MenuItem key={c.id} value={c.id}>{c.nameAr} ({c.code || 'CLUSTER'})</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel>البرنامج التدريبي</InputLabel>
              <Select
                value={reqProgramId}
                label="البرنامج التدريبي"
                onChange={(e) => {
                  const p = programs.find((x: any) => x.id === e.target.value);
                  setReqProgramId(e.target.value);
                  // The program's own catalogued duration replaces whatever was
                  // typed before — it is the figure the backend actually checks
                  // the training window against.
                  if (p?.durationMonths) setReqDurationMonths(p.durationMonths);
                }}
              >
                {programs.map((p: any) => (
                  <MenuItem key={p.id} value={p.id}>{p.nameAr} ({p.durationMonths} شهر)</MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>

          <TextField
            label="رمز التخصص (Specialty Code)"
            value={reqSpecialty}
            onChange={(e) => setReqSpecialty(e.target.value)}
            helperText="رمز من جدول التخصصات المعتمد — مثال: internal_medicine"
            fullWidth
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <TextField
              label="مدة البرنامج (بالأشهر)"
              type="number"
              value={reqDurationMonths}
              InputProps={{ readOnly: true }}
              helperText="من كتالوج البرنامج — يجب أن تطابقها فترة التدريب أدناه"
              fullWidth
            />
            <TextField
              label="تاريخ بداية التدريب"
              type="date"
              value={reqStartDate}
              onChange={(e) => setReqStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="تاريخ نهاية التدريب"
              type="date"
              value={reqEndDate}
              onChange={(e) => setReqEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </div>

          {/* Structured Training Plan (Rotations) */}
          <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', backgroundColor: '#F8FAFC' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontWeight: 800, color: '#0F172A' }}>خطة الروتيشنات التدريبية (WHAT/WHEN Plan)</span>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setReqRotations([...reqRotations, { departmentNameAr: 'تخصص جديد', durationWeeks: 8 }])}
              >
                + إضافة روتيشن
              </Button>
            </div>
            {reqRotations.map((r, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 40px', gap: '12px', marginBottom: '8px', alignItems: 'center' }}>
                <TextField
                  size="small"
                  label={`روتيشن ${idx + 1}`}
                  value={r.departmentNameAr}
                  onChange={(e) => {
                    const next = [...reqRotations];
                    next[idx].departmentNameAr = e.target.value;
                    setReqRotations(next);
                  }}
                />
                <TextField
                  size="small"
                  label="المدة (أسابيع)"
                  type="number"
                  value={r.durationWeeks}
                  onChange={(e) => {
                    const next = [...reqRotations];
                    next[idx].durationWeeks = Number(e.target.value);
                    setReqRotations(next);
                  }}
                />
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => setReqRotations(reqRotations.filter((_, i) => i !== idx))}
                  disabled={reqRotations.length <= 1}
                >
                  <Trash2 size={16} />
                </IconButton>
              </div>
            ))}
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '8px' }}>
              مجموع أسابيع الروتيشنات: <strong>{reqRotations.reduce((s, r) => s + Number(r.durationWeeks || 0), 0)} أسابيع</strong> (يعادل {Math.round(reqRotations.reduce((s, r) => s + Number(r.durationWeeks || 0), 0) / 4.345)} شهراً).
            </div>
          </div>

          {/* Candidate Trainees Roster */}
          <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', backgroundColor: '#F8FAFC' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontWeight: 800, color: '#0F172A' }}>قائمة أطباء الامتياز / المرشحين (Roster — {reqTrainees.length} متدرب)</span>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setReqTrainees([...reqTrainees, { academicNumber: `44100${reqTrainees.length + 1}`, nationalId: `109911223${reqTrainees.length + 5}`, nameAr: 'متدرب جديد' }])}
              >
                + إضافة متدرب
              </Button>
            </div>
            {reqTrainees.map((t, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr 40px', gap: '12px', marginBottom: '8px', alignItems: 'center' }}>
                <TextField
                  size="small"
                  label="الرقم الجامعي"
                  value={t.academicNumber}
                  onChange={(e) => {
                    const next = [...reqTrainees];
                    next[idx].academicNumber = e.target.value;
                    setReqTrainees(next);
                  }}
                />
                <TextField
                  size="small"
                  label="الهوية الوطنية"
                  value={t.nationalId}
                  onChange={(e) => {
                    const next = [...reqTrainees];
                    next[idx].nationalId = e.target.value;
                    setReqTrainees(next);
                  }}
                />
                <TextField
                  size="small"
                  label="اسم المتدرب بالعربية"
                  value={t.nameAr}
                  onChange={(e) => {
                    const next = [...reqTrainees];
                    next[idx].nameAr = e.target.value;
                    setReqTrainees(next);
                  }}
                />
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => setReqTrainees(reqTrainees.filter((_, i) => i !== idx))}
                  disabled={reqTrainees.length <= 1}
                >
                  <Trash2 size={16} />
                </IconButton>
              </div>
            ))}
          </div>

          {createRequestMutation.isError && (
            <Alert severity="error">
              {(createRequestMutation.error as any)?.response?.data?.message || (createRequestMutation.error as any)?.message || 'فشل تقديم طلب التدريب'}
            </Alert>
          )}

        </DialogContent>
        <DialogActions style={{ padding: '16px 24px' }}>
          <Button onClick={() => setOpenCreateModal(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={() => createRequestMutation.mutate()}
            disabled={createRequestMutation.isPending || !reqTargetOrgId || !reqProgramId || reqTrainees.length === 0}
            style={{ background: '#059669', fontWeight: 700 }}
          >
            {createRequestMutation.isPending ? <CircularProgress size={20} /> : 'إرسال طلب التدريب (Submit Request)'}
          </Button>
        </DialogActions>
      </Dialog>
    </DataPageShell>
  );
};
