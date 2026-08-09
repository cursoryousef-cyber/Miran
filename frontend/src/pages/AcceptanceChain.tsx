import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader, DataPageShell, CardGrid, EmptyState, EntityCard, ViewToggle } from '../components/ui';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  CheckCircle2, XCircle, ArrowRightLeft, RefreshCw, Clock3, Inbox,
  FileText, ShieldCheck, UserCheck, AlertTriangle, Eye, Search, Filter, Layers,
} from 'lucide-react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions, Button, CircularProgress,
  TextField, MenuItem, Tooltip, IconButton, Box, Typography, Stepper, Step, StepLabel,
} from '@mui/material';

const STATUS_LABELS: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default'; stepIndex: number }> = {
  allocated: { label: 'مرسل من التجمع — بانتظار بدء المراجعة', color: 'info', stepIndex: 0 },
  submitted: { label: 'مرسل من التجمع', color: 'info', stepIndex: 0 },
  cluster_approved: { label: 'معتمد من التجمع — محال للمستشفى', color: 'info', stepIndex: 0 },
  hospital_review: { label: 'قيد مراجعة المستشفى', color: 'warning', stepIndex: 1 },
  documents_requested: { label: 'تنتظر مستندات من التجمع/الجامعة', color: 'info', stepIndex: 1 },
  correction_requested: { label: 'تنتظر تصحيح بيانات', color: 'warning', stepIndex: 1 },
  on_hold: { label: 'موقوف مؤقتاً', color: 'default', stepIndex: 1 },
  accepted: { label: 'مقبول بالمستشفى', color: 'success', stepIndex: 3 },
  active: { label: 'نشط ومسجل بالتدريب', color: 'success', stepIndex: 3 },
  rejected: { label: 'مرفوض نهائياً', color: 'error', stepIndex: -1 },
  hospital_returned_to_cluster: { label: 'مُعاد للتجمع لإعادة التوزيع', color: 'error', stepIndex: -1 },
  returned: { label: 'مُعاد للتجمع', color: 'error', stepIndex: -1 },
};

const WORKFLOW_STEPS = [
  'إرسال التجمع',
  'مراجعة المستشفى',
  'توزيع القسم والمدرب',
  'القبول والاعتماد النهائي',
];

