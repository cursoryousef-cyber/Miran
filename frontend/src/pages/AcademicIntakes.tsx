import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { GraduationCap, Plus, Send, CheckCircle2, Building2 } from 'lucide-react';
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
} from '@mui/material';
import { useAuth } from '../context/AuthContext';

export const AcademicIntakes: React.FC = () => {
  const { user, hasRole } = useAuth();
  const queryClient = useQueryClient();

  const [openModal, setOpenModal] = useState(false);
  const [openReqModal, setOpenReqModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State for Intake
  const [nameAr, setNameAr] = useState('');
  const [code, setCode] = useState('');
  const [academicYear, setAcademicYear] = useState('2026/2027');
  const [capacity, setCapacity] = useState(50);

  // Form State for Internship Request
  const [requestTitle, setRequestTitle] = useState('طلب تدريب دفعة أطباء الامتياز 2027');
  const [studentCount, setStudentCount] = useState(50);
  const [targetClusterId, setTargetClusterId] = useState('');

  const { data: intakesData, isLoading } = useQuery({
    queryKey: ['intakes'],
    queryFn: async () => {
      const res = await apiClient.get('/academic-intakes');
      return res.data;
    },
  });

  const { data: orgsData } = useQuery({
    queryKey: ['clusters-list'],
    queryFn: async () => {
      const res = await apiClient.get('/organizations').catch(() => ({ data: { data: [] } }));
      return res.data?.data || [];
    },
  });

  const createIntakeMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/academic-intakes', {
        nameAr,
        code,
        academicYear,
        capacity: Number(capacity),
        organizationId: user?.activeOrganization?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intakes'] });
      setOpenModal(false);
      setSuccessMsg('تم إنشاء الدفعة الأكاديمية بنجاح وتسجيلها في قاعدة البيانات.');
      setNameAr('');
      setCode('');
    },
  });

  const submitRequestMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/organization-affiliations', {
        nameAr: requestTitle,
        affiliationType: 'internship_request',
        agreementRef: `REQ-${Date.now().toString().slice(-6)}`,
        targetOrganizationId: targetClusterId || orgsData?.[0]?.id,
        notes: `طلب توزيع ${studentCount} طالب امتياز على مستشفيات التجمع`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliations'] });
      setOpenReqModal(false);
      setSuccessMsg('تم إرسال طلب التدريب (Internship Request) بنجاح إلى التجمع الصحي وسجل بحالة Submitted!');
    },
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
            الدفعات الأكاديمية وطلبات التدريب (Academic Intakes & Internship Requests)
          </h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            {user?.activeOrganization?.nameAr} — إدارة دفعة امتياز 2027 وتقديم طلبات التوزيع السريري
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          {hasRole('university_administrator') && (
            <>
              <Button
                variant="outlined"
                startIcon={<Send size={18} />}
                onClick={() => setOpenReqModal(true)}
                style={{ borderColor: '#06b6d4', color: '#06b6d4', fontWeight: 700 }}
              >
                إرسال طلب تدريب (Submit Request)
              </Button>

              <Button
                variant="contained"
                startIcon={<Plus size={18} />}
                onClick={() => setOpenModal(true)}
                style={{ background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)', fontWeight: 700 }}
              >
                إنشاء دفعة أكاديمية جديدة
              </Button>
            </>
          )}
        </div>
      </div>

      {successMsg && (
        <Alert severity="success" onClose={() => setSuccessMsg(null)} style={{ borderRadius: '10px' }}>
          {successMsg}
        </Alert>
      )}

      <TableContainer component={Paper} className="glass-card">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>اسم الدفعة</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الرمز (Code)</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>السنة الأكاديمية</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>البرنامج التدريبي</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الطاقة الاستيعابية</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الحالة</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} align="center"><CircularProgress size={24} /></TableCell>
              </TableRow>
            ) : intakesData?.data?.length > 0 ? (
              intakesData.data.map((intake: any) => (
                <TableRow key={intake.id}>
                  <TableCell style={{ fontWeight: 700, color: '#f8fafc' }}>{intake.nameAr}</TableCell>
                  <TableCell style={{ fontFamily: 'monospace', color: '#06b6d4' }}>{intake.code}</TableCell>
                  <TableCell>{intake.academicYear}</TableCell>
                  <TableCell style={{ color: '#34d399' }}>{intake.program?.nameAr || 'برنامج امتياز الطب'}</TableCell>
                  <TableCell style={{ fontWeight: 700 }}>{intake.capacity} متدرب</TableCell>
                  <TableCell><Chip label="نشطة (Active)" color="success" size="small" /></TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center" style={{ color: '#94a3b8' }}>لا توجد دفعات أكاديمية مسجلة حالياً</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Modal 1: Create Academic Intake */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle style={{ fontWeight: 800 }}>إنشاء دفعة أكاديمية جديدة (Academic Intake)</DialogTitle>
        <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '16px' }}>
          <TextField label="اسم الدفعة بالعربية" value={nameAr} onChange={(e) => setNameAr(e.target.value)} fullWidth required />
          <TextField label="رمز الدفعة (e.g. INTAKE-2027)" value={code} onChange={(e) => setCode(e.target.value)} fullWidth required />
          <TextField label="السنة الأكاديمية" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} fullWidth required />
          <TextField label="عدد الطلاب (الطاقة الاستيعابية)" type="number" value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} fullWidth required />
        </DialogContent>
        <DialogActions style={{ padding: '16px 24px' }}>
          <Button onClick={() => setOpenModal(false)}>إلغاء</Button>
          <Button variant="contained" onClick={() => createIntakeMutation.mutate()} disabled={createIntakeMutation.isPending} style={{ background: '#059669', fontWeight: 700 }}>
            {createIntakeMutation.isPending ? <CircularProgress size={20} /> : 'حفظ وإنشاء الدفعة'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal 2: Submit Internship Request */}
      <Dialog open={openReqModal} onClose={() => setOpenReqModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle style={{ fontWeight: 800 }}>تقديم طلب تدريب جديد للتجمع الصحي (Internship Request)</DialogTitle>
        <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '16px' }}>
          <TextField label="عنوان الطلب" value={requestTitle} onChange={(e) => setRequestTitle(e.target.value)} fullWidth required />
          <TextField label="عدد أطباء الامتياز" type="number" value={studentCount} onChange={(e) => setStudentCount(Number(e.target.value))} fullWidth required />
        </DialogContent>
        <DialogActions style={{ padding: '16px 24px' }}>
          <Button onClick={() => setOpenReqModal(false)}>إلغاء</Button>
          <Button variant="contained" onClick={() => submitRequestMutation.mutate()} disabled={submitRequestMutation.isPending} style={{ background: '#06b6d4', fontWeight: 700 }}>
            {submitRequestMutation.isPending ? <CircularProgress size={20} /> : 'إرسال الطلب (Submit)'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};
