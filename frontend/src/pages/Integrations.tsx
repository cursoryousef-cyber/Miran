import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Zap, Plus, Globe, CheckCircle2 } from 'lucide-react';
import { Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip } from '@mui/material';

export const Integrations: React.FC = () => {
  const { data: configs } = useQuery({
    queryKey: ['integrations-configs'],
    queryFn: async () => {
      const res = await apiClient.get('/integrations/configs');
      return res.data;
    },
  });

  const { data: webhooks } = useQuery({
    queryKey: ['integrations-webhooks'],
    queryFn: async () => {
      const res = await apiClient.get('/integrations/webhooks');
      return res.data;
    },
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
            مركز الربط والتكامل (Integration Hub & Webhooks)
          </h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            الربط عبر REST/Webhooks مع الهيئة السعودية للتخصصات الصحية، نافس، والأنظمة الحكومية والجامعية
          </p>
        </div>

        <Button
          variant="contained"
          startIcon={<Plus size={18} />}
          style={{ background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)', fontWeight: 700 }}
        >
          إضافة ربط تكاملي جديد
        </Button>
      </div>

      {/* External Integration Configs */}
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', marginBottom: '16px' }}>إعدادات الأنظمة الخارجية المرتبطة</h3>
        <TableContainer component={Paper} className="glass-card">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>اسم النظام</TableCell>
                <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الرمز (Code)</TableCell>
                <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>نوع الاتصال</TableCell>
                <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الرابط الرئيسي (Base URL)</TableCell>
                <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الحالة</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {configs?.map((cfg: any) => (
                <TableRow key={cfg.id}>
                  <TableCell style={{ fontWeight: 700, color: '#f8fafc' }}>{cfg.nameAr}</TableCell>
                  <TableCell style={{ fontFamily: 'monospace', color: '#06b6d4' }}>{cfg.code}</TableCell>
                  <TableCell><Chip label={cfg.integrationType} size="small" variant="outlined" /></TableCell>
                  <TableCell style={{ fontFamily: 'monospace', fontSize: '12px' }}>{cfg.baseUrl || 'https://api.external.gov.sa'}</TableCell>
                  <TableCell><Chip label="نشط" color="success" size="small" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>

      {/* Webhook Subscriptions */}
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', marginBottom: '16px' }}>اشتراكات الأحداث المباشرة (Outbox Webhooks)</h3>
        <TableContainer component={Paper} className="glass-card">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الحدث المستهدف (Event)</TableCell>
                <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>رابط الاستلام (Target URL)</TableCell>
                <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الحالة</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {webhooks?.map((wh: any) => (
                <TableRow key={wh.id}>
                  <TableCell style={{ fontWeight: 700, color: '#34d399', fontFamily: 'monospace' }}>{wh.event}</TableCell>
                  <TableCell style={{ fontFamily: 'monospace', fontSize: '12px', color: '#06b6d4' }}>{wh.targetUrl}</TableCell>
                  <TableCell><Chip label="مفعّل" color="success" size="small" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </div>
  );
};
