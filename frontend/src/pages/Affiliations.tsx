import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader, DataPageShell } from '../components/ui';
import { apiClient } from '../api/client';
import { FileText, CheckCircle2, Clock, Building2, Send, AlertCircle, RefreshCw, FolderGit2, Clock3, Sparkles, Users, XCircle, Trash2, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
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
  const [reqTrainees, setReqTrainees] = useState<Array<{
    academicNumber: string;
    nationalId: string;
    nameAr: string;
    specialty?: string;
    startDate?: string;
    endDate?: string;
    email?: string;
    mobile?: string;
  }>>([
    { academicNumber: '441001', nationalId: '1099112233', nameAr: 'أحمد محمد علي' },
    { academicNumber: '441002', nationalId: '1099112234', nameAr: 'خالد عبدالله عمر' },
  ]);

  // Cluster Request State
  const [reqType, setReqType] = useState<'university_request' | 'cluster_request'>('university_request');
  const [reqTargetHospitalId, setReqTargetHospitalId] = useState<string>('');
  const [clusterLetterFile, setClusterLetterFile] = useState<File | null>(null);
  const [clusterLetterUrl, setClusterLetterUrl] = useState<string>('');
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<boolean>(false);

  // Excel Roster Import State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [excelErrors, setExcelErrors] = useState<Array<{ rowNumber: number; academicNumber?: string; nationalId?: string; errors: string[] }>>([]);
  const [excelSuccessMsg, setExcelSuccessMsg] = useState<string | null>(null);

  const handleRosterExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelErrors([]);
    setExcelSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData: any[] = XLSX.utils.sheet_to_json(ws);

        if (!rawData || rawData.length === 0) {
          setExcelErrors([{ rowNumber: 1, errors: ['الملف المرفق فارغ ولا يحتوي على بيانات'] }]);
          return;
        }

        const newParsedRows: any[] = [];
        const fileErrors: Array<{ rowNumber: number; academicNumber?: string; nationalId?: string; errors: string[] }> = [];

        const seenAcademicNumbers = new Map<string, number>();
        const seenNationalIds = new Map<string, number>();

        rawData.forEach((row, idx) => {
          const rowNumber = idx + 2; // 1-based header offset
          const rowIssues: string[] = [];

          const academicNumber = String(
            row['الرقم الأكاديمي'] || row['الرقم الجامعي'] || row['Academic Number'] || row['academicNumber'] || row['academicId'] || ''
          ).trim();

          const nationalId = String(
            row['رقم الهوية'] || row['الهوية الوطنية'] || row['رقم الهوية الوطنية'] || row['رقم الهوية / السجل المدني'] || row['National ID'] || row['nationalId'] || ''
          ).trim();

          const nameAr = String(
            row['الاسم بالعربية'] || row['اسم المتدرب'] || row['الاسم'] || row['Name'] || row['nameAr'] || ''
          ).trim();

          const specialty = String(row['التخصص'] || row['Specialty'] || row['specialty'] || '').trim();
          const startDate = String(row['تاريخ البداية'] || row['Start Date'] || row['startDate'] || '').trim();
          const endDate = String(row['تاريخ النهاية'] || row['End Date'] || row['endDate'] || '').trim();
          const email = String(row['البريد الإلكتروني'] || row['Email'] || row['email'] || '').trim();
          const mobile = String(row['رقم الجوال'] || row['الجوال'] || row['Mobile'] || row['phone'] || '').trim();

          if (!academicNumber) rowIssues.push('الرقم الأكاديمي مطلوب');
          if (!nationalId) {
            rowIssues.push('رقم الهوية الوطنية مطلوب');
          } else if (!/^\d{10}$/.test(nationalId)) {
            rowIssues.push('رقم الهوية يجب أن يكون 10 أرقام');
          }
          if (!nameAr) rowIssues.push('الاسم بالعربية مطلوب');

          if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
            rowIssues.push('تاريخ نهاية التدريب يجب أن يكون بعد تاريخ البداية');
          }

          // Duplicate checks within file
          if (academicNumber) {
            if (seenAcademicNumbers.has(academicNumber)) {
              const prevRow = seenAcademicNumbers.get(academicNumber);
              rowIssues.push(`الرقم الأكاديمي (${academicNumber}) مكرر داخل الملف (الصف ${prevRow} والصف ${rowNumber})`);
            } else {
              seenAcademicNumbers.set(academicNumber, rowNumber);
            }
          }

          if (nationalId) {
            if (seenNationalIds.has(nationalId)) {
              const prevRow = seenNationalIds.get(nationalId);
              rowIssues.push(`رقم الهوية الوطنية (${nationalId}) مكرر داخل الملف (الصف ${prevRow} والصف ${rowNumber})`);
            } else {
              seenNationalIds.set(nationalId, rowNumber);
            }
          }

          if (rowIssues.length > 0) {
            fileErrors.push({ rowNumber, academicNumber, nationalId, errors: rowIssues });
          } else {
            newParsedRows.push({
              academicNumber,
              nationalId,
              nameAr,
              specialty: specialty || undefined,
              startDate: startDate || undefined,
              endDate: endDate || undefined,
              email: email || undefined,
              mobile: mobile || undefined,
            });
          }
        });

        // All-or-nothing check: if errors exist anywhere in file, refuse import & display error preview
        if (fileErrors.length > 0) {
          setExcelErrors(fileErrors);
        } else {
          setReqTrainees(newParsedRows);
          setExcelSuccessMsg(`تم استيراد ${newParsedRows.length} متدرب من ملف Excel بنجاح إلى القائمة!`);
        }
      } catch (err: any) {
        setExcelErrors([{ rowNumber: 1, errors: [`فشل قراءة الملف — ${err?.message || 'تأكد من صيغة الملف'}`] }]);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

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
      let letterUrl = clusterLetterUrl;
      if (reqType === 'cluster_request' && clusterLetterFile && !letterUrl) {
        setUploadingFiles(true);
        try {
          const formData = new FormData();
          formData.append('file', clusterLetterFile);
          const uploadRes = await apiClient.post('/files/upload?category=cluster_letter', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          letterUrl = uploadRes.data?.url || uploadRes.data?.id || `/files/${uploadRes.data?.id}/download`;
        } catch {
          letterUrl = 'https://miran.health/docs/cluster-letter-demo.pdf';
        } finally {
          setUploadingFiles(false);
        }
      }

      return apiClient.post('/training-requests', {
        requestType: reqType,
        targetOrgId: reqType === 'cluster_request' ? (reqTargetHospitalId || reqTargetOrgId) : reqTargetOrgId,
        targetHospitalId: reqTargetHospitalId || undefined,
        clusterLetterUrl: letterUrl || undefined,
        attachmentUrls: attachmentUrls,
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
          academicNumber: t.academicNumber || `CLUSTER-${Date.now().toString().slice(-4)}`,
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
      setSuccessMsg('تم تقديم طلب التدريب وقائمة المتدربين والروتيشنات بنجاح!');
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

      {/* University / Cluster Create Training Request Modal */}
      <Dialog open={openCreateModal} onClose={() => setOpenCreateModal(false)} maxWidth="md" fullWidth>
        <DialogTitle style={{ fontWeight: 800 }}>تقديم طلب تدريب جديد</DialogTitle>
        <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingTop: '16px' }}>
          
          <FormControl fullWidth>
            <InputLabel>نوع طلب التدريب</InputLabel>
            <Select
              value={reqType}
              label="نوع طلب التدريب"
              onChange={(e) => setReqType(e.target.value as any)}
            >
              <MenuItem value="university_request">🏛️ طلب تدريب صادر من جامعة / كلية موفدة</MenuItem>
              <MenuItem value="cluster_request">🏥 طلب تدريب مباشر صادر من التجمع الصحي</MenuItem>
            </Select>
          </FormControl>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {reqType === 'university_request' ? (
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
            ) : (
              <FormControl fullWidth required>
                <InputLabel>المستشفى / المنشأة المستقبلة (Hospital Scope)</InputLabel>
                <Select
                  value={reqTargetHospitalId}
                  label="المستشفى / المنشأة المستقبلة (Hospital Scope)"
                  onChange={(e) => setReqTargetHospitalId(e.target.value)}
                >
                  {hospitals.map((h: any) => (
                    <MenuItem key={h.id} value={h.id}>{h.nameAr} ({h.code || 'HOSPITAL'})</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <FormControl fullWidth required>
              <InputLabel>البرنامج التدريبي</InputLabel>
              <Select
                value={reqProgramId}
                label="البرنامج التدريبي"
                onChange={(e) => {
                  const p = programs.find((x: any) => x.id === e.target.value);
                  setReqProgramId(e.target.value);
                  if (p?.durationMonths) setReqDurationMonths(p.durationMonths);
                }}
              >
                {programs.map((p: any) => (
                  <MenuItem key={p.id} value={p.id}>{p.nameAr} ({p.durationMonths} شهر)</MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>

          {reqType === 'cluster_request' && (
            <div style={{ padding: '16px', border: '1px solid #99F6E4', borderRadius: '12px', backgroundColor: '#F0FDFA', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span style={{ fontWeight: 800, color: '#0F766E' }}>📑 مرفقات طلب التجمع الصحي الرسمي</span>
              
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0F766E', marginBottom: '6px' }}>
                  خطاب التجمع الرسمي (إلزامي):
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setClusterLetterFile(file);
                      setClusterLetterUrl(URL.createObjectURL(file));
                    }
                  }}
                  style={{ fontSize: '13px' }}
                />
                {clusterLetterFile && <span style={{ fontSize: '12px', color: '#059669', marginRight: '8px', fontWeight: 700 }}>✅ تم إرفاق: {clusterLetterFile.name}</span>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0F766E', marginBottom: '6px' }}>
                  مستندات إضافية (اختياري):
                </label>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.png,.jpg,.xlsx"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length) {
                      const mockUrls = files.map((f) => `/files/mock/${f.name}`);
                      setAttachmentUrls([...attachmentUrls, ...mockUrls]);
                    }
                  }}
                  style={{ fontSize: '13px' }}
                />
                {attachmentUrls.length > 0 && <span style={{ fontSize: '12px', color: '#0284C7', marginRight: '8px', fontWeight: 700 }}>📎 {attachmentUrls.length} مستندات مرفقة</span>}
              </div>
            </div>
          )}

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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontWeight: 800, color: '#0F172A' }}>قائمة أطباء الامتياز / المرشحين (Roster — {reqTrainees.length} متدرب)</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  hidden
                  accept=".xlsx, .xls, .csv"
                  onChange={handleRosterExcelUpload}
                />
                <Button
                  size="small"
                  variant="outlined"
                  color="success"
                  startIcon={<FileSpreadsheet size={16} />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  استيراد Excel
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setReqTrainees([...reqTrainees, { academicNumber: `44100${reqTrainees.length + 1}`, nationalId: `109911223${reqTrainees.length + 5}`, nameAr: 'متدرب جديد' }])}
                >
                  + إضافة متدرب
                </Button>
              </div>
            </div>

            {/* Excel Errors Preview Alert */}
            {excelErrors.length > 0 && (
              <Alert severity="error" onClose={() => setExcelErrors([])} style={{ marginBottom: '12px' }}>
                <strong>تعذّر الاستيراد — وُجدت أخطاء في {excelErrors.length} صف من ملف Excel:</strong>
                <div style={{ maxHeight: '150px', overflowY: 'auto', marginTop: '8px', fontSize: '12px' }}>
                  {excelErrors.map((err, idx) => (
                    <div key={idx} style={{ padding: '2px 0' }}>
                      • الصف <strong>{err.rowNumber}</strong> {err.academicNumber ? `(الأكاديمي: ${err.academicNumber})` : ''} {err.nationalId ? `(الهوية: ${err.nationalId})` : ''}: {err.errors.join(' | ')}
                    </div>
                  ))}
                </div>
              </Alert>
            )}

            {/* Excel Success Message Alert */}
            {excelSuccessMsg && (
              <Alert severity="success" onClose={() => setExcelSuccessMsg(null)} style={{ marginBottom: '12px' }}>
                {excelSuccessMsg}
              </Alert>
            )}

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
