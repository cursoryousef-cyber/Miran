import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../components/ui';
import { apiClient } from '../api/client';
import { GitMerge, Plus, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, LinearProgress, Alert } from '@mui/material';

export const Workflows: React.FC = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      const res = await apiClient.get('/workflows/definitions');
      return res.data;
    },
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <PageHeader
        title="محرك سير العمل (Workflow Engine)"
        subtitle="تخصيص وإدارة مسارات اعتماد طلبات التدريب والبطاقات والروتيشنات دون تعديل الكود البرمجي"
        actions={<>

        <Button
          variant="contained"
          startIcon={<Plus size={18} />}
          style={{ background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)', fontWeight: 700 }}
        >
          إنشاء سير عمل جديد
        </Button>
        </>}
      />

      {isLoading && <LinearProgress sx={{ borderRadius: 1 }} />}
      {isError && <Alert severity="error">تعذر تحميل سير العمل من الخادم</Alert>}

      <TableContainer component={Paper} className="glass-card">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>اسم سير العمل</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>الرمز (Code)</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>نوع الكيان المستهدف</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>عدد الخطوات</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>الإصدار</TableCell>
              <TableCell style={{ color: '#64748B', fontWeight: 700 }}>الحالة</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.map((wf: any) => (
              <TableRow key={wf.id}>
                <TableCell style={{ fontWeight: 700, color: '#0F172A' }}>{wf.nameAr}</TableCell>
                <TableCell style={{ fontFamily: 'monospace', color: '#0891B2' }}>{wf.code}</TableCell>
                <TableCell style={{ color: '#047857' }}>{wf.entityType}</TableCell>
                <TableCell style={{ fontWeight: 700 }}>{wf.steps?.length || 0} خطوات</TableCell>
                <TableCell>v{wf.version}</TableCell>
                <TableCell><Chip label="مفعّل" color="success" size="small" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};
