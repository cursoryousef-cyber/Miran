import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, LinearProgress, Alert } from '@mui/material';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();

  const { data: settings, isLoading: isLoadingSettings, isError: isErrorSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await apiClient.get('/settings');
      return res.data;
    },
  });

  const { data: license, isLoading: isLoadingLicense } = useQuery({
    queryKey: ['license', user?.activeOrganization?.id],
    queryFn: async () => {
      if (!user?.activeOrganization?.id) return null;
      const res = await apiClient.get(`/licenses/organization/${user.activeOrganization.id}`);
      return res.data;
    },
    enabled: !!user?.activeOrganization?.id,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
          مركز إعدادات المنصة والتراخيص (Settings & Subscription Quotas)
        </h1>
        <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
          الإعدادات الديناميكية المحفوظة بقاعدة البيانات وتراخيص السعات التخزينية والأدوار
        </p>
      </div>

      {(isLoadingSettings || isLoadingLicense) && <LinearProgress sx={{ borderRadius: 1 }} />}
      {isErrorSettings && <Alert severity="error">تعذر تحميل الإعدادات من الخادم</Alert>}

      {/* License Quota Summary Card */}
      <div className="glass-card" style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.15) 0%, rgba(15, 23, 42, 0.8) 100%)' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', marginBottom: '16px' }}>
          ترخيص وسعة الجهة الحالية: {user?.activeOrganization?.nameAr}
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>الباقة التشغيلية</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#10b981', textTransform: 'uppercase' }}>
              {license?.plan ? String(license.plan) : 'ENTERPRISE'}
            </div>
          </div>

          <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>سعة المستخدمين والإداريين</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#06b6d4' }}>
              {license?.maxUsers ? Number(license.maxUsers) : 100} مستخدم
            </div>
          </div>

          <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>سعة المتدربين</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#6366f1' }}>
              {license?.maxTrainees ? Number(license.maxTrainees) : 500} متدرب
            </div>
          </div>

          <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>المساحة التخزينية المتاحة</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#f59e0b' }}>
              {license?.maxStorageGb ? Number(license.maxStorageGb) : 50} GB
            </div>
          </div>
        </div>
      </div>

      {/* Database Backed Settings Table */}
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', marginBottom: '16px' }}>الإعدادات الديناميكية (Database-Backed Settings)</h3>
        <TableContainer component={Paper} className="glass-card">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>مفتاح الإعداد (Setting Key)</TableCell>
                <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الوصف</TableCell>
                <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>القيمة (JSON Value)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {settings?.map((st: any) => (
                <TableRow key={st.id}>
                  <TableCell style={{ fontFamily: 'monospace', fontWeight: 700, color: '#06b6d4' }}>{st.key}</TableCell>
                  <TableCell>{st.descriptionAr || 'إعداد تشغيلي'}</TableCell>
                  <TableCell style={{ fontFamily: 'monospace', fontSize: '12px', color: '#34d399' }}>
                    {JSON.stringify(st.value)}
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
