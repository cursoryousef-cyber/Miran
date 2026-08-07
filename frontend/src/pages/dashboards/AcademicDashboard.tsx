import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Award } from 'lucide-react';
import { Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export const AcademicDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

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
          <Award size={20} color="#CCFBF1" />
          <span style={{ fontSize: '12px', color: '#CCFBF1', fontWeight: 700, letterSpacing: '1px' }}>
            ACADEMIC SUPERVISOR DASHBOARD
          </span>
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
          مرحباً، {user?.nameAr} 👋
        </h1>
        <p style={{ fontSize: '14px', color: '#F0FDF4', marginTop: '8px', opacity: 0.9 }}>
          {user?.activeOrganization?.nameAr} — مراجعة واعتماد نتائج البرامج التدريبية
        </p>
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
          <Button variant="contained" onClick={() => navigate('/reports')}
            style={{ background: '#FFFFFF', color: '#0F766E', fontWeight: 800, borderRadius: 12 }}>
            اعتماد النتائج النهائية
          </Button>
          <Button variant="outlined" onClick={() => navigate('/intakes')}
            style={{ borderColor: '#CCFBF1', color: '#FFFFFF', fontWeight: 700, borderRadius: 12 }}>
            البرامج المكتملة
          </Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, marginBottom: '8px' }}>برامج تنتظر الاعتماد</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#0F766E' }}>0</div>
        </div>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, marginBottom: '8px' }}>تقييمات نهائية معلقة</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#F59E0B' }}>0</div>
        </div>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, marginBottom: '8px' }}>شهادات صادرة</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#10B981' }}>0</div>
        </div>
      </div>
    </div>
  );
};

export default AcademicDashboard;
