import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  CheckCircle2, XCircle, ArrowRightLeft, RefreshCw,
} from 'lucide-react';
import {
  Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions, Alert, CircularProgress,
  TextField, Tooltip, IconButton,
} from '@mui/material';

// Maps current status → which role should act
const ROLE_STATUS_MAP: Record<string, string[]> = {
  hospital_administrator: ['approved'],
  department_head: ['approved'],
  training_supervisor: ['hospital_administrator_accepted'],
  trainer: ['training_supervisor_accepted'],
};

const STATUS_LABELS: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
  approved: { label: 'بانتظار موافقة المستشفى', color: 'info' },
  hospital_accepted: { label: 'موافق عليه من المستشفى', color: 'success' },
  hospital_administrator_accepted: { label: 'بانتظار موافقة المشرف', color: 'warning' },
  training_supervisor_accepted: { label: 'بانتظار موافقة المدرب', color: 'warning' },
  trainer_accepted: { label: 'موافق عليه من المدرب', color: 'success' },
  active: { label: 'نشط', color: 'success' },
  rejected: { label: 'مرفوض', color: 'error' },
  hospital_returned_to_cluster: { label: 'مُعاد للتجمع', color: 'error' },
};

export const AcceptanceChain: React.FC = () => {
  const { user, primaryRole } = useAuth();
  const qc = useQueryClient();

  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [dialog, setDialog] = useState<'accept' | 'reject' | 'return' | null>(null);
  const [notes, setNotes] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pendingStatuses = ROLE_STATUS_MAP[primaryRole] ?? [];

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['acceptance-chain-requests', primaryRole],
    queryFn: async () => {
      const res = await apiClient.get('/training-requests');
      const all: any[] = res.data?.data || [];
      return all.filter((r) => pendingStatuses.includes(r.status));
    },
    enabled: pendingStatuses.length > 0,
  });

  const requests: any[] = data || [];

  const openDialog = (req: any, type: 'accept' | 'reject' | 'return') => {
    setSelectedReq(req);
    setNotes('');
    setDialog(type);
  };

  const makeMutation = (action: string) =>
    useMutation({
      mutationFn: () =>
        apiClient.post(`/training-requests/${selectedReq?.id}/${action}`, { notes }),
      onSuccess: (res: any) => {
        qc.invalidateQueries({ queryKey: ['acceptance-chain-requests'] });
        setDialog(null);
        setSelectedReq(null);
        setSuccessMsg(res.data?.message || 'تمت العملية بنجاح');
      },
      onError: (err: any) => setErrorMsg(err.response?.data?.message || err.message),
    });

  const acceptMut = useMutation({
    mutationFn: () =>
      apiClient.post(`/training-requests/${selectedReq?.id}/accept`, { notes }),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['acceptance-chain-requests'] });
      setDialog(null);
      setSelectedReq(null);
      setSuccessMsg(res.data?.message || 'تمت الموافقة بنجاح');
    },
    onError: (err: any) => setErrorMsg(err.response?.data?.message || err.message),
  });

  const rejectMut = useMutation({
    mutationFn: () =>
      apiClient.post(`/training-requests/${selectedReq?.id}/reject`, { notes }),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['acceptance-chain-requests'] });
      setDialog(null);
      setSelectedReq(null);
      setSuccessMsg(res.data?.message || 'تم الرفض');
    },
    onError: (err: any) => setErrorMsg(err.response?.data?.message || err.message),
  });

  const returnMut = useMutation({
    mutationFn: () =>
      apiClient.post(`/training-requests/${selectedReq?.id}/return-to-cluster`, { notes }),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['acceptance-chain-requests'] });
      setDialog(null);
      setSelectedReq(null);
      setSuccessMsg(res.data?.message || 'تمت الإعادة للتجمع');
    },
    onError: (err: any) => setErrorMsg(err.response?.data?.message || err.message),
  });

  const roleLabel: Record<string, string> = {
    hospital_administrator: 'مدير المستشفى',
    department_head: 'رئيس القسم',
    training_supervisor: 'المشرف التدريبي',
    trainer: 'المدرب السريري',
  };

  if (pendingStatuses.length === 0) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
        دورك الحالي ({primaryRole}) لا يشارك في سلسلة القبول
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
            سلسلة القبول — طلبات بانتظار موافقتك
          </h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            {user?.activeOrganization?.nameAr} — دورك: {roleLabel[primaryRole] ?? primaryRole}
          </p>
        </div>
        <Tooltip title="تحديث">
          <IconButton onClick={() => refetch()} style={{ color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
            <RefreshCw size={18} />
          </IconButton>
        </Tooltip>
      </div>

      {successMsg && <Alert severity="success" onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}
      {errorMsg && <Alert severity="error" onClose={() => setErrorMsg(null)}>{errorMsg}</Alert>}

      <TableContainer component={Paper} className="glass-card">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>رقم الطلب</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الجامعة الموفِدة</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>عدد المتدربين</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>تاريخ الطلب</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>حالة السلسلة</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700, textAlign: 'center' }}>الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} align="center"><CircularProgress size={24} /></TableCell></TableRow>
            ) : requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" style={{ color: '#94a3b8', padding: '40px' }}>
                  ✅ لا توجد طلبات بانتظار موافقتك حالياً
                </TableCell>
              </TableRow>
            ) : (
              requests.map((req: any) => {
                const st = STATUS_LABELS[req.status] ?? { label: req.status, color: 'default' as const };
                return (
                  <TableRow key={req.id}>
                    <TableCell style={{ fontFamily: 'monospace', color: '#06b6d4', fontWeight: 700 }}>
                      {req.requestNumber}
                    </TableCell>
                    <TableCell style={{ color: '#f8fafc', fontWeight: 600 }}>
                      {req.sourceOrg?.nameAr || '—'}
                    </TableCell>
                    <TableCell style={{ color: '#f59e0b', fontWeight: 700 }}>
                      {req.studentCount} متدرب
                    </TableCell>
                    <TableCell style={{ fontSize: '12px', color: '#94a3b8' }}>
                      {new Date(req.createdAt).toLocaleDateString('ar-SA')}
                    </TableCell>
                    <TableCell>
                      <Chip label={st.label} color={st.color} size="small" style={{ fontWeight: 700 }} />
                    </TableCell>
                    <TableCell>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <Tooltip title="الموافقة والتقدم للخطوة التالية">
                          <Button
                            size="small"
                            variant="contained"
                            style={{ background: '#059669', minWidth: 0, padding: '6px 12px', gap: '4px', fontSize: '12px' }}
                            onClick={() => openDialog(req, 'accept')}
                          >
                            <CheckCircle2 size={14} />
                            موافقة
                          </Button>
                        </Tooltip>
                        <Tooltip title="رفض الطلب">
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            style={{ minWidth: 0, padding: '6px 12px', gap: '4px', fontSize: '12px' }}
                            onClick={() => openDialog(req, 'reject')}
                          >
                            <XCircle size={14} />
                            رفض
                          </Button>
                        </Tooltip>
                        <Tooltip title="إعادة للتجمع">
                          <Button
                            size="small"
                            variant="outlined"
                            style={{ borderColor: '#f59e0b', color: '#f59e0b', minWidth: 0, padding: '6px 12px', gap: '4px', fontSize: '12px' }}
                            onClick={() => openDialog(req, 'return')}
                          >
                            <ArrowRightLeft size={14} />
                            إعادة
                          </Button>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Accept Dialog */}
      <Dialog open={dialog === 'accept'} onClose={() => setDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle style={{ fontWeight: 800, color: '#059669' }}>تأكيد الموافقة — {selectedReq?.requestNumber}</DialogTitle>
        <DialogContent style={{ paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Alert severity="info">
            الجامعة: <strong>{selectedReq?.sourceOrg?.nameAr}</strong> — {selectedReq?.studentCount} متدرب
          </Alert>
          <Alert severity="success">
            ستنتقل الطلب إلى الخطوة التالية في سلسلة القبول تلقائياً.
          </Alert>
          <TextField
            label="ملاحظات (اختياري)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            fullWidth
            multiline
            rows={2}
            size="small"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>إلغاء</Button>
          <Button
            variant="contained"
            style={{ background: '#059669' }}
            onClick={() => acceptMut.mutate()}
            disabled={acceptMut.isPending}
          >
            {acceptMut.isPending ? <CircularProgress size={20} /> : '✅ تأكيد الموافقة'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={dialog === 'reject'} onClose={() => setDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle style={{ fontWeight: 800, color: '#ef4444' }}>رفض الطلب — {selectedReq?.requestNumber}</DialogTitle>
        <DialogContent style={{ paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Alert severity="warning">
            سيتم رفض الطلب وإخطار الجامعة. لا يمكن التراجع عن هذا الإجراء.
          </Alert>
          <TextField
            label="سبب الرفض *"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            fullWidth
            required
            multiline
            rows={3}
            size="small"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>إلغاء</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => rejectMut.mutate()}
            disabled={rejectMut.isPending || !notes.trim()}
          >
            {rejectMut.isPending ? <CircularProgress size={20} /> : 'تأكيد الرفض'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Return to Cluster Dialog */}
      <Dialog open={dialog === 'return'} onClose={() => setDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle style={{ fontWeight: 800 }}>إعادة الطلب للتجمع — {selectedReq?.requestNumber}</DialogTitle>
        <DialogContent style={{ paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Alert severity="warning">
            سيُعاد الطلب للتجمع الصحي لإعادة التوزيع أو المراجعة.
          </Alert>
          <TextField
            label="سبب الإعادة *"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            fullWidth
            required
            multiline
            rows={3}
            size="small"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>إلغاء</Button>
          <Button
            variant="contained"
            style={{ background: '#f59e0b', color: '#000' }}
            onClick={() => returnMut.mutate()}
            disabled={returnMut.isPending || !notes.trim()}
          >
            {returnMut.isPending ? <CircularProgress size={20} /> : 'إعادة للتجمع'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default AcceptanceChain;
