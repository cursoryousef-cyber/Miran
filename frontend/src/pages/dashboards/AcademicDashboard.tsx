import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Award, FileSpreadsheet, CheckCircle2, ClipboardList } from 'lucide-react';
import { Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export const AcademicDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div className="glass-card" style={{
        padding: '32px',
        background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.2) 0%, rgba(15, 23, 42, 0.9) 100%)',
        border: '1px solid rgba(236, 72, 153, 0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Award size={20} color="#ec4899" />
          <span style={{ fontSize: '12px', color: '#ec4899', fontWeight: 700 }}>Academic Supervisor Dashboard</span>
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
          مرحباً، {user?.nameAr} 👋
        </h1>
        <p style={{ fontSize: '14px', color: '#cbd5e1', marginTop: '8px' }}>
          {user?.activeOrganization?.nameAr} — مراجعة واعتماد نتائج البرامج التدريبية
        </p>
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <Button variant="contained" onClick={() => navigate('/reports')}
            style={{ background: 'linear-gradient(135deg, #db2777, #ec4899)', fontWeight: 700 }}>
            اعتماد النتائج النهائية
          </Button>
          <Button variant="outlined" onClick={() => navigate('/intakes')}
            style={{ borderColor: '#ec4899', color: '#ec4899', fontWeight: 700 }}>
            البرامج المكتملة
          </Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>برامج تنتظر الاعتماد</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#ec4899' }}>0</div>
        </div>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>تقييمات نهائية معلقة</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#f59e0b' }}>0</div>
        </div>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>شهادات صادرة</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#10b981' }}>0</div>
        </div>
      </div>
    </div>
  );
};
