import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  Plus,
  CheckCircle2,
  Clock,
  Award,
  Stethoscope,
  Activity,
  FileCheck,
  Download,
  Search,
  Filter,
  Check,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  LinearProgress,
  Tabs,
  Tab,
  Box,
} from '@mui/material';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const LogbookPage: React.FC = () => {
  const { user } = useAuth();
  const [tabIndex, setTabIndex] = useState(0);

  // Modal State
  const [openModal, setOpenModal] = useState(false);
  const [diagnosis, setDiagnosis] = useState('');
  const [procedureId, setProcedureId] = useState('');
  const [participationLevel, setParticipationLevel] = useState('performed');
  const [complexity, setComplexity] = useState('medium');
  const [notes, setNotes] = useState('');

  // Queries
  const { data: logsData, refetch: refetchLogs } = useQuery({
    queryKey: ['my-logs'],
    queryFn: async () => {
      const res = await apiClient.get('/logbook/my-logs');
      return res.data;
    },
  });

  const { data: procsData } = useQuery({
    queryKey: ['procedures-catalog'],
    queryFn: async () => {
      const res = await apiClient.get('/logbook/procedures');
      return res.data;
    },
  });

  const { data: competenciesData } = useQuery({
    queryKey: ['competencies-portfolio'],
    queryFn: async () => {
      const res = await apiClient.get('/logbook/competencies');
      return res.data;
    },
  });

  const { data: statsData } = useQuery({
    queryKey: ['logbook-stats'],
    queryFn: async () => {
      const res = await apiClient.get('/logbook/dashboard-stats');
      return res.data;
    },
  });

  const handleCreateLog = async () => {
    try {
      await apiClient.post('/logbook/entries', {
        diagnosis,
        procedureId,
        participationLevel,
        complexity,
        notes,
      });
      setOpenModal(false);
      setDiagnosis('');
      setProcedureId('');
      setNotes('');
      refetchLogs();
    } catch (err) {
      console.error('Error creating log entry:', err);
    }
  };

  const handleApprove = async (logId: string) => {
    try {
      await apiClient.post(`/logbook/entries/${logId}/approve`, {
        feedback: 'تم التدقيق والاعتماد بنجاح',
      });
      refetchLogs();
    } catch (err) {
      console.error('Error approving log entry:', err);
    }
  };

  const levelMap: Record<string, { label: string; color: string }> = {
    observation: { label: 'ملاحظة ومراقبة (Observation)', color: '#6366f1' },
    assisted: { label: 'مساعدة مدرب (Assisted)', color: '#06b6d4' },
    performed: { label: 'إنجاز بإشراف (Performed)', color: '#f59e0b' },
    performed_independently: { label: 'إنجاز مستقل (Independent)', color: '#10b981' },
  };

  const statusMap: Record<string, { label: string; color: 'default' | 'warning' | 'info' | 'success' }> = {
    draft: { label: 'مسودة', color: 'default' },
    submitted: { label: 'بانتظار المدرب', color: 'warning' },
    trainer_approved: { label: 'معتمد من المدرب', color: 'info' },
    completed: { label: 'معتمد نهائياً', color: 'success' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner & Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
            🩺 السجل السريري الإلكتروني وحقيبة الكفاءات (Clinical Logbook & Competencies)
          </h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            توثيق حقيقي للحالات والإجراءات الطبية مع الاعتماد الرقمي الحي ومتابعة التقدم بالمهارات
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Button
            variant="outlined"
            startIcon={<FileSpreadsheet size={18} />}
            style={{ borderColor: '#06b6d4', color: '#06b6d4', fontWeight: 700 }}
          >
            تصدير تقرير Logbook (PDF / Excel)
          </Button>
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={() => setOpenModal(true)}
            style={{ background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)', fontWeight: 700 }}
          >
            تسجيل إجراء / حالة جديدة
          </Button>
        </div>
      </div>

      {/* Analytics KPI Dashboard Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>إجمالي الحالات السريرية</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#f8fafc' }}>{statsData?.totalCases ?? 0} حالة</div>
        </div>

        <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>الحالات المعتمدة</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#10b981' }}>{statsData?.approvedCases ?? 0} معتمدة</div>
        </div>

        <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>بانتظار اعتماد المشرف</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#f59e0b' }}>{statsData?.pendingApproval ?? 0} بانتظار</div>
        </div>

        <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>نسبة إنجاز المهارات الكلية</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#06b6d4' }}>{competenciesData?.overallPercentage ?? statsData?.completionRate ?? 0}%</div>
        </div>
      </div>

      {/* Tabs Menu */}
      <Box style={{ borderBottom: 1, borderColor: 'rgba(255, 255, 255, 0.1)' }}>
        <Tabs value={tabIndex} onChange={(_, val) => setTabIndex(val)} textColor="inherit" indicatorColor="primary">
          <Tab label="سجل الحالات والإجراءات (Case Logbook)" style={{ fontWeight: 700 }} />
          <Tab label="حقيبة الكفاءات ومتابعة المهارات (Competencies)" style={{ fontWeight: 700 }} />
          <Tab label="مكتبة الإجراءات والمهارات (Procedures Catalog)" style={{ fontWeight: 700 }} />
        </Tabs>
      </Box>

      {/* Tab 0: Case Logs */}
      {tabIndex === 0 && (
        <TableContainer component={Paper} className="glass-card">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>التشخيص / الإجراء</TableCell>
                <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>التخصص والقسم</TableCell>
                <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>مستوى المشاركة</TableCell>
                <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>درجة التعقيد</TableCell>
                <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>المدرب المشرف</TableCell>
                <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>حالة الاعتماد</TableCell>
                <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logsData?.data?.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell style={{ fontWeight: 700, color: '#f8fafc' }}>
                    {log.diagnosis}
                    {log.procedure && (
                      <div style={{ fontSize: '11px', color: '#10b981', marginTop: '2px' }}>
                        إجراء: {log.procedure.titleAr}
                      </div>
                    )}
                  </TableCell>
                  <TableCell style={{ fontSize: '12px', color: '#cbd5e1' }}>
                    {log.specialtyAr || 'باطنية وطوارئ'}
                    <div style={{ fontSize: '10px', color: '#64748b' }}>{log.department?.nameAr || 'قسم الباطنية العام'}</div>
                  </TableCell>
                  <TableCell>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: levelMap[log.participationLevel]?.color || '#10b981' }}>
                      {levelMap[log.participationLevel]?.label || log.participationLevel}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={log.complexity === 'high' ? 'عالية' : log.complexity === 'critical' ? 'حرجة' : 'متوسطة'}
                      size="small"
                      color={log.complexity === 'high' ? 'error' : 'default'}
                    />
                  </TableCell>
                  <TableCell style={{ fontSize: '12px', color: '#fff', fontWeight: 600 }}>
                    {log.trainerProfile?.person?.nameAr || 'د. سالم العتيبي'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={statusMap[log.status]?.label || log.status}
                      color={statusMap[log.status]?.color || 'default'}
                      size="small"
                      style={{ fontWeight: 700 }}
                    />
                  </TableCell>
                  <TableCell>
                    {log.status === 'submitted' && (user?.roles?.includes('trainer') || user?.roles?.includes('platform_owner') || user?.roles?.includes('org_manager')) && (
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<Check size={14} />}
                        onClick={() => handleApprove(log.id)}
                        style={{ backgroundColor: '#10b981', color: '#fff', fontWeight: 700 }}
                      >
                        اعتماد المدرب
                      </Button>
                    )}
                    {log.status === 'trainer_approved' && (
                      <Chip label="موقع رقمياً ✓" size="small" style={{ backgroundColor: 'rgba(16,185,129,0.2)', color: '#10b981', fontWeight: 700 }} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Tab 1: Competencies Portfolio */}
      {tabIndex === 1 && (
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
            🏆 تقدم المهارات والكفاءات المطلوبة (Competency Portfolio Tracking)
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {competenciesData?.data?.map((comp: any) => {
              const perc = Math.min(100, Math.round((comp.completedCount / comp.requiredCount) * 100));
              return (
                <div key={comp.id} style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>{comp.procedure?.titleAr || 'إجراء سريري'}</span>
                    <Chip label={comp.status === 'completed' ? 'مكتمل' : 'قيد التدريب'} color={comp.status === 'completed' ? 'success' : 'warning'} size="small" />
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    التنفيذ: <strong style={{ color: '#10b981' }}>{comp.completedCount}</strong> من أصل <strong style={{ color: '#fff' }}>{comp.requiredCount}</strong> مهارات مطلوبة
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
                      <span>نسبة الإنجاز</span>
                      <span>{perc}%</span>
                    </div>
                    <LinearProgress variant="determinate" value={perc} style={{ borderRadius: '6px', height: '8px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Procedures Catalog */}
      {tabIndex === 2 && (
        <TableContainer component={Paper} className="glass-card">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>اسم الإجراء السريري</TableCell>
                <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الرمز (Code)</TableCell>
                <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>التخصص / الفئة</TableCell>
                <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الحد الأدنى المطلوب</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {procsData?.data?.map((proc: any) => (
                <TableRow key={proc.id}>
                  <TableCell style={{ fontWeight: 700, color: '#f8fafc' }}>
                    {proc.titleAr}
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{proc.titleEn}</div>
                  </TableCell>
                  <TableCell style={{ fontFamily: 'monospace', color: '#06b6d4' }}>{proc.code}</TableCell>
                  <TableCell><Chip label={proc.category} size="small" variant="outlined" /></TableCell>
                  <TableCell style={{ fontWeight: 700, color: '#10b981' }}>{proc.minRequired} مرات</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Modal Dialog */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle style={{ background: '#0f172a', color: '#fff', fontWeight: 800 }}>
          تسجيل حالة أو إجراء سريري جديد
        </DialogTitle>
        <DialogContent style={{ background: '#0f172a', display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '16px' }}>
          <TextField
            label="التشخيص أو وصف الحالة (Diagnosis)"
            variant="outlined"
            size="small"
            fullWidth
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
          />

          <FormControl size="small" fullWidth>
            <InputLabel id="proc-select-label">اختيار الإجراء الطبي من الكتالوج</InputLabel>
            <Select
              labelId="proc-select-label"
              value={procedureId}
              label="اختيار الإجراء الطبي من الكتالوج"
              onChange={(e) => setProcedureId(e.target.value)}
            >
              {procsData?.data?.map((p: any) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.titleAr} ({p.code})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel id="level-select-label">مستوى المشاركة السريرية</InputLabel>
            <Select
              labelId="level-select-label"
              value={participationLevel}
              label="مستوى المشاركة السريرية"
              onChange={(e) => setParticipationLevel(e.target.value)}
            >
              <MenuItem value="observation">ملاحظة ومراقبة (Observation)</MenuItem>
              <MenuItem value="assisted">مساعدة مدرب (Assisted)</MenuItem>
              <MenuItem value="performed">إنجاز بإشراف (Performed)</MenuItem>
              <MenuItem value="performed_independently">إنجاز مستقل (Independent)</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel id="complexity-select-label">درجة تعقيد الحالة</InputLabel>
            <Select
              labelId="complexity-select-label"
              value={complexity}
              label="درجة تعقيد الحالة"
              onChange={(e) => setComplexity(e.target.value)}
            >
              <MenuItem value="low">منخفضة</MenuItem>
              <MenuItem value="medium">متوسطة</MenuItem>
              <MenuItem value="high">عالية</MenuItem>
              <MenuItem value="critical">حرجة</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="ملاحظات وتفاصيل إضافية"
            multiline
            rows={3}
            variant="outlined"
            size="small"
            fullWidth
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions style={{ background: '#0f172a', padding: '16px' }}>
          <Button onClick={() => setOpenModal(false)} style={{ color: '#94a3b8' }}>إلغاء</Button>
          <Button onClick={handleCreateLog} variant="contained" style={{ background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)', fontWeight: 700 }}>
            تسجيل وتوثيق الحالة
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default LogbookPage;
