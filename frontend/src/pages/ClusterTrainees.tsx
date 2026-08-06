import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  ShieldCheck,
} from 'lucide-react';
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
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openImportModal, setOpenImportModal] = useState(false);
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

  // 6. Confirm Bulk Import Mutation
  const importMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/trainees/bulk-import', { trainees: parsedRows });
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
      setSuccessMsg(res.data?.message || 'تم التوزيع الذكي للطلاب بنجاح بناءً على الطاقة الاستيعابية للأقسام والمستشفيات.');
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || err.message || 'فشل التوزيع الآلي');
    },
  });

  // 8. Reallocation Mutation
  const reallocateMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/trainees/reallocate', {
        traineeProfileId: selectedTraineeForRealloc.id,
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
      setSuccessMsg(res.data?.message || 'تم إعادة توزيع ونقل المتدرب ونقل الأعمال المعلقة بنجاح');
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
            توزيع متدربي الامتياز وطاقتي التجمع (Cluster Training Distribution)
          </h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            {user?.activeOrganization?.nameAr || 'تجمع الحدود الشمالية الصحي'} — التوزيع الذكي للطلاب وتحديد المستشفيات والأقسام والمدربين
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
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
            style={{ borderColor: '#06b6d4', color: '#06b6d4', fontWeight: 700 }}
          >
            تحميل نموذج Excel المعتمد
          </Button>

          <Button
            variant="contained"
            component="label"
            startIcon={<Upload size={18} />}
            style={{ background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)', fontWeight: 700 }}
          >
            استيراد ملف Excel
            <input type="file" hidden accept=".xlsx, .xls" onChange={handleFileUpload} />
          </Button>
        </div>
      </div>

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
        <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#f8fafc', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building2 size={20} color="#06b6d4" />
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
                    background: 'rgba(30, 41, 59, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>{hosp.nameAr}</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace' }}>{hosp.code} — {hosp.cityAr}</div>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '12px', color: '#94a3b8' }}>
                    <span>الأقسام: <strong style={{ color: '#38bdf8' }}>{hosp.departmentsCount}</strong></span>
                    <span>المدربون: <strong style={{ color: '#10b981' }}>{hosp.trainerCount}</strong></span>
                    <span>المقاعد المتاحة: <strong style={{ color: '#f59e0b' }}>{hosp.available}</strong></span>
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
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الرقم الأكاديمي والهوية</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>اسم طبيب الامتياز</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الجامعة الموفدة</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>التخصص والبرنامج</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>المستشفى الموجه إليه</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>القسم والمدرب والمشرف</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الحالة والعمليات</TableCell>
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
                  const deptName = activeRotation?.department?.nameAr || 'القسم العام';
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
                        <div style={{ fontFamily: 'monospace', color: '#06b6d4' }}>{t.traineeNumber}</div>
                        <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#94a3b8' }}>ID: {t.person?.nationalId}</div>
                      </TableCell>
                      <TableCell style={{ color: '#f8fafc', fontWeight: 700 }}>
                        {t.person?.nameAr}
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{t.person?.gender === 'female' ? 'أنثى' : 'ذكر'}</div>
                      </TableCell>
                      <TableCell style={{ color: '#cbd5e1' }}>
                        {t.sponsorOrganization?.nameAr || t.academicIntake?.organization?.nameAr || 'جامعة الحدود الشمالية'}
                      </TableCell>
                      <TableCell style={{ color: '#34d399', fontWeight: 600 }}>
                        {t.specialtyAr || 'طب وجراحة عامة'}
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{t.program?.nameAr || 'دفعة امتياز 2027'}</div>
                      </TableCell>
                      <TableCell style={{ fontWeight: 700, color: '#f59e0b' }}>
                        {t.organization?.nameAr || 'مستشفى برج الشمال الطبي'}
                      </TableCell>
                      <TableCell style={{ fontSize: '12px' }}>
                        <div style={{ color: '#38bdf8', fontWeight: 700 }}>القسم: {deptName}</div>
                        <div style={{ color: '#10b981' }}>المدرب: {trainerName}</div>
                      </TableCell>
                      <TableCell>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <Chip label="موزع ومعتمد" color="success" size="small" style={{ fontWeight: 700 }} />
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
                <TableCell colSpan={8} align="center" style={{ color: '#94a3b8', padding: '32px' }}>
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
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
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
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
              <div>المتدرب: <strong>{selectedTraineeForRealloc.person?.nameAr}</strong> ({selectedTraineeForRealloc.traineeNumber})</div>
              <div>المستشفى الحالي: <strong style={{ color: '#f59e0b' }}>{selectedTraineeForRealloc.organization?.nameAr}</strong></div>
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

      {/* Modal 3: Excel Import Preview Modal */}
      <Dialog open={openImportModal} onClose={() => setOpenImportModal(false)} maxWidth="md" fullWidth>
        <DialogTitle style={{ fontWeight: 800 }}>معاينة ونتائج تدقيق ملف Excel (Excel Import Preview)</DialogTitle>
        <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '16px' }}>
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
    </div>
  );
};

export default ClusterTrainees;
