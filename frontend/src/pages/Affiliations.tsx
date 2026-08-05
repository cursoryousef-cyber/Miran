import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { FolderGit2, Plus, Building2, CheckCircle2, Network, Send } from 'lucide-react';
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

  const { data, isLoading } = useQuery({
    queryKey: ['affiliations'],
    queryFn: async () => {
      const res = await apiClient.get('/organization-affiliations');
      return res.data;
    },
  });

  const allocateMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/organization-affiliations', {
        nameAr: `اعتماد وتوزيع مقاعد: ${selectedReq?.nameAr || 'طلب الامتياز'}`,
        affiliationType: 'cluster_allocation',
        agreementRef: `ALLOC-${Date.now().toString().slice(-6)}`,
        notes: `توزيع المقاعد: برج الشمال (${northTowerSeats})، رفحاء (${rafhaSeats})، طريف (${turaifSeats})`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliations'] });
      setOpenAllocateModal(false);
      setSuccessMsg('تم اعتماد الطلب وتوزيع الطلاب على مستشفيات التجمع (برج الشمال 20، رفحاء 15، طريف 15) بنجاح!');
    },
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
            اتفاقيات الشراكة وطلبات التوزيع السريري (Internship Requests & Allocations)
          </h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            {user?.activeOrganization?.nameAr} — مراجعة الطلبات الواردة وتوزيع المقاعد على مستشفيات التجمع
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
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>عنوان الطلب / الاتفاقية</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الجهة المصدر (الجامعة)</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الجهة المستضيفة (التجمع)</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>نوع الإجراء</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>رقم المرجع</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الحالة والأعمال</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} align="center"><CircularProgress size={24} /></TableCell>
              </TableRow>
            ) : data?.data?.length > 0 ? (
              data.data.map((aff: any) => (
                <TableRow key={aff.id}>
                  <TableCell style={{ fontWeight: 700, color: '#f8fafc' }}>
                    {aff.nameAr || 'طلب تدريب امتياز'}
                  </TableCell>
                  <TableCell style={{ color: '#34d399' }}>{aff.sourceOrg?.nameAr || 'جامعة الحدود الشمالية'}</TableCell>
                  <TableCell style={{ color: '#06b6d4' }}>{aff.targetOrg?.nameAr || 'تجمع الحدود الشمالية الصحي'}</TableCell>
                  <TableCell><Chip label={aff.affiliationType === 'internship_request' ? 'طلب تدريب جديد' : 'توزيع مقاعد'} size="small" color={aff.affiliationType === 'internship_request' ? 'warning' : 'primary'} /></TableCell>
                  <TableCell style={{ fontFamily: 'monospace' }}>{aff.agreementRef || 'REQ-2027'}</TableCell>
                  <TableCell>
                    {hasAnyRole(['cluster_administrator', 'training_director', 'platform_owner']) ? (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => {
                          setSelectedReq(aff);
                          setOpenAllocateModal(true);
                        }}
                        style={{ background: 'linear-gradient(135deg, #0891b2, #06b6d4)', fontWeight: 700, fontSize: '11px' }}
                      >
                        مراجعة وتوزيع المقاعد (Allocate)
                      </Button>
                    ) : (
                      <Chip icon={<CheckCircle2 size={14} />} label="مكتمل" color="success" size="small" />
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center" style={{ color: '#94a3b8' }}>لا توجد طلبات تدريب حالياً</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Allocation Modal */}
      <Dialog open={openAllocateModal} onClose={() => setOpenAllocateModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle style={{ fontWeight: 800 }}>توزيع مقاعد التدريب على مستشفيات التجمع (Hospital Allocation Queue)</DialogTitle>
        <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '16px' }}>
          <Alert severity="info">الطلب الحالي: {selectedReq?.nameAr || 'طلب تدريب امتياز 2027'}</Alert>

          <TextField label="مقاعد مستشفى برج الشمال الطبي (عرعر)" type="number" value={northTowerSeats} onChange={(e) => setNorthTowerSeats(Number(e.target.value))} fullWidth />
          <TextField label="مقاعد مستشفى رفحاء المركزي" type="number" value={rafhaSeats} onChange={(e) => setRafhaSeats(Number(e.target.value))} fullWidth />
          <TextField label="مقاعد مستشفى طريف العام" type="number" value={turaifSeats} onChange={(e) => setTuraifSeats(Number(e.target.value))} fullWidth />
        </DialogContent>
        <DialogActions style={{ padding: '16px 24px' }}>
          <Button onClick={() => setOpenAllocateModal(false)}>إلغاء</Button>
          <Button variant="contained" onClick={() => allocateMutation.mutate()} disabled={allocateMutation.isPending} style={{ background: '#06b6d4', fontWeight: 700 }}>
            {allocateMutation.isPending ? <CircularProgress size={20} /> : 'اعتماد التوزيع (Approve & Allocate)'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};
