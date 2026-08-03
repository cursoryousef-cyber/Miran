import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Building2, Plus, Search, Filter, CheckCircle2, AlertCircle, Archive, Clock } from 'lucide-react';
import { Button, TextField, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Tabs, Tab } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export const Organizations: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [tabValue, setTabValue] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['organizations', search, tabValue],
    queryFn: async () => {
      const res = await apiClient.get('/organizations', {
        params: {
          search: search || undefined,
          status: tabValue !== 'all' ? tabValue : undefined,
        },
      });
      return res.data;
    },
  });

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'active':
        return <Chip icon={<CheckCircle2 size={14} />} label="نشط" color="success" size="small" />;
      case 'draft':
        return <Chip icon={<Clock size={14} />} label="مسودة" color="warning" size="small" />;
      case 'suspended':
        return <Chip icon={<AlertCircle size={14} />} label="معلق" color="error" size="small" />;
      case 'archived':
        return <Chip icon={<Archive size={14} />} label="مؤرشف" color="default" size="small" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
            إدارة الجهات والتجمعات الصحية
          </h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            عرض وتحديث شجرة الجهات المؤسسية وحالات دورة الحياة (Draft, Active, Suspended, Archived)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={() => navigate('/organizations/wizard')}
            style={{ background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)', fontWeight: 700 }}
          >
            معالج إنشاء جهة جديدة
          </Button>
        </div>
      </div>

      {/* Filter Bar & Lifecycle Tabs */}
      <div className="glass-card" style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <TextField
            placeholder="البحث باسم الجهة أو الرمز أو المدينة..."
            variant="outlined"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '360px' }}
            InputProps={{
              startAdornment: <Search size={18} color="#94a3b8" style={{ marginLeft: '8px' }} />,
            }}
          />

          <Tabs
            value={tabValue}
            onChange={(_, val) => setTabValue(val)}
            textColor="primary"
            indicatorColor="primary"
            style={{ marginRight: 'auto' }}
          >
            <Tab label="جميع الجهات" value="all" />
            <Tab label="نشط (Active)" value="active" />
            <Tab label="مسودة (Draft)" value="draft" />
            <Tab label="معلق (Suspended)" value="suspended" />
            <Tab label="مؤرشف (Archived)" value="archived" />
          </Tabs>
        </div>
      </div>

      {/* Organizations Table */}
      <TableContainer component={Paper} className="glass-card">
        <Table>
          <TableHead>
            <TableRow style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>اسم الجهة</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الرمز (Code)</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>نوع الجهة</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>الجهة الأم</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>المدينة/المنطقة</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>حالة دورة الحياة</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>العدد (المتدربون / الأقسام)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.data?.map((org: any) => (
              <TableRow key={org.id} hover style={{ cursor: 'pointer' }}>
                <TableCell style={{ fontWeight: 700, color: '#f8fafc' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(5, 150, 105, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Building2 size={16} color="#10b981" />
                    </div>
                    <div>
                      <div>{org.nameAr}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{org.nameEn}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell style={{ fontFamily: 'monospace', fontWeight: 700, color: '#06b6d4' }}>{org.code}</TableCell>
                <TableCell><Chip label={org.organizationType?.nameAr || 'جهة'} size="small" variant="outlined" /></TableCell>
                <TableCell style={{ color: '#cbd5e1' }}>{org.parent?.nameAr || '— (رئيسية)'}</TableCell>
                <TableCell style={{ color: '#cbd5e1' }}>{org.cityAr ? `${org.cityAr} (${org.regionAr || ''})` : '—'}</TableCell>
                <TableCell>{getStatusChip(org.status)}</TableCell>
                <TableCell style={{ color: '#94a3b8', fontSize: '13px' }}>
                  {org._count?.traineeProfiles || 0} متدرب / {org._count?.departments || 0} أقسام
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};
