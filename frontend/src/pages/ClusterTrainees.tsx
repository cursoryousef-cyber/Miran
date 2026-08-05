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
} from '@mui/material';
import { useAuth } from '../context/AuthContext';

export const ClusterTrainees: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openImportModal, setOpenImportModal] = useState(false);
  const [openReallocModal, setOpenReallocModal] = useState(false);
  const [targetHospital, setTargetHospital] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Excel Upload State
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [validCount, setValidCount] = useState(0);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['incoming-trainees'],
    queryFn: async () => {
      const res = await apiClient.get('/trainees/incoming');
      return res.data;
    },
  });

  const { data: orgsData } = useQuery({
    queryKey: ['hospitals-list'],
    queryFn: async () => {
      const res = await apiClient.get('/organizations');
      return res.data?.data || [];
    },
  });

  // 1. Download Official Excel Template
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

  // 2. Parse Uploaded Excel File
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

  // 3. Confirm Bulk Import Mutation
  const importMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/trainees/bulk-import', { trainees: parsedRows });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['incoming-trainees'] });
      setOpenImportModal(false);
      setSuccessMsg(`تم استيراد وإنشاء ${res.data?.data?.importedCount || validCount} حساب طبيب امتياز بنجاح!`);
    },
  });

  const traineesList = data?.data || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
            متدربو الامتياز الواردون (Incoming Interns Roster)
          </h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            {user?.activeOrganization?.nameAr} — إدارة واستيراد كشوف الطلاب الجماعية وتوزيعهم على المستشفيات
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
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

      {/* Controls Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(30, 41, 59, 0.5)', padding: '16px', borderRadius: '12px' }}>
        <TextField
          placeholder="البحث باسم المتدرب، الرقم الأكاديمي، أو الهوية..."
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '320px' }}
        />

        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="outlined" startIcon={<RefreshCw size={16} />} onClick={() => refetch()}>
            تحديث القائمة
          </Button>

          {selectedIds.length > 0 && (
            <Button variant="contained" color="secondary" onClick={() => setOpenReallocModal(true)} style={{ fontWeight: 700 }}>
              تعديل توزيع ({selectedIds.length}) متدربين
            </Button>
          )}
        </div>
      </div>

      {/* Main Trainees Table */}
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
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الرقم الأكاديمي</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>اسم المتدرب</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الهوية / الإقامة</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>التخصص</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>المستشفى الموجه إليه</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>حالة الحساب</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} align="center"><CircularProgress size={24} /></TableCell>
              </TableRow>
            ) : traineesList.length > 0 ? (
              traineesList
                .filter((t: any) => (t.person?.fullNameAr || '').includes(search) || (t.traineeNumber || '').includes(search))
                .map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedIds.includes(t.id)}
                        onChange={(e) =>
                          setSelectedIds(e.target.checked ? [...selectedIds, t.id] : selectedIds.filter((id) => id !== t.id))
                        }
                      />
                    </TableCell>
                    <TableCell style={{ fontFamily: 'monospace', color: '#06b6d4', fontWeight: 700 }}>
                      {t.traineeNumber}
                    </TableCell>
                    <TableCell style={{ color: '#f8fafc', fontWeight: 700 }}>{t.person?.fullNameAr}</TableCell>
                    <TableCell style={{ fontFamily: 'monospace' }}>{t.person?.nationalId}</TableCell>
                    <TableCell style={{ color: '#34d399' }}>{t.specialtyAr}</TableCell>
                    <TableCell style={{ fontWeight: 700, color: '#f59e0b' }}>
                      {t.organization?.nameAr || 'مستشفى برج الشمال الطبي'}
                    </TableCell>
                    <TableCell>
                      <Chip label="مستورد ومعتمد" color="success" size="small" />
                    </TableCell>
                  </TableRow>
                ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center" style={{ color: '#94a3b8' }}>لا يوجد متدربون مستوردون حالياً</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Excel Import Preview Modal */}
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

          {validationErrors.length > 0 && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px' }}>
              <h4 style={{ color: '#ef4444', margin: '0 0 8px 0' }}>تفاصيل الأخطاء لكل صف:</h4>
              {validationErrors.map((err, idx) => (
                <div key={idx} style={{ fontSize: '12px', color: '#fca5a5' }}>
                  الصف {err.rowNumber} ({err.nameAr}): {err.errors.join('، ')}
                </div>
              ))}
            </div>
          )}

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
