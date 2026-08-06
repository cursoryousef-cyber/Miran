import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  AlertTriangle, Plus, RefreshCw, CheckCircle2,
} from 'lucide-react';
import {
  Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions, Alert, CircularProgress,
  TextField, MenuItem, Select, FormControl, InputLabel, Tooltip, IconButton,
} from '@mui/material';

const SEVERITY_MAP: Record<string, { label: string; color: 'error' | 'warning' | 'info' | 'default' }> = {
  critical: { label: 'حرجة', color: 'error' },
  high: { label: 'عالية', color: 'error' },
  medium: { label: 'متوسطة', color: 'warning' },
  low: { label: 'منخفضة', color: 'info' },
};

const STATUS_MAP: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
  open: { label: 'مفتوح', color: 'error' },
  under_review: { label: 'قيد المراجعة', color: 'warning' },
  resolved: { label: 'محلول', color: 'success' },
  closed: { label: 'مغلق', color: 'default' },
};

const INCIDENT_TYPES = [
  { value: 'safety', label: 'حادثة سلامة' },
  { value: 'behavioral', label: 'سلوك غير لائق' },
  { value: 'academic', label: 'إشكالية أكاديمية' },
  { value: 'equipment', label: 'عطل تجهيزات' },
  { value: 'attendance', label: 'غياب أو تأخر متكرر' },
  { value: 'ethical', label: 'انتهاك أخلاقيات المهنة' },
  { value: 'other', label: 'أخرى' },
];

const MANAGER_ROLES = [
  'hospital_administrator', 'training_supervisor', 'cluster_administrator', 'platform_owner',
];