export const AcceptanceChain: React.FC = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const orgId = user?.activeOrganization?.id;

  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  const [view, setView] = useState<'cards' | 'table'>('table');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['acceptance-chain-trainees', orgId],
    queryFn: async () => {
      const res = await apiClient.get('/training-requests/hospital-review');
      return res.data;
    },
    enabled: !!orgId,
    refetchInterval: 30000,
  });

  const rows: any[] = data?.data || [];

  const filteredRows = useMemo(() => {
    const needle = search.trim();
    return rows.filter((r: any) => {
      const req = r.trainingRequest;
      const matchesSearch =
        !needle ||
        `${r.nameAr ?? ''} ${r.nationalId ?? ''} ${req?.requestNumber ?? ''} ${r.specialty ?? ''}`.includes(needle);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'pending' && ['allocated', 'submitted', 'cluster_approved', 'hospital_review'].includes(r.status)) ||
        (statusFilter === 'assigned' && Boolean(r.assignedDepartmentId || r.assignedTrainerProfileId)) ||
        (statusFilter === 'accepted' && ['accepted', 'active'].includes(r.status)) ||
        (statusFilter === 'rejected' && ['rejected', 'returned', 'hospital_returned_to_cluster'].includes(r.status));
      return matchesSearch && matchesStatus;
    });
  }, [rows, search, statusFilter]);

  const pendingCount = rows.filter((r: any) => ['allocated', 'submitted', 'cluster_approved', 'hospital_review'].includes(r.status)).length;
  const assignedCount = rows.filter((r: any) => Boolean(r.assignedDepartmentId || r.assignedTrainerProfileId)).length;
  const acceptedCount = rows.filter((r: any) => ['accepted', 'active'].includes(r.status)).length;
  const rejectedCount = rows.filter((r: any) => ['rejected', 'returned', 'hospital_returned_to_cluster'].includes(r.status)).length;

  return (
    <DataPageShell
      title="سلسلة القبول ومتابعة مسار الطلبات (Acceptance Chain & Request Progress)"
      subtitle={`${user?.activeOrganization?.nameAr ?? 'المستشفى'} — متابعة مباشرة وحية لتقدم طلبات التدريب المحالة من التجمع الصحي من momento الإرسال وحتى القرار النهائي`}
      loading={isLoading}
      actions={
        <Tooltip title="تحديث البيانات">
          <IconButton onClick={() => refetch()} style={{ color: '#0F766E', border: '1px solid rgba(15,118,110,0.3)' }}>
            <RefreshCw size={18} />
          </IconButton>
        </Tooltip>
      }
      stats={[
        { label: 'إجمالي الطلبات المسجلة', value: rows.length, icon: Layers, tone: 'primary' },
        { label: 'بانتظار المراجعة', value: pendingCount, icon: Clock3, tone: pendingCount ? 'warning' : 'success' },
        { label: 'تم التوزيع (قسم/مدرب)', value: assignedCount, icon: UserCheck, tone: 'info' },
        { label: 'مقبولون ومسجلون', value: acceptedCount, icon: CheckCircle2, tone: 'success' },
        { label: 'مرفوضون / مُعادون', value: rejectedCount, icon: XCircle, tone: rejectedCount ? 'danger' : 'neutral' },
      ]}
      toolbar={
        <>
          <TextField
            size="small"
            placeholder="بحث باسم المتدرب، الرقم الوظيفي، أو رقم الطلب..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <Search size={16} style={{ marginLeft: 8, color: '#64748B' }} /> }}
            sx={{ minWidth: 260 }}
          />
          <TextField
            size="small"
            select
            label="تصفية حسب مرحلة التوزيع"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="all">جميع المراحل والحالات</MenuItem>
            <MenuItem value="pending">بانتظار مراجعة المستشفى</MenuItem>
            <MenuItem value="assigned">موزَّع على قسم أو مدرب</MenuItem>
            <MenuItem value="accepted">مقبول ومستلم نهائياً</MenuItem>
            <MenuItem value="rejected">مرفوض أو مُعاد للتجمع</MenuItem>
          </TextField>
          <ViewToggle value={view} onChange={setView} />
        </>
      }
    >
      {filteredRows.length === 0 ? (
        <Paper className="glass-card" sx={{ p: 4 }}>
          <EmptyState
            icon={ShieldCheck}
            title="لا توجد طلبات في سلسلة القبول تطابق البحث"
            hint="يظهر هنا مسار وتقدم الطلبات المحالة من التجمع الصحي تلقائياً."
          />
        </Paper>
      ) : view === 'cards' ? (
        <CardGrid min={350}>
          {filteredRows.map((row: any) => {
            const st = STATUS_LABELS[row.status] || { label: row.status, color: 'default' as const, stepIndex: 1 };
            const req = row.trainingRequest;
            const specialtyName = row.specialty || req?.specialtyAr || req?.specialtyEn || 'غير محدد';
            const sourceOrgName = req?.sourceOrg?.nameAr || 'التجمع الصحي';
            const start = row.startDate || req?.trainingStartDate || req?.startDate;
            const end = row.endDate || req?.trainingEndDate || req?.endDate;
            const periodText = start && end ? `${String(start).slice(0, 10)} → ${String(end).slice(0, 10)}` : 'غير محددة';
            const requestDateText = req?.createdAt ? String(req.createdAt).slice(0, 10) : '—';

            let currentStepIndex = st.stepIndex;
            if (row.assignedDepartmentId && row.assignedTrainerProfileId && currentStepIndex < 2) {
              currentStepIndex = 2;
            }

            return (
              <EntityCard
                key={row.id}
                icon={UserCheck}
                tone={row.status === 'accepted' || row.status === 'active' ? 'success' : row.status === 'rejected' || row.status === 'hospital_returned_to_cluster' ? 'danger' : 'info'}
                title={row.nameAr}
                subtitle={`الهوية/الرقم: ${row.nationalId ?? '—'} · الجهة: ${sourceOrgName}`}
                badges={[
                  { label: st.label, tone: st.color === 'success' ? 'success' : st.color === 'error' ? 'danger' : st.color === 'warning' ? 'warning' : 'info' },
                  { label: `التخصص: ${specialtyName}`, tone: 'success' },
                ]}
                metrics={[
                  { label: 'القسم السريري', value: row.assignedDepartment?.nameAr ?? 'لم يحدد بعد', tone: row.assignedDepartment ? 'info' : 'neutral' },
                  { label: 'المدرب السريري', value: row.assignedTrainer?.person?.nameAr ?? 'لم يحدد بعد', tone: row.assignedTrainer ? 'success' : 'neutral' },
                ]}
                footnote={`رقم الطلب: ${req?.requestNumber ?? '—'} · تاريخ الطلب: ${requestDateText} · الفترة: ${periodText}`}
                actions={[
                  { label: 'عرض تفاصيل ومسار القبول', icon: Eye, tone: 'info', onClick: () => setSelectedRow(row) },
                ]}
              >
                <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid #E2E8F0' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ mb: 1, display: 'block' }}>
                    تقدم الطلب عبر سلسلة القبول:
                  </Typography>
                  <Stepper activeStep={currentStepIndex < 0 ? 0 : currentStepIndex} alternativeLabel>
                    {WORKFLOW_STEPS.map((label, idx) => (
                      <Step key={label} completed={currentStepIndex >= 0 && currentStepIndex > idx}>
                        <StepLabel
                          error={currentStepIndex < 0 && idx === 0}
                          optional={
                            currentStepIndex < 0 && idx === 0 ? (
                              <Typography variant="caption" color="error">مرفوض/مُعاد</Typography>
                            ) : undefined
                          }
                        >
                          <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 700 }}>
                            {label}
                          </Typography>
                        </StepLabel>
                      </Step>
                    ))}
                  </Stepper>
                </Box>
              </EntityCard>
            );
          })}
        </CardGrid>
      ) : (
        <TableContainer component={Paper} className="glass-card">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell style={{ fontWeight: 700, color: '#475569' }}>المتدرب / التخصص</TableCell>
                <TableCell style={{ fontWeight: 700, color: '#475569' }}>الجهة والتاريخ</TableCell>
                <TableCell style={{ fontWeight: 700, color: '#475569' }}>فترة التدريب</TableCell>
                <TableCell style={{ fontWeight: 700, color: '#475569' }}>القسم والمدرب المخصصين</TableCell>
                <TableCell style={{ fontWeight: 700, color: '#475569' }}>الحالة في سلسلة القبول</TableCell>
                <TableCell style={{ fontWeight: 700, color: '#475569', textAlign: 'center' }}>متابعة المسار</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRows.map((row: any) => {
                const st = STATUS_LABELS[row.status] || { label: row.status, color: 'default' as const };
                const req = row.trainingRequest;
                const specialtyName = row.specialty || req?.specialtyAr || req?.specialtyEn || 'غير محدد';
                const sourceOrgName = req?.sourceOrg?.nameAr || 'التجمع الصحي';
                const start = row.startDate || req?.trainingStartDate || req?.startDate;
                const end = row.endDate || req?.trainingEndDate || req?.endDate;
                const periodText = start && end ? `${String(start).slice(0, 10)} → ${String(end).slice(0, 10)}` : 'غير محددة';
                const requestDateText = req?.createdAt ? String(req.createdAt).slice(0, 10) : '—';

                return (
                  <TableRow key={row.id} hover>
                    <TableCell>
                      <Typography fontWeight={700} variant="body2">{row.nameAr}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontFamily: 'monospace' }}>
                        {row.nationalId || '—'}
                      </Typography>
                      <Chip size="small" label={specialtyName} color="success" variant="outlined" sx={{ mt: 0.5, fontSize: 11 }} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} style={{ color: '#0891B2' }}>{sourceOrgName}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        رقم الطلب: {req?.requestNumber || '—'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        تاريخ الطلب: {requestDateText}
                      </Typography>
                    </TableCell>
                    <TableCell style={{ fontSize: '12px' }}>
                      <Typography variant="body2">{periodText}</Typography>
                    </TableCell>
                    <TableCell style={{ fontSize: '12px' }}>
                      <Typography variant="body2" fontWeight={700} style={{ color: '#0284C7' }}>
                        {row.assignedDepartment?.nameAr || '— لم يحدد —'}
                      </Typography>
                      <Typography variant="caption" style={{ color: '#059669', display: 'block' }}>
                        المدرب: {row.assignedTrainer?.person?.nameAr || '— لم يحدد —'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={st.label} color={st.color} size="small" style={{ fontWeight: 700 }} />
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Eye size={14} />}
                        onClick={() => setSelectedRow(row)}
                        sx={{ borderColor: '#0F766E', color: '#0F766E', '&:hover': { backgroundColor: 'rgba(15,118,110,0.08)' } }}
                      >
                        تفاصيل المسار
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* دايالوج تفاصيل ومسار سلسلة القبول */}
      <Dialog open={Boolean(selectedRow)} onClose={() => setSelectedRow(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, borderBottom: '1px solid #E2E8F0', pb: 1.5 }}>
          تفاصيل مسار القبول للمتدرب — {selectedRow?.nameAr}
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          {selectedRow && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ p: 2, borderRadius: 2, backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <Typography variant="subtitle2" fontWeight={700} color="primary" sx={{ mb: 1 }}>
                  مؤشر تقدم الطلب عبر مراحل سلسلة القبول:
                </Typography>
                {(() => {
                  const st = STATUS_LABELS[selectedRow.status] || { stepIndex: 1 };
                  let stepIdx = st.stepIndex;
                  if (selectedRow.assignedDepartmentId && selectedRow.assignedTrainerProfileId && stepIdx < 2) {
                    stepIdx = 2;
                  }
                  return (
                    <Stepper activeStep={stepIdx < 0 ? 0 : stepIdx} alternativeLabel>
                      {WORKFLOW_STEPS.map((label, idx) => (
                        <Step key={label} completed={stepIdx >= 0 && stepIdx > idx}>
                          <StepLabel error={stepIdx < 0 && idx === 0}>
                            <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 700 }}>
                              {label}
                            </Typography>
                          </StepLabel>
                        </Step>
                      ))}
                    </Stepper>
                  );
                })()}
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, fontSize: 13 }}>
                <div><strong>اسم المتدرب:</strong> {selectedRow.nameAr}</div>
                <div><strong>رقم الهوية / الرقم الوظيفي:</strong> {selectedRow.nationalId || '—'}</div>
                <div><strong>التخصص التدريبي:</strong> {selectedRow.specialty || selectedRow.trainingRequest?.specialtyAr || '—'}</div>
                <div><strong>الجهة المرسلة:</strong> {selectedRow.trainingRequest?.sourceOrg?.nameAr || 'التجمع الصحي'}</div>
                <div><strong>رقم الطلب:</strong> {selectedRow.trainingRequest?.requestNumber || '—'}</div>
                <div><strong>تاريخ الطلب:</strong> {selectedRow.trainingRequest?.createdAt ? String(selectedRow.trainingRequest.createdAt).slice(0, 10) : '—'}</div>
                <div><strong>القسم السريري المسند:</strong> {selectedRow.assignedDepartment?.nameAr || 'لم يحدد بعد'}</div>
                <div><strong>المدرب السريري المسند:</strong> {selectedRow.assignedTrainer?.person?.nameAr || 'لم يحدد بعد'}</div>
                <div style={{ gridColumn: 'span 2' }}>
                  <strong>فترة التدريب:</strong>{' '}
                  {(selectedRow.startDate || selectedRow.trainingRequest?.trainingStartDate || selectedRow.trainingRequest?.startDate)
                    ? `${String(selectedRow.startDate || selectedRow.trainingRequest?.trainingStartDate || selectedRow.trainingRequest?.startDate).slice(0, 10)} إلى ${String(selectedRow.endDate || selectedRow.trainingRequest?.trainingEndDate || selectedRow.trainingRequest?.endDate).slice(0, 10)}`
                    : 'غير محددة'}
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <strong>الحالة الحالية في سلسلة القبول:</strong>{' '}
                  <Chip
                    size="small"
                    label={STATUS_LABELS[selectedRow.status]?.label || selectedRow.status}
                    color={STATUS_LABELS[selectedRow.status]?.color || 'default'}
                    sx={{ fontWeight: 700 }}
                  />
                </div>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedRow(null)} color="inherit">إغلاق</Button>
        </DialogActions>
      </Dialog>
    </DataPageShell>
  );
};

export default AcceptanceChain;
