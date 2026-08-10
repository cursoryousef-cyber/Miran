import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader, DataPageShell } from '../components/ui';
import { apiClient } from '../api/client';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Users,
  Building2,
  Check,
  Search,
  Filter,
  RefreshCw,
  Zap,
  ArrowRightLeft,
  UserCheck,
  Award,
  Calendar,
  Layers,
  ShieldCheck, UserPlus, BedDouble, Gauge, FolderGit2 } from 'lucide-react';
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
  Alert,
  CircularProgress,
  TextField,
  Checkbox,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  LinearProgress,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';

export const ClusterTrainees: React.FC = () => {
  const { user, hasAnyRole } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openImportModal, setOpenImportModal] = useState(false);
  // The request a roster import belongs to. Import is no longer an organisation-
  // level act; it is always into a specific training request.
  const [selectedRequestId, setSelectedRequestId] = useState<string>('');
  const [openReallocModal, setOpenReallocModal] = useState(false);
  const [openAutoModal, setOpenAutoModal] = useState(false);
  const [selectedTraineeForRealloc, setSelectedTraineeForRealloc] = useState<any>(null);

  // Form states for reallocation
  const [targetHospitalId, setTargetHospitalId] = useState('');
  const [targetDeptId, setTargetDeptId] = useState('');
  const [targetTrainerId, setTargetTrainerId] = useState('');
  const [reallocReason, setReallocReason] = useState('');
  const [reallocNotes, setReallocNotes] = useState('');

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [allocationResults, setAllocationResults] = useState<any[] | null>(null);
  const [openResultsModal, setOpenResultsModal] = useState(false);

  // Excel Upload State
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [validCount, setValidCount] = useState(0);

  // 1. Load incoming trainees list
  const { data: traineesData, isLoading: isLoadingTrainees, refetch: refetchTrainees } = useQuery({
    queryKey: ['incoming-trainees'],
    queryFn: async () => {
      const res = await apiClient.get('/trainees/incoming');
      return res.data;
    },
  });

  // 2. Load live hospital cards metrics
  const { data: hospitalCards, isLoading: isLoadingHospitals } = useQuery({
    queryKey: ['hospitals-cards'],
    queryFn: async () => {
      const res = await apiClient.get('/organizations/hospitals-cards');
      return res.data || [];
    },
  });

  // 3. Load active training requests
  const { data: requestsData } = useQuery({
    queryKey: ['training-requests'],
    queryFn: async () => {
      const res = await apiClient.get('/training-requests');
      return res.data;
    },
  });

  // 4. Download Official Excel Template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'الرقم الأكاديمي': 'NBU-INT-2027-101',
        'رقم الهوية / السجل المدني': '1098234112',
        'الاسم بالعربية': 'عبدالله بن محمد المطيري',
        'الاسم بالإنجليزية': 'Abdullah Al-Mutairi',
        'الجامعة': 'جامعة الحدود الشمالية',
        'الكلية': 'كلية الطب والجراحة',
        'التخصص': 'طب وجراحة عامة',
        'البرنامج': 'برنامج امتياز الطب 2027',
        'سنة الامتياز': '2026/2027',
        'تاريخ بداية التدريب': '2026-08-01',
        'تاريخ نهاية التدريب': '2027-07-31',
        'مدة البرنامج': '12 شهر',
        'المستشفى الموجه إليه': 'مستشفى برج الشمال الطبي',
        'القسم المطلوب': 'الباطنية',
        'البريد الإلكتروني': 'abdullah.m@nbu.edu.sa',
        'رقم الجوال': '0551234567',
      },
      {
        'الرقم الأكاديمي': 'NBU-INT-2027-102',
        'رقم الهوية / السجل المدني': '1088442319',
        'الاسم بالعربية': 'سارة بنت أحمد العنزي',
        'الاسم بالإنجليزية': 'Sara Al-Enezi',
        'الجامعة': 'جامعة الحدود الشمالية',
        'الكلية': 'كلية الطب والجراحة',
        'التخصص': 'طب وجراحة عامة',
        'البرنامج': 'برنامج امتياز الطب 2027',
        'سنة الامتياز': '2026/2027',
        'تاريخ بداية التدريب': '2026-08-01',
        'تاريخ نهاية التدريب': '2027-07-31',
        'مدة البرنامج': '12 شهر',
        'المستشفى الموجه إليه': 'مستشفى رفحاء المركزي',
        'القسم المطلوب': 'الطوارئ',
        'البريد الإلكتروني': 'sara.a@nbu.edu.sa',
        'رقم الجوال': '0569876543',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'نموذج المتدربين المعتمد');
    XLSX.writeFile(wb, 'Miran_Official_Interns_Template_2027.xlsx');
  };

  // 5. Parse Uploaded Excel File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const rawData: any[] = XLSX.utils.sheet_to_json(ws);

      const rows: any[] = [];
      const errs: any[] = [];
      let valid = 0;

      rawData.forEach((row, idx) => {
        const academicId = row['الرقم الأكاديمي'];
        const nationalId = row['رقم الهوية / السجل المدني'];
        const nameAr = row['الاسم بالعربية'];
        const email = row['البريد الإلكتروني'];

        const rowErr: string[] = [];
        if (!academicId) rowErr.push('الرقم الأكاديمي مفقود');
        if (!nationalId) rowErr.push('رقم الهوية مفقود');
        if (!nameAr) rowErr.push('الاسم بالعربية مفقود');
        if (!email || !email.includes('@')) rowErr.push('البريد الإلكتروني غير صالح');

        if (rowErr.length > 0) {
          errs.push({ rowNumber: idx + 2, nameAr: nameAr || 'غير معروف', errors: rowErr });
        } else {
          valid++;
          rows.push({
            academicId,
            nationalId,
            nameAr,
            nameEn: row['الاسم بالإنجليزية'],
            university: row['الجامعة'],
            specialty: row['التخصص'],
            email,
            phone: row['رقم الجوال'],
            hospitalName: row['المستشفى الموجه إليه'],
          });
        }
      });

      setParsedRows(rows);
      setValidationErrors(errs);
      setValidCount(valid);
      setOpenImportModal(true);
    };
    reader.readAsBinaryString(file);
  };

  /**
   * Roster import.
   *
   * Routed through the training request the trainees belong to, so every imported
   * trainee arrives with a request, a batch and an approval behind them. The old
   * call — POST /trainees/bulk-import — created accounts straight into a hospital
   * with no request and no batch, which is why production holds trainee profiles
   * whose origin cannot be established. That endpoint is now retired.
   */
  const importMutation = useMutation({
    mutationFn: async () => {
      const targetRequestId = selectedRequestId || requestsList[0]?.id;
      if (!targetRequestId) {
        throw new Error(
          'اختر طلب تدريب أولاً — الاستيراد يتم داخل طلب تدريب حتى يكون لكل متدرب مصدر معتمد.',
        );
      }
      return apiClient.post(`/training-requests/${targetRequestId}/trainees/import`, {
        rows: parsedRows,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['incoming-trainees'] });
      queryClient.invalidateQueries({ queryKey: ['hospitals-cards'] });
      setOpenImportModal(false);
      setSuccessMsg(`تم استيراد وإنشاء ${res.data?.data?.importedCount || validCount} حساب طبيب امتياز بنجاح!`);
    },
  });

  // 7. Auto Allocation Mutation
  const autoAllocateMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return apiClient.post(`/training-requests/${requestId}/auto-allocate`);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['incoming-trainees'] });
      queryClient.invalidateQueries({ queryKey: ['hospitals-cards'] });
      queryClient.invalidateQueries({ queryKey: ['training-requests'] });
      setOpenAutoModal(false);
      if (res.data?.rowResults) {
        setAllocationResults(res.data.rowResults);
        setOpenResultsModal(true);
      }
      setSuccessMsg(res.data?.message || 'تم التوزيع الذكي بنجاح');
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || err.message || 'فشل التوزيع الآلي');
    },
  });

  /**
   * Cross-hospital allocation and reassignment.
   *
   * Both branches now reach TraineeAllocationService — the row-based one directly,
   * and the profile-based one through /trainees/reallocate, which was rewritten to
   * delegate rather than mutate placement itself. Previously the second branch was
   * a genuinely different mechanism: it rewrote the trainee's organisation and
   * rotations without recording an allocation, so a move made from this screen
   * could leave no trace in the history the timeline reads.
   */
  const reallocateMutation = useMutation({
    mutationFn: async () => {
      const rowId = selectedTraineeForRealloc?.rowId || selectedTraineeForRealloc?.id;
      if (selectedTraineeForRealloc?.rowId) {
        return apiClient.post(`/training-requests/trainees/${rowId}/allocations/hospital`, {
          hospitalId: targetHospitalId,
          reason: reallocReason || reallocNotes,
        });
      }
      // Trainees already active from before the allocation model existed are still
      // addressed by profile id; the endpoint resolves them to their request row.
      return apiClient.post('/trainees/reallocate', {
        traineeProfileId: rowId,
        targetHospitalId,
        departmentId: targetDeptId || undefined,
        trainerProfileId: targetTrainerId || undefined,
        reason: reallocReason,
        notes: reallocNotes,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['incoming-trainees'] });
      queryClient.invalidateQueries({ queryKey: ['hospitals-cards'] });
      setOpenReallocModal(false);
      if (res.data?.result?.evaluations) {
        setAllocationResults([res.data.result]);
        setOpenResultsModal(true);
      }
      setSuccessMsg(res.data?.message || 'تم إعادة توزيع المتدرب بنجاح');
      setSelectedTraineeForRealloc(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || err.message || 'فشل عملية إعادة التوزيع');
    },
  });

  // Open Reallocation modal for a specific trainee
  const handleOpenRealloc = (trainee: any) => {
    setSelectedTraineeForRealloc(trainee);
    setTargetHospitalId(trainee.organization?.id || '');
    const activeRotation = trainee.rotations?.[0];
    setTargetDeptId(activeRotation?.departmentId || '');
    setTargetTrainerId(activeRotation?.trainerProfileId || '');
    setReallocReason('تعديل التوجيه الإداري بناءً على احتياج القسم والطاقة الاستيعابية');
    setReallocNotes('');
    setOpenReallocModal(true);
  };

  const traineesList = traineesData?.data || [];
  const hospitalsList = hospitalCards || [];
  const requestsList = requestsData?.data || [];
  const activeRequest = requestsList[0];

  const selectedHospitalObj = hospitalsList.find((h: any) => h.id === targetHospitalId);

  const cards: any[] = hospitalCards ?? [];
  const clusterCapacity = cards.reduce((s: number, h: any) => s + (h.capacity ?? h.totalCapacity ?? 0), 0);
  const clusterOccupied = cards.reduce((s: number, h: any) => s + (h.occupied ?? h.accepted ?? 0), 0);
  const clusterPct = clusterCapacity > 0 ? Math.round((clusterOccupied / clusterCapacity) * 100) : 0;
  const unassigned = traineesList.filter((t: any) => !t.assignedHospitalId).length;

  // Truthful status chip from the trainee's actual applicationStatus — the
  // previous hardcoded "موزع ومعتمد" chip claimed every trainee was
  // distributed+approved regardless of their real state.
  const statusChip = (t: any) => {
    const map: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
      draft: { label: 'مسودة', color: 'default' },
      pending_hospital_review: { label: 'بانتظار مراجعة المستشفى', color: 'warning' },
      documents_requested: { label: 'طُلبت المستندات', color: 'warning' },
      approved: { label: 'معتمد', color: 'success' },
      rejected: { label: 'مرفوض', color: 'error' },
      returned_to_cluster: { label: 'مُعاد للتجمع', color: 'warning' },
      active: { label: 'نشط', color: 'success' },
      graduated: { label: 'متخرج', color: 'info' },
    };
    const s = map[t?.applicationStatus] ?? { label: t?.applicationStatus ?? '—', color: 'default' as const };
    return <Chip label={s.label} color={s.color} size="small" style={{ fontWeight: 700 }} />;
  };

  return (
    <DataPageShell
        title="توزيع متدربي الامتياز وطاقتي التجمع (Cluster Training Distribution)"
        actions={<>
          <Button
            variant="contained"
            startIcon={<Zap size={18} />}
            onClick={() => setOpenAutoModal(true)}
            style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', fontWeight: 700 }}
          >
            التوزيع الآلي الذكي (Auto Allocate)
          </Button>

          <Button
            variant="outlined"
            startIcon={<Download size={18} />}
            onClick={handleDownloadTemplate}
            style={{ borderColor: '#0891B2', color: '#0891B2', fontWeight: 700 }}
          >
            تحميل نموذج Excel المعتمد
          </Button>

          {/* Backend import requires cluster_administrator/training_director/
              platform_owner (CLUSTER_ROLES) — cluster_manager cannot call it, so
              the button is hidden rather than failing with a 403. */}
          {hasAnyRole(['cluster_administrator', 'training_director', 'platform_owner']) && (
          <Button
            variant="contained"
            component="label"
            startIcon={<Upload size={18} />}
            style={{ background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)', fontWeight: 700 }}
          >
            استيراد ملف Excel
            <input type="file" hidden accept=".xlsx, .xls" onChange={handleFileUpload} />
          </Button>
          )}
        </>}
        loading={isLoadingTrainees}
        stats={[
          { label: 'المتدربون الواردون', value: traineesList.length, icon: Users, tone: 'primary' },
          { label: 'بلا إسناد', value: unassigned, icon: UserPlus, tone: unassigned ? 'warning' : 'success' },
          { label: 'المستشفيات', value: cards.length, icon: Building2, tone: 'info' },
          { label: 'السعة الإجمالية', value: clusterCapacity, icon: BedDouble, tone: 'neutral' },
          { label: 'نسبة الإشغال', value: `${clusterPct}%`, icon: Gauge,
            tone: clusterPct >= 90 ? 'danger' : clusterPct >= 70 ? 'warning' : 'success' },
          { label: 'الطلبات', value: requestsList.length, icon: FolderGit2, tone: 'violet' },
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

      {/* SECTION 7: Hospital Capacity Dashboard Cards */}
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building2 size={20} color="#0891B2" />
          بطاقات المستشفيات والطاقة الاستيعابية المباشرة (Hospital Capacity Dashboard)
        </h3>

        <Grid container spacing={2}>
          {isLoadingHospitals ? (
            <Grid item xs={12} style={{ textAlign: 'center', padding: '24px' }}>
              <CircularProgress size={28} />
            </Grid>
          ) : (
            hospitalsList.map((hosp: any) => (
              <Grid item xs={12} sm={6} md={4} key={hosp.id}>
                <Paper
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>{hosp.nameAr}</div>
                      <div style={{ fontSize: '12px', color: '#64748B', fontFamily: 'monospace' }}>{hosp.code} — {hosp.cityAr}</div>
                    </div>
                    <Chip
                      label={`${hosp.occupancyPercentage}% اشغال`}
                      color={hosp.occupancyPercentage > 90 ? 'error' : hosp.occupancyPercentage > 70 ? 'warning' : 'success'}
                      size="small"
                      style={{ fontWeight: 800 }}
                    />
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569', marginBottom: '4px' }}>
                      <span>المستغل: <strong>{hosp.occupied}</strong> مقعد</span>
                      <span>الطاقة الكاملة: <strong>{hosp.capacity}</strong></span>
                    </div>
                    <LinearProgress
                      variant="determinate"
                      value={hosp.occupancyPercentage}
                      style={{ height: '8px', borderRadius: '4px', backgroundColor: '#334155' }}
                    />
                  </div>

                  {/* Footer Stats */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #F1F5F9', fontSize: '12px', color: '#64748B' }}>
                    <span>الأقسام: <strong style={{ color: '#0284C7' }}>{hosp.departmentsCount}</strong></span>
                    <span>المدربون: <strong style={{ color: '#059669' }}>{hosp.trainerCount}</strong></span>
                    <span>المقاعد المتاحة: <strong style={{ color: '#D97706' }}>{hosp.available}</strong></span>
                  </div>
                </Paper>
              </Grid>
            ))
          )}
        </Grid>
      </div>

      {/* Controls Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(30, 41, 59, 0.5)', padding: '16px', borderRadius: '12px' }}>
        <TextField
          placeholder="البحث باسم المتدرب، الرقم الأكاديمي، أو الهوية الوطنية..."
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '360px' }}
        />

        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="outlined" startIcon={<RefreshCw size={16} />} onClick={() => refetchTrainees()}>
            تحديث القائمة
          </Button>

          {selectedIds.length > 0 && (
            <Button variant="contained" color="secondary" onClick={() => handleOpenRealloc(traineesList.find((t: any) => t.id === selectedIds[0]))} style={{ fontWeight: 700 }}>
              تعديل توزيع ({selectedIds.length}) متدربين
            </Button>
          )}
        </div>
      </div>

      {/* Main Trainees Roster Table */}
      <TableContainer component={Paper} className="glass-card">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  onChange={(e) => setSelectedIds(e.target.checked ? traineesList.map((t: any) => t.id) : [])}
                  checked={selectedIds.length > 0 && selectedIds.length === traineesList.length}
                />
              </TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>الرقم الأكاديمي والهوية</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>اسم طبيب الامتياز</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>الجامعة الموفدة</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>التخصص والبرنامج</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>المستشفى الموجه إليه</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>القسم والمدرب والمشرف</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>الحالة والعمليات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoadingTrainees ? (
              <TableRow>
                <TableCell colSpan={8} align="center"><CircularProgress size={24} /></TableCell>
              </TableRow>
            ) : traineesList.length > 0 ? (
              traineesList
                .filter((t: any) => (t.person?.nameAr || '').includes(search) || (t.traineeNumber || '').includes(search) || (t.person?.nationalId || '').includes(search))
                .map((t: any) => {
                  const activeRotation = t.rotations?.[0];
                  const deptName = activeRotation?.department?.nameAr || '—';
                  const trainerName = activeRotation?.trainerProfile?.person?.nameAr || 'غير معين';

                  return (
                    <TableRow key={t.id}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedIds.includes(t.id)}
                          onChange={(e) =>
                            setSelectedIds(e.target.checked ? [...selectedIds, t.id] : selectedIds.filter((id) => id !== t.id))
                          }
                        />
                      </TableCell>
                      <TableCell style={{ fontWeight: 700 }}>
                        <div style={{ fontFamily: 'monospace', color: '#0891B2' }}>{t.traineeNumber}</div>
                        <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#64748B' }}>ID: {t.person?.nationalId}</div>
                      </TableCell>
                      <TableCell style={{ color: '#0F172A', fontWeight: 700 }}>
                        {t.person?.nameAr}
                        <div style={{ fontSize: '11px', color: '#64748B' }}>{t.person?.gender === 'female' ? 'أنثى' : 'ذكر'}</div>
                      </TableCell>
                      <TableCell style={{ color: '#475569' }}>
                        {t.sponsorOrganization?.nameAr ?? t.academicIntake?.organization?.nameAr ?? '—'}
                      </TableCell>
                      <TableCell style={{ color: '#047857', fontWeight: 600 }}>
                        {t.specialtyAr || '—'}
                        <div style={{ fontSize: '11px', color: '#64748B' }}>{t.program?.nameAr || '—'}</div>
                      </TableCell>
                      <TableCell style={{ fontWeight: 700, color: '#D97706' }}>
                        {t.organization?.nameAr || '—'}
                      </TableCell>
                      <TableCell style={{ fontSize: '12px' }}>
                        <div style={{ color: '#0284C7', fontWeight: 700 }}>القسم: {deptName}</div>
                        <div style={{ color: '#059669' }}>المدرب: {trainerName}</div>
                      </TableCell>
                      <TableCell>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {statusChip(t)}
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<ArrowRightLeft size={14} />}
                            onClick={() => handleOpenRealloc(t)}
                            style={{ fontSize: '11px', padding: '2px 8px' }}
                          >
                            تعديل
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
            ) : (
              <TableRow>
                <TableCell colSpan={8} align="center" style={{ color: '#64748B', padding: '32px' }}>
                  لا يوجد متدربون مستوردون حالياً
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Modal 1: Smart Auto Allocation Modal */}
      <Dialog open={openAutoModal} onClose={() => setOpenAutoModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle style={{ fontWeight: 800 }}>التوزيع الذكي الآلي (Smart Auto Allocation)</DialogTitle>
        <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '16px' }}>
          <Alert severity="info">
            سيقوم محرك التوزيع الآلي بفحص الطاقة الاستيعابية لمستشفيات وأقسام التجمع وتوزيع المقاعد بشكل متوازن.
          </Alert>

          {activeRequest && (
            <div style={{ background: '#F1F5F9', padding: '12px', borderRadius: '8px' }}>
              <div>رقم الطلب النشط: <strong>{activeRequest.requestNumber}</strong></div>
              <div>عدد الطلاب المطلوب توزيعهم: <strong>{activeRequest.studentCount} طالب</strong></div>
            </div>
          )}
        </DialogContent>
        <DialogActions style={{ padding: '16px 24px' }}>
          <Button onClick={() => setOpenAutoModal(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={() => activeRequest && autoAllocateMutation.mutate(activeRequest.id)}
            disabled={autoAllocateMutation.isPending || !activeRequest}
            style={{ background: '#0284c7', fontWeight: 700 }}
          >
            {autoAllocateMutation.isPending ? <CircularProgress size={20} /> : 'تأكيد التوزيع الآلي الذكي'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal 2: Reallocation & Transfer Work Modal */}
      <Dialog open={openReallocModal} onClose={() => setOpenReallocModal(false)} maxWidth="md" fullWidth>
        <DialogTitle style={{ fontWeight: 800 }}>تعديل توجيه ونقل طبيب الامتياز (Reallocation & Work Transfer)</DialogTitle>
        <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '16px' }}>
          <Alert severity="warning">
            عند نقل المتدرب إلى مستشفى جديد، سيتم نقل كافة <strong>الأعمال والمهام المعلقة (Pending Work)</strong> مثل اللوجبوك غير المكتمل والتقييمات الحالية وحساب الحضور إلى المستشفى المستلم تلقائياً، مع الاحتفاظ بالأعمال المكتملة كسجل تاريخي.
          </Alert>

          {selectedTraineeForRealloc && (
            <div style={{ background: '#F1F5F9', padding: '12px', borderRadius: '8px' }}>
              <div>المتدرب: <strong>{selectedTraineeForRealloc.person?.nameAr}</strong> ({selectedTraineeForRealloc.traineeNumber})</div>
              <div>المستشفى الحالي: <strong style={{ color: '#D97706' }}>{selectedTraineeForRealloc.organization?.nameAr}</strong></div>
            </div>
          )}

          <FormControl fullWidth size="small">
            <InputLabel>المستشفى الجديد المستهدف</InputLabel>
            <Select value={targetHospitalId} label="المستشفى الجديد المستهدف" onChange={(e) => setTargetHospitalId(e.target.value)}>
              {hospitalsList.map((h: any) => (
                <MenuItem key={h.id} value={h.id}>
                  {h.nameAr} (متاح: {h.available} مقعد من {h.capacity})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedHospitalObj && (
            <FormControl fullWidth size="small">
              <InputLabel>القسم السريري بالمستشفى الجديد</InputLabel>
              <Select value={targetDeptId} label="القسم السريري بالمستشفى الجديد" onChange={(e) => setTargetDeptId(e.target.value)}>
                {selectedHospitalObj.departments?.map((d: any) => (
                  <MenuItem key={d.id} value={d.id}>
                    {d.nameAr} (سعة القسم: {d.capacity} طالب)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <TextField label="سبب إعادة التوزيع والنقل" value={reallocReason} onChange={(e) => setReallocReason(e.target.value)} fullWidth required size="small" />
          <TextField label="ملاحظات وتوجيهات إضافية" value={reallocNotes} onChange={(e) => setReallocNotes(e.target.value)} multiline rows={2} fullWidth size="small" />
        </DialogContent>
        <DialogActions style={{ padding: '16px 24px' }}>
          <Button onClick={() => setOpenReallocModal(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={() => reallocateMutation.mutate()}
            disabled={reallocateMutation.isPending || !targetHospitalId}
            style={{ background: '#059669', fontWeight: 700 }}
          >
            {reallocateMutation.isPending ? <CircularProgress size={20} /> : 'تأكيد نقل المتدرب وتحديث الأعمال'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal 3: Allocation Results Audit Trail */}
      <Dialog open={openResultsModal} onClose={() => setOpenResultsModal(false)} maxWidth="lg" fullWidth>
        <DialogTitle style={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>نتائج التوزيع الذكي — سجل التدقيق الكامل</span>
          <Chip
            label={`${allocationResults?.filter((r) => r.allocated).length} موزَّع / ${allocationResults?.filter((r) => !r.allocated).length} فاشل`}
            color={allocationResults?.some((r) => !r.allocated) ? 'warning' : 'success'}
            style={{ fontWeight: 700 }}
          />
        </DialogTitle>
        <DialogContent style={{ paddingTop: '16px' }}>
          <TableContainer component={Paper} style={{ maxHeight: '500px' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell style={{ fontWeight: 700, minWidth: 120 }}>صف المتدرب</TableCell>
                  <TableCell style={{ fontWeight: 700 }}>الحالة</TableCell>
                  <TableCell style={{ fontWeight: 700 }}>المستشفى المختار</TableCell>
                  <TableCell style={{ fontWeight: 700 }}>التقييم</TableCell>
                  <TableCell style={{ fontWeight: 700 }}>تفاصيل كل مستشفى</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(allocationResults || []).map((row: any) => (
                  <TableRow key={row.rowId} style={{ backgroundColor: row.allocated ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)' }}>
                    <TableCell style={{ fontFamily: 'monospace', fontSize: '11px', color: '#64748B' }}>
                      {row.rowId?.slice(0, 8)}…
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={row.allocated ? 'تم التوزيع' : 'فشل التوزيع'}
                        color={row.allocated ? 'success' : 'error'}
                        size="small"
                        style={{ fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell style={{ color: '#D97706', fontWeight: 700 }}>
                      {row.hospitalName || '—'}
                      {row.score !== undefined && (
                        <div style={{ fontSize: '11px', color: '#64748B' }}>تقييم: {row.score?.toFixed(1)}</div>
                      )}
                    </TableCell>
                    <TableCell style={{ fontSize: '12px', maxWidth: 200 }}>
                      <span style={{ color: row.allocated ? '#059669' : '#DC2626' }}>{row.reason}</span>
                    </TableCell>
                    <TableCell style={{ maxWidth: 350 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {(row.evaluations || []).map((ev: any, idx: number) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              backgroundColor: ev.passed ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                              fontSize: '11px',
                            }}
                          >
                            <span style={{ color: ev.passed ? '#059669' : '#DC2626', fontWeight: 700 }}>
                              {ev.passed ? '✓' : '✗'} {ev.hospitalName}
                            </span>
                            {ev.passed ? (
                              <span style={{ color: '#64748B' }}>تقييم: {ev.score?.toFixed(1)}</span>
                            ) : (
                              <span style={{ color: '#fca5a5', maxWidth: 180, textAlign: 'left' }}>{ev.failureReason}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenResultsModal(false)} variant="contained">إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* Modal: Excel Import Preview */}
      <Dialog open={openImportModal} onClose={() => setOpenImportModal(false)} maxWidth="md" fullWidth>
        <DialogTitle style={{ fontWeight: 800 }}>معاينة ونتائج تدقيق ملف Excel (Excel Import Preview)</DialogTitle>
        <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '16px' }}>
          {/*
            Choosing the request is not optional metadata — it is what gives every
            imported trainee a source. Without it there is no batch to belong to
            and no approval behind the placement.
          */}
          <TextField
            select
            label="طلب التدريب الذي يُستورد إليه"
            value={selectedRequestId}
            onChange={(e) => setSelectedRequestId(e.target.value)}
            helperText="الاستيراد يتم داخل طلب تدريب معتمد — لكل متدرب مصدر واضح"
            fullWidth
          >
            {requestsList.map((r: any) => (
              <MenuItem key={r.id} value={r.id}>
                {r.requestNumber} — {r.sourceOrg?.nameAr ?? ''} ({r.status})
              </MenuItem>
            ))}
          </TextField>

          <div style={{ display: 'flex', gap: '16px' }}>
            <Alert severity="success" style={{ flex: 1 }}>
              عدد السجلات الصحيحة: <strong>{validCount} متدرب</strong>
            </Alert>
            {validationErrors.length > 0 && (
              <Alert severity="error" style={{ flex: 1 }}>
                عدد السجلات المرفوضة: <strong>{validationErrors.length} سجلات</strong>
              </Alert>
            )}
          </div>

          <TableContainer component={Paper} style={{ maxHeight: '300px' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>الرقم الأكاديمي</TableCell>
                  <TableCell>اسم المتدرب</TableCell>
                  <TableCell>الهوية</TableCell>
                  <TableCell>البريد الإلكتروني</TableCell>
                  <TableCell>المستشفى الموجه إليه</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {parsedRows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.academicId}</TableCell>
                    <TableCell>{r.nameAr}</TableCell>
                    <TableCell>{r.nationalId}</TableCell>
                    <TableCell>{r.email}</TableCell>
                    <TableCell>{r.hospitalName}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions style={{ padding: '16px 24px' }}>
          <Button onClick={() => setOpenImportModal(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={() => importMutation.mutate()}
            disabled={importMutation.isPending || validCount === 0}
            style={{ background: '#059669', fontWeight: 700 }}
          >
            {importMutation.isPending ? <CircularProgress size={20} /> : `تأكيد استيراد وإنشاء (${validCount}) حساب متدرب`}
          </Button>
        </DialogActions>
      </Dialog>
    </DataPageShell>
  );
};

export default ClusterTrainees;
