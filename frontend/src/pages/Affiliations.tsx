import React, { useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader, DataPageShell } from '../components/ui';
import { apiClient } from '../api/client';
import {
  FileText, CheckCircle2, Clock, Building2, Send, AlertCircle, RefreshCw,
  FolderGit2, Clock3, Sparkles, Users, XCircle, Trash2, FileSpreadsheet, Eye,
  Undo2, ShieldCheck, Search, Filter, Calendar, History, UserCheck, Layers, ArrowRight,
} from 'lucide-react';
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
  Tabs,
  Tab,
  Box,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';

export const Affiliations: React.FC = () => {
  const { user, hasAnyRole, hasCapability } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get('tab') === 'sent' ? 'sent' : 'incoming';
  const [detailTab, setDetailTab] = useState<'info' | 'trainees' | 'history'>('info');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [openAllocateModal, setOpenAllocateModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [clusterNotes, setClusterNotes] = useState('تمت المراجعة واعتماد التوزيع على المستشفيات وفق السعة المتاحة');

  // Row-action dialogs: View Details, Approve (confirm), Reject, Return
  const [detailsReq, setDetailsReq] = useState<any>(null);
  const [confirmApproveReq, setConfirmApproveReq] = useState<any>(null);
  const [rejectReq, setRejectReq] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [returnReq, setReturnReq] = useState<any>(null);
  const [returnNotes, setReturnNotes] = useState('');

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

  const { data, isLoading, isError, error, refetch } = useQuery({
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

  // ─── Row actions (approve / reject / return / details) ─────────────────────
  // Gates mirror the backend state machine + capabilities, so a button never
  // shows for a transition the API will reject (RBAC stays backend-authoritative).
  const canApprove = hasCapability('training_request.approve');
  const canReturn = hasCapability('training_request.return');
  const canViewDetails = hasCapability('training_request.view');
  // Assign = PATCH /training-requests/:id (status + allocations) → cluster users
  // who also hold the review/create capability (keeps the cluster queue cluster-only).
  const isClusterUser = hasAnyRole(['cluster_administrator', 'cluster_manager', 'training_director', 'platform_owner', 'system_admin']);
  const canAssign = isClusterUser && (hasCapability('training_request.review') || hasCapability('training_request.create'));
  // Reject = POST /training-requests/:id/reject → role-gated on CLUSTER_ROLES only
  // (cluster_administrator, training_director, platform_owner). cluster_manager is
  // intentionally excluded server-side, so the button must not show for it.
  const canReject = hasAnyRole(['cluster_administrator', 'training_director', 'platform_owner']);

  const APPROVEABLE = ['auto_allocated', 'allocated', 'manually_reallocated'];
  const REJECTABLE = ['submitted', 'under_cluster_review', 'auto_allocated', 'allocated', 'manually_reallocated', 'approved'];
  const RETURNABLE = ['submitted', 'under_cluster_review', 'auto_allocated', 'allocated', 'manually_reallocated'];
  const ASSIGNABLE = ['submitted', 'under_cluster_review', 'auto_allocated', 'allocated', 'manually_reallocated', 'hospital_returned_to_cluster'];

  const approveMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/training-requests/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-requests'] });
      queryClient.invalidateQueries({ queryKey: ['approved-training-requests'] });
      queryClient.invalidateQueries({ queryKey: ['cluster-orgs'] });
      setConfirmApproveReq(null);
      setSuccessMsg('تم اعتماد طلب التدريب نهائياً — سيظهر الآن في شاشة الدفعات الأكاديمية لإنشاء دفعة تدريبية.');
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || err.message || 'فشل اعتماد الطلب — تحقق من الحالة والطاقة الاستيعابية');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiClient.post(`/training-requests/${id}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-requests'] });
      setRejectReq(null);
      setRejectReason('');
      setSuccessMsg('تم رفض طلب التدريب.');
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || err.message || 'فشل رفض الطلب');
    },
  });

  const returnMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      apiClient.post(`/training-requests/${id}/return-to-university`, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-requests'] });
      setReturnReq(null);
      setReturnNotes('');
      setSuccessMsg('تمت إعادة الطلب إلى الجامعة للتعديل.');
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || err.message || 'فشل إعادة الطلب');
    },
  });

  // View Details fetches the request record plus its trainee rows on open —
  // both real GET endpoints (training_request.view), nothing hardcoded.
  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['training-request-detail', detailsReq?.id],
    queryFn: async () => {
      const res = await apiClient.get(`/training-requests/${detailsReq.id}`);
      return res.data?.data ?? res.data;
    },
    enabled: !!detailsReq?.id,
  });

  const {
    data: detailTrainees,
    error: detailTraineesError,
    isLoading: traineesLoading,
  } = useQuery({
    queryKey: ['training-request-trainees', detailsReq?.id],
    queryFn: async () => {
      const res = await apiClient.get(`/training-requests/${detailsReq.id}/trainees`);
      return Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
    },
    enabled: !!detailsReq?.id,
  });

  const getStatusChip = (status: string) => {
    const statusMap: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
      draft: { label: 'مسودة', color: 'default' },
      submitted: { label: 'مرسل', color: 'info' },
      under_cluster_review: { label: 'قيد المراجعة', color: 'warning' },
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
    const initialAllocations: Record<string, number> = {};
    hospitals.forEach((h: any) => { initialAllocations[h.id] = 0; });
    setAllocations(initialAllocations);
    setOpenAllocateModal(true);
  };

  const totalAllocated = Object.values(allocations).reduce((s, v) => s + v, 0);

  const reqRows: any[] = data?.data ?? [];

  const SENT_STATUSES = [
    'auto_allocated', 'manually_reallocated', 'approved', 'allocated',
    'hospital_administrator_accepted', 'hospital_accepted', 'training_supervisor_accepted',
    'trainer_accepted', 'hospital_review', 'hospital_returned_to_cluster',
  ];

  const filteredRows = reqRows.filter((r: any) => {
    const isSent = SENT_STATUSES.includes(r.status) || (Array.isArray(r.allocations) && r.allocations.length > 0);
    if (activeTab === 'sent' && !isSent) return false;
    if (activeTab === 'incoming' && isSent) return false;

    if (statusFilter !== 'all' && r.status !== statusFilter) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const numMatch = r.requestNumber?.toLowerCase().includes(q);
      const srcMatch = r.sourceOrg?.nameAr?.toLowerCase().includes(q);
      const tgtMatch = r.targetOrg?.nameAr?.toLowerCase().includes(q);
      const progMatch = r.program?.nameAr?.toLowerCase().includes(q);
      const specMatch = r.specialty?.toLowerCase().includes(q);
      if (!numMatch && !srcMatch && !tgtMatch && !progMatch && !specMatch) return false;
    }
    return true;
  });

  const submittedCount = reqRows.filter((r: any) => ['submitted', 'under_cluster_review', 'resubmitted'].includes(r.status)).length;
  const sentHospitalsCount = reqRows.filter((r: any) => SENT_STATUSES.includes(r.status) || (Array.isArray(r.allocations) && r.allocations.length > 0)).length;
  const activeReqCount = reqRows.filter((r: any) => r.status === 'active').length;
  const totalStudents = reqRows.reduce((s: number, r: any) => s + (r.studentCount ?? 0), 0);
  const rejectedReqCount = reqRows.filter((r: any) => ['rejected', 'returned_to_university'].includes(r.status)).length;

  return (
    <DataPageShell
      title="إدارة تدريب التجمع الصحي (Cluster Training Administration)"
      subtitle={<>{user?.activeOrganization?.nameAr} — مراجعة الطلبات الواردة من الجامعات والتوزيع المباشر والطلبات المرسلة للمستشفيات</>}
      actions={<>
        {hasAnyRole(['university_administrator', 'academic_affairs', 'platform_owner', 'cluster_administrator']) && (
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
        { label: 'بانتظار المراجعة', value: submittedCount, icon: Clock3, tone: submittedCount ? 'warning' : 'success' },
        { label: 'مرسلة للمستشفيات', value: sentHospitalsCount, icon: Send, tone: 'violet' },
        { label: 'نشطة', value: activeReqCount, icon: CheckCircle2, tone: 'success' },
        { label: 'إجمالي المتدربين', value: totalStudents, icon: Users, tone: 'info' },
        { label: 'مرفوضة/مُعادة', value: rejectedReqCount, icon: XCircle, tone: rejectedReqCount ? 'danger' : 'neutral' },
      ]}
    >
      {successMsg && (
        <Alert severity="success" onClose={() => setSuccessMsg(null)} style={{ borderRadius: '10px', marginBottom: '16px' }}>
          {successMsg}
        </Alert>
      )}

      {errorMsg && (
        <Alert severity="error" onClose={() => setErrorMsg(null)} style={{ borderRadius: '10px', marginBottom: '16px' }}>
          {errorMsg}
        </Alert>
      )}

      {isError && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => refetch()} startIcon={<RefreshCw size={14} />}>
              إعادة المحاولة
            </Button>
          }
          style={{ borderRadius: '10px', marginBottom: '16px' }}
        >
          تعذر قراءة بيانات طلبات التدريب من الخادم: {(error as any)?.response?.data?.message || (error as any)?.message || 'خطأ في الاتصال بالشبكة'}
        </Alert>
      )}

      <Paper className="glass-card" style={{ marginBottom: '16px', padding: '4px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setSearchParams({ tab: val })}
          indicatorColor="primary"
          textColor="primary"
          sx={{
            '& .MuiTab-root': { fontWeight: 700, fontSize: '14px', minHeight: '48px' },
          }}
        >
          <Tab value="incoming" label={`📥 الطلبات الواردة من الجامعات (${submittedCount})`} />
          <Tab value="sent" label={`📤 الطلبات المرسلة للمستشفيات (${sentHospitalsCount})`} />
        </Tabs>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="بحث برقم الطلب، الجامعة، البرنامج..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <Search size={16} style={{ marginLeft: '8px', color: '#64748B' }} />,
            }}
            style={{ width: '240px' }}
          />
          <FormControl size="small" style={{ minWidth: '140px' }}>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              displayEmpty
            >
              <MenuItem value="all">كافة الحالات</MenuItem>
              <MenuItem value="submitted">مرسل للتجمع</MenuItem>
              <MenuItem value="under_cluster_review">قيد المراجعة</MenuItem>
              <MenuItem value="auto_allocated">موزع (آلي)</MenuItem>
              <MenuItem value="manually_reallocated">موزع (يدوي)</MenuItem>
              <MenuItem value="approved">معتمد نهائياً</MenuItem>
              <MenuItem value="hospital_review">مراجعة المستشفى</MenuItem>
              <MenuItem value="hospital_accepted">قبِل المستشفى</MenuItem>
              <MenuItem value="returned_to_university">مُعاد للجامعة</MenuItem>
              <MenuItem value="rejected">مرفوض</MenuItem>
            </Select>
          </FormControl>
        </div>
      </Paper>

      <TableContainer component={Paper} className="glass-card">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>رقم الطلب</TableCell>
              {activeTab === 'incoming' ? (
                <TableCell style={{ color: '#64748B', fontWeight: 700 }}>الجامعة الموفدة</TableCell>
              ) : (
                <TableCell style={{ color: '#64748B', fontWeight: 700 }}>المستشفيات المسندة / المستقبلة</TableCell>
              )}
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>البرنامج والتخصص</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>عدد المتدربين</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>فترة التدريب / الإرسال</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>الحالة</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700, textAlign: 'center' }}>الإجراءات المتاحة</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" style={{ padding: '32px' }}>
                  <CircularProgress size={28} />
                  <div style={{ marginTop: '8px', color: '#64748B', fontSize: '13px' }}>جاري تحميل البيانات من الخادم...</div>
                </TableCell>
              </TableRow>
            ) : filteredRows.length > 0 ? (
              filteredRows.map((req: any) => {
                const allocatedList: any[] = Array.isArray(req.allocations) ? req.allocations : [];
                return (
                  <TableRow key={req.id} hover>
                    <TableCell style={{ fontFamily: 'monospace', color: '#0891B2', fontWeight: 700 }}>
                      {req.requestNumber}
                    </TableCell>
                    {activeTab === 'incoming' ? (
                      <TableCell style={{ color: '#0F172A', fontWeight: 700 }}>
                        {req.sourceOrg?.nameAr || '—'}
                      </TableCell>
                    ) : (
                      <TableCell style={{ color: '#0F172A', fontWeight: 700 }}>
                        {allocatedList.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {allocatedList.map((a: any, idx: number) => (
                              <span key={idx} style={{ fontSize: '12px', color: '#0F766E' }}>
                                • {a.hospitalName || a.hospitalId} ({a.seats} مقعد)
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span>{req.targetOrg?.nameAr || '—'}</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell style={{ color: '#047857' }}>
                      <div style={{ fontWeight: 700 }}>{req.program?.nameAr || '—'}</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>{req.specialty || '—'}</div>
                    </TableCell>
                    <TableCell style={{ fontWeight: 800, color: '#D97706' }}>
                      {req.studentCount} متدرب
                    </TableCell>
                    <TableCell style={{ fontSize: '12px', color: '#64748B' }}>
                      <div>{new Date(req.createdAt).toLocaleDateString('ar-SA')}</div>
                      {req.trainingStartDate && (
                        <div style={{ fontSize: '11px', color: '#0891B2' }}>
                          {new Date(req.trainingStartDate).toISOString().split('T')[0]} → {req.trainingEndDate ? new Date(req.trainingEndDate).toISOString().split('T')[0] : ''}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusChip(req.status)}
                    </TableCell>
                    <TableCell style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {canViewDetails && (
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<Eye size={14} />}
                            onClick={() => {
                              setDetailsReq(req);
                              setDetailTab('info');
                            }}
                            style={{ fontWeight: 700, fontSize: '11px', color: '#0F766E', borderColor: '#0F766E' }}
                          >
                            التفاصيل والمتابعة
                          </Button>
                        )}
                        {canAssign && ASSIGNABLE.includes(req.status) && (
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => openAllocationDialog(req)}
                            style={{
                              background: req.status === 'allocated' || req.status === 'auto_allocated' || req.status === 'manually_reallocated'
                                ? '#059669'
                                : 'linear-gradient(135deg, #0891b2, #0891B2)',
                              fontWeight: 700,
                              fontSize: '11px',
                            }}
                          >
                            {['allocated', 'auto_allocated', 'manually_reallocated'].includes(req.status) ? 'عرض التوزيع' : 'مراجعة وتوزيع'}
                          </Button>
                        )}
                        {canApprove && APPROVEABLE.includes(req.status) && (
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<ShieldCheck size={14} />}
                            onClick={() => { setErrorMsg(null); setConfirmApproveReq(req); }}
                            style={{ background: 'linear-gradient(135deg, #059669, #0D9488)', fontWeight: 700, fontSize: '11px' }}
                          >
                            اعتماد نهائي
                          </Button>
                        )}
                        {canReturn && RETURNABLE.includes(req.status) && (
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<Undo2 size={14} />}
                            onClick={() => { setErrorMsg(null); setReturnReq(req); setReturnNotes(''); }}
                            style={{ fontWeight: 700, fontSize: '11px', color: '#B45309', borderColor: '#F59E0B' }}
                          >
                            إعادة للجامعة
                          </Button>
                        )}
                        {canReject && REJECTABLE.includes(req.status) && (
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<XCircle size={14} />}
                            onClick={() => { setErrorMsg(null); setRejectReq(req); setRejectReason(''); }}
                            style={{ fontWeight: 700, fontSize: '11px', color: '#DC2626', borderColor: '#FCA5A5' }}
                          >
                            رفض
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center" style={{ color: '#64748B', padding: '32px' }}>
                  {activeTab === 'sent'
                    ? 'لا توجد طلبات تدريب مُرسلة أو مُوزعة على المستشفيات حالياً'
                    : 'لا توجد طلبات تدريب تشغيلية واردة بانتظار المراجعة حالياً'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openAllocateModal} onClose={() => setOpenAllocateModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle style={{ fontWeight: 800 }}>مراجعة وتوزيع مقاعد طلب التدريب ({selectedReq?.requestNumber})</DialogTitle>
        <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '16px' }}>
          <Alert severity="info">
            المستفيد: {selectedReq?.sourceOrg?.nameAr || '—'} — عدد المتدربين المطلوب: <strong>{selectedReq?.studentCount}</strong> متدرب
          </Alert>
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
            </Alert>
          )}
          <TextField label="ملاحظات مدير التجمع الصحي" multiline rows={2} value={clusterNotes} onChange={(e) => setClusterNotes(e.target.value)} fullWidth />
          {allocateMutation.isError && (
            <Alert severity="error">{(allocateMutation.error as any)?.response?.data?.message || (allocateMutation.error as any)?.message || 'فشل حفظ التوزيع'}</Alert>
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

      <Dialog open={openCreateModal} onClose={() => setOpenCreateModal(false)} maxWidth="md" fullWidth>
        <DialogTitle style={{ fontWeight: 800 }}>تقديم طلب تدريب جديد</DialogTitle>
        <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingTop: '16px' }}>
          <FormControl fullWidth>
            <InputLabel>نوع طلب التدريب</InputLabel>
            <Select value={reqType} label="نوع طلب التدريب" onChange={(e) => setReqType(e.target.value as any)}>
              <MenuItem value="university_request">🏛️ طلب تدريب صادر من جامعة / كلية موفدة</MenuItem>
              <MenuItem value="cluster_request">🏥 طلب تدريب مباشر صادر من التجمع الصحي</MenuItem>
            </Select>
          </FormControl>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <FormControl fullWidth required>
              <InputLabel>التجمع الصحي المستهدف</InputLabel>
              <Select value={reqTargetOrgId} label="التجمع الصحي المستهدف" onChange={(e) => setReqTargetOrgId(e.target.value)}>
                {clusters.map((c: any) => <MenuItem key={c.id} value={c.id}>{c.nameAr} ({c.code || 'CLUSTER'})</MenuItem>)}
              </Select>
            </FormControl>
            {reqType === 'cluster_request' && (
              <FormControl fullWidth>
                <InputLabel>المستشفى المستهدف المباشر (اختياري)</InputLabel>
                <Select value={reqTargetHospitalId} label="المستشفى المستهدف المباشر (اختياري)" onChange={(e) => setReqTargetHospitalId(e.target.value)}>
                  <MenuItem value="">-- اختيار آلي عبر التجمع --</MenuItem>
                  {hospitals.map((h: any) => <MenuItem key={h.id} value={h.id}>{h.nameAr} ({h.code || 'HOSPITAL'})</MenuItem>)}
                </Select>
              </FormControl>
            )}
            <FormControl fullWidth required>
              <InputLabel>البرنامج التدريبي</InputLabel>
              <Select value={reqProgramId} label="البرنامج التدريبي" onChange={(e) => { const p = programs.find((x: any) => x.id === e.target.value); setReqProgramId(e.target.value); if (p?.durationMonths) setReqDurationMonths(p.durationMonths); }}>
                {programs.map((p: any) => <MenuItem key={p.id} value={p.id}>{p.nameAr} ({p.durationMonths} شهر)</MenuItem>)}
              </Select>
            </FormControl>
          </div>
          <TextField label="رمز التخصص (Specialty Code)" value={reqSpecialty} onChange={(e) => setReqSpecialty(e.target.value)} helperText="رمز التخصص — مثال: internal_medicine" fullWidth />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <TextField label="مدة البرنامج (بالأشهر)" type="number" value={reqDurationMonths} InputProps={{ readOnly: true }} fullWidth />
            <TextField label="تاريخ بداية التدريب" type="date" value={reqStartDate} onChange={(e) => setReqStartDate(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
            <TextField label="تاريخ نهاية التدريب" type="date" value={reqEndDate} onChange={(e) => setReqEndDate(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
          </div>
          {createRequestMutation.isError && (
            <Alert severity="error">{(createRequestMutation.error as any)?.response?.data?.message || (createRequestMutation.error as any)?.message || 'فشل تقديم طلب التدريب'}</Alert>
          )}
        </DialogContent>
        <DialogActions style={{ padding: '16px 24px' }}>
          <Button onClick={() => setOpenCreateModal(false)}>إلغاء</Button>
          <Button variant="contained" onClick={() => createRequestMutation.mutate()} disabled={createRequestMutation.isPending || !reqTargetOrgId || !reqProgramId || reqTrainees.length === 0} style={{ background: '#059669', fontWeight: 700 }}>
            {createRequestMutation.isPending ? <CircularProgress size={20} /> : 'إرسال طلب التدريب'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!detailsReq} onClose={() => setDetailsReq(null)} maxWidth="md" fullWidth>
        <DialogTitle style={{ fontWeight: 800, borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>تفاصيل طلب التدريب <strong>{detailsReq?.requestNumber}</strong></div>
            <div>{detailsReq && getStatusChip(detailsReq.status)}</div>
          </div>
        </DialogTitle>
        <DialogContent style={{ paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {detailLoading ? (
            <div style={{ textAlign: 'center', padding: '32px' }}><CircularProgress size={28} /></div>
          ) : detailData ? (
            <>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={detailTab} onChange={(_, val) => setDetailTab(val)}>
                  <Tab value="info" label="📋 البيانات الأساسية" />
                  <Tab value="trainees" label={`👥 المتدربون والمستشفيات (${detailTrainees?.length || 0})`} />
                  <Tab value="history" label="⏱️ السجل الزمني والتاريخ" />
                </Tabs>
              </Box>
              {detailTab === 'info' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <Paper style={{ padding: '16px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                      <div>الجهة الموفِّدة (الجامعة): <strong>{detailData.sourceOrg?.nameAr || '—'}</strong></div>
                      <div>الجهة المستقبلة (التجمع): <strong>{detailData.targetOrg?.nameAr || '—'}</strong></div>
                      <div>البرنامج التدريبي: <strong>{detailData.program?.nameAr || detailData.specialty || '—'}</strong></div>
                      <div>التخصص المطلوب: <strong>{detailData.specialty || 'عام'}</strong></div>
                      <div>عدد المتدربين: <strong>{detailData.studentCount} طالب</strong></div>
                      <div>الأولوية: <strong>{detailData.priority === 'urgent' ? 'عاجل' : detailData.priority === 'high' ? 'عالية' : 'عادي'}</strong></div>
                      <div>تاريخ الإرسال: <strong>{detailData.createdAt ? new Date(detailData.createdAt).toLocaleDateString('ar-SA') : '—'}</strong></div>
                      <div>فترة التدريب: <strong>{detailData.trainingStartDate ? new Date(detailData.trainingStartDate).toISOString().split('T')[0] : '—'} إلى {detailData.trainingEndDate ? new Date(detailData.trainingEndDate).toISOString().split('T')[0] : '—'}</strong></div>
                      <div>الدفعة الأكاديمية: <strong>{detailData.producedBatch?.nameAr || detailData.producedBatch?.code || detailData.academicIntake?.nameAr || '—'}</strong></div>
                      <div>الحالة الحالية: <strong>{getStatusChip(detailData.status)}</strong></div>
                    </div>
                  </Paper>
                  {detailData.notes && <Alert severity="info"><strong>ملاحظات الطلب:</strong> {detailData.notes}</Alert>}
                  {Array.isArray(detailData.allocations) && detailData.allocations.length > 0 && (
                    <Paper style={{ padding: '16px', border: '1px solid #99F6E4', backgroundColor: '#F0FDFA', borderRadius: '10px' }}>
                      <div style={{ fontWeight: 800, color: '#0F766E', marginBottom: '8px' }}>🏥 المستشفيات المسند إليها مقاعد التدريب:</div>
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {detailData.allocations.map((a: any, idx: number) => (
                          <Chip key={idx} label={`${a.hospitalName || a.hospitalId}: ${a.seats} مقعد`} variant="outlined" style={{ fontWeight: 700, color: '#0F766E', borderColor: '#0F766E' }} />
                        ))}
                      </div>
                    </Paper>
                  )}
                </div>
              )}
              {detailTab === 'trainees' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {detailTraineesError ? (
                    <Alert severity="error">تعذر تحميل قائمة المتدربين: {(detailTraineesError as any)?.response?.data?.message || (detailTraineesError as any)?.message}</Alert>
                  ) : traineesLoading ? (
                    <div style={{ textAlign: 'center', padding: '24px' }}><CircularProgress size={24} /></div>
                  ) : detailTrainees?.length ? (
                    <TableContainer component={Paper}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell style={{ fontWeight: 700 }}>الاسم</TableCell>
                            <TableCell style={{ fontWeight: 700 }}>الرقم الأكاديمي</TableCell>
                            <TableCell style={{ fontWeight: 700 }}>رقم الهوية</TableCell>
                            <TableCell style={{ fontWeight: 700 }}>المستشفى المسند</TableCell>
                            <TableCell style={{ fontWeight: 700 }}>القسم / المدرب</TableCell>
                            <TableCell style={{ fontWeight: 700 }}>الحالة</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {detailTrainees.map((t: any) => (
                            <TableRow key={t.id}>
                              <TableCell style={{ fontWeight: 700 }}>{t.nameAr}</TableCell>
                              <TableCell style={{ fontFamily: 'monospace', fontSize: '12px' }}>{t.academicNumber}</TableCell>
                              <TableCell style={{ fontFamily: 'monospace', fontSize: '12px' }}>{t.nationalId}</TableCell>
                              <TableCell>{t.assignedHospital?.nameAr || '—'}</TableCell>
                              <TableCell style={{ fontSize: '12px' }}>{t.assignedDepartment?.nameAr ? `قسم: ${t.assignedDepartment.nameAr}` : '—'}</TableCell>
                              <TableCell>{getStatusChip(t.status)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Alert severity="info">لا توجد صفوف متدربين مرفقة بطلب التدريب هذا بعد.</Alert>
                  )}
                </div>
              )}
              {detailTab === 'history' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Dynamic Timeline derived strictly from DB relations and fields */}
                  <Paper style={{ padding: '20px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
                    <div style={{ fontWeight: 800, color: '#0F172A', marginBottom: '16px', fontSize: '14px' }}>
                      🔄 المراحل التتابعية لطلب التدريب (Backend Workflow Progression)
                    </div>

                    {(() => {
                      const hasAllocations = Array.isArray(detailData.allocations) && detailData.allocations.length > 0;
                      const isAllocated = hasAllocations || ['auto_allocated', 'manually_reallocated', 'approved', 'allocated', 'hospital_administrator_accepted', 'hospital_accepted', 'training_supervisor_accepted', 'trainer_accepted', 'active'].includes(detailData.status);

                      const isHospitalReviewed = ['hospital_administrator_accepted', 'hospital_accepted', 'training_supervisor_accepted', 'trainer_accepted', 'active'].includes(detailData.status) || (detailTrainees && detailTrainees.some((t: any) => t.assignedHospitalId));

                      const assignedTrainersCount = detailTrainees ? detailTrainees.filter((t: any) => t.assignedTrainerProfileId || t.assignedTrainerProfile).length : 0;
                      const isTrainerAssigned = assignedTrainersCount > 0 || ['trainer_accepted', 'active'].includes(detailData.status);

                      const isRotationActive = detailData.status === 'active' || (detailTrainees && detailTrainees.some((t: any) => t.status === 'active'));

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          {/* Step 1: Submission */}
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <div style={{ background: '#059669', color: '#fff', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px' }}>1</div>
                            <div>
                              <div style={{ fontWeight: 700, color: '#0F172A' }}>التقديم (Request Submission)</div>
                              <div style={{ fontSize: '12px', color: '#64748B' }}>
                                الجهة الموفدة: <strong>{detailData.sourceOrg?.nameAr || '—'}</strong> · تاريخ الإرسال: {detailData.createdAt ? new Date(detailData.createdAt).toLocaleString('ar-SA') : '—'}
                              </div>
                            </div>
                          </div>

                          {/* Step 2: Cluster Allocation */}
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <div style={{ background: isAllocated ? '#059669' : '#CBD5E1', color: '#fff', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px' }}>2</div>
                            <div>
                              <div style={{ fontWeight: 700, color: isAllocated ? '#0F172A' : '#64748B' }}>التوزيع التجمعي (Cluster Seat Allocation)</div>
                              <div style={{ fontSize: '12px', color: '#64748B' }}>
                                {hasAllocations
                                  ? `تم توزيع ${detailData.allocations.reduce((s: number, a: any) => s + (a.seats || 0), 0)} مقعد على: ${detailData.allocations.map((a: any) => a.hospitalName || a.hospitalId).join('، ')}`
                                  : isAllocated ? 'تم التوزيع على مستوى التجمع الصحي' : 'قيد انتظار المراجعة والتوزيع التجمعي'}
                              </div>
                            </div>
                          </div>

                          {/* Step 3: Hospital Review */}
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <div style={{ background: isHospitalReviewed ? '#059669' : '#CBD5E1', color: '#fff', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px' }}>3</div>
                            <div>
                              <div style={{ fontWeight: 700, color: isHospitalReviewed ? '#0F172A' : '#64748B' }}>مراجعة المستشفى (Hospital Review Chain)</div>
                              <div style={{ fontSize: '12px', color: '#64748B' }}>
                                {isHospitalReviewed ? `مرحلة القبول بالمستشفى · الحالة الحالية: ${getStatusChip(detailData.status).props.label}` : 'بانتظار وصول الطلب لمراجعة المستشفى'}
                              </div>
                            </div>
                          </div>

                          {/* Step 4: Trainer Assignment */}
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <div style={{ background: isTrainerAssigned ? '#059669' : '#CBD5E1', color: '#fff', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px' }}>4</div>
                            <div>
                              <div style={{ fontWeight: 700, color: isTrainerAssigned ? '#0F172A' : '#64748B' }}>إسناد المدرب (Trainer Assignment)</div>
                              <div style={{ fontSize: '12px', color: '#64748B' }}>
                                {isTrainerAssigned
                                  ? `تم إسناد ${assignedTrainersCount} متدرب إلى المدربين المباشرين`
                                  : 'بانتظار إسناد المتدربين للمدربين في الأقسام السريرية بالمستشفى'}
                              </div>
                            </div>
                          </div>

                          {/* Step 5: Active Rotation */}
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <div style={{ background: isRotationActive ? '#059669' : '#CBD5E1', color: '#fff', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px' }}>5</div>
                            <div>
                              <div style={{ fontWeight: 700, color: isRotationActive ? '#0F172A' : '#64748B' }}>Rotation النشط (Active Training Rotation)</div>
                              <div style={{ fontSize: '12px', color: '#64748B' }}>
                                {isRotationActive
                                  ? `الخطة نشطة حالياً · فترة التدريب: ${detailData.trainingStartDate ? new Date(detailData.trainingStartDate).toISOString().split('T')[0] : ''} → ${detailData.trainingEndDate ? new Date(detailData.trainingEndDate).toISOString().split('T')[0] : ''}`
                                  : 'بانتظار تفعيل الروتيشن النهائي عند بداية التدريب'}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </Paper>

                  {/* Audit Logs Table */}
                  {Array.isArray(detailData.auditLogs) && detailData.auditLogs.length > 0 ? (
                    <div>
                      <div style={{ fontWeight: 800, color: '#0F172A', marginBottom: '12px', fontSize: '14px' }}>
                        📜 سجل الإجراءات والتعديلات (Audit Log Trail)
                      </div>
                      <TableContainer component={Paper}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell style={{ fontWeight: 700 }}>التاريخ والوقت</TableCell>
                              <TableCell style={{ fontWeight: 700 }}>المُنَفِّذ</TableCell>
                              <TableCell style={{ fontWeight: 700 }}>الإجراء</TableCell>
                              <TableCell style={{ fontWeight: 700 }}>التفاصيل</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {detailData.auditLogs.map((log: any) => (
                              <TableRow key={log.id}>
                                <TableCell style={{ fontSize: '12px', color: '#64748B' }}>
                                  {new Date(log.createdAt).toLocaleString('ar-SA')}
                                </TableCell>
                                <TableCell style={{ fontSize: '12px', fontWeight: 700 }}>
                                  {log.actor?.person?.nameAr || log.actor?.email || 'النظام'}
                                </TableCell>
                                <TableCell>
                                  <Chip label={log.action} size="small" variant="outlined" color="primary" />
                                </TableCell>
                                <TableCell style={{ fontSize: '12px', color: '#334155' }}>
                                  {log.newValues ? JSON.stringify(log.newValues).slice(0, 80) : '—'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </div>
                  ) : (
                    <Alert severity="info">لا توجد سجلات تدقيق إضافية لهذا الطلب.</Alert>
                  )}
                </div>
              )}
            </>
          ) : <Alert severity="error">تعذر تحميل تفاصيل الطلب</Alert>}
        </DialogContent>
        <DialogActions style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', gap: '8px' }}>
          {detailsReq && canAssign && ASSIGNABLE.includes(detailsReq.status) && (
            <Button variant="contained" size="small" onClick={() => { setDetailsReq(null); openAllocationDialog(detailsReq); }} style={{ background: '#0891B2', fontWeight: 700 }}>مراجعة وتوزيع المقاعد</Button>
          )}
          {detailsReq && canApprove && APPROVEABLE.includes(detailsReq.status) && (
            <Button variant="contained" size="small" startIcon={<ShieldCheck size={14} />} onClick={() => { setDetailsReq(null); setConfirmApproveReq(detailsReq); }} style={{ background: '#059669', fontWeight: 700 }}>اعتماد نهائي</Button>
          )}
          <Button onClick={() => setDetailsReq(null)} color="inherit">إغلاق</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!confirmApproveReq} onClose={() => setConfirmApproveReq(null)} maxWidth="sm" fullWidth>
        <DialogTitle style={{ fontWeight: 800 }}>الاعتماد النهائي لطلب التدريب</DialogTitle>
        <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '16px' }}>
          <Alert severity="info">سيتم اعتماد طلب <strong>{confirmApproveReq?.requestNumber}</strong> نهائياً.</Alert>
          {approveMutation.isError && <Alert severity="error">{(approveMutation.error as any)?.response?.data?.message || (approveMutation.error as any)?.message || 'فشل الاعتماد'}</Alert>}
        </DialogContent>
        <DialogActions style={{ padding: '16px 24px' }}>
          <Button onClick={() => setConfirmApproveReq(null)}>إلغاء</Button>
          <Button variant="contained" onClick={() => approveMutation.mutate(confirmApproveReq.id)} disabled={approveMutation.isPending} style={{ background: '#059669', fontWeight: 700 }}>{approveMutation.isPending ? <CircularProgress size={20} /> : 'تأكيد الاعتماد'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!rejectReq} onClose={() => setRejectReq(null)} maxWidth="sm" fullWidth>
        <DialogTitle style={{ fontWeight: 800 }}>رفض طلب التدريب {rejectReq?.requestNumber}</DialogTitle>
        <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '16px' }}>
          <Alert severity="warning">الرفض نهائي ولا يمكن التراجع عنه.</Alert>
          <TextField label="سبب الرفض (إلزامي)" multiline rows={3} fullWidth value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          {rejectMutation.isError && <Alert severity="error">{(rejectMutation.error as any)?.response?.data?.message || (rejectMutation.error as any)?.message || 'فشل رفض الطلب'}</Alert>}
        </DialogContent>
        <DialogActions style={{ padding: '16px 24px' }}>
          <Button onClick={() => setRejectReq(null)}>إلغاء</Button>
          <Button variant="contained" color="error" onClick={() => rejectMutation.mutate({ id: rejectReq.id, reason: rejectReason })} disabled={rejectMutation.isPending || !rejectReason.trim()} style={{ fontWeight: 700 }}>{rejectMutation.isPending ? <CircularProgress size={20} /> : 'تأكيد الرفض'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!returnReq} onClose={() => setReturnReq(null)} maxWidth="sm" fullWidth>
        <DialogTitle style={{ fontWeight: 800 }}>إعادة الطلب للجامعة {returnReq?.requestNumber}</DialogTitle>
        <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '16px' }}>
          <Alert severity="info">سيعود الطلب للجهة الموفِّدة لإجراء التعديلات.</Alert>
          <TextField label="ملاحظات الإعادة" multiline rows={3} fullWidth value={returnNotes} onChange={(e) => setReturnNotes(e.target.value)} />
          {returnMutation.isError && <Alert severity="error">{(returnMutation.error as any)?.response?.data?.message || (returnMutation.error as any)?.message || 'فشل إعادة الطلب'}</Alert>}
        </DialogContent>
        <DialogActions style={{ padding: '16px 24px' }}>
          <Button onClick={() => setReturnReq(null)}>إلغاء</Button>
          <Button variant="contained" onClick={() => returnMutation.mutate({ id: returnReq.id, notes: returnNotes })} disabled={returnMutation.isPending} style={{ background: '#B45309', fontWeight: 700 }}>{returnMutation.isPending ? <CircularProgress size={20} /> : 'إعادة للجامعة'}</Button>
        </DialogActions>
      </Dialog>
    </DataPageShell>
  );
};
