import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { ShieldCheck, Lock, Mail, ArrowLeft } from 'lucide-react';
import { TextField, Button, Alert, CircularProgress } from '@mui/material';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('platform@miran.health');
  const [password, setPassword] = useState('Miran@Admin2024!');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await apiClient.post('/auth/login', { email, password });
      login(res.data);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'فشل تسجيل الدخول. يرجى التأكد من البيانات.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#090d16',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background Orbs */}
      <div style={{
        position: 'absolute',
        top: '-20%',
        right: '-10%',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(5, 150, 105, 0.25) 0%, rgba(0,0,0,0) 70%)',
        filter: 'blur(80px)',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-20%',
        left: '-10%',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(6, 182, 212, 0.2) 0%, rgba(0,0,0,0) 70%)',
        filter: 'blur(80px)',
      }} />

      {/* Login Glass Card */}
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '440px',
        padding: '40px',
        zIndex: 1,
        boxShadow: '0 24px 48px rgba(0, 0, 0, 0.4)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #059669 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            boxShadow: '0 12px 32px rgba(5, 150, 105, 0.4)',
          }}>
            <ShieldCheck size={36} color="#fff" />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>تسجيل الدخول — مِران</h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '8px' }}>المنصة الوطنية لإدارة التدريب الصحي</p>
        </div>

        {error && (
          <Alert severity="error" style={{ marginBottom: '20px', borderRadius: '10px' }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <TextField
            label="البريد الإلكتروني"
            variant="outlined"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            fullWidth
            InputProps={{
              startAdornment: <Mail size={18} color="#94a3b8" style={{ marginLeft: '12px' }} />,
            }}
          />

          <TextField
            label="كلمة المرور"
            variant="outlined"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
            InputProps={{
              startAdornment: <Lock size={18} color="#94a3b8" style={{ marginLeft: '12px' }} />,
            }}
          />

          <Button
            type="submit"
            variant="contained"
            disabled={isLoading}
            style={{
              height: '48px',
              fontSize: '15px',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
              marginTop: '8px',
            }}
          >
            {isLoading ? <CircularProgress size={24} color="inherit" /> : 'دخول المنصة'}
          </Button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
          حسابات التجارب: <span style={{ color: '#34d399' }}>platform@miran.health</span> | <span style={{ color: '#06b6d4' }}>uni.admin@nbu.edu.sa</span> | <span style={{ color: '#f59e0b' }}>cluster@miran.health</span>
        </div>
      </div>
    </div>
  );
};
