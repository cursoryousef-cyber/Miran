import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { FolderGit2, Plus, Building2, CheckCircle2 } from 'lucide-react';
import { Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip } from '@mui/material';

export const Affiliations: React.FC = () => {
  const { data } = useQuery({
    queryKey: ['affiliations'],
    queryFn: async () => {
      const res = await apiClient.get('/organization-affiliations');
      return res.data;
    },
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
            اتفاقيات الشراكة والتدريب (Organization Affiliations)
          </h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            إدارة الشراكات ومذكرات التفاهم بين الجامعات والمستشفيات والتجمعات الصحية
          </p>
        </div>

        <Button
          variant="contained"
          startIcon={<Plus size={18} />}
          style={{ background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)', fontWeight: 700 }}
        >
          إضافة اتفاقية تدريب جديدة
        </Button>
      </div>

      <TableContainer component={Paper} className="glass-card">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>عنوان الاتفاقية</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الجهة المصدر (الجامعة)</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الجهة المستضيفة (المستشفى/التجمع)</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>نوع الاتفاقية</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>رقم المرجع</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الحالة</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.data?.map((aff: any) => (
              <TableRow key={aff.id}>
                <TableCell style={{ fontWeight: 700, color: '#f8fafc' }}>
                  {aff.nameAr || 'اتفاقية تدريب سريري'}
                </TableCell>
                <TableCell style={{ color: '#34d399' }}>{aff.sourceOrg?.nameAr}</TableCell>
                <TableCell style={{ color: '#06b6d4' }}>{aff.targetOrg?.nameAr}</TableCell>
                <TableCell><Chip label={aff.affiliationType} size="small" variant="outlined" /></TableCell>
                <TableCell style={{ fontFamily: 'monospace' }}>{aff.agreementRef || 'MOU-2024'}</TableCell>
                <TableCell><Chip icon={<CheckCircle2 size={14} />} label="سارية" color="success" size="small" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};
