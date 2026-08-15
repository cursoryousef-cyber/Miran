import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader, DataPageShell } from '../components/ui';
import { apiClient } from '../api/client';
import { FileSpreadsheet, Download, RefreshCw, CheckCircle2, FileText, Clock3, XCircle } from 'lucide-react';
import { Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Alert, LinearProgress, Tooltip } from '@mui/material';

export const Reports: React.FC = () => {
  const [generatedMsg, setGeneratedMsg] = useState<string | null>(null);

  const { data: definitions, isLoading: isLoadingDefs, isError: isErrorDefs } = useQuery({
    queryKey: ['report-definitions'],
    queryFn: async () => {
      const res = await apiClient.get('/reports/definitions');
      return res.data;
    },
  });

  const { data: myReports, refetch, isLoading: isLoadingReports, isError: isErrorReports } = useQuery({
    queryKey: ['my-reports'],
    queryFn: async () => {
      const res = await apiClient.get('/reports/my-reports');
      return res.data;
    },
  });

  const handleGenerate = async (defId: string) => {
    try {
      const res = await apiClient.post('/reports/generate', {
        reportDefinitionId: defId,
        format: 'pdf',
      });
      setGeneratedMsg(res.data.message);
      refetch();
    } catch (err: any) {
      setGeneratedMsg('حدث خطأ أثناء توليد التقرير');
    }
  };

  const defs: any[] = definitions ?? [];
  const reports: any[] = myReports ?? [];

  // The chip must read the row's own status: the stats below already count
  // pending and failed runs, so rendering every row as "مكتمل" contradicts them.
  const statusChip = (status: string) => {
    if (['completed', 'ready'].includes(status)) {
      return { icon: <CheckCircle2 size={14} />, label: 'مكتمل', color: 'success' as const };
    }
    if (status === 'failed') {
      return { icon: <XCircle size={14} />, label: 'فشل', color: 'error' as const };
    }
    return { icon: <Clock3 size={14} />, label: 'قيد التوليد', color: 'warning' as const };
  };
  const ready = reports.filter((r: any) => ['completed', 'ready'].includes(r.status)).length;
  const running = reports.filter((r: any) => ['pending', 'processing', 'running'].includes(r.status)).length;
  const failed = reports.filter((r: any) => r.status === 'failed').length;

  return (
    <DataPageShell
        title="خدمة التقارير والتحليلات المستقلة (Decoupled Reporting Service)"
        subtitle="توليد التقرير الأكاديمية ومؤشرات الانضباط اللا تزامنية وتصديرها بصيغ PDF و Excel"
        loading={isLoadingDefs}
        stats={[
          { label: 'قوالب التقارير', value: defs.length, icon: FileSpreadsheet, tone: 'primary' },
          { label: 'تقاريري', value: reports.length, icon: FileText, tone: 'info' },
          { label: 'جاهزة للتحميل', value: ready, icon: CheckCircle2, tone: 'success' },
          { label: 'قيد التوليد', value: running, icon: Clock3, tone: running ? 'warning' : 'neutral' },
          { label: 'فشلت', value: failed, icon: XCircle, tone: failed ? 'danger' : 'success' },
        ]}
    >

      {(isLoadingDefs || isLoadingReports) && <LinearProgress sx={{ borderRadius: 1 }} />}
      {isErrorDefs && <Alert severity="error">تعذر تحميل قوالب التقارير من الخادم</Alert>}
      {isErrorReports && <Alert severity="error">تعذر تحميل سجل التقارير المُنتجة من الخادم</Alert>}

      {generatedMsg && <Alert severity="success" onClose={() => setGeneratedMsg(null)}>{generatedMsg}</Alert>}

      {/* Available Templates */}
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginBottom: '16px' }}>قوالب التقارير المتاحة</h3>
        <TableContainer component={Paper} className="glass-card">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell style={{ color: '#64748B', fontWeight: 700 }}>اسم التقرير</TableCell>
                <TableCell style={{ color: '#64748B', fontWeight: 700 }}>النوع</TableCell>
                <TableCell style={{ color: '#64748B', fontWeight: 700 }}>الصيغة الافتراضية</TableCell>
                <TableCell style={{ color: '#64748B', fontWeight: 700 }}>الإجراء</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!isLoadingDefs && !isErrorDefs && defs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} style={{ padding: '24px', color: '#64748B' }}>
                    لا توجد قوالب تقارير معرّفة لجهتك. القوالب تُعرَّف مركزياً، ولا يمكن توليد أي تقرير قبل إضافة قالب واحد على الأقل.
                  </TableCell>
                </TableRow>
              )}
              {defs.map((def: any) => (
                <TableRow key={def.id}>
                  <TableCell style={{ fontWeight: 700, color: '#0F172A' }}>{def.nameAr}</TableCell>
                  <TableCell><Chip label={def.reportType} size="small" variant="outlined" /></TableCell>
                  <TableCell style={{ textTransform: 'uppercase', fontWeight: 700 }}>{def.defaultFormat}</TableCell>
                  <TableCell>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<RefreshCw size={14} />}
                      onClick={() => handleGenerate(def.id)}
                      style={{ background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)' }}
                    >
                      توليد الآن
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>

      {/* User Generated Reports */}
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginBottom: '16px' }}>سجل التقارير المُنتجة الجاهزة للتحميل</h3>
        <TableContainer component={Paper} className="glass-card">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell style={{ color: '#64748B', fontWeight: 700 }}>اسم التقرير</TableCell>
                <TableCell style={{ color: '#64748B', fontWeight: 700 }}>تاريخ التوليد</TableCell>
                <TableCell style={{ color: '#64748B', fontWeight: 700 }}>عدد السجلات</TableCell>
                <TableCell style={{ color: '#64748B', fontWeight: 700 }}>الحالة</TableCell>
                <TableCell style={{ color: '#64748B', fontWeight: 700 }}>تحميل</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!isLoadingReports && !isErrorReports && reports.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} style={{ padding: '24px', color: '#64748B' }}>
                    لم تولّد أي تقرير بعد. اختر قالباً من الأعلى واضغط «توليد الآن».
                  </TableCell>
                </TableRow>
              )}
              {reports.map((rep: any) => {
                const st = statusChip(rep.status);
                return (
                  <TableRow key={rep.id}>
                    <TableCell style={{ fontWeight: 700, color: '#0F172A' }}>{rep.reportDefinition?.nameAr ?? '—'}</TableCell>
                    <TableCell>{rep.createdAt ? new Date(rep.createdAt).toLocaleString('ar-SA') : '—'}</TableCell>
                    <TableCell style={{ fontWeight: 700, color: '#047857' }}>{rep.rowCount ?? 0} سجل</TableCell>
                    <TableCell><Chip icon={st.icon} label={st.label} color={st.color} size="small" /></TableCell>
                    <TableCell>
                      {/* No download endpoint exists on the API yet, so the control
                          states that plainly instead of pretending to download. */}
                      <Tooltip title="خدمة تنزيل الملفات غير متاحة بعد — التقرير مولَّد ومحفوظ">
                        <span>
                          <Button variant="outlined" size="small" startIcon={<Download size={14} />} disabled>
                            تحميل PDF
                          </Button>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </DataPageShell>
  );
};
