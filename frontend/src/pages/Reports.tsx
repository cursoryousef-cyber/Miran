import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../components/ui';
import { apiClient } from '../api/client';
import { FileSpreadsheet, Download, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Alert, LinearProgress } from '@mui/material';

export const Reports: React.FC = () => {
  const [generatedMsg, setGeneratedMsg] = useState<string | null>(null);

  const { data: definitions, isLoading: isLoadingDefs, isError: isErrorDefs } = useQuery({
    queryKey: ['report-definitions'],
    queryFn: async () => {
      const res = await apiClient.get('/reports/definitions');
      return res.data;
    },
  });

  const { data: myReports, refetch, isLoading: isLoadingReports } = useQuery({
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <PageHeader
        title="خدمة التقارير والتحليلات المستقلة (Decoupled Reporting Service)"
        subtitle="توليد التقرير الأكاديمية ومؤشرات الانضباط اللا تزامنية وتصديرها بصيغ PDF و Excel"
      />

      {(isLoadingDefs || isLoadingReports) && <LinearProgress sx={{ borderRadius: 1 }} />}
      {isErrorDefs && <Alert severity="error">تعذر تحميل قوالب التقارير من الخادم</Alert>}

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
              {definitions?.map((def: any) => (
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
              {myReports?.map((rep: any) => (
                <TableRow key={rep.id}>
                  <TableCell style={{ fontWeight: 700, color: '#0F172A' }}>{rep.reportDefinition?.nameAr}</TableCell>
                  <TableCell>{new Date(rep.createdAt).toLocaleString('ar-SA')}</TableCell>
                  <TableCell style={{ fontWeight: 700, color: '#047857' }}>{rep.rowCount} سجل</TableCell>
                  <TableCell><Chip icon={<CheckCircle2 size={14} />} label="مكتمل" color="success" size="small" /></TableCell>
                  <TableCell>
                    <Button variant="outlined" size="small" startIcon={<Download size={14} />}>
                      تحميل PDF
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </div>
  );
};
