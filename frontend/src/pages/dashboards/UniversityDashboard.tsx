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
      <div style={{
        padding: '32px',
        background: 'linear-gradient(135deg, #0F766E 0%, #0D9488 100%)',
        borderRadius: '16px',
        color: '#FFFFFF',
        boxShadow: '0 4px 14px rgba(15, 118, 110, 0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <GraduationCap size={20} color="#CCFBF1" />
          <span style={{ fontSize: '12px', color: '#CCFBF1', fontWeight: 700, letterSpacing: '1px' }}>
            UNIVERSITY ADMIN DASHBOARD
          </span>
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
          مرحباً، {user?.nameAr} 👋
        </h1>
        <p style={{ fontSize: '14px', color: '#F0FDF4', marginTop: '8px', opacity: 0.9 }}>
          {user?.activeOrganization?.nameAr} — إدارة البرامج والدفعات وطلبات التدريب
        </p>
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
          <Button variant="contained" startIcon={<Send size={16} />} onClick={() => navigate('/affiliations')}
            style={{ background: '#FFFFFF', color: '#0F766E', fontWeight: 800, borderRadius: 12 }}>
            إرسال طلب تدريب جديد
          </Button>
          <Button variant="outlined" startIcon={<ClipboardList size={16} />} onClick={() => navigate('/intakes')}
            style={{ borderColor: '#CCFBF1', color: '#FFFFFF', fontWeight: 700, borderRadius: 12 }}>
            إدارة الدفعات
          </Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, marginBottom: '8px' }}>الدفعات الأكاديمية</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#0F766E' }}>{intakes?.length || 0}</div>
        </div>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, marginBottom: '8px' }}>أعضاء الجامعة</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#0891B2' }}>{members?.length || 0}</div>
        </div>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, marginBottom: '8px' }}>طلبات تدريب مرسلة</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#F59E0B' }}>0</div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginBottom: '16px' }}>📋 الدفعات الأكاديمية النشطة</h3>
        {intakes && intakes.length > 0 ? intakes.map((i: any) => (
          <div key={i.id} style={{ padding: '12px 16px', backgroundColor: '#F8FAFC', borderRadius: '12px', marginBottom: '8px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>{i.nameAr || i.code}</div>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '8px', backgroundColor: '#DCFCE7', color: '#15803D' }}>
              {i.status || 'نشط'}
            </span>
          </div>
        )) : <div style={{ color: '#64748B', fontSize: '13px', padding: '16px', textAlign: 'center' }}>لا توجد دفعات — استخدم "إدارة الدفعات" لإنشاء واحدة</div>}
      </div>
    </div>
  );
};

export default UniversityDashboard;
