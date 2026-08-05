import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { GraduationCap, Users, FileCheck, Send, ClipboardList } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export const UniversityDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: intakes } = useQuery({
    queryKey: ['uni-intakes'],
    queryFn: async () => {
      const res = await apiClient.get('/academic-intakes').catch(() => ({ data: { data: [] } }));
      return res.data?.data || [];
    },
  });

  const { data: members } = useQuery({
    queryKey: ['uni-members'],
    queryFn: async () => {
      const res = await apiClient.get('/org-members').catch(() => ({ data: { data: [] } }));
      return res.data?.data || [];
    },
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div className="glass-card" style={{
        padding: '32px',
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(15, 23, 42, 0.9) 100%)',
        border: '1px solid rgba(139, 92, 246, 0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <GraduationCap size={20} color="#8b5cf6" />
          <span style={{ fontSize: '12px', color: '#8b5cf6', fontWeight: 700 }}>University Admin Dashboard</span>
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
          مرحباً، {user?.nameAr} 👋
        </h1>
        <p style={{ fontSize: '14px', color: '#cbd5e1', marginTop: '8px' }}>
          {user?.activeOrganization?.nameAr} — إدارة البرامج والدفعات وطلبات التدريب
        </p>
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <Button variant="contained" startIcon={<Send size={16} />} onClick={() => navigate('/affiliations')}
            style={{ background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)', fontWeight: 700 }}>
            إرسال طلب تدريب جديد
          </Button>
          <Button variant="outlined" startIcon={<ClipboardList size={16} />} onClick={() => navigate('/intakes')}
            style={{ borderColor: '#8b5cf6', color: '#8b5cf6', fontWeight: 700 }}>
            إدارة الدفعات
          </Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>الدفعات الأكاديمية</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#8b5cf6' }}>{intakes?.length || 0}</div>
        </div>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>أعضاء الجامعة</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#06b6d4' }}>{members?.length || 0}</div>
        </div>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>طلبات تدريب مرسلة</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#f59e0b' }}>0</div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', marginBottom: '16px' }}>📋 الدفعات الأكاديمية النشطة</h3>
        {intakes && intakes.length > 0 ? intakes.map((i: any) => (
          <div key={i.id} style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', marginBottom: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>{i.nameAr || i.code}</div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>{i.status || 'نشط'}</div>
          </div>
        )) : <div style={{ color: '#94a3b8', fontSize: '13px' }}>لا توجد دفعات — استخدم "إدارة الدفعات" لإنشاء واحدة</div>}
      </div>
    </div>
  );
};
