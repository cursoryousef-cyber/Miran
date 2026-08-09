import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader, DataPageShell, CardGrid, EmptyState, EntityCard, ViewToggle } from '../components/ui';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  XCircle, ArrowRightLeft, FileText, Edit3, PauseCircle, PlayCircle, AlertTriangle, Inbox, Clock3, CheckCircle2, FileWarning, Eye } from 'lucide-react';
import {
  Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions, Alert, CircularProgress,
  TextField, MenuItem, Select, FormControl, InputLabel, Tooltip,
} from '@mui/material';

const STATUS_LABELS: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
  allocated: { label: 'موزَّع — بانتظار المراجعة', color: 'info' },
  hospital_review: { label: 'قيد مراجعة المستشفى', color: 'warning' },
  on_hold: { label: 'موقوف مؤقتاً', color: 'default' },
  hospital_returned_to_cluster: { label: 'مُعاد للتجمع', color: 'error' },
  rejected: { label: 'مرفوض', color: 'error' },
  active: { label: 'نشط', color: 'success' },
};

const DOCUMENT_TYPES = [
  'national_id', 'internship_letter', 'academic_transcript', 'medical_examination',
  'vaccination_record', 'cpr_certificate', 'bls', 'acls', 'license', 'additional',
];

export const HospitalReview: React.FC = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const [dialog, setDialog] = useState<string | null>(null); // 'reject'|'return'|'docs'|'correction'|'assign'|'hold'
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [correctionFields, setCorrectionFields] = useState('');
  const [newDeptId, setNewDeptId] = useState('');
  const [newTrainerId, setNewTrainerId] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const orgId = user?.activeOrganization?.id;

  // Load departments with capacity and workspace trainers for assignment dialog
  const { data: capacityData } = useQuery({
    queryKey: ['hospital-capacity-breakdown', orgId],
    queryFn: async () => {
      const res = await apiClient.get(`/organizations/${orgId}/capacity`);
      return res.data;
    },
    enabled: !!orgId,
  });

  const { data: trainerCardsData } = useQuery({
    queryKey: ['trainer-cards-assignment', orgId],
    queryFn: async () => {
      const res = await apiClient.get('/trainers/workspace-cards');
      return res.data?.data || [];
    },
    enabled: !!orgId,
  });

  const departments: any[] = capacityData?.departments || [];
  const trainers: any[] = trainerCardsData || [];

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['hospital-review-trainees', orgId],
    queryFn: async () => {
      const res = await apiClient.get('/training-requests/hospital-review');
      return res.data;
    },
    enabled: !!orgId,
  });

  const rows: any[] = data?.data || [];

  const startReviewMut = useMutation({
    mutationFn: (rowId: string) =>
      apiClient.post(`/training-requests/trainees/${rowId}/hospital-review/start`),
    onSuccess: (res: any) => { qc.invalidateQueries({ queryKey: ['hospital-review-trainees'] }); setSuccessMsg(res.data?.message || 'بدأت المراجعة'); },
    onError: (err: any) => setErrorMsg(err.response?.data?.message || err.message),
  });

  const rejectMut = useMutation({
    mutationFn: () => apiClient.post(`/training-requests/trainees/${selectedRow?.id}/hospital-review/reject`, { reason, notes }),
    onSuccess: (res: any) => { qc.invalidateQueries({ queryKey: ['hospital-review-trainees'] }); setDialog(null); setSuccessMsg(res.data?.message); },
    onError: (err: any) => setErrorMsg(err.response?.data?.message || err.message),
  });

  const returnMut = useMutation({
    mutationFn: () => apiClient.post(`/training-requests/trainees/${selectedRow?.id}/hospital-review/return-to-cluster`, { reason, notes }),
    onSuccess: (res: any) => { qc.invalidateQueries({ queryKey: ['hospital-review-trainees'] }); setDialog(null); setSuccessMsg(res.data?.message); },
    onError: (err: any) => setErrorMsg(err.response?.data?.message || err.message),
  });

  const docsMut = useMutation({
    mutationFn: () => apiClient.post(`/training-requests/trainees/${selectedRow?.id}/hospital-review/request-documents`, { documentTypes: selectedDocs, notes }),
    onSuccess: (res: any) => { qc.invalidateQueries({ queryKey: ['hospital-review-trainees'] }); setDialog(null); setSuccessMsg(res.data?.message); },
    onError: (err: any) => setErrorMsg(err.response?.data?.message || err.message),
  });

  const correctionMut = useMutation({
    mutationFn: () => apiClient.post(`/training-requests/trainees/${selectedRow?.id}/hospital-review/request-correction`, { fields: correctionFields.split(',').map((f) => f.trim()).filter(Boolean), notes }),
    onSuccess: (res: any) => { qc.invalidateQueries({ queryKey: ['hospital-review-trainees'] }); setDialog(null); setSuccessMsg(res.data?.message); },
    onError: (err: any) => setErrorMsg(err.response?.data?.message || err.message),
  });

  const assignMut = useMutation({
    mutationFn: () => apiClient.patch(`/training-requests/trainees/${selectedRow?.id}/hospital-review/assignment`, {
      departmentId: newDeptId || undefined,
      trainerProfileId: newTrainerId || undefined,
      startDate: newStartDate || undefined,
      endDate: newEndDate || undefined,
      reason: notes,
    }),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['hospital-review-trainees'] });
      qc.invalidateQueries({ queryKey: ['hospital-capacity-breakdown'] });
      qc.invalidateQueries({ queryKey: ['hospital-capacity'] });
      qc.invalidateQueries({ queryKey: ['trainer-cards-assignment'] });
      qc.invalidateQueries({ queryKey: ['trainer-cards'] });
      qc.invalidateQueries({ queryKey: ['hospitals-cards'] });
      qc.invalidateQueries({ queryKey: ['rotations-departments'] });
      setDialog(null);
      setSuccessMsg(res.data?.message || 'تم إسناد المتدرب وتحديث سعة القسم والمدرب بنجاح');
    },
    onError: (err: any) => setErrorMsg(err.response?.data?.message || err.message),
  });

  const holdMut = useMutation({
    mutationFn: () => apiClient.post(`/training-requests/trainees/${selectedRow?.id}/hospital-review/hold`, { notes }),
    onSuccess: (res: any) => { qc.invalidateQueries({ queryKey: ['hospital-review-trainees'] }); setDialog(null); setSuccessMsg(res.data?.message); },
    onError: (err: any) => setErrorMsg(err.response?.data?.message || err.message),
  });

  const resumeMut = useMutation({
    mutationFn: (rowId: string) => apiClient.post(`/training-requests/trainees/${rowId}/hospital-review/resume`),
    onSuccess: (res: any) => { qc.invalidateQueries({ queryKey: ['hospital-review-trainees'] }); setSuccessMsg(res.data?.message); },
    onError: (err: any) => setErrorMsg(err.response?.data?.message || err.message),
  });

  const openDialog = (row: any, type: string) => {
    setSelectedRow(row);
    setReason('');
    setNotes('');
    setSelectedDocs([]);
    setCorrectionFields('');
    setNewDeptId('');
    setNewTrainerId('');
    setNewStartDate('');
    setNewEndDate('');
    setDialog(type);
  };

  const pendingRows = rows.filter((r: any) => ['allocated', 'hospital_review'].includes(r.status)).length;
  const onHold = rows.filter((r: any) => r.status === 'on_hold').length;
  const acceptedRows = rows.filter((r: any) => ['accepted', 'active', 'cluster_approved'].includes(r.status)).length;
  const rejectedRows = rows.filter((r: any) => ['rejected', 'returned'].includes(r.status)).length;
  const missingDocs = rows.filter((r: any) => (r.requiredDocuments?.length ?? 0) > 0).length;

  return (
    <DataPageShell
        title="المتدربون الموزعون للمستشفى (Hospital Allocated Trainees)"
        subtitle={<>{user?.activeOrganization?.nameAr} — إسناد المتدربين الموزَّعين للأقسام والمدربين وإدارة التوزيع الداخلي</>}
        loading={isLoading}
        stats={[
          { label: 'إجمالي الصفوف', value: rows.length, icon: Inbox, tone: 'primary' },
          { label: 'بانتظار المراجعة', value: pendingRows, icon: Clock3, tone: pendingRows ? 'warning' : 'success' },
          { label: 'مقبولون', value: acceptedRows, icon: CheckCircle2, tone: 'success' },
          { label: 'معلّقون', value: onHold, icon: PauseCircle, tone: onHold ? 'warning' : 'neutral' },
          { label: 'مرفوضون/مُعادون', value: rejectedRows, icon: XCircle, tone: rejectedRows ? 'danger' : 'neutral' },
          { label: 'تنتظر مستندات', value: missingDocs, icon: FileWarning, tone: missingDocs ? 'warning' : 'neutral' },
        ]}
    >
      <div style={{ marginBottom: '16px' }}><ViewToggle value={view} onChange={setView} /></div>

      {successMsg && <Alert severity="success" onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}
      {errorMsg && <Alert severity="error" onClose={() => setErrorMsg(null)}>{errorMsg}</Alert>}

      {view === 'cards' ? (
        (rows).length === 0 ? (
          <div className="glass-card"><EmptyState icon={Inbox} title="لا توجد طلبات تدريب واردة للمراجعة حالياً" hint="سيتم ظهور الطلبات المحالة من التجمع الصحي تلقائياً فور إرسالها." /></div>
        ) : (
          <CardGrid>
            {rows.map((row: any) => {
              const st = STATUS_LABELS[row.status] || { label: row.status };
              const req = row.trainingRequest;
              const specialtyName = row.specialty || req?.specialtyAr || req?.specialtyEn || 'غير محدد';
              const sourceOrgName = req?.sourceOrg?.nameAr || 'التجمع الصحي';
              const start = row.startDate || req?.trainingStartDate || req?.startDate;
              const end = row.endDate || req?.trainingEndDate || req?.endDate;
              const periodText = start && end
                ? `${String(start).slice(0, 10)} → ${String(end).slice(0, 10)}`
                : 'غير محددة';

              return (
                <EntityCard
                  key={row.id}
                  avatarText={(row.nameAr ?? '?').slice(0, 2)}
                  tone={row.status === 'on_hold' ? 'warning' : row.status === 'rejected' ? 'danger' : 'primary'}
                  title={row.nameAr}
                  subtitle={`الرقم: ${row.nationalId ?? '—'} · الجهة: ${sourceOrgName}`}
                  badges={[
                    { label: st.label, tone: row.status === 'on_hold' ? 'warning' : row.status === 'rejected' ? 'danger' : 'info' },
                    { label: `التخصص: ${specialtyName}`, tone: 'success' as const },
                    ...(req?.studentCount || req?.totalTraineesRequested || 1 ? [{ label: `عدد المطلوبين بالطلب: ${req.totalTraineesRequested}`, tone: 'violet' as const }] : []),
                  ]}
                  metrics={[
                    { label: 'القسم السريري', value: row.assignedDepartment?.nameAr ?? 'غير محدد', tone: 'info' },
                    { label: 'المدرب السريري', value: row.assignedTrainer?.person?.nameAr ?? 'غير محدد', tone: 'violet' },
                  ]}
                  footnote={`رقم الطلب: ${req?.requestNumber ?? '—'} · الفترة: ${periodText}`}
                  actions={[
                    ...(row.status === 'allocated' ? [{
                      label: 'بدء المراجعة والقبول', icon: PlayCircle, tone: 'info' as const,
                      onClick: () => startReviewMut.mutate(row.id),
                    }] : []),
                    ...(['allocated', 'hospital_review', 'on_hold', 'accepted'].includes(row.status) ? [{
                      label: 'توزيع قسم/مدرب', icon: Edit3, tone: 'success' as const,
                      onClick: () => openDialog(row, 'assign'),
                    }] : []),
                    ...(['hospital_review', 'allocated'].includes(row.status) ? [{
                      label: 'رفض', icon: XCircle, tone: 'danger' as const,
                      onClick: () => openDialog(row, 'reject'),
                    }] : []),
                    { label: 'عرض التفاصيل', icon: Eye, tone: 'neutral' as const, onClick: () => openDialog(row, 'details') },
                  ]}
                />
              );
            })}
          </CardGrid>
        )
      ) : (
      <TableContainer component={Paper} className="glass-card">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>المتدرب والجهة</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>التخصص والفترة</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>الطلب والعدد</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>التوزيع الحالي (قسم/مدرب)</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>الحالة</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700, textAlign: 'center' }}>الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} align="center"><CircularProgress size={24} /></TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center" style={{ color: '#64748B', padding: '32px' }}>لا توجد طلبات تدريب واردة للمراجعة حالياً</TableCell></TableRow>
            ) : (
              rows.map((row: any) => {
                const st = STATUS_LABELS[row.status] || { label: row.status, color: 'default' as const };
                const req = row.trainingRequest;
                const specialtyName = row.specialty || req?.specialtyAr || req?.specialtyEn || 'غير محدد';
                const sourceOrgName = req?.sourceOrg?.nameAr || 'التجمع الصحي';
                const periodText = req?.startDate && req?.endDate
                  ? `${String(req.startDate).slice(0, 10)} → ${String(req.endDate).slice(0, 10)}`
                  : 'غير محددة';

                return (
                  <TableRow key={row.id}>
                    <TableCell style={{ fontWeight: 700, color: '#0F172A' }}>
                      {row.nameAr}
                      <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>{row.nationalId || '—'}</div>
                      <div style={{ fontSize: '11px', color: '#0891B2' }}>{sourceOrgName}</div>
                    </TableCell>
                    <TableCell style={{ fontSize: '12px' }}>
                      <div style={{ fontWeight: 700, color: '#047857' }}>{specialtyName}</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>{periodText}</div>
                    </TableCell>
                    <TableCell style={{ fontSize: '12px' }}>
                      <div style={{ fontFamily: 'monospace', color: '#0284C7', fontWeight: 700 }}>{req?.requestNumber || '—'}</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>المطلوب بالطلب: {req?.studentCount || req?.totalTraineesRequested || 1 || 1} متدرب</div>
                    </TableCell>
                    <TableCell style={{ fontSize: '12px' }}>
                      <div style={{ color: '#0284C7', fontWeight: 700 }}>{row.assignedDepartment?.nameAr || 'غير محدد'}</div>
                      <div style={{ color: '#059669' }}>{row.assignedTrainer?.person?.nameAr || 'غير محدد'}</div>
                    </TableCell>
                    <TableCell>
                      <Chip label={st.label} color={st.color} size="small" style={{ fontWeight: 700 }} />
                    </TableCell>
                    <TableCell>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <Tooltip title="عرض التفاصيل">
                          <Button size="small" variant="outlined" style={{ borderColor: '#64748B', color: '#64748B', minWidth: 0, padding: '4px 8px' }}
                            onClick={() => openDialog(row, 'details')}>
                            <Eye size={14} />
                          </Button>
                        </Tooltip>
                        {row.status === 'allocated' && (
                          <Tooltip title="بدء المراجعة والقبول">
                            <Button size="small" variant="contained" style={{ background: '#0284c7', minWidth: 0, padding: '4px 8px' }}
                              onClick={() => startReviewMut.mutate(row.id)} disabled={startReviewMut.isPending}>
                              <PlayCircle size={14} />
                            </Button>
                          </Tooltip>
                        )}
                        {['allocated', 'hospital_review', 'on_hold', 'accepted'].includes(row.status) && (
                          <Tooltip title="توزيع على القسم والمدرب">
                            <Button size="small" variant="contained" style={{ background: '#059669', minWidth: 0, padding: '4px 8px' }}
                              onClick={() => openDialog(row, 'assign')}>
                              <Edit3 size={14} />
                            </Button>
                          </Tooltip>
                        )}
                        {['allocated', 'hospital_review', 'on_hold'].includes(row.status) && (
                          <>
                            <Tooltip title="طلب مستندات">
                              <Button size="small" variant="outlined" style={{ borderColor: '#0891B2', color: '#0891B2', minWidth: 0, padding: '4px 8px' }}
                                onClick={() => openDialog(row, 'docs')}>
                                <FileText size={14} />
                              </Button>
                            </Tooltip>
                            <Tooltip title="إعادة للتجمع">
                              <Button size="small" variant="outlined" style={{ borderColor: '#D97706', color: '#D97706', minWidth: 0, padding: '4px 8px' }}
                                onClick={() => openDialog(row, 'return')}>
                                <ArrowRightLeft size={14} />
                              </Button>
                            </Tooltip>
                            <Tooltip title="رفض نهائي">
                              <Button size="small" variant="outlined" color="error" style={{ minWidth: 0, padding: '4px 8px' }}
                                onClick={() => openDialog(row, 'reject')}>
                                <XCircle size={14} />
                              </Button>
                            </Tooltip>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
      )}

      {/* Details Dialog */}
      <Dialog open={dialog === 'details'} onClose={() => setDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle style={{ fontWeight: 800 }}>تفاصيل طلب التدريب الوارد</DialogTitle>
        <DialogContent style={{ paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {selectedRow && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
              <div><strong>اسم المتدرب:</strong> {selectedRow.nameAr}</div>
              <div><strong>الرقم الهوية / الوظيفي:</strong> {selectedRow.nationalId || '—'}</div>
              <div><strong>التخصص التدريبي:</strong> {selectedRow.specialty || selectedRow.trainingRequest?.specialtyAr || '—'}</div>
              <div><strong>الجهة / التجمع المرسل:</strong> {selectedRow.trainingRequest?.sourceOrg?.nameAr || '—'}</div>
              <div><strong>رقم الطلب:</strong> {selectedRow.trainingRequest?.requestNumber || '—'}</div>
              <div><strong>عدد المتدربين المطلوبين بالطلب:</strong> {selectedRow.trainingRequest?.totalTraineesRequested || 1}</div>
              <div><strong>الفترة المطلوبة:</strong> {(selectedRow.startDate || selectedRow.trainingRequest?.trainingStartDate || selectedRow.trainingRequest?.startDate) ? `${String(selectedRow.startDate || selectedRow.trainingRequest?.trainingStartDate || selectedRow.trainingRequest?.startDate).slice(0, 10)} إلى ${String(selectedRow.endDate || selectedRow.trainingRequest?.trainingEndDate || selectedRow.trainingRequest?.endDate).slice(0, 10)}` : 'غير محددة'}</div>
              <div><strong>تاريخ تقديم الطلب:</strong> {selectedRow.trainingRequest?.createdAt ? String(selectedRow.trainingRequest.createdAt).slice(0, 10) : '—'}</div>
              <div><strong>القسم المحدد بالطلب:</strong> {selectedRow.assignedDepartment?.nameAr || 'لم يحدد بعد'}</div>
              <div><strong>المدرب المحدد بالطلب:</strong> {selectedRow.assignedTrainer?.person?.nameAr || 'لم يحدد بعد'}</div>
              <div><strong>الحالة الحالية:</strong> {STATUS_LABELS[selectedRow.status]?.label || selectedRow.status}</div>
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={dialog === 'reject'} onClose={() => setDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle style={{ fontWeight: 800, color: '#DC2626' }}>رفض طلب التدريب</DialogTitle>
        <DialogContent style={{ paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Alert severity="warning">المتدرب: <strong>{selectedRow?.nameAr}</strong> — سيتم إخطار التجمع والجامعة بالرفض مع بيان السبب.</Alert>
          <TextField label="سبب الرفض *" value={reason} onChange={(e) => setReason(e.target.value)} fullWidth required multiline rows={2} size="small" />
          <TextField label="ملاحظات إضافية" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth multiline rows={2} size="small" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>إلغاء</Button>
          <Button variant="contained" color="error" onClick={() => rejectMut.mutate()} disabled={rejectMut.isPending || !reason}>
            {rejectMut.isPending ? <CircularProgress size={20} color="inherit" /> : 'تأكيد الرفض'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Return to Cluster Dialog */}
      <Dialog open={dialog === 'return'} onClose={() => setDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle style={{ fontWeight: 800 }}>إعادة المتدرب للتجمع لإعادة التوزيع</DialogTitle>
        <DialogContent style={{ paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Alert severity="info">المتدرب: <strong>{selectedRow?.nameAr}</strong></Alert>
          <TextField label="سبب الإعادة للتجمع *" value={reason} onChange={(e) => setReason(e.target.value)} fullWidth required multiline rows={2} size="small" />
          <TextField label="ملاحظات" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth multiline rows={2} size="small" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>إلغاء</Button>
          <Button variant="contained" style={{ background: '#D97706' }} onClick={() => returnMut.mutate()} disabled={returnMut.isPending || !reason}>
            {returnMut.isPending ? <CircularProgress size={20} color="inherit" /> : 'إعادة للتجمع'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Request Missing Documents Dialog */}
      <Dialog open={dialog === 'docs'} onClose={() => setDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle style={{ fontWeight: 800 }}>طلب مستندات ناقصة</DialogTitle>
        <DialogContent style={{ paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Alert severity="info">المتدرب: <strong>{selectedRow?.nameAr}</strong></Alert>
          <FormControl fullWidth size="small">
            <InputLabel>أنواع المستندات المطلوبة</InputLabel>
            <Select
              multiple
              value={selectedDocs}
              onChange={(e) => setSelectedDocs(e.target.value as string[])}
              label="أنواع المستندات المطلوبة"
              renderValue={(selected) => (selected as string[]).join('، ')}
            >
              {DOCUMENT_TYPES.map((t) => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField label="ملاحظات" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth multiline rows={2} size="small" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>إلغاء</Button>
          <Button variant="contained" onClick={() => docsMut.mutate()} disabled={docsMut.isPending || selectedDocs.length === 0}>
            {docsMut.isPending ? <CircularProgress size={20} color="inherit" /> : 'إرسال الطلب'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Request Data Correction Dialog */}
      <Dialog open={dialog === 'correction'} onClose={() => setDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle style={{ fontWeight: 800 }}>طلب تصحيح بيانات</DialogTitle>
        <DialogContent style={{ paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Alert severity="info">المتدرب: <strong>{selectedRow?.nameAr}</strong></Alert>
          <TextField
            label="الحقول المطلوب تصحيحها (مفصولة بفاصلة)"
            value={correctionFields}
            onChange={(e) => setCorrectionFields(e.target.value)}
            fullWidth
            size="small"
            helperText="مثال: nameAr, email, specialty"
          />
          <TextField label="وصف التصحيح المطلوب" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth multiline rows={2} size="small" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>إلغاء</Button>
          <Button variant="contained" onClick={() => correctionMut.mutate()} disabled={correctionMut.isPending || !correctionFields}>
            {correctionMut.isPending ? <CircularProgress size={20} color="inherit" /> : 'إرسال طلب التصحيح'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change / Confirm Assignment Dialog */}
      <Dialog open={dialog === 'assign'} onClose={() => setDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle style={{ fontWeight: 800 }}>توزيع المتدرب على القسم والمدرب والفترة التدريبية</DialogTitle>
        <DialogContent style={{ paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Alert severity="info">
            المتدرب: <strong>{selectedRow?.nameAr}</strong> — يتم التحقق تلقائياً من سعة القسم والمقاعد المتاحة.
          </Alert>
          <FormControl fullWidth size="small">
            <InputLabel>القسم السريري المستهدف *</InputLabel>
            <Select value={newDeptId} onChange={(e) => setNewDeptId(e.target.value)} label="القسم السريري المستهدف *">
              <MenuItem value="">— اختر القسم —</MenuItem>
              {departments.map((d: any) => {
                const cap = d.occupancy?.capacity ?? d.capacity ?? 0;
                const occ = d.occupancy?.occupied ?? 0;
                const avail = d.occupancy?.available ?? Math.max(0, cap - occ);
                const isFull = avail <= 0;
                return (
                  <MenuItem key={d.id} value={d.id} disabled={isFull}>
                    {d.nameAr} — السعة: {cap} | المشغول: {occ} | المتاح: {avail} مقعد {isFull ? '(ممتلئ)' : ''}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel>المدرب السريري</InputLabel>
            <Select value={newTrainerId} onChange={(e) => setNewTrainerId(e.target.value)} label="المدرب السريري">
              <MenuItem value="">— اختر المدرب —</MenuItem>
              {trainers.map((t: any) => {
                const isUnqualified = !t.isActive;
                const isOnLeave = Boolean(t.onLeave);
                const isFull = (t.available ?? 0) <= 0;
                const isDisabled = isUnqualified || isOnLeave || isFull;

                let hint = `(المتاح: ${t.available ?? 0} من ${t.maxTrainees ?? 5})`;
                if (isUnqualified) hint = '(غير مؤهل للتدريب)';
                else if (isOnLeave) hint = '(في إجازة حالياً)';
                else if (isFull) hint = '(وصل لأقصى سعة)';

                return (
                  <MenuItem key={t.id} value={t.id} disabled={isDisabled}>
                    {t.nameAr} {t.department?.nameAr ? `(${t.department.nameAr})` : ''} — {hint}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
          <TextField type="date" label="تاريخ بداية الفترة التدريبية" value={newStartDate} onChange={(e) => setNewStartDate(e.target.value)} fullWidth size="small" InputLabelProps={{ shrink: true }} />
          <TextField type="date" label="تاريخ نهاية الفترة التدريبية" value={newEndDate} onChange={(e) => setNewEndDate(e.target.value)} fullWidth size="small" InputLabelProps={{ shrink: true }} />
          <TextField label="ملاحظات التوزيع" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth size="small" multiline rows={2} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>إلغاء</Button>
          <Button
            variant="contained"
            style={{ background: '#0F766E' }}
            onClick={() => assignMut.mutate()}
            disabled={assignMut.isPending || !newDeptId}
          >
            {assignMut.isPending ? <CircularProgress size={20} color="inherit" /> : 'تأكيد التوزيع على القسم والمدرب'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Put On Hold Dialog */}
      <Dialog open={dialog === 'hold'} onClose={() => setDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle style={{ fontWeight: 800 }}>إيقاف المراجعة مؤقتاً</DialogTitle>
        <DialogContent style={{ paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Alert severity="warning">المتدرب: <strong>{selectedRow?.nameAr}</strong> — سيتم تعليق المراجعة.</Alert>
          <TextField label="سبب الإيقاف المؤقت" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth multiline rows={2} size="small" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>إلغاء</Button>
          <Button variant="contained" style={{ background: '#64748b' }} onClick={() => holdMut.mutate()} disabled={holdMut.isPending}>
            {holdMut.isPending ? <CircularProgress size={20} /> : 'تأكيد الإيقاف المؤقت'}
          </Button>
        </DialogActions>
      </Dialog>
    </DataPageShell>
  );
};

export default HospitalReview;
