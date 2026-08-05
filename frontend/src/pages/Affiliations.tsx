import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { FileText, CheckCircle2, Clock, Building2, Send, AlertCircle, RefreshCw } from 'lucide-react';
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
} from '@mui/material';
import { useAuth } from '../context/AuthContext';

export const Affiliations: React.FC = () => {
  const { user, hasAnyRole } = useAuth();
  const queryClient = useQueryClient();

  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [openAllocateModal, setOpenAllocateModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [clusterNotes, setClusterNotes] = useState('تمت المراجعة واعتماد التوزيع على المستشفيات وفق السعة المتاحة');

  // Hospital seat allocations — dynamic
  const [allocations, setAllocations] = useState<Record<string, number>>({});

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['training-requests'],
    queryFn: async () => {
      const res = await apiClient.get('/training-requests');
      return res.data;
    },
  });

  // Fetch hospitals for allocation
  const { data: hospitalsData } = useQuery({
    queryKey: ['hospitals-for-allocation'],
    queryFn: async () => {
      const res = await apiClient.get('/organizations', { params: { limit: 50 } }).catch(() => ({ data: { data: [] } }));
      const allOrgs = res.data?.data || [];
      return allOrgs.filter((o: any) => o.organizationType?.code === 'hospital');
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

      return apiClient.patch(`/training-requests/${selectedReq?.id}`, {
        status: 'allocated',
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
  });

  const getStatusChip = (status: string) => {
    const statusMap: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
      submitted: { label: 'مرسل', color: 'info' },
      under_review: { label: 'قيد المراجعة', color: 'warning' },
      approved: { label: 'تمت الموافقة', color: 'success' },
      allocated: { label: 'موزع', color: 'success' },
      rejected: { label: 'مرفوض', color: 'error' },
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
        <Tooltip title="تحديث البيانات">
          <IconButton onClick={() => refetch()} style={{ color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
            <RefreshCw size={18} />
          </IconButton>
        </Tooltip>
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
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الحالة</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700, textAlign: 'center' }}>الإجراءات</TableCell>
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
                  <TableCell style={{ fontFamily: 'monospace', color: '#06b6d4', fontWeight: 700 }}>
                    {req.requestNumber}
                  </TableCell>
                  <TableCell style={{ color: '#f8fafc', fontWeight: 700 }}>
                    {req.sourceOrg?.nameAr || '—'}
                  </TableCell>
                  <TableCell style={{ color: '#34d399' }}>
                    {req.program?.nameAr || '—'}
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
                            : 'linear-gradient(135deg, #0891b2, #06b6d4)',
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
                <TableCell colSpan={8} align="center" style={{ color: '#94a3b8' }}>لا توجد طلبات تدريب تشغيلية حالياً</TableCell>
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
            const remaining = Math.max(0, (h.capacity || 0) - (h._count?.traineeProfiles || 0));
            return (
              <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <TextField
                  label={`${h.nameAr} (متاح: ${remaining} من ${h.capacity || 0})`}
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
        </DialogContent>
        <DialogActions style={{ padding: '16px 24px' }}>
          <Button onClick={() => setOpenAllocateModal(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={() => allocateMutation.mutate()}
            disabled={allocateMutation.isPending || totalAllocated === 0}
            style={{ background: '#059669', fontWeight: 700 }}
          >
            {allocateMutation.isPending ? <CircularProgress size={20} /> : 'اعتماد التوزيع وإرساله للمستشفيات (Approve & Allocate)'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};
