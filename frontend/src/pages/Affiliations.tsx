import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { FileText, CheckCircle2, Clock, Building2, Send, AlertCircle } from 'lucide-react';
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

export const Affiliations: React.FC = () => {
  const { user, hasAnyRole } = useAuth();
  const queryClient = useQueryClient();

  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [openAllocateModal, setOpenAllocateModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Hospital seats distribution
  const [northTowerSeats, setNorthTowerSeats] = useState(20);
  const [rafhaSeats, setRafhaSeats] = useState(15);
  const [turaifSeats, setTuraifSeats] = useState(15);
  const [clusterNotes, setClusterNotes] = useState('تمت المراجعة واعتماد التوزيع على المستشفيات وفق السعة المتاحة');

  const { data, isLoading } = useQuery({
    queryKey: ['training-requests'],
    queryFn: async () => {
      const res = await apiClient.get('/training-requests');
      return res.data;
    },
  });

  const allocateMutation = useMutation({
    mutationFn: async () => {
      return apiClient.patch(`/training-requests/${selectedReq?.id}`, {
        status: 'allocated',
        notes: clusterNotes,
        allocations: [
          { hospitalName: 'مستشفى برج الشمال الطبي', seats: northTowerSeats },
          { hospitalName: 'مستشفى رفحاء المركزي', seats: rafhaSeats },
          { hospitalName: 'مستشفى طريف العام', seats: turaifSeats },
        ],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-requests'] });
      setOpenAllocateModal(false);
      setSuccessMsg('تمت مراجعة واعتماد طلب التدريب وتوزيع المقاعد على مستشفيات التجمع (برج الشمال 20، رفحاء 15، طريف 15) بنجاح!');
    },
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
            طلبات التدريب الواردة للتجمع الصحي (Incoming Training Requests Queue)
          </h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            {user?.activeOrganization?.nameAr} — مراجعة الطلبات التشغيلية الواردة من الجامعات وتوزيع المتدربين على المستشفيات
          </p>
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
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>رقم الطلب</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الجامعة الموفدة</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>البرنامج والأفواج</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>عدد المتدربين</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الأولوية</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>تاريخ الإرسال</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الحالة والأعمال</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} align="center"><CircularProgress size={24} /></TableCell>
              </TableRow>
            ) : data?.data?.length > 0 ? (
              data.data.map((req: any) => (
                <TableRow key={req.id}>
                  <TableCell style={{ fontFamily: 'monospace', color: '#06b6d4', fontWeight: 700 }}>
                    {req.requestNumber || 'TR-2027-0001'}
                  </TableCell>
                  <TableCell style={{ color: '#f8fafc', fontWeight: 700 }}>
                    {req.sourceOrg?.nameAr || 'جامعة الحدود الشمالية'}
                  </TableCell>
                  <TableCell style={{ color: '#34d399' }}>
                    {req.program?.nameAr || 'برنامج امتياز الطب والجراحة العامة 2027'}
                  </TableCell>
                  <TableCell style={{ fontWeight: 800, color: '#f59e0b' }}>
                    {req.studentCount} متدرب
                  </TableCell>
                  <TableCell>
                    <Chip label={req.priority === 'urgent' ? 'عاجل' : 'عادي'} size="small" color={req.priority === 'urgent' ? 'error' : 'default'} />
                  </TableCell>
                  <TableCell style={{ fontSize: '12px', color: '#94a3b8' }}>
                    {new Date(req.createdAt).toLocaleDateString('ar-SA')}
                  </TableCell>
                  <TableCell>
                    {hasAnyRole(['cluster_administrator', 'training_director', 'platform_owner']) ? (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => {
                          setSelectedReq(req);
                          setOpenAllocateModal(true);
                        }}
                        style={{ background: req.status === 'allocated' ? '#059669' : 'linear-gradient(135deg, #0891b2, #06b6d4)', fontWeight: 700, fontSize: '11px' }}
                      >
                        {req.status === 'allocated' ? 'معتمد وموزع (Allocated)' : 'مراجعة وتوزيع الطلاب (Allocate)'}
                      </Button>
                    ) : (
                      <Chip icon={<CheckCircle2 size={14} />} label={req.status} color="success" size="small" />
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center" style={{ color: '#94a3b8' }}>لا توجد طلبات تدريب تشغيلية حالياً</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Allocate Modal */}
      <Dialog open={openAllocateModal} onClose={() => setOpenAllocateModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle style={{ fontWeight: 800 }}>مراجعة وتوزيع مقاعد طلب التدريب ({selectedReq?.requestNumber})</DialogTitle>
        <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '16px' }}>
          <Alert severity="info">
            المستفيد: {selectedReq?.sourceOrg?.nameAr || 'جامعة الحدود الشمالية'} — عدد المتدربين: {selectedReq?.studentCount} متدرب
          </Alert>

          <TextField label="مقاعد مستشفى برج الشمال الطبي (عرعر)" type="number" value={northTowerSeats} onChange={(e) => setNorthTowerSeats(Number(e.target.value))} fullWidth />
          <TextField label="مقاعد مستشفى رفحاء المركزي" type="number" value={rafhaSeats} onChange={(e) => setRafhaSeats(Number(e.target.value))} fullWidth />
          <TextField label="مقاعد مستشفى طريف العام" type="number" value={turaifSeats} onChange={(e) => setTuraifSeats(Number(e.target.value))} fullWidth />
          <TextField label="ملاحظات مدير التجمع الصحي" multiline rows={2} value={clusterNotes} onChange={(e) => setClusterNotes(e.target.value)} fullWidth />
        </DialogContent>
        <DialogActions style={{ padding: '16px 24px' }}>
          <Button onClick={() => setOpenAllocateModal(false)}>إلغاء</Button>
          <Button variant="contained" onClick={() => allocateMutation.mutate()} disabled={allocateMutation.isPending} style={{ background: '#059669', fontWeight: 700 }}>
            {allocateMutation.isPending ? <CircularProgress size={20} /> : 'اعتماد التوزيع وإرساله للمستشفيات (Approve & Allocate)'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};
