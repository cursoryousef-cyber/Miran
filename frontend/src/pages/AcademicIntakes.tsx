import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { GraduationCap, Plus, Send, CheckCircle2, Building2, Layers, Calendar, Users, Activity } from 'lucide-react';
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
  Tabs,
  Tab,
  Box,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';

export const AcademicIntakes: React.FC = () => {
  const { user, hasRole } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState(0);
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

  const { data: intakesData, isLoading: isLoadingIntakes } = useQuery({
    queryKey: ['intakes'],
    queryFn: async () => {
      const res = await apiClient.get('/academic-intakes');
      return res.data;
    },
  });

  const { data: requestsData, isLoading: isLoadingRequests } = useQuery({
    queryKey: ['training-requests'],
    queryFn: async () => {
      const res = await apiClient.get('/training-requests');
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
      const targetOrgId = targetClusterId || orgsData?.[0]?.id || '5ff7f3e8-efa8-4552-ba25-b04304e235ef';
      return apiClient.post('/training-requests', {
        targetOrgId,
        studentCount,
        priority: 'normal',
        notes: `طلب توزيع ${studentCount} طالب امتياز من جامعة الحدود الشمالية على مستشفيات التجمع الصحي`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-requests'] });
      setOpenReqModal(false);
      setSuccessMsg('تم إنشاء ورسالة طلب التدريب التشغيلي بنجاح إلى التجمع الصحي بحالة Submitted!');
    },
  });

  const intakesList = intakesData?.data || [];
  const requestsList = requestsData?.data || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
            الدفعات الأكاديمية وطلبات التدريب (Academic Intakes & Training Requests)
          </h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            {user?.activeOrganization?.nameAr || 'المنظومة الوطنية للتدريب الصحي'} — متابعة دفعات الامتياز وطلبات التوزيع السريري
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Button
            variant="outlined"
            startIcon={<Send size={18} />}
            onClick={() => setOpenReqModal(true)}
            style={{ borderColor: '#06b6d4', color: '#06b6d4', fontWeight: 700 }}
          >
            إرسال طلب تدريب جديد
          </Button>

          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={() => setOpenModal(true)}
            style={{ background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)', fontWeight: 700 }}
          >
            إنشاء دفعة أكاديمية
          </Button>
        </div>
      </div>

      {successMsg && (
        <Alert severity="success" onClose={() => setSuccessMsg(null)} style={{ borderRadius: '10px' }}>
          {successMsg}
        </Alert>
      )}

      {/* Tabs Bar */}
      <Paper style={{ background: '#1e293b', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
        <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)} textColor="secondary" indicatorColor="secondary">
          <Tab icon={<GraduationCap size={18} />} iconPosition="start" label={`الدفعات الأكاديمية (${intakesList.length})`} style={{ fontWeight: 700, color: '#f8fafc' }} />
          <Tab icon={<Layers size={18} />} iconPosition="start" label={`طلبات التدريب الواردة (${requestsList.length})`} style={{ fontWeight: 700, color: '#f8fafc' }} />
        </Tabs>
      </Paper>

      {/* TAB 0: Academic Intakes */}
      {activeTab === 0 && (
        <TableContainer component={Paper} className="glass-card">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>رمز واسم الدفعة</TableCell>
                <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الجامعة (University)</TableCell>
                <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>البرنامج والتخصص</TableCell>
                <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>فترة التدريب</TableCell>
                <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>المطلوب</TableCell>
                <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الموزع فعلياً</TableCell>
                <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>المتبقي</TableCell>
                <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الحالة</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoadingIntakes ? (
                <TableRow>
                  <TableCell colSpan={8} align="center"><CircularProgress size={24} /></TableCell>
                </TableRow>
              ) : intakesList.length > 0 ? (
                intakesList.map((intake: any) => {
                  const reqCount = intake.requestedCount || intake.capacity || 50;
                  const allocCount = intake.allocatedCount || 0;
                  const remCount = Math.max(0, reqCount - allocCount);

                  return (
                    <TableRow key={intake.id}>
                      <TableCell style={{ fontWeight: 700, color: '#f8fafc' }}>
                        {intake.nameAr}
                        <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#06b6d4' }}>{intake.code}</div>
                      </TableCell>
                      <TableCell style={{ color: '#cbd5e1', fontWeight: 600 }}>
                        {intake.organization?.nameAr || 'جامعة الحدود الشمالية'}
                      </TableCell>
                      <TableCell style={{ color: '#34d399', fontWeight: 600 }}>
                        {intake.program?.nameAr || 'برنامج امتياز الطب البشري'}
                      </TableCell>
                      <TableCell style={{ color: '#94a3b8', fontSize: '12px' }}>
                        {intake.startDate ? new Date(intake.startDate).toISOString().split('T')[0] : '2026-07-01'} إلى {intake.endDate ? new Date(intake.endDate).toISOString().split('T')[0] : '2027-06-30'}
                      </TableCell>
                      <TableCell style={{ fontWeight: 800, color: '#38bdf8' }}>{reqCount} طالب</TableCell>
                      <TableCell style={{ fontWeight: 800, color: '#10b981' }}>{allocCount} موزع</TableCell>
                      <TableCell style={{ fontWeight: 800, color: remCount > 0 ? '#f59e0b' : '#10b981' }}>{remCount} متبقي</TableCell>
                      <TableCell>
                        <Chip
                          label={intake.status === 'active' || intake.status === 'planned' ? 'نشطة (Active)' : intake.status}
                          color="success"
                          size="small"
                          style={{ fontWeight: 700 }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} align="center" style={{ color: '#94a3b8', padding: '32px' }}>
                    لا توجد دفعات أكاديمية حالياً
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* TAB 1: Incoming Training Requests */}
      {activeTab === 1 && (
        <TableContainer component={Paper} className="glass-card">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>رقم الطلب</TableCell>
                <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الجامعة الموفدة</TableCell>
                <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الجهة المستهدفة</TableCell>
                <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الأولوية</TableCell>
                <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الطلاب المطلوبون</TableCell>
                <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الموزع على المستشفيات</TableCell>
                <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>حالة الطلب</TableCell>
                <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>تاريخ التقديم</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoadingRequests ? (
                <TableRow>
                  <TableCell colSpan={8} align="center"><CircularProgress size={24} /></TableCell>
                </TableRow>
              ) : requestsList.length > 0 ? (
                requestsList.map((req: any) => (
                  <TableRow key={req.id}>
                    <TableCell style={{ fontFamily: 'monospace', color: '#06b6d4', fontWeight: 800 }}>
                      {req.requestNumber}
                    </TableCell>
                    <TableCell style={{ color: '#f8fafc', fontWeight: 700 }}>
                      {req.sourceOrg?.nameAr || 'جامعة الحدود الشمالية'}
                    </TableCell>
                    <TableCell style={{ color: '#cbd5e1' }}>
                      {req.targetOrg?.nameAr || 'تجمع الحدود الشمالية الصحي'}
                    </TableCell>
                    <TableCell>
                      <Chip label={req.priority === 'urgent' ? 'عاجل' : 'عادي'} color={req.priority === 'urgent' ? 'error' : 'default'} size="small" />
                    </TableCell>
                    <TableCell style={{ fontWeight: 800, color: '#38bdf8' }}>{req.studentCount} طالب</TableCell>
                    <TableCell style={{ fontWeight: 800, color: '#10b981' }}>
                      {Array.isArray(req.allocations) ? req.allocations.reduce((sum: number, a: any) => sum + (Number(a.allocatedSeats) || Number(a.seats) || 0), 0) : 0} مقعد
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          req.status === 'submitted'
                            ? 'مرفوع (Submitted)'
                            : req.status === 'approved'
                            ? 'معتمد (Approved)'
                            : req.status === 'auto_allocated'
                            ? 'موزع آلياً (Auto Allocated)'
                            : req.status
                        }
                        color={req.status === 'approved' ? 'success' : req.status === 'auto_allocated' ? 'info' : 'warning'}
                        size="small"
                        style={{ fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell style={{ color: '#94a3b8', fontSize: '12px' }}>
                      {req.createdAt ? new Date(req.createdAt).toISOString().split('T')[0] : '2026-08-01'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} align="center" style={{ color: '#94a3b8', padding: '32px' }}>
                    لا توجد طلبات تدريب واردة حالياً
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

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

export default AcademicIntakes;
