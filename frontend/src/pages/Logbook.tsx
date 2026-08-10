import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader, DataPageShell } from '../components/ui';
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
  FileSpreadsheet, BookOpen, Clock3, Target, ClipboardCheck } from 'lucide-react';
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
  const [selectedTraineeId, setSelectedTraineeId] = useState('');

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

  // ── Trainer-side data (Feature B) ──────────────────────────────────────────
  // A trainer picks the trainees/rotations actually assigned to them — never a
  // raw typed ID. TraineeProfile.id comes from /operations/trainer/groups (the
  // log-entry POST needs traineeProfileId), while the evaluation & midpoint
  // endpoints additionally require rotationId + evaluateeId (UserAccount.id).
  // That pair is only reachable through the trainer branch of GET /rotations,
  // which embeds each active rotation's trainee and their user accounts.
  const isTrainerRole = primaryRole === 'trainer' || primaryRole === 'training_supervisor';
  const canViewSlowEvalReport = ['trainer', 'training_supervisor', 'hospital_training_admin', 'cluster_administrator', 'training_director', 'academic_supervisor', 'org_manager', 'platform_owner'].includes(primaryRole);

  const {
    data: trainerGroupsData,
    isLoading: trainerGroupsLoading,
    isError: trainerGroupsError,
    refetch: refetchTrainerGroups,
  } = useQuery({
    queryKey: ['trainer-groups-for-logbook'],
    enabled: isTrainerRole,
    queryFn: async () => {
      const res = await apiClient.get('/operations/trainer/groups');
      return res.data?.data ?? [];
    },
  });
  const assignedTrainees = (trainerGroupsData ?? []).flatMap((g: any) => g.trainees ?? []);

  const {
    data: rotationsData,
    isLoading: rotationsLoading,
    isError: rotationsError,
    refetch: refetchRotations,
  } = useQuery({
    queryKey: ['trainer-rotations-for-evals'],
    enabled: isTrainerRole,
    queryFn: async () => {
      const res = await apiClient.get('/rotations');
      return res.data?.data ?? [];
    },
  });

  // The rotation a trainer picks in the evaluation / midpoint forms. A rotation
  // uniquely identifies its trainee, so one dropdown supplies both required IDs
  // (rotationId + evaluateeId = the trainee's UserAccount.id).
  const [evalRotationId, setEvalRotationId] = useState('');
  const [midpointRotationId, setMidpointRotationId] = useState('');
  const selectedEvalRotation = (rotationsData ?? []).find((r: any) => r.id === evalRotationId);
  const evalEvaluateeId =
    selectedEvalRotation?.traineeProfile?.person?.userAccounts?.find((ua: any) => ua.isActive)?.id ??
    selectedEvalRotation?.traineeProfile?.person?.userAccounts?.[0]?.id;

  // Auto-select the single active rotation when there is exactly one (the common
  // trainer case) so no manual ID entry is ever needed.
  useEffect(() => {
    if (!isTrainerRole || rotationsLoading || !rotationsData) return;
    if (rotationsData.length === 1) {
      if (!evalRotationId) setEvalRotationId(rotationsData[0].id);
      if (!midpointRotationId) setMidpointRotationId(rotationsData[0].id);
    }
  }, [rotationsData, rotationsLoading, isTrainerRole, evalRotationId, midpointRotationId]);

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

  // Pending evaluations (trainee) / received evaluations — API failures are
  // surfaced, never swallowed into an empty state.
  const { data: pendingEvalsData, refetch: refetchPending } = useQuery({
    queryKey: ['my-pending-evals'],
    queryFn: async () => {
      const res = await apiClient.get('/operations/evaluations/my-pending');
      return res.data?.data ?? null;
    },
  });

  // Evaluation forms list
  const { data: evalFormsData } = useQuery({
    queryKey: ['evaluation-forms'],
    queryFn: async () => {
      const res = await apiClient.get('/operations/evaluations/forms');
      return res.data?.data ?? [];
    },
  });

  // Slow-evaluator report — trainer-side roles only (endpoint 403s otherwise).
  const { data: slowEvalData } = useQuery({
    queryKey: ['slow-evaluators'],
    enabled: canViewSlowEvalReport,
    queryFn: async () => {
      const res = await apiClient.get('/operations/evaluations/slow-evaluators');
      return res.data?.data ?? [];
    },
  });

  const handleCreateLog = async () => {
    if (isTrainerRole && !selectedTraineeId) {
      return;
    }
    try {
      await apiClient.post('/logbook/entries', {
        traineeProfileId: isTrainerRole ? selectedTraineeId : undefined,
        diagnosis,
        procedureId: procedureId ? procedureId : undefined,
        participationLevel,
        complexity,
        notes,
      });
      setOpenModal(false);
      setDiagnosis('');
      setProcedureId('');
      setNotes('');
      setSelectedTraineeId('');
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

  const handleReject = async (logId: string, feedback: string) => {
    if (!feedback?.trim()) {
      alert('سبب الرفض إلزامي');
      return;
    }
    try {
      await apiClient.patch(`/logbook/entries/${logId}/reject`, {
        feedback,
      });
      refetchLogs();
    } catch (err) {
      console.error('Error rejecting log entry:', err);
    }
  };

  const levelMap: Record<string, { label: string; color: string }> = {
    observation: { label: 'ملاحظة ومراقبة (Observation)', color: '#6366f1' },
    assisted: { label: 'مساعدة مدرب (Assisted)', color: '#0891B2' },
    performed: { label: 'إنجاز بإشراف (Performed)', color: '#D97706' },
    performed_independently: { label: 'إنجاز مستقل (Independent)', color: '#059669' },
  };

  const statusMap: Record<string, { label: string; color: 'default' | 'warning' | 'info' | 'success' }> = {
    draft: { label: 'مسودة', color: 'default' },
    submitted: { label: 'بانتظار المدرب', color: 'warning' },
    trainer_approved: { label: 'معتمد من المدرب', color: 'info' },
    rejected: { label: 'مرفوض', color: 'default' },
    completed: { label: 'معتمد نهائياً', color: 'success' },
  };

  const skillPct = competenciesData?.overallPercentage ?? statsData?.completionRate ?? 0;

  return (
    <DataPageShell
        title="🩺 السجل السريري الإلكتروني وحقيبة الكفاءات (Clinical Logbook & Competencies)"
        subtitle={`توثيق حقيقي للحالات والإجراءات الطبية مع الاعتماد الرقمي الحي ومتابعة التقدم بالمهارات`}
        actions={<>
          <Button
            variant="outlined"
            startIcon={<FileSpreadsheet size={18} />}
            style={{ borderColor: '#0891B2', color: '#0891B2', fontWeight: 700 }}
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
        </>}
        stats={[
          { label: 'إجمالي الحالات السريرية', value: statsData?.totalCases ?? 0, icon: BookOpen, tone: 'primary' },
          { label: 'الحالات المعتمدة', value: statsData?.approvedCases ?? 0, icon: CheckCircle2, tone: 'success' },
          { label: 'بانتظار اعتماد المشرف', value: statsData?.pendingApproval ?? 0, icon: Clock3,
            tone: (statsData?.pendingApproval ?? 0) ? 'warning' : 'success' },
          { label: 'نسبة إنجاز المهارات', value: `${skillPct}%`, icon: Target, tone: 'info' },
          { label: 'تقييمات معلّقة', value: pendingEvalsData?.length ?? pendingEvalsData?.count ?? 0, icon: ClipboardCheck, tone: 'violet' },
        ]}
    >

      {/* Tabs Menu */}
      <Box style={{ borderBottom: 1, borderColor: '#E2E8F0' }}>
        <Tabs value={tabIndex} onChange={(_, val) => setTabIndex(val)} textColor="inherit" indicatorColor="primary">
          <Tab label="سجل الحالات والإجراءات (Case Logbook)" style={{ fontWeight: 700 }} />
          <Tab label="حقيبة الكفاءات ومتابعة المهارات (Competencies)" style={{ fontWeight: 700 }} />
          <Tab label="مكتبة الإجراءات والمهارات (Procedures Catalog)" style={{ fontWeight: 700 }} />
          <Tab label="التقييمات والقفل المتبادل" style={{ fontWeight: 700, color: tabIndex === 3 ? '#D97706' : undefined }} />
        </Tabs>
      </Box>

      {/* Tab 0: Case Logs */}
      {tabIndex === 0 && (
        <TableContainer component={Paper} className="glass-card">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell style={{ color: '#64748B', fontWeight: 700 }}>التشخيص / الإجراء</TableCell>
                <TableCell style={{ color: '#64748B', fontWeight: 700 }}>التخصص والقسم</TableCell>
                <TableCell style={{ color: '#64748B', fontWeight: 700 }}>مستوى المشاركة</TableCell>
                <TableCell style={{ color: '#64748B', fontWeight: 700 }}>درجة التعقيد</TableCell>
                <TableCell style={{ color: '#64748B', fontWeight: 700 }}>المدرب المشرف</TableCell>
                <TableCell style={{ color: '#64748B', fontWeight: 700 }}>حالة الاعتماد</TableCell>
                <TableCell style={{ color: '#64748B', fontWeight: 700 }}>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logsData?.data?.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell style={{ fontWeight: 700, color: '#0F172A' }}>
                    {log.diagnosis}
                    {log.procedure && (
                      <div style={{ fontSize: '11px', color: '#059669', marginTop: '2px' }}>
                        إجراء: {log.procedure.titleAr}
                      </div>
                    )}
                  </TableCell>
                  <TableCell style={{ fontSize: '12px', color: '#475569' }}>
                    {log.specialtyAr || 'باطنية وطوارئ'}
                    <div style={{ fontSize: '10px', color: '#64748b' }}>{log.department?.nameAr || 'قسم الباطنية العام'}</div>
                  </TableCell>
                  <TableCell>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: levelMap[log.participationLevel]?.color || '#059669' }}>
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
                  <TableCell style={{ fontSize: '12px', color: '#0F172A', fontWeight: 600 }}>
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
                      <Box style={{ display: 'flex', gap: '8px' }}>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<Check size={14} />}
                          onClick={() => handleApprove(log.id)}
                          style={{ backgroundColor: '#059669', color: '#fff', fontWeight: 700 }}
                        >
                          اعتماد المدرب
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            const reason = prompt('سبب الرفض إلزامي:');
                            if (reason?.trim()) handleReject(log.id, reason);
                          }}
                          style={{ borderColor: '#DC2626', color: '#DC2626', fontWeight: 700 }}
                        >
                          رفض
                        </Button>
                      </Box>
                    )}
                    {log.status === 'trainer_approved' && (
                      <Chip label="موقع رقمياً ✓" size="small" style={{ backgroundColor: 'rgba(16,185,129,0.2)', color: '#059669', fontWeight: 700 }} />
                    )}
                    {log.status === 'rejected' && (
                      <Chip label="مرفوض" size="small" style={{ backgroundColor: '#FEE2E2', color: '#DC2626', fontWeight: 700 }} />
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
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
            🏆 تقدم المهارات والكفاءات المطلوبة (Competency Portfolio Tracking)
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {competenciesData?.data?.map((comp: any) => {
              const perc = Math.min(100, Math.round((comp.completedCount / comp.requiredCount) * 100));
              return (
                <div key={comp.id} style={{ padding: '16px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #F1F5F9', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>{comp.procedure?.titleAr || 'إجراء سريري'}</span>
                    <Chip label={comp.status === 'completed' ? 'مكتمل' : 'قيد التدريب'} color={comp.status === 'completed' ? 'success' : 'warning'} size="small" />
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>
                    التنفيذ: <strong style={{ color: '#059669' }}>{comp.completedCount}</strong> من أصل <strong style={{ color: '#0F172A' }}>{comp.requiredCount}</strong> مهارات مطلوبة
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
                      <span>نسبة الإنجاز</span>
                      <span>{perc}%</span>
                    </div>
                    <LinearProgress variant="determinate" value={perc} style={{ borderRadius: '6px', height: '8px', backgroundColor: '#E2E8F0' }} />
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
                <TableCell style={{ color: '#64748B', fontWeight: 700 }}>اسم الإجراء السريري</TableCell>
                <TableCell style={{ color: '#64748B', fontWeight: 700 }}>الرمز (Code)</TableCell>
                <TableCell style={{ color: '#64748B', fontWeight: 700 }}>التخصص / الفئة</TableCell>
                <TableCell style={{ color: '#64748B', fontWeight: 700 }}>الحد الأدنى المطلوب</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {procsData?.data?.map((proc: any) => (
                <TableRow key={proc.id}>
                  <TableCell style={{ fontWeight: 700, color: '#0F172A' }}>
                    {proc.titleAr}
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{proc.titleEn}</div>
                  </TableCell>
                  <TableCell style={{ fontFamily: 'monospace', color: '#0891B2' }}>{proc.code}</TableCell>
                  <TableCell><Chip label={proc.category} size="small" variant="outlined" /></TableCell>
                  <TableCell style={{ fontWeight: 700, color: '#059669' }}>{proc.minRequired} مرات</TableCell>
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
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 16 }}>
                📋 تقييم القسم (مجهول الهوية تجاه القسم)
              </h3>
              <p style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>
                تقييمك للقسم شرط لإتمام القفل المتبادل. لن يعرف القسم هويتك — تراه الشؤون الأكاديمية فقط.
              </p>
              {pendingEvalsData?.pendingDepartmentEvals?.length === 0 && (
                <div style={{ padding: 16, background: 'rgba(16,185,129,0.1)', borderRadius: 10, border: '1px solid rgba(16,185,129,0.3)', color: '#059669', fontWeight: 700 }}>
                  ✅ لا توجد تقييمات قسم معلقة — القفل المتبادل مكتمل لجميع الروتيشنات النشطة.
                </div>
              )}
              {(pendingEvalsData?.pendingDepartmentEvals ?? []).map((peval: any) => (
                <div key={peval.rotationId} style={{ padding: 16, background: 'rgba(245,158,11,0.08)', borderRadius: 10, border: '1px solid rgba(245,158,11,0.3)', marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>القسم: {peval.departmentNameAr}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 16 }}>
                    {['جودة الإشراف', 'الفرص التعليمية', 'عدالة توزيع العمل', 'بيئة العمل'].map((label, i) => (
                      <div key={i}>
                        <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>{label}</div>
                        <Select
                          size="small"
                          defaultValue={4}
                          fullWidth
                          inputProps={{ id: `dept-score-${peval.rotationId}-${i}` }}
                          sx={{ color: '#0F172A', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#CBD5E1' } }}
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
                    sx={{ mb: 2, '& label': { color: '#64748B' }, '& input, & textarea': { color: '#0F172A' } }}
                  />
                  {deptEvalMsg && deptEvalSubmitting === peval.rotationId && (
                    <div style={{ marginBottom: 8, color: deptEvalMsg.startsWith('✅') ? '#059669' : '#DC2626', fontWeight: 700 }}>{deptEvalMsg}</div>
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
                    style={{ background: 'linear-gradient(135deg, #D97706, #d97706)', fontWeight: 700 }}
                  >
                    إرسال تقييم القسم
                  </Button>
                </div>
              ))}

              {/* Received evaluations */}
              {(pendingEvalsData?.receivedEvals ?? []).length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: '#64748B', marginBottom: 12 }}>التقييمات الواردة من مدربيك</h4>
                  {(pendingEvalsData?.receivedEvals ?? []).map((ev: any) => (
                    <div key={ev.id} style={{ padding: 12, background: 'rgba(99,102,241,0.08)', borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)', marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: '#0F172A' }}>{ev.form?.nameAr ?? ev.evaluationType}</span>
                        <Chip label={`${ev.totalScore ?? '—'} / 100`} size="small"
                          sx={{ background: (ev.totalScore ?? 0) >= 80 ? 'rgba(16,185,129,0.2)' : (ev.totalScore ?? 0) >= 60 ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)',
                               color: (ev.totalScore ?? 0) >= 80 ? '#059669' : (ev.totalScore ?? 0) >= 60 ? '#D97706' : '#DC2626', fontWeight: 700 }} />
                      </div>
                      <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>{ev.rotation?.department?.nameAr} — {new Date(ev.submittedAt).toLocaleDateString('ar-SA')}</div>
                      {ev.comments && <div style={{ fontSize: 12, color: '#475569', marginTop: 6, fontStyle: 'italic' }}>{ev.comments}</div>}
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
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: '#DC2626', margin: '0 0 12px' }}>⚠️ كاشف التقييم الآلي — تقييمات مشبوهة</h4>
                  {(slowEvalData ?? []).map((item: any) => (
                    <div key={item.evaluatorId} style={{ padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                      <span style={{ fontWeight: 700, color: '#0F172A' }}>{item.nameAr}</span>
                      <span style={{ marginRight: 12, fontSize: 12, color: '#64748B' }}>{item.advisoryNote}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="glass-card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>📝 إرسال تقييم للمتدرب</h3>
                <p style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>
                  التقييم النهائي يتطلب: (١) إتمام اجتماع منتصف الدورة، (٢) إكمال المتدرب تقييمه للقسم.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
                  <FormControl size="small" fullWidth required error={!evalRotationId && !rotationsLoading}>
                    <InputLabel sx={{ color: '#64748B' }}>المتدرب / الروتيشن النشط</InputLabel>
                    <Select
                      value={evalRotationId}
                      onChange={(e) => setEvalRotationId(e.target.value)}
                      label="المتدرب / الروتيشن النشط"
                      sx={{ color: '#0F172A', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#CBD5E1' } }}
                    >
                      {(rotationsData ?? []).map((r: any) => (
                        <MenuItem key={r.id} value={r.id}>
                          {r.traineeProfile?.person?.nameAr ?? 'متدرب'} — {r.department?.nameAr ?? ''}
                          {' '}({new Date(r.startDate).toLocaleDateString('ar-SA')})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {rotationsLoading && (
                    <div style={{ gridColumn: '1 / -1', fontSize: 12, color: '#64748B' }}>جارٍ تحميل الروتيشنات المسندة...</div>
                  )}
                  {rotationsError && (
                    <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#DC2626' }}>
                      تعذر تحميل المتدربين حاليًا
                      <Button size="small" variant="outlined" onClick={() => refetchRotations()} style={{ borderColor: '#DC2626', color: '#DC2626', fontSize: 11 }}>
                        إعادة المحاولة
                      </Button>
                    </div>
                  )}
                  {!rotationsLoading && !rotationsError && (rotationsData ?? []).length === 0 && (
                    <div style={{ gridColumn: '1 / -1', fontSize: 13, color: '#64748B' }}>
                      لا يوجد متدربون مسندون إليك حاليًا
                    </div>
                  )}
                  <FormControl size="small" fullWidth>
                    <InputLabel sx={{ color: '#64748B' }}>نوع التقييم</InputLabel>
                    <Select defaultValue="mid_rotation" inputProps={{ id: 'trainer-eval-type' }}
                      sx={{ color: '#0F172A', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#CBD5E1' } }}>
                      <MenuItem value="mid_rotation">منتصف الدورة</MenuItem>
                      <MenuItem value="final_rotation">نهاية الدورة (نهائي)</MenuItem>
                      <MenuItem value="mini_cex">Mini-CEX</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField label="الدرجة الكلية (0-100)" size="small" type="number" fullWidth
                    inputProps={{ id: 'trainer-eval-score', min: 0, max: 100 }}
                    sx={{ '& label': { color: '#64748B' }, '& input': { color: '#0F172A' } }} />
                </div>
                <TextField label="تعليق (إلزامي إذا كانت الدرجة أقل من 60)" size="small" fullWidth multiline rows={3}
                  inputProps={{ id: 'trainer-eval-comments' }}
                  sx={{ mb: 2, '& label': { color: '#64748B' }, '& textarea': { color: '#0F172A' } }} />
                <FormControl size="small" sx={{ mb: 2, minWidth: 220 }}>
                  <InputLabel sx={{ color: '#64748B' }}>نموذج التقييم</InputLabel>
                  <Select defaultValue="" inputProps={{ id: 'trainer-eval-form-id' }}
                    sx={{ color: '#0F172A', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#CBD5E1' } }}>
                    {(evalFormsData ?? []).map((f: any) => <MenuItem key={f.id} value={f.id}>{f.nameAr}</MenuItem>)}
                  </Select>
                </FormControl>
                {evalMsg && <div style={{ marginBottom: 12, color: evalMsg.startsWith('✅') ? '#059669' : '#DC2626', fontWeight: 700 }}>{evalMsg}</div>}
                <Button
                  variant="contained"
                  disabled={evalSubmitting || !evalRotationId}
                  onClick={async () => {
                    setEvalSubmitting(true); setEvalMsg(null);
                    const rotationId = evalRotationId;
                    const evaluateeId = evalEvaluateeId;
                    const scoreEl = document.getElementById('trainer-eval-score') as HTMLInputElement;
                    const comments = (document.getElementById('trainer-eval-comments') as HTMLTextAreaElement)?.value;
                    const formId = (document.getElementById('trainer-eval-form-id') as HTMLInputElement)?.value;
                    const evalTypeEl = document.getElementById('trainer-eval-type') as HTMLInputElement;
                    const secondsSpent = Math.round((Date.now() - evalStartRef.current) / 1000);
                    if (!rotationId) { setEvalMsg('❌ اختر المتدرب / الروتيشن أولاً'); setEvalSubmitting(false); return; }
                    if (!evaluateeId) { setEvalMsg('❌ تعذر تحديد حساب المتدرب لهذا الروتيشن'); setEvalSubmitting(false); return; }
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
                  style={{ background: 'linear-gradient(135deg, #6366f1, #7C3AED)', fontWeight: 700 }}
                >
                  إرسال التقييم
                </Button>
              </div>

              {/* Midpoint meeting completion */}
              <div className="glass-card" style={{ padding: 24, border: '1px solid rgba(16,185,129,0.25)' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#059669', marginBottom: 8 }}>🤝 تسجيل اجتماع منتصف الدورة</h3>
                <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>
                  الاجتماع إلزامي ولا يُفتح التقييم النهائي إن لم يُنفَّذ.
                </p>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <FormControl size="small" required error={!midpointRotationId} sx={{ minWidth: 220 }}>
                    <InputLabel sx={{ color: '#64748B' }}>المتدرب / الروتيشن النشط</InputLabel>
                    <Select
                      value={midpointRotationId}
                      onChange={(e) => setMidpointRotationId(e.target.value)}
                      label="المتدرب / الروتيشن النشط"
                      sx={{ color: '#0F172A', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#CBD5E1' } }}
                    >
                      {(rotationsData ?? []).map((r: any) => (
                        <MenuItem key={r.id} value={r.id}>
                          {r.traineeProfile?.person?.nameAr ?? 'متدرب'} — {r.department?.nameAr ?? ''}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField label="ملاحظات الاجتماع" size="small"
                    inputProps={{ id: 'midpoint-notes' }}
                    sx={{ flex: 1, '& label': { color: '#64748B' }, '& input': { color: '#0F172A' } }} />
                  <Button variant="outlined"
                    onClick={async () => {
                      const rotId = midpointRotationId;
                      const notesVal = (document.getElementById('midpoint-notes') as HTMLInputElement)?.value;
                      if (!rotId) { setEvalMsg('❌ اختر المتدرب / الروتيشن أولاً'); return; }
                      try {
                        await apiClient.patch(`/operations/evaluations/midpoint/${rotId}/complete`, { notes: notesVal });
                        setEvalMsg('✅ تم تسجيل اجتماع منتصف الدورة.');
                      } catch (e: any) {
                        setEvalMsg(`❌ ${e?.response?.data?.message ?? 'حدث خطأ'}`);
                      }
                    }}
                    disabled={!midpointRotationId}
                    style={{ borderColor: '#059669', color: '#059669', fontWeight: 700, height: 40 }}
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
        <DialogTitle style={{ backgroundColor: '#FFFFFF', color: '#0F172A', fontWeight: 800, borderBottom: '1px solid #E2E8F0' }}>
          تسجيل حالة أو إجراء سريري جديد
        </DialogTitle>
        <DialogContent style={{ backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '20px' }}>
          {isTrainerRole && (
            <>
              <FormControl size="small" fullWidth required error={!selectedTraineeId && !trainerGroupsLoading}>
                <InputLabel id="trainee-select-label">المتدرب</InputLabel>
                <Select
                  labelId="trainee-select-label"
                  value={selectedTraineeId}
                  label="المتدرب"
                  onChange={(e) => setSelectedTraineeId(e.target.value)}
                >
                  {assignedTrainees.map((t: any) => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.nameAr} {t.traineeNumber ? `(${t.traineeNumber})` : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {trainerGroupsLoading && (
                <div style={{ fontSize: 12, color: '#64748B' }}>جارٍ تحميل المتدربين المسندين...</div>
              )}
              {trainerGroupsError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#DC2626' }}>
                  تعذر تحميل المتدربين حاليًا
                  <Button size="small" variant="outlined" onClick={() => refetchTrainerGroups()} style={{ borderColor: '#DC2626', color: '#DC2626', fontSize: 11 }}>
                    إعادة المحاولة
                  </Button>
                </div>
              )}
              {!trainerGroupsLoading && !trainerGroupsError && assignedTrainees.length === 0 && (
                <div style={{ fontSize: 13, color: '#64748B' }}>
                  لا يوجد متدربون مسندون إليك حاليًا
                </div>
              )}
            </>
          )}

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
        <DialogActions style={{ backgroundColor: '#FFFFFF', padding: '16px 24px', borderTop: '1px solid #E2E8F0' }}>
          <Button onClick={() => { setOpenModal(false); setSelectedTraineeId(''); }} style={{ color: '#64748B' }}>إلغاء</Button>
          <Button
            onClick={handleCreateLog}
            variant="contained"
            disabled={isTrainerRole && !selectedTraineeId}
            style={{ background: '#0F766E', fontWeight: 700, borderRadius: '10px' }}
          >
            تسجيل وتوثيق الحالة
          </Button>
        </DialogActions>
      </Dialog>
    </DataPageShell>
  );
};

export default LogbookPage;
