import React, { useEffect, useState } from 'react';
import { Activity, Database, Server, HardDrive, Mail, Bell, Shield, Cloud, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button, Chip, LinearProgress } from '@mui/material';
import { apiClient } from '../api/client';

export const HealthMonitor: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/health/detailed');
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch system health', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
            🖥️ مراقبة سلامة وجاهزية الخدمات (System Health & Infrastructure Monitor)
          </h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            فحص لحظي مستمر لكل المكونات: API, Neon PostgreSQL, Storage, FCM, SMTP, Hosting & CDN
          </p>
        </div>

        <Button
          variant="outlined"
          startIcon={<RefreshCw size={18} className={loading ? 'animate-spin' : ''} />}
          onClick={fetchHealth}
          style={{ borderColor: '#10b981', color: '#10b981', fontWeight: 700 }}
        >
          تحديث الفحص اللحظي
        </Button>
      </div>

      {/* Status Card Banner */}
      <div
        className="glass-card"
        style={{
          padding: '24px',
          background: data?.overallStatus === 'HEALTHY'
            ? 'linear-gradient(135deg, #0F766E 0%, #0D9488 100%)'
            : 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
          color: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 4px 14px rgba(15, 118, 110, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {data?.overallStatus === 'HEALTHY' ? (
            <CheckCircle2 size={40} color="#CCFBF1" />
          ) : (
            <AlertTriangle size={40} color="#FEE2E2" />
          )}
          <div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF' }}>
              الحالة العامة للبنية التحتية: {data?.overallStatus === 'HEALTHY' ? 'جميع الخدمات تعمل بكفاءة عالية (OPERATIONAL)' : 'وجود تنبيهات في بعض الخدمات'}
            </div>
            <div style={{ fontSize: '12px', color: '#F0FDF4', marginTop: '4px', opacity: 0.9 }}>
              تاريخ آخر فحص آلي: {data?.checkedAt ? new Date(data.checkedAt).toLocaleString('ar-SA') : '—'}
            </div>
          </div>
        </div>

        <Chip
          label={`${data?.servicesCount || 10} خدمات مفحوصة`}
          color={data?.overallStatus === 'HEALTHY' ? 'success' : 'error'}
          style={{ fontWeight: 800, fontSize: '14px' }}
        />
      </div>

      {/* Services List Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {data?.services?.map((svc: any) => (
          <div key={svc.id} className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>{svc.nameAr}</div>
              <Chip
                label={svc.status === 'healthy' ? 'نشط (Up)' : 'متوقف (Down)'}
                color={svc.status === 'healthy' ? 'success' : 'error'}
                size="small"
                style={{ fontWeight: 700 }}
              />
            </div>

            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              الفئة: <span style={{ color: '#cbd5e1' }}>{svc.category}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>وقت الاستجابة (Latency)</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#10b981' }}>{svc.responseTimeMs} ms</div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>نسبة الجاهزية (Uptime)</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#06b6d4' }}>{svc.uptime}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HealthMonitor;
