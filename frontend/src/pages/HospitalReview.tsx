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

  // Load departments and trainers for assignment dialog
  const { data: deptData } = useQuery({
    queryKey: ['org-departments', orgId],
    queryFn: async () => {
      const res = await apiClient.get('/org-members/departments');
      return res.data?.data || [];
    },
    enabled: !!orgId,
  });

  const { data: trainerData } = useQuery({
    queryKey: ['org-trainers', orgId],
    queryFn: async () => {
      const res = await apiClient.get('/org-members', { params: { role: 'trainer' } });
      return res.data?.data || [];
    },
    enabled: !!orgId,
  });

  const departments: any[] = deptData || [];
  const trainers: any[] = trainerData || [];

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['hospital-review-trainees', orgId],
    queryFn: async () => {
      const res = await apiClient.get('/training-requests/hospital-review');
      return res.data;
    },
    enabled: !!orgId,
  });

  const rows: any[] = data?.data || [];

  const mutate = (action: string, payload: any = {}) =>
    useMutation({
      mutationFn: () => apiClient.post(`/training-requests/trainees/${selectedRow?.id}/${action}`, payload),
      onSuccess: (res: any) => {
        qc.invalidateQueries({ queryKey: ['hospital-review-trainees'] });
        setDialog(null);
        setSelectedRow(null);
        setSuccessMsg(res.data?.message || 'تمت العملية بنجاح');
      },
      onError: (err: any) => setErrorMsg(err.response?.data?.message || err.message),
    });

  // Individual mutations to avoid hook rule violations
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
    onSuccess: (res: any) => { qc.invalidateQueries({ queryKey: ['hospital-review-trainees'] }); setDialog(null); setSuccessMsg(res.data?.message); },
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

      {successMsg && <Alert severity="success" onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}
      {errorMsg && <Alert severity="error" onClose={() => setErrorMsg(null)}>{errorMsg}</Alert>}

      {view === 'cards' ? (
        (rows).length === 0 ? (
          <div className="glass-card"><EmptyState icon={Inbox} title="لا توجد حالات للمراجعة حالياً" /></div>
        ) : (
          <CardGrid>
            {rows.map((row: any) => {
              const st = STATUS_LABELS[row.status] || { label: row.status };
              return (
                <EntityCard
                  key={row.id}
                  avatarText={(row.nameAr ?? '?').slice(0, 2)}
                  tone={row.status === 'on_hold' ? 'warning' : row.status === 'rejected' ? 'danger' : 'primary'}
                  title={row.nameAr}
                  subtitle={`${row.nationalId ?? ''} · ${row.trainingRequest?.sourceOrg?.nameAr ?? ''}`}
                  badges={[
                    { label: st.label, tone: row.status === 'on_hold' ? 'warning' : row.status === 'rejected' ? 'danger' : 'info' },
                    ...(row.specialty ? [{ label: row.specialty, tone: 'success' as const }] : []),
                  ]}
                  metrics={[
                    { label: 'القسم', value: row.assignedDepartment?.nameAr ?? 'غير محدد', tone: 'info' },
                    { label: 'المدرب', value: row.assignedTrainer?.person?.nameAr ?? 'غير محدد', tone: 'violet' },
                  ]}
                  footnote={row.trainingRequest?.requestNumber}
                  actions={[
                    { label: 'بدء المراجعة', icon: PlayCircle, tone: 'info',
                      visible: row.status === 'allocated', onClick: () => startReviewMut.mutate(row.id) },
                    { label: 'تفاصيل', icon: Eye, tone: 'neutral', onClick: () => setSelectedRow(row) },
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
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>المتدرب</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>الجامعة / الطلب</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>التخصص</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>القسم / المدرب</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>الحالة</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700, textAlign: 'center' }}>الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} align="center"><CircularProgress size={24} /></TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center" style={{ color: '#64748B', padding: '32px' }}>لا توجد حالات للمراجعة حالياً</TableCell></TableRow>
            ) : (
              rows.map((row: any) => {
                const st = STATUS_LABELS[row.status] || { label: row.status, color: 'default' as const };
                return (
                  <TableRow key={row.id}>
                    <TableCell style={{ fontWeight: 700, color: '#0F172A' }}>
                      {row.nameAr}
                      <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>{row.nationalId}</div>
                    </TableCell>
                    <TableCell style={{ fontSize: '12px', color: '#64748B' }}>
                      {row.trainingRequest?.sourceOrg?.nameAr || '—'}
                      <div style={{ fontFamily: 'monospace', color: '#0891B2' }}>{row.trainingRequest?.requestNumber}</div>
                    </TableCell>
                    <TableCell style={{ color: '#047857' }}>{row.specialty || '—'}</TableCell>
                    <TableCell style={{ fontSize: '12px' }}>
                      <div style={{ color: '#0284C7' }}>{row.assignedDepartment?.nameAr || 'غير محدد'}</div>
                      <div style={{ color: '#059669' }}>{row.assignedTrainer?.person?.nameAr || 'غير محدد'}</div>
                    </TableCell>
                    <TableCell>
                      <Chip label={st.label} color={st.color} size="small" style={{ fontWeight: 700 }} />
                    </TableCell>
                    <TableCell>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {row.status === 'allocated' && (
                          <Tooltip title="بدء المراجعة">
                            <Button size="small" variant="contained" style={{ background: '#0284c7', minWidth: 0, padding: '4px 8px' }}
                              onClick={() => startReviewMut.mutate(row.id)} disabled={startReviewMut.isPending}>
                              <PlayCircle size={14} />
                            </Button>
                          </Tooltip>
                        )}
                        {row.status === 'on_hold' && (
                          <Tooltip title="استئناف المراجعة">
                            <Button size="small" variant="contained" style={{ background: '#059669', minWidth: 0, padding: '4px 8px' }}
                              onClick={() => resumeMut.mutate(row.id)} disabled={resumeMut.isPending}>
                              <PlayCircle size={14} />
                            </Button>
                          </Tooltip>
                        )}
                        {['allocated', 'hospital_review'].includes(row.status) && (
                          <Tooltip title="إيقاف مؤقت">
                            <Button size="small" variant="outlined" style={{ borderColor: '#94a3b8', color: '#64748B', minWidth: 0, padding: '4px 8px' }}
                              onClick={() => openDialog(row, 'hold')}>
                              <PauseCircle size={14} />
                            </Button>
                          </Tooltip>
                        )}
                        {['hospital_review', 'on_hold'].includes(row.status) && (
                          <>
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
                        {['allocated', 'hospital_review', 'on_hold'].includes(row.status) && (
                          <>
                            <Tooltip title="طلب مستندات">
                              <Button size="small" variant="outlined" style={{ borderColor: '#0891B2', color: '#0891B2', minWidth: 0, padding: '4px 8px' }}
                                onClick={() => openDialog(row, 'docs')}>
                                <FileText size={14} />
                              </Button>
                            </Tooltip>
                            <Tooltip title="طلب تصحيح بيانات">
                              <Button size="small" variant="outlined" style={{ borderColor: '#7C3AED', color: '#7C3AED', minWidth: 0, padding: '4px 8px' }}
                                onClick={() => openDialog(row, 'correction')}>
                                <AlertTriangle size={14} />
                              </Button>
                            </Tooltip>
                            <Tooltip title="تعديل التعيين">
                              <Button size="small" variant="outlined" style={{ borderColor: '#059669', color: '#059669', minWidth: 0, padding: '4px 8px' }}
                                onClick={() => openDialog(row, 'assign')}>
                                <Edit3 size={14} />
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

      {/* Reject Dialog */}
      <Dialog open={dialog === 'reject'} onClose={() => setDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle style={{ fontWeight: 800, color: '#DC2626' }}>رفض المتدرب نهائياً</DialogTitle>
        <DialogContent style={{ paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Alert severity="warning">المتدرب: <strong>{selectedRow?.nameAr}</strong> — سيتم إخطار الجامعة بالرفض.</Alert>
          <TextField label="سبب الرفض *" value={reason} onChange={(e) => setReason(e.target.value)} fullWidth required multiline rows={2} size="small" />
          <TextField label="ملاحظات إضافية" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth multiline rows={2} size="small" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>إلغاء</Button>
          <Button variant="contained" color="error" onClick={() => rejectMut.mutate()} disabled={rejectMut.isPending || !reason}>
            {rejectMut.isPending ? <CircularProgress size={20} /> : 'تأكيد الرفض'}
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
            {returnMut.isPending ? <CircularProgress size={20} /> : 'إعادة للتجمع'}
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
            {docsMut.isPending ? <CircularProgress size={20} /> : 'إرسال الطلب'}
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
            {correctionMut.isPending ? <CircularProgress size={20} /> : 'إرسال طلب التصحيح'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change Assignment Dialog */}
      <Dialog open={dialog === 'assign'} onClose={() => setDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle style={{ fontWeight: 800 }}>تعديل التعيين</DialogTitle>
        <DialogContent style={{ paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Alert severity="info">المتدرب: <strong>{selectedRow?.nameAr}</strong></Alert>
          <FormControl fullWidth size="small">
            <InputLabel>القسم المستهدف</InputLabel>
            <Select value={newDeptId} onChange={(e) => setNewDeptId(e.target.value)} label="القسم المستهدف">
              <MenuItem value="">— بدون تغيير —</MenuItem>
              {departments.map((d: any) => (
                <MenuItem key={d.id} value={d.id}>{d.nameAr}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel>المدرب السريري</InputLabel>
            <Select value={newTrainerId} onChange={(e) => setNewTrainerId(e.target.value)} label="المدرب السريري">
              <MenuItem value="">— بدون تغيير —</MenuItem>
              {trainers.map((t: any) => (
                <MenuItem key={t.id} value={t.id}>{t.nameAr || t.email}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField type="date" label="تاريخ البداية المعدَّل" value={newStartDate} onChange={(e) => setNewStartDate(e.target.value)} fullWidth size="small" InputLabelProps={{ shrink: true }} />
          <TextField type="date" label="تاريخ النهاية المعدَّل" value={newEndDate} onChange={(e) => setNewEndDate(e.target.value)} fullWidth size="small" InputLabelProps={{ shrink: true }} />
          <TextField label="سبب التعديل" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth size="small" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>إلغاء</Button>
          <Button variant="contained" style={{ background: '#059669' }} onClick={() => assignMut.mutate()} disabled={assignMut.isPending}>
            {assignMut.isPending ? <CircularProgress size={20} /> : 'حفظ التعديل'}
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
