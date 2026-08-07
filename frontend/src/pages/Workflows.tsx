import React from 'react';
import { useQuery } from '@tanstack/react-query';
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
            محرك سير العمل (Workflow Engine)
          </h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            تخصيص وإدارة مسارات اعتماد طلبات التدريب والبطاقات والروتيشنات دون تعديل الكود البرمجي
          </p>
        </div>

        <Button
          variant="contained"
          startIcon={<Plus size={18} />}
          style={{ background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)', fontWeight: 700 }}
        >
          إنشاء سير عمل جديد
        </Button>
      </div>

      {isLoading && <LinearProgress sx={{ borderRadius: 1 }} />}
      {isError && <Alert severity="error">تعذر تحميل سير العمل من الخادم</Alert>}

      <TableContainer component={Paper} className="glass-card">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>اسم سير العمل</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الرمز (Code)</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>نوع الكيان المستهدف</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>عدد الخطوات</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الإصدار</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الحالة</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.map((wf: any) => (
              <TableRow key={wf.id}>
                <TableCell style={{ fontWeight: 700, color: '#f8fafc' }}>{wf.nameAr}</TableCell>
                <TableCell style={{ fontFamily: 'monospace', color: '#06b6d4' }}>{wf.code}</TableCell>
                <TableCell style={{ color: '#34d399' }}>{wf.entityType}</TableCell>
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
