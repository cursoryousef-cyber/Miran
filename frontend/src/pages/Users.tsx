import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Users, Plus, Shield, Building } from 'lucide-react';
import { Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip } from '@mui/material';

export const UsersPage: React.FC = () => {
  const { data: persons } = useQuery({
    queryKey: ['persons'],
    queryFn: async () => {
      const res = await apiClient.get('/persons');
      return res.data;
    },
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
            إدارة الأشخاص وحسابات الدخول (Persons & User Accounts)
          </h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            فصل الهويات السريرية عن حسابات الدخول وتعدد الجهات والأدوار للمستخدم (Multi-Org Multi-Role)
          </p>
        </div>

        <Button
          variant="contained"
          startIcon={<Plus size={18} />}
          style={{ background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)', fontWeight: 700 }}
        >
          إضافة شخص / حساب جديد
        </Button>
      </div>

      <TableContainer component={Paper} className="glass-card">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>اسم الشخص (Person)</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الهوية الوطنية</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>البريد الإلكتروني</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الجهات المترابطة (Multi-Org)</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الحالة</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {persons?.data?.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell style={{ fontWeight: 700, color: '#f8fafc' }}>
                  {p.nameAr}
                  {p.nameEn && <div style={{ fontSize: '11px', color: '#64748b' }}>{p.nameEn}</div>}
                </TableCell>
                <TableCell style={{ fontFamily: 'monospace' }}>{p.nationalId || '—'}</TableCell>
                <TableCell style={{ color: '#06b6d4' }}>{p.email || p.userAccounts?.[0]?.email || '—'}</TableCell>
                <TableCell>
                  <Chip label={`${p.userAccounts?.length || 1} حساب مفعل`} size="small" variant="outlined" />
                </TableCell>
                <TableCell><Chip label="نشط" color="success" size="small" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};
