import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { GraduationCap, Plus, Users, Calendar } from 'lucide-react';
import { Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip } from '@mui/material';

export const AcademicIntakes: React.FC = () => {
  const { data } = useQuery({
    queryKey: ['intakes'],
    queryFn: async () => {
      const res = await apiClient.get('/academic-intakes');
      return res.data;
    },
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
            الدفعات الأكاديمية (Academic Intakes)
          </h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            تنظيم دفعات المتدربين السنوية (امتياز 2027) وتوزيعهم الجماعي على المستشفيات
          </p>
        </div>

        <Button
          variant="contained"
          startIcon={<Plus size={18} />}
          style={{ background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)', fontWeight: 700 }}
        >
          إنشاء دفعة أكاديمية جديدة
        </Button>
      </div>

      <TableContainer component={Paper} className="glass-card">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>اسم الدفعة</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الرمز (Code)</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>السنة الأكاديمية</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>البرنامج التدريبي</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الطاقة الاستيعابية</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الحالة</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.data?.map((intake: any) => (
              <TableRow key={intake.id}>
                <TableCell style={{ fontWeight: 700, color: '#f8fafc' }}>{intake.nameAr}</TableCell>
                <TableCell style={{ fontFamily: 'monospace', color: '#06b6d4' }}>{intake.code}</TableCell>
                <TableCell>{intake.academicYear}</TableCell>
                <TableCell style={{ color: '#34d399' }}>{intake.program?.nameAr || 'برنامج الامتياز'}</TableCell>
                <TableCell style={{ fontWeight: 700 }}>{intake.capacity} متدرب</TableCell>
                <TableCell><Chip label="مخطط لها" color="info" size="small" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};
