import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Network, Building2, Users, GraduationCap, FileCheck, Bell, RefreshCw } from 'lucide-react';
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

  const { data: incomingTrainees } = useQuery({
    queryKey: ['cluster-incoming-trainees'],
    queryFn: async () => {
      const res = await apiClient.get('/trainees/incoming').catch(() => ({ data: { data: [] } }));
      return res.data?.data || [];
    },
  });

  const { data: notifications } = useQuery({
    queryKey: ['cluster-notifications'],
    queryFn: async () => {
      const res = await apiClient.get('/notifications/unread-count').catch(() => ({ data: { data: { count: 0 } } }));
      return res.data?.data || { count: 0 };
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
      <div className="glass-card" style={{
        padding: '32px',
        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(15, 23, 42, 0.9) 100%)',
        border: '1px solid rgba(6, 182, 212, 0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
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
          </div>
          <Tooltip title="تحديث البيانات">
            <IconButton onClick={() => refetchOrgs()} style={{ color: '#06b6d4', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
              <RefreshCw size={18} />
            </IconButton>
          </Tooltip>
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <Button variant="contained" onClick={() => navigate('/affiliations')}
            style={{ background: 'linear-gradient(135deg, #0891b2, #06b6d4)', fontWeight: 700 }}>
            طلبات التدريب الواردة
          </Button>
          <Button variant="outlined" onClick={() => navigate('/cluster-trainees')}
            style={{ borderColor: '#06b6d4', color: '#06b6d4', fontWeight: 700 }}>
            متدربو الامتياز الواردون
          </Button>
          <Button variant="outlined" onClick={() => navigate('/organizations')}
            style={{ borderColor: '#06b6d4', color: '#06b6d4', fontWeight: 700 }}>
            إدارة المستشفيات والسعة
          </Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>المستشفيات التابعة</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#06b6d4' }}>{hospitals.length}</div>
        </div>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>إجمالي السعة</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#10b981' }}>{totalCapacity}</div>
        </div>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>المقاعد المشغولة</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#f59e0b' }}>{totalTrainees}</div>
        </div>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>المقاعد المتبقية</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: remainingSeats < 20 ? '#ef4444' : '#10b981' }}>{remainingSeats}</div>
        </div>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>طلبات معلقة</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: pendingRequests > 0 ? '#f59e0b' : '#10b981' }}>{pendingRequests}</div>
        </div>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>نسبة الإشغال</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: occupancy > 80 ? '#ef4444' : '#10b981' }}>{occupancy}%</div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', marginBottom: '16px' }}>🏥 مستشفيات التجمع والسعة الاستيعابية</h3>
        {hospitals.length > 0 ? hospitals.map((h: any) => {
          const cap = h.capacity || 0;
          const used = h._count?.traineeProfiles || 0;
          const remaining = Math.max(0, cap - used);
          const occ = cap > 0 ? Math.round((used / cap) * 100) : 0;
          return (
            <div key={h.id} style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', marginBottom: '8px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>{h.nameAr}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>{h.cityAr || 'عرعر'} • {h.code}</div>
              </div>
              <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>السعة</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#38bdf8' }}>{cap}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>مشغول</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#f59e0b' }}>{used}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>متاح</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: remaining < 5 ? '#ef4444' : '#10b981' }}>{remaining}</div>
                </div>
                <div style={{ width: '80px' }}>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${occ}%`, height: '100%', background: occ > 80 ? '#ef4444' : '#10b981', borderRadius: '4px' }} />
                  </div>
                  <div style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'center', marginTop: '2px' }}>{occ}%</div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '6px', backgroundColor: h.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: h.status === 'active' ? '#10b981' : '#f59e0b' }}>
                  {h.status === 'active' ? 'نشط' : h.status}
                </span>
              </div>
            </div>
          );
        }) : <div style={{ color: '#94a3b8', fontSize: '13px' }}>لا توجد مستشفيات مسجلة حالياً</div>}
      </div>
    </div>
  );
};
