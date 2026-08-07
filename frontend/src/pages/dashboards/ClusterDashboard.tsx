import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Network, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { Button, IconButton, Tooltip } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export const ClusterDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: orgs, refetch: refetchOrgs } = useQuery({
    queryKey: ['cluster-orgs'],
    queryFn: async () => {
      const res = await apiClient.get('/organizations', { params: { limit: 50 } }).catch(() => ({ data: { data: [] } }));
      return res.data?.data || [];
    },
  });

  const { data: trainingRequests } = useQuery({
    queryKey: ['cluster-training-requests'],
    queryFn: async () => {
      const res = await apiClient.get('/training-requests').catch(() => ({ data: { data: [] } }));
      return res.data?.data || [];
    },
  });

  const hospitals = orgs?.filter((o: any) => o.organizationType?.code === 'hospital') || [];
  const totalCapacity = hospitals.reduce((sum: number, h: any) => sum + (h.capacity || 0), 0);
  const totalTrainees = hospitals.reduce((sum: number, h: any) => sum + (h._count?.traineeProfiles || 0), 0);
  const remainingSeats = Math.max(0, totalCapacity - totalTrainees);
  const occupancy = totalCapacity > 0 ? Math.round((totalTrainees / totalCapacity) * 100) : 0;
  const pendingRequests = trainingRequests?.filter((r: any) => r.status === 'submitted').length || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div style={{
        padding: '32px',
        background: 'linear-gradient(135deg, #0F766E 0%, #0D9488 100%)',
        borderRadius: '16px',
        color: '#FFFFFF',
        boxShadow: '0 4px 14px rgba(15, 118, 110, 0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Network size={20} color="#CCFBF1" />
              <span style={{ fontSize: '12px', color: '#CCFBF1', fontWeight: 700, letterSpacing: '1px' }}>
                CLUSTER TRAINING ADMIN
              </span>
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
              مرحباً، {user?.nameAr} 👋
            </h1>
            <p style={{ fontSize: '14px', color: '#F0FDF4', marginTop: '8px', opacity: 0.9 }}>
              {user?.activeOrganization?.nameAr} — مراجعة طلبات التدريب وتوزيع الطلاب على المستشفيات
            </p>
          </div>
          <Tooltip title="تحديث البيانات">
            <IconButton onClick={() => refetchOrgs()} style={{ color: '#FFFFFF', backgroundColor: 'rgba(255,255,255,0.15)' }}>
              <RefreshCw size={18} />
            </IconButton>
          </Tooltip>
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
          <Button variant="contained" onClick={() => navigate('/affiliations')}
            style={{ background: '#FFFFFF', color: '#0F766E', fontWeight: 800, borderRadius: 12 }}>
            طلبات التدريب الواردة
          </Button>
          <Button variant="outlined" onClick={() => navigate('/cluster-trainees')}
            style={{ borderColor: '#CCFBF1', color: '#FFFFFF', fontWeight: 700, borderRadius: 12 }}>
            متدربو الامتياز الواردون
          </Button>
          <Button variant="outlined" onClick={() => navigate('/organizations')}
            style={{ borderColor: '#CCFBF1', color: '#FFFFFF', fontWeight: 700, borderRadius: 12 }}>
            إدارة المستشفيات والسعة
          </Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, marginBottom: '8px' }}>المستشفيات التابعة</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#0F766E' }}>{hospitals.length}</div>
        </div>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, marginBottom: '8px' }}>إجمالي السعة</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#10B981' }}>{totalCapacity}</div>
        </div>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, marginBottom: '8px' }}>المقاعد المشغولة</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#F59E0B' }}>{totalTrainees}</div>
        </div>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, marginBottom: '8px' }}>المقاعد المتبقية</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: remainingSeats < 20 ? '#EF4444' : '#10B981' }}>{remainingSeats}</div>
        </div>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, marginBottom: '8px' }}>طلبات معلقة</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: pendingRequests > 0 ? '#F59E0B' : '#10B981' }}>{pendingRequests}</div>
        </div>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, marginBottom: '8px' }}>نسبة الإشغال</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: occupancy > 80 ? '#EF4444' : '#10B981' }}>{occupancy}%</div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginBottom: '16px' }}>🏥 مستشفيات التجمع والسعة الاستيعابية</h3>
        {hospitals.length > 0 ? hospitals.map((h: any) => {
          const cap = h.capacity || 0;
          const used = h._count?.traineeProfiles || 0;
          const remaining = Math.max(0, cap - used);
          const occ = cap > 0 ? Math.round((used / cap) * 100) : 0;
          return (
            <div key={h.id} style={{ padding: '14px 16px', backgroundColor: '#F8FAFC', borderRadius: '12px', marginBottom: '8px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ flex: 1, minWidth: '180px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>{h.nameAr}</div>
                <div style={{ fontSize: '11.5px', color: '#64748B' }}>{h.cityAr || 'عرعر'} • {h.code}</div>
              </div>
              <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>السعة</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#0891B2' }}>{cap}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>مشغول</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#F59E0B' }}>{used}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>متاح</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: remaining < 5 ? '#EF4444' : '#10B981' }}>{remaining}</div>
                </div>
                <div style={{ width: '80px' }}>
                  <div style={{ height: '8px', background: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${occ}%`, height: '100%', background: occ > 80 ? '#EF4444' : '#10B981', borderRadius: '4px' }} />
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748B', textAlign: 'center', marginTop: '2px' }}>{occ}%</div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '8px', backgroundColor: h.status === 'active' ? '#DCFCE7' : '#FEF3C7', color: h.status === 'active' ? '#15803D' : '#B45309' }}>
                  {h.status === 'active' ? 'نشط' : h.status}
                </span>
              </div>
            </div>
          );
        }) : <div style={{ color: '#64748B', fontSize: '13px', padding: '16px', textAlign: 'center' }}>لا توجد مستشفيات مسجلة حالياً</div>}
      </div>
    </div>
  );
};

export default ClusterDashboard;
