import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Network, Building2, Users, GraduationCap, FileCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export const ClusterDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: orgs } = useQuery({
    queryKey: ['cluster-orgs'],
    queryFn: async () => {
      const res = await apiClient.get('/organizations').catch(() => ({ data: { data: [] } }));
      return res.data?.data || [];
    },
  });

  const hospitals = orgs?.filter((o: any) => o.organizationType?.code === 'hospital') || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div className="glass-card" style={{
        padding: '32px',
        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(15, 23, 42, 0.9) 100%)',
        border: '1px solid rgba(6, 182, 212, 0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Network size={20} color="#06b6d4" />
          <span style={{ fontSize: '12px', color: '#06b6d4', fontWeight: 700 }}>Cluster Training Admin</span>
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
          مرحباً، {user?.nameAr} 👋
        </h1>
        <p style={{ fontSize: '14px', color: '#cbd5e1', marginTop: '8px' }}>
          {user?.activeOrganization?.nameAr} — مراجعة طلبات التدريب وتوزيع الطلاب على المستشفيات
        </p>
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <Button variant="contained" onClick={() => navigate('/affiliations')}
            style={{ background: 'linear-gradient(135deg, #0891b2, #06b6d4)', fontWeight: 700 }}>
            طلبات التدريب الواردة
          </Button>
          <Button variant="outlined" onClick={() => navigate('/organizations')}
            style={{ borderColor: '#06b6d4', color: '#06b6d4', fontWeight: 700 }}>
            إدارة المستشفيات والسعة
          </Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>المستشفيات التابعة</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#06b6d4' }}>{hospitals.length}</div>
        </div>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>إجمالي السعة</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#10b981' }}>{hospitals.length * 25}</div>
        </div>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>طلبات معلقة</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#f59e0b' }}>0</div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', marginBottom: '16px' }}>🏥 مستشفيات التجمع</h3>
        {hospitals.length > 0 ? hospitals.map((h: any) => (
          <div key={h.id} style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', marginBottom: '8px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>{h.nameAr}</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>{h.cityAr} • {h.code}</div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '6px', backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981' }}>نشط</span>
          </div>
        )) : <div style={{ color: '#94a3b8', fontSize: '13px' }}>لا توجد مستشفيات مسجلة حالياً</div>}
      </div>
    </div>
  );
};
