import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { BedDouble, Building2, GraduationCap, Plus, Trash2, UserCog, Users } from 'lucide-react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';

interface Occupancy {
  capacity: number;
  occupied: number;
  available: number;
  occupancyPercentage: number;
}

interface Allocation {
  id: string;
  scopeType: string;
  scopeId: string;
  specialtyCode: string;
  gender: string;
  trainingPeriod: string;
  totalCapacity: number;
  notes?: string;
}

interface Department {
  id: string;
  nameAr: string;
  nameEn?: string;
  capacity: number;
  maxTrainers?: number | null;
  maxSupervisors?: number | null;
  maxActiveInterns?: number | null;
  occupancy: Occupancy;
}

interface Breakdown {
  hospital: Occupancy;
  departments: Department[];
  specialties: { allocation: Allocation; occupancy: Occupancy }[];
  trainerRules: Allocation[];
  supervisors: { allocation: Allocation; occupancy: Occupancy }[];
}

const occupancyColor = (pct: number) => (pct >= 100 ? 'error' : pct >= 80 ? 'warning' : 'success');

export const HospitalCapacity: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const hospitalId = user?.activeOrganization?.id as string;

  const [hospitalTotalInput, setHospitalTotalInput] = useState<number | null>(null);
  const [deptEdits, setDeptEdits] = useState<Record<string, { capacity?: number; maxTrainers?: number; maxSupervisors?: number; maxActiveInterns?: number }>>({});
  const [openAllocDialog, setOpenAllocDialog] = useState(false);
  const [allocForm, setAllocForm] = useState({
    scopeType: 'specialty',
    scopeId: '',
    specialtyCode: '',
    gender: '',
    trainingPeriod: '',
    totalCapacity: 10,
    notes: '',
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { data, isLoading } = useQuery<Breakdown>({
    queryKey: ['hospital-capacity', hospitalId],
    queryFn: async () => {
      const res = await apiClient.get(`/organizations/${hospitalId}/capacity`);
      return res.data;
    },
    enabled: Boolean(hospitalId),
    refetchInterval: 20000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['hospital-capacity', hospitalId] });
    queryClient.invalidateQueries({ queryKey: ['hospitals-cards'] });
  };

  const showError = (err: any) => setErrorMsg(err?.response?.data?.message || 'حدث خطأ غير متوقع');

  const updateHospitalMutation = useMutation({
    mutationFn: async (capacity: number) => {
      const res = await apiClient.put(`/organizations/${hospitalId}/capacity/hospital`, { capacity });
      return res.data;
    },
    onSuccess: (res) => { setSuccessMsg(res.message); setErrorMsg(null); setHospitalTotalInput(null); invalidate(); },
    onError: showError,
  });

  const updateDeptMutation = useMutation({
    mutationFn: async ({ departmentId, body }: { departmentId: string; body: Record<string, number> }) => {
      const res = await apiClient.patch(`/organizations/departments/${departmentId}/capacity`, body);
      return res.data;
    },
    onSuccess: (res) => { setSuccessMsg(res.message); setErrorMsg(null); invalidate(); },
    onError: showError,
  });

  const upsertAllocMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.put(`/organizations/${hospitalId}/capacity/allocations`, allocForm);
      return res.data;
    },
    onSuccess: (res) => {
      setSuccessMsg(res.message); setErrorMsg(null); setOpenAllocDialog(false);
      setAllocForm({ scopeType: 'specialty', scopeId: '', specialtyCode: '', gender: '', trainingPeriod: '', totalCapacity: 10, notes: '' });
      invalidate();
    },
    onError: showError,
  });

  const deleteAllocMutation = useMutation({
    mutationFn: async (allocationId: string) => {
      const res = await apiClient.delete(`/organizations/${hospitalId}/capacity/allocations/${allocationId}`);
      return res.data;
    },
    onSuccess: (res) => { setSuccessMsg(res.message); setErrorMsg(null); invalidate(); },
    onError: showError,
  });

  if (!hospitalId) {
    return <Alert severity="warning" sx={{ m: 3 }}>لا توجد جهة مرتبطة بحسابك.</Alert>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <BedDouble size={22} />
        <Typography variant="h5" fontWeight={700}>الطاقة الاستيعابية للمستشفى</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        المستشفى هو المسؤول الوحيد عن تحديد طاقته. أي تعديل ينعكس فوراً على لوحة التجمع الصحي.
      </Typography>

      {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}
      {errorMsg && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMsg(null)}>{errorMsg}</Alert>}

      {isLoading || !data ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : (
        <>
          {/* الطاقة الكلية */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Building2 size={18} />
                <Typography variant="subtitle1" fontWeight={700}>الطاقة الكلية للمستشفى</Typography>
              </Box>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={4}>
                  <Typography variant="body2" color="text.secondary">
                    الإشغال الحالي: {data.hospital.occupied} / {data.hospital.capacity}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, data.hospital.occupancyPercentage)}
                    color={occupancyColor(data.hospital.occupancyPercentage) as any}
                    sx={{ height: 8, borderRadius: 4, mt: 1 }}
                  />
                </Grid>
                <Grid item xs={8} sm={4}>
                  <TextField
                    label="الطاقة الكلية الجديدة"
                    type="number"
                    size="small"
                    fullWidth
                    value={hospitalTotalInput ?? data.hospital.capacity}
                    onChange={(e) => setHospitalTotalInput(Number(e.target.value))}
                  />
                </Grid>
                <Grid item xs={4} sm={2}>
                  <Button
                    variant="contained"
                    disabled={updateHospitalMutation.isPending || hospitalTotalInput === null}
                    onClick={() => updateHospitalMutation.mutate(hospitalTotalInput!)}
                  >
                    حفظ
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* الأقسام */}
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>الطاقة لكل قسم</Typography>
          <TableContainer component={Paper} sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>القسم</TableCell>
                  <TableCell>الإشغال</TableCell>
                  <TableCell>السعة</TableCell>
                  <TableCell>حد المدربين</TableCell>
                  <TableCell>حد المشرفين</TableCell>
                  <TableCell>حد المتدربين النشطين</TableCell>
                  <TableCell>حفظ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.departments.map((d) => {
                  const edit = deptEdits[d.id] || {};
                  return (
                    <TableRow key={d.id} hover>
                      <TableCell>
                        <Typography fontWeight={600}>{d.nameAr}</Typography>
                        <Chip size="small" color={occupancyColor(d.occupancy.occupancyPercentage) as any} label={`${d.occupancy.occupancyPercentage}%`} />
                      </TableCell>
                      <TableCell>{d.occupancy.occupied} / {d.occupancy.capacity}</TableCell>
                      <TableCell>
                        <TextField size="small" type="number" sx={{ width: 90 }} defaultValue={d.capacity}
                          onChange={(e) => setDeptEdits({ ...deptEdits, [d.id]: { ...edit, capacity: Number(e.target.value) } })} />
                      </TableCell>
                      <TableCell>
                        <TextField size="small" type="number" sx={{ width: 90 }} defaultValue={d.maxTrainers ?? ''}
                          onChange={(e) => setDeptEdits({ ...deptEdits, [d.id]: { ...edit, maxTrainers: Number(e.target.value) } })} />
                      </TableCell>
                      <TableCell>
                        <TextField size="small" type="number" sx={{ width: 90 }} defaultValue={d.maxSupervisors ?? ''}
                          onChange={(e) => setDeptEdits({ ...deptEdits, [d.id]: { ...edit, maxSupervisors: Number(e.target.value) } })} />
                      </TableCell>
                      <TableCell>
                        <TextField size="small" type="number" sx={{ width: 90 }} defaultValue={d.maxActiveInterns ?? ''}
                          onChange={(e) => setDeptEdits({ ...deptEdits, [d.id]: { ...edit, maxActiveInterns: Number(e.target.value) } })} />
                      </TableCell>
                      <TableCell>
                        <Button size="small" variant="outlined" disabled={!deptEdits[d.id] || updateDeptMutation.isPending}
                          onClick={() => updateDeptMutation.mutate({ departmentId: d.id, body: deptEdits[d.id] })}>
                          حفظ
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* التخصصات والجنس والفترة */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle1" fontWeight={700}>الطاقة حسب التخصص / الجنس / فترة التدريب</Typography>
            <Button size="small" startIcon={<Plus size={16} />} onClick={() => setOpenAllocDialog(true)}>إضافة قاعدة</Button>
          </Box>
          <TableContainer component={Paper} sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>التخصص</TableCell>
                  <TableCell>الجنس</TableCell>
                  <TableCell>فترة التدريب</TableCell>
                  <TableCell>الإشغال</TableCell>
                  <TableCell>السعة</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.specialties.length === 0 && (
                  <TableRow><TableCell colSpan={6}><Typography color="text.secondary" sx={{ py: 2 }}>لا توجد قواعد مخصّصة — التوزيع يعتمد على الطاقة الكلية فقط.</Typography></TableCell></TableRow>
                )}
                {data.specialties.map(({ allocation, occupancy }) => (
                  <TableRow key={allocation.id} hover>
                    <TableCell>{allocation.specialtyCode || 'الكل'}</TableCell>
                    <TableCell>{allocation.gender || 'الكل'}</TableCell>
                    <TableCell>{allocation.trainingPeriod || 'الكل'}</TableCell>
                    <TableCell>
                      <Chip size="small" color={occupancyColor(occupancy.occupancyPercentage) as any} label={`${occupancy.occupied} / ${occupancy.capacity}`} />
                    </TableCell>
                    <TableCell>{allocation.totalCapacity}</TableCell>
                    <TableCell>
                      <IconButton size="small" color="error" onClick={() => deleteAllocMutation.mutate(allocation.id)}>
                        <Trash2 size={16} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* المشرفون */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <UserCog size={18} />
            <Typography variant="subtitle1" fontWeight={700}>الطاقة لكل مشرف</Typography>
          </Box>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>معرف حساب المشرف</TableCell>
                  <TableCell>الإشغال</TableCell>
                  <TableCell>السعة</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.supervisors.length === 0 && (
                  <TableRow><TableCell colSpan={4}><Typography color="text.secondary" sx={{ py: 2 }}>لا توجد قواعد مشرفين بعد.</Typography></TableCell></TableRow>
                )}
                {data.supervisors.map(({ allocation, occupancy }) => (
                  <TableRow key={allocation.id} hover>
                    <TableCell><Typography variant="caption">{allocation.scopeId}</Typography></TableCell>
                    <TableCell>
                      <Chip size="small" color={occupancyColor(occupancy.occupancyPercentage) as any} label={`${occupancy.occupied} / ${occupancy.capacity}`} />
                    </TableCell>
                    <TableCell>{allocation.totalCapacity}</TableCell>
                    <TableCell>
                      <IconButton size="small" color="error" onClick={() => deleteAllocMutation.mutate(allocation.id)}>
                        <Trash2 size={16} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      <Dialog open={openAllocDialog} onClose={() => setOpenAllocDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>قاعدة طاقة جديدة</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1 }}>
            <TextField select label="النطاق" size="small" value={allocForm.scopeType}
              onChange={(e) => setAllocForm({ ...allocForm, scopeType: e.target.value })}>
              <MenuItem value="specialty">تخصص</MenuItem>
              <MenuItem value="supervisor">مشرف</MenuItem>
              <MenuItem value="trainer">مدرب</MenuItem>
            </TextField>
            {allocForm.scopeType !== 'specialty' && (
              <TextField label="معرف الحساب (scopeId)" size="small" value={allocForm.scopeId}
                onChange={(e) => setAllocForm({ ...allocForm, scopeId: e.target.value })} />
            )}
            {allocForm.scopeType === 'specialty' && (
              <TextField label="رمز التخصص" size="small" value={allocForm.specialtyCode}
                onChange={(e) => setAllocForm({ ...allocForm, specialtyCode: e.target.value })} placeholder="internal_medicine" />
            )}
            <TextField select label="الجنس" size="small" value={allocForm.gender}
              onChange={(e) => setAllocForm({ ...allocForm, gender: e.target.value })}>
              <MenuItem value="">الكل</MenuItem>
              <MenuItem value="male">ذكور</MenuItem>
              <MenuItem value="female">إناث</MenuItem>
            </TextField>
            <TextField label="فترة التدريب" size="small" value={allocForm.trainingPeriod}
              onChange={(e) => setAllocForm({ ...allocForm, trainingPeriod: e.target.value })} placeholder="2026/2027" />
            <TextField label="السعة" type="number" size="small" value={allocForm.totalCapacity}
              onChange={(e) => setAllocForm({ ...allocForm, totalCapacity: Number(e.target.value) })} />
            <TextField label="ملاحظات" size="small" value={allocForm.notes}
              onChange={(e) => setAllocForm({ ...allocForm, notes: e.target.value })} sx={{ gridColumn: 'span 2' }} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAllocDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={() => upsertAllocMutation.mutate()} disabled={upsertAllocMutation.isPending}>
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HospitalCapacity;
