import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader, DataPageShell } from '../components/ui';
import { apiClient } from '../api/client';
import { GraduationCap, Plus, CheckCircle2, Building2, Users, ClipboardList, CalendarClock, FolderGit2, AlertCircle } from 'lucide-react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';

export const AcademicIntakes: React.FC = () => {
  const { user, hasCapability } = useAuth();
  const canManageBatches = hasCapability('academic_batch.manage');
  const queryClient = useQueryClient();

  const [openModal, setOpenModal] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load existing academic intakes
  const { data: intakesData, isLoading: isLoadingIntakes } = useQuery({
    queryKey: ['intakes'],
    queryFn: async () => {
      const res = await apiClient.get('/academic-intakes');
      return res.data;
    },
  });

  // Load approved training requests available for batch creation
  const { data: approvedRequestsData, isLoading: isLoadingApproved } = useQuery({
    queryKey: ['approved-training-requests'],
    queryFn: async () => {
      const res = await apiClient.get('/training-requests');
      const all = res.data?.data || res.data || [];
      return all.filter((r: any) => r.status === 'approved');
    },
    enabled: canManageBatches,
  });

  const createBatchFromRequestMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRequestId) {
        throw new Error('يرجى اختيار طلب تدريب معتمد أولاً');
      }
      return apiClient.post('/academic-intakes/from-request', {
        trainingRequestId: selectedRequestId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intakes'] });
      queryClient.invalidateQueries({ queryKey: ['approved-training-requests'] });
      setOpenModal(false);
      setSelectedRequestId('');
      setSuccessMsg('تم إنشاء الدفعة الأكاديمية بنجاح من طلب التدريب المعتمد!');
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setErrorMsg(err?.response?.data?.message || err?.message || 'حدث خطأ أثناء إنشاء الدفعة');
    },
  });

  const intakesList = intakesData?.data || [];
  const approvedRequests = approvedRequestsData || [];

  const activeIntakes = intakesList.filter((i: any) => ['active', 'ongoing'].includes(i.status)).length;
  const plannedIntakes = intakesList.filter((i: any) => i.status === 'planned').length;
  const intakeCapacity = intakesList.reduce((s: number, i: any) => s + (i.capacity ?? 0), 0);
  const selectedReq = approvedRequests.find((r: any) => r.id === selectedRequestId);

  return (
    <DataPageShell
      title="الدفعات الأكاديمية (Academic Batches)"
      actions={
        <>
          {canManageBatches && (
            <Button
              variant="contained"
              startIcon={<Plus size={18} />}
              onClick={() => { setOpenModal(true); setErrorMsg(null); }}
              style={{ background: 'linear-gradient(135deg, #0891B2 0%, #0D9488 100%)', fontWeight: 700 }}
            >
              إنشاء دفعة أكاديمية من طلب معتمد
            </Button>
          )}
        </>
      }
      loading={isLoadingIntakes}
      stats={[
        { label: 'الدفعات الأكاديمية', value: intakesList.length, icon: ClipboardList, tone: 'primary' },
        { label: 'دفعات نشطة', value: activeIntakes, icon: CheckCircle2, tone: 'success' },
        { label: 'دفعات مخططة', value: plannedIntakes, icon: CalendarClock, tone: 'info' },
        { label: 'السعة المخططة', value: intakeCapacity, icon: Users, tone: 'neutral' },
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

      {/* Academic Batches Table */}
      <TableContainer component={Paper} className="glass-card">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>رمز واسم الدفعة</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>طلب التدريب المصدر (Source Request)</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>الجامعة (University)</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>البرنامج والتخصص</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>فترة التدريب</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>المطلوب</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>الموزع فعلياً</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>المتبقي</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>الحالة</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoadingIntakes ? (
              <TableRow>
                <TableCell colSpan={9} align="center"><CircularProgress size={24} /></TableCell>
              </TableRow>
            ) : intakesList.length > 0 ? (
              intakesList.map((intake: any) => {
                const reqCount = intake.requestedCount || intake.capacity || 50;
                const allocCount = intake.allocatedCount || 0;
                const remCount = Math.max(0, reqCount - allocCount);
                const reqNum = intake.trainingRequest?.requestNumber || intake.trainingRequestId || '—';
                const univName = intake.universityOrg?.nameAr || intake.organization?.nameAr || '—';

                return (
                  <TableRow key={intake.id}>
                    <TableCell style={{ fontWeight: 700, color: '#0F172A' }}>
                      {intake.nameAr}
                      <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#0891B2' }}>{intake.code}</div>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`طلب التدريب: ${reqNum}`}
                        size="small"
                        style={{ backgroundColor: '#E0F2FE', color: '#0369A1', fontWeight: 800, fontSize: '11px' }}
                      />
                    </TableCell>
                    <TableCell style={{ color: '#475569', fontWeight: 600 }}>
                      {univName}
                    </TableCell>
                    <TableCell style={{ color: '#047857', fontWeight: 600 }}>
                      {intake.program?.nameAr || 'برنامج امتياز الطب البشري'}
                    </TableCell>
                    <TableCell style={{ color: '#64748B', fontSize: '12px' }}>
                      {intake.startDate ? new Date(intake.startDate).toISOString().split('T')[0] : '2027-01-01'} إلى {intake.endDate ? new Date(intake.endDate).toISOString().split('T')[0] : '2027-12-31'}
                    </TableCell>
                    <TableCell style={{ fontWeight: 800, color: '#0284C7' }}>{reqCount} طالب</TableCell>
                    <TableCell style={{ fontWeight: 800, color: '#059669' }}>{allocCount} موزع</TableCell>
                    <TableCell style={{ fontWeight: 800, color: remCount > 0 ? '#D97706' : '#059669' }}>{remCount} متبقي</TableCell>
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
                <TableCell colSpan={9} align="center" style={{ color: '#64748B', padding: '32px' }}>
                  لا توجد دفعات أكاديمية حالياً
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Modal: Create Academic Intake FROM Approved Training Request ONLY */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle style={{ fontWeight: 800 }}>إنشاء دفعة أكاديمية من طلب تدريب معتمد</DialogTitle>
        <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '16px' }}>
          {approvedRequests.length === 0 ? (
            <Alert severity="warning" style={{ borderRadius: '8px' }}>
              لا يوجد طلب تدريب معتمد حالياً بحالة Approved. يجب مراجعة واكتفاء الاعتماد لطلب تدريب من لوحة الطلبات الواردة أولاً.
            </Alert>
          ) : (
            <FormControl fullWidth required>
              <InputLabel id="approved-request-label">اختر طلب التدريب المعتمد</InputLabel>
              <Select
                labelId="approved-request-label"
                value={selectedRequestId}
                label="اختر طلب التدريب المعتمد"
                onChange={(e) => setSelectedRequestId(e.target.value)}
              >
                {approvedRequests.map((req: any) => (
                  <MenuItem key={req.id} value={req.id}>
                    {req.requestNumber} — {req.sourceOrg?.nameAr ?? 'الجامعة'} ({req.studentCount} طالب)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {selectedReq && (
            <Paper style={{ padding: '16px', backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, color: '#0891B2', fontSize: '15px' }}>{selectedReq.requestNumber}</span>
                <Chip label="معتمد (Approved)" color="success" size="small" style={{ fontWeight: 800 }} />
              </div>
              <div style={{ fontSize: '13px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div>الجامعة الموفدة: <strong>{selectedReq.sourceOrg?.nameAr || '—'}</strong></div>
                <div>البرنامج / التخصص: <strong>{selectedReq.program?.nameAr || selectedReq.specialty || 'امتياز الطب البشري'}</strong></div>
                <div>عدد أطباء الامتياز: <strong>{selectedReq.studentCount} طالب</strong></div>
                <div>فترة التدريب: <strong>{selectedReq.trainingStartDate ? new Date(selectedReq.trainingStartDate).toISOString().split('T')[0] : '2027-01-01'} إلى {selectedReq.trainingEndDate ? new Date(selectedReq.trainingEndDate).toISOString().split('T')[0] : '2027-12-31'}</strong></div>
              </div>
            </Paper>
          )}
        </DialogContent>
        <DialogActions style={{ padding: '16px 24px' }}>
          <Button onClick={() => setOpenModal(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={() => createBatchFromRequestMutation.mutate()}
            disabled={!selectedRequestId || createBatchFromRequestMutation.isPending}
            style={{ background: '#059669', fontWeight: 700 }}
          >
            {createBatchFromRequestMutation.isPending ? <CircularProgress size={20} /> : 'إنشاء الدفعة الأكاديمية'}
          </Button>
        </DialogActions>
      </Dialog>
    </DataPageShell>
  );
};

export default AcademicIntakes;
