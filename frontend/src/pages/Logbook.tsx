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
  const { user, primaryRole } = useAuth();
  const [tabIndex, setTabIndex] = useState(0);

  // Modal State
  const [openModal, setOpenModal] = useState(false);
  const [diagnosis, setDiagnosis] = useState('');
  const [procedureId, setProcedureId] = useState('');
  const [participationLevel, setParticipationLevel] = useState('performed');
  const [complexity, setComplexity] = useState('medium');
  const [notes, setNotes] = useState('');

  // Evaluation state — trainer submits eval
  const [evalSubmitting, setEvalSubmitting] = useState(false);
  const [evalMsg, setEvalMsg] = useState<string | null>(null);
  // Dept eval state — trainee rates department
  const [deptEvalSubmitting, setDeptEvalSubmitting] = useState<string | null>(null);
  const [deptEvalMsg, setDeptEvalMsg] = useState<string | null>(null);
  // Timer for auto-detector (records how long the trainer spent on the form)
  const evalStartRef = React.useRef<number>(Date.now());

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

  // Pending evaluations (trainee) / received evaluations
  const { data: pendingEvalsData, refetch: refetchPending } = useQuery({
    queryKey: ['my-pending-evals'],
    queryFn: async () => {
      const res = await apiClient.get('/operations/evaluations/my-pending').catch(() => ({ data: { data: null } }));
      return res.data?.data ?? null;
    },
  });

  // Evaluation forms list
  const { data: evalFormsData } = useQuery({
    queryKey: ['evaluation-forms'],
    queryFn: async () => {
      const res = await apiClient.get('/operations/evaluations/forms').catch(() => ({ data: { data: [] } }));
      return res.data?.data ?? [];
    },
  });

  // Slow-evaluator report (trainer/supervisor)
  const { data: slowEvalData } = useQuery({
    queryKey: ['slow-evaluators'],
    queryFn: async () => {
      const res = await apiClient.get('/operations/evaluations/slow-evaluators').catch(() => ({ data: { data: [] } }));
      return res.data?.data ?? [];
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
          <Tab label="التقييمات والقفل المتبادل" style={{ fontWeight: 700, color: tabIndex === 3 ? '#f59e0b' : undefined }} />
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

      {/* Tab 3: Evaluations & Mutual Lock ─────────────────────────────────── */}
      {tabIndex === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* ── Trainee: Department Evaluation ── */}
          {primaryRole === 'trainee' && (
            <div className="glass-card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc', marginBottom: 16 }}>
                📋 تقييم القسم (مجهول الهوية تجاه القسم)
              </h3>
              <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20 }}>
                تقييمك للقسم شرط لإتمام القفل المتبادل. لن يعرف القسم هويتك — تراه الشؤون الأكاديمية فقط.
              </p>
              {pendingEvalsData?.pendingDepartmentEvals?.length === 0 && (
                <div style={{ padding: 16, background: 'rgba(16,185,129,0.1)', borderRadius: 10, border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', fontWeight: 700 }}>
                  ✅ لا توجد تقييمات قسم معلقة — القفل المتبادل مكتمل لجميع الروتيشنات النشطة.
                </div>
              )}
              {(pendingEvalsData?.pendingDepartmentEvals ?? []).map((peval: any) => (
                <div key={peval.rotationId} style={{ padding: 16, background: 'rgba(245,158,11,0.08)', borderRadius: 10, border: '1px solid rgba(245,158,11,0.3)', marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, color: '#f8fafc', marginBottom: 12 }}>القسم: {peval.departmentNameAr}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 16 }}>
                    {['جودة الإشراف', 'الفرص التعليمية', 'عدالة توزيع العمل', 'بيئة العمل'].map((label, i) => (
                      <div key={i}>
                        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>{label}</div>
                        <Select
                          size="small"
                          defaultValue={4}
                          fullWidth
                          inputProps={{ id: `dept-score-${peval.rotationId}-${i}` }}
                          sx={{ color: '#f8fafc', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' } }}
                        >
                          {[1, 2, 3, 4, 5].map(v => <MenuItem key={v} value={v}>{v} — {['ضعيف','مقبول','جيد','جيد جداً','ممتاز'][v-1]}</MenuItem>)}
                        </Select>
                      </div>
                    ))}
                  </div>
                  <TextField
                    label="ملاحظة (اختيارية)"
                    size="small" fullWidth multiline rows={2}
                    inputProps={{ id: `dept-comment-${peval.rotationId}` }}
                    sx={{ mb: 2, '& label': { color: '#94a3b8' }, '& input, & textarea': { color: '#f8fafc' } }}
                  />
                  {deptEvalMsg && deptEvalSubmitting === peval.rotationId && (
                    <div style={{ marginBottom: 8, color: deptEvalMsg.startsWith('✅') ? '#10b981' : '#ef4444', fontWeight: 700 }}>{deptEvalMsg}</div>
                  )}
                  <Button
                    variant="contained"
                    disabled={deptEvalSubmitting === peval.rotationId}
                    onClick={async () => {
                      setDeptEvalSubmitting(peval.rotationId);
                      setDeptEvalMsg(null);
                      const scores: Record<string, number> = {};
                      ['جودة الإشراف', 'الفرص التعليمية', 'عدالة توزيع العمل', 'بيئة العمل'].forEach((_, i) => {
                        const el = document.getElementById(`dept-score-${peval.rotationId}-${i}`) as HTMLInputElement | null;
                        scores[`item_${i}`] = el ? Number(el.value) : 4;
                      });
                      const commentEl = document.getElementById(`dept-comment-${peval.rotationId}`) as HTMLTextAreaElement | null;
                      // Use first available form or empty string
                      const formId = evalFormsData?.[0]?.id ?? '';
                      try {
                        await apiClient.post('/operations/evaluations/department', {
                          rotationId: peval.rotationId,
                          formId,
                          scores,
                          totalScore: Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length * 20),
                          comments: commentEl?.value,
                        });
                        setDeptEvalMsg('✅ تم إرسال تقييم القسم بنجاح. القفل المتبادل مكتمل.');
                        refetchPending();
                      } catch (e: any) {
                        setDeptEvalMsg(`❌ ${e?.response?.data?.message ?? 'حدث خطأ'}`);
                      } finally {
                        setDeptEvalSubmitting(null);
                      }
                    }}
                    style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', fontWeight: 700 }}
                  >
                    إرسال تقييم القسم
                  </Button>
                </div>
              ))}

              {/* Received evaluations */}
              {(pendingEvalsData?.receivedEvals ?? []).length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: '#94a3b8', marginBottom: 12 }}>التقييمات الواردة من مدربيك</h4>
                  {(pendingEvalsData?.receivedEvals ?? []).map((ev: any) => (
                    <div key={ev.id} style={{ padding: 12, background: 'rgba(99,102,241,0.08)', borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)', marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: '#f8fafc' }}>{ev.form?.nameAr ?? ev.evaluationType}</span>
                        <Chip label={`${ev.totalScore ?? '—'} / 100`} size="small"
                          sx={{ background: (ev.totalScore ?? 0) >= 80 ? 'rgba(16,185,129,0.2)' : (ev.totalScore ?? 0) >= 60 ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)',
                               color: (ev.totalScore ?? 0) >= 80 ? '#10b981' : (ev.totalScore ?? 0) >= 60 ? '#f59e0b' : '#ef4444', fontWeight: 700 }} />
                      </div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{ev.rotation?.department?.nameAr} — {new Date(ev.submittedAt).toLocaleDateString('ar-SA')}</div>
                      {ev.comments && <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 6, fontStyle: 'italic' }}>{ev.comments}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Trainer: Submit Evaluation + Midpoint ── */}
          {(primaryRole === 'trainer' || primaryRole === 'training_supervisor' || primaryRole === 'platform_owner') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Slow-evaluator report */}
              {(slowEvalData ?? []).length > 0 && (
                <div className="glass-card" style={{ padding: 20, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)' }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: '#ef4444', margin: '0 0 12px' }}>⚠️ كاشف التقييم الآلي — تقييمات مشبوهة</h4>
                  {(slowEvalData ?? []).map((item: any) => (
                    <div key={item.evaluatorId} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontWeight: 700, color: '#f8fafc' }}>{item.nameAr}</span>
                      <span style={{ marginRight: 12, fontSize: 12, color: '#94a3b8' }}>{item.advisoryNote}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="glass-card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc', marginBottom: 8 }}>📝 إرسال تقييم للمتدرب</h3>
                <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20 }}>
                  التقييم النهائي يتطلب: (١) إتمام اجتماع منتصف الدورة، (٢) إكمال المتدرب تقييمه للقسم.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
                  <TextField label="معرّف الروتيشن (Rotation ID)" size="small" fullWidth
                    inputProps={{ id: 'trainer-eval-rotation-id' }}
                    sx={{ '& label': { color: '#94a3b8' }, '& input': { color: '#f8fafc' } }} />
                  <TextField label="معرّف حساب المتدرب" size="small" fullWidth
                    inputProps={{ id: 'trainer-eval-trainee-id' }}
                    sx={{ '& label': { color: '#94a3b8' }, '& input': { color: '#f8fafc' } }} />
                  <FormControl size="small" fullWidth>
                    <InputLabel sx={{ color: '#94a3b8' }}>نوع التقييم</InputLabel>
                    <Select defaultValue="mid_rotation" inputProps={{ id: 'trainer-eval-type' }}
                      sx={{ color: '#f8fafc', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' } }}>
                      <MenuItem value="mid_rotation">منتصف الدورة</MenuItem>
                      <MenuItem value="final_rotation">نهاية الدورة (نهائي)</MenuItem>
                      <MenuItem value="mini_cex">Mini-CEX</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField label="الدرجة الكلية (0-100)" size="small" type="number" fullWidth
                    inputProps={{ id: 'trainer-eval-score', min: 0, max: 100 }}
                    sx={{ '& label': { color: '#94a3b8' }, '& input': { color: '#f8fafc' } }} />
                </div>
                <TextField label="تعليق (إلزامي إذا كانت الدرجة أقل من 60)" size="small" fullWidth multiline rows={3}
                  inputProps={{ id: 'trainer-eval-comments' }}
                  sx={{ mb: 2, '& label': { color: '#94a3b8' }, '& textarea': { color: '#f8fafc' } }} />
                <FormControl size="small" sx={{ mb: 2, minWidth: 220 }}>
                  <InputLabel sx={{ color: '#94a3b8' }}>نموذج التقييم</InputLabel>
                  <Select defaultValue="" inputProps={{ id: 'trainer-eval-form-id' }}
                    sx={{ color: '#f8fafc', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' } }}>
                    {(evalFormsData ?? []).map((f: any) => <MenuItem key={f.id} value={f.id}>{f.nameAr}</MenuItem>)}
                  </Select>
                </FormControl>
                {evalMsg && <div style={{ marginBottom: 12, color: evalMsg.startsWith('✅') ? '#10b981' : '#ef4444', fontWeight: 700 }}>{evalMsg}</div>}
                <Button
                  variant="contained"
                  disabled={evalSubmitting}
                  onClick={async () => {
                    setEvalSubmitting(true); setEvalMsg(null);
                    const rotationId = (document.getElementById('trainer-eval-rotation-id') as HTMLInputElement)?.value;
                    const evaluateeId = (document.getElementById('trainer-eval-trainee-id') as HTMLInputElement)?.value;
                    const scoreEl = document.getElementById('trainer-eval-score') as HTMLInputElement;
                    const comments = (document.getElementById('trainer-eval-comments') as HTMLTextAreaElement)?.value;
                    const formId = (document.getElementById('trainer-eval-form-id') as HTMLInputElement)?.value;
                    const evalTypeEl = document.getElementById('trainer-eval-type') as HTMLInputElement;
                    const secondsSpent = Math.round((Date.now() - evalStartRef.current) / 1000);
                    try {
                      await apiClient.post('/operations/evaluations', {
                        rotationId, evaluateeId, formId: formId || evalFormsData?.[0]?.id,
                        evaluationType: evalTypeEl?.value ?? 'mid_rotation',
                        scores: { overall: Number(scoreEl?.value) },
                        totalScore: Number(scoreEl?.value),
                        comments, secondsSpent,
                      });
                      setEvalMsg('✅ تم إرسال التقييم بنجاح.');
                      evalStartRef.current = Date.now();
                    } catch (e: any) {
                      setEvalMsg(`❌ ${e?.response?.data?.message ?? 'حدث خطأ'}`);
                    } finally { setEvalSubmitting(false); }
                  }}
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', fontWeight: 700 }}
                >
                  إرسال التقييم
                </Button>
              </div>

              {/* Midpoint meeting completion */}
              <div className="glass-card" style={{ padding: 24, border: '1px solid rgba(16,185,129,0.25)' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#10b981', marginBottom: 8 }}>🤝 تسجيل اجتماع منتصف الدورة</h3>
                <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>
                  الاجتماع إلزامي ولا يُفتح التقييم النهائي إن لم يُنفَّذ.
                </p>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <TextField label="معرّف الروتيشن" size="small"
                    inputProps={{ id: 'midpoint-rotation-id' }}
                    sx={{ '& label': { color: '#94a3b8' }, '& input': { color: '#f8fafc' } }} />
                  <TextField label="ملاحظات الاجتماع" size="small"
                    inputProps={{ id: 'midpoint-notes' }}
                    sx={{ flex: 1, '& label': { color: '#94a3b8' }, '& input': { color: '#f8fafc' } }} />
                  <Button variant="outlined"
                    onClick={async () => {
                      const rotId = (document.getElementById('midpoint-rotation-id') as HTMLInputElement)?.value;
                      const notesVal = (document.getElementById('midpoint-notes') as HTMLInputElement)?.value;
                      if (!rotId) return;
                      try {
                        await apiClient.patch(`/operations/evaluations/midpoint/${rotId}/complete`, { notes: notesVal });
                        setEvalMsg('✅ تم تسجيل اجتماع منتصف الدورة.');
                      } catch (e: any) {
                        setEvalMsg(`❌ ${e?.response?.data?.message ?? 'حدث خطأ'}`);
                      }
                    }}
                    style={{ borderColor: '#10b981', color: '#10b981', fontWeight: 700, height: 40 }}
                  >
                    تسجيل الاجتماع
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
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