export const Incidents: React.FC = () => {
  const { user, primaryRole } = useAuth();
  const qc = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Create form state
  const [incidentType, setIncidentType] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('medium');

  // Status update state
  const [newStatus, setNewStatus] = useState('');
  const [resolution, setResolution] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['incidents', filterStatus, filterSeverity],
    queryFn: async () => {
      const params: any = {};
      if (filterStatus) params.status = filterStatus;
      if (filterSeverity) params.severity = filterSeverity;
      const res = await apiClient.get('/incidents', { params });
      return res.data;
    },
  });

  const incidents: any[] = data?.data || [];

  const createMut = useMutation({
    mutationFn: () =>
      apiClient.post('/incidents', { incidentType, description, severity }),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['incidents'] });
      setCreateOpen(false);
      setIncidentType('');
      setDescription('');
      setSeverity('medium');
      setSuccessMsg('تم تسجيل البلاغ بنجاح');
    },
    onError: (err: any) => setErrorMsg(err.response?.data?.message || err.message),
  });

  const statusMut = useMutation({
    mutationFn: () =>
      apiClient.patch(`/incidents/${selectedIncident?.id}/status`, { status: newStatus, resolution }),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['incidents'] });
      setStatusOpen(false);
      setSelectedIncident(null);
      setSuccessMsg('تم تحديث حالة البلاغ');
    },
    onError: (err: any) => setErrorMsg(err.response?.data?.message || err.message),
  });

  const openStatusDialog = (incident: any) => {
    setSelectedIncident(incident);
    setNewStatus(incident.status);
    setResolution(incident.resolution || '');
    setStatusOpen(true);
  };

  const isManager = MANAGER_ROLES.includes(primaryRole);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={24} color="#f59e0b" />
            البلاغات والحوادث
          </h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            {user?.activeOrganization?.nameAr} — تسجيل ومتابعة بلاغات الحوادث
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Tooltip title="تحديث">
            <IconButton onClick={() => refetch()} style={{ color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
              <RefreshCw size={18} />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<Plus size={16} />}
            onClick={() => setCreateOpen(true)}
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', fontWeight: 700 }}
          >
            تسجيل بلاغ جديد
          </Button>
        </div>
      </div>

      {successMsg && <Alert severity="success" onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}
      {errorMsg && <Alert severity="error" onClose={() => setErrorMsg(null)}>{errorMsg}</Alert>}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <FormControl size="small" style={{ minWidth: 150 }}>
          <InputLabel>الحالة</InputLabel>
          <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} label="الحالة">
            <MenuItem value="">الكل</MenuItem>
            {Object.entries(STATUS_MAP).map(([v, { label }]) => (
              <MenuItem key={v} value={v}>{label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" style={{ minWidth: 150 }}>
          <InputLabel>الخطورة</InputLabel>
          <Select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)} label="الخطورة">
            <MenuItem value="">الكل</MenuItem>
            {Object.entries(SEVERITY_MAP).map(([v, { label }]) => (
              <MenuItem key={v} value={v}>{label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </div>

      <TableContainer component={Paper} className="glass-card">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>نوع الحادثة</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الوصف</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الخطورة</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الحالة</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>المُبلِّغ</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>التاريخ</TableCell>
              {isManager && <TableCell style={{ color: '#94a3b8', fontWeight: 700, textAlign: 'center' }}>إجراء</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={isManager ? 7 : 6} align="center"><CircularProgress size={24} /></TableCell></TableRow>
            ) : incidents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isManager ? 7 : 6} align="center" style={{ color: '#94a3b8', padding: '40px' }}>
                  لا توجد بلاغات مسجلة
                </TableCell>
              </TableRow>
            ) : (
              incidents.map((inc: any) => {
                const sev = SEVERITY_MAP[inc.severity] ?? { label: inc.severity, color: 'default' as const };
                const st = STATUS_MAP[inc.status] ?? { label: inc.status, color: 'default' as const };
                return (
                  <TableRow key={inc.id}>
                    <TableCell style={{ color: '#f8fafc', fontWeight: 600 }}>
                      {INCIDENT_TYPES.find((t) => t.value === inc.incidentType)?.label ?? inc.incidentType}
                    </TableCell>
                    <TableCell style={{ color: '#94a3b8', fontSize: '13px', maxWidth: '280px' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {inc.description}
                      </div>
                      {inc.resolution && (
                        <div style={{ color: '#10b981', fontSize: '11px', marginTop: '2px' }}>
                          الحل: {inc.resolution}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip label={sev.label} color={sev.color} size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip label={st.label} color={st.color} size="small" style={{ fontWeight: 700 }} />
                    </TableCell>
                    <TableCell style={{ fontSize: '12px', color: '#94a3b8' }}>
                      {inc.reportedBy?.person?.nameAr || inc.reportedBy?.email || '—'}
                    </TableCell>
                    <TableCell style={{ fontSize: '12px', color: '#94a3b8' }}>
                      {new Date(inc.createdAt).toLocaleDateString('ar-SA')}
                    </TableCell>
                    {isManager && (
                      <TableCell style={{ textAlign: 'center' }}>
                        {inc.status !== 'closed' && (
                          <Button
                            size="small"
                            variant="outlined"
                            style={{ borderColor: '#06b6d4', color: '#06b6d4', fontSize: '11px' }}
                            onClick={() => openStatusDialog(inc)}
                          >
                            تحديث الحالة
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Incident Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={20} color="#f59e0b" />
          تسجيل بلاغ جديد
        </DialogTitle>
        <DialogContent style={{ paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <FormControl fullWidth size="small" required>
            <InputLabel>نوع الحادثة *</InputLabel>
            <Select value={incidentType} onChange={(e) => setIncidentType(e.target.value)} label="نوع الحادثة *">
              {INCIDENT_TYPES.map((t) => (
                <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="وصف الحادثة *"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            required
            multiline
            rows={4}
            size="small"
            placeholder="اشرح الحادثة بالتفصيل..."
          />
          <FormControl fullWidth size="small">
            <InputLabel>مستوى الخطورة</InputLabel>
            <Select value={severity} onChange={(e) => setSeverity(e.target.value)} label="مستوى الخطورة">
              {Object.entries(SEVERITY_MAP).map(([v, { label }]) => (
                <MenuItem key={v} value={v}>{label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            style={{ background: '#f59e0b', color: '#000', fontWeight: 700 }}
            onClick={() => createMut.mutate()}
            disabled={createMut.isPending || !incidentType || !description}
          >
            {createMut.isPending ? <CircularProgress size={20} /> : 'تسجيل البلاغ'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={statusOpen} onClose={() => setStatusOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle style={{ fontWeight: 800 }}>تحديث حالة البلاغ</DialogTitle>
        <DialogContent style={{ paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Alert severity="info" style={{ fontSize: '13px' }}>
            {selectedIncident?.description?.slice(0, 120)}...
          </Alert>
          <FormControl fullWidth size="small">
            <InputLabel>الحالة الجديدة</InputLabel>
            <Select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} label="الحالة الجديدة">
              {Object.entries(STATUS_MAP).map(([v, { label }]) => (
                <MenuItem key={v} value={v}>{label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {(newStatus === 'resolved' || newStatus === 'closed') && (
            <TextField
              label="وصف الحل / الإجراء المتخذ *"
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              fullWidth
              required
              multiline
              rows={3}
              size="small"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            style={{ background: '#059669' }}
            onClick={() => statusMut.mutate()}
            disabled={statusMut.isPending || !newStatus || (newStatus === 'resolved' && !resolution)}
          >
            {statusMut.isPending ? <CircularProgress size={20} /> : <><CheckCircle2 size={16} style={{ marginLeft: '6px' }} /> حفظ التحديث</>}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Incidents;
